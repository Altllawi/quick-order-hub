import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Plus, Minus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  tables: {
    name: string;
  };
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface TableData {
  id: string;
  name: string;
}

export default function Orders() {
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

  useEffect(() => {
    if (restaurantId) {
      loadOrders();
      subscribeToOrders();
    }
  }, [restaurantId]);

  const loadOrders = async () => {
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
  };

  const subscribeToOrders = () => {
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
  };

  const loadMenuAndTables = async () => {
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
  };

  const handleOpenCreateDialog = () => {
    loadMenuAndTables();
    setCart([]);
    setSelectedTableId('');
    setOrderNotes('');
    setCreateDialogOpen(true);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
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
  };

  const addToCart = (item: MenuItem) => {
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
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
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
  };

  const updateCartNotes = (itemId: string, notes: string) => {
    setCart(prev =>
      prev.map(c =>
        c.menuItem.id === itemId ? { ...c, notes } : c
      )
    );
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  };

  const handleCreateOrder = async () => {
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

      // Create order
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

      // Create order items
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
  };

  const getStatusColor = (status: string) => {
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
  };

  const statusOptions = ['pending', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];

  // Group menu items by category
  const groupedItems = categories.map(cat => ({
    category: cat,
    items: menuItems.filter(item => item.category_id === cat.id),
  }));
  const uncategorizedItems = menuItems.filter(item => !item.category_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage your restaurant orders</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Menu Items */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="table-select">Select Table</Label>
                    <select
                      id="table-select"
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    >
                      <option value="">-- Select Table --</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {groupedItems.map(({ category, items }) => (
                      items.length > 0 && (
                        <div key={category.id}>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                            {category.name}
                          </h4>
                          <div className="space-y-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                onClick={() => addToCart(item)}
                              >
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                  )}
                                </div>
                                <p className="font-bold">${Number(item.price).toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                    {uncategorizedItems.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                          Other Items
                        </h4>
                        <div className="space-y-2">
                          {uncategorizedItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                              onClick={() => addToCart(item)}
                            >
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                )}
                              </div>
                              <p className="font-bold">${Number(item.price).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cart */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    <h3 className="font-semibold">Order Items</h3>
                  </div>

                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Click on menu items to add them
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.menuItem.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.menuItem.name}</span>
                            <span className="font-bold">
                              ${(item.menuItem.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.menuItem.id, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.menuItem.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Notes for this item..."
                            value={item.notes}
                            onChange={(e) => updateCartNotes(item.menuItem.id, e.target.value)}
                            className="text-sm"
                            rows={1}
                          />
                        </div>
                      ))}

                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>${getCartTotal().toFixed(2)}</span>
                        </div>
                      </div>

                      <Button
                        onClick={handleCreateOrder}
                        disabled={creatingOrder || cart.length === 0 || !selectedTableId}
                        className="w-full"
                      >
                        {creatingOrder ? 'Creating...' : 'Create Order'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={loadOrders} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No orders yet
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.tables?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>${Number(order.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
