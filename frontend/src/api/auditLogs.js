import { api } from './client.js';
import { buildQuery } from './pagination.js';

export const auditLogsApi = {
  // { page, pageSize, search, actorRole } -> PagedResult<AuditLogResponse>
  // Arama ve rol filtresi sunucuda uygulanır: istemcide yapılsaydı yalnızca
  // açık sayfadaki kayıtlarda arardı.
  getAll: (params = {}) => api.get(`/auditlogs${buildQuery(params)}`),
};
