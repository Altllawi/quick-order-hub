import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { applyRestaurantTheme } from '@/services/themeService';
import { Upload } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  accent_color: string;
  logo_url: string | null;
  banner_url: string | null;
}

export default function Theme() {
  const { restaurantId } = useParams();
  const { restaurant, refreshRestaurant } = useOutletContext<{
    restaurant: Restaurant | null;
    refreshRestaurant: () => void;
  }>();
  
  const [colors, setColors] = useState({
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    background_color: '#ffffff',
    accent_color: '#10b981',
  });
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setColors({
        primary_color: restaurant.primary_color,
        secondary_color: restaurant.secondary_color,
        background_color: restaurant.background_color,
        accent_color: restaurant.accent_color,
      });
    }
  }, [restaurant]);

  const handleSaveColors = async () => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update(colors)
        .eq('id', restaurantId);

      if (error) throw error;

      applyRestaurantTheme(colors);
      toast.success('Theme updated successfully');
      refreshRestaurant();
    } catch (error) {
      console.error('Error updating theme:', error);
      toast.error('Failed to update theme');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${restaurantId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurants')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurants')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: publicUrl })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      toast.success('Logo uploaded successfully');
      refreshRestaurant();
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${restaurantId}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurants')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurants')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ banner_url: publicUrl })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      toast.success('Banner uploaded successfully');
      refreshRestaurant();
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Theme & Branding</h1>
        <p className="text-muted-foreground">Customize your restaurant's appearance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Logo & Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Restaurant Logo</Label>
              {restaurant?.logo_url && (
                <div className="mt-2 mb-3">
                  <img
                    src={restaurant.logo_url}
                    alt="Logo preview"
                    className="h-20 object-contain"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="max-w-xs"
                />
                <Button disabled={uploading} size="icon" variant="outline">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Banner Image (Optional)</Label>
              {restaurant?.banner_url && (
                <div className="mt-2 mb-3">
                  <img
                    src={restaurant.banner_url}
                    alt="Banner preview"
                    className="h-20 w-full object-cover rounded"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploading}
                  className="max-w-xs"
                />
                <Button disabled={uploading} size="icon" variant="outline">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="primary">Primary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="primary"
                  type="color"
                  value={colors.primary_color}
                  onChange={(e) => setColors({ ...colors, primary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.primary_color}
                  onChange={(e) => setColors({ ...colors, primary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondary">Secondary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="secondary"
                  type="color"
                  value={colors.secondary_color}
                  onChange={(e) => setColors({ ...colors, secondary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.secondary_color}
                  onChange={(e) => setColors({ ...colors, secondary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="background">Background Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="background"
                  type="color"
                  value={colors.background_color}
                  onChange={(e) => setColors({ ...colors, background_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.background_color}
                  onChange={(e) => setColors({ ...colors, background_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accent">Accent Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="accent"
                  type="color"
                  value={colors.accent_color}
                  onChange={(e) => setColors({ ...colors, accent_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.accent_color}
                  onChange={(e) => setColors({ ...colors, accent_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <Button onClick={handleSaveColors} className="w-full">
              Save Colors
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div style={{ backgroundColor: colors.primary_color }} className="p-4 rounded text-white">
              Primary Color Sample
            </div>
            <div style={{ backgroundColor: colors.secondary_color }} className="p-4 rounded text-white">
              Secondary Color Sample
            </div>
            <div style={{ backgroundColor: colors.accent_color }} className="p-4 rounded text-white">
              Accent Color Sample
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
