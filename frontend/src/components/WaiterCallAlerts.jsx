/** Backend'deki WaiterCallReason enum'ı. */
const REASON_TEXT = { 0: 'garson çağırıyor', 1: 'hesap istiyor' };

export default function WaiterCallAlerts({ calls, onDismiss }) {
  if (!calls?.length) return null;
  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" role="alert" aria-live="assertive">
      {calls.map((call) => (
        <div key={call.key} className="flex items-center gap-3 rounded-xl border-2 border-[#D4AF37] bg-[#1A1A1A] p-3 text-white shadow-2xl">
          <span className="material-symbols-outlined animate-pulse text-3xl text-[#D4AF37]">
            {call.reason === 1 ? 'receipt_long' : 'room_service'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              Masa {call.tableNo} {REASON_TEXT[call.reason] ?? REASON_TEXT[0]}
            </p>
            <p className="text-xs text-neutral-400">
              {new Date(call.calledAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              {call.note ? ` · ${call.note}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(call.tableNo)}
            className="shrink-0 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-bold text-[#1A1A1A]"
          >
            Tamam
          </button>
        </div>
      ))}
    </div>
  );
}
