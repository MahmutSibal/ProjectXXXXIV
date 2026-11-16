import { ApiError } from '../../api/client.js';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Giriş hatasını kullanıcıya her durumda anlaşılır Türkçe bir cümle olarak verir. */
export function loginErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'E-posta veya şifre hatalı.';
    if (error.status === 429) return 'Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.';
    if (error.status === 403) return error.message || 'Bu hesapla giriş yapılamıyor. Lütfen işletme yöneticinize başvurun.';
    if (error.status >= 500) return 'Sunucuda geçici bir sorun var. Lütfen biraz sonra tekrar deneyin.';
    // Sunucunun Türkçe mesajı (ör. bekleme süresi) olduğu gibi gösterilir; teknik İngilizce
    // doğrulama mesajları yerine sade bir cümle.
    if (error.message && !/^(Validation failed|Request failed|İstek başarısız)/i.test(error.message) && /[çğıöşüÇĞİÖŞÜ]/.test(error.message)) {
      return error.message;
    }
    return 'E-posta veya şifre hatalı.';
  }
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return 'Sunucu zamanında yanıt vermedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }
  if (error?.name === 'ServerUnreachableError' || error instanceof TypeError) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }
  return 'Giriş yapılamadı. Lütfen tekrar deneyin.';
}
