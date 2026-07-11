﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getGroup, getFiles, uploadFile, deleteFile, downloadFile, updateFileTags, indexFile, askQuestion,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getScheduleItems, createScheduleItem, deleteScheduleItem,
  updateMemberRole,
  getSubjects, createSubject, deleteSubject, getSubjectFiles,
  getLessons, createLesson, updateLesson, deleteLesson,
  getLessonFiles, uploadLessonFile, deleteLessonFile, downloadLessonFile, indexLessonFile,
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

const TABS = ['Материалы', 'Предметы', 'AI-ассистент', 'Расписание', 'Объявления', 'Участники']

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
  const [downloadingId, setDownloadingId] = useState(null)
  const [uploadTags, setUploadTags] = useState('')
  const [editingTagsId, setEditingTagsId] = useState(null)
  const [tagsDraft, setTagsDraft] = useState('')
  const [savingTags, setSavingTags] = useState(false)
  const [error, setError] = useState('')

  async function handleDownload(file) {
    setError('')
    setDownloadingId(file.id)
    try {
      await downloadFile(file.id, file.filename)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const uploaded = await uploadFile(groupId, file, uploadTags.trim())
      try {
        await indexFile(uploaded.id)
      } catch (indexErr) {
        setError(indexErr.message)
      }
      const updated = await getFiles(groupId)
      setFiles(updated)
      setUploadTags('')
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

  function startEditTags(file) {
    setEditingTagsId(file.id)
    setTagsDraft((file.tags || []).join(', '))
  }

  async function saveTags(fileId) {
    setSavingTags(true)
    setError('')
    try {
      const parsed = tagsDraft
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
      const updated = await updateFileTags(fileId, parsed)
      setFiles((fs) => fs.map((f) => (f.id === fileId ? updated : f)))
      setEditingTagsId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingTags(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}

      <div className="flex justify-between items-center mb-4 gap-3">
        <h2 className="font-semibold text-gray-700">Загруженные файлы</h2>
        <div className="flex items-center gap-2">
          <input
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
            placeholder="Теги через запятую (необязательно)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
          >
            {uploading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>+</span>
            )}
            Загрузить файл
          </button>
        </div>
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

                  {editingTagsId === f.id ? (
                    <div className="flex items-center gap-1 mt-1.5">
                      <input
                        autoFocus
                        value={tagsDraft}
                        onChange={(e) => setTagsDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveTags(f.id)}
                        placeholder="Теги через запятую"
                        className="border border-gray-300 rounded px-2 py-0.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={() => saveTags(f.id)}
                        disabled={savingTags}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {savingTags ? '...' : 'Сохранить'}
                      </button>
                      <button
                        onClick={() => setEditingTagsId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center flex-wrap gap-1 mt-1.5">
                      {(f.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                      {canManage && (
                        <button
                          onClick={() => startEditTags(f)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          {(f.tags || []).length > 0 ? 'изменить теги' : '+ теги'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(f)}
                  disabled={downloadingId === f.id}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition disabled:opacity-40"
                >
                  {downloadingId === f.id ? '...' : 'Скачать'}
                </button>
                {canManage && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={deletingId === f.id}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition disabled:opacity-40"
                  >
                    {deletingId === f.id ? '...' : 'Удалить'}
                  </button>
                )}
              </div>
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
  const [files, setFiles] = useState([])
  const [lessonFiles, setLessonFiles] = useState([])
  const [selectedFileId, setSelectedFileId] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    getFiles(groupId)
      .then((data) => setFiles(data.filter((f) => f.indexed && !f.index_error)))
      .catch(() => {})
    getSubjectFiles(groupId)
      .then((data) => setLessonFiles(data.filter((f) => f.indexed && !f.index_error)))
      .catch(() => {})
  }, [groupId])

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim() || loading) return
    const q = question.trim()
    setQuestion('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await askQuestion(groupId, q, selectedFileId || null)
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
      <select
        value={selectedFileId}
        onChange={(e) => setSelectedFileId(e.target.value)}
        className="mb-3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 self-start"
      >
        <option value="">Все материалы</option>
        {files.length > 0 && (
          <optgroup label="Материалы">
            {files.map((f) => (
              <option key={f.id} value={f.id}>{f.filename}</option>
            ))}
          </optgroup>
        )}
        {lessonFiles.length > 0 && (
          <optgroup label="Предметы">
            {lessonFiles.map((f) => (
              <option key={f.id} value={f.id}>{f.filename}</option>
            ))}
          </optgroup>
        )}
      </select>

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

// --- Вкладка: Предметы ---

const LESSON_TYPE_LABELS = { lecture: 'Лекции', practical: 'Практические', general: 'Общие' }
const LESSON_TYPES = ['lecture', 'practical', 'general']

function LessonDetail({ lesson, myRole, onUpdate, onClose }) {
  const canManage = MANAGE_ROLES.includes(myRole)
  const fileInputRef = useRef(null)
  const [notes, setNotes] = useState(lesson.notes || '')
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getLessonFiles(lesson.id)
      .then(setFiles)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingFiles(false))
  }, [lesson.id])

  async function saveNotes() {
    if (notes === lesson.notes) return
    setSaving(true)
    try {
      const updated = await updateLesson(lesson.id, { notes })
      onUpdate(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const uploaded = await uploadLessonFile(lesson.id, file)
      // Пытаемся проиндексировать для AI-ассистента — молча, не всякий
      // файл (csv, картинка) можно превратить в текст, и это ожидаемо
      try {
        await indexLessonFile(lesson.id, uploaded.id)
      } catch (indexErr) {
        // не показываем ошибку — отсутствие текста не проблема пользователя
      }
      const refreshed = await getLessonFiles(lesson.id)
      setFiles(refreshed)
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDeleteFile(fileId) {
    if (!window.confirm('Удалить файл?')) return
    try {
      await deleteLessonFile(lesson.id, fileId)
      setFiles((f) => f.filter((x) => x.id !== fileId))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDownloadFile(file) {
    try {
      await downloadLessonFile(lesson.id, file.id, file.filename)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            {LESSON_TYPE_LABELS[lesson.type]} №{lesson.number}
            {lesson.title && <span className="text-gray-600 font-normal ml-2">— {lesson.title}</span>}
          </h3>
          {lesson.date && (
            <p className="text-xs text-gray-400 mt-0.5">{lesson.date}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>

      {error && <div className="p-2 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Заметки</label>
        {canManage ? (
          <>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              placeholder="Введите заметки к занятию..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex justify-end mt-1">
              <button
                onClick={saveNotes}
                disabled={saving || notes === lesson.notes}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition"
              >
                {saving ? 'Сохранение...' : 'Сохранить заметки'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 min-h-[2.5rem]">
            {notes || <span className="text-gray-400">Заметок пока нет</span>}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-500">Файлы</label>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {uploading ? 'Загрузка...' : '+ Прикрепить файл'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>

        {loadingFiles ? (
          <p className="text-xs text-gray-400">Загрузка файлов...</p>
        ) : files.length === 0 ? (
          <p className="text-xs text-gray-400">Нет прикреплённых файлов</p>
        ) : (
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700 truncate">{f.filename}</span>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownloadFile(f)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Скачать
                  </button>
                  {canManage && (
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SubjectLessons({ subject, myRole, onBack }) {
  const canManage = MANAGE_ROLES.includes(myRole)
  const [activeType, setActiveType] = useState('lecture')
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openLessonId, setOpenLessonId] = useState(null)
  const [form, setForm] = useState({ number: '', date: '', title: '', notes: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setLoading(true)
    getLessons(subject.id, activeType)
      .then(setLessons)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [subject.id, activeType])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.number || adding) return
    setAdding(true)
    setError('')
    try {
      const created = await createLesson(subject.id, {
        type: activeType,
        number: Number(form.number),
        date: form.date || null,
        title: form.title.trim() || null,
        notes: form.notes.trim() || null,
      })
      setLessons((l) => [...l, created].sort((a, b) => a.number - b.number))
      setForm({ number: '', date: '', title: '', notes: '' })
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteLesson(lessonId) {
    if (!window.confirm('Удалить занятие?')) return
    try {
      await deleteLesson(lessonId)
      setLessons((l) => l.filter((x) => x.id !== lessonId))
      if (openLessonId === lessonId) setOpenLessonId(null)
    } catch (e) {
      setError(e.message)
    }
  }

  const openLesson = lessons.find((l) => l.id === openLessonId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Назад
        </button>
        <h2 className="font-semibold text-gray-800">{subject.name}</h2>
        {subject.semester && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{subject.semester}</span>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {LESSON_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => { setActiveType(t); setOpenLessonId(null) }}
            className={`flex-1 text-sm py-1.5 rounded-md transition font-medium ${
              activeType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {LESSON_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {openLesson ? (
        <LessonDetail
          lesson={openLesson}
          myRole={myRole}
          onUpdate={(updated) => setLessons((l) => l.map((x) => x.id === updated.id ? updated : x))}
          onClose={() => setOpenLessonId(null)}
        />
      ) : (
        <>
          {loading ? (
            <p className="text-gray-400 text-sm">Загрузка...</p>
          ) : lessons.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📖</p>
              <p className="text-sm">Нет занятий в этом разделе</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition"
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => setOpenLessonId(lesson.id)}
                  >
                    <span className="text-sm font-medium text-gray-800">
                      №{lesson.number}
                      {lesson.title && <span className="text-gray-500 font-normal ml-2">— {lesson.title}</span>}
                    </span>
                    {lesson.date && (
                      <span className="text-xs text-gray-400 ml-3">{lesson.date}</span>
                    )}
                  </button>
                  {canManage && (
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition flex-shrink-0"
                    >
                      Удалить
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAdd} className="border-t pt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                placeholder="№ *"
                required
                className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Заголовок (необязательно)"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Заметки (необязательно)"
              rows={2}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <button
              type="submit"
              disabled={adding || !form.number}
              className="self-end bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {adding ? 'Добавление...' : '+ Добавить занятие'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

function TabSubjects({ groupId, myRole }) {
  const canManage = MANAGE_ROLES.includes(myRole)
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [openSubjectId, setOpenSubjectId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', semester: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadSubjects()
  }, [groupId])

  async function loadSubjects() {
    setLoading(true)
    try {
      const data = await getSubjects(groupId)
      setSubjects(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim() || adding) return
    setAdding(true)
    setError('')
    try {
      const created = await createSubject(groupId, {
        name: form.name.trim(),
        semester: form.semester.trim() || null,
      })
      setSubjects((s) => [...s, created])
      setForm({ name: '', semester: '' })
      setShowAddForm(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteSubject(subjectId) {
    if (!window.confirm('Удалить предмет и все его занятия?')) return
    try {
      await deleteSubject(subjectId)
      setSubjects((s) => s.filter((x) => x.id !== subjectId))
      if (openSubjectId === subjectId) setOpenSubjectId(null)
    } catch (e) {
      setError(e.message)
    }
  }

  const openSubject = subjects.find((s) => s.id === openSubjectId)

  const semesters = [...new Set(subjects.map((s) => s.semester).filter(Boolean))]
  const filtered = semesterFilter
    ? subjects.filter((s) => s.semester === semesterFilter)
    : subjects

  if (loading) return <p className="text-gray-400 text-sm">Загрузка...</p>

  if (openSubject) {
    return (
      <SubjectLessons
        subject={openSubject}
        myRole={myRole}
        onBack={() => setOpenSubjectId(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      <div className="flex items-center gap-3">
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Все семестры</option>
          {semesters.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="ml-auto bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showAddForm ? 'Отмена' : '+ Добавить предмет'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 border rounded-lg p-4 flex flex-col gap-3">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Название предмета *"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            value={form.semester}
            onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
            placeholder="Семестр (напр. Осень 2024)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={adding || !form.name.trim()}
            className="self-end bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {adding ? 'Сохранение...' : 'Создать'}
          </button>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p>{semesterFilter ? 'Нет предметов в этом семестре' : 'Предметов пока нет'}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition"
            >
              <button
                className="flex-1 text-left"
                onClick={() => setOpenSubjectId(s.id)}
              >
                <span className="text-sm font-medium text-gray-800">{s.name}</span>
                {s.semester && (
                  <span className="ml-3 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s.semester}</span>
                )}
              </button>
              {canManage && (
                <button
                  onClick={() => handleDeleteSubject(s.id)}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition flex-shrink-0"
                >
                  Удалить
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
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
      {activeTab === 1 && <TabSubjects groupId={groupId} myRole={myRole} />}
      {activeTab === 2 && <TabAI groupId={groupId} />}
      {activeTab === 3 && <TabSchedule groupId={groupId} myRole={myRole} />}
      {activeTab === 4 && (
        <TabAnnouncements groupId={groupId} members={group?.members ?? []} />
      )}
      {activeTab === 5 && (
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
    </div>
  )
}
