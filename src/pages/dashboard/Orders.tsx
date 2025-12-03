import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useOrders, STATUS_OPTIONS } from '@/hooks/useOrders';

export default function Orders() {
  const {
    orders,
    loading,
    createDialogOpen,
    tables,
    cart,
    selectedTableId,
    creatingOrder,
    groupedItems,
    uncategorizedItems,
    setCreateDialogOpen,
    setSelectedTableId,
    loadOrders,
    handleOpenCreateDialog,
    updateOrderStatus,
    addToCart,
    updateCartQuantity,
    updateCartNotes,
    getCartTotal,
    handleCreateOrder,
    getStatusColor,
  } = useOrders();

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
                        {STATUS_OPTIONS.map((status) => (
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
