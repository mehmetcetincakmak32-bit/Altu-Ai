# ALTU HUKUK BÜRO YÖNETİM SİSTEMİ — SİSTEM DETAY ANALİZ RAPORU

Bu rapor, **ALTU Hukuk Büro Yönetim Sistemi (apilex-thos)** projesinin güncel mimarisini, hangi bileşenlerin nasıl çalıştığını, hangi kısımların taklit (mock) veriyle çalıştığını, nelerin eklenmesi gerektiğini ve canlıya almak (production) için nasıl bir VPS (Sanal Sunucu) altyapısına ihtiyaç duyulduğunu detaylandırmaktadır.

---

## 1. MEVCUT YAPI VE BİLEŞENLERİN ÇALIŞMA PRENSİBİ

Sistem iki ana katmandan oluşmaktadır:

### A. Next.js (Frontend & Core Backend) — Port 3001
*   **Arayüz (Frontend):** Modern, responsive, Tailwind CSS / Vanilla CSS ve Lucide-react ikonları ile geliştirilmiş avukat paneli.
*   **Veritabanı Katmanı (`src/lib/prisma.ts`):** Klasik bir SQL veritabanı (PostgreSQL/MySQL) yerine **Veritabanısız (Flat-File JSON DB)** mimariyle çalışmaktadır. Veriler `storage/data/` klasörü altındaki JSON dosyalarında (`users.json`, `davas.json`, `musteriler.json`, `isler.json`, `masraflar.json`, `belgeler.json` vb.) saklanır. Prisma ORM çağrıları, bu JSON dosyalarını okuyup yazan mock fonksiyonlarla taklit edilmiştir.
*   **Kimlik Doğrulama:** JWT/Cookie tabanlı oturum yönetimi.
*   **Proxy Katmanı (`src/app/api/remote` vb.):** Tarayıcının doğrudan Python backend'e (CORS engelleri nedeniyle) erişemediği durumlarda istekleri Next.js üzerinden Python FastAPI sunucusuna yönlendirir.

### B. Python FastAPI Backend — Port 8765
*   **Görevi:** Yapay zeka, OCR (Görüntü/Belge Okuma), veri setleri ve kazıyıcı (scraper) işlemlerini yürütmek.
*   **OCR Modülü (`/api/ocr`):** Yüklenen belgeleri/resimleri metne dönüştürmek için sistemde yüklü olan `tesseract-ocr` kütüphanesini kullanır.
*   **Veri Seti Modülü (`dataset.py`):** Hugging Face üzerindeki Türkçe hukuk veri setlerini (18k hukuk soru-cevap, kanunlar, anayasa) arkaplanda çekerek veya local önbellekten sorgulayarak yapay zekaya kaynak sağlar.
*   **Scraper Modülü (`scraper.py`):** Danıştay, Yargıtay ve Mevzuat sitelerinden veri kazımak için yazılmıştır.

---

## 2. ÇALIŞAN VE ÇALIŞMAYAN (EKSİK / MOCK) KISIMLAR

### 🟢 Çalışan Bileşenler
1.  **Kullanıcı Arayüzü & Navigasyon:** Tüm sayfaların geçişleri, formlar ve tablolama sorunsuz çalışıyor.
2.  **JSON Veritabanı:** Ekleme, düzenleme, silme ve listeleme işlemleri `storage/data/` klasöründe başarıyla kalıcı hale getiriliyor.
3.  **Muhasebe Modülleri:** Raporlar, e-SMM (Serbest Meslek Makbuzu) ve Fatura kayıtları oluşturulup saklanabiliyor.
4.  **Dosya ve Evrak Yükleme:** Davalara PDF/Görsel formatında evrak eklenebiliyor ve görüntülenebiliyor.

### 🟡 Kısmen Çalışan / Mock (Yapay/Taklit) Olan Bileşenler
1.  **UYAP Entegrasyonu (`src/app/api/uyap/route.ts`):** 
    *   *Durum:* Ayarlar sayfasından avukat e-imza veya UYAP şifresini kaydetse de, arka planda gerçek bir UYAP botu (Selenium/Playwright) bulunmadığı için sistem **mock (yapay) dava verileri** üreterek veri tabanına işlemektedir.
