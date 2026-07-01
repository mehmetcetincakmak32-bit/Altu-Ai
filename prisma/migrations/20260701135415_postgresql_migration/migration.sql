-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'avukat', 'stajyer', 'asistan');

-- CreateEnum
CREATE TYPE "DavaDurum" AS ENUM ('devam_ediyor', 'kazandi', 'kaybetti', 'feragat', 'sulh', 'temyiz', 'istinaf', 'sonuclandi');

-- CreateEnum
CREATE TYPE "IsDurum" AS ENUM ('bekliyor', 'devam_ediyor', 'tamamlandi', 'iptal');

-- CreateEnum
CREATE TYPE "IsOncelik" AS ENUM ('dusuk', 'orta', 'yuksek', 'acil');

-- CreateEnum
CREATE TYPE "MasrafKategori" AS ENUM ('harclar', 'yol', 'yemek', 'kirtasiye', 'diger');

-- CreateEnum
CREATE TYPE "OdemeSekli" AS ENUM ('nakit', 'kredi_karti', 'havale', 'eft', 'cek');

-- CreateEnum
CREATE TYPE "OdemeDurum" AS ENUM ('odenmedi', 'odendi', 'kismi', 'iptal');

-- CreateEnum
CREATE TYPE "TebligatDurum" AS ENUM ('alindi', 'okundu', 'cevaplandi', 'iade');

-- CreateEnum
CREATE TYPE "TebligatTur" AS ENUM ('tebligat', 'ihtarname', 'bildirim');

