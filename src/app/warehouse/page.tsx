"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Warehouse,
  TrendingUp,
  CheckCircle2,
  Clock,
  FileCheck2,
  Lock,
  Scale,
  AlertOctagon,
  PackageCheck,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  ISSUE_CATEGORY_LABELS,
  ISSUE_SEVERITY_LABELS,
  IssueCategory,
  IssueSeverity,
} from "@/lib/rules-engine";

interface EvidenceItem {
  id: string;
  evidenceType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string;
}

interface InspectionItem {
  id: string;
  inspectorName: string;
  packageCondition: string;
  serialMatched: boolean;
  evidenceMatched: boolean;
  finalDecision: string;
  carrierClaimAmount?: number;
  inspectorNotes: string;
  inspectedAt: string;
}

interface ClaimRecord {
  id: string;
  rmaNumber: string;
  serialNumber: string;
  issueCategory: IssueCategory;
  issueSeverity: IssueSeverity;
  customerDescription: string;
  status: string;
  proposedOfferType: string;
  proposedRefundAmt: number;
  estimatedSavedCost: number;
  integrityHash: string;
  clientIp?: string;
  createdAt: string;
  order: {
    orderNumber: string;
    customerName: string;
    companyName?: string;
    shippingCarrier: string;
    trackingNumber: string;
  };
  product: {
    sku: string;
    name: string;
    unitPrice: number;
    returnShippingCost: number;
  };
  evidences: EvidenceItem[];
  inspection?: InspectionItem | null;
}

interface DashboardStats {
  totalClaims: number;
  deflectedCount: number;
  awaitingWarehouseCount: number;
  resolvedCount: number;
  totalSavedCost: number;
  carrierCompensatedTotal: number;
}

