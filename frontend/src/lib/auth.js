const USER_ID_KEY = 'user_id'

export function getStoredUserId() {
  return localStorage.getItem(USER_ID_KEY)
}

export function setStoredUserId(userId) {
  localStorage.setItem(USER_ID_KEY, String(userId))
}

export function clearStoredUserId() {
  localStorage.removeItem(USER_ID_KEY)
}
