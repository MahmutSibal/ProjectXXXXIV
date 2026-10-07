import { SERVER_DOWN_MESSAGE, isServerDownStatus, reportServerDown } from '../lib/serverStatus.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5021/api';
const STORAGE_KEY = 'sukran_qr_session';

// Müşteri QR oturumu, personel/işletme sahibi girişinden tamamen ayrı bir token
// deposunda tutulur — aynı tarayıcıda bir yönetici QR menüyü yeni sekmede açtığında
// kendi oturumunu ezmesin diye (api/client.js'teki paylaşılan depodan bilerek farklı).
let session = loadSession();

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCustomerSession() {
  return session;
}

export function setCustomerSession(next) {
  session = next;
  if (next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function isSessionValid(target = session) {
  return Boolean(target?.accessToken) && new Date(target.expiresAt) > new Date();
}

function extractMessage(body, status) {
  if (typeof body === 'string' && body) return body;
  if (Array.isArray(body?.errors)) return body.errors.join(' ');
  if (body?.errors && typeof body.errors === 'object') return Object.values(body.errors).flat().join(' ');
  return body?.message ?? body?.title ?? `İstek başarısız oldu (${status}).`;
}

class CustomerApiError extends Error {
  constructor(status, body) {
    super(extractMessage(body, status));
    this.status = status;
    this.body = body;
  }
}

export { CustomerApiError };

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function customerRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    reportServerDown('network');
    throw new CustomerApiError(0, SERVER_DOWN_MESSAGE);
  }

  if (isServerDownStatus(response.status)) {
    reportServerDown('status');
  }

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new CustomerApiError(response.status, errorBody);
  }

  if (response.status === 204) return null;
  return safeJson(response);
}

export const customerApi = {
  get: (path) => customerRequest(path, { method: 'GET' }),
  post: (path, body) => customerRequest(path, { method: 'POST', body }),
};
