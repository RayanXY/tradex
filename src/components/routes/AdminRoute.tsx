import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <p className="text-[#555] text-sm">Carregando...</p>
    </div>
  );

  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default AdminRoute
