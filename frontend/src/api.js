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

export async function uploadFile(groupId, file, tags = '') {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('file', file)
  if (tags) formData.append('tags', tags)
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

export function updateFileTags(fileId, tags) {
  return request('PATCH', `/files/${fileId}/tags`, { tags })
}

async function downloadBlob(url, filename) {
  const token = localStorage.getItem('token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Download failed')
  }
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

export function downloadFile(fileId, filename) {
  return downloadBlob(`${BASE_URL}/files/download/${fileId}`, filename)
}

// ---------- AI ----------

export function indexFile(fileId) {
  return request('POST', `/ai/index/${fileId}`)
}

export function askQuestion(groupId, question, fileId = null) {
  const body = fileId ? { question, file_id: fileId } : { question }
  return request('POST', `/ai/ask/${groupId}`, body)
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

// ---------- Subjects ----------

export function getSubjects(groupId, semester = '') {
  const query = semester ? `?semester=${encodeURIComponent(semester)}` : ''
  return request('GET', `/subjects/${groupId}${query}`)
}

export function createSubject(groupId, data) {
  return request('POST', `/subjects/${groupId}`, data)
}

export function deleteSubject(subjectId) {
  return request('DELETE', `/subjects/${subjectId}`)
}

export function getSubjectFiles(groupId) {
  return request('GET', `/subjects/${groupId}/files`)
}

// ---------- Lessons ----------

export function getLessons(subjectId, type = '') {
  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  return request('GET', `/lessons/${subjectId}${query}`)
}

export function createLesson(subjectId, data) {
  return request('POST', `/lessons/${subjectId}`, data)
}

export function updateLesson(lessonId, data) {
  return request('PATCH', `/lessons/${lessonId}`, data)
}

export function deleteLesson(lessonId) {
  return request('DELETE', `/lessons/${lessonId}`)
}

export function getLessonFiles(lessonId) {
  return request('GET', `/lessons/${lessonId}/files`)
}

export async function uploadLessonFile(lessonId, file) {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/lessons/${lessonId}/files`, {
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

export function deleteLessonFile(lessonId, fileId) {
  return request('DELETE', `/lessons/${lessonId}/files/${fileId}`)
}

export function downloadLessonFile(lessonId, fileId, filename) {
  return downloadBlob(`${BASE_URL}/lessons/${lessonId}/files/${fileId}/download`, filename)
}

export function indexLessonFile(lessonId, fileId) {
  return request('POST', `/lessons/${lessonId}/files/${fileId}/index`)
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
