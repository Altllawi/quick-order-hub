import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

interface Staff {
  id: string;
  name: string;
}

interface StaffHour {
  id: string;
  staff_id: string;
  restaurant_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  created_at: string;
  staff?: Staff;
}

interface HoursFormData {
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface RestaurantContext {
  restaurant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export type DateFilter = 'day' | 'week' | 'month' | 'custom';

export function useStaffHours() {
  const context = useOutletContext<RestaurantContext>();
  const restaurantId = context?.restaurant?.id;
  
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [hours, setHours] = useState<StaffHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHour, setEditingHour] = useState<StaffHour | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  const [formData, setFormData] = useState<HoursFormData>({
    staff_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '17:00',
  });

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'day':
        return { start: now, end: now };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return customDateRange;
      default:
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
  }, [dateFilter, customDateRange]);

  const loadStaff = useCallback(async () => {
    if (!restaurantId) return;

    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) throw error;
      setStaffList(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  }, [restaurantId]);

  const loadHours = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();

      let query = supabase
        .from('staff_hours')
        .select('*, staff:staff_id(id, name)')
        .eq('restaurant_id', restaurantId)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (selectedStaffId !== 'all') {
        query = query.eq('staff_id', selectedStaffId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHours(data || []);
    } catch (error) {
      console.error('Error loading hours:', error);
      toast.error('Failed to load working hours');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, selectedStaffId, dateFilter, getDateRange]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  const handleOpenDialog = (hour?: StaffHour) => {
    if (hour) {
      setEditingHour(hour);
      setFormData({
        staff_id: hour.staff_id,
        date: hour.date,
        start_time: hour.start_time.slice(0, 5),
        end_time: hour.end_time.slice(0, 5),
      });
    } else {
      setEditingHour(null);
      setFormData({
        staff_id: staffList[0]?.id || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '17:00',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingHour(null);
  };

  const handleSave = async () => {
    if (!restaurantId || !formData.staff_id || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingHour) {
        const { error } = await supabase
          .from('staff_hours')
          .update({
            staff_id: formData.staff_id,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
          })
          .eq('id', editingHour.id);

        if (error) throw error;
        toast.success('Working hours updated');
      } else {
        const { error } = await supabase.from('staff_hours').insert({
          restaurant_id: restaurantId,
          staff_id: formData.staff_id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
        });

        if (error) throw error;
        toast.success('Working hours added');
      }

      handleCloseDialog();
      loadHours();
    } catch (error) {
      console.error('Error saving hours:', error);
      toast.error('Failed to save working hours');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('staff_hours').delete().eq('id', id);

      if (error) throw error;
      toast.success('Working hours deleted');
      loadHours();
    } catch (error) {
      console.error('Error deleting hours:', error);
      toast.error('Failed to delete working hours');
    }
  };

  const getTotalHours = () => {
    return hours.reduce((sum, h) => sum + Number(h.total_hours || 0), 0);
  };

  return {
    staffList,
    hours,
    loading,
    dialogOpen,
    editingHour,
    formData,
    setFormData,
    selectedStaffId,
    setSelectedStaffId,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    handleOpenDialog,
    handleCloseDialog,
    handleSave,
    handleDelete,
    getTotalHours,
  };
}
