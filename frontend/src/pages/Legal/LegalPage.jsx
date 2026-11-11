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
    title: "KVKK Aydınlatma Metni",
    intro: "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) 10. madde kapsamında Şükran App kullanımı sırasında işlenen kişisel veriler hakkında bilgilendirme.",
    sections: [
      [
        "Veri sorumlusu",
        "Veri sorumlusu [tam ticari unvan / ad soyad], adresi [resmî adres], e-posta [KVKK başvuru e-postası]. QR menü ile verilen siparişlerde siparişi hazırlayan restoran, kendi müşteri ilişkisi bakımından ayrıca veri sorumlusudur.",
      ],
      [
        "QR menüden sipariş veren müşteriler",
        "Sipariş içeriği ve isteğe bağlı olarak siparişi verenin adı; kartla ödemede ad soyad, e-posta, telefon ve adres; yorum yazarsanız yorumunuz ve görünen adınız. Kartla ödemede iletişim bilgileri yalnızca ödeme kuruluşu PayTR'ye iletilir, Şükran App'te saklanmaz.",
      ],
      [
        "Kart bilgileri",
        "Kart numarası, son kullanma tarihi, güvenlik kodu (CVV) ve kart sahibi adı PayTR'nin güvenli ödeme sayfasında girilir. Şükran App bu bilgileri görmez, işlemez ve saklamaz.",
      ],
      [
        "Üye müşteriler, işletme sahipleri ve personel",
        "Ad soyad, e-posta, telefon, adres ve şifrenin geri döndürülemez özeti (şifrenin kendisi saklanmaz); isteğe bağlı kampanya bildirimi tercihi. İşletme sahiplerinden ayrıca fatura için T.C. kimlik numarası (veritabanında şifreli tutulur) ve varsa MERSİS numarası; restorana ödeme aktarımı için IBAN ve hesap sahibi adı.",
      ],
      [
        "İade talepleri, doğrulama ve teknik kayıtlar",
        "İade talebinde IBAN ve hesap sahibi adı; kayıt sırasında telefon numarası veya e-posta adresi ile tek kullanımlık doğrulama kodunun özeti; güvenlik ve kötüye kullanımı önleme amacıyla oturum kayıtları ve işlem kayıtları. Kartla ödemede IP adresiniz dolandırıcılık kontrolü için PayTR'ye iletilir.",
      ],
      [
        "İşleme amaçları ve hukuki sebepler",
        "Hesabın açılması ve yönetimi, siparişin alınıp hazırlanması, ödemenin alınması ve restorana aktarılması, iade ve destek taleplerinin yürütülmesi: sözleşmenin kurulması ve ifası (KVKK m.5/2-c). Fatura düzenlenmesi ve kayıtların saklanması: hukuki yükümlülük (m.5/2-ç). Hesap ve ödeme güvenliği, kötüye kullanımın önlenmesi: meşru menfaat (m.5/2-f). Kampanya ve tanıtım iletileri: yalnızca açık rızanız ile (m.5/1).",
      ],
      [
        "Kimlere aktarılır",
        "Siparişi hazırlayan restoran; ödeme kuruluşu PayTR Ödeme ve Elektronik Para Kuruluşu A.Ş.; e-posta gönderim hizmeti Brevo (sunucuları Avrupa Birliği'nde); doğrulama mesajları için WhatsApp (Meta); barındırma hizmeti [barındırma sağlayıcısı ve ülkesi]; talep hâlinde yetkili kamu kurum ve kuruluşları. Yurt dışına aktarım KVKK m.9 kapsamında [standart sözleşme / açık rıza] ile yapılır.",
      ],
      [
        "Saklama süreleri",
        "Doğrulama kayıtları 30 gün; süresi dolan oturum kayıtları 30 gün; iade talebindeki IBAN ve hesap sahibi adı talep kapandıktan 90 gün sonra silinir. Fatura, ödeme ve sipariş kayıtları Vergi Usul Kanunu gereği yasal süre boyunca saklanır. Hesabınızı sildiğinizde ad, e-posta, telefon ve adresiniz hemen silinir.",
      ],
      [
        "Haklarınız",
        "KVKK m.11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı üçüncü kişileri öğrenme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz. Hesabınızı \"Hesabım\" sayfasından kendiniz silebilir, diğer talepleriniz için [KVKK başvuru e-postası] adresine yazabilirsiniz.",
      ],
    ],
  },

  '/gizlilik-politikasi': {
    title: "Gizlilik Politikası",
    intro: "Şükran App'te hangi bilgilerin neden tutulduğu ve nasıl korunduğu.",
    sections: [
      [
        "Hesap ve masa oturumu",
        "Hesap bilgileriniz giriş ve hesap yönetimi için kullanılır. QR bağlantısı menüyü ilgili restoran ve masa ile eşleştirir; masa oturumu restoran masayı kapattığında sona erer.",
      ],
      [
        "Ödeme",
        "Kartla ödeme PayTR üzerinden alınır. Kart bilgileri PayTR'nin sayfasında girilir; Şükran App kart bilgilerini görmez ve saklamaz. Ödeme için zorunlu olan ad, e-posta, telefon ve adres yalnızca PayTR'ye iletilir.",
      ],
      [
        "Güvenlik",
        "Şifreler geri döndürülemez biçimde, T.C. kimlik numaraları şifreli saklanır. Tüm bağlantılar HTTPS ile şifrelidir. Personel yalnızca kendi restoranının, müşteri yalnızca kendi masasının bilgilerine erişebilir.",
      ],
      [
        "Tarayıcıda tutulan bilgiler",
        "Oturumunuzu açık tutmak için oturum anahtarı ve QR masa oturumu tarayıcınızın yerel depolamasında tutulur. Reklam veya takip amaçlı çerez kullanılmaz.",
      ],
      [
        "Saklama ve silme",
        "Amacı biten veriler otomatik olarak silinir (ayrıntılar KVKK Aydınlatma Metni'nde). Hesabınızı \"Hesabım\" sayfasından silebilirsiniz.",
      ],
      [
        "Kampanya tercihleri",
        "Üyelik ekranındaki kampanya bildirimi tercihi isteğe bağlıdır; vermeseniz de hizmetten yararlanırsınız. Ticari ileti gönderimi başladığında tercihinizi her iletideki bağlantıdan veya hesabınızdan değiştirebilirsiniz.",
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