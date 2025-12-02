import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Admin {
  id: string;
  user_id: string;
  restaurant_id: string;
  restaurant_name: string;
  email: string;
  created_at: string;
}

interface Restaurant {
  id: string;
  name: string;
}

export default function SuperAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load restaurants
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name');
      
      setRestaurants(restaurantData || []);

      // Load all admins via edge function
      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('manage-admin', {
        body: { action: 'list-all-admins' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setAdmins(response.data.admins || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) {
      toast.error('Please select a restaurant');
      return;
    }

    setSubmitting(true);
    try {
      const response = await supabase.functions.invoke('manage-admin', {
        body: {
          action: 'create-admin',
          email,
          password,
          restaurant_id: selectedRestaurant,
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
      setSelectedRestaurant('');
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      toast.error(error.message || 'Failed to add admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (admin: Admin) => {
    if (!confirm(`Remove ${admin.email} from ${admin.restaurant_name}?`)) return;

    try {
      const response = await supabase.functions.invoke('manage-admin', {
        body: {
          action: 'remove-admin',
          user_id: admin.user_id,
          restaurant_id: admin.restaurant_id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Admin removed');
      loadData();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Restaurant Admins</h1>
          <p className="text-muted-foreground">Manage admins across all restaurants</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Restaurant Admin</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <Label htmlFor="restaurant">Restaurant</Label>
                <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin-password">Password (for new users)</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty if user already exists
                </p>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Admin
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Restaurant Admins</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No admins yet
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell>{admin.restaurant_name}</TableCell>
                    <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAdmin(admin)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}