import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * Köşede beliren bildirimler.
 *
 * Neden: uygulama genelinde tarayıcının alert() penceresi kullanılıyordu.
 * alert() sayfayı kilitler, mobilde kötü görünür, üst üste gelen mesajları
 * sıraya sokar ve otomatik kapanmaz. Bu sağlayıcı hepsini tek bir yerde toplar.
 */

const ToastContext = createContext(null);

/** Aynı anda gösterilecek en fazla bildirim; fazlası en eskiyi düşürür. */
const MAX_VISIBLE = 4;

/**
 * Varsayılan görünme süreleri (ms).
 * Hata mesajları daha uzun kalır: kullanıcının okuyup ne yapacağına
 * karar vermesi gerekir, başarı bildirimi ise yalnızca teyittir.
 */
const DEFAULT_DURATION = {
  success: 3500,
  info: 4000,
  warning: 5500,
  error: 7000,
};

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message, type = 'info', options = {}) => {
      const text = typeof message === 'string' ? message.trim() : String(message ?? '');
      if (!text) return null;

      const id = ++nextId;
      const duration = options.duration ?? DEFAULT_DURATION[type] ?? DEFAULT_DURATION.info;

      setToasts((current) => {
        // Aynı mesaj arka arkaya gelirse (ör. bir döngüde birden çok hata)
        // tekrar tekrar yığmak yerine mevcut olanı yenile.
        const duplicate = current.find((toast) => toast.message === text && toast.type === type);
        if (duplicate) {
          return current;
        }

        const next = [...current, { id, message: text, type, title: options.title }];
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
      });

      if (duration > 0) {
        timersRef.current.set(id, setTimeout(() => dismiss(id), duration));
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      show,
      success: (message, options) => show(message, 'success', options),
      error: (message, options) => show(message, 'error', options),
      warning: (message, options) => show(message, 'warning', options),
      info: (message, options) => show(message, 'info', options),
    }),
    [toasts, dismiss, show],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast, ToastProvider içinde kullanılmalıdır.');
  }
  return context;
}
