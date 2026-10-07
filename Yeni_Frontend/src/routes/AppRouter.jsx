import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute.jsx';
import PlatformStatusGate from '../components/PlatformStatusGate.jsx';
import SuperAdminSystemStatus from '../pages/SuperAdminSystemStatus/SuperAdminSystemStatus.jsx';
import { ROLES } from '../api/auth.js';

import OrderFeedback from '../pages/OrderFeedback/OrderFeedback.jsx';

import OrderSuccess from '../pages/OrderSuccess/OrderSuccess.jsx';

import QrMenuCart from '../pages/QrMenuCart/QrMenuCart.jsx';

/* Public sayfalar */

import {
  QrCartProvider,
} from '../context/QrCartContext.jsx';

import PublicLayout from '../layouts/PublicLayout/PublicLayout.jsx';
import Home from '../pages/Home/Home.jsx';
import Services from '../pages/Services/Services.jsx';
import About from '../pages/About/About.jsx';
import Contact from '../pages/Contact/Contact.jsx';
import PublicQrMenu from '../pages/PublicQrMenu/PublicQrMenu.jsx';
import OrderBill from '../pages/OrderBill/OrderBill.jsx';

/* Yasal metin sayfaları */

import LegalPage from '../pages/Legal/LegalPage.jsx';

/* Üyelik sayfaları */

import Login from '../pages/Login/Login.jsx';
import Register from '../pages/Register/Register.jsx';
import ForgotPassword from '../pages/ForgotPassword/ForgotPassword.jsx';

/* Admin sayfaları */

import AdminLayout from '../pages/AdminLayout/AdminLayout.jsx';
import AdminDashboard from '../pages/AdminDashboard/AdminDashboardDesign.jsx';
import AdminCategories from '../pages/AdminCategories/AdminCategories.jsx';
import ProductManagement from '../pages/ProductManagement/ProductManagement.jsx';
import AddProduct from '../pages/AddProduct/AddProduct.jsx';
import AdminActiveOrders from '../pages/AdminActiveOrders/AdminActiveOrders.jsx';
import AdminTables from '../pages/AdminTables/AdminTables.jsx';
import AdminPersonels from '../pages/AdminPersonels/AdminPersonels.jsx';
import AdminOrderHistory from '../pages/AdminOrderHistory/AdminOrderHistory.jsx';
import AdminDailyReports from '../pages/AdminDailyReports/AdminDailyReports.jsx';
import AdminTransactions from '../pages/AdminTransactions/AdminTransactions.jsx';
import AdminBilling from '../pages/AdminBilling/AdminBilling.jsx';
import AdminSubscription from '../pages/AdminSubscription/AdminSubscription.jsx';
import AdminPaymentSettings from '../pages/AdminPaymentSettings/AdminPaymentSettings.jsx';
import BusinessProfile from '../pages/BusinessProfile/BusinessProfile.jsx';
import AdminEvents from '../pages/AdminEvents/AdminEvents.jsx';
import SupportPage from '../pages/Support/SupportPage.jsx';
import StaffBills from '../pages/StaffBills/StaffBills.jsx';

/* Mutfak sayfaları */

import KitchenLayout from '../pages/KitchenLayout/KitchenLayout.jsx';
import KitchenPanel from '../pages/KitchenPanel/KitchenPanel.jsx';
import KitchenTables from '../pages/KitchenTables/KitchenTables.jsx';
import KitchenProducts from '../pages/KitchenProducts/KitchenProducts.jsx';
import KitchenOrderHistory from '../pages/KitchenOrderHistory/KitchenOrderHistory.jsx';

/* Süper Admin sayfaları */

