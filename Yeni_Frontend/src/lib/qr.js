import QRCode from 'qrcode';

/**
 * Masanın QR menü adresini üretir. Tarayıcıdaki origin kullanılır; böylece
 * localhost'ta test ederken de, production alan adında da doğru adres oluşur.
 */
export function buildTableMenuUrl(restaurantId, tableNo, qrToken) {
  const origin = import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin;
  return `${origin}/menu/${restaurantId}/${tableNo}?token=${encodeURIComponent(qrToken)}`;
}

/** QR kodu data URL (PNG) olarak üretir — önizleme için. */
export function toQrDataUrl(url, size = 320) {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#06402B', light: '#FFFFFF' },
  });
}

/**
 * Masa kartını (başlık + QR + adres) tek bir PNG olarak üretip indirir.
 * Sadece QR karesi yerine basılmaya hazır bir kart üretilir.
 */
export async function downloadTableQrCard({ restaurantName, tableNo, url, fileName }) {
  const QR_SIZE = 640;
  const PADDING = 64;
  const HEADER = 190;
  const FOOTER = 150;

  const qrDataUrl = await QRCode.toDataURL(url, {
    width: QR_SIZE,
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#06402B', light: '#FFFFFF' },
  });

  const canvas = document.createElement('canvas');
  canvas.width = QR_SIZE + PADDING * 2;
  canvas.height = HEADER + QR_SIZE + FOOTER;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;

  ctx.fillStyle = '#06402B';
  ctx.textAlign = 'center';

  ctx.font = 'bold 46px Inter, Arial, sans-serif';
  ctx.fillText(truncate(ctx, restaurantName ?? '', canvas.width - PADDING), centerX, 74);

  ctx.font = 'bold 68px Inter, Arial, sans-serif';
  ctx.fillText(`MASA ${tableNo}`, centerX, 150);

  const qrImage = await loadImage(qrDataUrl);
  ctx.drawImage(qrImage, PADDING, HEADER, QR_SIZE, QR_SIZE);

  ctx.fillStyle = '#404943';
  ctx.font = '34px Inter, Arial, sans-serif';
  ctx.fillText('Menü için karekodu okutun', centerX, HEADER + QR_SIZE + 58);

  ctx.fillStyle = '#8A938D';
  ctx.font = '26px Inter, Arial, sans-serif';
  ctx.fillText('Şükran App', centerX, HEADER + QR_SIZE + 108);

  await downloadCanvas(canvas, fileName ?? `masa-${tableNo}-qr.png`);
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function downloadCanvas(canvas, fileName) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      resolve();
    }, 'image/png');
  });
}
