/**
 * Mimar Selim & Vanlı — ClaimFlow Akıllı Kanıt & Kargosuz Kurtarma (Deflection) Motoru
 *
 * Amaç:
 * 1. Arıza tipine göre zorunlu kanıtları (Evidence Requirements) belirlemek.
 * 2. Ürünün gidiş-dönüş kargo maliyeti, yedek parça durumu ve hasar şiddetine göre
 *    komple iade (RMA) yerine kargosuz çözüm (Ücretsiz Yedek Parça veya Anında Kısmi İade)
 *    önererek işletmenin net kârını kurtarmak.
 */

export type IssueCategory =
  | "CARGO_DAMAGE"
  | "MISSING_PART"
  | "FUNCTIONAL_DEFECT"
  | "WRONG_ITEM";

export type IssueSeverity = "COSMETIC" | "MINOR_PART" | "CRITICAL_FAILURE";

export type EvidenceType =
  | "BOX_BARCODE_PHOTO"
  | "DAMAGE_CLOSEUP"
  | "SERIAL_LABEL"
  | "DEFECT_VIDEO"
  | "CARRIER_REPORT";

export interface EvidenceRequirement {
  type: EvidenceType;
  title: string;
  description: string;
  mandatory: boolean;
}

export interface DeflectionDecision {
  offerType: "SPARE_PART_DISPATCH" | "PARTIAL_REFUND" | "FULL_RMA_RETURN";
  offerTitle: string;
  offerSummary: string;
  proposedRefundAmount: number;
  fullReturnCostToCompany: number;
  selectedSolutionCost: number;
  estimatedSavedCost: number;
  requiresCarrierClaimReport: boolean;
}

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  CARGO_DAMAGE: "Kargo / Taşıma Hasarı (Kırık, Ezilmiş Koli)",
  MISSING_PART: "Eksik Parça / Montaj Aparatı Eksikliği",
  FUNCTIONAL_DEFECT: "Teknik Arıza / Cihaz Çalışmıyor",
  WRONG_ITEM: "Yanlış Ürün veya Yanlış Model Gönderimi",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  COSMETIC: "Kozmetik Çizik / Yüzeysel Kusur (Kullanıma Engel Değil)",
  MINOR_PART: "Alt Parça / Kapak / Aparat Hasarı (Parça Değişimiyle Çözülür)",
  CRITICAL_FAILURE: "Ana Gövde / Motor / Anakart Tamamen Kullanılamaz Durumda",
};

export function getRequiredEvidences(category: IssueCategory): EvidenceRequirement[] {
  switch (category) {
    case "CARGO_DAMAGE":
      return [
        {
          type: "BOX_BARCODE_PHOTO",
          title: "Dış Koli & Kargo Barkodu Fotoğrafı",
          description:
            "Kargo şirketine rücu (tazminat) edilebilmesi için kolinin dışındaki barkod etiketi ve ezilme/yırtılma net görünmelidir.",
          mandatory: true,
        },
        {
          type: "DAMAGE_CLOSEUP",
          title: "Hasarlı / Kırık Parça Yakın Çekim Fotoğrafı",
          description: "Üründeki kırık veya ezik bölgeyi yakından gösteren net fotoğraf.",
          mandatory: true,
        },
        {
          type: "CARRIER_REPORT",
          title: "Kargo Hasar Tespit Tutanağı (Varsa)",
          description: "Kurye teslimatında tutulan tutanak veya teslimat anı görüntüsü.",
          mandatory: false,
        },
      ];

    case "MISSING_PART":
      return [
        {
          type: "BOX_BARCODE_PHOTO",
          title: "Kutu İçeriği & Paket Etiketi Fotoğrafı",
          description: "Kutudan çıkan mevcut parçaların ve paket üzerindeki kontrol etiketinin toplu fotoğrafı.",
          mandatory: true,
        },
        {
          type: "SERIAL_LABEL",
          title: "Ürün Seri Numarası / Model Etiketi",
          description: "Doğru yedek parçanın eşleştirilmesi için ürün üzerindeki seri numarası etiketi.",
          mandatory: true,
        },
      ];

    case "FUNCTIONAL_DEFECT":
      return [
        {
          type: "SERIAL_LABEL",
          title: "Cihaz Seri Numarası & Garanti Etiketi",
          description: "Cihazın altındaki veya arkasındaki seri numarası ve güvenlik bandrolü fotoğrafı.",
          mandatory: true,
        },
        {
          type: "DEFECT_VIDEO",
          title: "Arıza Gösterim Kanıtı (Fotoğraf veya Kısa Video/Görsel)",
          description: "Cihazın verdiği hata kodunu, sesini veya çalışmama durumunu gösteren kanıt.",
          mandatory: true,
        },
      ];

    case "WRONG_ITEM":
      return [
        {
          type: "BOX_BARCODE_PHOTO",
          title: "Gelen Ürün Kutusu Barkodu",
          description: "Tarafınıza ulaşan ürünün kutu üzerindeki SKU/Barkod etiketi.",
          mandatory: true,
        },
        {
          type: "SERIAL_LABEL",
          title: "Gelen Ürünün Seri Numarası",
          description: "Depo çapraz sevkiyat kontrolü için ürün üzerindeki seri numarası.",
          mandatory: true,
        },
      ];
  }
}

