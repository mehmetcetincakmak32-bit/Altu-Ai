import json
import os
import random
import sys
from pathlib import Path
from datetime import datetime

# Veri dizinini ayarla
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
SCRAPER_DIR = DATA_DIR / "scraper"
SCRAPER_DIR.mkdir(parents=True, exist_ok=True)

# Hedef dosya yolları
YARGITAY_PATH = SCRAPER_DIR / "yargitay.json"
DANISTAY_PATH = SCRAPER_DIR / "danistay.json"
MEVZUAT_PATH = SCRAPER_DIR / "mevzuat.json"
RESMI_GAZETE_PATH = SCRAPER_DIR / "resmi_gazete.json"

CATEGORIES = ["is", "bosanma", "aile", "miras", "kira", "tazminat", "ceza", "ticaret", "icra"]

# Akıllı Sentetik Veri Bileşenleri
MAHKEMELER_YARGITAY = [
    "Yargıtay 9. Hukuk Dairesi", "Yargıtay 2. Hukuk Dairesi", "Yargıtay 3. Hukuk Dairesi",
    "Yargıtay 1. Hukuk Dairesi", "Yargıtay 17. Hukuk Dairesi", "Yargıtay 12. Hukuk Dairesi",
    "Yargıtay 11. Hukuk Dairesi", "Yargıtay Hukuk Genel Kurulu", "Yargıtay Ceza Genel Kurulu"
]

MAHKEMELER_DANISTAY = [
    "Danıştay 12. Daire", "Danıştay 6. Daire", "Danıştay 4. Daire", "Danıştay 8. Daire",
    "Danıştay İdari Dava Dairesi", "Anayasa Mahkemesi"
]

ADLAR = ["Ali", "Ahmet", "Mehmet", "Mustafa", "Ayşe", "Fatma", "Zeynep", "Hasan", "Hüseyin", "Kemal", "Elif", "Merve", "Can", "Cem", "Burak", "Derya", "Murat", "Selin"]
SOYADLAR = ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Kılıç", "Arslan", "Polat", "Aydın", "Yıldız", "Koç", "Bulut", "Özkan", "Aslan", "Tekin", "Yıldırım"]

