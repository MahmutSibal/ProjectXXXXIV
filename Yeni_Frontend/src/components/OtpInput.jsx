import { useEffect, useRef } from 'react';

/**
 * Her rakamı ayrı kutucukta alan doğrulama kodu girişi.
 *
 * Davranışlar:
 *  - Rakam yazılınca otomatik bir sonraki kutuya geçer
 *  - Backspace boş kutuda bir öncekine döner
 *  - Ok tuşlarıyla gezinme
 *  - 6 haneli kod YAPIŞTIRILDIĞINDA kutulara dağılır (SMS/WhatsApp'tan kopyalama)
 *  - Tamamlandığında onComplete tetiklenir
 */
export default function OtpInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
}) {
  const inputsRef = useRef([]);

  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  useEffect(() => {
    if (autoFocus) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus]);

  const commit = (next) => {
    onChange?.(next);
    if (next.length === length && !next.includes(' ')) {
      onComplete?.(next);
    }
  };

  const setDigit = (index, digit) => {
    const chars = Array.from({ length }, (_, i) => value[i] ?? '');
    chars[index] = digit;
    commit(chars.join('').trimEnd());
  };

  const handleChange = (index, raw) => {
    // Kutuya birden fazla karakter gelirse (otomatik doldurma) hepsini dağıt.
    const onlyDigits = raw.replace(/\D/g, '');
    if (onlyDigits.length === 0) {
      setDigit(index, '');
      return;
    }

    if (onlyDigits.length === 1) {
      setDigit(index, onlyDigits);
      inputsRef.current[Math.min(index + 1, length - 1)]?.focus();
      return;
    }

    const chars = Array.from({ length }, (_, i) => value[i] ?? '');
    for (let i = 0; i < onlyDigits.length && index + i < length; i += 1) {
      chars[index + i] = onlyDigits[i];
    }
    const next = chars.join('').trimEnd();
    commit(next);
    inputsRef.current[Math.min(index + onlyDigits.length, length - 1)]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        setDigit(index, '');
      } else if (index > 0) {
        setDigit(index - 1, '');
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    commit(pasted);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" dir="ltr">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          // type="text" + inputMode="numeric": number tipi mobilde ok tuşları
          // ve maxLength ile beklenmedik davranır.
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          aria-label={`Doğrulama kodu ${index + 1}. hane`}
          className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-headline-md font-semibold rounded-xl border-2 outline-none transition-colors bg-surface-container-lowest
            ${hasError ? 'border-error text-error' : 'border-outline-variant focus:border-primary-container'}
            disabled:opacity-50`}
        />
      ))}
    </div>
  );
}
