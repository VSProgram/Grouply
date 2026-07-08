import { useEffect, useState } from 'react'
import { getMe, updateProfile } from '../api'

export default function ProfileModal({ onClose }) {
  const [form, setForm] = useState({ name: '', telegram: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMe()
      .then((me) => setForm({ name: me.name || '', telegram: me.telegram || '', phone: me.phone || '' }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await updateProfile(form)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Мой профиль</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">Загрузка...</p>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telegram</label>
              <input
                value={form.telegram}
                onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
                placeholder="@username"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+7 999 000-00-00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={saving || saved}
              className="mt-1 bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition font-medium"
            >
              {saved ? '✓ Сохранено!' : saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
