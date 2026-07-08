﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getGroup, getFiles, uploadFile, deleteFile, indexFile, askQuestion,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getScheduleItems, createScheduleItem, deleteScheduleItem,
  updateMemberRole,
} from '../api'
import { useAuth } from '../AuthContext'
import MemberProfileModal from './MemberProfileModal'

const MANAGE_ROLES = ['deputy', 'starosta', 'teacher']

const ROLE_LABELS = {
  student: 'Студент',
  starosta: 'Староста',
  deputy: 'Зам. старосты',
  teacher: 'Преподаватель',
}

const TABS = ['Материалы', 'AI-ассистент', 'Участники', 'Объявления', 'Расписание']

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function formatDate(isoStr) {
  const d = new Date(isoStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// --- Вкладка: Материалы ---

function TabMaterials({ groupId, files, setFiles, myRole }) {
  const canManage = MANAGE_ROLES.includes(myRole)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const uploaded = await uploadFile(groupId, file)
      try {
        await indexFile(uploaded.id)
      } catch (indexErr) {
        setError(indexErr.message)
      }
      const updated = await getFiles(groupId)
      setFiles(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(fileId) {
    setError('')
    setDeletingId(fileId)
    try {
      await deleteFile(fileId)
      setFiles((f) => f.filter((x) => x.id !== fileId))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-gray-700">Загруженные файлы</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {uploading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>+</span>
          )}
          Загрузить файл
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📂</p>
          <p>Нет загруженных файлов</p>
          <p className="text-sm mt-1">Загрузите PDF или TXT для начала работы</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">
                  {f.filename.endsWith('.pdf') ? '📄' : '📝'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.filename}</p>
                  <span
                    className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                      f.indexed
                        ? 'bg-green-100 text-green-700'
                        : f.index_error === 'empty'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {f.indexed
                      ? 'Проиндексирован'
                      : f.index_error === 'empty'
                      ? 'Пустой'
                      : 'Обрабатывается'}
                  </span>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => handleDelete(f.id)}
                  disabled={deletingId === f.id}
                  className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition disabled:opacity-40"
                >
                  {deletingId === f.id ? '...' : 'Удалить'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// --- Вкладка: AI-ассистент ---

function TabAI({ groupId }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim() || loading) return
    const q = question.trim()
    setQuestion('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await askQuestion(groupId, q)
      setMessages((m) => [
        ...m,
        { role: 'ai', text: res.answer, sources: res.sources || [] },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'ai', text: `Ошибка: ${err.message}`, sources: [] },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[520px]">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🤖</p>
            <p>Задайте вопрос по материалам группы</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5'
                  : 'bg-white border rounded-2xl rounded-tl-sm px-4 py-2.5'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.role === 'ai' && msg.sources?.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Источники: {msg.sources.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          placeholder="Введите вопрос..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition"
        >
          Спросить
        </button>
      </form>
    </div>
  )
}

// --- Вкладка: Участники ---

const ASSIGN_ANY_ROLES = ['starosta', 'teacher']
const ASSIGNABLE_ROLES = ['student', 'deputy', 'starosta', 'teacher']

function TabMembers({ groupId, members, myRole, onRoleChanged }) {
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  const canAssignAny = ASSIGN_ANY_ROLES.includes(myRole)
  const canDemoteToStudent = myRole === 'deputy'

  async function handleRoleChange(userId, role) {
    setSavingId(userId)
    setError('')
    try {
      await updateMemberRole(groupId, userId, role)
      onRoleChanged(userId, role)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      {error && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.id}
            onClick={() => setSelectedUserId(m.id)}
            className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {m.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate">{m.name}</span>
            </div>

            {canAssignAny ? (
              <select
                value={m.role}
                disabled={savingId === m.id}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            ) : canDemoteToStudent && m.role !== 'student' ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleRoleChange(m.id, 'student') }}
                disabled={savingId === m.id}
                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 transition disabled:opacity-50"
              >
                {savingId === m.id ? '...' : `${ROLE_LABELS[m.role] ?? m.role} → Студент`}
              </button>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full flex-shrink-0">
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
            )}
          </li>
        ))}
      </ul>

      {selectedUserId && (
        <MemberProfileModal
          groupId={groupId}
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  )
}

// --- Вкладка: Объявления ---

function TabAnnouncements({ groupId, members }) {
  const { user } = useAuth()
  const myRole = members.find((m) => m.id === user?.id)?.role
  const [announcements, setAnnouncements] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState(null)
  const debounceTimer = useRef(null)

  // Загрузка объявлений
  useEffect(() => {
    loadAnnouncements('').finally(() => setInitialLoading(false))
  }, [groupId])

  async function loadAnnouncements(query) {
    setError('')
    try {
      const data = await getAnnouncements(groupId, query)
      setAnnouncements(data)
    } catch (err) {
      setError(err.message)
    }
  }

  // Поиск с debounce
  function handleSearch(query) {
    setSearchQuery(query)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      loadAnnouncements(query)
    }, 500)
  }

  // Добавление тега
  function handleAddTag() {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  // Удаление тега
  function handleRemoveTag(tag) {
    setTags(tags.filter((t) => t !== tag))
  }

  // Создание объявления
  async function handleCreateAnnouncement(e) {
    e.preventDefault()
    if (!content.trim() || sending) return
    setSending(true)
    setError('')
    try {
      await createAnnouncement(groupId, {
        title: title.trim() || null,
        content: content.trim(),
        tags,
      })
      await loadAnnouncements(searchQuery)
      setTitle('')
      setContent('')
      setTags([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  // Начать редактирование
  function startEdit(announcement) {
    setEditingId(announcement.id)
    setEditData({
      title: announcement.title || '',
      content: announcement.content,
      tags: announcement.tags || [],
    })
  }

  // Сохранить редактирование
  async function saveEdit() {
    if (!editData?.content.trim()) return
    setError('')
    try {
      await updateAnnouncement(editingId, {
        title: editData.title.trim() || null,
        content: editData.content.trim(),
        tags: editData.tags,
      })
      await loadAnnouncements(searchQuery)
      setEditingId(null)
      setEditData(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // Отмена редактирования
  function cancelEdit() {
    setEditingId(null)
    setEditData(null)
  }

  // Удаление объявления
  async function handleDelete(announcementId) {
    if (!window.confirm('Вы уверены, что хотите удалить это объявление?')) return
    setError('')
    try {
      await deleteAnnouncement(announcementId)
      await loadAnnouncements(searchQuery)
    } catch (err) {
      setError(err.message)
    }
  }

  if (initialLoading) return <p className="text-gray-400 text-sm">Загрузка...</p>

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Поиск */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Поиск объявлений..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
      />

      {/* Список объявлений */}
      {announcements.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📢</p>
          <p>Объявлений пока нет</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => {
            const canManage = MANAGE_ROLES.includes(myRole)
            const isEditing = editingId === a.id

            if (isEditing) {
              return (
                <li key={a.id} className="bg-white border-2 border-blue-300 rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    placeholder="Заголовок (необязательный)..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <textarea
                    value={editData.content}
                    onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                    placeholder="Содержание..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        placeholder="Добавить тег..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 transition"
                      >
                        Добавить
                      </button>
                    </div>
                    {editData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:bg-blue-200 transition flex items-center gap-1"
                            onClick={() => {
                              setEditData({
                                ...editData,
                                tags: editData.tags.filter((t) => t !== tag),
                              })
                            }}
                          >
                            {tag} ×
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-300 text-gray-800 text-sm rounded-lg hover:bg-gray-400 transition"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!editData.content.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      Сохранить
                    </button>
                  </div>
                </li>
              )
            }

            return (
              <li key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                {/* Заголовок и метаинформация */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {a.title && (
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{a.title}</h3>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-600">{a.author_name}</span>
                      <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(a)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Редактировать"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Содержание */}
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{a.content}</p>

                {/* Теги */}
                {a.tags && a.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {a.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-200 transition"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Форма создания объявления */}
      <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-3 pt-4 border-t border-gray-200">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок (необязательный)..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Содержание объявления..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
        />
        {/* Добавление тегов */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Добавить тег и нажать Enter..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 transition"
            >
              Добавить
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => handleRemoveTag(tag)}
                  className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-200 transition flex items-center gap-1"
                >
                  #{tag} ×
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="self-end bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {sending ? 'Отправка...' : 'Опубликовать'}
        </button>
      </form>
    </div>
  )
}

// --- Вкладка: Расписание ---

function TabSchedule({ groupId, myRole }) {
  const canManage = MANAGE_ROLES.includes(myRole)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState({
    subject: '', teacher: '', day_of_week: 1, start_time: '', end_time: '', room: '',
  })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getScheduleItems(groupId)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [groupId])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.subject.trim() || adding) return
    setAdding(true)
    setError('')
    try {
      await createScheduleItem(groupId, { ...form, day_of_week: Number(form.day_of_week) })
      const updated = await getScheduleItems(groupId)
      setItems(updated)
      setForm({ subject: '', teacher: '', day_of_week: 1, start_time: '', end_time: '', room: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(itemId) {
    setDeletingId(itemId)
    try {
      await deleteScheduleItem(groupId, itemId)
      setItems((prev) => prev.filter((x) => x.id !== itemId))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const grouped = DAY_NAMES.map((name, idx) => ({
    name,
    idx,
    entries: items
      .filter((x) => x.day_of_week === idx + 1)
      .sort((a, b) => (a.start_time > b.start_time ? 1 : -1)),
  })).filter((g) => g.entries.length > 0)

  if (loading) return <p className="text-gray-400 text-sm">Загрузка...</p>

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {grouped.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p>Расписание пока не добавлено</p>
        </div>
      ) : (
        grouped.map((day) => (
          <div key={day.idx}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{day.name}</h3>
            <ul className="space-y-2">
              {day.entries.map((item) => (
                <li key={item.id} className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {item.start_time}–{item.end_time} &nbsp;{item.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[item.teacher, item.room ? `ауд. ${item.room}` : ''].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition disabled:opacity-40"
                    >
                      {deletingId === item.id ? '...' : 'Удалить'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <form onSubmit={handleAdd} className="border-t pt-4 grid grid-cols-2 gap-2">
        <input
          required
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          placeholder="Предмет *"
          className="col-span-2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          value={form.teacher}
          onChange={(e) => setForm((f) => ({ ...f, teacher: e.target.value }))}
          placeholder="Преподаватель"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={form.day_of_week}
          onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {DAY_NAMES.map((d, i) => <option key={i} value={i + 1}>{d}</option>)}
        </select>
        <input
          type="time"
          value={form.start_time}
          onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
          placeholder="Начало"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="time"
          value={form.end_time}
          onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
          placeholder="Конец"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          value={form.room}
          onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
          placeholder="Аудитория"
          className="col-span-2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={adding || !form.subject.trim()}
          className="col-span-2 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {adding ? 'Добавление...' : '+ Добавить занятие'}
        </button>
      </form>
    </div>
  )
}

// --- Главная страница группы ---

export default function GroupPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [group, setGroup] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const myRole = group?.members?.find((m) => m.id === user?.id)?.role

  useEffect(() => {
    Promise.all([getGroup(groupId), getFiles(groupId)])
      .then(([g, f]) => { setGroup(g); setFiles(f) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [groupId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Загрузка...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">
            ← Вернуться назад
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-blue-600 hover:underline mb-3 block"
        >
          ← Назад
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{group?.name}</h1>
        <p className="text-sm text-gray-400 mt-1">Код приглашения: {group?.invite_code}</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 text-sm py-2 rounded-md transition font-medium ${
              activeTab === i
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <TabMaterials groupId={groupId} files={files} setFiles={setFiles} myRole={myRole} />
      )}
      {activeTab === 1 && <TabAI groupId={groupId} />}
      {activeTab === 2 && (
        <TabMembers
          groupId={groupId}
          members={group?.members ?? []}
          myRole={myRole}
          onRoleChanged={(userId, role) =>
            setGroup((g) => ({
              ...g,
              members: g.members.map((m) => (m.id === userId ? { ...m, role } : m)),
            }))
          }
        />
      )}
      {activeTab === 3 && (
        <TabAnnouncements groupId={groupId} members={group?.members ?? []} />
      )}
      {activeTab === 4 && <TabSchedule groupId={groupId} myRole={myRole} />}
    </div>
  )
}