export default function WarehouseDashboardPage() {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRecord | null>(null);
  const [filterRma, setFilterRma] = useState("");

  // Depo Ekspertiz Form State
  const [inspectorName, setInspectorName] = useState("Kemal Usta (Depo Baş Eksperi)");
  const [packageCondition, setPackageCondition] = useState("CRUSHED");
  const [serialMatched, setSerialMatched] = useState(true);
  const [evidenceMatched, setEvidenceMatched] = useState(true);
  const [finalDecision, setFinalDecision] = useState("CARRIER_COMPENSATION");
  const [carrierClaimAmount, setCarrierClaimAmount] = useState<number>(0);
  const [inspectorNotes, setInspectorNotes] = useState(
    "Koli üzerindeki RMA QR kodu okutuldu. Müşterinin yüklediği SHA-256 mühürlü dış koli barkod fotoğrafı ile gelen paket eşleşiyor. Kargo tazminat dosyası oluşturuldu."
  );
  const [savingInspection, setSavingInspection] = useState(false);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claims");
      const data = await res.json();
      if (res.ok && data.claims) {
        setClaims(data.claims);
        setStats(data.stats);
        if (!selectedClaim && data.claims.length > 0) {
          const firstWarehouse =
            data.claims.find((c: ClaimRecord) => c.status === "RMA_APPROVED") ||
            data.claims[0];
          setSelectedClaim(firstWarehouse);
          setCarrierClaimAmount(firstWarehouse.product.unitPrice);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectClaim = (c: ClaimRecord) => {
    setSelectedClaim(c);
    setCarrierClaimAmount(c.inspection?.carrierClaimAmount ?? c.product.unitPrice);
    if (c.inspection) {
      setInspectorName(c.inspection.inspectorName);
      setPackageCondition(c.inspection.packageCondition);
      setSerialMatched(c.inspection.serialMatched);
      setEvidenceMatched(c.inspection.evidenceMatched);
      setFinalDecision(c.inspection.finalDecision);
      setInspectorNotes(c.inspection.inspectorNotes);
    }
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    setSavingInspection(true);

    try {
      const res = await fetch(`/api/claims/${selectedClaim.id}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectorName,
          packageCondition,
          serialMatched,
          evidenceMatched,
          finalDecision,
          carrierClaimAmount,
          inspectorNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.claim) {
        await fetchClaims();
        setSelectedClaim(data.claim);
      }
    } finally {
      setSavingInspection(false);
    }
  };

  const filteredClaims = claims.filter(
    (c) =>
      c.rmaNumber.toLowerCase().includes(filterRma.toLowerCase()) ||
      c.serialNumber.toLowerCase().includes(filterRma.toLowerCase()) ||
      c.order.orderNumber.toLowerCase().includes(filterRma.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "DEFLECTED_SAVED":
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
            ⚡ Kargosuz Kurtarıldı
          </span>
        );
      case "RMA_APPROVED":
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
            📦 Depo Kabul / Ekspertiz Bekliyor
          </span>
        );
      case "RESOLVED":
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold">
            ✓ Ekspertiz & Tazminat Tamamlandı
          </span>
        );
      case "REJECTED":
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold">
            ✕ Kullanıcı Hatası (Reddedildi)
          </span>
        );
      default:
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Üst Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  ClaimFlow Depo & Ekspertiz Merkezi
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                  RMA Karar & Kargo Rücu Paneli
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Barkodlu Koli Kabul, SHA-256 Kanıt Doğrulama ve Lojistik Zarar Kurtarma Metrikleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
            >
              ← Müşteri / Bayi RMA Portalı
            </Link>
            <button
              type="button"
              onClick={fetchClaims}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Listeyi Yenile
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Finansal & Operasyonel ROI Kartları */}
        {stats && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Toplam Kurtarılan Maliyet (ROI)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                +{stats.totalSavedCost.toLocaleString("tr-TR")} TL
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Kargosuz çözüm + kargo rücu + haksız iade engeli
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Kargosuz Kurtarılan (Deflected)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {stats.deflectedCount} / {stats.totalClaims} Talep
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">
                Yedek parça veya kısmi iade ile depoya gelmeden çözüldü
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Kargo Şirketinden Tazmin Edilen</span>
                <Scale className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-bold text-sky-400 mt-2">
                {stats.carrierCompensatedTotal.toLocaleString("tr-TR")} TL
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Zorunlu barkodlu koli fotoğrafı & SHA-256 delili ile
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Depoda Ekspertiz Bekleyen RMA</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-300 mt-2">
                {stats.awaitingWarehouseCount} Koli
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                QR etiketli, seri numarası doğrulanmış gönderiler
              </p>
            </div>
          </section>
        )}

        {/* Ana Çalışma Alanı: Sol RMA Listesi (5 birim) & Sağ Ekspertiz / Kanıt İnceleme (7 birim) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol Sütun: RMA Kuyruğu */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterRma}
                  onChange={(e) => setFilterRma(e.target.value)}
                  placeholder="RMA Kodu, Sipariş No veya Seri No okutun..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredClaims.map((claim) => {
                  const active = selectedClaim?.id === claim.id;
                  return (
                    <button
                      key={claim.id}
                      type="button"
                      onClick={() => handleSelectClaim(claim)}
                      className={`w-full text-left p-4 rounded-xl border transition space-y-2 ${
                        active
                          ? "bg-slate-800/90 border-amber-500/60 shadow-md"
                          : "bg-slate-950/80 border-slate-800 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {claim.rmaNumber}
                        </span>
                        {statusBadge(claim.status)}
                      </div>

                      <p className="text-sm font-semibold text-white line-clamp-1">
                        {claim.product.name}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {claim.order.companyName || claim.order.customerName}
                        </span>
                        <span className="font-mono text-slate-300">
                          SN: {claim.serialNumber}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                        <span className="text-slate-400">
                          {ISSUE_CATEGORY_LABELS[claim.issueCategory]}
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          +{claim.estimatedSavedCost.toLocaleString("tr-TR")} TL Kurtarıldı
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sağ Sütun: Seçili RMA Kanıt İnceleme & Depo Ekspertiz Karar Formu */}
          <div className="lg:col-span-7">
            {selectedClaim ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-white font-mono">
                        {selectedClaim.rmaNumber}
                      </h2>
                      {statusBadge(selectedClaim.status)}
                    </div>
                    <p className="text-sm text-slate-300 mt-1">
                      {selectedClaim.product.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sipariş: <strong>{selectedClaim.order.orderNumber}</strong> • Kargo:{" "}
                      <strong>
                        {selectedClaim.order.shippingCarrier} (
                        {selectedClaim.order.trackingNumber})
                      </strong>{" "}
                      • Seri No:{" "}
                      <code className="text-amber-300">
                        {selectedClaim.serialNumber}
                      </code>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Ürün Satış Bedeli</span>
                    <span className="text-lg font-bold text-white">
                      {selectedClaim.product.unitPrice.toLocaleString("tr-TR")} TL
                    </span>
                  </div>
                </div>

                {/* Müşteri Beyanı & Kriptografik Kanıt Listesi */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4" />
                    Müşteri Beyanı & SHA-256 Mühürlü Kanıt Dosyaları (
                    {selectedClaim.evidences.length})
                  </h3>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                    <p className="font-semibold text-slate-400 mb-1">
                      {ISSUE_CATEGORY_LABELS[selectedClaim.issueCategory]} —{" "}
                      {ISSUE_SEVERITY_LABELS[selectedClaim.issueSeverity]}
                    </p>
                    <p>&ldquo;{selectedClaim.customerDescription}&rdquo;</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedClaim.evidences.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">
                            {ev.evidenceType}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                            SHA-256 Doğrulandı
                          </span>
                        </div>
                        <p className="text-xs text-white font-mono truncate">
                          📎 {ev.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          Hash: {ev.sha256Hash}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center gap-2.5 text-xs">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[11px] text-slate-400 block">
                        RMA Bütünlük Mührü (HMAC-SHA256) • IP: {selectedClaim.clientIp}
                      </span>
                      <code className="text-[11px] text-amber-300 font-mono">
                        {selectedClaim.integrityHash}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Depo Ekspertiz & Karar Formu */}
                <form
                  onSubmit={handleInspectionSubmit}
                  className="pt-4 border-t border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4" />
                      Depo Fiziksel Kabul & Ekspertiz Kararı
                    </h3>
                    {selectedClaim.inspection && (
                      <span className="text-xs text-sky-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ekspertiz Kayıtlı
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Depo Eksperi Adı
                      </label>
                      <input
                        type="text"
                        value={inspectorName}
                        onChange={(e) => setInspectorName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Fiziksel Koli Durumu
                      </label>
                      <select
                        value={packageCondition}
                        onChange={(e) => setPackageCondition(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="INTACT">Sağlam / Hasarsız Koli</option>
                        <option value="CRUSHED">Ezilmiş / Darbeli Koli (Kargo Hasarı)</option>
                        <option value="TORN">Yırtık / Bantları Açılmış</option>
                        <option value="WET">Islak / Sıvı Temaslı</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={serialMatched}
                        onChange={(e) => setSerialMatched(e.target.checked)}
                        className="rounded text-emerald-500"
                      />
                      <span>
                        Cihaz Seri No (<strong>{selectedClaim.serialNumber}</strong>) Eşleşti
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={evidenceMatched}
                        onChange={(e) => setEvidenceMatched(e.target.checked)}
                        className="rounded text-emerald-500"
                      />
                      <span>Yüklenen Fotoğraflar Gelen Ürünle Birebir Aynı</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Nihai Ekspertiz & Maliyet Kararı
                      </label>
                      <select
                        value={finalDecision}
                        onChange={(e) => setFinalDecision(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="CARRIER_COMPENSATION">
                          Kargo Şirketine Rücu / Tazminat Dosyası Aç (Hasar Tazmini)
                        </option>
                        <option value="REPAIR">
                          Teknik Serviste Onarım & Müşteriye Geri Gönderim
                        </option>
                        <option value="REPLACE">
                          Birebir Yeni Ürün Değişimi
                        </option>
                        <option value="REJECT_USER_FAULT">
                          Kullanıcı Montaj/Kullanım Hatası — İade Reddi (Zararı Önle)
                        </option>
                      </select>
                    </div>

                    {finalDecision === "CARRIER_COMPENSATION" && (
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">
                          Kargo Şirketinden Tazmin Edilecek Tutar (TL)
                        </label>
                        <input
                          type="number"
                          value={carrierClaimAmount}
                          onChange={(e) =>
                            setCarrierClaimAmount(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-emerald-300 font-bold"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Ekspertiz & Kargo Tazminat Rapor Notu
                    </label>
                    <textarea
                      rows={2}
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingInspection}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
                  >
                    {savingInspection
                      ? "Ekspertiz Raporu Mühürleniyor..."
                      : "Ekspertiz Kararını Kaydet & Dosyayı Kapat"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400">
                <AlertOctagon className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <p className="text-sm">İncelemek için sol listeden bir RMA kaydı seçin.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
