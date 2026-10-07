import { api } from './client.js';
import { buildQuery } from './pagination.js';

export const ordersApi = {
  // { sessionStatus, page, pageSize } -> PagedResult<OrderResponse>
  getByRestaurant: (restaurantId, params = {}) =>
    api.get(`/orders/restaurant/${restaurantId}${buildQuery(params)}`),
  getById: (orderId) => api.get(`/orders/${orderId}`),
  create: (payload) => api.post('/orders', payload),
  updateStatus: (orderId, sessionStatus) => api.put(`/orders/${orderId}/status`, { sessionStatus }),
  updateItemStatus: (orderId, orderItemId, status) => api.put(`/orders/${orderId}/items/${orderItemId}/status`, { status }),
  remove: (orderId) => api.delete(`/orders/${orderId}`),
};

export const billsApi = {
  getByRestaurant: (restaurantId) => api.get(`/bills/restaurant/${restaurantId}`),
  getById: (billId) => api.get(`/bills/${billId}`),
  update: (billId, sessionStatus, remainingAmount) => api.put(`/bills/${billId}`, { sessionStatus, remainingAmount }),
  updateItemStatus: (billId, orderItemId, status) => api.put(`/bills/${billId}/items/${orderItemId}/status`, { status }),
  remove: (billId) => api.delete(`/bills/${billId}`),
};

export const paymentsApi = {
  paySpecificItems: (payload) => api.post('/payments/specific-items', payload),
  splitEqually: (payload) => api.post('/payments/split-equally', payload),
  payCustomAmount: (payload) => api.post('/payments/custom-amount', payload),
};
