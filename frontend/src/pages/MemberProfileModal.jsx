import { useEffect, useState } from 'react'
import { getMemberProfile } from '../api'

const ROLE_LABELS = {
  student: 'Студент',
  starosta: 'Староста',
  deputy: 'Зам. старосты',
  teacher: 'Преподаватель',
}

export default function MemberProfileModal({ groupId, userId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMemberProfile(groupId, userId)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [groupId, userId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Профиль участника</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">Загрузка...</p>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <span className="block text-gray-500 mb-0.5">Имя</span>
              <span className="font-medium text-gray-900">{profile.name}</span>
            </div>
            <div>
              <span className="block text-gray-500 mb-0.5">Роль</span>
              <span className="font-medium text-gray-900">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 mb-0.5">Email</span>
              <span className="font-medium text-gray-900">{profile.email}</span>
            </div>
            <div>
              <span className="block text-gray-500 mb-0.5">Telegram</span>
              <span className="font-medium text-gray-900">{profile.telegram || '—'}</span>
            </div>
            <div>
              <span className="block text-gray-500 mb-0.5">Телефон</span>
              <span className="font-medium text-gray-900">{profile.phone || '—'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
