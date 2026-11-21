import { useCallback, useState } from 'react';

/** Kısa bir uyarı sesi; tarayıcı sesi engellerse sessizce geçer. */
function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
    osc.onended = () => ctx.close();
  } catch {
    // Ses çalınamadı; görsel uyarı yeterli.
  }
}

/**
 * Masadan gelen garson çağrılarını tutar. Aynı masadan gelen yeni çağrı eskisinin
 * yerini alır; personel "Tamam" deyince listeden düşer.
 * useOrderRealtime'a `onWaiterCalled` olarak verilir.
 */
export function useWaiterCalls() {
  const [calls, setCalls] = useState([]);

  const onWaiterCalled = useCallback((call) => {
    if (!call || call.tableNo === undefined) return;
    beep();
    setCalls((prev) => [{ ...call, key: `${call.tableNo}-${call.calledAt}` }, ...prev.filter((c) => c.tableNo !== call.tableNo)]);
  }, []);

  const dismiss = useCallback((tableNo) => setCalls((prev) => prev.filter((c) => c.tableNo !== tableNo)), []);

  return { calls, onWaiterCalled, dismiss };
}
