import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, format } from 'date-fns';

export type TimeFilter = 'today' | 'week' | 'month' | 'all';

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}

interface MonthlyData {
  month: string;
  orders: number;
  revenue: number;
}

export function useOverview() {
  const { restaurantId } = useParams();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [totalTables, setTotalTables] = useState(0);

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: currentYear - 2024 },
    (_, i) => 2025 + i
  );

  const getDateRange = useCallback((filter: TimeFilter) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfDay(now) };
      case 'all':
      default:
        return { start: null, end: null };
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange(timeFilter);

      let query = supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('restaurant_id', restaurantId);

      if (start && end) {
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'served' || o.status === 'completed').length || 0;

      setStats({ totalOrders, totalRevenue, pendingOrders, completedOrders });

      // Get total tables
      const { count: tablesCount } = await supabase
        .from('tables')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);

      setTotalTables(tablesCount || 0);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, timeFilter, getDateRange]);

  const loadMonthlyData = useCallback(async () => {
    if (!restaurantId) return;

    try {
      const startDate = new Date(selectedYear, 0, 1);
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const monthlyStats: { [key: string]: { orders: number; revenue: number } } = {};

      // Initialize all months
      for (let i = 0; i < 12; i++) {
        const monthKey = format(new Date(selectedYear, i, 1), 'MMM');
        monthlyStats[monthKey] = { orders: 0, revenue: 0 };
      }

      // Aggregate data
      orders?.forEach(order => {
        const date = new Date(order.created_at);
        const monthKey = format(date, 'MMM');
        monthlyStats[monthKey].orders += 1;
        monthlyStats[monthKey].revenue += Number(order.total_amount || 0);
      });

      const data = Object.entries(monthlyStats).map(([month, stats]) => ({
        month,
        orders: stats.orders,
        revenue: stats.revenue,
      }));

      setMonthlyData(data);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    }
  }, [restaurantId, selectedYear]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadMonthlyData();
  }, [loadMonthlyData]);

  return {
    stats,
    monthlyData,
    timeFilter,
    setTimeFilter,
    selectedYear,
    setSelectedYear,
    availableYears,
    loading,
    totalTables,
  };
}
