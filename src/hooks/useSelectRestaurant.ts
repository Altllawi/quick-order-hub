import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
}

export function useSelectRestaurant() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadRestaurants = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: userRestaurants } = await supabase
        .from('restaurant_users')
        .select('restaurant_id')
        .eq('user_id', user.id);

      const restaurantIds = userRestaurants?.map(r => r.restaurant_id) || [];

      if (restaurantIds.length > 0) {
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name, logo_url')
          .in('id', restaurantIds);

        if (error) throw error;
        setRestaurants(data || []);

        // Auto-redirect if user has exactly one restaurant and is not super admin
        if (data && data.length === 1 && !isSuperAdmin) {
          navigate(`/dashboard/${data[0].id}`);
          return;
        }
      } else {
        setRestaurants([]);
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (!authLoading && user) {
      loadRestaurants();
    }
  }, [user, authLoading, navigate, loadRestaurants]);

  const selectRestaurant = useCallback((restaurantId: string) => {
    navigate(`/dashboard/${restaurantId}`);
  }, [navigate]);

  const goToSuperAdmin = useCallback(() => {
    navigate('/super');
  }, [navigate]);

  return {
    // State
    restaurants,
    loading: authLoading || loading,
    isSuperAdmin,
    
    // Actions
    selectRestaurant,
    goToSuperAdmin,
  };
}
