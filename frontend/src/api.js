const BASE_URL = 'http://localhost:8000'

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...extra }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function request(method, path, body = null, customHeaders = {}) {
  const options = {
    method,
    headers: authHeaders(customHeaders),
  }
  if (body !== null) {
    options.body = JSON.stringify(body)
  }
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

// ---------- Auth ----------

export async function register(name, email, password) {
  const data = await request('POST', '/auth/register', { name, email, password })
  if (data?.access_token) localStorage.setItem('token', data.access_token)
  return data
}

export async function login(email, password) {
  const data = await request('POST', '/auth/login', { email, password })
  if (data?.access_token) localStorage.setItem('token', data.access_token)
  return data
}

export function logout() {
  localStorage.removeItem('token')
}

export function getMe() {
  return request('GET', '/auth/me')
}

export function updateProfile(data) {
  return request('PATCH', '/auth/profile', data)
}

// ---------- Groups ----------

export function getMyGroups() {
  return request('GET', '/groups/my')
}

export function createGroup(name) {
  return request('POST', '/groups/', { name })
}

export function joinGroup(inviteCode) {
  return request('POST', '/groups/join', { invite_code: inviteCode })
}

export function getGroup(groupId) {
  return request('GET', `/groups/${groupId}`)
}

export function getMemberProfile(groupId, userId) {
  return request('GET', `/groups/${groupId}/members/${userId}`)
}

export function updateMemberRole(groupId, userId, role) {
  return request('PATCH', `/groups/${groupId}/members/${userId}/role`, { role })
}

// ---------- Files ----------

export async function uploadFile(groupId, file) {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/files/upload/${groupId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export function getFiles(groupId) {
  return request('GET', `/files/${groupId}`)
}

export function deleteFile(fileId) {
  return request('DELETE', `/files/${fileId}`)
}

// ---------- AI ----------

export function indexFile(fileId) {
  return request('POST', `/ai/index/${fileId}`)
}

export function askQuestion(groupId, question) {
  return request('POST', `/ai/ask/${groupId}`, { question })
}

// ---------- Announcements ----------

export function getAnnouncements(groupId, search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return request('GET', `/announcements/${groupId}${query}`)
}

export function createAnnouncement(groupId, data) {
  return request('POST', `/announcements/${groupId}`, data)
}

export function updateAnnouncement(announcementId, data) {
  return request('PATCH', `/announcements/${announcementId}`, data)
}

export function deleteAnnouncement(announcementId) {
  return request('DELETE', `/announcements/${announcementId}`)
}

// ---------- Schedule ----------

export function getScheduleItems(groupId) {
  return request('GET', `/schedule/${groupId}`)
}

export function createScheduleItem(groupId, data) {
  return request('POST', `/schedule/${groupId}`, data)
}

export function deleteScheduleItem(groupId, itemId) {
  return request('DELETE', `/schedule/${groupId}/${itemId}`)
}
