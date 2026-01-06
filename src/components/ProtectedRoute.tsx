import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireSuperAdmin = false,
}) => {
  const { user, loading, isSuperAdmin } = useAuth();
  const { slug } = useParams();
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRestaurantAccess = async () => {
      if (!slug || !user) {
        setHasAccess(true);
        return;
      }

      setCheckingAccess(true);
      try {
        // Super admins have access to all restaurants
        if (isSuperAdmin) {
          setHasAccess(true);
          return;
        }

        // First get the restaurant ID from slug
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (!restaurant) {
          setHasAccess(false);
          return;
        }

        // Check if user has access to this restaurant
        const { data } = await supabase
          .from('restaurant_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurant.id)
          .maybeSingle();

        setHasAccess(!!data);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    if (!loading && user) {
      checkRestaurantAccess();
    }
  }, [user, loading, slug, isSuperAdmin]);

  if (loading || checkingAccess) {
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

  if (slug && hasAccess === false) {
    return <Navigate to="/select-restaurant" replace />;
  }

  return <>{children}</>;
};