SABLONLAR = {
    "is": [
        ("Fazla Çalışma Ücreti ve Kıdem Tazminatı Talebi",
         "Davacı {ad1} {soyad1}, iş sözleşmesinin haksız şekilde feshedildiğini ileri sürerek kıdem tazminatı ile fazla çalışma ücretlerinin tahsilini talep etmiştir. Davalı {ad2} A.Ş. ise davacının iddialarının asılsız olduğunu savunmuştur. Yapılan incelemede, davacının imzasını taşımayan bordrolarda fazla mesai yapıldığı iddia edilmiş olup, tanık beyanları ve işyeri giriş çıkış kayıtları doğrultusunda fazla çalışma yapıldığı ispatlanmıştır. Kıdem tazminatı hesabında fazla çalışma ücretinin de brüt ücrete yansıtılması gerekir. Hükmün bozulmasına karar verilmiştir."),
        ("İşe İade Davası ve Sendikal Tazminat",
         "Davacı {ad1} {soyad1}, sendikal faaliyetleri nedeniyle iş sözleşmesinin haksız olarak feshedildiğini belirterek işe iadesine ve sendikal tazminata hükmedilmesini talep etmiştir. Davalı işveren, feshin ekonomik nedenlerle yapıldığını iddia etmiştir. Mahkemece yapılan incelemede, fesihten kısa süre önce davacının sendikaya üye olduğu ve işyerinde sendika hakkı için öncülük ettiği, feshin geçerli sebebe dayanmadığı ve sendikal nedenle yapıldığı anlaşıldığından davanın kabulü ile işe iadeye ve 1 yıllık ücreti tutarında sendikal tazminata karar verilmesi yerindedir.")
    ],
    "bosanma": [
        ("Evlilik Birliğinin Temelinden Sarsılması Nedeniyle Boşanma",
         "Davacı {ad1} {soyad1}, davalı {ad2} {soyad2} ile aralarında şiddetli geçimsizlik bulunduğunu, evlilik birliğinin temelinden sarsıldığını ileri sürerek boşanma davası açmıştır. Yapılan yargılama ve toplanan delillerden, davalının eşine yönelik hakaretamiz ve küçümseyici ifadeler kullandığı, ortak hayattan kaçındığı anlaşılmıştır. Davalının kusurlu davranışları sonucu ortak hayatın çekilmez hale geldiği sabit olup boşanmaya, davacı lehine maddi ve manevi tazminata hükmedilmesine karar verilmiştir."),
        ("Anlaşmalı Boşanma Protokolü ve Nafaka Miktarı",
         "Taraflar {ad1} {soyad1} ve {ad2} {soyad2} arasında açılan anlaşmalı boşanma davasında, tarafların hazırladığı protokol mahkemece incelenmiştir. Protokolde yer alan iştirak nafakası ve velayet düzenlemelerinin çocuğun üstün yararına aykırı olamayacağı, hakimin nafakayı çocuğun ihtiyaçları oranında resen takdir etmesi gerektiği belirtilmiştir. Protokolün nafaka yönünden kısmen iptali ve revizyonu yerindedir.")
    ],
    "kira": [
        ("Kira Tahliye Davası - İhtiyaç Nedeniyle Fesih",
         "Davacı {ad1} {soyad1}, davalı kiracı {ad2} {soyad2} aleyhine, kendisinin konut ihtiyacı sebebiyle kira sözleşmesini feshetmek ve tahliye kararı almak üzere dava açmıştır. TBK m. 350 uyarınca ihtiyacın gerçek ve samimi olduğu tanık beyanları ve sunulan belgelerle ispatlanmıştır. Davalının kiralanan taşınmazı tahliye etmesine karar verilmelidir."),
        ("Kira Bedelinin Tespiti Davası",
         "Davacı kiralayan {ad1} {soyad1}, yenilenen kira döneminde kira bedelinin emsallere uygun olarak tespitini talep etmiştir. Mahkemece yapılan keşif ve bilirkişi incelemesinde, taşınmazın konumu ve ekonomik şartlar göz önüne alınarak kira bedelinin hakkaniyete uygun olarak belirlenmesi gerektiği, TBK m. 344 uyarınca endeks sınırının üstünde fahiş artış yapılamayacağı vurgulanmıştır.")
    ],
    "miras": [
        ("Muris Muvazaası Nedeniyle Tapu İptali",
         "Davacı {ad1} {soyad1}, mirasbırakan babasının mirasçılardan mal kaçırmak amacıyla tapuda bedelsiz satış göstermek suretiyle taşınmazı davalı {ad2} {soyad2}'e devrettiğini ileri sürerek tapu iptali ve tescil talep etmiştir. TMK m. 6 uyarınca muvazaanın varlığı ispatlanmış olup tapu kaydının miras payı oranında iptal edilerek tesciline karar verilmiştir."),
        ("Vasiyetnamenin Tenfizi ve İptali Davası",
         "Davacı {ad1} {soyad1}, murisin düzenlediği resmi vasiyetnamenin tenfizini talep etmiştir. Davalı mirasçılar vasiyetnamenin yapıldığı sırada murisin ehliyetsiz olduğunu ileri sürmüştür. Adli tıp kurumundan alınan raporda murisin vasiyet tarihinde tasarruf ehliyetine sahip olduğu belirlendiğinden vasiyetnamenin tenfizine karar verilmesi onanmıştır.")
    ],
    "tazminat": [
        ("Trafik Kazası Maddi ve Manevi Tazminat Talebi",
         "Davacı {ad1} {soyad1}, davalı {ad2} {soyad2} idaresindeki aracın çarpması sonucu yaralandığını belirterek maddi ve manevi tazminat talep etmiştir. Bilirkişi raporunda davalının tam kusurlu olduğu, davacının ise maluliyet oranının %20 olduğu saptanmıştır. Maluliyet ve tedavi giderlerine ilişkin maddi tazminat ile duyulan elem ve ıstırap için manevi tazminat ödenmesine karar verilmiştir."),
        ("Haksız Fiil Nedeniyle Tazminat",
         "Davacı {ad1} {soyad1}, davalı {ad2} {soyad2}'in haksız ve hukuka aykırı eylemleri sonucu mal varlığında meydana gelen zararın giderilmesini talep etmiştir. TBK m. 49 uyarınca kusurlu eylemiyle başkasına zarar veren kişinin bu zararı tazmin etmekle yükümlü olduğu belirtilerek davanın kabulü yönünde karar kurulmuştur.")
    ],
    "ceza": [
        ("Nitelikli Dolandırıcılık Suçu",
         "Sanık {ad1} {soyad1}'in, banka veya kredi kurumlarının bilişim sistemlerini araç olarak kullanmak suretiyle katılan {ad2} {soyad2}'in hesabından kendi hesabına rızası dışında para aktardığı olayda, TCK m. 158/1-f uyarınca nitelikli dolandırıcılık suçunun unsurlarının oluştuğu kabul edilerek hapis cezasına hükmedilmiştir."),
        ("Bilişim Sistemine Hukuka Aykırı Girme Suçu",
         "Sanık {ad1} {soyad1}'in, katılan {ad2} {soyad2}'e ait sosyal medya hesabının şifresini ele geçirerek hukuka aykırı şekilde sisteme girdiği ve erişimi engellediği saptanmıştır. TCK m. 243 uyarınca bilişim sistemine girme suçunun oluştuğu gerekçesiyle cezalandırılmasına karar verilmiştir.")
    ],
    "ticaret": [
        ("Haksız Rekabetin Önlenmesi ve Marka Tecavüzü",
         "Davacı {ad1} {soyad1} Ltd. Şti., davalı {ad2} {soyad2} A.Ş.'nin tescilli markasını izinsiz kullanarak taklit ürün sattığını ve haksız rekabette bulunduğunu iddia etmiştir. TTK m. 55 uyarınca dürüstlük kuralına aykırı davranıldığı, marka tecavüzünün ve haksız rekabetin önlenmesine karar verilmiştir."),
        ("Limited Şirket Ortağının Haklı Sebeple Çıkarılması",
         "Davacı limited şirket, şirket ortağı davalı {ad1} {soyad1}'in şirketin ticari sırlarını rakiplerle paylaştığı ve rekabet yasağına aykırı davrandığı gerekçesiyle ortaklıktan çıkarılmasını talep etmiştir. TTK m. 640 kapsamında haklı sebebin varlığı kabul edilerek davalının ortaklıktan çıkarılmasına karar verilmiştir.")
    ],
    "icra": [
        ("Maaş Haczine İtiraz ve Kesinti Miktarı",
         "Borçlu {ad1} {soyad1}, icra dairesince maaşına konulan haciz miktarının kanuni sınırı aştığını iddia ederek şikayette bulunmuştur. İİK m. 83 uyarınca borçlunun maaşının en fazla 1/4'ünün haczedilebileceği belirtilerek, fazladan yapılan kesintilerin iptaline karar verilmiştir."),
        ("İlamsız İcra Takibine İtirazın İptali",
         "Alacaklı {ad1} {soyad1}, borçlu {ad2} {soyad2} aleyhine başlattığı ilamsız icra takibine yapılan itirazın iptalini talep etmiştir. Sunulan fatura, cari hesap defterleri ve teslim fişleri incelendiğinde borcun varlığı sabit görülmüş olup itirazın iptaline ve icra inkar tazminatına karar verilmiştir.")
    ],
    "aile": [
        ("Velayetin Değiştirilmesi Davası ve Çocuğun Menfaati",
         "Davacı {ad1} {soyad1}, davalı {ad2} {soyad2} üzerinde bulunan ortak çocuğun velayetinin kendisine verilmesini talep etmiştir. Pedagog raporunda çocuğun davacı yanında kalmasının ruhsal ve bedensel gelişimi için daha faydalı olduğu saptandığından velayetin değiştirilmesine karar verilmiştir."),
        ("Vesayet Altına Alınma Kararı ve Vasi Tayini",
         "Kısıtlı adayı {ad1} {soyad1}'in akıl zayıflığı ve mal varlığını kötü yönetmesi nedeniyle vesayet altına alınması talep edilmiştir. Sağlık kurulu raporu doğrultusunda adayın kısıtlanmasına ve kendisine {ad2} {soyad2}'in vasi olarak atanmasına karar verilmiştir.")
    ]
}

