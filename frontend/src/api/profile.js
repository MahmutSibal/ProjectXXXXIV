import { api } from './client.js';

export const profileApi = {
  getMe: () => api.get('/profile/me'),
  updateMe: (payload) => api.put('/profile/me', payload),
  changePassword: (currentPassword, newPassword) =>
    api.put('/profile/me/password', { currentPassword, newPassword }),
  // Hesabımı sil (KVKK m.11). -> { deleted, message }
  deleteMe: (password) => api.post('/profile/me/delete', { password }),
};
