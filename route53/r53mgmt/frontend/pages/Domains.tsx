import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, AlertTriangle, Lock, Unlock, RefreshCw, ExternalLink } from 'lucide-react';
import { useDomains } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { awsConsole as aws } from '@/lib/console-urls';

const statusBadge: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-700' },
};

export function Domains() {
  const { data: domains, live, refreshing, refetch } = useDomains();

  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
  const getStatus = (d: { expiry?: string }) => {
    if (!d.expiry) return 'active';
    const exp = new Date(d.expiry);
    if (exp < now) return 'expired';
    if (exp < soonThreshold) return 'expiring_soon';
    return 'active';
  };

  const expiring = domains.filter(d => getStatus(d) === 'expiring_soon').length;
  const expired = domains.filter(d => getStatus(d) === 'expired').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Domain Registration"
        subtitle="Domain lifecycle, expiry tracking, and transfer lock status"
        loading={!live}
        refreshing={refreshing}
        onRefresh={refetch}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={Globe} color="blue" value={domains.length} label="Domains" />
        <StatCard icon={RefreshCw} color="emerald" value={domains.filter(d => d.autoRenew).length} label="Auto-Renew" />
        <StatCard icon={AlertTriangle} color="amber" value={expiring} label="Expiring Soon" />
        <StatCard icon={AlertTriangle} color="red" value={expired} label="Expired" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Auto-Renew</TableHead>
              <TableHead>Transfer Lock</TableHead>
              <TableHead>Registrar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No domains registered through Route 53</TableCell></TableRow>
            ) : domains.map(d => {
              const status = getStatus(d);
              const s = statusBadge[status];
              return (
                <TableRow key={d.name}>
                  <TableCell className="font-mono text-sm font-medium">
                    {d.name}
                    <a href={aws.domain(d.name)} target="_blank" rel="noreferrer" className="ml-2 text-muted-foreground hover:text-foreground inline-flex"><ExternalLink className="h-3 w-3" /></a>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className={cn('text-[10px]', s.className)}>{s.label}</Badge></TableCell>
                  <TableCell className="text-sm">{d.expiry ? new Date(d.expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</TableCell>
                  <TableCell>
                    {d.autoRenew
                      ? <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">On</Badge>
                      : <Badge variant="secondary" className="text-[10px] bg-zinc-100 text-zinc-600">Off</Badge>}
                  </TableCell>
                  <TableCell>
                    {d.transferLock
                      ? <Lock className="h-4 w-4 text-emerald-500" />
                      : <Unlock className="h-4 w-4 text-amber-500" />}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.registrar || '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
