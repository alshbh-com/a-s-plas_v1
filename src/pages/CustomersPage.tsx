import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Phone, ExternalLink, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  address: string;
  office_name: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string | null;
}

export default function CustomersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [ordersRes, officesRes] = await Promise.all([
      supabase.from('orders').select('customer_name, customer_phone, customer_code, address, price, delivery_price, office_id, created_at').limit(5000),
      supabase.from('offices').select('id, name'),
    ]);
    setOrders(ordersRes.data || []);
    setOffices(officesRes.data || []);
  };

  const officeMap = useMemo(() => {
    const m: Record<string, string> = {};
    offices.forEach(o => { m[o.id] = o.name; });
    return m;
  }, [offices]);

  const customers: CustomerRow[] = useMemo(() => {
    const map = new Map<string, CustomerRow>();
    orders.forEach(o => {
      if (!o.customer_name && !o.customer_phone) return;
      const key = (o.customer_phone || '') + '|' + (o.customer_name || '');
      const existing = map.get(key);
      const amount = Number(o.price || 0) + Number(o.delivery_price || 0);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += amount;
        if (!existing.lastOrder || o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
      } else {
        map.set(key, {
          key,
          name: o.customer_name || '-',
          phone: o.customer_phone || '',
          address: o.address || '-',
          office_name: officeMap[o.office_id] || '-',
          totalOrders: 1,
          totalSpent: amount,
          lastOrder: o.created_at,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalOrders - a.totalOrders);
  }, [orders, officeMap]);

  const filtered = customers.filter(c =>
    !search || c.name.includes(search) || c.phone.includes(search) || c.address.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> العملاء
        </h1>
        <Badge variant="outline">{filtered.length} عميل</Badge>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الهاتف أو العنوان..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 bg-secondary border-border" />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">اسم العميل</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-center">عدد الأوردرات</TableHead>
                  <TableHead className="text-center">إجمالي القيمة</TableHead>
                  <TableHead className="text-right">آخر أوردر</TableHead>
                  <TableHead className="text-center">اتصال</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا يوجد عملاء</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.key} className="border-border">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{c.phone || '-'}</TableCell>
                    <TableCell className="text-sm max-w-[260px] truncate">{c.address}</TableCell>
                    <TableCell className="text-sm">{c.office_name}</TableCell>
                    <TableCell className="text-center font-bold">{c.totalOrders}</TableCell>
                    <TableCell className="text-center font-bold">{c.totalSpent} ج.م</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('ar-EG') : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        {c.phone && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(`tel:${c.phone}`)}>
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(`https://wa.me/${c.phone.replace(/^0/, '20')}`)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
