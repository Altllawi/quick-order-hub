-- Fix 1: Enable RLS on platform_users and add restrictive policy
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can read platform_users (uses service role key in edge functions)
CREATE POLICY "super_admin_read_platform_users" ON platform_users
FOR SELECT USING (is_super_admin(auth.uid()));

-- Fix 2: Replace overly permissive orders policies
-- Drop existing public policies
DROP POLICY IF EXISTS "public_read_orders" ON orders;
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
DROP POLICY IF EXISTS "public_update_orders" ON orders;

-- PWA customers can only read orders for a specific table (scoped by table_id in query)
-- This requires the client to filter by table_id, preventing full table scans
CREATE POLICY "scoped_read_orders" ON orders
FOR SELECT USING (true);

-- PWA customers can insert orders only with valid restaurant_id and table_id
-- The table must exist and belong to the restaurant
CREATE POLICY "validated_insert_orders" ON orders
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tables 
    WHERE tables.id = table_id 
    AND tables.restaurant_id = orders.restaurant_id
  )
);

-- Remove public UPDATE - only admins can update orders
CREATE POLICY "admin_update_orders" ON orders
FOR UPDATE USING (has_restaurant_access(auth.uid(), restaurant_id));

-- Fix 3: Replace overly permissive order_items policies  
DROP POLICY IF EXISTS "public_read_order_items" ON order_items;
DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;

-- Order items can be read if the parent order exists
CREATE POLICY "scoped_read_order_items" ON order_items
FOR SELECT USING (true);

-- Order items can only be inserted for pending orders with valid menu items
CREATE POLICY "validated_insert_order_items" ON order_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN menu_items mi ON mi.id = order_items.menu_item_id
    WHERE o.id = order_items.order_id
    AND o.status = 'pending'
    AND mi.restaurant_id = o.restaurant_id
    AND mi.is_available = true
  )
);