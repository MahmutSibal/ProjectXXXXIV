import { useToast } from '../context/ToastContext.jsx';
import './ToastContainer.css';

const TOAST_META = {
  success: { icon: 'check_circle', label: 'Başarılı' },
  error: { icon: 'error', label: 'Hata' },
  warning: { icon: 'warning', label: 'Uyarı' },
  info: { icon: 'info', label: 'Bilgi' },
};

/**
 * Bildirimleri ekranın sağ altında gösterir.
 *
 * Erişilebilirlik: hatalar için role="alert" (ekran okuyucu hemen okur),
 * diğerleri için role="status" (kullanıcının işini bölmeden sıraya girer).
 */
export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="sukran-toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const meta = TOAST_META[toast.type] ?? TOAST_META.info;

        return (
          <div
            key={toast.id}
            className={`sukran-toast sukran-toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <span className="material-symbols-outlined sukran-toast__icon" aria-hidden="true">
              {meta.icon}
            </span>

            <div className="sukran-toast__body">
              <span className="sukran-toast__title">{toast.title ?? meta.label}</span>
              <span className="sukran-toast__message">{toast.message}</span>
            </div>

            <button
              type="button"
              className="sukran-toast__close"
              onClick={() => dismiss(toast.id)}
              aria-label="Bildirimi kapat"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
