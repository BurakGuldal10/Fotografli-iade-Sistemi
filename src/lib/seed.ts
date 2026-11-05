import { prisma } from "./prisma";
import { computeSha256, generateClaimIntegritySeal } from "./security";

/**
 * Gerçekçi B2B / E-Ticaret Sipariş, Ürün ve RMA Demo Verisi Tohumlayıcı
 */
export async function ensureSeeded() {
  const existingProducts = await prisma.product.count();
  if (existingProducts > 0) {
    return;
  }

  // 1. Ürünleri oluştur (Mobilya, Endüstriyel Espresso Makinesi, Medikal Monitör)
  const prodFurniture = await prisma.product.create({
    data: {
      sku: "MOB-AERO-DESK-180",
      name: "AeroLift Pro Çift Motorlu Yükseklik Ayarlı Yönetici Masası (180x80cm)",
      category: "FURNITURE",
      unitPrice: 18500,
      returnShippingCost: 1450, // Ağır/hacimli lojistik (Horoz Lojistik)
      sparePartsAvailable: true,
      sparePartCost: 320,
      warrantyMonths: 36,
    },
  });

  const prodEspresso = await prisma.product.create({
    data: {
      sku: "IND-BARISTA-X9",
      name: "BaristaMaster X9 Çift Kazanlı Ticari Espresso Makinesi",
      category: "INDUSTRIAL",
      unitPrice: 64000,
      returnShippingCost: 2200,
      sparePartsAvailable: true,
      sparePartCost: 750,
      warrantyMonths: 24,
    },
  });

  const prodMonitor = await prisma.product.create({
    data: {
      sku: "ELC-ULTRAVIEW-4K",
      name: "UltraView 32\" 4K Renk Kalibrasyonlu Tasarım & CAD Monitörü",
      category: "ELECTRONICS",
      unitPrice: 27500,
      returnShippingCost: 550,
      sparePartsAvailable: false,
      sparePartCost: 0,
      warrantyMonths: 24,
    },
  });

  // 2. Siparişleri oluştur
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-8492",
      customerName: "Ahmet Yılmaz",
      customerEmail: "ahmet@kuzeymimarlik.com.tr",
      customerPhone: "0532 411 88 90",
      companyName: "Kuzey Mimarlık & Mühendislik Ltd. Şti.",
      shippingCarrier: "Horoz Lojistik",
      trackingNumber: "HRZ-88492019",
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      totalAmount: 18500,
      items: {
        create: [
          {
            productId: prodFurniture.id,
            serialNumber: "SN-AERO-99481",
            quantity: 1,
            unitPrice: 18500,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-9104",
      customerName: "Selin Demir",
      customerEmail: "satinalma@roastlab.co",
      customerPhone: "0544 812 30 45",
      companyName: "RoastLab Kahve Zinciri A.Ş.",
      shippingCarrier: "Yurtiçi Kargo",
      trackingNumber: "YK-449102831",
      deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      totalAmount: 64000,
      items: {
        create: [
          {
            productId: prodEspresso.id,
            serialNumber: "SN-BAR-77310",
            quantity: 1,
            unitPrice: 64000,
          },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-7730",
      customerName: "Mert Kaya",
      customerEmail: "mert@pixelstudio.io",
      customerPhone: "0533 901 12 66",
      companyName: "Pixel Studio Kreatif Ajans",
      shippingCarrier: "Aras Kargo",
      trackingNumber: "ARS-19283746",
      deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalAmount: 27500,
      items: {
        create: [
          {
            productId: prodMonitor.id,
            serialNumber: "SN-MON-44012",
            quantity: 1,
            unitPrice: 27500,
          },
        ],
      },
    },
  });

  // 3. Örnek RMA Talepleri (Depo ve Yönetim Panelinde Hemen İncelenebilir)
  const evHash1 = computeSha256("evidence-aero-box-barcode-sample-1");
  const evHash2 = computeSha256("evidence-aero-corner-scratch-sample-2");
  const nowIso = new Date().toISOString();

  // Örnek 1: Kargosuz Kurtarılan (Deflected) Mobilya Hasarı -> 7.205 TL Kurtarıldı!
  await prisma.claim.create({
    data: {
      rmaNumber: "RMA-2026-1041",
      orderId: order1.id,
      productId: prodFurniture.id,
      serialNumber: "SN-AERO-99481",
      issueCategory: "CARGO_DAMAGE",
      issueSeverity: "MINOR_PART",
      customerDescription:
        "Koli köşesinde ezilme vardı, içinden çıkan kablo kanalı kapağı ve sağ plastik ayak aparatı kırık çıktı. Masa motorları sağlam çalışıyor.",
      status: "DEFLECTED_SAVED",
      proposedOfferType: "SPARE_PART_DISPATCH",
      proposedRefundAmt: 0,
      estimatedSavedCost: 7205, // 2*1450 kargo + 4625 değer kaybı - 320 yedek parça
      offerAccepted: true,
      integrityHash: generateClaimIntegritySeal({
        rmaNumber: "RMA-2026-1041",
        orderNumber: order1.orderNumber,
        serialNumber: "SN-AERO-99481",
        issueCategory: "CARGO_DAMAGE",
        evidenceHashes: [evHash1, evHash2],
        timestampIso: nowIso,
      }),
      clientIp: "176.88.42.19",
      evidences: {
        create: [
          {
            evidenceType: "BOX_BARCODE_PHOTO",
            fileName: "horoz_lojistik_koli_barkod.jpg",
            mimeType: "image/jpeg",
            fileSize: 1842900,
            sha256Hash: evHash1,
            verified: true,
          },
          {
            evidenceType: "DAMAGE_CLOSEUP",
            fileName: "kirik_ayak_aparati_yakin.jpg",
            mimeType: "image/jpeg",
            fileSize: 2104500,
            sha256Hash: evHash2,
            verified: true,
          },
        ],
      },
    },
  });

  // Örnek 2: Depoda İnceleme Bekleyen (RMA_APPROVED) Ticari Espresso Makinesi
  const evHash3 = computeSha256("evidence-espresso-serial-label-3");
  const evHash4 = computeSha256("evidence-espresso-pressure-error-4");

  await prisma.claim.create({
    data: {
      rmaNumber: "RMA-2026-1042",
      orderId: order2.id,
      productId: prodEspresso.id,
      serialNumber: "SN-BAR-77310",
      issueCategory: "FUNCTIONAL_DEFECT",
      issueSeverity: "CRITICAL_FAILURE",
      customerDescription:
        "Cihaz açıldıktan 3 dakika sonra E-09 Buhar Kazanı Basınç Sensörü hatası veriyor ve ısıtmayı kesiyor.",
      status: "RMA_APPROVED",
      proposedOfferType: "FULL_RMA_RETURN",
      proposedRefundAmt: 64000,
      estimatedSavedCost: 1100,
      offerAccepted: true,
      integrityHash: generateClaimIntegritySeal({
        rmaNumber: "RMA-2026-1042",
        orderNumber: order2.orderNumber,
        serialNumber: "SN-BAR-77310",
        issueCategory: "FUNCTIONAL_DEFECT",
        evidenceHashes: [evHash3, evHash4],
        timestampIso: nowIso,
      }),
      clientIp: "85.104.12.90",
      evidences: {
        create: [
          {
            evidenceType: "SERIAL_LABEL",
            fileName: "barista_x9_seri_etiketi.png",
            mimeType: "image/png",
            fileSize: 940200,
            sha256Hash: evHash3,
            verified: true,
          },
          {
            evidenceType: "DEFECT_VIDEO",
            fileName: "e09_basinc_hatasi_ekran.mp4",
            mimeType: "video/mp4",
            fileSize: 6450000,
            sha256Hash: evHash4,
            verified: true,
          },
        ],
      },
    },
  });

  // Örnek 3: Depo Ekspertizi Tamamlanmış & Kargo Tazminatı Alınmış Monitör
  const evHash5 = computeSha256("evidence-monitor-crushed-box-5");
  const evHash6 = computeSha256("evidence-monitor-cracked-panel-6");

  await prisma.claim.create({
    data: {
      rmaNumber: "RMA-2026-1043",
      orderId: order3.id,
      productId: prodMonitor.id,
      serialNumber: "SN-MON-44012",
      issueCategory: "CARGO_DAMAGE",
      issueSeverity: "CRITICAL_FAILURE",
      customerDescription:
        "Aras Kargo kolisinin tam ortasında forklift darbesi izi var, iç ekran paneli kırık çıktı.",
      status: "RESOLVED",
      proposedOfferType: "FULL_RMA_RETURN",
      proposedRefundAmt: 27500,
      estimatedSavedCost: 27500, // Kargo şirketinden rücu/tazmin edildi!
      offerAccepted: true,
      integrityHash: generateClaimIntegritySeal({
        rmaNumber: "RMA-2026-1043",
        orderNumber: order3.orderNumber,
        serialNumber: "SN-MON-44012",
        issueCategory: "CARGO_DAMAGE",
        evidenceHashes: [evHash5, evHash6],
        timestampIso: nowIso,
      }),
      clientIp: "94.54.118.3",
      evidences: {
        create: [
          {
            evidenceType: "BOX_BARCODE_PHOTO",
            fileName: "aras_barkodlu_darbeli_koli.jpg",
            mimeType: "image/jpeg",
            fileSize: 2450100,
            sha256Hash: evHash5,
            verified: true,
          },
          {
            evidenceType: "DAMAGE_CLOSEUP",
            fileName: "4k_panel_kirik_detay.jpg",
            mimeType: "image/jpeg",
            fileSize: 3120400,
            sha256Hash: evHash6,
            verified: true,
          },
        ],
      },
      inspection: {
        create: {
          inspectorName: "Kemal Usta (Depo Baş Eksperi)",
          packageCondition: "CRUSHED",
          serialMatched: true,
          evidenceMatched: true,
          finalDecision: "CARRIER_COMPENSATION",
          carrierClaimAmount: 27500,
          inspectorNotes:
            "Müşterinin yüklediği barkodlu dış koli fotoğrafı ve SHA-256 kanıt özeti sayesinde Aras Kargo تazminat dosyası onaylandı, yeni ürün sevk edildi.",
        },
      },
    },
  });
}
