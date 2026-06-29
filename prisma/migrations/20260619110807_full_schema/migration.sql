-- AlterTable
ALTER TABLE "User" ADD COLUMN "adres" TEXT;
ALTER TABLE "User" ADD COLUMN "imza" TEXT;
ALTER TABLE "User" ADD COLUMN "telefon" TEXT;
ALTER TABLE "User" ADD COLUMN "unvan" TEXT;

-- CreateTable
CREATE TABLE "Is" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "oncelik" TEXT NOT NULL DEFAULT 'orta',
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "sonTarih" DATETIME,
    "tamamlandi" BOOLEAN NOT NULL DEFAULT false,
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Is_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Is_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DosyaDosyasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orijinalAd" TEXT NOT NULL,
    "kayitliAd" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "boyut" INTEGER,
    "etiketler" TEXT,
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DosyaDosyasi_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DosyaDosyasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ESMM" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriNo" TEXT NOT NULL,
    "tarih" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "musteriUnvan" TEXT,
    "hizmetAciklamasi" TEXT NOT NULL,
    "birimFiyat" REAL NOT NULL,
    "miktar" REAL NOT NULL DEFAULT 1,
    "tutar" REAL NOT NULL,
    "kdvOrani" REAL NOT NULL DEFAULT 20,
    "kdvTutari" REAL NOT NULL,
    "netTutar" REAL NOT NULL,
    "odemeSekli" TEXT NOT NULL DEFAULT 'nakit',
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ESMM_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ESMM_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fatura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "faturaNo" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'satis',
    "tarih" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "musteriUnvan" TEXT,
    "kalemler" TEXT NOT NULL,
    "araToplam" REAL NOT NULL,
    "kdvOrani" REAL NOT NULL DEFAULT 20,
    "kdvTutari" REAL NOT NULL,
    "genelToplam" REAL NOT NULL,
    "odemeSekli" TEXT NOT NULL DEFAULT 'nakit',
    "odemeDurumu" TEXT NOT NULL DEFAULT 'odenmedi',
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fatura_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Fatura_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "islem" TEXT NOT NULL,
    "aciklama" TEXT,
    "detay" TEXT,
    "seviye" TEXT NOT NULL DEFAULT 'bilgi',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Belge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baslik" TEXT NOT NULL,
    "icerik" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'dilekce',
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Belge_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Belge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Belge" ("baslik", "createdAt", "davaId", "icerik", "id", "tur", "userId") SELECT "baslik", "createdAt", "davaId", "icerik", "id", "tur", "userId" FROM "Belge";
DROP TABLE "Belge";
ALTER TABLE "new_Belge" RENAME TO "Belge";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ESMM_seriNo_key" ON "ESMM"("seriNo");

-- CreateIndex
CREATE UNIQUE INDEX "Fatura_faturaNo_key" ON "Fatura"("faturaNo");
