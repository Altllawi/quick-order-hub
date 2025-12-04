import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { applyRestaurantTheme, resetRestaurantTheme, setFavicon, resetFavicon } from '@/services/themeService';

export interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
  background_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

export interface TableData {
  id: string;
  name: string;
  restaurant_id: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

export interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: string | null;
  name_at_order: string;
  price_at_order: number;
  quantity: number;
  notes: string | null;
}

const CART_KEY_PREFIX = 'pwa_cart_';
const DEFAULT_BACKGROUND = '/default-background.jpg';

export function usePWA() {
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

  const canOrder = Boolean(restaurantId && tableId && table);
  const cartKey = `${CART_KEY_PREFIX}${restaurantId}_${tableId}`;
  const isOrderLocked = activeOrder && activeOrder.status !== 'pending';
  const backgroundUrl = restaurant?.background_url || DEFAULT_BACKGROUND;

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

  const loadActiveOrder = useCallback(async () => {
    if (!restaurantId || !tableId) return;

    try {
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
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        if (itemsError) throw itemsError;
        setActiveOrderItems(items || []);
        
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
  }, [restaurantId, tableId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rest, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (restError) throw restError;
      if (!rest) {
        setLoading(false);
        return;
      }

      setRestaurant(rest);

      // Apply theme and favicon
      if (rest.primary_color || rest.secondary_color || rest.accent_color) {
        applyRestaurantTheme({
          primary_color: rest.primary_color || '#3b82f6',
          secondary_color: rest.secondary_color || '#8b5cf6',
          accent_color: rest.accent_color || '#10b981',
        });
      }
      setFavicon(rest.logo_url);

      if (tableId) {
        const { data: tbl, error: tblError } = await supabase
          .from('tables')
          .select('*')
          .eq('id', tableId)
          .maybeSingle();

        if (tblError) throw tblError;
        
        if (tbl && tbl.restaurant_id === restaurantId) {
          setTable(tbl);
          await loadActiveOrder();
        } else {
          setTable(null);
        }
      }

      const { data: cats, error: catsError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('position');

      if (catsError) throw catsError;
      setCategories(cats || []);

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
  }, [restaurantId, tableId, loadActiveOrder]);

  useEffect(() => {
    loadData();
    loadCart();

    return () => {
      resetRestaurantTheme();
      resetFavicon();
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

  const addToCart = useCallback((item: MenuItem) => {
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
  }, [canOrder]);

  const updateQuantity = useCallback((menuItemId: string, delta: number) => {
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
  }, []);

  const updateNotes = useCallback((menuItemId: string, notes: string) => {
    setCart(prev =>
      prev.map(c =>
        c.menuItemId === menuItemId ? { ...c, notes } : c
      )
    );
  }, []);

  const removeFromCart = useCallback((menuItemId: string) => {
    setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
  }, []);

  const getCartTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const getCartCount = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handlePlaceOrder = useCallback(async () => {
    if (!canOrder || cart.length === 0) return;

    setSubmitting(true);
    try {
      const total = getCartTotal();

      if (activeOrder && activeOrder.status === 'pending') {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ total_amount: total })
          .eq('id', activeOrder.id);

        if (updateError) throw updateError;

        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', activeOrder.id);

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
  }, [canOrder, cart, activeOrder, restaurantId, tableId, getCartTotal, loadActiveOrder]);

  // Group items by category
  const groupedItems = categories.map(cat => ({
    category: cat,
    items: menuItems.filter(item => item.category_id === cat.id),
  }));
  const uncategorizedItems = menuItems.filter(item => !item.category_id);

  return {
    // State
    restaurant,
    table,
    menuItems,
    categories,
    loading,
    cart,
    activeOrder,
    activeOrderItems,
    showCart,
    submitting,
    canOrder,
    isOrderLocked,
    groupedItems,
    uncategorizedItems,
    backgroundUrl,
    
    // Actions
    setShowCart,
    addToCart,
    updateQuantity,
    updateNotes,
    removeFromCart,
    getCartTotal,
    getCartCount,
    handlePlaceOrder,
    clearCart,
  };
}
