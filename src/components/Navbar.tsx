import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Pokeball from './ui/Pokeball';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="border-b border-[#2a2a2a] px-6 py-4">
      <div className="flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-3">
          <Pokeball />
          <span className="text-lg font-bold tracking-widest uppercase">Tradex</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/" className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors">Vendedores</Link>
              {user.role !== 'admin' && (
                <Link to={`/u/${user.slug}`} className="text-sm text-[#f4d03f] hover:underline">Ver mostruário</Link>
              )}
              <Link to={user.role !== 'admin' ? '/dashboard' : '/admin'} className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors">
                {user.name}
              </Link>
              <button onClick={handleLogout} className="text-sm text-[#888] hover:text-[#e3350d] transition-colors cursor-pointer">
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm text-[#f4d03f] hover:underline">Entrar</Link>
          )}
        </div>

        {/* Hamburguer */}
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="md:hidden flex flex-col gap-1.5 cursor-pointer p-1"
        >
          <span className={`block w-6 h-0.5 bg-[#f0f0f0] transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-[#f0f0f0] transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-[#f0f0f0] transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden flex flex-col gap-4 pt-4 border-t border-[#2a2a2a] mt-4">
          {user ? (
            <>
              <Link to="/" onClick={closeMenu} className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors">Vendedores</Link>
              {user.role !== 'admin' && (
                <Link to={`/u/${user.slug}`} onClick={closeMenu} className="text-sm text-[#f4d03f] hover:underline">Ver mostruário</Link>
              )}
              <Link to={user.role !== 'admin' ? '/dashboard' : '/admin'} onClick={closeMenu} className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors">
                {user.name}
              </Link>
              <button onClick={handleLogout} className="text-left text-sm text-[#888] hover:text-[#e3350d] transition-colors cursor-pointer">
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" onClick={closeMenu} className="text-sm text-[#f4d03f] hover:underline">Entrar</Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar
