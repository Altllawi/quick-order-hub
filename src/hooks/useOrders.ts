import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  tables: {
    name: string;
  };
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export interface TableData {
  id: string;
  name: string;
}

export const STATUS_OPTIONS = ['pending', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];

export function useOrders() {
  const { restaurantId } = useParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Create order state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          tables (
            name
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const subscribeToOrders = useCallback(() => {
    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, loadOrders]);

  useEffect(() => {
    if (restaurantId) {
      loadOrders();
      const unsubscribe = subscribeToOrders();
      return unsubscribe;
    }
  }, [restaurantId, loadOrders, subscribeToOrders]);

  const loadMenuAndTables = useCallback(async () => {
    try {
      const [menuResult, categoriesResult, tablesResult] = await Promise.all([
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true)
          .order('position'),
        supabase
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('position'),
        supabase
          .from('tables')
          .select('id, name')
          .eq('restaurant_id', restaurantId)
          .order('name'),
      ]);

      if (menuResult.error) throw menuResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (tablesResult.error) throw tablesResult.error;

      setMenuItems(menuResult.data || []);
      setCategories(categoriesResult.data || []);
      setTables(tablesResult.data || []);
    } catch (error) {
      console.error('Error loading menu and tables:', error);
      toast.error('Failed to load menu data');
    }
  }, [restaurantId]);

  const handleOpenCreateDialog = useCallback(() => {
    loadMenuAndTables();
    setCart([]);
    setSelectedTableId('');
    setOrderNotes('');
    setCreateDialogOpen(true);
  }, [loadMenuAndTables]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order status updated');
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  }, [loadOrders]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c =>
          c.menuItem.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  }, []);

  const updateCartQuantity = useCallback((itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(c => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  }, []);

  const updateCartNotes = useCallback((itemId: string, notes: string) => {
    setCart(prev =>
      prev.map(c =>
        c.menuItem.id === itemId ? { ...c, notes } : c
      )
    );
  }, []);

  const getCartTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [cart]);

  const handleCreateOrder = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Please add items to the order');
      return;
    }

    if (!selectedTableId) {
      toast.error('Please select a table');
      return;
    }

    setCreatingOrder(true);
    try {
      const total = getCartTotal();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          table_id: selectedTableId,
          total_amount: total,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.menuItem.id,
        name_at_order: item.menuItem.name,
        price_at_order: item.menuItem.price,
        quantity: item.quantity,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('Order created successfully');
      setCreateDialogOpen(false);
      setCart([]);
      setSelectedTableId('');
      setOrderNotes('');
      loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setCreatingOrder(false);
    }
  }, [cart, selectedTableId, restaurantId, getCartTotal, loadOrders]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'served':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Group menu items by category
  const groupedItems = categories.map(cat => ({
    category: cat,
    items: menuItems.filter(item => item.category_id === cat.id),
  }));
  const uncategorizedItems = menuItems.filter(item => !item.category_id);

  return {
    // State
    orders,
    loading,
    createDialogOpen,
    menuItems,
    categories,
    tables,
    cart,
    selectedTableId,
    orderNotes,
    creatingOrder,
    groupedItems,
    uncategorizedItems,
    
    // Actions
    setCreateDialogOpen,
    setSelectedTableId,
    setOrderNotes,
    loadOrders,
    handleOpenCreateDialog,
    updateOrderStatus,
    addToCart,
    updateCartQuantity,
    updateCartNotes,
    getCartTotal,
    handleCreateOrder,
    getStatusColor,
  };
}
