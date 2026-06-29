-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "sifre" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "baro" TEXT,
    "sicilNo" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'avukat',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Musteri" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "tcKimlik" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "adres" TEXT,
    "notlar" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Musteri_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dava" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dosyaNo" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "konu" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'devam-ediyor',
    "mahkeme" TEXT,
    "esasNo" TEXT,
    "kararNo" TEXT,
    "aciklama" TEXT,
    "musteriId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dava_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "Musteri" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dava_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Durusma" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "tarih" DATETIME NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "davaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Durusma_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Masraf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baslik" TEXT NOT NULL,
    "tutar" REAL NOT NULL,
    "tarih" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kategori" TEXT NOT NULL DEFAULT 'diger',
    "aciklama" TEXT,
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Masraf_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Masraf_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Belge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baslik" TEXT NOT NULL,
    "icerik" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'dilekce',
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Belge_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Dava_dosyaNo_key" ON "Dava"("dosyaNo");
