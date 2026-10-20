# PromptForge AI — Master Prompt Builder

Web app responsive berbahasa Indonesia untuk mengubah satu ide singkat menjadi master prompt dengan enam elemen **ROLE → TASK → CONTEXT → REASONING → STOP CONDITIONS → OUTPUT**, sesuai struktur dalam gambar referensi.

## Fitur

- Cukup ketik satu ide / perintah singkat.
- Analisis AI melalui OpenAI API (opsional), atau generator lokal yang tetap berfungsi tanpa API key.
- Master prompt terstruktur lengkap dengan pendekatan, kriteria selesai, dan format output.
- Pilih bahasa Indonesia / English dan detail ringkas / mendalam.
- Edit setiap bagian, ubah prompt lengkap, salin, atau ekspor `.txt`.
- 12 riwayat terakhir tersimpan di localStorage browser (bukan database).
- Responsive untuk laptop, tablet, dan ponsel.
- Tidak ada API key di sisi browser.

## Preview langsung tanpa instalasi

Buka file **`promptforge-preview.html`** dengan double-click di browser. Mode generator lokal dapat digunakan tanpa server. Untuk memakai model AI OpenAI, jalankan aplikasi dengan server sesuai instruksi berikut.

## Jalankan di komputer

Persyaratan: **Node.js 18+**. Tidak perlu `npm install` (tidak memakai paket eksternal).

```bash
# Ekstrak ZIP, masuk ke folder proyek
cd promptforge-ai
npm start
# Buka http://localhost:3000
```

Aplikasi langsung bekerja dalam **mode lokal**. Generator lokal menggunakan aturan dan template, bukan model AI generatif. Tampilan aplikasi mengungkap mode yang aktif.

## Aktifkan analisis AI sungguhan

1. Duplikasi `.env.example` sebagai `.env`.
2. Isi `OPENAI_API_KEY=...` dengan API key OpenAI milik Anda (API berbayar mengikuti akun Anda).
3. Jalankan ulang `npm start`.

Model default adalah `gpt-4.1-mini` dan bisa diganti melalui `OPENAI_MODEL`.

API key hanya dibaca oleh server pada `api/generate.js`. Jangan pernah menaruh key di JavaScript browser, mengunggah `.env` ke Git, atau membagikannya ke orang lain.

## Deploy di Vercel

1. Upload folder proyek ke repository Git.
2. Import project di Vercel dengan preset **Other** (static files + Node.js serverless function di `/api/generate`).
3. Tambahkan environment variable `OPENAI_API_KEY` melalui **Project Settings → Environment Variables**.
4. Deploy. `vercel.json` sudah disiapkan.

**Catatan penting:** Bila aplikasi dibuka untuk publik, tambahkan authentication, rate limiting yang persisten (Redis/KV atau service sejenis), dan budget limit API di akun OpenAI sebelum mengaktifkan key produksi. Tanpa key, generator lokal tetap aktif.

## Arsitektur

- `index.html` — halaman dan komponen UI.
- `styles.css` — desain desktop & mobile.
- `app.js` — alur interaktif, generator browser cadangan, editor, riwayat, unduhan.
- `lib/engine.js` — generator lokal server + validasi enam bagian.
- `api/generate.js` — endpoint OpenAI di server; `POST { brief, language, detail }`.
- `server.js` — server HTTP Node.js tanpa dependency untuk pengembangan lokal.
- `tests/engine.test.js` — pengujian unit.

## Kejujuran AI dan data

- Jika `OPENAI_API_KEY` kosong, hasil menggunakan generator lokal yang **bukan** model AI.
- Jika API aktif, teks ide dikirim dari browser ke server Anda lalu ke OpenAI untuk diproses.
- Riwayat hanya disimpan di browser pengguna melalui `localStorage` dan bisa dihapus.
- Master prompt meminta AI hilir memberikan alasan/rangkuman keputusan yang singkat, bukan membuka chain-of-thought internal.

## Pengujian

```bash
npm test
```
