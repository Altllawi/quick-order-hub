-- Drop existing RLS policies to rebuild them
DROP POLICY IF EXISTS "Public can view menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Restaurant access for menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Public can view available menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Restaurant access for menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Restaurant access for order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can update orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant access for orders" ON public.orders;
DROP POLICY IF EXISTS "Super admins can delete platform users" ON public.platform_users;
DROP POLICY IF EXISTS "Super admins can insert platform users" ON public.platform_users;
DROP POLICY IF EXISTS "Super admins can view platform users" ON public.platform_users;
DROP POLICY IF EXISTS "Restaurant admins can manage their restaurant users" ON public.restaurant_users;
DROP POLICY IF EXISTS "Restaurant admins can view their restaurant users" ON public.restaurant_users;
DROP POLICY IF EXISTS "Super admins can manage all restaurant users" ON public.restaurant_users;
DROP POLICY IF EXISTS "Public can view restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant admins can update their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant admins can view their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Super admins can manage all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public can view tables" ON public.tables;
DROP POLICY IF EXISTS "Restaurant access for tables" ON public.tables;

-- Disable RLS on platform_users (only accessed via service role)
ALTER TABLE public.platform_users DISABLE ROW LEVEL SECURITY;

-- Recreate helper functions with proper security
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_users
    WHERE user_id = _user_id
  )
$$;

DROP FUNCTION IF EXISTS public.has_restaurant_access(uuid, uuid);
CREATE OR REPLACE FUNCTION public.has_restaurant_access(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) OR
    EXISTS (
      SELECT 1
      FROM public.restaurant_users
      WHERE user_id = _user_id AND restaurant_id = _restaurant_id
    )
$$;

-- RESTAURANTS table policies
-- Public can view basic restaurant info (for PWA)
CREATE POLICY "public_read_restaurants" ON public.restaurants
FOR SELECT USING (true);

-- Super admins can do everything
CREATE POLICY "super_admin_all_restaurants" ON public.restaurants
FOR ALL USING (public.is_super_admin(auth.uid()));

-- Restaurant admins can update their own restaurant
CREATE POLICY "restaurant_admin_update" ON public.restaurants
FOR UPDATE USING (public.has_restaurant_access(auth.uid(), id));

-- RESTAURANT_USERS table policies
-- Super admins can do everything
CREATE POLICY "super_admin_all_restaurant_users" ON public.restaurant_users
FOR ALL USING (public.is_super_admin(auth.uid()));

-- Restaurant admins can view users in their restaurant
CREATE POLICY "restaurant_admin_view_users" ON public.restaurant_users
FOR SELECT USING (public.has_restaurant_access(auth.uid(), restaurant_id));

-- Restaurant admins can add users to their restaurant
CREATE POLICY "restaurant_admin_insert_users" ON public.restaurant_users
FOR INSERT WITH CHECK (public.has_restaurant_access(auth.uid(), restaurant_id));

-- Restaurant admins can remove users from their restaurant  
CREATE POLICY "restaurant_admin_delete_users" ON public.restaurant_users
FOR DELETE USING (public.has_restaurant_access(auth.uid(), restaurant_id));

-- MENU_CATEGORIES table policies
-- Public can view categories (for PWA)
CREATE POLICY "public_read_categories" ON public.menu_categories
FOR SELECT USING (true);

-- Admins can manage their restaurant's categories
CREATE POLICY "admin_all_categories" ON public.menu_categories
FOR ALL USING (public.has_restaurant_access(auth.uid(), restaurant_id));

-- MENU_ITEMS table policies
-- Public can view items (for PWA)
CREATE POLICY "public_read_items" ON public.menu_items
FOR SELECT USING (true);

-- Admins can manage their restaurant's items
CREATE POLICY "admin_all_items" ON public.menu_items
FOR ALL USING (public.has_restaurant_access(auth.uid(), restaurant_id));

-- TABLES table policies
-- Public can view tables (for PWA)
CREATE POLICY "public_read_tables" ON public.tables
FOR SELECT USING (true);

-- Admins can manage their restaurant's tables
CREATE POLICY "admin_all_tables" ON public.tables
FOR ALL USING (public.has_restaurant_access(auth.uid(), restaurant_id));

-- ORDERS table policies
-- Public can view orders (for PWA order status)
CREATE POLICY "public_read_orders" ON public.orders
FOR SELECT USING (true);

-- Public can create orders (for PWA)
CREATE POLICY "public_insert_orders" ON public.orders
FOR INSERT WITH CHECK (true);

-- Public can update orders (for PWA - cancel pending)
CREATE POLICY "public_update_orders" ON public.orders
FOR UPDATE USING (true);

-- Admins can manage their restaurant's orders
CREATE POLICY "admin_all_orders" ON public.orders
FOR ALL USING (public.has_restaurant_access(auth.uid(), restaurant_id));

-- ORDER_ITEMS table policies
-- Public can view order items
CREATE POLICY "public_read_order_items" ON public.order_items
FOR SELECT USING (true);

-- Public can create order items
CREATE POLICY "public_insert_order_items" ON public.order_items
FOR INSERT WITH CHECK (true);

-- Admins can manage order items via order's restaurant
CREATE POLICY "admin_all_order_items" ON public.order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND public.has_restaurant_access(auth.uid(), orders.restaurant_id)
  )
);