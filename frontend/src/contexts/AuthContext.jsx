import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '@/api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      getMe()
        .then((r) => {
          // Extract user object properly whether nested as r.data.data.user, r.data.user, or r.data.data
          const userData = r.data?.data?.user || r.data?.user || (r.data?.data?.id ? r.data.data : r.data);
          if (userData && userData.id) {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    // Ensure clean flat user object
    const cleanUser = userData?.user || userData;
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(cleanUser));
    setUser(cleanUser);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
