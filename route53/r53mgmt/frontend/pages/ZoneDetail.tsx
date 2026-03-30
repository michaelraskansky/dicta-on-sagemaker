import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, ShieldOff, ArrowUpDown, ExternalLink, Search, Tag, RefreshCw, Plus } from 'lucide-react';
import { useZoneDetail, useRecords } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { awsConsole as aws } from '@/lib/console-urls';
import { typeColors } from '@/lib/dns';
import { CreateChildZoneDialog } from '@/components/CreateChildZoneDialog';

type SortKey = 'name' | 'type' | 'value' | 'ttl';

export function ZoneDetail() {
  const { zoneId = '' } = useParams<{ zoneId: string }>();
  const { data: detail, loading: detailLoading, refreshing: detailRefreshing, refetch: refetchDetail } = useZoneDetail(zoneId);
  const { data: records, loading: recordsLoading, refreshing: recordsRefreshing, refetch: refetchRecords } = useRecords(zoneId);

  if (!zoneId) {
    return <div className="py-12 text-center text-muted-foreground">No zone ID specified</div>;
  }
  const refreshing = detailRefreshing || recordsRefreshing;
  const refetch = () => { refetchDetail(); refetchRecords(); };

  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const flatRecords = useMemo(() => {
    return records.flatMap(r => {
      const values = r.ResourceRecords?.map(rr => rr.Value) || (r.AliasTarget ? [`ALIAS → ${r.AliasTarget.DNSName}`] : ['—']);
      return values.map(v => ({ name: r.Name, type: r.Type, value: v, ttl: r.TTL || 0 }));
    });
  }, [records]);

  const types = [...new Set(flatRecords.map(r => r.type))].sort();

  const filtered = useMemo(() => {
    let recs = flatRecords;
    if (filter) {
      const q = filter.toLowerCase();
      recs = recs.filter(r => r.name.toLowerCase().includes(q) || r.value.toLowerCase().includes(q));
    }
    if (typeFilter) recs = recs.filter(r => r.type === typeFilter);
    recs.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'number' ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
    return recs;
  }, [flatRecords, filter, typeFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  if (detailLoading || recordsLoading) {
    return <div className="py-12 text-center text-muted-foreground animate-pulse">Loading zone data...</div>;
  }

  if (!detail?.zone) {
    return <div className="py-12 text-center text-muted-foreground">Zone not found</div>;
  }

  const dnssecEnabled = detail.dnssec?.ServeSignature === 'SIGNING';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">{detail.zone.Name}</h1>
          <p className="text-sm text-muted-foreground">
            Zone ID: {zoneId}
            {detail.zone.Config.Comment && ` · ${detail.zone.Config.Comment}`}
            {detail.zone.Config.PrivateZone && ' · Private'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Create Child Zone
          </button>
          <button onClick={refetch} className="rounded-md border p-1.5 hover:bg-muted"><RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /></button>
          <span className={cn('inline-block h-2 w-2 rounded-full transition-colors duration-300',
            detailLoading || recordsLoading ? 'bg-blue-400 animate-pulse' : 'bg-emerald-500')} />
          <a
            href={aws.zone(zoneId)}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Route 53 Console <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <CreateChildZoneDialog open={createOpen} onOpenChange={setCreateOpen} prefilledParentZoneId={zoneId} />

      {/* DNSSEC + Tags */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="flex items-center gap-4 pt-6">
            {dnssecEnabled ? <Shield className="h-5 w-5 text-emerald-600" /> : <ShieldOff className="h-5 w-5 text-zinc-400" />}
            <div className="flex-1">
              <Badge variant="secondary" className={cn('text-xs', dnssecEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600')}>
                {dnssecEnabled ? 'DNSSEC Enabled' : 'DNSSEC Disabled'}
              </Badge>
              {detail.keySigningKeys?.length > 0 && (
                <span className="ml-3 text-xs text-muted-foreground">
                  KSK: {detail.keySigningKeys.map(k => k.Name).join(', ')}
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{flatRecords.length} records</span>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {detail.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {detail.tags.map(t => (
            <Badge key={t.Key} variant="outline" className="text-[10px]">{t.Key}: {t.Value}</Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Filter records…" value={filter} onChange={e => setFilter(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors', !typeFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
            onClick={() => setTypeFilter('')}
          >All</button>
          {types.map(t => (
            <button key={t}
              className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors', typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
              onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Records table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {(['name', 'type', 'value', 'ttl'] as SortKey[]).map(key => (
                <TableHead key={key} className="cursor-pointer select-none" onClick={() => toggleSort(key)}>
                  <span className="flex items-center gap-1">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No records match</TableCell></TableRow>
            ) : filtered.map((r, i) => (
              <TableRow key={`${r.name}-${r.type}-${i}`}>
                <TableCell className="font-mono text-sm">{r.name}</TableCell>
                <TableCell><Badge variant="secondary" className={cn('text-[10px] font-mono', typeColors[r.type] || 'bg-zinc-100 text-zinc-700')}>{r.type}</Badge></TableCell>
                <TableCell className="max-w-md truncate font-mono text-xs text-muted-foreground">{r.value}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.ttl || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