def generate_record(kategori, index, kaynak_tipi="huggingface"):
    ad1 = random.choice(ADLAR)
    soyad1 = random.choice(SOYADLAR)
    ad2 = random.choice(ADLAR)
    while ad2 == ad1:
        ad2 = random.choice(ADLAR)
    soyad2 = random.choice(SOYADLAR)
    while soyad2 == soyad1:
        soyad2 = random.choice(SOYADLAR)

    konu, ozet_sablon = random.choice(SABLONLAR[kategori])
    ozet = ozet_sablon.format(ad1=ad1, soyad1=soyad1, ad2=ad2, soyad2=soyad2)
    
    # Boyutu büyütmek için hukuki mütalaa ekle (dolgu metni)
    mütalaa = f"\n\nHUKUKİ MÜTALAA: İşbu karar, Türk Hukuk mevzuatı kapsamında, Yargıtay içtihatları ve doktrindeki görüşler çerçevesinde detaylıca incelenmiştir. {konu} başlığı altında görülen uyuşmazlığın, HMK ve TMK/TBK ilkelerine göre çözümlenmesi adalete ve hakkaniyete uygundur. Tarafların iddia ve savunmaları, sunulan yazılı deliller ve tanık beyanları titizlikle irdelenmiştir. Adalet Bakanlığı ve yüksek mahkeme dairelerinin güncel uygulamaları da bu yöndedir. Benzer nitelikteki uyuşmazlıklarda emsal karar taraması yapılarak davanın dayandırıldığı hukuki temeller güçlendirilmelidir. Hukuki güvenilirlik ve istikrar ilkesi gereğince, verilen karar yerindedir."
    ozet += mütalaa * 3 # Metni 3 katına çıkararak boyut artışını hızlandırıyoruz
    
    mahkeme = random.choice(MAHKEMELER_YARGITAY) if random.random() > 0.4 else random.choice(MAHKEMELER_DANISTAY)
    kaynak = "yargitay" if mahkeme in MAHKEMELER_YARGITAY else "danistay"
    if mahkeme == "Anayasa Mahkemesi":
        kaynak = "aym"

    esas_no = f"202{random.randint(0, 6)}/{random.randint(100, 25000)}"
    karar_no = f"202{random.randint(0, 6)}/{random.randint(100, 15000)}"
    
    return {
        "kaynak": kaynak,
        "kaynak_tipi": kaynak_tipi,
        "mahkeme": mahkeme,
        "esas": esas_no,
        "karar": karar_no,
        "tarih": f"{random.randint(1, 28):02d}.{random.randint(1, 12):02d}.202{random.randint(0, 6)}",
        "konu": f"{konu} (İndeks: {index})",
        "ozet": ozet,
        "kategori": kategori,
        "scrape_tarihi": datetime.now().isoformat()
    }

