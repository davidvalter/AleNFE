const API_BASE = window.location.origin || 'https://alenfe.alecriminteligente.com.br';
const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };
const TIMEOUT_MS = 30000;

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...DEFAULT_HEADERS, ...options.headers },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('API request failed:', error);
    throw error;
  }
}

export async function getNFCes() {
  return request(`${API_BASE}/api/nfce`);
}

export async function getNFCeById(id) {
  return request(`${API_BASE}/api/nfce/${id}`);
}

export async function createNFCe(data) {
  return request(`${API_BASE}/api/nfce`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function getJobStatus(jobId) {
  return request(`${API_BASE}/api/job/${jobId}`);
}