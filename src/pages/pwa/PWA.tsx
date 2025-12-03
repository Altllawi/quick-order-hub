import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, ShoppingCart, Trash2, AlertCircle } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

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
      {isOrderLocked && activeOrder && (
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
