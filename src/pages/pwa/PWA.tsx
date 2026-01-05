import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, ShoppingCart, Trash2, AlertCircle, ImageOff, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

const DEFAULT_FOOD_PLACEHOLDER = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop&auto=format';

export default function PWA() {
  const {
    restaurant,
    table,
    menuItems,
    loading,
    cart,
    activeOrder,
    showCart,
    submitting,
    canOrder,
    isOrderLocked,
    groupedItems,
    uncategorizedItems,
    backgroundUrl,
    setShowCart,
    addToCart,
    updateQuantity,
    updateNotes,
    removeFromCart,
    getCartTotal,
    getCartCount,
    handlePlaceOrder,
  } = usePWA();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Restaurant Not Found</h2>
            <p className="text-muted-foreground">The restaurant you're looking for doesn't exist or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'accepted':
      case 'preparing':
        return <RefreshCw className="h-5 w-5 animate-spin" />;
      case 'ready':
      case 'served':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your order has been received and is waiting for confirmation';
      case 'accepted':
        return 'Your order has been accepted by the kitchen';
      case 'preparing':
        return 'Your order is being prepared';
      case 'ready':
        return 'Your order is ready! A server will bring it to you soon';
      case 'served':
        return 'Your order has been served. Enjoy your meal!';
      case 'cancelled':
        return 'Your order has been cancelled';
      default:
        return 'Order status: ' + status;
    }
  };

  // Determine if customer can still modify the order
  const canModifyOrder = !activeOrder || activeOrder.status === 'pending';

  return (
    <div 
      className="min-h-screen pb-24 relative"
      style={{
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40 fixed" style={{ zIndex: 0 }} />
      
      {/* Content container */}
      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-20 shadow-lg" style={{ backgroundColor: `hsl(var(--restaurant-primary))` }}>
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

        {/* No table warning */}
        {!canOrder && (
          <div className="max-w-2xl mx-auto p-4">
            <Card className="bg-amber-50/95 border-amber-200 backdrop-blur-sm">
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
        {activeOrder && (
          <div className="max-w-2xl mx-auto p-4">
            <Card className={`backdrop-blur-sm ${
              activeOrder.status === 'cancelled' 
                ? 'bg-red-50/95 border-red-200' 
                : activeOrder.status === 'ready' || activeOrder.status === 'served'
                  ? 'bg-green-50/95 border-green-200'
                  : 'bg-blue-50/95 border-blue-200'
            }`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`${
                    activeOrder.status === 'cancelled' 
                      ? 'text-red-600' 
                      : activeOrder.status === 'ready' || activeOrder.status === 'served'
                        ? 'text-green-600'
                        : 'text-blue-600'
                  }`}>
                    {getStatusIcon(activeOrder.status)}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      activeOrder.status === 'cancelled' 
                        ? 'text-red-800' 
                        : activeOrder.status === 'ready' || activeOrder.status === 'served'
                          ? 'text-green-800'
                          : 'text-blue-800'
                    }`}>
                      {getStatusMessage(activeOrder.status)}
                    </p>
                    <p className={`text-sm ${
                      activeOrder.status === 'cancelled' 
                        ? 'text-red-600' 
                        : activeOrder.status === 'ready' || activeOrder.status === 'served'
                          ? 'text-green-600'
                          : 'text-blue-600'
                    }`}>
                      Total: ${Number(activeOrder.total_amount).toFixed(2)}
                    </p>
                  </div>
                  <Badge className={`${
                    activeOrder.status === 'cancelled' 
                      ? 'bg-red-100 text-red-800' 
                      : activeOrder.status === 'ready' || activeOrder.status === 'served'
                        ? 'bg-green-100 text-green-800'
                        : activeOrder.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                  }`}>
                    {activeOrder.status}
                  </Badge>
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
                <h2 className="text-lg font-bold mb-3 text-white drop-shadow-lg">
                  {category.name}
                </h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden bg-white/95 backdrop-blur-sm">
                      <div className="flex">
                        <div className="w-24 h-24 flex-shrink-0 bg-muted">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <ImageOff className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{item.name}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <p className="font-bold text-lg" style={{ color: `hsl(var(--restaurant-primary))` }}>
                              ${Number(item.price).toFixed(2)}
                            </p>
                          </div>
                          {canOrder && canModifyOrder && (
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
              <h2 className="text-lg font-bold mb-3 text-white drop-shadow-lg">
                Other Items
              </h2>
              <div className="space-y-3">
                {uncategorizedItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden bg-white/95 backdrop-blur-sm">
                    <div className="flex">
                      <div className="w-24 h-24 flex-shrink-0 bg-muted">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <ImageOff className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          <p className="font-bold text-lg" style={{ color: `hsl(var(--restaurant-primary))` }}>
                            ${Number(item.price).toFixed(2)}
                          </p>
                        </div>
                        {canOrder && canModifyOrder && (
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
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No menu items available</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart Button (Fixed) */}
        {canOrder && canModifyOrder && cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-30">
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
    </div>
  );
}
