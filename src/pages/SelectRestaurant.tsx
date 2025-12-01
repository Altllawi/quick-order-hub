import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function SelectRestaurant() {
  const { user, isSuperAdmin, restaurantIds, loading: authLoading } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (!authLoading && user) {
      loadRestaurants();
    }
  }, [user, authLoading, navigate]);

  const loadRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, logo_url')
        .in('id', restaurantIds);

      if (error) throw error;

      setRestaurants(data || []);

      // Auto-redirect if user has exactly one restaurant
      if (data && data.length === 1) {
        navigate(`/dashboard/${data[0].id}`);
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Restaurant</CardTitle>
            <CardDescription>Choose a restaurant to manage</CardDescription>
          </CardHeader>
          <CardContent>
            {restaurants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You are not assigned to any restaurant yet.
                </p>
                {isSuperAdmin && (
                  <Button onClick={() => navigate('/super')}>
                    Go to Super Admin Panel
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.map((restaurant) => (
                  <Card
                    key={restaurant.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/dashboard/${restaurant.id}`)}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      {restaurant.logo_url ? (
                        <img
                          src={restaurant.logo_url}
                          alt={restaurant.name}
                          className="w-20 h-20 object-contain mb-4"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center mb-4">
                          <span className="text-2xl font-bold text-muted-foreground">
                            {restaurant.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {isSuperAdmin && restaurants.length > 0 && (
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={() => navigate('/super')}>
                  Open Super Admin Panel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
