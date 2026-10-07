import { api } from './client.js';

export const platformSettingsApi = {
  // Anonim: halka açık sitede ve restoran panelinde havale/EFT bilgilerini gösterir.
  // Süper Admin havale/EFT'yi kapattıysa alanlar boş, bankTransferEnabled false döner.
  getPayment: () => api.get('/platform-settings/payment', { auth: false }),
  // Yalnızca SuperAdmin: açma/kapama durumundan bağımsız kayıtlı değerler.
  getPaymentAdmin: () => api.get('/platform-settings/payment/admin'),
  // Yalnızca SuperAdmin.
  savePayment: (body) => api.put('/platform-settings/payment', body),

  // Anonim: ödeme altyapısı anahtarları { showIyzicoLogos, cardPaymentsEnabled }.
  getPaymentOptions: () => api.get('/platform-settings/payment-options', { auth: false }),
  // Yalnızca SuperAdmin.
  savePaymentOptions: (body) => api.put('/platform-settings/payment-options', body),

  // Anonim: bakım modu duyurusu { maintenanceEnabled, message, serverDisabled }.
  getStatus: () => api.get('/platform-settings/status', { auth: false }),
  // Yalnızca SuperAdmin.
  saveStatus: (body) => api.put('/platform-settings/status', body),
};
