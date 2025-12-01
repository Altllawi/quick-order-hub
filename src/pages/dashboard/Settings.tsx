import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  slug: string | null;
}

export default function Settings() {
  const { restaurantId } = useParams();
  const { restaurant, refreshRestaurant } = useOutletContext<{
    restaurant: Restaurant | null;
    refreshRestaurant: () => void;
  }>();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setSlug(restaurant.slug || '');
    }
  }, [restaurant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ name, slug: slug || null })
        .eq('id', restaurantId);

      if (error) throw error;

      toast.success('Settings updated');
      refreshRestaurant();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error(error.message || 'Failed to update settings');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Restaurant Settings</h1>
        <p className="text-muted-foreground">Manage your restaurant information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="name">Restaurant Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug (Optional)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-restaurant"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Used for custom URLs (letters, numbers, and hyphens only)
              </p>
            </div>

            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This restaurant is accessible at:
            </p>
            <code className="block p-2 bg-muted rounded text-sm">
              {window.location.origin}/pwa/{restaurantId}
            </code>
            <p className="text-sm text-muted-foreground mt-4">
              Custom domain support can be added in future updates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
