import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('dv_token'));
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('dv_admin');
    return stored ? JSON.parse(stored) : null;
  });

  const value = useMemo(
    () => ({
      token,
      admin,
      login(session) {
        localStorage.setItem('dv_token', session.token);
        localStorage.setItem('dv_admin', JSON.stringify(session.admin));
        setToken(session.token);
        setAdmin(session.admin);
      },
      logout() {
        localStorage.removeItem('dv_token');
        localStorage.removeItem('dv_admin');
        setToken(null);
        setAdmin(null);
      }
    }),
    [token, admin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
