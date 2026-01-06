import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  image_url: string | null;
  category_id: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface MenuFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  image_url: string;
}

interface RestaurantContext {
  restaurant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

const emptyFormData: MenuFormData = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
};

export function useMenu() {
  const context = useOutletContext<RestaurantContext>();
  const restaurantId = context?.restaurant?.id;
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuFormData>(emptyFormData);
  const [categoryName, setCategoryName] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('position');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, [restaurantId]);

  const loadMenuItems = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('position');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadCategories();
      loadMenuItems();
    }
  }, [restaurantId, loadCategories, loadMenuItems]);

  const handleDialogChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingItem(null);
      setFormData(emptyFormData);
    }
  }, []);

  const handleSubmitCategory = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;
    
    try {
      const { error } = await supabase
        .from('menu_categories')
        .insert([
          {
            restaurant_id: restaurantId,
            name: categoryName,
            position: categories.length,
          },
        ]);

      if (error) throw error;
      toast.success('Category created');
      setCategoryName('');
      setCategoryDialogOpen(false);
      loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  }, [restaurantId, categoryName, categories.length, loadCategories]);

  const handleImageUpload = useCallback(async (file: File, itemId?: string): Promise<string | null> => {
    if (!restaurantId) return null;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return null;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = itemId || `temp_${Date.now()}`;
      const filePath = `menu_items/${restaurantId}/${fileName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurants')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurants')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  }, [restaurantId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;
    
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category_id: formData.category_id || null,
            image_url: formData.image_url || null,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Menu item updated');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert([
            {
              restaurant_id: restaurantId,
              name: formData.name,
              description: formData.description,
              price: parseFloat(formData.price),
              category_id: formData.category_id || null,
              image_url: formData.image_url || null,
              position: menuItems.length,
            },
          ]);

        if (error) throw error;
        toast.success('Menu item created');
      }

      setFormData(emptyFormData);
      setEditingItem(null);
      setDialogOpen(false);
      loadMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Failed to save menu item');
    }
  }, [editingItem, formData, restaurantId, menuItems.length, loadMenuItems]);

  const handleEdit = useCallback((item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id || '',
      image_url: item.image_url || '',
    });
    setDialogOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingItem(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);

      if (error) throw error;
      toast.success('Menu item deleted');
      loadMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    }
  }, [loadMenuItems]);

  const toggleAvailability = useCallback(async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadMenuItems();
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  }, [loadMenuItems]);

  const updateFormData = useCallback((updates: Partial<MenuFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // State
    menuItems,
    categories,
    loading,
    dialogOpen,
    categoryDialogOpen,
    editingItem,
    formData,
    categoryName,
    uploadingImage,
    
    // Actions
    setDialogOpen: handleDialogChange,
    setCategoryDialogOpen,
    setCategoryName,
    updateFormData,
    handleSubmitCategory,
    handleSubmit,
    handleEdit,
    handleAddNew,
    handleDelete,
    toggleAvailability,
    handleImageUpload,
  };
}
