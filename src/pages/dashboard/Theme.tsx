import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { applyRestaurantTheme } from '@/services/themeService';
import { Upload, RotateCcw } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  background_url: string | null;
}

const DEFAULT_BACKGROUND = '/default-background.jpg';

export default function Theme() {
  const { restaurantId } = useParams();
  const { restaurant, refreshRestaurant } = useOutletContext<{
    restaurant: Restaurant | null;
    refreshRestaurant: () => void;
  }>();
  
  const [colors, setColors] = useState({
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    accent_color: '#10b981',
  });
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setColors({
        primary_color: restaurant.primary_color,
        secondary_color: restaurant.secondary_color,
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

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${restaurantId}/background.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurants')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurants')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ background_url: publicUrl })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      toast.success('Background image uploaded successfully');
      refreshRestaurant();
    } catch (error) {
      console.error('Error uploading background:', error);
      toast.error('Failed to upload background image');
    } finally {
      setUploading(false);
    }
  };

  const handleResetBackground = async () => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ background_url: null })
        .eq('id', restaurantId);

      if (error) throw error;

      toast.success('Background reset to default');
      refreshRestaurant();
    } catch (error) {
      console.error('Error resetting background:', error);
      toast.error('Failed to reset background');
    }
  };

  const currentBackground = restaurant?.background_url || DEFAULT_BACKGROUND;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Theme & Branding</h1>
        <p className="text-muted-foreground">Customize your restaurant's appearance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Logo & Background</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Restaurant Logo</Label>
              <p className="text-sm text-muted-foreground mb-2">This will also be used as the favicon in browser tabs</p>
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
              <Label>Menu Background Image</Label>
              <p className="text-sm text-muted-foreground mb-2">This image will be displayed as the PWA menu background</p>
              <div className="mt-2 mb-3">
                <img
                  src={currentBackground}
                  alt="Background preview"
                  className="h-32 w-full object-cover rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  disabled={uploading}
                  className="max-w-xs"
                />
                <Button disabled={uploading} size="icon" variant="outline">
                  <Upload className="h-4 w-4" />
                </Button>
                {restaurant?.background_url && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetBackground}
                    disabled={uploading}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                )}
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