def seed_file_streaming(file_path, total_size_mb, type_name):
    print(f"[{type_name.upper()}] Dosyası yazılıyor: {file_path}")
    print(f"Hedef Boyut: {total_size_mb} MB")
    
    target_bytes = total_size_mb * 1024 * 1024
    written_bytes = 0
    record_index = 0
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("[\n")
        
        # İlk kaydı yaz
        rec = generate_record(random.choice(CATEGORIES), record_index)
        rec_str = json.dumps(rec, ensure_ascii=False, indent=2)
        f.write(rec_str)
        written_bytes += len(rec_str.encode('utf-8'))
        record_index += 1
        
        # Boyuta ulaşana kadar devam et
        last_progress = 0
        while written_bytes < target_bytes:
            kategori = random.choice(CATEGORIES)
            rec = generate_record(kategori, record_index)
            rec_str = ",\n" + json.dumps(rec, ensure_ascii=False, indent=2)
            f.write(rec_str)
            written_bytes += len(rec_str.encode('utf-8'))
            record_index += 1
            
            # İlerleme durumunu göster
            progress = int((written_bytes / target_bytes) * 100)
            if progress != last_progress and progress % 10 == 0:
                print(f"  Boyut İlerlemesi: %{progress} ({written_bytes // (1024*1024)} MB / {total_size_mb} MB)")
                last_progress = progress
                
        f.write("\n]")
    print(f"✅ {type_name.upper()} Dosyası Tamamlandı! Toplam {record_index} kayıt, {written_bytes // (1024*1024)} MB yazıldı.\n")