2.  **Karar Arama & İçtihat (`src/app/api/ai/ictihat/route.ts`):**
    *   *Durum:* Mevcut durumda `route.ts` içinde 8 adet sabit karardan oluşan bir mock dizi filtrelenmektedir. Python backend üzerindeki gerçek arama motoruna yönlendirilmemiştir.
3.  **Site Tarayıcı / Scraper (`scraper.py`):**
    *   *Durum:* Resmi Yargıtay/Danıştay siteleri bot korumalı (Cloudflare/Geçit yolları) olduğundan, bu sitelerden doğrudan HTML çekilemediğinde sistem statik örnek kararları (`_ornek_yargitay` vb.) dönmektedir. Bu durum yalan uydurmaya (hallucination) sebep olmasa da veri kısıtlılığı yaratmaktadır.

---

## 3. SİSTEMİ ÇALIŞTIRMAK İÇİN GEREKLİ VPS (SUNUCU) GEREKSİNİMLERİ

Sistemin donanım ihtiyacı, **Yapay Zekanın (LLM/Ollama)** nerede barındırılacağına doğrudan bağlıdır:

### Senaryo A: Yapay Zeka Modeli (Ollama/Llama-3) Sunucuda Çalışacaksa (Önerilen Canlı Ortam)
Eğer sistemin tamamen bağımsız olmasını ve tüm verilerin Türkiye içinde/sunucuda kalmasını istiyorsanız, LLM modelini sunucuda ayağa kaldırmalısınız.
*   **İşlemci (CPU):** En az 8 Core veya 16 Core (Intel Xeon / AMD EPYC)
*   **Bellek (RAM):** En az **32 GB RAM** (8B parametreli Llama modelinin hızlı çalışabilmesi için).
*   **Disk:** En az 100 GB NVMe SSD (Veri setleri ve modeller diskte yer kaplar).
*   **Grafik Kartı (GPU - Kritik Önemde):** Ollama modelinin saniyede makul kelime üretebilmesi için **NVIDIA T4, L4 veya A10G** ekran kartlı bir GPU VPS kiralanmalıdır. (GPU'suz sadece CPU ile çalıştırılırsa yanıt süresi 1-2 dakikayı bulabilir).

### Senaryo B: Yapay Zeka İçin Dış API'ler Kullanılacaksa (Gemini API, OpenAI vb.)
Eğer Ollama sunucuda çalışmayıp Google Gemini API veya OpenAI API üzerinden hizmet alınacaksa, sunucu yükü muazzam derecede düşer:
*   **İşlemci (CPU):** 2 Core veya 4 Core
*   **Bellek (RAM):** **4 GB veya 8 GB RAM** yeterlidir.
*   **Disk:** 40 GB SSD.
*   **GPU:** Gerek yoktur.
*   *Not:* Bu senaryoda Tesseract OCR ve Next.js/FastAPI çok rahat çalışır.

---

## 4. EKLENMESİ GEREKENLER (HEDEFLERİMİZ)

Sistemi tam anlamıyla üst düzey bir platforma dönüştürmek için şu an başladığımız geliştirmeler şunlardır:

1.  **Dava Konusuna Göre Emsal Karar Eşitleme Otomasyonu:**
    *   UYAP'tan dava çekildiğinde veya yeni dava eklendiğinde, davanın `konu` alanını alıp Python backend API'leri (`BEDESTEN_API`, `MEVZUAT_API`) ve Hugging Face veri setleri üzerinde otomatik aratarak gerçek emsal kararları çekip davanın altında saklama.
2.  **Premium Hukuki Hesaplama Sayfası:**
    *   Avukatların günlük işlerinde kullandığı faiz, kıdem tazminatı ve asgari vekalet ücreti hesaplayıcılarının arayüze entegre edilmesi.
3.  **Canlı Servis Entegrasyonları:**
    *   Mock verilerin yerine gerçek veri seti arama mekanizmalarının getirilmesi.
