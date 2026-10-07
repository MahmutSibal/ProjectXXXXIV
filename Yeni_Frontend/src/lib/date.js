const HAS_TIMEZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

// Backend UTC zamanları "Z" eki olmadan döndürüyor; ek yoksa tarayıcı yerel saat sanıp saati kaydırır.
export function parseApiDate(value) {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);
  const trimmed = value.trim();
  const isDateTime = trimmed.includes('T');
  return new Date(isDateTime && !HAS_TIMEZONE.test(trimmed) ? `${trimmed}Z` : trimmed);
}
