import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const pages = {
  '/kampanya-bildirimleri': {
    title: 'Kampanya Bildirimleri Bilgilendirmesi',
    intro: 'Şükran App müşteri hesabındaki isteğe bağlı kampanya bildirimi tercihi.',
    sections: [
      [
        'Hangi bildirimler bu tercihe bağlı?',
        'Bu tercih, kampanyalar, indirimler ve özel fırsatlar hakkında e-posta veya SMS ile bilgilendirilmek isteyen müşteriler içindir.',
      ],
      [
        'Tercih nasıl verilir?',
        'Üyelik formundaki kampanya bildirimi kutusu isteğe bağlıdır. Kutuyu boş bırakarak da üyelik oluşturabilirsiniz.',
      ],
      [
        'Tercihimi nasıl değiştiririm?',
        'Bildirim tercihinizi değiştirmek için kullanılacak kanal, kampanya gönderimi devreye alındığında burada ve ilgili iletide gösterilecektir.',
      ],
    ],
  },

  '/kvkk': {
    title: 'KVKK Aydınlatma Metni',
    intro: 'Şükran App kullanımı sırasında kişisel verilerin işlenmesine ilişkin bilgilendirme.',
    sections: [
      [
        'Veri sorumlusu',
        'Veri sorumlusu [tam ticari unvan], adresi [resmî adres], başvuru kanalı [KVKK başvuru kanalı]. Restoranın kendi yürüttüğü sipariş ve müşteri işlemlerindeki rolü, ilgili işletmenin bilgilendirmesinde açıklanır.',
      ],
      [
        'İşlenen veriler ve elde edilme yöntemi',
        'Üyelik, sipariş, yorum veya destek ekranlarını kullandığınızda ad, soyad, e-posta, telefon, ilgili işlem için gerekli adres, sipariş ve talep bilgileri elektronik formlar üzerinden alınabilir. Teknik işlem kayıtları uygulama kullanımı sırasında oluşabilir.',
      ],
      [
        'İşleme amaçları ve hukuki sebepler',
        'Veriler hesap yönetimi, masa oturumu, siparişin yürütülmesi, destek talepleri ve gerektiğinde ödeme işlemleri için kullanılabilir. Bu amaçlara karşılık gelen hukuki sebepler [doğrulanmış amaç ve hukuki sebep eşleştirmesi] alanında açıklanacaktır.',
      ],
      [
        'Aktarım ve başvuru',
        'Aktarım yapılan alıcı grupları ve amaçları [restoran, ödeme ve teknik hizmet sağlayıcıları için doğrulanmış liste ve aktarım amaçları] alanında belirtilecektir. Kişisel verilerinize ilişkin başvurunuzu [başvuru kanalı] üzerinden iletebilirsiniz.',
      ],
    ],
  },

  '/gizlilik-politikasi': {
    title: 'Gizlilik Politikası',
    intro: 'Hesap, QR menü, sipariş ve destek özelliklerinde kullanılan bilgiler.',
    sections: [
      [
        'Hesap ve masa oturumu',
        'Hesap bilgileriniz üyelik işlemlerinde kullanılır. QR bağlantısı menüyü ilgili işletme ve masa ile eşleştirir. Sepet ve oturum bilgilerinin cihazda tutulma biçimi, kullanılan uygulama sürümüne göre açıklanır.',
      ],
      [
        'Sipariş, ödeme ve destek',
        'Sipariş içeriği, seçilen ekstralar ve müşteri notları siparişin işlenmesi için kullanılabilir. Ödeme sağlayıcısı devrede olduğunda ödeme akışında hangi bilgilerin paylaşıldığı [sağlayıcı ve veri kapsamı] bölümünde belirtilir. Destek taleplerinde paylaştığınız bilgiler talebin incelenmesi için kullanılır.',
      ],
      [
        'Tarayıcı verileri ve saklama',
        'Oturum veya sepet işlevleri için kullanılan tarayıcı depolama yöntemleri [çerez ve yerel depolama envanteri] bölümünde, kişisel verilerin saklama süreleri [saklama süreleri] bölümünde açıklanacaktır.',
      ],
      [
        'Kampanya tercihleri',
        'Üyelik ekranındaki kampanya tercihi ayrı bir seçimdir. Ticari ileti tercihlerinin nasıl yönetileceği [tercih ve ret kanalı] üzerinden açıklanacaktır.',
      ],
    ],
  },

  '/kullanim-kosullari': {
    title: 'Kullanım Koşulları',
    intro: 'Şükran App’in QR menü, müşteri hesabı ve işletme paneli kullanımına ilişkin koşullar.',
    sections: [
      [
        'QR menü ve masa seçimi',
        'Sipariş vermeden önce ekrandaki işletme adını ve masa numarasını kontrol edin. Menüdeki ürün içerikleri, ekstralar, fiyatlar ve stok bilgileri ilgili işletmenin kayıtlarından gösterilir.',
      ],
      [
        'Hesap ve işletme paneli',
        'Hesap bilgilerinizi güncel tutun. İşletme paneline erişimi olan kullanıcılar kendi yetkileri kapsamındaki menü, masa, sipariş ve personel işlemlerini yürütür. Giriş bilgilerini yalnızca yetkili kullanıcılar kullanmalıdır.',
      ],
      [
        'Sipariş ve alerjen bilgileri',
        'Onaylamadan önce ürün adetlerini, ekstraları ve toplam tutarı kontrol edin. Alerjiniz veya özel beslenme gereksiniminiz varsa siparişten önce ilgili işletmeden içerik bilgisi alın.',
      ],
      [
        'İletişim ve destek',
        'Teknik sorunları Şükran App iletişim kanalından, ürün hazırlama ve servisle ilgili talepleri siparişin verildiği işletmeye veya sipariş ekranında gösterilen destek kanalına iletebilirsiniz.',
      ],
    ],
  },

  '/mesafeli-satis-sozlesmesi': {
    title: 'Mesafeli Satış Sözleşmesi',
    intro: 'QR menü üzerinden verilebilen restoran siparişleri için örnek sözleşme metni.',
    sections: [
      [
        'Taraflar',
        'Satıcı veya sağlayıcı [siparişi karşılayan işletmenin ticari unvanı, adresi ve iletişim bilgileri]. Alıcı, sipariş sırasında bilgilerini ileten müşteridir. Şükran App’in işlemdeki rolü [doğrulanmış platform rolü] alanında belirtilir.',
      ],
      [
        'Siparişin konusu ve bedeli',
        'Siparişin içeriği; seçilen ürünler, adetler, fiyatlı ekstralar, varsa ücretler ve ödenecek toplam tutardan oluşur. Siparişe özel tutar ve ödeme yöntemi, sipariş onayından önce müşteriye gösterilir.',
      ],
      [
        'Hazırlama ve servis',
        'Masaya servis edilen siparişte işletme ve masa bilgileri sipariş ekranında gösterilir. Hazırlama, servis veya teslim koşulları ilgili sipariş için ayrıca belirtilir.',
      ],
      [
        'İptal, iade ve uyuşmazlıklar',
        'İptal ve iade başvurusu için sipariş numarası ile ilgili işletmeye veya gösterilen destek kanalına ulaşın. Siparişe uygulanacak koşullar ürün veya hizmet türüne, işlemin durumuna ve geçerli tüketici hükümlerine göre belirlenir.',
      ],
    ],
  },

  '/iptal-ve-iade-politikasi': {
    title: 'İptal ve İade Politikası',
    intro: 'QR menü üzerinden oluşturulan restoran siparişlerine ilişkin iptal ve iade talepleri.',
    sections: [
      [
        'Talep nasıl oluşturulur?',
        'QR menüdeki Destek Talebi ekranından veya siparişin verildiği işletmenin iletişim kanalından başvurun. Sipariş numarası, işletme adı, masa numarası ve talebinizin nedenini belirtin.',
      ],
      [
        'Sipariş iptali',
        'Siparişinizi iptal etmek istiyorsanız ilgili işletmeye mümkün olan en kısa sürede ulaşın. İşletme, siparişin hazırlama ve servis durumunu kontrol ederek talebi değerlendirir ve sonucu size bildirir.',
      ],
      [
        'Eksik, yanlış veya sorunlu ürün',
        'Teslim edilen ürün siparişinizden farklıysa, eksikse veya ürünle ilgili sorun varsa hangi ürünün etkilendiğini belirtin. Talep değerlendirilirken sipariş kaydı ve ilgili tüketici hakları dikkate alınır.',
      ],
      [
        'Ödeme iadesi',
        'İade onaylandığında iade tutarı ve işlemin durumu ilgili ödeme kaydı üzerinden takip edilir. Ödemenin hesabınıza yansıma süresi, kullanılan ödeme yöntemi ve finans kuruluşuna göre değişebilir.',
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
          <p className="rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] px-4 py-3 text-sm text-[#59635D]">
            Taslak metin. Yayınlanmadan önce şirket bilgileriyle tamamlanıp hukuki kontrolden geçirilmelidir.
          </p>

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