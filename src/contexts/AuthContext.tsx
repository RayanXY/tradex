import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  slug: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<string | null>;
  register: (name: string, slug: string, email: string, phone: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const fetchProfile = async (userId: string): Promise<User | null> => {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return data as User | null;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (identifier: string, password: string): Promise<string | null> => {
    let email = identifier.trim();

    if (!email.includes("@")) {
      const { data } = await supabase
        .from("users")
        .select("email")
        .or(`slug.eq.${identifier},phone.eq.${identifier}`)
        .maybeSingle();

      if (!data?.email) return "Credenciais inválidas.";
      email = data.email;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return "Credenciais inválidas.";

    return null;
  }

  const register = async (
    name: string,
    slug: string,
    email: string,
    phone: string,
    password: string
  ): Promise<string | null> => {
    const { data: existing } = await supabase
      .from("users")
      .select("slug, phone")
      .or(`slug.eq.${slug},phone.eq.${phone}`);

    if (existing?.some((u) => u.slug === slug)) return "Slug já em uso.";
    if (existing?.some((u) => u.phone === phone)) return "Telefone já cadastrado.";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, slug, phone } },
    });

    if (error) {
      const msg = error.message.toLowerCase();

      console.log("ERROR", msg);

      if (msg.includes("already registered")) return "Email já cadastrado.";
      if (msg.includes("password")) return "Senha muito curta. Use pelo menos 6 caracteres.";
      return "Erro ao cadastrar.";
    }

    if (data.user?.identities?.length === 0) {
      return "Email já cadastrado.";
    }

    return null
  }

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