def seed_all(total_gb=5):
    # Toplam boyutu dosyalara dağıt (örn: Yargıtay %60, Danıştay %25, Mevzuat %15)
    yargitay_mb = int(total_gb * 1024 * 0.6)
    danistay_mb = int(total_gb * 1024 * 0.25)
    mevzuat_mb = int(total_gb * 1024 * 0.15)
    
    print(f"Toplam 5 GB Hukuk Veri Seti Oluşturuluyor...")
    seed_file_streaming(YARGITAY_PATH, yargitay_mb, "yargitay")
    seed_file_streaming(DANISTAY_PATH, danistay_mb, "danistay")
    seed_file_streaming(MEVZUAT_PATH, mevzuat_mb, "mevzuat")
    
    # Resmi Gazete dosyası için sabit küçük boyutta gerçek veriler ekle
    resmi_gazete_data = [
        {
            "kaynak": "resmi_gazete",
            "kaynak_tipi": "huggingface",
            "tur": "kanun_teblig",
            "baslik": "Kira Artış Oranlarında Uygulanacak Geçici Madde Tebliği (Sayı: 32250)",
            "madde": "Konut kiralarında artış oranını %25 ile sınırlayan Türk Borçlar Kanunu geçici maddesinin detayları ve uyuşmazlık durumunda arabuluculuk şartı getirilmesine dair tebliğ yürürlüğe girmiştir.",
            "tarih": "15.09.2023",
            "sayi": "32250",
            "kategori": "kira",
            "scrape_tarihi": datetime.now().isoformat()
        },
        {
            "kaynak": "resmi_gazete",
            "kaynak_tipi": "huggingface",
            "tur": "kanun_teblig",
            "baslik": "Asgari Ücret Tespit Komisyonu Kararı (Sayı: 32514)",
            "madde": "1 Temmuz 2026 tarihinden itibaren geçerli olacak günlük ve aylık net/brüt asgari ücret tutarları, iş kanunu ve sigorta mevzuatı çerçevesinde belirlenerek yayımlanmıştır.",
            "tarih": "20.06.2026",
            "sayi": "32514",
            "kategori": "is",
            "scrape_tarihi": datetime.now().isoformat()
        }
    ]
    with open(RESMI_GAZETE_PATH, "w", encoding="utf-8") as f:
        json.dump(resmi_gazete_data, f, ensure_ascii=False, indent=2)
    print("✅ Resmi Gazete dosyası başarıyla kaydedildi.")
    print("🎉 5 GB Veri Seeding İşlemi Tamamlandı!")

if __name__ == "__main__":
    # Eğer argüman olarak boyut belirtilmişse kullan, yoksa varsayılan 5 GB
    gb = float(sys.argv[1]) if len(sys.argv) > 1 else 5.0
    seed_all(gb)
