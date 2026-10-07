export const companyInformation = {
  brandName: 'Şükran App',

  legalName: '[ŞİRKETİN TAM TİCARİ UNVANI]',

  address: '[ŞİRKETİN AÇIK ADRESİ]',

  taxOffice: '[VERGİ DAİRESİ]',

  taxNumber: '[VERGİ KİMLİK NUMARASI]',

  mersisNumber: '[MERSİS NUMARASI]',

  email: '[HUKUKİ BİLDİRİM E-POSTASI]',

  phone: '[TELEFON NUMARASI]',

  kepAddress: '[KEP ADRESİ – VARSA]',

  website: '[WEB SİTESİ ADRESİ]',
};

const company = companyInformation;

export const legalDocuments = {
  kvkk: {
    title: 'KVKK Aydınlatma Metni',

    shortTitle: 'KVKK Aydınlatma Metni',

    description:
      'Şükran App tarafından işlenen kişisel verilere ilişkin aydınlatma metni.',

    updatedAt: 'Son güncelleme: [GÜN/AY/YIL]',

    sections: [
      {
        title: '1. Veri Sorumlusu',
        paragraphs: [
          `6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu; ${company.legalName} unvanlı, ${company.address} adresinde faaliyet gösteren şirkettir.`,

          `Şükran App, restoran, kafe ve benzeri işletmelere QR menü, sipariş yönetimi, ödeme yönlendirme, mutfak ve personel paneli ile işletme yönetimi hizmetleri sağlayan web tabanlı bir platformdur.`,

          `Kişisel verileriniz; hukuka ve dürüstlük kurallarına uygun, doğru, gerektiğinde güncel, belirli, açık ve meşru amaçlarla, işlendikleri amaçla bağlantılı, sınırlı ve ölçülü şekilde işlenir.`,
        ],
      },

      {
        title: '2. İşlenen Kişisel Veriler',
        paragraphs: [
          'Platformun kullanılması sırasında aşağıdaki kişisel veri kategorileri işlenebilir:',
        ],
        items: [
          'Kimlik bilgileri: ad, soyad, T.C. kimlik numarası, yetkili kişi ve işletme temsilcisi bilgileri.',
          'İletişim bilgileri: e-posta adresi, telefon numarası, adres ve iletişim tercihleri.',
          'Müşteri işlem bilgileri: üyelik, paket, ödeme, sipariş, fatura ve destek talebi bilgileri.',
          'Finansal bilgiler: fatura bilgileri, vergi numarası, vergi dairesi, ödeme durumu ve işlem kayıtları.',
          'İşletme bilgileri: ticari unvan, MERSİS numarası, işletme adresi, şube ve yetkili personel bilgileri.',
          'İşlem güvenliği bilgileri: IP adresi, oturum kayıtları, cihaz ve tarayıcı bilgileri, tarih-saat kayıtları.',
          'Hukuki işlem bilgileri: talep, şikâyet, uyuşmazlık ve yasal bildirim kayıtları.',
          'Pazarlama bilgileri: yalnızca gerekli hukuki şartların veya açık rızanın bulunması halinde kampanya ve iletişim tercihleri.',
        ],
      },

      {
        title: '3. Kişisel Verilerin İşlenme Amaçları',
        items: [
          'Üyelik ve işletme hesabının oluşturulması.',
          'Kullanıcı kimliğinin ve hesap güvenliğinin doğrulanması.',
          'QR menü, sipariş, mutfak ve garson paneli hizmetlerinin sunulması.',
          'Satın alınan paketin tanımlanması ve kullanım haklarının yönetilmesi.',
          'Ödeme ve faturalandırma süreçlerinin yürütülmesi.',
          'Şifre sıfırlama ve güvenlik bildirimlerinin gönderilmesi.',
          'Destek talebi, öneri ve şikâyetlerin sonuçlandırılması.',
          'Platform güvenliğinin sağlanması ve kötüye kullanımın önlenmesi.',
          'Teknik sorunların tespit edilmesi ve hizmet kalitesinin geliştirilmesi.',
          'Yetkili kamu kurumlarına karşı hukuki yükümlülüklerin yerine getirilmesi.',
          'Uyuşmazlık halinde hakların kurulması, kullanılması veya korunması.',
          'Açık rıza verilmesi halinde kampanya ve tanıtım iletişimlerinin gönderilmesi.',
        ],
      },

      {
        title: '4. Kişisel Verilerin Hukuki Sebepleri',
        paragraphs: [
          'Kişisel veriler; KVKK’nın 5. ve gerektiğinde 6. maddelerinde belirtilen hukuki sebeplere dayanılarak işlenir.',
        ],
        items: [
          'Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması.',
          'Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi.',
          'Bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması.',
          'İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaati.',
          'Kanunlarda açıkça öngörülmesi.',
          'Gerekli olduğu durumlarda ilgili kişinin açık rızası.',
        ],
      },

      {
        title: '5. Kişisel Verilerin Aktarılması',
        paragraphs: [
          'Kişisel veriler, hizmetin yürütülmesi için gerekli olduğu ölçüde ve ilgili hukuki şartlara dayanılarak aşağıdaki alıcı gruplarına aktarılabilir:',
        ],
        items: [
          'Ödeme hizmeti ve sanal POS sağlayıcıları.',
          'Sunucu, veri tabanı, e-posta, güvenlik ve teknik altyapı sağlayıcıları.',
          'Muhasebe, hukuk ve mali müşavirlik hizmeti sağlayıcıları.',
          'Yalnızca yetkili olmaları halinde kamu kurumları, mahkemeler ve icra makamları.',
          'Kullanıcının talimat verdiği veya entegrasyon kurduğu hizmet sağlayıcıları.',
        ],
      },

      {
        title: '6. Üye İşletmeler ve Son Tüketiciler',
        paragraphs: [
          'Şükran App, üye işletmenin kendi müşterilerinden topladığı kişisel veriler bakımından her durumda doğrudan veri sorumlusu değildir. Üye işletmenin QR menü kullanıcıları, müşterileri ve personelleri hakkında kendi amaçlarıyla topladığı veriler bakımından ilgili işletme veri sorumlusu olabilir.',

          'Üye işletme; müşterilerine gerekli aydınlatmayı yapmak, hukuki işleme şartını belirlemek, personel yetkilerini düzenlemek ve sisteme hukuka aykırı veri yüklememekle sorumludur.',

          'Şükran App, üye işletmenin talimatları doğrultusunda teknik hizmet sunduğu durumlarda veri işleyen sıfatıyla hareket edebilir.',
        ],
      },

      {
        title: '7. Saklama Süreleri',
        paragraphs: [
          'Kişisel veriler, işleme amacı için gerekli süre boyunca ve ilgili mevzuatta öngörülen zamanaşımı ve saklama süreleri dikkate alınarak muhafaza edilir.',

          'Üyelik sona erdiğinde veriler derhal her durumda silinmeyebilir. Fatura, ödeme, işlem güvenliği ve hukuki kayıtlar, ilgili mevzuatın gerektirdiği süre boyunca saklanabilir. Süre sona erdiğinde veriler silinir, yok edilir veya anonim hâle getirilir.',
        ],
      },

      {
        title: '8. Veri Güvenliği',
        items: [
          'Yetkisiz erişimlerin sınırlandırılması.',
          'Rol ve yetki tabanlı panel erişimlerinin uygulanması.',
          'İletişimin güvenli bağlantılar üzerinden gerçekleştirilmesi.',
          'Şifrelerin açık şekilde saklanmaması.',
          'İşlem ve güvenlik kayıtlarının tutulması.',
          'Gerekli yedekleme ve erişim kontrolü süreçlerinin uygulanması.',
        ],
      },

      {
        title: '9. İlgili Kişinin Hakları',
        paragraphs: [
          'KVKK’nın 11. maddesi kapsamında veri sorumlusuna başvurarak aşağıdaki haklarınızı kullanabilirsiniz:',
        ],
        items: [
          'Kişisel verilerinizin işlenip işlenmediğini öğrenme.',
          'İşlenmişse buna ilişkin bilgi talep etme.',
          'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.',
          'Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme.',
          'Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme.',
          'Kanuni şartların oluşması halinde silinmesini veya yok edilmesini isteme.',
          'Düzeltme, silme veya yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.',
          'Münhasıran otomatik sistemlerle analiz sonucunda aleyhe bir sonucun ortaya çıkmasına itiraz etme.',
          'Kanuna aykırı işleme nedeniyle zarara uğranılması halinde zararın giderilmesini talep etme.',
        ],
      },

      {
        title: '10. Başvuru Yöntemi',
        paragraphs: [
          `KVKK kapsamındaki taleplerinizi ${company.email} adresine veya ${company.address} adresine yazılı olarak iletebilirsiniz.`,

          'Başvuruda ad, soyad, iletişim bilgisi, talebin konusu ve kimliği doğrulamaya yardımcı gerekli bilgiler bulunmalıdır. Başvurular, talebin niteliğine göre yasal süre içerisinde sonuçlandırılır.',
        ],
      },
    ],
  },

  consent: {
    title: 'KVKK Açık Rıza Metni',

    shortTitle: 'KVKK Açık Rıza Metni',

    description:
      'Açık rızaya tabi kişisel veri işleme faaliyetleri hakkında bilgilendirme.',

    updatedAt: 'Son güncelleme: [GÜN/AY/YIL]',

    sections: [
      {
        title: '1. Açık Rızanın Kapsamı',
        paragraphs: [
          `Bu açık rıza metni, ${company.legalName} tarafından sunulan Şükran App hizmetlerinde, sözleşmenin kurulması veya ifası için zorunlu olmayan kişisel veri işleme faaliyetlerine ilişkindir.`,

          'Üyelik hesabının oluşturulması, hizmetin sunulması, ödeme işlemlerinin yürütülmesi, güvenliğin sağlanması ve kanuni yükümlülüklerin yerine getirilmesi için gerekli veri işleme faaliyetleri açık rızaya değil, ilgili kanuni işleme şartlarına dayanabilir.',
        ],
      },

      {
        title: '2. Açık Rıza Verilebilecek Faaliyetler',
        items: [
          'Kampanya, indirim, yeni özellik ve tanıtım içeriklerinin e-posta veya telefon yoluyla gönderilmesi.',
          'Kullanım alışkanlıklarının hizmet geliştirme ve kişiselleştirme amacıyla analiz edilmesi.',
          'Zorunlu olmayan analiz ve pazarlama teknolojilerinin kullanılması.',
          'Açık rıza gerektiren kişisel verilerin belirtilen amaçlarla hizmet sağlayıcılara aktarılması.',
        ],
      },

      {
        title: '3. Rızanın İsteğe Bağlı Olması',
        paragraphs: [
          'Açık rıza vermek zorunlu değildir. Açık rıza verilmemesi, temel üyelik ve hizmetlerden yararlanılmasını engellemez.',

          'Verilen açık rıza, geleceğe etkili olmak üzere her zaman geri alınabilir. Rızanın geri alınması, geri alma işleminden önce gerçekleştirilen hukuka uygun işlemleri geçersiz hâle getirmez.',
        ],
      },

      {
        title: '4. Açık Rıza Beyanı',
        paragraphs: [
          'KVKK Aydınlatma Metni’ni okuduğumu ve anladığımı; zorunlu olmayan pazarlama, kampanya ve kişiselleştirme faaliyetleri kapsamında kişisel verilerimin işlenmesine kendi özgür irademle izin verdiğimi kabul ederim.',

          `Açık rıza tercihi, hesap ayarlarından veya ${company.email} adresine başvurularak geri alınabilir.`,
        ],
      },
    ],
  },

  userAgreement: {
    title: 'Şükran App Kullanıcı ve Üyelik Sözleşmesi',

    shortTitle: 'Kullanıcı Sözleşmesi',

    description:
      'Şükran App işletme üyeliğinin ve platform kullanımının temel şartları.',

    updatedAt: 'Son güncelleme: [GÜN/AY/YIL]',

    sections: [
      {
        title: '1. Taraflar',
        paragraphs: [
          `Bu sözleşme; ${company.legalName}, bundan sonra “Şükran App” olarak anılacaktır, ile platforma üye olan gerçek veya tüzel kişi, bundan sonra “Üye İşletme” olarak anılacaktır, arasında elektronik ortamda kurulmuştur.`,

          `Şükran App iletişim bilgileri: ${company.address}, ${company.email}, ${company.phone}.`,
        ],
      },

      {
        title: '2. Sözleşmenin Konusu',
        paragraphs: [
          'Sözleşmenin konusu; Üye İşletme’ye QR menü oluşturma, ürün ve kategori yönetimi, masa yönetimi, sipariş takibi, mutfak ve personel panelleri, raporlama ve uygun paketlerde ödeme yönlendirme hizmetlerinin sunulmasına ilişkin şartların belirlenmesidir.',
        ],
      },

      {
        title: '3. Üyelik Hesabı',
        items: [
          'Üye İşletme kayıt sırasında doğru, güncel ve eksiksiz bilgi vermekle yükümlüdür.',
          'Hesap bilgileri ve şifre yalnızca yetkilendirilmiş kişiler tarafından kullanılmalıdır.',
          'Üye İşletme, personel hesaplarına verdiği yetkilerden ve bu hesaplarla gerçekleştirilen işlemlerden sorumludur.',
          'Yetkisiz erişim şüphesi derhal Şükran App’e bildirilmelidir.',
          'Yanlış, yanıltıcı veya üçüncü kişilere ait bilgilerle hesap oluşturulamaz.',
        ],
      },

      {
        title: '4. Paketler ve Kullanım Sınırları',
        paragraphs: [
          'Sunulan özellikler, sipariş sınırları, kullanıcı rolleri ve diğer haklar satın alınan pakete göre değişebilir.',

          'Paket içeriği, fiyatı, ödeme dönemi ve kullanım sınırları satın alma öncesinde kullanıcıya gösterilir. Paket sınırlarının aşılması halinde ilgili özellik geçici olarak durdurulabilir veya paket yükseltme seçeneği sunulabilir.',
        ],
      },

      {
        title: '5. Ücret ve Ödeme',
        items: [
          'Ücretler satın alma ekranında gösterilen güncel tutarlardır.',
          'Aylık veya yıllık paket seçenekleri kullanıcı tercihine göre belirlenir.',
          'Ödeme, platformda belirtilen ödeme hizmeti sağlayıcısı aracılığıyla gerçekleştirilir.',
          'Şükran App, kart bilgilerini doğrudan saklamaz; ödeme bilgileri yetkili ödeme kuruluşu tarafından işlenebilir.',
          'Ödeme başarısız olursa ücretli hizmetlerin etkinleştirilmesi veya yenilenmesi gerçekleştirilmeyebilir.',
        ],
      },

      {
        title: '6. Üye İşletmenin Yükümlülükleri',
        items: [
          'Ürün, fiyat, içerik, alerjen, stok ve açıklama bilgilerinin doğruluğunu sağlamak.',
          'Satış, fiş, fatura, vergi ve tüketici mevzuatından doğan yükümlülükleri yerine getirmek.',
          'Müşteri ve personel verilerini hukuka uygun şekilde sisteme aktarmak.',
          'QR kodlarını hukuka aykırı, yanıltıcı veya platforma zarar verecek şekilde kullanmamak.',
          'Platform üzerinde zararlı yazılım, otomatik saldırı veya yetkisiz erişim girişiminde bulunmamak.',
          'Kendi işletmesinden kaynaklanan müşteri taleplerini ve sipariş uyuşmazlıklarını yönetmek.',
        ],
      },

      {
        title: '7. Siparişler ve İşletme Sorumluluğu',
        paragraphs: [
          'Şükran App, Üye İşletme ile son tüketici arasında satılan yiyecek, içecek veya diğer ürünlerin satıcısı değildir. Ürünlerin hazırlanması, kalitesi, fiyatı, teslimi, yasal uygunluğu ve satış sonrası süreçleri Üye İşletme’nin sorumluluğundadır.',

          'Şükran App, sipariş ve ödeme bilgilerinin teknik olarak iletilmesini sağlayan yazılım altyapısı sunar.',
        ],
      },

      {
        title: '8. Fikrî Mülkiyet',
        paragraphs: [
          'Şükran App yazılımı, tasarımı, kaynak kodu, markası, veri tabanı yapısı ve platform bileşenleri üzerindeki fikrî mülkiyet hakları Şükran App’e veya ilgili hak sahibine aittir.',

          'Üye İşletme’ye yalnızca sözleşme süresince, devredilemez ve sınırlı bir kullanım hakkı verilir. Yazılım kopyalanamaz, tersine mühendislik işlemine tabi tutulamaz, satılamaz veya üçüncü kişilere kullandırılamaz.',
        ],
      },

      {
        title: '9. Hizmetin Sürekliliği',
        paragraphs: [
          'Bakım, güncelleme, güvenlik çalışması, üçüncü taraf hizmet kesintisi veya mücbir sebep nedeniyle hizmette geçici kesintiler yaşanabilir.',

          'Şükran App, planlı bakım çalışmalarını mümkün olduğu ölçüde önceden bildirmeye çalışır ancak kesintisiz hizmet garantisi vermez.',
        ],
      },

      {
        title: '10. Askıya Alma ve Fesih',
        paragraphs: [
          'Ödeme yükümlülüğünün yerine getirilmemesi, hukuka aykırı kullanım, güvenlik ihlali veya sözleşmeye aykırılık halinde hesap geçici olarak askıya alınabilir.',

          'Taraflar, satın alınan paketin ve ilgili fesih koşullarının izin verdiği ölçüde sözleşmeyi sona erdirebilir. Sözleşmenin sona ermesi, doğmuş ödeme ve hukuki sorumlulukları ortadan kaldırmaz.',
        ],
      },

      {
        title: '11. Sorumluluğun Sınırlandırılması',
        paragraphs: [
          'Şükran App; Üye İşletme’nin yanlış ürün veya fiyat girmesi, personel işlemleri, internet kesintisi, üçüncü taraf servis arızası veya işletmenin yasal yükümlülüklerini yerine getirmemesi nedeniyle oluşan zararlardan sorumlu tutulamaz.',

          'Emredici mevzuattan doğan ve sözleşmeyle kaldırılamayan sorumluluklar saklıdır.',
        ],
      },

      {
        title: '12. Uyuşmazlıklar',
        paragraphs: [
          'Sözleşmeye Türkiye Cumhuriyeti hukuku uygulanır. Tüketici sıfatının bulunmadığı ticari uyuşmazlıklarda, kanunen yetkili mahkeme ve icra dairelerinin yetkisi saklıdır.',

          'Tarafların tüketici sayıldığı durumlarda tüketici mevzuatındaki zorunlu yetki kuralları uygulanır.',
        ],
      },

      {
        title: '13. Yürürlük',
        paragraphs: [
          'Üye İşletme, kayıt ekranında sözleşmeyi kabul ederek hükümleri okuduğunu, anladığını ve elektronik ortamda onayladığını kabul eder.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Gizlilik Politikası',

    shortTitle: 'Gizlilik Politikası',

    description:
      'Şükran App internet sitesi ve yönetim panellerindeki gizlilik uygulamaları.',

    updatedAt: 'Son güncelleme: [GÜN/AY/YIL]',

    sections: [
      {
        title: '1. Politikanın Kapsamı',
        paragraphs: [
          'Bu politika; Şükran App internet sitesini ziyaret edenlerin, platforma üye olan işletmelerin, işletme personellerinin ve destek kanallarını kullanan kişilerin bilgilerinin nasıl korunduğunu açıklar.',

          'Kişisel verilerin işlenmesine ilişkin ayrıntılı bilgiler ayrıca KVKK Aydınlatma Metni’nde yer almaktadır.',
        ],
      },

      {
        title: '2. Toplanan Bilgiler',
        items: [
          'Ziyaret ve teknik kullanım kayıtları.',
          'Üyelik, iletişim ve işletme bilgileri.',
          'Sipariş ve ödeme durumu bilgileri.',
          'Destek talepleri ve kullanıcı tarafından iletilen mesajlar.',
          'Tarayıcı, cihaz, oturum ve IP bilgileri.',
          'Çerez ve benzeri teknolojiler aracılığıyla elde edilen bilgiler.',
        ],
      },

      {
        title: '3. Bilgilerin Kullanımı',
        items: [
          'Platformun çalıştırılması ve geliştirilmesi.',
          'Kullanıcı hesabının ve oturum güvenliğinin sağlanması.',
          'Ödemelerin ve paket haklarının yönetilmesi.',
          'Teknik destek sağlanması.',
          'Hata, kötüye kullanım ve güvenlik olaylarının tespit edilmesi.',
          'Yasal yükümlülüklerin yerine getirilmesi.',
        ],
      },

      {
        title: '4. Çerezler',
        paragraphs: [
          'Platformun çalışması, oturumun korunması ve güvenliğin sağlanması için zorunlu çerezler kullanılabilir.',

          'Analiz veya pazarlama amaçlı zorunlu olmayan çerezler kullanılması halinde, gerekli olduğu ölçüde kullanıcı tercihi veya açık rızası alınır.',
        ],
      },

      {
        title: '5. Üçüncü Taraf Hizmetleri',
        paragraphs: [
          'Ödeme, barındırma, e-posta, harita, analiz veya güvenlik hizmetleri kapsamında üçüncü taraf hizmet sağlayıcılarından yararlanılabilir.',

          'Üçüncü taraf sitelere verilen bağlantılar, ilgili sitelerin kendi gizlilik politikalarına tabidir. Şükran App, üçüncü taraf sitelerin içeriklerinden sorumlu değildir.',
        ],
      },

      {
        title: '6. Bilgi Güvenliği',
        paragraphs: [
          'Bilgilerin yetkisiz erişime, değiştirmeye, ifşaya veya kayba karşı korunması için makul idari ve teknik güvenlik önlemleri uygulanır.',

          'Bununla birlikte internet üzerinden gerçekleştirilen hiçbir aktarım veya saklama yönteminin mutlak şekilde güvenli olduğu garanti edilemez.',
        ],
      },

      {
        title: '7. Politika Değişiklikleri',
        paragraphs: [
          'Bu politika, hizmetlerde veya mevzuatta meydana gelen değişikliklere göre güncellenebilir. Güncel metin yayınlandığı tarihten itibaren geçerli olur.',
        ],
      },

      {
        title: '8. İletişim',
        paragraphs: [
          `Gizlilik uygulamalarımız hakkındaki sorularınızı ${company.email} adresine iletebilirsiniz.`,
        ],
      },
    ],
  },

  terms: {
    title: 'Kullanım Koşulları',

    shortTitle: 'Kullanım Koşulları',

    description:
      'Şükran App internet sitesinin ve platformunun genel kullanım kuralları.',

    updatedAt: 'Son güncelleme: [GÜN/AY/YIL]',

    sections: [
      {
        title: '1. Kabul',
        paragraphs: [
          'Şükran App internet sitesini veya platformunu kullanan herkes bu kullanım koşullarına uymayı kabul eder. Koşulları kabul etmeyen kişiler platformu kullanmamalıdır.',
        ],
      },

      {
        title: '2. Hizmetin Niteliği',
        paragraphs: [
          'Şükran App; restoran, kafe ve benzeri işletmeler için QR menü, sipariş yönetimi, işletme paneli ve bağlantılı dijital hizmetler sağlayan bir yazılım platformudur.',

          'Platformda gösterilen yiyecek, içecek, ürün, fiyat ve işletme bilgileri ilgili Üye İşletme tarafından oluşturulur.',
        ],
      },

      {
        title: '3. İzin Verilen Kullanım',
        items: [
          'Platform yalnızca hukuka uygun amaçlarla kullanılabilir.',
          'Başkasına ait hesaplara yetkisiz erişim sağlanamaz.',
          'Platformun çalışmasını bozacak otomatik istek, saldırı veya zararlı yazılım kullanılamaz.',
          'Yanıltıcı, hukuka aykırı veya üçüncü kişilerin haklarını ihlal eden içerik yüklenemez.',
          'Kaynak kod, arayüz veya platform bileşenleri izinsiz kopyalanamaz.',
        ],
      },

      {
        title: '4. Kullanıcı İçerikleri',
        paragraphs: [
          'Kullanıcılar sisteme yükledikleri ürün isimleri, açıklamalar, görseller, fiyatlar, logolar ve diğer içeriklerden sorumludur.',

          'Kullanıcı, yüklediği içerikleri kullanmak için gerekli hak ve izinlere sahip olduğunu kabul eder.',
        ],
      },

      {
        title: '5. Üçüncü Taraf Bağlantıları',
        paragraphs: [
          'Platform, ödeme kuruluşları veya diğer hizmetlere bağlantı verebilir. Bu hizmetlerin kullanılmasında ilgili üçüncü tarafın koşulları da geçerli olabilir.',
        ],
      },

      {
        title: '6. Hizmet Değişiklikleri',
        paragraphs: [
          'Platform özellikleri güvenlik, performans, kullanıcı deneyimi veya mevzuata uyum amacıyla güncellenebilir.',

          'Esaslı değişiklikler uygun yöntemlerle kullanıcılara bildirilebilir.',
        ],
      },

      {
        title: '7. Sorumluluk',
        paragraphs: [
          'Platformda yer alan işletme içeriklerinin doğruluğu ilgili işletmenin sorumluluğundadır. Şükran App, emredici mevzuattan doğan sorumlulukları saklı kalmak üzere üçüncü kişi içeriklerinden sorumlu değildir.',
        ],
      },

      {
        title: '8. İletişim',
        paragraphs: [
          `Kullanım koşulları hakkındaki sorularınızı ${company.email} adresine iletebilirsiniz.`,
        ],
      },
    ],
  },

  distanceSales: {
    title: 'Mesafeli Satış Sözleşmesi',

    shortTitle: 'Mesafeli Satış Sözleşmesi',

    description:
      'Şükran App dijital hizmet paketlerinin uzaktan satın alınmasına ilişkin sözleşme.',

    updatedAt: 'Son güncelleme: [GÜN/AY/YIL]',

    sections: [
      {
        title: 'Önemli Bilgilendirme',
        paragraphs: [
          'Bu metin, alıcının hukuken tüketici sıfatına sahip olduğu işlemlerde uygulanmak üzere hazırlanmıştır. Hizmetin ticari veya mesleki amaçla satın alınması halinde işlemin tüketici işlemi sayılmaması mümkündür.',

          'Satın alma ekranında gösterilen paket, süre, fiyat, vergi, ödeme ve hizmet başlangıç bilgileri bu sözleşmenin ayrılmaz parçasıdır.',
        ],
      },

      {
        title: '1. Taraflar',
        paragraphs: [
          `Satıcı/Hizmet Sağlayıcı: ${company.legalName}`,

          `Adres: ${company.address}`,

          `Vergi dairesi ve numarası: ${company.taxOffice} / ${company.taxNumber}`,

          `MERSİS numarası: ${company.mersisNumber}`,

          `E-posta: ${company.email}`,

          `Telefon: ${company.phone}`,

          'Alıcı: Satın alma sırasında adı, soyadı veya ticari unvanı ile iletişim ve fatura bilgilerini giren kullanıcıdır.',
        ],
      },

      {
        title: '2. Sözleşmenin Konusu',
        paragraphs: [
          'Bu sözleşme, Alıcı’nın elektronik ortamda sipariş verdiği Şükran App dijital hizmet paketinin satışı ve sunulması ile tarafların hak ve yükümlülüklerini düzenler.',
        ],
      },

      {
        title: '3. Hizmet Bilgileri',
        paragraphs: [
          'Satın alınan paketin adı, kapsamı, kullanım süresi, aylık veya yıllık ödeme dönemi, toplam fiyatı ve vergiler dahil ödenecek tutar ödeme öncesinde Alıcı’ya gösterilir.',

          'Hizmet dijital ortamda sunulur. Fiziksel teslimat yapılmaz.',
        ],
      },

      {
        title: '4. Ödeme',
        paragraphs: [
          'Ödeme, satın alma ekranında belirtilen ödeme yöntemi ve yetkili ödeme hizmeti sağlayıcısı üzerinden gerçekleştirilir.',

          'Ödeme onaylanmadıkça ücretli paket etkinleştirilmeyebilir. Kart bilgileri doğrudan Şükran App sunucularında saklanmaz.',
        ],
      },

      {
        title: '5. Hizmetin İfası',
        paragraphs: [
          'Dijital hizmet, ödeme işleminin başarılı şekilde tamamlanmasından sonra hesap üzerinde tanımlanır.',

          'Teknik veya güvenlik kontrolü gerektiren durumlarda hizmetin etkinleştirilmesi makul bir süre gecikebilir.',
        ],
      },

      {
        title: '6. Cayma Hakkı',
        paragraphs: [
          'Cayma hakkının bulunup bulunmadığı; Alıcı’nın tüketici sıfatına, satın alınan hizmetin niteliğine, hizmetin ifasına başlanmasına ve yürürlükteki tüketici mevzuatına göre belirlenir.',

          'Tüketicinin açık onayıyla cayma hakkı süresi sona ermeden ifasına başlanan hizmetlerde veya elektronik ortamda anında ifa edilen hizmetlerde mevzuatta belirtilen cayma hakkı istisnaları uygulanabilir.',

          'Cayma hakkının bulunduğu bir işlemde Alıcı, yasal süre içerisinde açık bir bildirimle talebini Satıcı’ya yöneltebilir.',
        ],
      },

      {
        title: '7. İade',
        paragraphs: [
          'Geçerli bir cayma veya iade hakkının bulunması halinde geri ödeme, mevzuatta belirtilen süre ve yöntemle gerçekleştirilir.',

          'Alıcı’nın kusurundan, hatalı kullanımından veya paket kapsamı dışındaki beklentilerinden kaynaklanan talepler, otomatik olarak iade hakkı doğurmaz. Emredici tüketici hakları saklıdır.',
        ],
      },

      {
        title: '8. Şikâyet ve Başvurular',
        paragraphs: [
          `Alıcı, talep ve şikâyetlerini ${company.email} adresi veya ${company.phone} numarası üzerinden iletebilir.`,

          'Tüketici niteliğindeki Alıcı, ilgili parasal sınırlar ve mevzuat çerçevesinde tüketici hakem heyetine veya tüketici mahkemesine başvurabilir.',
        ],
      },

      {
        title: '9. Kişisel Veriler',
        paragraphs: [
          'Satın alma sırasında elde edilen kişisel veriler, ödeme ve sözleşme süreçlerinin yürütülmesi amacıyla KVKK Aydınlatma Metni’ne uygun şekilde işlenir.',
        ],
      },

      {
        title: '10. Yürürlük',
        paragraphs: [
          'Alıcı, elektronik ortamda onay vererek ön bilgilendirmeyi yaptığını, paket özelliklerini ve toplam bedeli gördüğünü ve bu sözleşmeyi kabul ettiğini beyan eder.',
        ],
      },
    ],
  },
};

export function getLegalDocument(documentKey) {
  return legalDocuments[documentKey] || null;
}