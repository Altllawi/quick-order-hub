import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export type DaysThreshold = 7 | 14 | 30;

interface MenuItemInsight {
  id: string;
  name: string;
  categoryName: string | null;
  categoryId: string | null;
  orderCount?: number;
}

interface CategoryInsight {
  id: string;
  name: string;
  orderCount: number;
  itemCount?: number;
}

interface MenuInsights {
  neverOrdered: MenuItemInsight[];
  orderedOnce: MenuItemInsight[];
  notOrderedRecently: MenuItemInsight[];
  lowPerformingCategories: CategoryInsight[];
  bestSellers: MenuItemInsight[];
  leastOrdered: MenuItemInsight[];
  topCategories: CategoryInsight[];
}

export function useMenuInsights() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [insights, setInsights] = useState<MenuInsights>({
    neverOrdered: [],
    orderedOnce: [],
    notOrderedRecently: [],
    lowPerformingCategories: [],
    bestSellers: [],
    leastOrdered: [],
    topCategories: [],
  });
  const [loading, setLoading] = useState(true);
  const [daysThreshold, setDaysThreshold] = useState<DaysThreshold>(14);

  const loadInsights = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      // Fetch all menu items with their categories
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          category_id,
          menu_categories (
            id,
            name
          )
        `)
        .eq('restaurant_id', restaurantId);

      if (menuError) throw menuError;

      // Fetch all order items with their orders to get dates
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          menu_item_id,
          quantity,
          orders (
            created_at,
            restaurant_id
          )
        `)
        .not('menu_item_id', 'is', null);

      if (orderError) throw orderError;

      // Filter order items for this restaurant
      const restaurantOrderItems = orderItems?.filter(
        (item) => item.orders?.restaurant_id === restaurantId
      ) || [];

      // Count orders per menu item (including quantity)
      const orderCounts = new Map<string, { count: number; totalQuantity: number; lastOrdered: Date | null }>();
      
      restaurantOrderItems.forEach((item) => {
        if (!item.menu_item_id) return;
        
        const current = orderCounts.get(item.menu_item_id) || { count: 0, totalQuantity: 0, lastOrdered: null };
        current.count += 1;
        current.totalQuantity += item.quantity || 1;
        
        const orderDate = item.orders?.created_at ? new Date(item.orders.created_at) : null;
        if (orderDate && (!current.lastOrdered || orderDate > current.lastOrdered)) {
          current.lastOrdered = orderDate;
        }
        
        orderCounts.set(item.menu_item_id, current);
      });

      const now = new Date();
      const thresholdDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

      const neverOrdered: MenuItemInsight[] = [];
      const orderedOnce: MenuItemInsight[] = [];
      const notOrderedRecently: MenuItemInsight[] = [];
      const allItemsWithOrders: MenuItemInsight[] = [];

      menuItems?.forEach((item) => {
        const stats = orderCounts.get(item.id);
        const category = item.menu_categories as { id: string; name: string } | null;
        
        const insight: MenuItemInsight = {
          id: item.id,
          name: item.name,
          categoryName: category?.name || null,
          categoryId: category?.id || null,
          orderCount: stats?.totalQuantity || 0,
        };

        if (!stats || stats.count === 0) {
          neverOrdered.push(insight);
        } else if (stats.count === 1) {
          orderedOnce.push(insight);
          allItemsWithOrders.push(insight);
        } else {
          if (stats.lastOrdered && stats.lastOrdered < thresholdDate) {
            notOrderedRecently.push(insight);
          }
          allItemsWithOrders.push(insight);
        }
      });

      // Best sellers - top 5 most ordered items
      const bestSellers = [...allItemsWithOrders]
        .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
        .slice(0, 5);

      // Least ordered - bottom 5 items that have been ordered at least once
      const leastOrdered = [...allItemsWithOrders]
        .filter(item => (item.orderCount || 0) > 0)
        .sort((a, b) => (a.orderCount || 0) - (b.orderCount || 0))
        .slice(0, 5);

      // Calculate category performance
      const categoryCounts = new Map<string, { name: string; count: number; itemCount: number }>();
      
      menuItems?.forEach((item) => {
        const category = item.menu_categories as { id: string; name: string } | null;
        if (!category) return;
        
        const itemStats = orderCounts.get(item.id);
        const itemOrderCount = itemStats?.totalQuantity || 0;
        
        const current = categoryCounts.get(category.id) || { name: category.name, count: 0, itemCount: 0 };
        current.count += itemOrderCount;
        current.itemCount += 1;
        categoryCounts.set(category.id, current);
      });

      // Top performing categories
      const categoryArray = Array.from(categoryCounts.entries());
      const topCategories: CategoryInsight[] = categoryArray
        .map(([id, data]) => ({
          id,
          name: data.name,
          orderCount: data.count,
          itemCount: data.itemCount,
        }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);

      // Find low-performing categories (below 50% of average)
      const totalCategoryOrders = categoryArray.reduce((sum, [, data]) => sum + data.count, 0);
      const averageOrders = categoryArray.length > 0 ? totalCategoryOrders / categoryArray.length : 0;
      const threshold = averageOrders * 0.5;

      const lowPerformingCategories: CategoryInsight[] = categoryArray
        .filter(([, data]) => data.count < threshold && averageOrders > 0)
        .map(([id, data]) => ({
          id,
          name: data.name,
          orderCount: data.count,
          itemCount: data.itemCount,
        }))
        .sort((a, b) => a.orderCount - b.orderCount);

      setInsights({
        neverOrdered,
        orderedOnce,
        notOrderedRecently,
        lowPerformingCategories,
        bestSellers,
        leastOrdered,
        topCategories,
      });
    } catch (error) {
      console.error('Error loading menu insights:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, daysThreshold]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const totalIssues = 
    insights.neverOrdered.length + 
    insights.orderedOnce.length + 
    insights.notOrderedRecently.length +
    insights.lowPerformingCategories.length;

  return {
    insights,
    loading,
    daysThreshold,
    setDaysThreshold,
    totalIssues,
    refresh: loadInsights,
  };
}
