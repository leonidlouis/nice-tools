# Tools | bylouis.io ⚡

A curated collection of free, privacy-first browser tools. No sign-ups, no uploads — everything runs on your device.

> **[tools.bylouis.io](https://tools.bylouis.io)**

---

## 🧰 Available Tools

### Image Compressor

Batch compress images entirely in your browser using WebAssembly.

- **No uploads** — all processing is 100% client-side
- **Parallel compression** via Web Workers (uses all CPU cores)
- **Batch processing** — compress as many images as your device can handle
- **Re-compress** — tweak settings and re-process without re-uploading
- **One-click download** — individual files or ZIP archive

| Input Formats | Output Formats |
|----------------|----------------|
| JPEG, PNG, WebP, HEIC/HEIF | JPEG, WebP |

*More tools coming soon.*

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Radix UI, Tailwind CSS 4, shadcn/ui |
| Compression | jSquash (WebP, JPEG, PNG WASM codecs) |
| HEIC Support | heic2any |
| Animations | Motion (Framer Motion) |
| Concurrency | Web Workers (parallel, pool-based) |
| Downloads | Browser Blob API, JSZip |
| Analytics | PostHog (anonymous, privacy-respecting) |
| Build | Turbopack, esbuild (worker bundling) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+) and npm

### Development

```bash
git clone https://github.com/leonidlouis/pixelpinch.git
cd pixelpinch

npm install    # also copies WASM files and builds the worker

npm run dev    # start dev server with Turbopack
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

---

## 🐳 Docker

```bash
docker build -t tools-bylouis .
docker run -p 3000:3000 tools-bylouis
```

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run dev:worker` | Watch & rebuild compression worker |
| `npm run dev:all` | Dev server + worker watcher concurrently |
| `npm run build` | Production build |
| `npm run build:worker` | Bundle compression worker |
| `npm start` | Start production server |
| `npm run copy-wasm` | Copy WASM files to `public/` |

---

## 🔒 Privacy

- **Zero uploads** — images and data never leave your browser
- **Works offline** after initial page load
- **Anonymous telemetry** via PostHog (aggregate usage stats only — no personal data, no image content, no filenames)

---

## 📄 License

MIT © 2026 Louis
