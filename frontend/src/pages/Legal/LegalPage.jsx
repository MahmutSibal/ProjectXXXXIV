import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const company = {
  name: 'Şükran App',
  service: 'Sukran App',
  address: 'Eyüp Nebi Mahallesi, 3563. Sokak No: 33/1 Eyyübiye / Şanlıurfa',
};

const companyInformation =
  `Hizmet sağlayıcı ${company.name}. ` +
  `Adres ${company.address}.`;

const pages = {
  '/kvkk': {
    title: 'KVKK Aydınlatma Metni',
    intro:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizin işlenmesine ilişkin bilgilendirme.',
    sections: [
      [
        'Veri sorumlusunun kimliği',
        `${companyInformation} Bu metin, Sukran App hizmeti kapsamında Şükran App tarafından yürütülen kişisel veri işleme faaliyetlerini kapsar. Restoranların kendi faaliyetleri kapsamında yürüttükleri işlemler için ilgili işletmenin aydınlatması ayrıca geçerlidir.`,
      ],
      [
        'İşlenen kişisel veriler ve toplama yöntemi',
        'Kullandığınız özelliklere bağlı olarak ad, soyad, e-posta, telefon, adres, hesap bilgileri, işletme ve masa bilgileri, sipariş içeriği, seçilen ekstralar, müşteri notları, işlem durumu, yorum ve destek talepleri işlenebilir. Veriler üyelik, sipariş, iletişim ve destek formları üzerinden elektronik ortamda ve uygulama kullanımı sırasında oluşan işlem kayıtları yoluyla elde edilir.',
      ],
      [
        'İşleme amaçları ve hukuki sebepler',
        'Hesabın oluşturulması, hizmete erişim, siparişin yürütülmesi ve sözleşmeye ilişkin destek işlemleri, bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması şartıyla Kanun’un 5/2-c maddesine dayanır. Mevzuatın gerektirdiği kayıt ve bildirimler 5/2-a ve 5/2-ç, uyuşmazlık kayıtları bir hakkın tesisi, kullanılması veya korunması amacıyla 5/2-e kapsamında işlenebilir. Hizmet güvenliği ve kötüye kullanımın önlenmesi için gerekli kayıtlar, temel hak ve özgürlüklerinize zarar vermemek şartıyla 5/2-f kapsamında değerlendirilebilir. Açık rızaya dayanan işlemler için rıza ayrıca alınır.',
      ],
      [
        'Kişisel verilerin aktarılması',
        'Sipariş ve masa bilgileri, siparişi hazırlayan işletmeyle siparişin yerine getirilmesi amacıyla paylaşılabilir. Ödeme özelliğinin kullanıldığı işlemlerde gerekli bilgiler, tahsilat ve iade süreçleri için ilgili ödeme hizmeti sağlayıcısına iletilebilir. Teknik hizmet sağlayıcılarına erişim, hizmetin yürütülmesi için gereken kapsamla sınırlandırılır. Kanunen yetkili kurumlara, hukuki yükümlülüklerin gerektirdiği bilgiler aktarılabilir. Yurt dışına aktarım söz konusu olduğunda Kanun’un 9. maddesindeki şartlar gözetilir.',
      ],
      [
        'KİŞİSEL VERİLERİNİZİN GÜVENLİĞİ',
        'Kişisel verilerinizin korunmasında, ilgili gizlilik ve veri güvenliği mevzuatıyla uyumlu teknik ve idari tedbirler esas alınır. Teknolojinin durumu, uygulama maliyetleri, verilerin niteliği ve işleme riskleri dikkate alınarak imha, kayıp, değişiklik, izinsiz açıklama veya izinsiz erişim risklerine karşı uygun önlemler belirlenir. Kişisel verilere erişim, görevi gereği erişmesi gereken yetkili kişilerle sınırlandırılır. Veriler, saklamayı gerektiren işleme şartlarının ve yasal saklama yükümlülüklerinin sona ermesi üzerine silinir, yok edilir veya anonim hâle getirilir.',
      ],
      [
        'Saklama süresi',
        'Kişisel veriler, ilgili hizmetin yürütülmesi için gerekli süre ve uygulanabilir mevzuatın öngördüğü saklama süreleri boyunca tutulur. Hesap kapatma talebi, kanunen saklanması gereken kayıtların derhâl silinmesi sonucunu doğurmayabilir.',
      ],
      [
        'Haklarınız ve başvuru',
        `Kanun’un 11. maddesi kapsamında verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, işleme amacını ve amaca uygun kullanımı öğrenme, aktarılan kişileri bilme, eksik veya yanlış verilerin düzeltilmesini, şartları oluştuğunda silinmesini veya yok edilmesini isteme haklarına sahipsiniz. Ayrıca bu işlemlerin üçüncü kişilere bildirilmesini isteyebilir, yalnızca otomatik analiz sonucu aleyhinize çıkan sonuca itiraz edebilir ve hukuka aykırı işleme nedeniyle zararınızın giderilmesini talep edebilirsiniz. Başvurunuzu kimliğinizi ve talebinizi belirten bir dilekçeyle ${company.service} adına ${company.address} adresine iletebilirsiniz. Başvurular mevzuatta belirtilen usul ve süreler içinde değerlendirilir.`,
      ],
    ],
  },

  '/gizlilik-politikasi': {
    title: 'Gizlilik Politikası',
    intro:
      'Sukran App kullanımında hesap, sipariş ve iletişim bilgilerinin gizliliğine ilişkin açıklamalar.',
    sections: [
      ['Hizmet sağlayıcı', companyInformation],
      [
        'Hesap ve oturum bilgileri',
        'Üyelik bilgileri hesap işlemleri ve hizmete erişim için kullanılır. QR bağlantısındaki işletme ve masa bilgileri, menünün ve müşteri işlemlerinin ilgili masayla eşleştirilmesini sağlar. Giriş bilgilerinizi başkalarıyla paylaşmamanız ve ortak cihazlardan çıkış yapmanız önerilir.',
      ],
      [
        'Sipariş, yorum ve destek bilgileri',
        'Sipariş içeriği, adetler, ekstralar ve notlar siparişin yürütülmesi için kullanılır. Yorumlar, değerlendirmeler ve destek açıklamaları ilgili işlemlerin incelenmesi amacıyla işlenir. Serbest metin alanlarına işlem için gerekli olmayan hassas bilgileri yazmayın.',
      ],
      [
        'Ödeme bilgileri',
        'Ödeme özelliğinin sunulduğu işlemlerde gerekli bilgiler ilgili ödeme hizmeti sağlayıcısının altyapısı üzerinden işlenebilir. Ödeme ve iade durumu sipariş veya işlem kaydıyla ilişkilendirilebilir. Kart şifresi, tek kullanımlık doğrulama kodu ve benzeri bilgiler destek formlarında paylaşılmamalıdır.',
      ],
      [
        'Tarayıcıda tutulan bilgiler',
        'Oturum, sepet ve kullanıcı tercihleri gibi işlevler için tarayıcı depolama yöntemleri kullanılabilir. Tarayıcı verilerinin silinmesi, kaydedilmiş sepet veya tercihlerin kaybolmasına neden olabilir.',
      ],
      [
        'Kampanya tercihi ve başvuru',
        `Kampanya bildirimi tercihi üyelikten ayrı ve isteğe bağlıdır. Gizlilik ve kişisel veri taleplerinizi ${company.name} adına ${company.address} adresine iletebilirsiniz. Kişisel verilerin işlenmesine ilişkin ayrıntılar KVKK Aydınlatma Metni’nde açıklanır.`,
      ],
    ],
  },

  '/kullanim-kosullari': {
    title: 'Kullanım Koşulları',
    intro:
      'Sukran App’in QR menü, müşteri hesabı ve işletme paneli kullanımına ilişkin koşullar.',
    sections: [
      ['Hizmet sağlayıcı', companyInformation],
      [
        'Hizmetin kapsamı',
        'Sukran App; işletmelerin dijital menü, masa, ürün ve sipariş süreçlerini yönetmelerine, müşterilerin ise sunulan özellikler kapsamında menüyü incelemelerine ve işlem yapmalarına olanak sağlar. Kullanılabilir özellikler işletmenin hizmet kapsamına göre değişebilir.',
      ],
      [
        'Hesap ve yetkiler',
        'Kullanıcılar hesap bilgilerini doğru ve güncel tutmalıdır. İşletme panelindeki işlemler, kullanıcıya tanımlanan yetkiler kapsamında yürütülür. Başkasının hesabına izinsiz erişim, hizmeti aksatma veya gerçeğe aykırı işlem oluşturma amacıyla kullanım yapılamaz.',
      ],
      [
        'Menü ve sipariş',
        'Müşteri, siparişten önce işletme ve masa bilgisini, ürün içeriğini, adetleri, ekstra ücretlerini ve toplam tutarı kontrol etmelidir. Ürün hazırlama ve servis süreçleri ilgili işletme tarafından yürütülür. Alerjen ve özel beslenme ihtiyaçları için sipariş öncesinde işletmeden bilgi alınmalıdır.',
      ],
      [
        'Ödeme, iptal ve iade',
        'Ödeme seçeneği sunulan işlemlerde, ödeme yöntemi ve toplam tutar onaydan önce gösterilir. İptal veya iade talebi sipariş numarasıyla ilgili işletmeye ya da uygulamada gösterilen destek kanalına iletilebilir. Ayrıntılar İptal ve İade Politikası’nda açıklanır.',
      ],
      [
        'Hizmet sürekliliği ve haklar',
        'Bakım, bağlantı veya teknik arızalar erişimi geçici olarak etkileyebilir. Kullanıcıların mevzuattan doğan hakları saklıdır. Koşullardaki değişiklikler yayımlandıkları tarihten sonraki kullanım için uygulanır ve geçmiş işlemlere ilişkin kazanılmış hakları ortadan kaldırmaz.',
      ],
    ],
  },

  '/mesafeli-satis-sozlesmesi': {
    title: 'Mesafeli Satış Sözleşmesi',
    intro:
      'Sukran App üzerinden gerçekleştirilen işlemlerde taraflar, sipariş ve ödeme koşulları.',
    sections: [
      ['Platform hizmet sağlayıcısı', companyInformation],
      [
        'Satıcı ve alıcı',
        'QR menü üzerinden verilen yiyecek ve içecek siparişinde satıcı, siparişi karşılayan ilgili işletmedir. İşletmenin unvanı, adresi ve iletişim bilgileri işlem öncesinde müşteriye sunulmalıdır. Alıcı, siparişi oluşturan kişidir. Sukran App yazılım hizmetinin doğrudan satıldığı işlemlerde sağlayıcı Şükran App’tir.',
      ],
      [
        'Sözleşmenin konusu ve sipariş özeti',
        'İşlemin konusu, müşteri tarafından seçilen ürün veya hizmetlerdir. Ürün veya hizmetin temel özellikleri, miktarı, seçilen ekstralar, vergiler dâhil toplam bedel ve varsa diğer ücretler işlem onayından önce gösterilir. Yazılım hizmetlerinde seçilen paket ve kullanım dönemi sipariş özetinde belirtilir.',
      ],
      [
        'Ödeme ve ifa',
        'Ödeme, işlem ekranında sunulan yöntemle gerçekleştirilir. Tahsilat sonucu ilgili işlem kaydıyla ilişkilendirilir. Restoran siparişlerinde hazırlama ve servis ilgili işletme tarafından yürütülür. Yazılım hizmetlerinde erişim kapsamı ve başlangıcı seçilen hizmet koşullarına göre belirlenir.',
      ],
      [
        'Cayma hakkı ve ürünün niteliği',
        'Cayma hakkı ve istisnaları, işlemin niteliği ve uygulanabilir mevzuata göre belirlenir. Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler cayma hakkı istisnasına girebilir. Hizmetin cayma süresi dolmadan ifasına başlanması gereken durumlarda ilgili bilgilendirme ve onay süreçleri ayrıca yürütülür. Ayıplı, eksik veya yanlış ifaya ilişkin yasal haklar saklıdır.',
      ],
      [
        'Başvuru ve uyuşmazlıklar',
        'Siparişe ilişkin talepler sipariş numarasıyla satıcıya, platform hizmetiyle ilgili talepler Şükran App’e iletilebilir. Tüketiciler, uyuşmazlığın niteliği ve yürürlükteki başvuru şartlarına göre tüketici hakem heyetlerine veya tüketici mahkemelerine başvurabilir.',
      ],
    ],
  },

  '/iptal-ve-iade-politikasi': {
    title: 'İptal ve İade Politikası',
    intro:
      'Restoran siparişleri ve Sukran App hizmetlerine ilişkin iptal ve iade başvuruları.',
    sections: [
      ['Hizmet sağlayıcı', companyInformation],
      [
        'Talep oluşturma',
        `Siparişe ilişkin talebinizi uygulamadaki Destek ve İade ekranından veya ilgili işletmenin iletişim kanalından iletebilirsiniz. Sipariş numarasını, işletme ve masa bilgisini, etkilenen ürünü ve talebinizin nedenini belirtin. Sukran App hizmetine ilişkin yazılı başvurularınızı ${company.name} adına ${company.address} adresine gönderebilirsiniz.`,
      ],
      [
        'Restoran siparişinin iptali',
        'İptal talebinizi mümkün olan en kısa sürede işletmeye iletin. Talep, ürünün niteliği, hazırlama ve servis durumu ile uygulanabilir mevzuat dikkate alınarak değerlendirilir. Başvurunun sonucu ilgili işletme veya destek kanalı üzerinden bildirilir.',
      ],
      [
        'Eksik, yanlış veya ayıplı ürün',
        'Siparişin eksik, yanlış veya ayıplı olması durumunda etkilenen ürünü ve sorunu belirtin. İnceleme sonucunda uygulanacak çözüm, olayın koşulları ve müşterinin yasal hakları dikkate alınarak belirlenir.',
      ],
      [
        'Yazılım hizmeti ve paket işlemleri',
        'Paket iptali ve ücret iadesi talepleri, satın alınan hizmetin dönemi, ifa durumu, işlem sırasında sunulan koşullar ve varsa uygulanabilir cayma hükümleri kapsamında değerlendirilir.',
      ],
      [
        'İadenin gerçekleştirilmesi',
        'Onaylanan iadeler, işlemde kullanılan ödeme yöntemine ve ilgili ödeme kuruluşunun süreçlerine uygun olarak yürütülür. İadenin hesaba yansıması finans kuruluşuna göre değişebilir. İade yöntemi tercihi, tek başına iadenin onaylandığı veya gerçekleştirildiği anlamına gelmez.',
      ],
    ],
  },

  '/kampanya-bildirimleri': {
    title: 'Kampanya Bildirimleri Bilgilendirmesi',
    intro: 'Sukran App hesabındaki isteğe bağlı kampanya e-postası tercihi.',
    sections: [
      ['Hizmet sağlayıcı', companyInformation],
      [
        'Bildirimlerin kapsamı',
        'Kampanya, indirim, yeni özellik ve özel fırsat duyuruları, yalnızca bu tercihi açıkça verdiğiniz durumda e-posta ile gönderilir. Bu tercih isteğe bağlıdır; vermemeniz hizmetten yararlanmanızı etkilemez.',
      ],
      [
        'Açık rıza ve kayıt',
        'Tercih, kayıt formundaki ayrı onay kutusuyla ya da Hesabım sayfasından verilir. Rızanın verildiği tarih, ispat amacıyla kaydedilir. İşlemsel e-postalar (doğrulama kodu, şifre sıfırlama, abonelik bildirimi) bu tercihe bağlı değildir.',
      ],
      [
        'Tercihten vazgeçme',
        'Her kampanya e-postasının altında gönderici bilgileri ve tek tıkla çıkış bağlantısı bulunur. Tercihinizi istediğiniz zaman Hesabım sayfasından da kapatabilirsiniz; kapattığınızda yeni kampanya e-postası gönderilmez.',
      ],
    ],
  },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const page = pages[pathname.replace(/\/$/, '')];

  useEffect(() => {
    if (!page) return;

    const previousTitle = document.title;
    document.title = `${page.title} | Şükran App`;
    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      document.title = previousTitle;
    };
  }, [page]);

  if (!page) return null;

  return (
    <div className="bg-[#F8F9FA] px-4 py-8 sm:py-14">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#DFE4E0] bg-white shadow-sm">
        <header className="bg-[#002819] px-5 py-7 text-white sm:px-9">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FED65B]">
            Şükran App · Hukuki Bilgiler
          </p>
          <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
            {page.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#C5DFCE]">
            {page.intro}
          </p>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-9 sm:py-8">
          <div className="rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] p-4 text-sm leading-7 text-[#404943]">
  <p className="font-bold text-[#002819]">{company.name}</p>
  <address className="not-italic">{company.address}</address>
</div>

          {page.sections.map(([heading, content]) => (
            <section key={heading}>
              <h2 className="border-l-4 border-[#FED65B] pl-3 text-lg font-bold text-[#002819]">
                {heading}
              </h2>
              <p className="mt-2 break-words text-sm leading-7 text-[#404943]">
                {content}
              </p>
            </section>
          ))}

          <nav aria-label="İlgili bağlantılar" className="flex flex-wrap gap-2 border-t border-[#DFE4E0] pt-5">
            <Link to="/" className="public-button public-button--primary">
              Ana Sayfaya Dön
            </Link>
            <Link to="/iletisim" className="public-button public-button--outline">
              İletişim
            </Link>
            {pathname === '/mesafeli-satis-sozlesmesi' && (
              <Link to="/iptal-ve-iade-politikasi" className="public-button public-button--outline">
                İptal ve İade Politikası
              </Link>
            )}
          </nav>
        </div>
      </article>
    </div>
  );
}