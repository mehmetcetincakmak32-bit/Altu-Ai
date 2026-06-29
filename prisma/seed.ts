import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seed başlıyor...");

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

  console.log("Kullanıcı oluşturuldu:", user.email);
  console.log("Email: test@example.com");
  console.log("Şifre: Test1234!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
