import { pageSummary } from '../api/pagination.js';

/**
 * Sayfalanmış listeler için ortak gezinme çubuğu.
 *
 * props:
 *   page        — geçerli sayfa (1 tabanlı)
 *   pageSize    — sayfa başına kayıt
 *   totalCount  — toplam kayıt
 *   totalPages  — toplam sayfa
 *   onPageChange(nextPage)
 *   onPageSizeChange(nextSize)  — verilmezse boyut seçici gizlenir
 *   isLoading   — istek sürerken düğmeleri kilitler
 */
export default function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}) {
  // Tek sayfaya sığan liste için gezinme göstermeye gerek yok.
  if (!totalCount || totalPages <= 1) {
    return totalCount ? (
      <p className="font-body-sm text-body-sm text-on-surface-variant px-1 py-2">
        {pageSummary({ page, pageSize, totalCount })}
      </p>
    ) : null;
  }

  const canPrevious = page > 1 && !isLoading;
  const canNext = page < totalPages && !isLoading;

  const buttonClass =
    'flex items-center justify-center h-9 min-w-9 px-3 rounded-lg border border-outline-variant ' +
    'font-label-md text-label-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
    'enabled:hover:bg-surface-container-high';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-md pt-md mt-md border-t border-outline-variant">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {pageSummary({ page, pageSize, totalCount })}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            className="h-9 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 font-label-md text-label-md outline-none focus:border-primary-container mr-2"
            value={pageSize}
            disabled={isLoading}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Sayfa başına kayıt"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / sayfa
              </option>
            ))}
          </select>
        )}

        <button type="button" className={buttonClass} disabled={!canPrevious} onClick={() => onPageChange(1)} aria-label="İlk sayfa">
          <span className="material-symbols-outlined text-[18px]">first_page</span>
        </button>

        <button type="button" className={buttonClass} disabled={!canPrevious} onClick={() => onPageChange(page - 1)} aria-label="Önceki sayfa">
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        <span className="font-label-md text-label-md text-on-background px-2">
          {page} / {totalPages}
        </span>

        <button type="button" className={buttonClass} disabled={!canNext} onClick={() => onPageChange(page + 1)} aria-label="Sonraki sayfa">
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>

        <button type="button" className={buttonClass} disabled={!canNext} onClick={() => onPageChange(totalPages)} aria-label="Son sayfa">
          <span className="material-symbols-outlined text-[18px]">last_page</span>
        </button>
      </div>
    </div>
  );
}
