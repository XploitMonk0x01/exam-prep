const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const getAuthToken = (): string | null => localStorage.getItem('token')
export const setAuthToken = (token: string): void =>
  localStorage.setItem('token', token)
export const removeAuthToken = (): void => localStorage.removeItem('token')

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
function publicHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json()
}

/* ─── Auth ─── */
export const authAPI = {
  register: (email: string, password: string, name?: string) =>
    fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: publicHeaders(),
      body: JSON.stringify({ email, password, name }),
    }).then(handleResponse),

  login: (email: string, password: string) =>
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: publicHeaders(),
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${API_URL}/auth/me`, { headers: authHeaders() }).then(
      handleResponse,
    ),
}

/* ─── Exam results ─── */
export const examAPI = {
  submitExam: (data: unknown) =>
    fetch(`${API_URL}/exams/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  getHistory: () =>
    fetch(`${API_URL}/exams/history`, { headers: authHeaders() }).then(
      handleResponse,
    ),

  getResult: (id: string) =>
    fetch(`${API_URL}/exams/result/${id}`, { headers: authHeaders() }).then(
      handleResponse,
    ),
}

/* ─── Exam bank ─── */
export const bankAPI = {
  getExams: () =>
    fetch(`${API_URL}/exams/bank`, { headers: authHeaders() }).then(
      handleResponse,
    ),

  saveExam: (data: unknown) =>
    fetch(`${API_URL}/exams/bank`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  deleteExam: (id: string) =>
    fetch(`${API_URL}/exams/bank/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleResponse),
}

/* ─── Shared exams + leaderboard ─── */
export const sharedAPI = {
  createShare: (data: unknown) =>
    fetch(`${API_URL}/exams/share`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  getExam: (shareId: string) =>
    fetch(`${API_URL}/exams/shared/${shareId}`, {
      headers: publicHeaders(),
    }).then(handleResponse),

  submitScore: (shareId: string, data: unknown) =>
    fetch(`${API_URL}/exams/shared/${shareId}/score`, {
      method: 'POST',
      headers: publicHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  getLeaderboard: (shareId: string) =>
    fetch(`${API_URL}/exams/shared/${shareId}/leaderboard`, {
      headers: publicHeaders(),
    }).then(handleResponse),
}

/* ─── Weak areas ─── */
export const weakAreaAPI = {
  getWeakAreas: () =>
    fetch(`${API_URL}/exams/weak-areas`, { headers: authHeaders() }).then(
      handleResponse,
    ),
}
