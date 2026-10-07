import usePaymentOptions from '../hooks/usePaymentOptions.js';

const ALT = 'iyzico ile Öde, Mastercard, Visa, American Express ve Troy';

// iyzico "ile Öde" + kart markaları şeridi. Süper Admin kapattıysa hiçbir şey çizmez.
export default function IyzicoLogoBand({ variant = 'colored', width = 300, className }) {
  const { showIyzicoLogos } = usePaymentOptions();

  if (!showIyzicoLogos) return null;

  return (
    <img
      src={`/odeme/iyzico-band-${variant}.svg`}
      alt={ALT}
      width={width}
      height={Math.round((width * 32) / 456)}
      loading="lazy"
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
