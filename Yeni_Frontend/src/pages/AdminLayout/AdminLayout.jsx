import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './AdminLayout.css';

const menuItems = [
  ['category', 'Kategoriler', '/admin/categories'],
  ['inventory_2', 'Ürünler', '/admin/products'],
  ['notifications_active', 'Aktif Siparişler', '/admin/orders/active'],
  ['point_of_sale', 'Adisyonlar', '/admin/bills'],
  ['table_restaurant', 'Masalar', '/admin/tables'],
  ['badge', 'Personeller', '/admin/staff'],
  ['history', 'Sipariş Geçmişi', '/admin/order-history'],
  ['assessment', 'Günlük Raporlar', '/admin/daily-reports'],
  ['receipt_long', 'İşlem Geçmişi', '/admin/transactions'],
  ['request_quote', 'Fatura Bilgileri', '/admin/billing'],
  ['card_membership', 'Aboneliğim', '/admin/subscription'],
  ['credit_card', 'Ödeme Ayarları', '/admin/payment-settings'],
  ['store', 'İşletme Profili', '/admin/business-profile'],
  ['dashboard_customize', 'Etkinlik Tahtası', '/admin/events'],
];

function SidebarMenu({ onNavigate }) {
  return (
    <>
      <Link
        to="/admin"
        onClick={onNavigate}
        className="w-full mb-md overflow-hidden flex-shrink-0 block"
      >
        <img
          src="/sukranapp.png"
          alt="Şükran App Logo"
          className="w-full h-auto object-cover block cursor-pointer"
        />
      </Link>

      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-sm px-md custom-sidebar-scroll">
        {menuItems.map(([icon, label, path]) => (
          <NavLink
            key={label}
            to={path}
            onClick={onNavigate}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-4 py-3 bg-primary-container text-on-primary-container rounded-lg border-l-4 border-secondary-container transition-transform scale-95 active:scale-90 font-label-md text-label-md'
                : 'flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors scale-95 active:scale-90 font-label-md text-label-md'
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {icon}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleProfile = () => {
    setIsProfileOpen((prev) => !prev);
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    navigate('/giris-yap', { replace: true });
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased overflow-x-hidden min-h-screen flex">
      <aside className="bg-surface border-r border-outline-variant shadow-sm fixed left-0 top-0 h-screen w-[280px] z-50 hidden lg:flex flex-col">
        <SidebarMenu />
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[998] lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={closeSidebar}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="absolute left-0 top-0 h-full w-[280px] bg-surface border-r border-outline-variant shadow-sm flex flex-col">
            <SidebarMenu onNavigate={closeSidebar} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:ml-[280px] w-full min-h-screen">
        <header className="bg-surface border-b border-outline-variant shadow-sm fixed top-0 right-0 w-full lg:w-[calc(100%-280px)] h-16 z-40 flex justify-between items-center px-4 md:px-gutter">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-10 h-10 rounded-full text-primary-container hover:bg-surface-container-low flex items-center justify-center transition-all"
              aria-label="Menüyü aç"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="relative w-full max-w-[320px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>

              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2 pl-10 pr-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all shadow-sm"
                placeholder="Ara..."
                type="text"
              />
            </div>
          </div>

          <div className="relative ml-3">
            <button
              type="button"
              onClick={toggleProfile}
              className="flex items-center gap-2 hover:bg-surface-container-low p-1 pr-3 rounded-full transition-all text-primary-container"
              aria-expanded={isProfileOpen}
              aria-label="Profil menüsünü aç"
            >
              <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center border border-outline-variant">
                <span className="material-symbols-outlined text-[18px]">
                  person
                </span>
              </div>

              <span className="font-label-md text-label-md text-on-surface-variant hidden sm:inline">
                Profil
              </span>

              <span className="material-symbols-outlined text-[18px] text-on-surface-variant hidden sm:inline">
                expand_more
              </span>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-56 bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden z-[999]">
                <Link
                  to="/admin/business-profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    manage_accounts
                  </span>
                  Hesabımı Yönet
                </Link>

                <Link
                  to="/admin/support"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    support_agent
                  </span>
                  Destek
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-surface-container-low transition-colors font-label-md text-label-md text-left"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    logout
                  </span>
                  Çıkış
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 md:px-gutter py-gutter pt-[calc(64px+24px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}