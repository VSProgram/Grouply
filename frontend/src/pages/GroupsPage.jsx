import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { getMyGroups, createGroup, joinGroup } from '../api'
import ProfileModal from './ProfileModal'

export default function GroupsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showProfile, setShowProfile] = useState(false)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  useEffect(() => {
    getMyGroups()
      .then(setGroups)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    try {
      const group = await createGroup(newGroupName.trim())
      setGroups((g) => [...g, { ...group, role: 'starosta' }])
      setNewGroupName('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    try {
      const res = await joinGroup(inviteCode.trim())
      const updated = await getMyGroups()
      setGroups(updated)
      setInviteCode('')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Мои группы</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">{user?.name}</span>
          <button
            onClick={() => setShowProfile(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Мой профиль
          </button>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">
            Выйти
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}

      {/* Создать группу */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Название новой группы"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Создать
        </button>
      </form>

      {/* Вступить в группу */}
      <form onSubmit={handleJoin} className="flex gap-2 mb-8">
        <input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Код приглашения"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Вступить
        </button>
      </form>

      {/* Список групп */}
      {loading ? (
        <p className="text-gray-500">Загрузка...</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500">У вас пока нет групп.</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li
              key={g.id}
              onClick={() => navigate(`/group/${g.id}`)}
              className="bg-white shadow rounded-lg px-5 py-4 cursor-pointer hover:shadow-md transition flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{g.name}</p>
                <p className="text-xs text-gray-400 mt-1">Код: {g.invite_code}</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{g.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
