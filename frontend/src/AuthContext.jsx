import { createContext, useContext, useEffect, useState } from 'react'
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Восстановить сессию при старте
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    await apiLogin(email, password)
    const me = await getMe()
    setUser(me)
    return me
  }

  async function register(name, email, password) {
    await apiRegister(name, email, password)
    const me = await getMe()
    setUser(me)
    return me
  }

  function logout() {
    apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
