# AI Assistant Workspace

Workspace ini berisi beberapa project npm terpisah. Tidak ada `package.json` di root, jadi semua perintah npm dijalankan dari folder project masing-masing.

## Project

- `engine/` - Express API untuk menerima pesan chat dan mengambil jawaban dari LLM.
- `apps/web-chat/` - Angular chat UI.
- `apps/simulator/` - Playwright simulator untuk mengirim pertanyaan ke web-chat.
- `apps/mock-api/` - mock external API dan tools untuk simulasi.
- `docs/` - Astro documentation site.

## Setup Awal

Install dependency tiap project:

```bash
cd engine
npm install

cd ../apps/web-chat
npm install

cd ../simulator
npm install

cd ../mock-api
npm install

cd ../../docs
npm install
```

Siapkan `.env` di root dari contoh:

```bash
cp .env.example .env
```

Untuk provider Vertex, pastikan `gcloud` sudah login:

```bash
gcloud auth application-default login
gcloud auth login
```

## Menjalankan Aplikasi Manual

Terminal 1, jalankan engine:

```bash
cd engine
npm start
```

Engine berjalan di:

```text
http://localhost:3000
```

Terminal 2, jalankan web-chat:

```bash
cd apps/web-chat
npm start
```

Buka:

```text
http://localhost:4200
```

Opsional, jalankan mock external API untuk simulasi API/tools:

```bash
cd apps/mock-api
npm start
```

Mock API berjalan di:

```text
http://localhost:3002
```

## Menjalankan Simulasi

Simulator otomatis seed Firestore untuk skenario yang dipilih, menjalankan mock-api, engine, web-chat, membuka Chrome, mengetik pertanyaan ke input chat per kata, menunggu jawaban, lalu lanjut ke pertanyaan berikutnya.

Pastikan GCP credential tersedia untuk Firestore:

```bash
gcloud auth application-default login
gcloud auth login
export GCP_PROJECT=your-project-id
```

Simulasi cepat 5 pertanyaan:

```bash
cd apps/simulator
npm start -- scenario-quick-5
```

Simulasi penuh 50 pertanyaan:

```bash
cd apps/simulator
npm start -- scenario-1
```

Sepuluh skenario use case:

```text
retail-refund
banking-account
insurance-claim
travel-booking
healthcare-appointment
education-enrollment
logistics-delivery
subscription-billing
property-maintenance
public-service
```

Seed Firestore saja:

```bash
cd apps/simulator
SIMULATOR_SEED_ONLY=1 npm start -- retail-refund
```

Setelah selesai, simulator menutup browser dan mematikan server lokal yang dijalankan olehnya.

## Docker Compose

Untuk menjalankan service utama via Docker:

```bash
docker compose up --build engine web-chat mock-api docs
```

URL:

```text
web-chat: http://localhost:4200
engine: http://localhost:3000
mock-api: http://localhost:3002
docs: http://localhost:4321
```

## Menjalankan Dokumentasi

Development server:

```bash
cd docs
npm run dev
```

Build dan host menggunakan Node.js:

```bash
cd docs
npm run build
npm start
```

Buka:

```text
http://localhost:4321
```

## Generate Gambar dengan Z-Image

Konfigurasi FAL dibaca dari `.env` root:

```bash
FAL_KEY=...
FAL_IMAGE_MODEL=fal-ai/z-image/turbo/lora
```

Generate gambar portrait:

```bash
node scripts/generate-z-image.mjs \
  --prompt "A premium editorial scene of an AI customer service conversation" \
  --output output/images/customer-service.png
```

Prompt juga dapat dibaca dari file:

```bash
node scripts/generate-z-image.mjs \
  --prompt-file prompts/customer-service-image.txt
```

Validasi model dan request tanpa generate gambar:

```bash
node scripts/generate-z-image.mjs \
  --prompt "Test prompt" \
  --dry-run
```

## Test

Engine:

```bash
cd engine
npm test
```

Web-chat build:

```bash
cd apps/web-chat
npm run build
```

Simulator syntax check:

```bash
cd apps/simulator
node --check src/index.js
```

Mock API:

```bash
cd apps/mock-api
npm test
```