import SuperAdminLayout from '../pages/SuperAdminLayout/SuperAdminLayout.jsx';
import SuperAdminRestaurant from '../pages/SuperAdminRestaurant/SuperAdminRestaurant.jsx';
import SuperAdminSupport from '../pages/SuperAdminSupport/SuperAdminSupport.jsx';
import SuperAdminRestaurantDetail from '../pages/SuperAdminRestaurantDetail/SuperAdminRestaurantDetail.jsx';
import SuperAdminComplaints from '../pages/SuperAdminComplaints/SuperAdminComplaints.jsx';
import SuperAdminUsers from '../pages/SuperAdminUsers/SuperAdminUsers.jsx';
import SuperAdminWhatsApp from '../pages/SuperAdminWhatsApp/SuperAdminWhatsApp.jsx';
import SuperAdminAuditLogs from '../pages/SuperAdminAuditLogs/SuperAdminAuditLogs.jsx';
import SuperAdminSubscriptions from '../pages/SuperAdminSubscriptions/SuperAdminSubscriptions.jsx';
import SuperAdminPaymentSettings from '../pages/SuperAdminPaymentSettings/SuperAdminPaymentSettings.jsx';

function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 20px',
        background: '#f8f9fa',
        color: '#191c1d',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
      }}
    >
      <div>
        <span
          style={{
            display: 'block',
            marginBottom: '12px',
            color: '#735c00',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          404
        </span>

        <h1
          style={{
            margin: '0 0 12px',
            color: '#002819',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'clamp(28px, 5vw, 40px)',
            lineHeight: 1.2,
          }}
        >
          Sayfa bulunamadı
        </h1>

        <p
          style={{
            margin: '0 0 24px',
            color: '#404943',
            lineHeight: 1.6,
          }}
        >
          Bu URL ile eşleşen bir sayfa bulunamadı.
        </p>

        <Link
          to="/"
          style={{
            minHeight: '46px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
            color: '#ffffff',
            background: '#06402b',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </main>
  );
}

export default function AppRouter() {
  return (
    <QrCartProvider>
    <BrowserRouter>
      <PlatformStatusGate>
      <Routes>
        {/* Navbar ve footer kullanılan public sayfalar */}

        <Route element={<PublicLayout />}>
          <Route
            index
            element={<Home />}
          />

          <Route
            path="hizmetler"
            element={<Services />}
          />

          <Route
            path="hakkimizda"
            element={<About />}
          />

          <Route
            path="iletisim"
            element={<Contact />}
          />
        </Route>

        {/* Yasal metin sayfaları */}

        <Route
          path="/kvkk"
          element={
            <LegalPage documentKey="kvkk" />
          }
        />

        <Route
          path="/kvkk-acik-riza-metni"
          element={
            <LegalPage documentKey="consent" />
          }
        />

        <Route
          path="/kullanici-sozlesmesi"
          element={
            <LegalPage documentKey="userAgreement" />
          }
        />

        <Route
          path="/gizlilik-politikasi"
          element={
            <LegalPage documentKey="privacy" />
          }
        />

        <Route
          path="/kullanim-kosullari"
          element={
            <LegalPage documentKey="terms" />
          }
        />

        <Route
          path="/mesafeli-satis-sozlesmesi"
          element={
            <LegalPage documentKey="distanceSales" />
          }
        />


        {/* Mobil QR menü — masa QR koduna gömülü adres şeması backend ile uyumlu olmalı */}

<Route
  path="/menu/:restaurantId/:tableNo"
  element={<PublicQrMenu />}
/>
<Route
  path="/menu/:restaurantId/:tableNo/cart"
  element={<QrMenuCart />}
/>
<Route
  path="/menu/:restaurantId/:tableNo/order-success/:orderId"
  element={<OrderSuccess />}
/>
<Route
  path="/menu/:restaurantId/:tableNo/feedback/:orderId"
  element={<OrderFeedback />}
/>
<Route
  path="/menu/:restaurantId/:tableNo/bill"
  element={<OrderBill />}
/>

        {/* Navbar ve footer kullanılmayan üyelik sayfaları */}

        <Route
          path="/giris-yap"
          element={<Login />}
        />

        <Route
          path="/kayit-ol"
          element={<Register />}
        />

        <Route
          path="/sifremi-unuttum"
          element={<ForgotPassword />}
        />

        {/* Admin route'ları */}

        <Route element={<ProtectedRoute roles={[ROLES.RestaurantOwner]} />}>
        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route
            index
            element={<AdminDashboard />}
          />

          <Route
            path="categories"
            element={<AdminCategories />}
          />

          <Route
            path="products"
            element={<ProductManagement />}
          />

          <Route
            path="products/add"
            element={<AddProduct />}
          />

          <Route
            path="products/edit/:productId"
            element={<AddProduct />}
          />

          <Route
            path="orders/active"
            element={<AdminActiveOrders />}
          />

          <Route
            path="tables"
            element={<AdminTables />}
          />

          <Route
            path="staff"
            element={<AdminPersonels />}
          />

          <Route
            path="order-history"
            element={<AdminOrderHistory />}
          />

          <Route
            path="daily-reports"
            element={<AdminDailyReports />}
          />

          <Route
            path="transactions"
            element={<AdminTransactions />}
          />

          <Route
            path="billing"
            element={<AdminBilling />}
          />

          <Route
            path="subscription"
            element={<AdminSubscription />}
          />

          <Route
            path="payment-settings"
            element={<AdminPaymentSettings />}
          />

          <Route
            path="business-profile"
            element={<BusinessProfile />}
          />

          <Route
            path="events"
            element={<AdminEvents />}
          />

          <Route
            path="bills"
            element={<StaffBills panelType="admin" />}
          />

          <Route
  path="support"
  element={
    <SupportPage panelType="admin" />
  }
/>
        </Route>
        </Route>

        {/* Mutfak route'ları */}

        <Route element={<ProtectedRoute roles={[ROLES.Kitchen, ROLES.Waiter]} />}>
        <Route
          path="/kitchen"
          element={<KitchenLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="orders/active"
                replace
              />
            }
          />

          <Route
            path="orders/active"
            element={<KitchenPanel />}
          />

          <Route
            path="tables"
            element={<KitchenTables />}
          />

          <Route
            path="products"
            element={<KitchenProducts />}
          />

          <Route
            path="order-history"
            element={<KitchenOrderHistory />}
          />

          <Route
            path="bills"
            element={<StaffBills panelType="kitchen" />}
          />

          <Route
  path="support"
  element={
    <SupportPage panelType="kitchen" />
  }
/>
        </Route>
        </Route>

        {/* Süper Admin route'ları */}

        <Route element={<ProtectedRoute roles={[ROLES.SuperAdmin]} />}>
        <Route
          path="/super-admin"
          element={<SuperAdminLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="restaurants"
                replace
              />
            }
          />

          <Route
            path="restaurants"
            element={<SuperAdminRestaurant />}
          />

          <Route
            path="restaurants/:restaurantId"
            element={
              <SuperAdminRestaurantDetail />
            }
          />

          <Route
            path="support"
            element={<SuperAdminSupport />}
          />

          <Route
            path="complaints"
            element={<SuperAdminComplaints />}
          />

          <Route
            path="users"
            element={<SuperAdminUsers />}
          />

          <Route
            path="whatsapp"
            element={<SuperAdminWhatsApp />}
          />

          <Route
            path="audit-logs"
            element={<SuperAdminAuditLogs />}
          />

          <Route
            path="subscriptions"
            element={<SuperAdminSubscriptions />}
          />

          <Route
            path="system-status"
            element={<SuperAdminSystemStatus />}
          />

          <Route
            path="payment-settings"
            element={<SuperAdminPaymentSettings />}
          />
        </Route>
        </Route>

        {/* Bulunamayan sayfalar */}

        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
      </PlatformStatusGate>
    </BrowserRouter>
    </QrCartProvider>
  );
}
