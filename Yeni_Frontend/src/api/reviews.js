import { api } from './client.js';

export const reviewsApi = {
  getByRestaurant: (restaurantId) => api.get(`/reviews/restaurant/${restaurantId}`),
  getMine: () => api.get('/reviews/me'),
  create: (payload) => api.post('/reviews', payload),
  react: (reviewId, isLike) => api.post(`/reviews/${reviewId}/react`, { isLike }),
  remove: (reviewId) => api.delete(`/reviews/${reviewId}`),
  addReply: (reviewId, payload) => api.post(`/reviews/${reviewId}/replies`, payload),
  removeReply: (reviewId, replyId) => api.delete(`/reviews/${reviewId}/replies/${replyId}`),
};
