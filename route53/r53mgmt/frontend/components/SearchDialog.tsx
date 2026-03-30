import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { useZones, API } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { awsConsole as aws } from '@/lib/console-urls';
import { typeColors } from '@/lib/dns';

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return <>{text.slice(0, idx)}<span className="bg-yellow-200/80 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</>;
}

type MatchMode = 'contains' | 'exact' | 'starts' | 'ends';
interface SearchResult { name: string; type: string; value: string; ttl: number; zoneId: string; zoneName: string }
interface SearchStats { recordCount: number; zoneCount: number; lastUpdated: string | null; building: boolean }

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'];
const MATCH_MODES: { value: MatchMode; label: string }[] = [
  { value: 'contains', label: 'Contains' }, { value: 'exact', label: 'Exact' },
  { value: 'starts', label: 'Starts with' }, { value: 'ends', label: 'Ends with' },
];

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [matchMode, setMatchMode] = useState<MatchMode>('contains');
  const [ttlMin, setTtlMin] = useState('');
  const [ttlMax, setTtlMax] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const navigate = useNavigate();
  const { data: zones } = useZones();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;
    fetch(`${API}/search/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, [open]);

  const doSearch = useCallback(() => {
    if (query.length < 2) { setResults([]); setLoading(false); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const params = new URLSearchParams({ q: query, mode: matchMode });
    if (typeFilter) params.set('type', typeFilter);
    if (zoneFilter) params.set('zone', zoneFilter);
    if (ttlMin) params.set('ttlMin', ttlMin);
    if (ttlMax) params.set('ttlMax', ttlMax);
    fetch(`${API}/search?${params}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => { if (!ctrl.signal.aborted) { setResults(data); setLoading(false); } })
      .catch(() => { if (!ctrl.signal.aborted) setLoading(false); });
  }, [query, typeFilter, zoneFilter, matchMode, ttlMin, ttlMax]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(doSearch, 300);
    return () => clearTimeout(debounceRef.current);
  }, [doSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onOpenChange(!open); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const handleSelect = useCallback((zoneId: string) => {
    navigate(`/zone/${zoneId}`);
    onOpenChange(false);
    setQuery('');
  }, [navigate, onOpenChange]);

  const zoneNames = useMemo(() => [...new Set(zones.map(z => z.Name.replace(/\.$/, '')))].sort(), [zones]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search records across all zones…"
            value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex items-center gap-3 border-b px-4 py-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Match:</span>
          <div className="flex gap-1">
            {MATCH_MODES.map(m => (
              <button key={m.value}
                className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                  matchMode === m.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
                onClick={() => setMatchMode(m.value)}>{m.label}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-b px-4 py-2 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Type:</span>
          <div className="flex gap-1">
            <button className={cn('rounded-full px-2 py-0.5 text-xs font-medium transition-colors', !typeFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')} onClick={() => setTypeFilter('')}>All</button>
            {RECORD_TYPES.map(t => (
              <button key={t} className={cn('rounded-full px-2 py-0.5 text-xs font-medium transition-colors', typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}>{t}</button>
            ))}
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Zone:</span>
          <select className="rounded-md border bg-transparent px-2 py-0.5 text-xs" value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
            <option value="">All zones</option>
            {zoneNames.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase">TTL:</span>
          <input className="w-16 rounded-md border bg-transparent px-2 py-0.5 text-xs" placeholder="Min" value={ttlMin} onChange={e => setTtlMin(e.target.value)} />
          <span className="text-xs text-muted-foreground">–</span>
          <input className="w-16 rounded-md border bg-transparent px-2 py-0.5 text-xs" placeholder="Max" value={ttlMax} onChange={e => setTtlMax(e.target.value)} />
        </div>

        <div className="max-h-96 overflow-auto">
          {query.length < 2 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Type at least 2 characters
              {stats && <span> · {stats.recordCount.toLocaleString()} records indexed across {stats.zoneCount} zones</span>}
              {stats?.building && <span className="ml-1 text-amber-600">(indexing…)</span>}
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Searching…</div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No records found for "{query}"</div>
          ) : (
            <div>
              <div className="px-4 py-2 text-xs text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''} across {new Set(results.map(r => r.zoneId)).size} zone{new Set(results.map(r => r.zoneId)).size !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-[60px_1fr_1fr_80px_60px_24px] gap-2 px-4 py-1.5 text-[10px] font-medium uppercase text-muted-foreground border-b">
                <span>Type</span><span>Name</span><span>Value</span><span>Zone</span><span>TTL</span><span />
              </div>
              {results.map((r, i) => (
                <button key={`${r.zoneId}-${r.type}-${r.name}-${i}`}
                  className="grid grid-cols-[60px_1fr_1fr_80px_60px_24px] gap-2 w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-muted"
                  onClick={() => handleSelect(r.zoneId)}>
                  <Badge variant="secondary" className={cn('text-[10px] font-mono w-fit', typeColors[r.type] || 'bg-zinc-100 text-zinc-700')}>{r.type}</Badge>
                  <span className="truncate font-mono text-xs" title={r.name}><Highlight text={r.name} query={query} /></span>
                  <span className="truncate font-mono text-xs text-muted-foreground" title={r.value}><Highlight text={r.value} query={query} /></span>
                  <span className="truncate text-xs text-muted-foreground">{r.zoneName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{r.ttl}</span>
                  <a href={aws.zone(r.zoneId)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
