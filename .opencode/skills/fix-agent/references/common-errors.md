# ALTU Hukuk - Yaygın Hatalar ve Çözümleri

## Next.js Build Hataları

### `TypeError: d.createContext is not a function`
- **Sebep:** `node_modules` bozulmuş, genelde lucide-react ESM dosyaları eksik
- **Çözüm:** `Remove-Item -Recurse -Force node_modules, .next, package-lock.json; npm install`

### `Error: Turbopack build failed`
- **Sebep:** Next.js workspace root bulamıyor
- **Çözüm:** `next.config.ts`'e `turbopack: { root: process.cwd() }` ekle veya root'tan çalıştır

### TypeScript strict mode type error
- **Sebep:** `Object.entries()` infer edilen tip `{}`
- **Çözüm:** `as [string, any][]` cast ekle

## Prisma Hataları

### `The datasource property url is no longer supported in schema files`
- **Sebep:** Prisma v7'de `url` schema'dan kalktı
- **Çözüm:** `prisma.config.js` (CJS) kullan, schema'dan `url` satırını kaldır

### `Cannot find module 'prisma/config'`
- **Sebep:** TypeScript config dosyası modülü bulamıyor
- **Çözüm:** `.ts` yerine `.js` (CJS) kullan, `require('prisma/config')`

### `Error: P1012 - The datasource.url property is required`
- **Sebep:** `prisma.config.js` eksik veya `DATABASE_URL` env var set edilmemiş
- **Çözüm:** `prisma.config.js` oluştur veya `DATABASE_URL`'i kontrol et

### `user.findUnique({ where: { subdomain } })` hatası
- **Sebep:** `subdomain` `@unique` değilse `findUnique` çalışmaz
- **Çözüm:** `findFirst({ where: { subdomain } })` kullan

## Render Deploy Hataları

### `Cannot have more than one active free tier database`
- **Sebep:** Render ücretsiz planda sadece 1 PostgreSQL
- **Çözüm:** Eski database'i sil, Blueprint'i yeniden çalıştır

### `Version 3.7 was not found`
- **Sebep:** Python 3.7 EOL, Render'da artık yok
- **Çözüm:** `python-backend/runtime.txt` dosyasına `3.11.9` yaz

### `fromService.property url is invalid`
- **Sebep:** Render Blueprint `fromService.property: url` desteklemez
- **Çözüm:** `host`, `hostport`, `port`, `connectionString` kullanılabilir

### Service 503 / health check fail
- **Sebep:** Health check path 200 dönmüyor
- **Çözüm:** Python backend'de `@app.get("/health")` endpoint'i ekle, `healthCheckPath: /health` yap

### `Error: fetch failed` (middleware)
- **Sebep:** Middleware kendine public URL üzerinden fetch yapıyor
- **Çözüm:** `http://localhost:${PORT}` kullan

## Python Backend Hataları

### `Permission denied: '/app'`
- **Sebep:** `/app/data/` yolu yazma izni yok
- **Çözüm:** `./data/` (relative path) kullan

### `No module named 'datasets'`
- **Sebep:** Hugging Face `datasets` kütüphanesi eksik
- **Çözüm:** `requirements.txt`'e `datasets` ekle

## Bağımlılık Hataları

### `output: "standalone"` incompatible with `next start`
- **Çözüm:** `next.config.ts`'ten `output: "standalone"` kaldır

### `$PORT` not expanded in start command
- **Sebep:** Railway'de exec form shell genişletmesi yapmaz
- **Çözüm:** Prefix `exec /bin/sh -c "..."` ile sarmala (Railway) veya Render kullan
