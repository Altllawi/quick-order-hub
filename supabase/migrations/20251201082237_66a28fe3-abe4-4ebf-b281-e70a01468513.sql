-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'restaurant_admin');

-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#8b5cf6',
  background_color TEXT DEFAULT '#ffffff',
  accent_color TEXT DEFAULT '#10b981',
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create platform_users table (super admins)
CREATE TABLE public.platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create restaurant_users table (restaurant admins)
CREATE TABLE public.restaurant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

-- Create menu_categories table
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  position INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tables table
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  price_at_order NUMERIC(10,2) NOT NULL,
  name_at_order TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage bucket for restaurant assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('restaurants', 'restaurants', true);

-- Enable Row Level Security
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
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

-- Create security definer function to check if user has access to restaurant
CREATE OR REPLACE FUNCTION public.has_restaurant_access(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_users
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id
  ) OR public.is_super_admin(_user_id)
$$;

-- RLS Policies for restaurants
CREATE POLICY "Super admins can manage all restaurants"
ON public.restaurants FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Restaurant admins can view their restaurants"
ON public.restaurants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_users
    WHERE user_id = auth.uid() AND restaurant_id = restaurants.id
  )
);

CREATE POLICY "Restaurant admins can update their restaurants"
ON public.restaurants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_users
    WHERE user_id = auth.uid() AND restaurant_id = restaurants.id
  )
);

-- Allow public read access for PWA
CREATE POLICY "Public can view restaurants"
ON public.restaurants FOR SELECT
USING (true);

-- RLS Policies for platform_users
CREATE POLICY "Super admins can view platform users"
ON public.platform_users FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert platform users"
ON public.platform_users FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete platform users"
ON public.platform_users FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for restaurant_users
CREATE POLICY "Super admins can manage all restaurant users"
ON public.restaurant_users FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Restaurant admins can view their restaurant users"
ON public.restaurant_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_users ru
    WHERE ru.user_id = auth.uid() AND ru.restaurant_id = restaurant_users.restaurant_id
  )
);

CREATE POLICY "Restaurant admins can manage their restaurant users"
ON public.restaurant_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_users ru
    WHERE ru.user_id = auth.uid() AND ru.restaurant_id = restaurant_users.restaurant_id
  )
);

-- RLS Policies for menu_categories
CREATE POLICY "Restaurant access for menu categories"
ON public.menu_categories FOR ALL
USING (public.has_restaurant_access(auth.uid(), restaurant_id));

CREATE POLICY "Public can view menu categories"
ON public.menu_categories FOR SELECT
USING (true);

-- RLS Policies for menu_items
CREATE POLICY "Restaurant access for menu items"
ON public.menu_items FOR ALL
USING (public.has_restaurant_access(auth.uid(), restaurant_id));

CREATE POLICY "Public can view available menu items"
ON public.menu_items FOR SELECT
USING (true);

-- RLS Policies for tables
CREATE POLICY "Restaurant access for tables"
ON public.tables FOR ALL
USING (public.has_restaurant_access(auth.uid(), restaurant_id));

CREATE POLICY "Public can view tables"
ON public.tables FOR SELECT
USING (true);

-- RLS Policies for orders
CREATE POLICY "Restaurant access for orders"
ON public.orders FOR ALL
USING (public.has_restaurant_access(auth.uid(), restaurant_id));

CREATE POLICY "Public can view orders"
ON public.orders FOR SELECT
USING (true);

CREATE POLICY "Public can create orders"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update orders"
ON public.orders FOR UPDATE
USING (true);

-- RLS Policies for order_items
CREATE POLICY "Restaurant access for order items"
ON public.order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND public.has_restaurant_access(auth.uid(), orders.restaurant_id)
  )
);

CREATE POLICY "Public can view order items"
ON public.order_items FOR SELECT
USING (true);

CREATE POLICY "Public can create order items"
ON public.order_items FOR INSERT
WITH CHECK (true);

-- Storage policies for restaurants bucket
CREATE POLICY "Public can view restaurant assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurants');

CREATE POLICY "Authenticated users can upload restaurant assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'restaurants' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update restaurant assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'restaurants' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete restaurant assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'restaurants' AND
  auth.role() = 'authenticated'
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();