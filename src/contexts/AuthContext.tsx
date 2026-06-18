import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

interface User {
  id: string,
  name: string,
  phone: string,
}

interface AuthContextType {
  user: User | null,
  loading: boolean,
  login: (phone: string, password: string) => Promise<string | null>,
  register: (name: string, phone: string, password: string) => Promise<string | null>,
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("tradex_user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (phone: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .eq("password_hash", password)
      .single();

    if (error || !data) return "Telefone ou senha inválidos."

    const u: User = { id: data.id, name: data.name, phone: data.phone };
    setUser(u);
    localStorage.setItem("tradex_user", JSON.stringify(u));
    return null
  }

  const register = async (name: string, phone: string, password: string): Promise<string | null> => {
    const { error } = await supabase
      .from('users')
      .insert({ name, phone, password_hash: password })

    if (error) return 'Telefone já cadastrado.'
    return null
  }

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tradex_user');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
