import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

// Generate URL-safe slug from restaurant name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
};

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    loadRestaurants();
  }, []);

  // Auto-generate slug when name changes
  useEffect(() => {
    setSlug(generateSlug(name));
  }, [name]);

  const loadRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    setRestaurants(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!slug) {
      toast.error('Slug is required');
      return;
    }

    try {
      const { error } = await supabase.from('restaurants').insert([{ 
        name, 
        slug: slug.toLowerCase().trim() 
      }]);
      if (error) {
        if (error.code === '23505') {
          toast.error('A restaurant with this URL slug already exists');
          return;
        }
        throw error;
      }
      toast.success('Restaurant created');
      setName('');
      setSlug('');
      setDialogOpen(false);
      loadRestaurants();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Restaurants</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Restaurant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Restaurant</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., Pizza Palace"
                  required 
                />
              </div>
              <div>
                <Label>URL Slug</Label>
                <Input 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                  placeholder="e.g., pizza-palace"
                  required 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Menu URL: yourdomain.com/{slug || 'restaurant-slug'}
                </p>
              </div>
              <Button type="submit">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All Restaurants</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL Slug</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="font-mono text-sm">/{r.slug}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
