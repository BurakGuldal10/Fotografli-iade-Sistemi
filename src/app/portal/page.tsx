"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ShieldCheck,
  PackageSearch,
  UploadCloud,
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Truck,
  FileCheck2,
  ArrowRight,
  Lock,
  Warehouse,
  RefreshCw,
} from "lucide-react";
import {
  calculateDeflectionOffer,
  getRequiredEvidences,
  IssueCategory,
  IssueSeverity,
  ISSUE_CATEGORY_LABELS,
  ISSUE_SEVERITY_LABELS,
} from "@/lib/rules-engine";

interface ProductInfo {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  returnShippingCost: number;
  sparePartsAvailable: boolean;
  sparePartCost: number;
}

interface OrderItemInfo {
  id: string;
  serialNumber: string;
  unitPrice: number;
  product: ProductInfo;
}

interface OrderInfo {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  companyName?: string;
  shippingCarrier: string;
  trackingNumber: string;
  deliveredAt: string;
  items: OrderItemInfo[];
}

interface UploadedEvidenceItem {
  evidenceType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  contentSample: string;
}

export default function CustomerRmaPortalPage() {
  const [searchQuery, setSearchQuery] = useState("ORD-2026-8492");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [selectedItem, setSelectedItem] = useState<OrderItemInfo | null>(null);

  const [issueCategory, setIssueCategory] = useState<IssueCategory>("CARGO_DAMAGE");
  const [issueSeverity, setIssueSeverity] = useState<IssueSeverity>("MINOR_PART");
  const [description, setDescription] = useState(
    "Teslimat sırasında kolinin sağ alt köşesinde ezilme vardı. Masa motorları çalışıyor ancak alt kablo kanalı kapağı ve sağ ayak plastik aparatı kırık çıktı."
  );
  const [webhookUrl, setWebhookUrl] = useState("");

  const [uploadedEvidences, setUploadedEvidences] = useState<
    Record<string, UploadedEvidenceItem>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    claim: {
      id: string;
      rmaNumber: string;
      status: string;
      serialNumber: string;
      integrityHash: string;
      estimatedSavedCost: number;
      proposedOfferType: string;
      proposedRefundAmt: number;
    };
    qrDataUrl?: string;
  } | null>(null);

  const handleLookup = async (qOverride?: string) => {
    const q = (qOverride ?? searchQuery).trim();
    if (!q) return;
    setLoadingOrder(true);
    setLookupError(null);
    setCreatedResult(null);

    try {
      const res = await fetch(`/api/orders/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok || !data.order) {
        setLookupError(data.error || "Sipariş bulunamadı.");
        setOrder(null);
        setSelectedItem(null);
      } else {
        setOrder(data.order);
        setSelectedItem(data.order.items[0] || null);
      }
    } catch {
      setLookupError("Sorgulama sırasında bağlantı hatası oluştu.");
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    handleLookup("ORD-2026-8492");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredEvidences = getRequiredEvidences(issueCategory);

  const handleFileSelect = (evidenceType: string, file: File | null) => {
    if (!file) return;
    setUploadedEvidences((prev) => ({
      ...prev,
      [evidenceType]: {
        evidenceType,
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        fileSize: file.size || 245000,
        contentSample: `${file.name}-${file.size}-${file.lastModified}`,
      },
    }));
  };

  const handleSimulatedEvidenceUpload = (evidenceType: string, sampleName: string) => {
    setUploadedEvidences((prev) => ({
      ...prev,
      [evidenceType]: {
        evidenceType,
        fileName: sampleName,
        mimeType: sampleName.endsWith(".mp4") ? "video/mp4" : "image/jpeg",
        fileSize: 1945200,
        contentSample: `simulated-${evidenceType}-${sampleName}-${Date.now()}`,
      },
    }));
  };

  const allMandatoryUploaded = requiredEvidences
    .filter((r) => r.mandatory)
    .every((r) => Boolean(uploadedEvidences[r.type]));

  const liveDeflection = selectedItem
    ? calculateDeflectionOffer({
        unitPrice: selectedItem.product.unitPrice,
        returnShippingCost: selectedItem.product.returnShippingCost,
        sparePartsAvailable: selectedItem.product.sparePartsAvailable,
        sparePartCost: selectedItem.product.sparePartCost,
        issueCategory,
        issueSeverity,
      })
    : null;

  const submitClaim = async (
    selectedResolution: "ACCEPT_SMART_OFFER" | "REQUEST_FULL_RMA"
  ) => {
    if (!order || !selectedItem) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          productId: selectedItem.product.id,
          serialNumber: selectedItem.serialNumber,
          issueCategory,
          issueSeverity,
          customerDescription: description,
          evidences: Object.values(uploadedEvidences),
          selectedResolution,
          webhookUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "RMA talebi oluşturulamadı.");
        return;
      }

      const qrPayload = JSON.stringify({
        rma: data.claim.rmaNumber,
        order: order.orderNumber,
        sn: selectedItem.serialNumber,
        seal: data.claim.integrityHash.slice(0, 16),
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 220,
        margin: 1,
      });

      setCreatedResult({
        claim: data.claim,
        qrDataUrl,
      });
    } catch {
      setSubmitError("Sunucu ile iletişim kurulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Üst Navigasyon Barı */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  Fotoğraflı İade Sistemi
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                  Kanıt Zorunlu İade & Karar Motoru
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kargosuz İade Kurtarma, SHA-256 Kanıt Mühürleme ve Depo Ekspertiz Sistemi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
            >
              Müşteri / Bayi RMA Portalı
            </Link>
            <Link
              href="/warehouse"
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Warehouse className="w-4 h-4 text-amber-400" />
              Depo & Yönetim Paneli
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Adım 1: Sipariş & Seri Numarası Doğrulama */}
        <section className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                1. Adım • Sipariş & Seri No Doğrulama
              </span>
              <h1 className="text-xl font-bold text-white mt-1">
                Garanti, Hasar veya İade (RMA) Kaydı Başlatın
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                RMA etiketi oluşturulabilmesi için sipariş numaranızı veya ürün üzerindeki seri numarasını girin.
              </p>
            </div>

            {/* Hızlı Demo Seçim Butonları */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">Demo Siparişler:</span>
              {[
                { code: "ORD-2026-8492", label: "Mobilya (Ağır Lojistik)" },
                { code: "ORD-2026-9104", label: "Endüstriyel Espresso" },
                { code: "ORD-2026-7730", label: "4K CAD Monitör" },
              ].map((demo) => (
                <button
                  key={demo.code}
                  type="button"
                  onClick={() => {
                    setSearchQuery(demo.code);
                    handleLookup(demo.code);
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                    searchQuery === demo.code
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {demo.code} ({demo.label})
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <PackageSearch className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sipariş No (ORD-2026-8492) veya Seri No (SN-AERO-99481)"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleLookup()}
              disabled={loadingOrder}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loadingOrder ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Siparişi Sorgula
            </button>
          </div>

          {lookupError && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{lookupError}</span>
            </div>
          )}

          {order && selectedItem && (
            <div className="mt-5 p-4 rounded-xl bg-slate-950/90 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400">Müşteri / Kurum</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {order.customerName}
                </p>
                <p className="text-xs text-emerald-400">
                  {order.companyName || order.customerEmail}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Ürün & Seri Numarası</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {selectedItem.product.name}
                </p>
                <p className="text-xs text-amber-300 font-mono mt-0.5">
                  SN: {selectedItem.serialNumber} • SKU: {selectedItem.product.sku}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Teslimat & Lojistik Profili</p>
                <p className="text-sm font-semibold text-white mt-0.5 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-sky-400" />
                  {order.shippingCarrier} ({order.trackingNumber})
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Satış: {selectedItem.product.unitPrice.toLocaleString("tr-TR")} TL • Tek Yön Lojistik:{" "}
                  {selectedItem.product.returnShippingCost.toLocaleString("tr-TR")} TL
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Eğer RMA sonucu oluşturulduysa Sonuç & QR Etiket Kartı */}
        {createdResult && order && selectedItem && (
          <section className="rounded-2xl bg-emerald-950/30 border-2 border-emerald-500/50 p-6 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-emerald-500/20 pb-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    {createdResult.claim.status === "DEFLECTED_SAVED"
                      ? "Kargosuz Anında Çözüm Onaylandı (İade Kurtarıldı)"
                      : "Kanıt Doğrulandı • Barkodlu RMA Kargo Onayı"}
                  </span>
                  <h2 className="text-2xl font-bold text-white">
                    Kaydınız Oluşturuldu: {createdResult.claim.rmaNumber}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">
                  Kurtarılan Lojistik / Operasyon Maliyeti
                </span>
                <span className="text-xl font-extrabold text-emerald-400">
                  +{createdResult.claim.estimatedSavedCost.toLocaleString("tr-TR")} TL Tasarruf
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 space-y-3">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <p className="text-xs font-semibold text-emerald-400 uppercase">
                    Karar & Sonraki Adım Özeti
                  </p>
                  {createdResult.claim.status === "DEFLECTED_SAVED" ? (
                    <p className="text-sm text-slate-200 leading-relaxed">
                      <strong>Ürünü kargoya vermenize gerek yoktur!</strong> Seçtiğiniz{" "}
                      <span className="text-emerald-300 font-semibold">
                        {createdResult.claim.proposedOfferType === "SPARE_PART_DISPATCH"
                          ? "Ücretsiz Ekspres Yedek Parça Gönderimi"
                          : `${createdResult.claim.proposedRefundAmt?.toLocaleString(
                              "tr-TR"
                            )} TL Anında Kısmi İade`}
                      </span>{" "}
                      çözümü işleme alınmıştır. Elinizdeki ürünü kullanmaya devam edebilirsiniz.
                    </p>
                  ) : (
                    <p className="text-sm text-slate-200 leading-relaxed">
                      Yüklediğiniz kanıtlar kriptografik olarak mühürlendi. Sağdaki{" "}
                      <strong>RMA QR Kargo Etiketini</strong> kolinin üzerine yapıştırarak{" "}
                      <strong>{order.shippingCarrier}</strong> üzerinden ücretsiz gönderebilirsiniz.
                      Etiketsiz koliler depoya kabul edilmez.
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[11px] text-slate-400 block">
                        SHA-256 Kriptografik Kanıt & Zaman Damgası Mührü
                      </span>
                      <code className="text-xs text-amber-300 font-mono">
                        {createdResult.claim.integrityHash}
                      </code>
                    </div>
                  </div>
                  <Link
                    href="/warehouse"
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white shrink-0 transition"
                  >
                    Depo Panelinde Gör →
                  </Link>
                </div>
              </div>

              {/* Yazdırılabilir QR RMA Kargo Etiketi */}
              <div className="bg-white text-slate-950 rounded-2xl p-4 shadow-lg border-2 border-dashed border-slate-300 flex flex-col items-center text-center">
                <div className="w-full flex items-center justify-between text-[11px] font-bold border-b border-slate-200 pb-1.5 mb-2">
                  <span>FOTOĞRAFLI İADE ETİKETİ</span>
                  <span className="font-mono">{createdResult.claim.rmaNumber}</span>
                </div>
                {createdResult.qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={createdResult.qrDataUrl}
                    alt="RMA QR Code"
                    className="w-36 h-36 object-contain"
                  />
                )}
                <p className="text-xs font-bold mt-1">{order.orderNumber}</p>
                <p className="text-[11px] font-mono text-slate-600">
                  SN: {selectedItem.serialNumber}
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="mt-3 w-full py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Etiketi Yazdır (PDF)
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Adım 2 & 3: Zorunlu Kanıt Yükleme ve Akıllı Çözüm Ağacı */}
        {order && selectedItem && !createdResult && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sol Sütun: Arıza Seçimi & Zorunlu Kanıtlar (7 birim) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    2. Adım • Arıza Sınıflandırma & Zorunlu Kanıt Kalkanı
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1">
                    Sorun Nedir ve Kanıtlarınız Nelerdir?
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Sorun Kategorisi
                    </label>
                    <select
                      value={issueCategory}
                      onChange={(e) => {
                        setIssueCategory(e.target.value as IssueCategory);
                        setUploadedEvidences({});
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {(Object.keys(ISSUE_CATEGORY_LABELS) as IssueCategory[]).map(
                        (cat) => (
                          <option key={cat} value={cat}>
                            {ISSUE_CATEGORY_LABELS[cat]}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Hasar / Sorun Şiddeti
                    </label>
                    <select
                      value={issueSeverity}
                      onChange={(e) =>
                        setIssueSeverity(e.target.value as IssueSeverity)
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {(Object.keys(ISSUE_SEVERITY_LABELS) as IssueSeverity[]).map(
                        (sev) => (
                          <option key={sev} value={sev}>
                            {ISSUE_SEVERITY_LABELS[sev]}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Müşteri / Teknik Açıklama (Zorunlu)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Sorunu detaylı açıklayın..."
                  />
                </div>

                {/* Dinamik Zorunlu Kanıt Listesi */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4" />
                      Zorunlu Görsel / Belge Kanıtları
                    </span>
                    <span className="text-[11px] text-slate-400">
                      JPG, PNG, WEBP, MP4, PDF (Maks 15MB)
                    </span>
                  </div>

                  {requiredEvidences.map((ev) => {
                    const uploaded = uploadedEvidences[ev.type];
                    return (
                      <div
                        key={ev.type}
                        className={`p-4 rounded-xl border transition ${
                          uploaded
                            ? "bg-emerald-950/20 border-emerald-500/40"
                            : "bg-slate-950 border-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">
                                {ev.title}
                              </span>
                              {ev.mandatory ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                  ZORUNLU KANIT
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                  İsteğe Bağlı
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {ev.description}
                            </p>
                          </div>

                          {uploaded && (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                              Yüklendi
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition">
                            <UploadCloud className="w-4 h-4 text-emerald-400" />
                            <span>Dosya Seç</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
                              className="hidden"
                              onChange={(e) =>
                                handleFileSelect(
                                  ev.type,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              handleSimulatedEvidenceUpload(
                                ev.type,
                                `${ev.type.toLowerCase()}_${selectedItem.serialNumber.toLowerCase()}.jpg`
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-300 transition"
                          >
                            ⚡ Örnek Kanıt Görseli Ekle (Demo)
                          </button>

                          {uploaded && (
                            <span className="text-xs text-slate-300 font-mono truncate max-w-xs">
                              📎 {uploaded.fileName} (
                              {Math.round(uploaded.fileSize / 1024)} KB)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* İsteğe Bağlı ERP Webhook (SSRF Korumalı) */}
                <div className="pt-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    B2B ERP / E-Ticaret Bildirim Webhook URL (İsteğe Bağlı • Ali Oda SSRF Kalkanı Aktif)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://erp.firmaniz.com/webhooks/claimflow"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Sağ Sütun: Akıllı Çözüm Ağacı & Kargo Kurtarma Teklifi (5 birim) */}
            <div className="lg:col-span-5 space-y-6">
              {liveDeflection && (
                <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/95 border border-emerald-500/40 p-6 shadow-xl space-y-5 sticky top-24">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      3. Adım • Akıllı Çözüm & Karar Motoru
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Canlı Maliyet Analizi
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h3 className="text-base font-bold text-white">
                      {liveDeflection.offerTitle}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {liveDeflection.offerSummary}
                    </p>
                  </div>

                  {/* İşletme İçin Lojistik Zarar vs Akıllı Kurtarma Karşılaştırması */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 text-xs">
                    <p className="font-semibold text-slate-300 border-b border-slate-800 pb-1.5">
                      📊 İşletme Lojistik & Değer Kaybı Simülasyonu
                    </p>
                    <div className="flex justify-between text-slate-400">
                      <span>Komple İade Gidiş-Dönüş Kargo + Değer Kaybı:</span>
                      <span className="text-rose-400 font-semibold">
                        -{liveDeflection.fullReturnCostToCompany.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Önerilen Çözüm Maliyeti:</span>
                      <span className="text-amber-300 font-semibold">
                        {liveDeflection.selectedSolutionCost.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800/80 text-sm">
                      <span>Net Kurtarılan Tutar (ROI):</span>
                      <span>
                        +{liveDeflection.estimatedSavedCost.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                  </div>

                  {!allMandatoryUploaded && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        Çözümü onaylamak veya RMA kargo barkodu almak için sol taraftaki{" "}
                        <strong>zorunlu kanıtları</strong> yükleyin.
                      </span>
                    </div>
                  )}

                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="space-y-3 pt-1">
                    {liveDeflection.offerType !== "FULL_RMA_RETURN" && (
                      <button
                        type="button"
                        disabled={!allMandatoryUploaded || submitting}
                        onClick={() => submitClaim("ACCEPT_SMART_OFFER")}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition disabled:opacity-40"
                      >
                        <Sparkles className="w-4 h-4" />
                        {liveDeflection.offerType === "SPARE_PART_DISPATCH"
                          ? "Kargoyla Uğraşma: Ücretsiz Yedek Parça İstiyorum"
                          : `Kargoyla Uğraşma: Anında ${liveDeflection.proposedRefundAmount.toLocaleString(
                              "tr-TR"
                            )} TL İade Al`}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!allMandatoryUploaded || submitting}
                      onClick={() => submitClaim("REQUEST_FULL_RMA")}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-40 ${
                        liveDeflection.offerType === "FULL_RMA_RETURN"
                          ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold py-3.5"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      {liveDeflection.offerType === "FULL_RMA_RETURN"
                        ? "Kanıtları Onayla & RMA QR Kargo Etiketi Üret"
                        : "Teklifi Reddet & Komple Ürün İadesi (RMA Kargo Etiketi) İste"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
