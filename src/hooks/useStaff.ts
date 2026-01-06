import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Staff {
  id: string;
  restaurant_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  created_at: string;
}

interface StaffFormData {
  name: string;
  role: string;
  phone: string;
}

interface RestaurantContext {
  restaurant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useStaff() {
  const context = useOutletContext<RestaurantContext>();
  const restaurantId = context?.restaurant?.id;
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>({
    name: '',
    role: '',
    phone: '',
  });

  const loadStaff = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleOpenDialog = (staffMember?: Staff) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        name: staffMember.name,
        role: staffMember.role || '',
        phone: staffMember.phone || '',
      });
    } else {
      setEditingStaff(null);
      setFormData({ name: '', role: '', phone: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStaff(null);
    setFormData({ name: '', role: '', phone: '' });
  };

  const handleSave = async () => {
    if (!restaurantId || !formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update({
            name: formData.name,
            role: formData.role || null,
            phone: formData.phone || null,
          })
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast.success('Staff member updated');
      } else {
        const { error } = await supabase.from('staff').insert({
          restaurant_id: restaurantId,
          name: formData.name,
          role: formData.role || null,
          phone: formData.phone || null,
        });

        if (error) throw error;
        toast.success('Staff member added');
      }

      handleCloseDialog();
      loadStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error('Failed to save staff member');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);

      if (error) throw error;
      toast.success('Staff member deleted');
      loadStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to delete staff member');
    }
  };

  return {
    staff,
    loading,
    dialogOpen,
    editingStaff,
    formData,
    setFormData,
    handleOpenDialog,
    handleCloseDialog,
    handleSave,
    handleDelete,
  };
}
