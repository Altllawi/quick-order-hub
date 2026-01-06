import { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TableData {
  id: string;
  name: string;
  table_uuid: string;
}

interface RestaurantContext {
  restaurant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useTables() {
  const { slug } = useParams();
  const context = useOutletContext<RestaurantContext>();
  const restaurant = context?.restaurant;
  const restaurantId = restaurant?.id;
  const restaurantSlug = restaurant?.slug || slug;
  
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [tableName, setTableName] = useState('');

  const loadTables = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadTables();
    }
  }, [restaurantId, loadTables]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;
    
    try {
      const { error } = await supabase
        .from('tables')
        .insert([
          {
            restaurant_id: restaurantId,
            name: tableName,
          },
        ]);

      if (error) throw error;
      toast.success('Table created');
      setTableName('');
      setDialogOpen(false);
      loadTables();
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error('Failed to create table');
    }
  }, [restaurantId, tableName, loadTables]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const { error } = await supabase.from('tables').delete().eq('id', id);

      if (error) throw error;
      toast.success('Table deleted');
      loadTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Failed to delete table');
    }
  }, [loadTables]);

  const showQRCode = useCallback((table: TableData) => {
    setSelectedTable(table);
    setQrDialogOpen(true);
  }, []);

  // Generate QR URL using restaurant slug and table id
  const getQRUrl = useCallback((table: TableData) => {
    return `${window.location.origin}/${restaurantSlug}/${table.id}`;
  }, [restaurantSlug]);

  const downloadQR = useCallback(() => {
    if (!selectedTable) return;

    const container = document.getElementById('qr-code');
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${selectedTable.name}-qr.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  }, [selectedTable]);

  return {
    // State
    tables,
    loading,
    dialogOpen,
    qrDialogOpen,
    selectedTable,
    tableName,
    
    // Actions
    setDialogOpen,
    setQrDialogOpen,
    setTableName,
    handleSubmit,
    handleDelete,
    showQRCode,
    getQRUrl,
    downloadQR,
  };
}
