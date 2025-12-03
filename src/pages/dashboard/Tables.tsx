import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table as TableUI, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, QrCode as QrCodeIcon, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTables } from '@/hooks/useTables';

export default function Tables() {
  const {
    tables,
    loading,
    dialogOpen,
    qrDialogOpen,
    selectedTable,
    tableName,
    setDialogOpen,
    setQrDialogOpen,
    setTableName,
    handleSubmit,
    handleDelete,
    showQRCode,
    getQRUrl,
    downloadQR,
  } = useTables();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tables & QR Codes</h1>
          <p className="text-muted-foreground">Manage tables and generate QR codes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Table</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="table-name">Table Name</Label>
                <Input
                  id="table-name"
                  placeholder="e.g., Table 1"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit">Create Table</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <TableUI>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Table UUID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Loading tables...
                  </TableCell>
                </TableRow>
              ) : tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No tables yet. Create one to get started!
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.name}</TableCell>
                    <TableCell className="font-mono text-xs">{table.table_uuid}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showQRCode(table)}
                        >
                          <QrCodeIcon className="h-4 w-4 mr-1" />
                          QR Code
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(table.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </TableUI>
        </CardContent>
      </Card>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - {selectedTable?.name}</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              <div id="qr-code" className="flex justify-center p-6 bg-white rounded-lg">
                <QRCodeSVG
                  value={getQRUrl(selectedTable)}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="text-sm text-muted-foreground text-center break-all">
                {getQRUrl(selectedTable)}
              </div>
              <Button onClick={downloadQR} className="w-full">
                Download QR Code (SVG)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
