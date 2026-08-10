import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext"

const AddCardsFAB = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Link
      to="/search"
      className="fixed bottom-6 right-6 md:right-[max(1.5rem,calc(50vw-28rem))] z-30 w-14 h-14 bg-[#e3350d] hover:bg-[#c42d0b] text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-light transition-colors"
      title="Adicionar cartas"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </Link>
  )
}

export default AddCardsFAB
