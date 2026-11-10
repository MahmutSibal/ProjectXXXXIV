import { api } from './client.js';

/** Backend'deki RefundMethod enum'ı (sayısal serileştirilir). */
export const RefundMethod = { Cash: 1, Card: 2, Iban: 3 };

export const REFUND_METHOD_LABEL = {
  [RefundMethod.Cash]: 'Nakit',
  [RefundMethod.Card]: 'Kart',
  [RefundMethod.Iban]: 'IBAN',
};

/** Backend'deki RefundRequestStatus enum'ı. */
export const RefundRequestStatus = { Pending: 1, Completed: 2, Rejected: 3 };

export const refundsApi = {
  // İşletme/mutfak: varsayılan olarak yalnızca bekleyen talepler.
  getByRestaurant: (restaurantId, status = RefundRequestStatus.Pending) =>
    api.get(`/refund-requests/restaurant/${restaurantId}${status ? `?status=${status}` : ''}`),
  updateStatus: (id, status, resolutionNote = null) =>
    api.put(`/refund-requests/${id}/status`, { status, resolutionNote }),
};
