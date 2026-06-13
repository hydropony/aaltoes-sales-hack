import { clearStoredUserId, getStoredUserId, setStoredUserId } from './auth'

const BASE = 'http://localhost:8000'

function getUserId() {
  return getStoredUserId()
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getUserId() ? { 'X-User-ID': getUserId() } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  getAuthUsers: () => fetch(`${BASE}/auth/users`).then(async (res) => {
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }),
  getMe: () => request('/auth/me'),

  // Accounts
  getAccounts: () => request('/accounts'),
  getAccount: (id) => request(`/accounts/${id}`),
  createAccount: (data) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  getAccountContacts: (id) => request(`/accounts/${id}/contacts`),
  createContact: (accountId, data) => request(`/accounts/${accountId}/contacts`, { method: 'POST', body: JSON.stringify(data) }),
  getAccountDeals: (id) => request(`/accounts/${id}/deals`),
  getAccountCases: (id) => request(`/accounts/${id}/cases`),
  getAccountTimeline: (id) => request(`/accounts/${id}/timeline`),
  getAccountNotes: (id) => request(`/accounts/${id}/notes`),
  createAccountNote: (id, data) => request(`/accounts/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),

  // Cases
  getCases: () => request('/cases'),
  getCase: (id) => request(`/cases/${id}`),
  createCase: (data) => request('/cases', { method: 'POST', body: JSON.stringify(data) }),
  updateCase: (id, data) => request(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getCaseNotes: (id) => request(`/cases/${id}/notes`),
  createCaseNote: (id, data) => request(`/cases/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),

  // Users
  getUsers: () => request('/users'),

  // Session
  setUserId: (userId) => setStoredUserId(userId),
  clearUserId: () => clearStoredUserId(),

  // Catalog (for service dropdown)
  getCatalog: () => request('/catalog'),
}
