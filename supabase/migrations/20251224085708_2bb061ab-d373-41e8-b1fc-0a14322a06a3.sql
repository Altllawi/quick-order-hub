-- Allow order updates for pending orders (customer can update their own order items)
-- First, add policy for deleting order_items when updating an order
CREATE POLICY "customer_delete_pending_order_items" 
ON public.order_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id 
    AND o.status = 'pending'
  )
);

-- Add policy for updating orders (customers can update pending orders for their table)
CREATE POLICY "customer_update_pending_orders" 
ON public.orders 
FOR UPDATE 
USING (status = 'pending');
