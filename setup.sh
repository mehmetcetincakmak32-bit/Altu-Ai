#!/bin/bash
set -e

echo "============================================"
echo "  ALTU VPS Kurulum Scripti"
echo "  Hukuk Yönetim Platformu"
echo "============================================"
echo ""

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[HATA]${NC} $1"; exit 1; }

# Root kontrol
if [ "$EUID" -ne 0 ]; then
  err "Lütfen root yetkisiyle çalıştırın: sudo bash setup.sh"
fi

# 1. Sistem Güncelleme
log "Sistem güncelleniyor..."
apt-get update -y && apt-get upgrade -y

# 2. Gerekli Paketler
log "Gerekli paketler kuruluyor..."
apt-get install -y \
  curl wget git unzip \
  docker.io docker-compose-v2 \
  nginx \
  tesseract-ocr tesseract-ocr-tur tesseract-ocr-eng \
  python3 python3-pip python3-venv \
  nodejs npm \
  ufw fail2ban

# 3. Docker servisini başlat
log "Docker başlatılıyor..."
systemctl enable docker
systemctl start docker

# 4. Ollama Kurulumu
if ! command -v ollama &> /dev/null; then
  log "Ollama kuruluyor..."
  curl -fsSL https://ollama.ai/install.sh | sh
  systemctl enable ollama
  systemctl start ollama
  log "Ollama başlatıldı"
else
  log "Ollama zaten kurulu"
fi

# 5. Ollama Hukuk Modelini İndir
log "Hukuk LLM modeli indiriliyor..."

# Ana model: hukuk-llama-3-8b (HF'den GGUF formatında)
ollama pull hukuk-llama 2>/dev/null || ollama pull musaalperenyilmaz/hukuk-llama-3-8b-gguf 2>/dev/null || ollama pull mistral:latest

# ALTU özel modelini oluştur - rakipsiz hukuk uzmanı
ollama create apilex-hukuk -f - << 'OLLAMAMODEL'
FROM mistral:latest
PARAMETER temperature 0.2
PARAMETER top_p 0.95
PARAMETER num_predict 4096
PARAMETER stop "Hukuk dışı soru"

SYSTEM """
SEN ALTU HUKUK YAPAY ZEKASISIN.
Tek başına rakipsiz bir Türk hukuk yazılımısın.

=== TEMEL KURAL ===
Sadece Türk hukuku sorularını yanıtla. Diğer tüm sorulara:
"Ben bir hukuk asistanıyım, yalnızca hukuki konularda yardımcı olabiliyorum."

=== YANIT YAPISI ===
Her yanıtında şu formatı kullan:
[KONU] Başlık
[DAYANAK] İlgili kanun/madde
[AÇIKLAMA] Detaylı hukuki analiz
[SONUÇ] Net öneri

=== UZMANLIK ALANLARI ===
- Anayasa Hukuku (1982 Anayasası tüm maddeleri)
- Medeni Hukuk (TMK 4721 - kişi, aile, miras, eşya)
- Borçlar Hukuku (TBK 6098 - sözleşme, haksız fiil)
- Ticaret Hukuku (TTK 6102 - şirket, kıymetli evrak)
- İş Hukuku (İşK 4857, 1475 m.14)
- Ceza Hukuku (TCK 5237, CMK 5271)
- İcra-İflas Hukuku (İİK 2004)
- Vergi Hukuku (VUK 213)
- İdare Hukuku (İYUK 2577)
- Fikri Mülkiyet (FSEK, Sınai Mülkiyet)
- Milletlerarası Özel Hukuk (MÖHUK 5718)

=== YASAKLAR ===
- Siyasi yorum yapma
- Dini tavsiye verme
- Tıbbi öneri sunma
- Mali yatırım tavsiyesi verme
- Kesin bilgin yoksa "bir avukata danışın" uyarısı ekle
"""
OLLAMAMODEL

# HF dataset modelini de dene (başarısız olursa sorun değil)
log "HF modelleri kontrol ediliyor..."
ollama pull apilex-hukuk:latest 2>/dev/null || true

# 5. HF Türk Hukuk Veri Setlerini Hazırla
log "HF veri setleri için Python bağımlılıkları kuruluyor..."
pip3 install datasets huggingface-hub 2>/dev/null || true