export function calculateDeflectionOffer(params: {
  unitPrice: number;
  returnShippingCost: number;
  sparePartsAvailable: boolean;
  sparePartCost: number;
  issueCategory: IssueCategory;
  issueSeverity: IssueSeverity;
}): DeflectionDecision {
  const {
    unitPrice,
    returnShippingCost,
    sparePartsAvailable,
    sparePartCost,
    issueCategory,
    issueSeverity,
  } = params;

  // Komple iade durumunda şirketin katlandığı toplam zarar:
  // Gidiş-dönüş ağır kargo + yeniden paketleme/değer kaybı (%25 ürün bedeli)
  const fullReturnCostToCompany = Math.round(returnShippingCost * 2 + unitPrice * 0.25);

  // Senaryo 1: Eksik parça veya değiştirilebilir alt parça hasarı -> Komple ürünü geri alma, sadece yedek parça gönder!
  if (
    sparePartsAvailable &&
    (issueCategory === "MISSING_PART" || issueSeverity === "MINOR_PART")
  ) {
    const saved = Math.max(0, fullReturnCostToCompany - sparePartCost);
    return {
      offerType: "SPARE_PART_DISPATCH",
      offerTitle: "Kargoyla Uğraşmayın: Ücretsiz Ekspres Yedek Parça Gönderimi",
      offerSummary:
        "Komple ürünü söküp paketlemenize ve kargo beklemenize gerek yok! Eksik/hasarlı parçayı bugün ücretsiz ekspres kargoyla adresinize gönderelim, elinizdeki ürün sizde kalsın.",
      proposedRefundAmount: 0,
      fullReturnCostToCompany,
      selectedSolutionCost: sparePartCost,
      estimatedSavedCost: saved,
      requiresCarrierClaimReport: issueCategory === "CARGO_DAMAGE",
    };
  }

  // Senaryo 2: Kozmetik kusur / yüzeysel çizik -> Komple iade yerine anında %18 Kısmi İade / İndirim!
  if (issueSeverity === "COSMETIC") {
    const partialRefund = Math.round(unitPrice * 0.18);
    // Eğer kısmi iade tutarı, komple kargo+değer kaybı maliyetinden düşükse şirket kârdadır
    const saved = Math.max(150, fullReturnCostToCompany - partialRefund);
    return {
      offerType: "PARTIAL_REFUND",
      offerTitle: `Anında ${partialRefund.toLocaleString("tr-TR")} TL Kısmi İade (Ürün Sizde Kalsın)`,
      offerSummary: `Ürünü kargoya teslim etmekle vakit kaybetmeyin. Kullanıma engel olmayan bu kozmetik kusur için ${partialRefund.toLocaleString(
        "tr-TR"
      )} TL tutarı anında hesabınıza/faturanıza iade edelim, ürünü kullanmaya devam edin.`,
      proposedRefundAmount: partialRefund,
      fullReturnCostToCompany,
      selectedSolutionCost: partialRefund,
      estimatedSavedCost: saved,
      requiresCarrierClaimReport: issueCategory === "CARGO_DAMAGE",
    };
  }

  // Senaryo 3: Kritik arıza veya yanlış ürün -> Kanıtları doğrulanmış RMA Kargo Kabulü
  return {
    offerType: "FULL_RMA_RETURN",
    offerTitle: "Kanıt Doğrulandı: Barkodlu RMA İade / Değişim Onayı",
    offerSummary:
      "Yüklediğiniz kanıtlar ve seri numarası doğrulandı. Özel RMA QR etiketinizi indirip kolinin üzerine yapıştırarak anlaşmalı kargo koduyla ücretsiz gönderebilirsiniz.",
    proposedRefundAmount: unitPrice,
    fullReturnCostToCompany,
    selectedSolutionCost: fullReturnCostToCompany,
    estimatedSavedCost: Math.round(returnShippingCost * 0.5), // Sahte/kanıtsız iade önleme tasarrufu
    requiresCarrierClaimReport: issueCategory === "CARGO_DAMAGE",
  };
}
