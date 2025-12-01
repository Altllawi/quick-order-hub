import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  requireRestaurantAccess?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireSuperAdmin = false,
  requireRestaurantAccess,
}) => {
  const { user, loading, isSuperAdmin, restaurantIds } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/select-restaurant" replace />;
  }

  if (requireRestaurantAccess && !isSuperAdmin) {
    if (!restaurantIds.includes(requireRestaurantAccess)) {
      return <Navigate to="/select-restaurant" replace />;
    }
  }

  return <>{children}</>;
};
