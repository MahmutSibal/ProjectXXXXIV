import { apiRequest } from './client.js';

export const uploadsApi = {
  upload: (restaurantId, file) => {
    const formData = new FormData();
    formData.append('restaurantId', restaurantId);
    formData.append('file', file);
    return apiRequest('/uploads', { method: 'POST', body: formData, isFormData: true });
  },
};
