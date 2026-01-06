import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Admin {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
  email: string;
}

interface RestaurantContext {
  restaurant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useAdmins() {
  const context = useOutletContext<RestaurantContext>();
  const restaurantId = context?.restaurant?.id;
  
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAdmins = useCallback(async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-admin', {
        body: { action: 'list-admins', restaurant_id: restaurantId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setAdmins(response.data.admins || []);
    } catch (error: any) {
      console.error('Error loading admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadAdmins();
    }
  }, [restaurantId, loadAdmins]);

  const handleAddAdmin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;
    
    setSubmitting(true);

    try {
      const response = await supabase.functions.invoke('manage-admin', {
        body: {
          action: 'create-admin',
          email,
          password,
          restaurant_id: restaurantId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast.success('Admin added successfully');
      setEmail('');
      setPassword('');
      setDialogOpen(false);
      loadAdmins();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      toast.error(error.message || 'Failed to add admin');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, restaurantId, loadAdmins]);

  const handleRemoveAdmin = useCallback(async (admin: Admin) => {
    if (!restaurantId) return;
    if (!confirm(`Remove ${admin.email} from this restaurant?`)) return;

    try {
      const response = await supabase.functions.invoke('manage-admin', {
        body: {
          action: 'remove-admin',
          user_id: admin.user_id,
          restaurant_id: restaurantId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Admin removed');
      loadAdmins();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    }
  }, [restaurantId, loadAdmins]);

  return {
    // State
    admins,
    loading,
    dialogOpen,
    email,
    password,
    submitting,
    
    // Actions
    setDialogOpen,
    setEmail,
    setPassword,
    handleAddAdmin,
    handleRemoveAdmin,
  };
}
