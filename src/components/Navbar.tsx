import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Pokeball = () => (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="#e3350d" strokeWidth="2.5"/>
    <path d="M2 24h44" stroke="#e3350d" strokeWidth="2.5"/>
    <circle cx="24" cy="24" r="6" fill="#0f0f0f" stroke="#e3350d" strokeWidth="2.5"/>
    <circle cx="24" cy="24" r="3" fill="#e3350d"/>
    <path d="M2 24C2 12 12 2 24 2C36 2 46 12 46 24" fill="#e3350d" fillOpacity="0.15"/>
  </svg>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
      <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-3">
        <Pokeball />
        <span className="text-lg font-bold tracking-widest uppercase">Tradex</span>
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link to="/" className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors">
              Vendedores
            </Link>
            <Link to={`/u/${user.slug}`} className="text-sm text-[#f4d03f] hover:underline">
              Ver mostruário
            </Link>
            <Link to="/dashboard" className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors">
              {user.name}
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-[#888] hover:text-[#e3350d] transition-colors cursor-pointer"
            >
              Sair
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm text-[#f4d03f] hover:underline">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar
