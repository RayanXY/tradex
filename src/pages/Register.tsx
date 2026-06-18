import { useState  } from 'react'
import type { SubmitEvent  } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Register = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SubmitEvent ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await register(name, phone, whatsapp, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      await login(phone, password);
      navigate('/inventory');
    }
  }

  return (
    <div>
      <h1>Cadastro</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nome / Apelido"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Telefone"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="WhatsApp (com DDD)"
          value={whatsapp}
          onChange={e => setWhatsapp(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>
      <p>Já tem conta? <Link to="/login">Entrar</Link></p>
    </div>
  )
}

export default Register
