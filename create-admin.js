const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DATA_DIR = path.join(__dirname, "storage", "data");

function readJson(filename, def) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return def;
  try {
    const raw = fs.readFileSync(p, "utf8");
    if (!raw) return def;
    return JSON.parse(raw);
  } catch (e) {
    return def;
  }
}

function writeJson(filename, data) {
  const p = path.join(DATA_DIR, filename);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("JSON Write Error:", filename, e);
  }
}

async function main() {
  const sifreHash = await bcrypt.hash("admin", 12);

  const data = readJson("users.json", { users: [] });
  
  // Varsa eski admin'i sil
  data.users = data.users.filter(u => u.email !== "admin");

  const admin = {
    id: Math.random().toString(36).substring(2, 15),
    email: "admin",
    sifre: sifreHash,
    ad: "Admin",
    soyad: "Kullanıcı",
    rol: "admin",
    unvan: "Yönetici",
    createdAt: new Date().toISOString(),
  };

  data.users.push(admin);
  writeJson("users.json", data);

  console.log("✅ Admin kullanıcı JSON veritabanında oluşturuldu!");
}

main().catch((e) => {
  console.error("❌ Hata:", e.message);
  process.exit(1);
});
