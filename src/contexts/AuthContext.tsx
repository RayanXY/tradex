import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import bcrypt from "bcryptjs";

interface User {
  id: string,
  name: string,
  phone: string,
  email: string,
  slug: string,
  role: string
}

interface AuthContextType {
  user: User | null,
  loading: boolean,
  login: (identifier: string, password: string) => Promise<string | null>,
  register: (name: string, slug: string, email: string, phone: string, password: string) => Promise<string | null>
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

  const login = async (identifier: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .or(`email.eq.${identifier},slug.eq.${identifier},phone.eq.${identifier}`)
      .single();

    if (error || !data) return "Credenciais inválidas."

    const valid = await bcrypt.compare(password, data.password_hash);
    if (!valid) return "Credenciais inválidas."

    const u: User = { id: data.id, name: data.name, phone: data.phone, email: data.email, slug: data.slug, role: data.role };
    setUser(u);

    localStorage.setItem("tradex_user", JSON.stringify(u));
    
    return null
  }

  const register = async (name: string, slug: string, email: string, phone: string, password: string): Promise<string | null> => {
    const hash = await bcrypt.hash(password, 10);
    const { error } = await supabase
      .from('users')
      .insert({ name, slug, email, phone, password_hash: hash })

    if (error) {
      if (error.message.includes("slug")) return "Slug já em uso."
      if (error.message.includes("email")) return "Email já cadastrado."
      if (error.message.includes("phone")) return "Telefone já cadastrado."
      return "Erro ao cadastrar."
    }
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