# Otomatik indirme için script
cat > /opt/apilex-thos/python-backend/download_datasets.py << 'PYEOF'
import subprocess, sys, json
try:
    from datasets import load_dataset
    repos = [
        "erdem-erdem/Turkish-Law-Documents-700k-clustered",
        "Renicames/turkish-law-chatbot",
        "OrionCAF/turkish_law_qa_dataset",
        "omersaidd/Kanunlar",
        "AIStudioGPT/hukuk_qa_augmented",
        "M3A/turkish_mmlu_hukuk_tarim_egitim_surdurulebilirlik_alpaca_dataset",
    ]
    for repo in repos:
        try:
            print(f"İndiriliyor: {repo}")
            load_dataset(repo, split="train", trust_remote_code=True)
        except Exception as e:
            print(f"  Hata: {e}")
    print("Tüm veri setleri indirildi")
except ImportError:
    print("datasets kütüphanesi kurulu değil")
PYEOF

cd /opt/apilex-thos/python-backend && python3 download_datasets.py 2>/dev/null || log "HF veri setleri sonra indirilecek (çalıştır: python3 download_datasets.py)"

# 6. Ollama'yı sadece bu uygulama için yapılandır
log "Ollama yapılandırılıyor..."
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf << 'OLLAMA'
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_PORT=11434"
Environment="OLLAMA_KEEP_ALIVE=24h"
Environment="OLLAMA_NUM_PARALLEL=4"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Restart=always
OLLAMA
systemctl daemon-reload
systemctl restart ollama

# 7. CPU/RAM Optimizasyonu (Ollama ve Docker için)
log "CPU/RAM optimizasyonu yapılıyor..."
cat >> /etc/sysctl.conf << 'SYSCTL'
vm.swappiness=10
vm.vfs_cache_pressure=50
kernel.numa_balancing=0
SYSCTL
sysctl -p

# 8. Güvenlik Duvarı
log "Güvenlik duvarı yapılandırılıyor..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 3000/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
fail2ban-client start

# 9. Projeyi Klonla
log "Proje indiriliyor..."
cd /opt
if [ -d "apilex-thos" ]; then
  cd apilex-thos
  git pull origin main 2>/dev/null || warn "Git pull başarısız, mevcut kod kullanılacak"
else
  read -p "GitHub repo URL'si (boş bırakılırsa yerel kurulum): " REPO_URL
  if [ -n "$REPO_URL" ]; then
    git clone $REPO_URL
  else
    err "Proje bulunamadı. Lütfen önce dosyaları /opt/apilex-thos dizinine yükleyin."
  fi
  cd apilex-thos
fi

# 10. .env Oluştur
log "Çevre değişkenleri oluşturuluyor..."
cat > .env << ENVEOF
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="apilex-thos-gizli-$(openssl rand -hex 16)"
PYTHON_BACKEND_URL="http://python-backend:8765"
ENVEOF

# 11. Docker ile Build ve Çalıştır
log "Docker imajları oluşturuluyor..."
docker compose build

log "Servisler başlatılıyor..."
docker compose up -d

# 12. Nginx Reverse Proxy
read -p "Domain adresiniz (örn: apilex-thos.com): " DOMAIN
if [ -n "$DOMAIN" ]; then
  log "Nginx yapılandırılıyor..."
  cat > /etc/nginx/sites-available/apilex-thos << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        client_max_body_size 100M;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/apilex-thos /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  
  # SSL (Let's Encrypt)
  log "SSL sertifikası alınıyor..."
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email info@$DOMAIN || warn "SSL alınamadı, manuel kurulum gerekli"
fi

# 13. Otomatik Başlangıç
log "Sistem başlangıcına eklendi..."
docker update --restart unless-stopped apilex-thos-nextjs-1 apilex-thos-python-backend-1 2>/dev/null || true

# 14. Servis Kontrol
log "Servisler kontrol ediliyor..."
sleep 5
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  log "✅ Next.js çalışıyor (port 3000)"
else
  warn "⚠️ Next.js kontrol edilemedi"
fi

if curl -s http://localhost:8765/health > /dev/null 2>&1; then
  log "✅ Python backend çalışıyor (port 8765)"
else
  warn "⚠️ Python backend kontrol edilemedi"
fi

if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  log "✅ Ollama çalışıyor (port 11434)"
else
  warn "⚠️ Ollama kontrol edilemedi"
fi

echo ""
echo "============================================"
echo "  ✅ Kurulum Tamamlandı!"
echo "============================================"
echo ""
echo "  Web: http://localhost:3000"
if [ -n "$DOMAIN" ]; then
  echo "  Domain: https://$DOMAIN"
fi
echo "  Python API: http://localhost:8765"
echo "  Ollama: http://localhost:11434"
echo ""
echo "  Loglar: docker compose logs -f"
echo "  Yeniden başlat: docker compose restart"
echo "============================================"
