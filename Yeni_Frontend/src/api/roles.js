import { ROLES } from './auth.js';

/**
 * Rollerin kullanıcıya gösterilecek Türkçe adları.
 *
 * Arayüzde İngilizce teknik ad (SUPERADMIN, OWNER) görünmemeli. Etiketler
 * birden fazla sayfada kopyalanmıştı; tek kaynak burasıdır.
 */
export const ROLE_LABEL = {
  [ROLES.SuperAdmin]: 'Platform Yöneticisi',
  [ROLES.RestaurantOwner]: 'İşletme Sahibi',
  [ROLES.Customer]: 'Müşteri',
  [ROLES.Kitchen]: 'Mutfak',
  [ROLES.Waiter]: 'Garson',
};

/** Rozet/etiket gibi dar alanlar için kısa karşılıklar. */
export const ROLE_LABEL_SHORT = {
  [ROLES.SuperAdmin]: 'YÖNETİCİ',
  [ROLES.RestaurantOwner]: 'İŞLETME',
  [ROLES.Customer]: 'MÜŞTERİ',
  [ROLES.Kitchen]: 'MUTFAK',
  [ROLES.Waiter]: 'GARSON',
};

/** Filtre açılır listelerinde kullanılacak sıra. */
export const ROLE_FILTER_OPTIONS = [
  { value: String(ROLES.SuperAdmin), label: ROLE_LABEL[ROLES.SuperAdmin] },
  { value: String(ROLES.RestaurantOwner), label: ROLE_LABEL[ROLES.RestaurantOwner] },
  { value: String(ROLES.Customer), label: ROLE_LABEL[ROLES.Customer] },
  { value: String(ROLES.Kitchen), label: ROLE_LABEL[ROLES.Kitchen] },
  { value: String(ROLES.Waiter), label: ROLE_LABEL[ROLES.Waiter] },
];
