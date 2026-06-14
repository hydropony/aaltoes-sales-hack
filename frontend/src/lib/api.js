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
  getAccountOffers: (id) => request(`/accounts/${id}/offers`),

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

  // Deals
  getDeals: () => request('/deals'),
  getDeal: (id) => request(`/deals/${id}`),
  createDeal: (data) => request('/deals', { method: 'POST', body: JSON.stringify(data) }),
  updateDealStage: (id, data) => request(`/deals/${id}/stage`, { method: 'PATCH', body: JSON.stringify(data) }),
  getDealForecast: (id) => request(`/deals/${id}/forecast`),
  saveDealForecast: (id, rows) => request(`/deals/${id}/forecast`, { method: 'POST', body: JSON.stringify(rows) }),
  getDealNotes: (id) => request(`/deals/${id}/notes`),
  addDealNote: (id, data) => request(`/deals/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),

  // Offers
  getOffers: () => request('/offers'),
  getOffer: (id) => request(`/offers/${id}`),
  createOffer: (data) => request('/offers', { method: 'POST', body: JSON.stringify(data) }),
  getOfferLines: (id) => request(`/offers/${id}/lines`),
  addOfferLine: (id, data) => request(`/offers/${id}/lines`, { method: 'POST', body: JSON.stringify(data) }),
  removeOfferLine: (offerId, lineId) => fetch(`${BASE}/offers/${offerId}/lines/${lineId}`, { method: 'DELETE', headers: { 'X-User-ID': getUserId() } }).then(res => { if (!res.ok) throw new Error(res.status) }),
  submitOffer: (id, data) => request(`/offers/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  approveOffer: (id) => request(`/offers/${id}/approve`, { method: 'POST', body: JSON.stringify({}) }),
  rejectOffer: (id, reason) => request(`/offers/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Services
  getServices: () => request('/services'),
  createService: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) => request(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Catalog
  getCatalog: () => request('/catalog'),
  createCatalogItem: (data) => request('/catalog', { method: 'POST', body: JSON.stringify(data) }),
  updateCatalogItem: (id, data) => request(`/catalog/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  retireCatalogItem: (id) => request(`/catalog/${id}/retire`, { method: 'PATCH' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
}
