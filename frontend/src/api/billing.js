/**
 * Faturalama dönemini insan diline çevirir.
 * SuperAdmin aboneliği herhangi bir ay sayısıyla uzatabildiği için (3, 6 ay gibi),
 * yalnızca "ay/yıl" varsaymak yanlış tutar gösterimine yol açar.
 */
export function billingPeriodLabel(months) {
  if (months === 1) return 'ay';
  if (months === 12) return 'yıl';
  return `${months} ay`;
}
