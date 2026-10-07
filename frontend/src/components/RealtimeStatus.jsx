/**
 * Canlı bağlantı durumu göstergesi.
 *
 * Mutfak ekranı gün boyu açık kalır. Bağlantı sessizce koparsa personel bayat
 * bir listeye bakıp "sipariş yok" sanır — bu yüzden durum görünür olmalı.
 */
export default function RealtimeStatus({ status, className = '' }) {
  const görünüm = {
    connected: {
      renk: 'bg-green-500',
      metin: 'Canlı',
      başlık: 'Yeni siparişler anında görünür.',
      solgun: false,
    },
    reconnecting: {
      renk: 'bg-amber-500',
      metin: 'Yeniden bağlanılıyor',
      başlık: 'Bağlantı koptu, yeniden deneniyor. Bu sürede yeni siparişler görünmeyebilir.',
      solgun: false,
    },
    disconnected: {
      renk: 'bg-red-500',
      metin: 'Bağlantı yok',
      başlık: 'Canlı güncelleme kapalı. Listeyi görmek için sayfayı yenileyin.',
      solgun: true,
    },
  }[status] ?? null;

  if (!görünüm) return null;

  return (
    <span
      className={`inline-flex items-center gap-2 text-label-sm text-on-surface-variant ${className}`}
      title={görünüm.başlık}
      role="status"
      aria-live="polite"
    >
      <span
        className={`w-2 h-2 rounded-full ${görünüm.renk} ${görünüm.solgun ? '' : 'animate-pulse'}`}
        aria-hidden="true"
      />
      {görünüm.metin}
    </span>
  );
}
