import { realPrisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seed başlıyor...");

  const existingAdmin = await realPrisma.user.findUnique({ where: { email: "admin" } });
  if (existingAdmin) {
    console.log("✅ Veritabanı zaten dolu, seed atlanıyor.");
    return;
  }

  const hash = await bcrypt.hash("admin", 12);

  const admin = await realPrisma.user.create({
    data: {
      id: "gwz5t9pg619",
      email: "admin",
      sifre: hash,
      ad: "Admin",
      soyad: "Kullanıcı",
      rol: "admin",
      unvan: "Yönetici",
      subdomain: "admin",
    },
  });

  const musteri1 = await realPrisma.musteri.create({
    data: {
      id: "must_1",
      ad: "Ahmet",
      soyad: "Yılmaz",
      tcKimlik: "12345678901",
      telefon: "05321112233",
      email: "ahmet@gmail.com",
      adres: "Çankaya, Ankara",
      notlar: "Kira uyuşmazlığı davası müvekkili",
      userId: admin.id,
    },
  });

  const musteri2 = await realPrisma.musteri.create({
    data: {
      id: "must_2",
      ad: "Ayşe",
      soyad: "Demir",
      tcKimlik: "98765432109",
      telefon: "05432223344",
      email: "ayse@demir.com",
      adres: "Beşiktaş, İstanbul",
      notlar: "Kıdem tazminatı davası müvekkili",
      userId: admin.id,
    },
  });

  const dava1 = await realPrisma.dava.create({
    data: {
      id: "dava_1",
      dosyaNo: "2024/105",
      ad: "Ahmet Yılmaz Kira Tahliye Davası",
      konu: "Kira Tahliye ve Alacak",
      durum: "devam-ediyor",
      mahkeme: "Ankara 3. Sulh Hukuk Mahkemesi",
      esasNo: "2024/105",
      aciklama: "İhtiyaç nedeniyle tahliye davası. İhtarname tebliğ edildi.",
      kategori: "kira",
      musteriId: musteri1.id,
      userId: admin.id,
      emsalKararlar: JSON.stringify([
        {
          id: "yrg_kira_1",
          mahkeme: "Yargıtay 3. Hukuk Dairesi",
          esasNo: "2022/8954",
          kararNo: "2023/15478",
          tarih: "05.10.2023",
          konu: "İhtiyaç Nedeniyle Kira Tahliyesi",
          ozet: "Kiralayanın kendisinin veya altsoyunun konut ihtiyacı sebebiyle kira sözleşmesini feshetme hakkı saklıdır. TBK m. 350 uyarınca ihtiyacın gerçek ve samimi olduğu tanık beyanları ve sunulan belgelerle ispatlanmıştır.",
          kaynak: "Yargıtay",
        },
      ]),
    },
  });

  const dava2 = await realPrisma.dava.create({
    data: {
      id: "dava_2",
      dosyaNo: "2023/452",
      ad: "Ayşe Demir Kıdem Tazminatı Davası",
      konu: "Kıdem ve İhbar Tazminatı Alacağı",
      durum: "devam-ediyor",
      mahkeme: "İstanbul 9. İş Mahkemesi",
      esasNo: "2023/452",
      aciklama: "İş akdinin haksız feshi nedeniyle açılan alacak davası.",
      kategori: "is",
      musteriId: musteri2.id,
      userId: admin.id,
      emsalKararlar: JSON.stringify([
        {
          id: "yrg_is_1",
          mahkeme: "Yargıtay 9. Hukuk Dairesi",
          esasNo: "2023/11254",
          kararNo: "2024/2256",
          tarih: "18.01.2024",
          konu: "Fazla Çalışma ve Kıdem Tazminatı",
          ozet: "İş sözleşmesinin işveren tarafından haksız feshi halinde işçi kıdem ve ihbar tazminatına hak kazanır.",
          kaynak: "Yargıtay",
        },
      ]),
    },
  });

  await realPrisma.durusma.create({
    data: {
      baslik: "Ön İnceleme Duruşması",
      aciklama: "Tarafların ön inceleme duruşması",
      tarih: new Date("2026-07-15T10:00:00"),
      durum: "planlandi",
      davaId: dava1.id,
    },
  });

  await realPrisma.is.create({
    data: {
      baslik: "İhtarname hazırlanacak",
      aciklama: "Kiracıya ihtarname gönderilecek",
      oncelik: "yuksek",
      durum: "bekliyor",
      sonTarih: new Date("2026-07-10"),
      userId: admin.id,
      davaId: dava1.id,
    },
  });

  await realPrisma.masraf.create({
    data: {
      baslik: "Harç masrafı",
      tutar: 1500.0,
      kategori: "harclar",
      userId: admin.id,
      davaId: dava1.id,
    },
  });

  await realPrisma.belge.create({
    data: {
      baslik: "Dava Dilekçesi",
      icerik: "Ankara 3. Sulh Hukuk Mahkemesi'ne sunulmak üzere dava dilekçesi hazırlanmıştır.",
      tur: "dilekce",
      userId: admin.id,
      davaId: dava1.id,
    },
  });

  await realPrisma.log.create({
    data: {
      islem: "Sistem kurulumu",
      aciklama: "İlk veritabanı seed işlemi tamamlandı",
      seviye: "bilgi",
      userId: admin.id,
    },
  });

  console.log("✅ Seed tamamlandı!");
  console.log("   Kullanıcı: admin / şifre: admin");
  console.log("   2 müşteri, 2 dava, 1 duruşma, 1 iş, 1 masraf, 1 belge oluşturuldu.");
}

main().catch((e) => {
  console.error("❌ Seed hatası:", e);
  process.exit(1);
});
