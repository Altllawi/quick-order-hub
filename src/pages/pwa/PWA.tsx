import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, ShoppingCart, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { applyRestaurantTheme, resetRestaurantTheme } from '@/services/themeService';

interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  accent_color: string | null;
}

interface TableData {
  id: string;
  name: string;
  restaurant_id: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface OrderItem {
  id: string;
  menu_item_id: string | null;
  name_at_order: string;
  price_at_order: number;
  quantity: number;
  notes: string | null;
}

const CART_KEY_PREFIX = 'pwa_cart_';

export default function PWA() {
  const { restaurantId, tableId } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeOrderItems, setActiveOrderItems] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canOrder = Boolean(restaurantId && tableId);
  const cartKey = `${CART_KEY_PREFIX}${restaurantId}_${tableId}`;

  // Load cart from localStorage
  const loadCart = useCallback(() => {
    if (!canOrder) return;
    try {
      const saved = localStorage.getItem(cartKey);
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading cart:', e);
    }
  }, [cartKey, canOrder]);

  // Save cart to localStorage
  const saveCart = useCallback((items: CartItem[]) => {
    if (!canOrder) return;
    try {
      localStorage.setItem(cartKey, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }, [cartKey, canOrder]);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);
    if (canOrder) {
      localStorage.removeItem(cartKey);
    }
  }, [cartKey, canOrder]);

  useEffect(() => {
    loadData();
    loadCart();

    return () => {
      resetRestaurantTheme();
    };
  }, [restaurantId, tableId]);

  useEffect(() => {
    saveCart(cart);
  }, [cart, saveCart]);

  // Subscribe to order updates
  useEffect(() => {
    if (!activeOrder) return;

    const channel = supabase
      .channel(`order_${activeOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrder.id}`,
        },
        (payload) => {
          setActiveOrder(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load restaurant
      const { data: rest, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (restError) throw restError;
      if (!rest) {
        toast.error('Restaurant not found');
        setLoading(false);
        return;
      }

      setRestaurant(rest);

      // Apply theme
      if (rest.primary_color || rest.secondary_color || rest.background_color || rest.accent_color) {
        applyRestaurantTheme({
          primary_color: rest.primary_color || '#3b82f6',
          secondary_color: rest.secondary_color || '#8b5cf6',
          background_color: rest.background_color || '#ffffff',
          accent_color: rest.accent_color || '#10b981',
        });
      }

      // Load table if tableId provided
      if (tableId) {
        const { data: tbl, error: tblError } = await supabase
          .from('tables')
          .select('*')
          .eq('id', tableId)
          .maybeSingle();

        if (tblError) throw tblError;
        
        // Validate table belongs to restaurant
        if (tbl && tbl.restaurant_id === restaurantId) {
          setTable(tbl);
          // Check for active order
          await loadActiveOrder();
        } else {
          setTable(null);
        }
      }

      // Load categories
      const { data: cats, error: catsError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('position');

      if (catsError) throw catsError;
      setCategories(cats || []);

      // Load available menu items
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('position');

      if (itemsError) throw itemsError;
      setMenuItems(items || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveOrder = async () => {
    if (!restaurantId || !tableId) return;

    try {
      // Get most recent pending order for this table
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('table_id', tableId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (orderError) throw orderError;

      if (order) {
        setActiveOrder(order);
        // Load order items
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        if (itemsError) throw itemsError;
        setActiveOrderItems(items || []);
        
        // Sync cart with order items
        const cartItems: CartItem[] = (items || []).map(item => ({
          menuItemId: item.menu_item_id || '',
          name: item.name_at_order,
          price: Number(item.price_at_order),
          quantity: item.quantity,
          notes: item.notes || '',
        }));
        setCart(cartItems);
      }
    } catch (error) {
      console.error('Error loading active order:', error);
    }
  };

  const addToCart = (item: MenuItem) => {
    if (!canOrder) return;
    
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c =>
          c.menuItemId === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        notes: '',
      }];
    });
    toast.success(`Added ${item.name}`);
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(c => {
          if (c.menuItemId === menuItemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateNotes = (menuItemId: string, notes: string) => {
    setCart(prev =>
      prev.map(c =>
        c.menuItemId === menuItemId ? { ...c, notes } : c
      )
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    if (!canOrder || cart.length === 0) return;

    setSubmitting(true);
    try {
      const total = getCartTotal();

      if (activeOrder && activeOrder.status === 'pending') {
        // Update existing order
        const { error: updateError } = await supabase
          .from('orders')
          .update({ total_amount: total })
          .eq('id', activeOrder.id);

        if (updateError) throw updateError;

        // Delete existing items
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', activeOrder.id);

        // Insert new items
        const orderItems = cart.map(item => ({
          order_id: activeOrder.id,
          menu_item_id: item.menuItemId || null,
          name_at_order: item.name,
          price_at_order: item.price,
          quantity: item.quantity,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        toast.success('Order updated!');
        await loadActiveOrder();
      } else {
        // Create new order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            total_amount: total,
            status: 'pending',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = cart.map(item => ({
          order_id: order.id,
          menu_item_id: item.menuItemId || null,
          name_at_order: item.name,
          price_at_order: item.price,
          quantity: item.quantity,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        toast.success('Order placed successfully!');
        setActiveOrder(order);
        setActiveOrderItems(orderItems.map((item, i) => ({ ...item, id: `temp-${i}` })));
      }

      setShowCart(false);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const isOrderLocked = activeOrder && activeOrder.status !== 'pending';

  // Group items by category
  const groupedItems = categories.map(cat => ({
    category: cat,
    items: menuItems.filter(item => item.category_id === cat.id),
  }));
  const uncategorizedItems = menuItems.filter(item => !item.category_id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: `hsl(var(--restaurant-background))` }}>
        <p className="text-lg">Loading menu...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Restaurant Not Found</h2>
            <p className="text-muted-foreground">The restaurant you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pb-24"
      style={{ backgroundColor: `hsl(var(--restaurant-background))` }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: `hsl(var(--restaurant-primary))` }}>
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            {restaurant.logo_url && (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name} 
                className="h-12 w-12 object-contain rounded-lg bg-white p-1"
              />
            )}
            <div className="text-white">
              <h1 className="text-xl font-bold">{restaurant.name}</h1>
              {table && <p className="text-sm opacity-90">{table.name}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Banner */}
      {restaurant.banner_url && (
        <div className="max-w-2xl mx-auto">
          <img 
            src={restaurant.banner_url} 
            alt="Banner" 
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      {/* No table warning */}
      {!canOrder && (
        <div className="max-w-2xl mx-auto p-4">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-amber-800 text-sm">
                Scan the QR code on your table to place an order.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order status banner */}
      {isOrderLocked && (
        <div className="max-w-2xl mx-auto p-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800">Your order is being prepared</p>
                  <p className="text-sm text-blue-600">Status: {activeOrder.status}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">{activeOrder.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Menu */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {groupedItems.map(({ category, items }) => (
          items.length > 0 && (
            <div key={category.id}>
              <h2 className="text-lg font-bold mb-3" style={{ color: `hsl(var(--restaurant-primary))` }}>
                {category.name}
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-24 h-24 object-cover"
                        />
                      )}
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </div>
                          <p className="font-bold" style={{ color: `hsl(var(--restaurant-primary))` }}>
                            ${Number(item.price).toFixed(2)}
                          </p>
                        </div>
                        {canOrder && !isOrderLocked && (
                          <Button
                            size="sm"
                            className="mt-3"
                            onClick={() => addToCart(item)}
                            style={{ backgroundColor: `hsl(var(--restaurant-accent))` }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        ))}

        {uncategorizedItems.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3" style={{ color: `hsl(var(--restaurant-primary))` }}>
              Other Items
            </h2>
            <div className="space-y-3">
              {uncategorizedItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="flex">
                    {item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-24 h-24 object-cover"
                      />
                    )}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <p className="font-bold" style={{ color: `hsl(var(--restaurant-primary))` }}>
                          ${Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      {canOrder && !isOrderLocked && (
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => addToCart(item)}
                          style={{ backgroundColor: `hsl(var(--restaurant-accent))` }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {menuItems.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No menu items available</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cart Button (Fixed) */}
      {canOrder && !isOrderLocked && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <div className="max-w-2xl mx-auto">
            <Button
              className="w-full h-14 text-lg"
              onClick={() => setShowCart(true)}
              style={{ backgroundColor: `hsl(var(--restaurant-primary))` }}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              View Cart ({getCartCount()}) - ${getCartTotal().toFixed(2)}
            </Button>
          </div>
        </div>
      )}

      {/* Cart Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCart(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Your Order</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowCart(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                    <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.menuItemId, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.menuItemId, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.menuItemId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Special instructions..."
                    value={item.notes}
                    onChange={(e) => updateNotes(item.menuItemId, e.target.value)}
                    className="text-sm"
                    rows={1}
                  />
                </div>
              ))}

              <div className="border-t pt-4">
                <div className="flex justify-between text-xl font-bold mb-4">
                  <span>Total</span>
                  <span>${getCartTotal().toFixed(2)}</span>
                </div>

                <Button
                  className="w-full h-14 text-lg"
                  onClick={handlePlaceOrder}
                  disabled={submitting || cart.length === 0}
                  style={{ backgroundColor: `hsl(var(--restaurant-primary))` }}
                >
                  {submitting ? 'Placing Order...' : activeOrder ? 'Update Order' : 'Place Order'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
