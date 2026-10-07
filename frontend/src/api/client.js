const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5021/api';
const STORAGE_KEY = 'sukran_auth';

export class ApiError extends Error {
  constructor(status, body) {
    super(extractMessage(body) ?? `İstek başarısız oldu (${status}).`);
    this.status = status;
    this.body = body;
  }

  /** 402: abonelik gerekiyor — kullanıcı abonelik ekranına yönlendirilmelidir. */
  get isSubscriptionRequired() {
    return this.status === 402;
  }
}

function extractMessage(body) {
  if (!body) return null;
  if (typeof body === 'string') return body;
  if (Array.isArray(body.errors)) return body.errors.join(' ');
  if (body.errors && typeof body.errors === 'object') {
    return Object.values(body.errors).flat().join(' ');
  }
  return body.title ?? body.message ?? null;
}

function loadTokens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let tokens = loadTokens();
let refreshPromise = null;
const unauthorizedListeners = new Set();

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function getTokens() {
  return tokens;
}

export function setTokens(nextTokens) {
  tokens = nextTokens;
  if (nextTokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTokens));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearTokens() {
  setTokens(null);
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshAccessToken() {
  if (!tokens?.refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          return false;
        }
        const data = await safeJson(response);
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(path, { method = 'GET', body, auth = true, isFormData = false, ...rest } = {}) {
  const headers = { ...(rest.headers ?? {}) };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });

  let response = await doFetch();

  if (response.status === 401 && auth && tokens?.refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
      response = await doFetch();
    }
  }

  if (response.status === 401 && auth) {
    clearTokens();
    unauthorizedListeners.forEach((listener) => listener());
  }

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return null;
  }

  return safeJson(response);
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
