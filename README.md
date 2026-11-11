# 🛡️ Fotoğraflı İade Sistemi — Kanıt Zorunlu B2B/B2C Garanti, Hasar & İade Karar Motoru

**Fotoğraflı İade Sistemi**, e-ticaret markaları, mobilya üreticileri, endüstriyel makine distribütörleri ve teknik servis ağları için geliştirilmiş; **kanıtsız iade kargolarını engelleyen**, **kargosuz çözüm ağacıyla (Yedek Parça / Kısmi İade) lojistik maliyetlerini kurtaran** ve **SHA-256 mühürlü kanıtlarla kargo şirketlerinden hasar tazminatı (rücu) alınmasını sağlayan** kurumsal bir RMA (İade/Hasar Yetkilendirme) platformudur.

---

## 🚀 Temel Özellikler & Mimari Sütunlar

1. **Sipariş & Seri Numarası Doğrulama:**
   - Müşteri veya B2B bayi, faturasındaki Sipariş Numarası (`ORD-2026-...`) veya ürün üzerindeki Seri Numarası (`SN-...`) ile sorgulama yapmadan iade süreci başlatamaz.
2. **Arıza Tipine Göre Zorunlu Kanıt Kalkanı:**
   - **Kargo Hasarı:** Dış koli barkod etiketi fotoğrafı + kırık parça yakın çekimi zorunludur.
   - **Eksik Parça:** Paket içeriği fotoğrafı + seri numarası etiketi zorunludur.
   - **Teknik Arıza:** Cihaz seri/garanti bandrolü + arıza videosu/görseli zorunludur.
3. **Akıllı Çözüm Ağacı (Kargosuz Kurtarma / Deflection Engine):**
   - Ürünün tek yön lojistik maliyeti, yeniden paketleme/değer kaybı ve yedek parça maliyeti canlı olarak hesaplanır.
   - Sadece alt aparat kırıksa veya yüzeysel kozmetik kusur varsa, komple ürünü geri almak yerine **"Ücretsiz Ekspres Yedek Parça Gönderimi"** veya **"Anında %18 Kısmi İade"** teklif ederek şirketi binlerce liralık kargo zararından kurtarır.
4. **Yazdırılabilir QR RMA Kargo Etiketi:**
   - Onaylanan iadeler için içinde RMA numarası, sipariş kodu, seri numarası ve kriptografik mühür özeti barındıran QR kodlu koli etiketi üretilir.
5. **Depo Ekspertiz & Kargo Tazminat (Rücu) Merkezi:**
   - Depo personeli gelen koliyi açarken yüklenen SHA-256 mühürlü fotoğraflarla fiziksel ürünü karşılaştırır; **Kargo Tazminatı, Onarım, Değişim** veya **Kullanıcı Hatası Reddi** kararını verir.

---

## 🔒 Siber Güvenlik Katmanı (Ali Oda Onaylı)

- **SSRF Kalkanı (`src/lib/ssrf.ts`):** B2B ERP/E-ticaret sistemlerine gönderilen webhook bildirimlerinde `localhost`, `127.0.0.1`, özel ağlar (`10.x`, `172.16-31.x`, `192.168.x`), Cloud Metadata (`169.254.169.254`) ve DNS Rebinding saldırıları kesin olarak engellenir.
- **Kriptografik Kanıt & Bütünlük Mührü (`src/lib/security.ts`):** Yüklenen her kanıt dosyasının `SHA-256` özeti alınır ve tüm RMA kaydı `HMAC-SHA256` + `crypto.timingSafeEqual` ile zaman damgalı olarak mühürlenir.
- **Sıkı Dosya / MIME Denetimi:** Yürütülebilir veya script tabanlı dosyalar (`.svg`, `.html`, `.js`, `.exe`, `.php`) kesin olarak reddedilir.

---

## 🛠️ Teknoloji Yığını

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (Strict Mode)
- **Stil & UI:** Tailwind CSS + Lucide Icons
- **Veritabanı & ORM:** Prisma ORM (`v6.4.1`) + SQLite (Prod ortamında PostgreSQL / Supabase uyumlu)
- **Kriptografi & Etiket:** Node.js `crypto` (SHA-256 / HMAC) + `qrcode`

---

## ⚡ Hızlı Kurulum ve Çalıştırma

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Veritabanı şemasını senkronize edin
npx prisma db push

# 3. Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda:
- **Ana Sayfa:** `http://localhost:3000`
- **Müşteri / Bayi RMA Portalı:** `http://localhost:3000/portal`
- **Depo & Ekspertiz Yönetim Paneli:** `http://localhost:3000/warehouse`
