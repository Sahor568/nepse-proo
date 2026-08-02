const DEFAULT_API_BASE = 'https://nepse-pro-backend.onrender.com/api';

export const API_BASE = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : (import.meta.env.VITE_API_BASE || DEFAULT_API_BASE);
export const NEPSE_BASE = `${API_BASE}/nepse`;
export const AUTH_BASE = `${API_BASE}/auth`;
export const USER_BASE = `${API_BASE}/user`;

/**
 * Auth-aware fetch wrapper that automatically attaches the JWT token
 * from localStorage to all requests as a Bearer Authorization header.
 * On 401 responses, clears the token and redirects to /login.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  return res;
}
