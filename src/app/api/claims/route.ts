import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";
import {
  calculateDeflectionOffer,
  getRequiredEvidences,
  IssueCategory,
  IssueSeverity,
} from "@/lib/rules-engine";
import {
  computeSha256,
  generateClaimIntegritySeal,
  validateEvidenceFileMeta,
} from "@/lib/security";
import { validateSafeWebhookUrl } from "@/lib/ssrf";

const VALID_CATEGORIES = new Set<IssueCategory>([
  "CARGO_DAMAGE",
  "MISSING_PART",
  "FUNCTIONAL_DEFECT",
  "WRONG_ITEM",
]);

const VALID_SEVERITIES = new Set<IssueSeverity>([
  "COSMETIC",
  "MINOR_PART",
  "CRITICAL_FAILURE",
]);

export async function GET() {
  try {
    await ensureSeeded();

    const claims = await prisma.claim.findMany({
      include: {
        order: true,
        product: true,
        evidences: true,
        inspection: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Toplam kurtarılan lojistik + ürün maliyeti ve istatistikler
    const stats = {
      totalClaims: claims.length,
      deflectedCount: claims.filter((c) => c.status === "DEFLECTED_SAVED").length,
      awaitingWarehouseCount: claims.filter((c) => c.status === "RMA_APPROVED").length,
      resolvedCount: claims.filter((c) => c.status === "RESOLVED").length,
      totalSavedCost: claims.reduce((acc, c) => acc + (c.estimatedSavedCost || 0), 0),
      carrierCompensatedTotal: claims.reduce(
        (acc, c) => acc + (c.inspection?.carrierClaimAmount || 0),
        0
      ),
    };

    return NextResponse.json({ claims, stats });
  } catch (err) {
    console.error("Claims GET error:", err);
    return NextResponse.json(
      { error: "RMA talepleri yüklenemedi." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();

    const {
      orderId,
      productId,
      serialNumber,
      issueCategory,
      issueSeverity,
      customerDescription,
      evidences,
      selectedResolution, // "ACCEPT_SMART_OFFER" | "REQUEST_FULL_RMA"
      webhookUrl,
    } = body;

    if (
      !orderId ||
      !productId ||
      !serialNumber ||
      !VALID_CATEGORIES.has(issueCategory) ||
      !VALID_SEVERITIES.has(issueSeverity)
    ) {
      return NextResponse.json(
        { error: "Eksik veya geçersiz arıza/sipariş parametresi." },
        { status: 400 }
      );
    }

    if (!customerDescription || String(customerDescription).trim().length < 10) {
      return NextResponse.json(
        { error: "Lütfen arıza veya hasar durumunu en az 10 karakterle açıklayın." },
        { status: 400 }
      );
    }

    // Ali Oda — SSRF Kalkanı Kontrolü (Eğer ERP webhook URL girildiyse)
    let safeWebhook: string | null = null;
    if (webhookUrl && String(webhookUrl).trim().length > 0) {
      const ssrfCheck = await validateSafeWebhookUrl(String(webhookUrl).trim());
      if (!ssrfCheck.safe) {
        return NextResponse.json(
          { error: `Güvenlik Engeli (SSRF Kalkanı): ${ssrfCheck.reason}` },
          { status: 400 }
        );
      }
      safeWebhook = ssrfCheck.normalizedUrl || null;
    }

    // Zorunlu kanıt kontrolü
    const requiredList = getRequiredEvidences(issueCategory).filter((r) => r.mandatory);
    const uploadedList: Array<{
      evidenceType: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      contentSample?: string;
    }> = Array.isArray(evidences) ? evidences : [];

    for (const reqEv of requiredList) {
      const found = uploadedList.find((u) => u.evidenceType === reqEv.type);
      if (!found) {
        return NextResponse.json(
          {
            error: `Zorunlu kanıt eksik: "${reqEv.title}". Kanıt yüklenmeden RMA kodu üretilemez!`,
          },
          { status: 400 }
        );
      }
    }

    // Dosya güvenliği ve SHA-256 kanıt özeti hesaplama
    const processedEvidences = [];
    for (const ev of uploadedList) {
      const validation = validateEvidenceFileMeta({
        fileName: ev.fileName,
        mimeType: ev.mimeType,
        fileSize: Number(ev.fileSize) || 1024,
      });

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const sha256Hash = computeSha256(
        `${ev.fileName}:${ev.fileSize}:${ev.mimeType}:${ev.contentSample || Date.now()}`
      );

      processedEvidences.push({
        evidenceType: ev.evidenceType,
        fileName: ev.fileName,
        mimeType: ev.mimeType,
        fileSize: Number(ev.fileSize) || 1024,
        sha256Hash,
        verified: true,
      });
    }

    const [order, product] = await Promise.all([
      prisma.order.findUnique({ where: { id: orderId } }),
      prisma.product.findUnique({ where: { id: productId } }),
    ]);

    if (!order || !product) {
      return NextResponse.json(
        { error: "Sipariş veya ürün bulunamadı." },
        { status: 404 }
      );
    }

    // Akıllı Çözüm Ağacı Hesaplaması
    const deflection = calculateDeflectionOffer({
      unitPrice: product.unitPrice,
      returnShippingCost: product.returnShippingCost,
      sparePartsAvailable: product.sparePartsAvailable,
      sparePartCost: product.sparePartCost,
      issueCategory,
      issueSeverity,
    });

    const acceptedSmartOffer =
      selectedResolution === "ACCEPT_SMART_OFFER" &&
      deflection.offerType !== "FULL_RMA_RETURN";

    const rmaNumber = `RMA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const integrityHash = generateClaimIntegritySeal({
      rmaNumber,
      orderNumber: order.orderNumber,
      serialNumber,
      issueCategory,
      evidenceHashes: processedEvidences.map((e) => e.sha256Hash),
      timestampIso: nowIso,
    });

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const newClaim = await prisma.claim.create({
      data: {
        rmaNumber,
        orderId: order.id,
        productId: product.id,
        serialNumber,
        issueCategory,
        issueSeverity,
        customerDescription: String(customerDescription).trim(),
        status: acceptedSmartOffer ? "DEFLECTED_SAVED" : "RMA_APPROVED",
        proposedOfferType: deflection.offerType,
        proposedRefundAmt: deflection.proposedRefundAmount,
        estimatedSavedCost: acceptedSmartOffer
          ? deflection.estimatedSavedCost
          : Math.round(product.returnShippingCost * 0.5),
        offerAccepted: acceptedSmartOffer,
        integrityHash,
        clientIp,
        webhookUrl: safeWebhook,
        evidences: {
          create: processedEvidences,
        },
      },
      include: {
        order: true,
        product: true,
        evidences: true,
      },
    });

    return NextResponse.json({
      claim: newClaim,
      deflection,
    });
  } catch (err) {
    console.error("Claim POST error:", err);
    return NextResponse.json(
      { error: "RMA talebi oluşturulurken bir hata meydana geldi." },
      { status: 500 }
    );
  }
}
