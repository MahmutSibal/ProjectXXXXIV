import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { api } from '../api/client.js';
import { onServerDown, pingServer } from '../lib/serverStatus.js';
import StatusScreen from './StatusScreens.jsx';

const STATUS_POLL_MS = 60_000;
const DOWN_RETRY_MS = 10_000;

const SHUTDOWN_MESSAGE = 'Sunucu şu anda kapalı. Açıldığında hizmete devam edebilirsiniz.';

// Bakım ve sunucu kapatma sırasında kapatılan alanlar. Ana sayfa, giriş sayfası ve Süper Admin paneli açık kalır
// ki Süper Admin bakımı/kapatmayı kaldırabilsin.
const BLOCKED_PREFIXES = ['/admin', '/kitchen', '/menu', '/kayit-ol'];

function isBlockedPath(pathname) {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const initialStatus = { maintenanceEnabled: false, message: '', serverDisabled: false };

export default function PlatformStatusGate({ children }) {
  const { pathname } = useLocation();
  const [serverDown, setServerDown] = useState(false);
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );
  const [status, setStatus] = useState(initialStatus);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => onServerDown(() => setServerDown(true)), []);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get('/platform-settings/status', { auth: false });
      setStatus({
        maintenanceEnabled: Boolean(data?.maintenanceEnabled),
        message: data?.message ?? '',
        serverDisabled: Boolean(data?.serverDisabled),
      });
    } catch {
      // Ulaşılamıyorsa kesinti ekranı zaten olay üzerinden açılır; durum değişmeden kalır.
    }
  }, []);

  const recover = useCallback(async () => {
    setIsRetrying(true);
    const ok = await pingServer();
    setIsRetrying(false);
    if (ok) {
      // Kesinti sırasında yarım kalan istekleri temiz başlatmak için sayfayı yeniden yükle.
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!serverDown) return undefined;
    const timer = setInterval(async () => {
      if (await pingServer()) window.location.reload();
    }, DOWN_RETRY_MS);
    return () => clearInterval(timer);
  }, [serverDown]);

  // Durum yoklaması kesintide de sürer: 503 "sunucu kapalı"dan mı yoksa gerçek kesintiden mi geldi anlaşılsın
  // ve Süper Admin hiçbir koşulda genel kesinti ekranında takılı kalmasın.
  useEffect(() => {
    const first = setTimeout(loadStatus, 0);
    const timer = setInterval(loadStatus, serverDown ? DOWN_RETRY_MS : STATUS_POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [serverDown, loadStatus]);

  const blocked = isBlockedPath(pathname);

  if (offline) {
    return <StatusScreen variant="offline" autoRetry />;
  }

  // Süper Admin sunucuyu kapattıysa: engelli alanlarda "sunucu kapalı" ekranı, otomatik yenileme yok.
  if (status.serverDisabled && blocked) {
    return (
      <StatusScreen
        variant="down"
        message={status.message || SHUTDOWN_MESSAGE}
        onRetry={loadStatus}
        retryLabel="Tekrar Kontrol Et"
        showHome
        autoRetry
      />
    );
  }

  // Sunucu kapalıyken açık kalan sayfalardaki 503'ler genel kesinti ekranını açmasın.
  if (serverDown && !status.serverDisabled) {
    return <StatusScreen variant="down" onRetry={recover} isRetrying={isRetrying} autoRetry />;
  }

  if (status.maintenanceEnabled && blocked) {
    return (
      <StatusScreen
        variant="maintenance"
        message={status.message}
        onRetry={loadStatus}
        retryLabel="Tekrar Kontrol Et"
        showHome
        autoRetry
      />
    );
  }

  return (
    <>
      {pathname.startsWith('/super-admin') && status.serverDisabled && (
        <div className="status-banner" role="status">
          Sunucu kapalı: yalnızca Süper Admin erişebiliyor. "Sistem Durumu" sayfasından yeniden açabilirsiniz.
        </div>
      )}
      {pathname.startsWith('/super-admin') && !status.serverDisabled && status.maintenanceEnabled && (
        <div className="status-banner" role="status">
          Bakım modu açık: işletmeler ve müşteriler bakım ekranını görüyor.
        </div>
      )}
      {children}
    </>
  );
}