-- CreateEnum
CREATE TYPE "LogSeviye" AS ENUM ('bilgi', 'uyari', 'hata', 'kritik');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sifre" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "baro" TEXT,
    "sicilNo" TEXT,
    "unvan" TEXT,
    "adres" TEXT,
    "telefon" TEXT,
    "imza" TEXT,
    "uyapSifre" TEXT,
    "uyapEImza" TEXT,
    "tcNo" TEXT,
    "subdomain" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'avukat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Musteri" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "tcKimlik" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "adres" TEXT,
    "notlar" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Musteri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dava" (
    "id" TEXT NOT NULL,
    "dosyaNo" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "konu" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'devam-ediyor',
    "mahkeme" TEXT,
    "esasNo" TEXT,
    "kararNo" TEXT,
    "aciklama" TEXT,
    "kategori" TEXT,
    "aiAnaliz" TEXT,
    "atananAvukatId" TEXT,
    "zamanasimiTarihi" TIMESTAMP(3),
    "temyizSonTarihi" TIMESTAMP(3),
    "sureTakipNotu" TEXT,
    "emsalKararlar" TEXT,
    "mahkemeModuDosyalar" TEXT,
    "musteriId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dava_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Durusma" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "davaId" TEXT NOT NULL,
    "tutanakOzet" TEXT,
    "sonrakiAdimlar" TEXT,
    "sesDosyasi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Durusma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DavaHareketi" (
    "id" TEXT NOT NULL,
    "islem" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evrak" TEXT,
    "davaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DavaHareketi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tahsilat" (
    "id" TEXT NOT NULL,
    "musteriUnvan" TEXT NOT NULL,
    "tutar" DOUBLE PRECISION NOT NULL,
    "vadeTarihi" TIMESTAMP(3) NOT NULL,
    "odemeTarihi" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "aciklama" TEXT NOT NULL,
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tahsilat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Is" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "oncelik" TEXT NOT NULL DEFAULT 'orta',
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "sonTarih" TIMESTAMP(3),
    "tamamlandi" BOOLEAN NOT NULL DEFAULT false,
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Is_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Masraf" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tutar" DOUBLE PRECISION NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kategori" TEXT NOT NULL DEFAULT 'diger',
    "aciklama" TEXT,
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Masraf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Belge" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "icerik" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'dilekce',
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Belge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DosyaDosyasi" (
    "id" TEXT NOT NULL,
    "orijinalAd" TEXT NOT NULL,
    "kayitliAd" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "boyut" INTEGER,
    "etiketler" TEXT,
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DosyaDosyasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ESMM" (
    "id" TEXT NOT NULL,
    "seriNo" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "musteriUnvan" TEXT,
    "hizmetAciklamasi" TEXT NOT NULL,
    "birimFiyat" DOUBLE PRECISION NOT NULL,
    "miktar" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "tutar" DOUBLE PRECISION NOT NULL,
    "kdvOrani" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "kdvTutari" DOUBLE PRECISION NOT NULL,
    "netTutar" DOUBLE PRECISION NOT NULL,
    "odemeSekli" TEXT NOT NULL DEFAULT 'nakit',
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ESMM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fatura" (
    "id" TEXT NOT NULL,
    "faturaNo" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'satis',
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "musteriUnvan" TEXT,
    "kalemler" TEXT NOT NULL,
    "araToplam" DOUBLE PRECISION NOT NULL,
    "kdvOrani" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "kdvTutari" DOUBLE PRECISION NOT NULL,
    "genelToplam" DOUBLE PRECISION NOT NULL,
    "odemeSekli" TEXT NOT NULL DEFAULT 'nakit',
    "odemeDurumu" TEXT NOT NULL DEFAULT 'odenmedi',
    "davaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "islem" TEXT NOT NULL,
    "aciklama" TEXT,
    "detay" TEXT,
    "seviye" TEXT NOT NULL DEFAULT 'bilgi',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SozlesmeAnalizi" (
    "id" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "icerik" TEXT NOT NULL,
    "sonuc" TEXT NOT NULL,
    "riskPuani" INTEGER NOT NULL DEFAULT 0,
    "maddeler" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SozlesmeAnalizi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DilekecePuanlama" (
    "id" TEXT NOT NULL,
    "baslik" TEXT,
    "icerik" TEXT NOT NULL,
    "puan" INTEGER NOT NULL DEFAULT 0,
    "detay" TEXT,
    "oneriler" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DilekecePuanlama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HukukiCeviri" (
    "id" TEXT NOT NULL,
    "kaynakDil" TEXT NOT NULL,
    "hedefDil" TEXT NOT NULL,
    "asil" TEXT NOT NULL,
    "ceviri" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HukukiCeviri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkMesaj" (
    "id" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "icerik" TEXT NOT NULL,
    "alicilar" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "gonderilenSayi" INTEGER NOT NULL DEFAULT 0,
    "hataMesaj" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkMesaj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MesajlasmaAyarlari" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "smsProvider" TEXT NOT NULL DEFAULT 'netgsm',
    "smsApiKey" TEXT,
    "smsApiSifre" TEXT,
    "smsBaslik" TEXT NOT NULL DEFAULT 'ALTU AI',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpKullanici" TEXT,
    "smtpSifre" TEXT,
    "smtpGuvenlik" TEXT NOT NULL DEFAULT 'tls',
    "whatsappApiKey" TEXT,
    "whatsappTelNo" TEXT,
    "whatsappProvider" TEXT NOT NULL DEFAULT 'waba',
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MesajlasmaAyarlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KararHarita" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "dugumler" TEXT NOT NULL,
    "kenarlar" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KararHarita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UetsAyarlari" (
    "id" TEXT NOT NULL,
    "kurumKodu" TEXT NOT NULL,
    "kurumSifre" TEXT NOT NULL,
    "kullaniciAdi" TEXT NOT NULL,
    "sifre" TEXT NOT NULL,
    "testModu" BOOLEAN NOT NULL DEFAULT false,
    "sonGiris" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UetsAyarlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tebligat" (
    "id" TEXT NOT NULL,
    "tebligatNo" TEXT NOT NULL,
    "konu" TEXT,
    "gonderen" TEXT,
    "alici" TEXT,
    "tur" TEXT NOT NULL DEFAULT 'tebligat',
    "durum" TEXT NOT NULL DEFAULT 'alindi',
    "icerik" TEXT,
    "dosyaUrl" TEXT,
    "dosyaTuru" TEXT,
    "gonderimTarihi" TIMESTAMP(3),
    "okunduTarihi" TIMESTAMP(3),
    "baslik" TEXT,
    "okundu" BOOLEAN NOT NULL DEFAULT false,
    "davaId" TEXT,
    "uetsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tebligat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Dava_dosyaNo_key" ON "Dava"("dosyaNo");

-- CreateIndex
CREATE UNIQUE INDEX "ESMM_seriNo_key" ON "ESMM"("seriNo");

-- CreateIndex
CREATE UNIQUE INDEX "Fatura_faturaNo_key" ON "Fatura"("faturaNo");

-- CreateIndex
CREATE UNIQUE INDEX "MesajlasmaAyarlari_userId_key" ON "MesajlasmaAyarlari"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UetsAyarlari_userId_key" ON "UetsAyarlari"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tebligat_tebligatNo_uetsId_key" ON "Tebligat"("tebligatNo", "uetsId");

-- AddForeignKey
ALTER TABLE "Musteri" ADD CONSTRAINT "Musteri_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dava" ADD CONSTRAINT "Dava_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "Musteri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dava" ADD CONSTRAINT "Dava_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Durusma" ADD CONSTRAINT "Durusma_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DavaHareketi" ADD CONSTRAINT "DavaHareketi_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DavaHareketi" ADD CONSTRAINT "DavaHareketi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tahsilat" ADD CONSTRAINT "Tahsilat_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tahsilat" ADD CONSTRAINT "Tahsilat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Is" ADD CONSTRAINT "Is_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Is" ADD CONSTRAINT "Is_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Masraf" ADD CONSTRAINT "Masraf_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Masraf" ADD CONSTRAINT "Masraf_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Belge" ADD CONSTRAINT "Belge_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Belge" ADD CONSTRAINT "Belge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DosyaDosyasi" ADD CONSTRAINT "DosyaDosyasi_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DosyaDosyasi" ADD CONSTRAINT "DosyaDosyasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESMM" ADD CONSTRAINT "ESMM_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESMM" ADD CONSTRAINT "ESMM_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SozlesmeAnalizi" ADD CONSTRAINT "SozlesmeAnalizi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DilekecePuanlama" ADD CONSTRAINT "DilekecePuanlama_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HukukiCeviri" ADD CONSTRAINT "HukukiCeviri_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMesaj" ADD CONSTRAINT "BulkMesaj_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesajlasmaAyarlari" ADD CONSTRAINT "MesajlasmaAyarlari_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KararHarita" ADD CONSTRAINT "KararHarita_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UetsAyarlari" ADD CONSTRAINT "UetsAyarlari_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tebligat" ADD CONSTRAINT "Tebligat_uetsId_fkey" FOREIGN KEY ("uetsId") REFERENCES "UetsAyarlari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tebligat" ADD CONSTRAINT "Tebligat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tebligat" ADD CONSTRAINT "Tebligat_davaId_fkey" FOREIGN KEY ("davaId") REFERENCES "Dava"("id") ON DELETE SET NULL ON UPDATE CASCADE;
