import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PWA() {
  const { restaurantId, tableId } = useParams();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [table, setTable] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [restaurantId, tableId]);

  const loadData = async () => {
    const { data: rest } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
    const { data: tbl } = await supabase.from('tables').select('*').eq('id', tableId).single();
    const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('is_available', true);
    
    setRestaurant(rest);
    setTable(tbl);
    setMenuItems(items || []);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            {restaurant?.logo_url && <img src={restaurant.logo_url} alt={restaurant.name} className="h-16 mx-auto mb-4" />}
            <CardTitle className="text-2xl">{restaurant?.name}</CardTitle>
            <p className="text-muted-foreground">{table?.name}</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader><CardTitle>Menu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {menuItems.length === 0 ? (
              <p className="text-center text-muted-foreground">No items available</p>
            ) : (
              menuItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  </div>
                  <p className="font-bold text-primary">${Number(item.price).toFixed(2)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground">Ordering via this PWA is coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
