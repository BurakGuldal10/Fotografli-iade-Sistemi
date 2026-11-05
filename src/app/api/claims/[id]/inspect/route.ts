import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_DECISIONS = new Set([
  "REPAIR",
  "REPLACE",
  "REFUND",
  "REJECT_USER_FAULT",
  "CARRIER_COMPENSATION",
]);

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const {
      inspectorName,
      packageCondition,
      serialMatched,
      evidenceMatched,
      finalDecision,
      carrierClaimAmount,
      inspectorNotes,
    } = body;

    if (!inspectorName || !VALID_DECISIONS.has(finalDecision)) {
      return NextResponse.json(
        { error: "Eksper adı ve geçerli bir nihai karar zorunludur." },
        { status: 400 }
      );
    }

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "İlgili RMA kaydı bulunamadı." },
        { status: 404 }
      );
    }

    const parsedCarrierAmt =
      finalDecision === "CARRIER_COMPENSATION"
        ? Number(carrierClaimAmount) || claim.product.unitPrice
        : 0;

    // Eğer kargo tazminatı veya kullanıcı hatası tespiti varsa şirketin kurtardığı tutarı güncelle
    let additionalSaved = claim.estimatedSavedCost;
    if (finalDecision === "CARRIER_COMPENSATION") {
      additionalSaved = parsedCarrierAmt;
    } else if (finalDecision === "REJECT_USER_FAULT") {
      additionalSaved = claim.product.unitPrice;
    }

    const [inspection, updatedClaim] = await prisma.$transaction([
      prisma.warehouseInspection.upsert({
        where: { claimId: claim.id },
        update: {
          inspectorName: String(inspectorName).trim(),
          packageCondition: packageCondition || "INTACT",
          serialMatched: Boolean(serialMatched),
          evidenceMatched: Boolean(evidenceMatched),
          finalDecision,
          carrierClaimAmount: parsedCarrierAmt,
          inspectorNotes: String(inspectorNotes || "").trim(),
        },
        create: {
          claimId: claim.id,
          inspectorName: String(inspectorName).trim(),
          packageCondition: packageCondition || "INTACT",
          serialMatched: Boolean(serialMatched),
          evidenceMatched: Boolean(evidenceMatched),
          finalDecision,
          carrierClaimAmount: parsedCarrierAmt,
          inspectorNotes: String(inspectorNotes || "").trim(),
        },
      }),
      prisma.claim.update({
        where: { id: claim.id },
        data: {
          status: finalDecision === "REJECT_USER_FAULT" ? "REJECTED" : "RESOLVED",
          estimatedSavedCost: additionalSaved,
        },
        include: {
          order: true,
          product: true,
          evidences: true,
          inspection: true,
        },
      }),
    ]);

    return NextResponse.json({
      inspection,
      claim: updatedClaim,
    });
  } catch (err) {
    console.error("Warehouse inspect error:", err);
    return NextResponse.json(
      { error: "Depo ekspertiz kaydı sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
