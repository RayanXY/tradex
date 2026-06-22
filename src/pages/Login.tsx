import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { SubmitEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await login(identifier, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" stroke="#e3350d" strokeWidth="2.5"/>
            <path d="M2 24h44" stroke="#e3350d" strokeWidth="2.5"/>
            <circle cx="24" cy="24" r="6" fill="#0f0f0f" stroke="#e3350d" strokeWidth="2.5"/>
            <circle cx="24" cy="24" r="3" fill="#e3350d"/>
            <path d="M2 24C2 12 12 2 24 2C36 2 46 12 46 24" fill="#e3350d" fillOpacity="0.15"/>
          </svg>
          <Link to="/" className="mt-3 text-xl font-bold tracking-widest text-[#f0f0f0] uppercase">Tradex</Link>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8">
          <h1 className="text-lg font-semibold text-[#f0f0f0] mb-6">Entrar</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Email, apelino ou telefone"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[#f0f0f0] placeholder-[#555] text-sm focus:outline-none focus:border-[#e3350d] transition-colors"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[#f0f0f0] placeholder-[#555] text-sm focus:outline-none focus:border-[#e3350d] transition-colors"
            />
            {error && <p className="text-[#e3350d] text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-[#e3350d] hover:bg-[#c42d0b] disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 text-sm transition-colors mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#888] mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-[#f4d03f] hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
