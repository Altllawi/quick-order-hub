import { useEffect, useState } from 'react';
import { Outlet, useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { applyRestaurantTheme, RestaurantTheme, setFavicon, resetFavicon } from '@/services/themeService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingBag,
  Menu as MenuIcon,
  QrCode,
  Settings,
  Users,
  Palette,
  LogOut,
  ChevronLeft,
} from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export default function RestaurantDashboard() {
  const { restaurantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (restaurantId) {
      loadRestaurant();
    }

    return () => {
      resetFavicon();
    };
  }, [restaurantId]);

  const loadRestaurant = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (error) throw error;

      setRestaurant(data);

      // Apply theme and favicon
      if (data) {
        applyRestaurantTheme({
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          accent_color: data.accent_color,
        });
        setFavicon(data.logo_url);
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '', label: 'Overview', icon: LayoutDashboard },
    { path: 'orders', label: 'Orders', icon: ShoppingBag },
    { path: 'menu', label: 'Menu', icon: MenuIcon },
    { path: 'tables', label: 'Tables & QR', icon: QrCode },
    { path: 'theme', label: 'Theme', icon: Palette },
    { path: 'admins', label: 'Admins', icon: Users },
    { path: 'settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    const fullPath = `/dashboard/${restaurantId}${path ? `/${path}` : ''}`;
    return location.pathname === fullPath;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-card border-r border-border transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center space-x-3">
              {restaurant?.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">
                    {restaurant?.name?.charAt(0) || 'R'}
                  </span>
                </div>
              )}
              <div>
                <h2 className="font-semibold text-sm">{restaurant?.name || 'Loading...'}</h2>
                <p className="text-xs text-muted-foreground">Restaurant</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
          >
            <ChevronLeft className={`h-4 w-4 ${!sidebarOpen && 'rotate-180'}`} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={`/dashboard/${restaurantId}${item.path ? `/${item.path}` : ''}`}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/select-restaurant')}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {sidebarOpen && 'Back to Restaurants'}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {sidebarOpen && 'Sign Out'}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet context={{ restaurant, refreshRestaurant: loadRestaurant }} />
        </div>
      </main>
    </div>
  );
}
