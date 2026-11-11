/**
 * "PayTR ile güvenli ödeme" rozeti. Kartla ödeme yapılan ekranlarda ve sitenin
 * alt bilgisinde gösterilir; kullanıcıya ödemenin lisanslı bir ödeme kuruluşu
 * üzerinden, 3D Secure ile alındığını anlatır.
 */
export default function PayTrBadge({ compact = false, dark = false }) {
  const color = dark ? '#e7d9a8' : '#06402b';
  const border = dark ? 'rgba(231, 217, 168, 0.35)' : 'rgba(6, 64, 43, 0.25)';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: compact ? '6px 10px' : '8px 14px',
        border: `1px solid ${border}`,
        borderRadius: 999,
        color,
        fontSize: compact ? 12 : 13,
        lineHeight: 1.2,
      }}
      title="Kart bilgileriniz PayTR'nin güvenli ödeme sayfasında, 3D Secure ile alınır."
    >
      <span className="material-symbols-outlined" style={{ fontSize: compact ? 16 : 18 }} aria-hidden="true">
        verified_user
      </span>
      <span>
        <strong>PayTR</strong> ile güvenli ödeme · 3D Secure
      </span>
    </div>
  );
}
