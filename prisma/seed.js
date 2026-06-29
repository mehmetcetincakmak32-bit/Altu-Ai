const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seed başlıyor...");

  // Önce mevcut test user'ı sil
  await prisma.user.deleteMany({
    where: { email: "test@example.com" }
  });

  // Test kullanıcısı oluştur
  const hashedPassword = await bcrypt.hash("Test1234!", 12);
  
  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      sifre: hashedPassword,
      ad: "Test",
      soyad: "Kullanıcı",
      rol: "avukat",
    },
  });

  console.log("✓ Kullanıcı oluşturuldu");
  console.log("Email: test@example.com");
  console.log("Şifre: Test1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
