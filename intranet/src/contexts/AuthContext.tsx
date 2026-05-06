import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  nombre: string;
  rol: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token_intranet'));
  const [user, setUser] = useState<User | null>(
    JSON.parse(localStorage.getItem('user_intranet') || 'null')
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem('token_intranet', token);
    } else {
      localStorage.removeItem('token_intranet');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user_intranet', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_intranet');
    }
  }, [user]);

  const login = async (username: string, password: string) => {
    const response = await axios.post('/api/auth/login', { username, password });
    const { access_token, user: userData } = response.data;
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}