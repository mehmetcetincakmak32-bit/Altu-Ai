# ALTU Hukuk Büro Yönetim Sistemi

Next.js + PostgreSQL + Gemini AI ile geliştirilmiş, avukatlar için modern hukuk büro yönetim platformu.

## Özellikler

- **Dosya Takibi** — Dava dosyaları, duruşmalar, müvekkil yönetimi
- **AI Asistan** — Gemini AI ile hukuki sorgulama, içtihat tarama, dilekçe puanlama
- **Belge İşleme** — Otomatik belge oluşturma ve analiz
- **UYAP Entegrasyonu** — UYAP senkronizasyon ve belge okuma
- **Hukuki Yayın Tarayıcı** — Yargıtay, Danıştay, Mevzuat, Resmi Gazete taraması
- **MCP Sunucular** — Gömülü MCP sunucular ile hukuk kaynaklarına doğrudan erişim

## Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend (Node) | Next.js API Routes, Prisma ORM |
| Backend (Python) | FastAPI, Gemini AI, MCP |
| Database | PostgreSQL (Render) |
| AI | Google Gemini API · Groq · HuggingFace |

## Canlı Demo

[https://altu-nextjs.onrender.com](https://altu-nextjs.onrender.com)

## Yerel Geliştirme

```bash
# 1. Python backend
cd python-backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8765

# 2. Node.js frontend (yeni terminal)
npm install
npx prisma db push
npm run dev
```

## Deploy

Render Blueprint (`render.yaml`) ile tek tuşla deploy:

1. [render.com](https://render.com) → New Blueprint
2. `mehmetcetincakmak32-bit/Altu-Ai` reposunu seç
3. `GEMINI_API_KEY` gerekli

## Ortam Değişkenleri

```
DATABASE_URL=postgresql://...
JWT_SECRET=gizli-anahtar
PYTHON_BACKEND_URL=https://altu-python.onrender.com
GEMINI_API_KEY=...          # Zorunlu (Gemini)
GROQ_API_KEY=...            # Opsiyonel (ücretsiz yedek AI)
HF_API_KEY=...              # Opsiyonel (HuggingFace fallback)
GOOGLE_CX=...               # Opsiyonel (Google Custom Search)
GOOGLE_SEARCH_KEY=...       # Opsiyonel (Google Search API)
NEXT_PUBLIC_PYTHON_URL=...  # Python backend URL
```
