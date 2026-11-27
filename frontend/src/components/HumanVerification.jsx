import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { authApi } from '../api/auth.js';

/**
 * Robot doğrulaması (Cloudflare Turnstile). Açık olup olmadığını ve site anahtarını backend
 * söyler (GET /api/auth/human-verification); kapalıysa bu bileşen hiçbir şey göstermez ve
 * jeton gönderilmez. Çoğu kullanıcı için kutu kendiliğinden geçer; şüpheli trafikte tek tık ister.
 *
 * Jeton tek kullanımlıktır: başarısız bir denemeden sonra ref.reset() ile yenilenmelidir.
 */

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let configPromise;
let scriptPromise;

function loadConfig() {
  configPromise ??= authApi.getHumanVerification()
    .then((config) => (config?.enabled && config.siteKey ? config.siteKey : null))
    // Ayar okunamazsa kutu gösterilmez; backend doğrulama istiyorsa giriş anlaşılır bir
    // mesajla reddedilir ve sayfa yenilendiğinde yeniden denenir.
    .catch(() => {
      configPromise = undefined;
      return null;
    });
  return configPromise;
}

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error('Robot doğrulaması yüklenemedi.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Props: onChange(state) — state = { required: boolean, token: string }.
 * required=false iken jeton gerekmez (doğrulama kapalı).
 */
const HumanVerification = forwardRef(function HumanVerification({ onChange }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [loadError, setLoadError] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current != null) {
        window.turnstile.reset(widgetIdRef.current);
        onChangeRef.current?.({ required: true, token: '' });
      }
    },
  }), []);

  useEffect(() => {
    let cancelled = false;

    loadConfig().then(async (siteKey) => {
      if (cancelled) return;
      if (!siteKey) {
        onChangeRef.current?.({ required: false, token: '' });
        return;
      }

      setEnabled(true);
      onChangeRef.current?.({ required: true, token: '' });
      try {
        const turnstile = await loadScript();
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          language: 'tr',
          theme: 'light',
          'refresh-expired': 'auto',
          callback: (token) => onChangeRef.current?.({ required: true, token }),
          'expired-callback': () => onChangeRef.current?.({ required: true, token: '' }),
          'error-callback': () => {
            onChangeRef.current?.({ required: true, token: '' });
            // false döndürülmezse Turnstile hatayı konsola atar ve yeniden dener.
            return false;
          },
        });
      } catch (error) {
        if (!cancelled) setLoadError(error.message);
      }
    });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current != null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!enabled) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, margin: '4px 0 12px' }}>
      <div ref={containerRef} />
      {loadError && (
        <p role="alert" style={{ fontSize: 12, color: '#93000a', textAlign: 'center' }}>
          {loadError} Reklam engelleyiciyi kapatıp sayfayı yenileyin.
        </p>
      )}
    </div>
  );
});

export default HumanVerification;
