import { useCallback, useEffect, useRef, useState } from 'react';
import OtpInput from './OtpInput.jsx';
import { phoneVerificationApi } from '../api/phoneVerification.js';
import { ApiError } from '../api/client.js';

function formatSeconds(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const CHANNELS = {
  whatsapp: {
    icon: 'chat',
    subtitle: 'WhatsApp ile gönderilen kodu girin',
    pending: 'WhatsApp üzerinden 6 haneli bir kod göndereceğiz.',
    sent: (masked) => (
      <>
        <span className="font-semibold text-on-background">{masked}</span> numarasına
        WhatsApp üzerinden 6 haneli bir kod gönderdik.
      </>
    ),
    sentInfo: 'Doğrulama kodu WhatsApp ile gönderildi.',
    send: (phone) => phoneVerificationApi.send(phone).then((r) => ({ ...r, masked: r.maskedPhone })),
    verify: (phone, _email, code) => phoneVerificationApi.verify(phone, code),
  },
  email: {
    icon: 'mail',
    subtitle: 'E-postanıza gönderilen kodu girin',
    pending: 'E-posta adresinize 6 haneli bir kod göndereceğiz.',
    sent: (masked) => (
      <>
        <span className="font-semibold text-on-background">{masked}</span> adresine
        6 haneli bir kod gönderdik. Gelen kutunuzda yoksa spam klasörüne bakın.
      </>
    ),
    sentInfo: 'Doğrulama kodu e-posta ile gönderildi.',
    send: (_phone, email) => phoneVerificationApi.sendEmail(email).then((r) => ({ ...r, masked: r.maskedEmail })),
    verify: (_phone, email, code) => phoneVerificationApi.verifyEmail(email, code),
  },
};

/**
 * Kayıt öncesi doğrulama adımı.
 *
 * Varsayılan kanal WhatsApp'tır; WhatsApp'ı olmayan kullanıcı e-postaya geçebilir.
 * Kod doğrulanınca onVerified(ticket) çağrılır, kayıt isteği bu jetonu taşır.
 */
export default function PhoneVerificationDialog({
  phone,
  email,
  channels = { whatsApp: true, email: false },
  onVerified,
  onCancel,
}) {
  const [channel, setChannel] = useState(channels.whatsApp ? 'whatsapp' : 'email');
  const [code, setCode] = useState('');
  const [masked, setMasked] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  const current = CHANNELS[channel];
  const canSwitchToEmail = channel === 'whatsapp' && channels.email;
  const canSwitchToWhatsApp = channel === 'email' && channels.whatsApp;

  const send = useCallback(async (target) => {
    setIsSending(true);
    setError('');
    setInfo('');

    try {
      const result = await CHANNELS[target].send(phone, email);
      setMasked(result.masked);
      setSecondsLeft(result.expiresInSeconds);
      setResendIn(result.resendAfterSeconds);
      setCode('');
      setInfo(CHANNELS[target].sentInfo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kod gönderilemedi.');
    } finally {
      setIsSending(false);
    }
  }, [phone, email]);

  // İlk açılışta kodu bir kez gönder (StrictMode çift çağrısına karşı koruma).
  const hasSentRef = useRef(false);
  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    send(channel);
  }, [send, channel]);

  const switchChannel = (target) => {
    setChannel(target);
    setMasked('');
    setSecondsLeft(0);
    setResendIn(0);
    setCode('');
    send(target);
  };

  // Kodun geçerlilik süresi.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setInterval(() => setSecondsLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // Yeniden gönderme bekleme süresi.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => setResendIn((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const verify = async (submitted) => {
    const value = submitted ?? code;
    if (value.length !== 6 || isVerifying) return;

    setIsVerifying(true);
    setError('');

    try {
      const result = await current.verify(phone, email, value);
      onVerified(result.verificationTicket);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kod doğrulanamadı.');
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const isExpired = secondsLeft === 0 && !isSending;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl ambient-shadow overflow-hidden">
        <div className="bg-primary-container text-on-primary-container px-5 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined">{current.icon}</span>
          <div>
            <p className="font-label-lg text-label-lg">
              {channel === 'email' ? 'E-posta Doğrulama' : 'Telefon Doğrulama'}
            </p>
            <p className="text-[11px] opacity-80">{current.subtitle}</p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-body-md text-on-surface-variant text-center">
            {masked ? current.sent(masked) : current.pending}
          </p>

          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={isSending || isVerifying || isExpired}
            hasError={Boolean(error)}
          />

          <div className="text-center">
            {isSending ? (
              <p className="text-body-sm text-on-surface-variant flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Kod gönderiliyor, lütfen bekleyin...
              </p>
            ) : !masked ? (
              <p className="text-body-sm text-error">Kod gönderilemedi. Aşağıdan yeniden deneyin.</p>
            ) : isExpired ? (
              <p className="text-body-sm text-error">Kodun süresi doldu.</p>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                Kalan süre:{' '}
                <span className={secondsLeft <= 30 ? 'text-error font-semibold' : 'font-semibold text-on-background'}>
                  {formatSeconds(secondsLeft)}
                </span>
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-error text-body-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {info && !error && (
            <div className="flex items-start gap-2 text-primary-container text-body-sm">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{info}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => verify()}
            disabled={code.length !== 6 || isVerifying || isSending || isExpired}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg disabled:opacity-40 transition-opacity"
          >
            {isVerifying ? 'Doğrulanıyor...' : 'Doğrula ve Devam Et'}
          </button>

          {(canSwitchToEmail || canSwitchToWhatsApp) && (
            <button
              type="button"
              onClick={() => switchChannel(canSwitchToEmail ? 'email' : 'whatsapp')}
              disabled={isSending || isVerifying}
              className="flex items-center justify-center gap-2 text-body-sm text-on-surface-variant hover:text-primary-container hover:underline disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {canSwitchToEmail ? 'mail' : 'chat'}
              </span>
              {canSwitchToEmail ? 'WhatsApp’ım yok, e-posta ile doğrula' : 'WhatsApp ile doğrula'}
            </button>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="text-body-sm text-on-surface-variant hover:underline"
            >
              Vazgeç
            </button>

            <button
              type="button"
              onClick={() => send(channel)}
              disabled={resendIn > 0 || isSending}
              className="text-body-sm text-primary-container font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:underline"
            >
              {resendIn > 0 ? `Yeniden gönder (${resendIn}s)` : 'Kodu yeniden gönder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
