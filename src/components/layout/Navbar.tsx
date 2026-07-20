import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Pokeball from '../ui/Pokeball';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setMobileSearchOpen(false);
    setMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  return (
    <header className="border-b border-[#2a2a2a] px-6 py-4">
      <div className="flex items-center gap-4">

        {/* Logo */}
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-3 shrink-0">
          <Pokeball />
          <span className="text-lg font-bold tracking-widest uppercase">Tradex</span>
        </Link>

        {/* Busca desktop */}
        {user && (
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-auto">
            <div className="flex w-full">
              <input
                type="text"
                placeholder="Buscar carta..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] border-r-0 rounded-l-lg px-4 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
              />
              <button
                type="submit"
                className="bg-[#1a1a1a] border border-[#2a2a2a] border-l-0 rounded-r-lg px-4 py-2 text-[#888] hover:text-[#f0f0f0] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </div>
          </form>
        )}

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-4 shrink-0 ml-auto">
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

        {/* Mobile: lupa + hamburguer */}
        {user && (
          <div className="md:hidden flex items-center gap-3 ml-auto">
            <button
              onClick={() => { setMobileSearchOpen(prev => !prev); setMenuOpen(false); }}
              className="text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer p-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button
              onClick={() => { setMenuOpen(prev => !prev); setMobileSearchOpen(false); }}
              className="flex flex-col gap-1.5 cursor-pointer p-1"
            >
              <span className={`block w-6 h-0.5 bg-[#f0f0f0] transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-6 h-0.5 bg-[#f0f0f0] transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-0.5 bg-[#f0f0f0] transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Mobile: barra de busca expansível */}
      {user && mobileSearchOpen && (
        <form onSubmit={handleSearch} className="md:hidden mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Buscar carta..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#e3350d] transition-colors"
          />
          <button
            type="submit"
            className="bg-[#e3350d] hover:bg-[#c42d0b] text-white rounded-lg px-4 py-2.5 text-sm cursor-pointer shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>
      )}

      {/* Mobile menu de navegação */}
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
