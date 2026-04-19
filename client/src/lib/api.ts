const getToken = () => localStorage.getItem('br_token');

async function request(method: string, path: string, body?: any, auth = true) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${getToken()}`;

  const res = await fetch('/api' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  post: (path: string, body?: any, auth?: boolean) => request('POST', path, body, auth),
  get:  (path: string) => request('GET',  path),
};
