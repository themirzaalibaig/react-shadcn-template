export const useAuth = () => {
  const token = localStorage.getItem('access_token') || ''
  const isAuthenticated = !!token
  const login = (t: string) => {
    localStorage.setItem('access_token', t)
  }
  const logout = () => {
    localStorage.removeItem('access_token')
  }
  return { isAuthenticated, login, logout }
}