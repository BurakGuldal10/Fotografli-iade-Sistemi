import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  QrCode,
  Warehouse,
  Scale,
  ArrowRight,
  Lock,
  FileCheck2,
  TrendingDown,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Üst Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">
                Fotoğraflı İade Sistemi
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Kanıt Zorunlu İade & Hasar Karar Motoru
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              Müşteri / Bayi RMA Portalı
            </Link>
            <Link
              href="/warehouse"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <Warehouse className="w-4 h-4 text-amber-400" />
              Depo & Ekspertiz Paneli
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Bölümü */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-16">
        <section className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <Sparkles className="w-4 h-4" />
            Kanıtsız Kargo Gönderimlerine, Zombi İadelere ve Lojistik Zararına Son
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            İadeleri Kargoya Verilmeden{" "}
            <span className="text-emerald-400">Akıllı Çözümle Kurtarın</span>,
            Kargo Hasarlarını{" "}
            <span className="text-amber-400">SHA-256 Kanıtla</span> Tazmin Edin.
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            <strong>Fotoğraflı İade Sistemi</strong>; mobilya, elektronik, endüstriyel makine ve e-ticaret
            markaları için sipariş/seri numarası doğrulayan, arıza tipine göre{" "}
            <strong>zorunlu fotoğraf/video kanıtı</strong> alan ve komple iade yerine{" "}
            <strong>Ücretsiz Yedek Parça / Kısmi İade</strong> önererek lojistik maliyetlerini
            %45 düşüren B2B/B2C RMA platformudur.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/portal"
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              Canlı Müşteri / Bayi RMA Portalını Dene
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/warehouse"
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-semibold text-sm flex items-center gap-2 transition"
            >
              <Warehouse className="w-4 h-4 text-amber-400" />
              Depo Kabul & Tazminat Panelini İncele
            </Link>
          </div>
        </section>

        {/* 4 Temel Mimari Sütun */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              1. Zorunlu Kanıt Kalkanı
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dış koli barkodu, kırık parça yakın çekimi veya seri numarası etiketi
              yüklenmeden hiçbir müşteri kafasına göre depoya kargo gönderemez.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              2. Kargosuz İade Kurtarma
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sadece bir ayak aparatı kırıksa veya kozmetik çizik varsa, 3.000 TL
              gidiş-dönüş kargo ödemek yerine anında yedek parça veya kısmi iade ile
              iade kargosunu önler.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              3. QR Barkodlu Depo Kabul
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Onaylanan iadeler için özel QR kargo etiketi üretilir. Depodaki
              personel koliyi açarken QR&apos;ı okutur ve müşterinin yüklediği fotoğrafla
              gelen ürünü karşılaştırır.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              4. SHA-256 Kargo Tazminatı
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Yüklenen tüm hasar fotoğrafları SHA-256 ve zaman damgasıyla mühürlenir.
              Kargo şirketlerine rücu (tazminat) başvurularında eksiksiz delil dosyası
              üretir.
            </p>
          </div>
        </section>

        {/* Alt Güvenlik Bilgisi */}
        <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs text-slate-300">
              <strong>Ali Oda Güvenlik Mimarisi:</strong> SSRF Kalkanı (`lib/ssrf.ts`),
              HMAC-SHA256 Kanıt Bütünlük Mührü (`crypto.timingSafeEqual`) ve Sıkı MIME
              Dosya Denetimi aktiftir.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Fotoğraflı İade Sistemi v1.0 • Canlıya Hazır
          </span>
        </section>
      </main>
    </div>
  );
}
