let config = {
  baseUrl: '',
  getToken: () => localStorage.getItem('access_token'),
  onUnauthorized: null,
};

function buildHeaders(options = {}) {
  const headers = new Headers(options.headers || {});
  // Default accept JSON
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  // Content-Type for JSON bodies
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Authorization header
  try {
    const token = config.getToken ? config.getToken() : null;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch (_) { /* ignore */ }

  return headers;
}

async function request(path, options = {}) {
  let url = path.startsWith('http') ? path : `${config.baseUrl}${path}`;
  // If URL points to /static from backend, and no baseUrl is set, prefix backend origin explicitly
  if (!path.startsWith('http') && path.startsWith('/static/')) {
    const backend = import.meta?.env?.VITE_API_BASE || 'http://localhost:8001';
    url = `${backend}${path}`;
  }
  const headers = buildHeaders(options);

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && typeof config.onUnauthorized === 'function') {
    try { await config.onUnauthorized(); } catch (_) {}
  }

  return response;
}

async function json(path, options = {}) {
  const response = await request(path, options);
  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }
  return { response, data };
}

function configure(newConfig = {}) {
  config = { ...config, ...newConfig };
}

export const api = { configure, request, json };
