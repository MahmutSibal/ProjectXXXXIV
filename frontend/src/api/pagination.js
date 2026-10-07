/**
 * Backend'in PagedResult<T> yanıtı için istemci tarafı yardımcıları.
 *
 * Yanıt şekli:
 *   { items, page, pageSize, totalCount, totalPages, hasPrevious, hasNext }
 */

/** Tanımsız/boş değerleri atlayarak sorgu dizesi kurar ("" veya "?a=1&b=2"). */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Sayfa boyutunun üst sınırı backend ile aynı (PageRequest.MaxPageSize). */
export const MAX_PAGE_SIZE = 200;

/** Varsayılan sayfa boyutu (backend PageRequest.DefaultPageSize ile aynı). */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Sayfalanmış yanıtı normalize eder. Uç sayfalama öncesi düz dizi döndürüyorsa
 * (ya da bir hata sonrası undefined geldiyse) yine de kullanılabilir bir şekil üretir.
 */
export function toPage(response, fallbackPageSize = DEFAULT_PAGE_SIZE) {
  if (Array.isArray(response)) {
    return {
      items: response,
      page: 1,
      pageSize: response.length || fallbackPageSize,
      totalCount: response.length,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    };
  }

  const items = response?.items ?? [];
  const page = response?.page ?? 1;
  const pageSize = response?.pageSize ?? fallbackPageSize;
  const totalCount = response?.totalCount ?? items.length;
  const totalPages = response?.totalPages ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0);

  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPrevious: response?.hasPrevious ?? page > 1,
    hasNext: response?.hasNext ?? page < totalPages,
  };
}

/** "13-24 / 57 kayıt" biçiminde okunur bir özet. */
export function pageSummary({ page, pageSize, totalCount }) {
  if (!totalCount) return '0 kayıt';
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);
  return `${first}-${last} / ${totalCount} kayıt`;
}
