import { useCallback, useEffect, useRef, useState } from 'react';
import OtpInput from './OtpInput.jsx';
import { phoneVerificationApi } from '../api/phoneVerification.js';
import { ApiError } from '../api/client.js';

function formatSeconds(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * WhatsApp doğrulama adımı.
 *
 * Kod gönderilir, kullanıcı 6 haneyi girer, doğrulanınca onVerified(ticket)
 * çağrılır. Kayıt isteği bu jetonu taşır.
 */
export default function PhoneVerificationDialog({ phone, onVerified, onCancel }) {
  const [code, setCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  // İlk açılışta kodu bir kez gönder (StrictMode çift çağrısına karşı koruma).
  const hasSentRef = useRef(false);

  const send = useCallback(async () => {
    setIsSending(true);
    setError('');
    setInfo('');

    try {
      const result = await phoneVerificationApi.send(phone);
      setMaskedPhone(result.maskedPhone);
      setSecondsLeft(result.expiresInSeconds);
      setResendIn(result.resendAfterSeconds);
      setCode('');
      setInfo('Doğrulama kodu WhatsApp ile gönderildi.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kod gönderilemedi.');
    } finally {
      setIsSending(false);
    }
  }, [phone]);

  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    send();
  }, [send]);

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
      const result = await phoneVerificationApi.verify(phone, value);
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
          <span className="material-symbols-outlined">chat</span>
          <div>
            <p className="font-label-lg text-label-lg">Telefon Doğrulama</p>
            <p className="text-[11px] opacity-80">WhatsApp ile gönderilen kodu girin</p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-body-md text-on-surface-variant text-center">
            {maskedPhone ? (
              <>
                <span className="font-semibold text-on-background">{maskedPhone}</span> numarasına
                WhatsApp üzerinden 6 haneli bir kod gönderdik.
              </>
            ) : (
              'Kod gönderiliyor...'
            )}
          </p>

          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={isSending || isVerifying || isExpired}
            hasError={Boolean(error)}
          />

          <div className="text-center">
            {isExpired ? (
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
              onClick={send}
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
