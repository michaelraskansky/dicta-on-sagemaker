import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertTriangle, CheckCircle, XCircle, ExternalLink, Shield, KeyRound, Play, RefreshCw } from 'lucide-react';
import { API } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { awsConsole as aws } from '@/lib/console-urls';

interface Operation {
  executionArn: string; name: string; status: string; startDate: string; stopDate?: string;
  currentStep: string; taskToken?: string; type: string; zoneName: string;
  parentZoneName?: string; oldKskName?: string; newKskName?: string;
}

interface KskInfo { Name: string; Status: string; KmsArn: string; KeyTag: number; CreatedDate: string; SigningAlgorithmMnemonic: string }
interface ZoneDnssec { zoneId: string; zoneName: string; signing: boolean; ksks: KskInfo[] }

const statusColor: Record<string, string> = { SUCCEEDED: 'bg-emerald-100 text-emerald-700', RUNNING: 'bg-blue-100 text-blue-700', FAILED: 'bg-red-100 text-red-700', ABORTED: 'bg-zinc-100 text-zinc-600', TIMED_OUT: 'bg-amber-100 text-amber-700' };
const typeColor: Record<string, string> = { 'create-zone': 'bg-blue-100 text-blue-700', 'ksk-rotation': 'bg-amber-100 text-amber-700' };
const typeLabel: Record<string, string> = { 'create-zone': 'Create Zone', 'ksk-rotation': 'KSK Rotation' };
const approvalLabels: Record<string, string> = { NotifyManualDsAdd: 'Confirm DS Added', NotifyManualDsRemove: 'Confirm Old DS Removed', NotifyManualNs: 'Confirm NS Added' };
const kskStatusColor: Record<string, string> = { ACTIVE: 'bg-emerald-100 text-emerald-700', INACTIVE: 'bg-zinc-100 text-zinc-600', ACTION_NEEDED: 'bg-amber-100 text-amber-700' };

export function ZoneOperations() {
  const [searchParams] = useSearchParams();
  const [ops, setOps] = useState<Operation[]>([]);
  const [dnssecData, setDnssecData] = useState<ZoneDnssec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') || '');

  const loadOps = useCallback(async () => {
    try {
      const params = typeFilter ? `?type=${typeFilter}` : '';
      const res = await fetch(`${API}/operations${params}`);
      if (res.ok) { setOps(await res.json()); setLoading(false); }
    } catch { setLoading(false); }
  }, [typeFilter]);

  const loadDnssec = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dnssec/summary`);
      if (res.ok) setDnssecData(await res.json());
    } catch {}
  }, []);

  useEffect(() => { loadOps(); loadDnssec(); const i = setInterval(loadOps, 10000); return () => clearInterval(i); }, [loadOps, loadDnssec]);

  const approveTask = async (op: Operation) => {
    if (!op.taskToken || approving) return;
    setApproving(op.executionArn);
    setError(null);
    try {
      const res = await fetch(`${API}/operations/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskToken: op.taskToken }),
      });
      if (!res.ok) { setError('Approval failed'); return; }
      setTimeout(loadOps, 1000);
    } catch { setError('Network error — could not approve'); }
    finally { setApproving(null); }
  };

  const triggerRotation = async (z: ZoneDnssec) => {
    if (!z.ksks.length || starting) return;
    const oldKsk = z.ksks.find(k => k.Status === 'ACTIVE');
    if (!oldKsk) return;
    const newName = `${z.zoneName.split('.')[0]}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Math.random().toString(36).slice(2, 6)}`;
    const parentZone = dnssecData.find(p => p.zoneId !== z.zoneId && z.zoneName.endsWith(`.${p.zoneName}`) && p.signing);
    setStarting(z.zoneId);
    setError(null);
    try {
      const res = await fetch(`${API}/rotation/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostedZoneId: z.zoneId, zoneName: z.zoneName, oldKskName: oldKsk.Name, newKskName: newName, parentZoneId: parentZone?.zoneId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        setError(body.error || 'Failed to start rotation');
        return;
      }
      setTimeout(loadOps, 1000);
    } catch { setError('Network error — could not start rotation'); }
    finally { setStarting(null); }
  };

  const signingZones = dnssecData.filter(z => z.signing);
  const running = ops.filter(e => e.status === 'RUNNING').length;
  const awaiting = ops.filter(e => e.status === 'RUNNING' && e.taskToken).length;
  const succeeded = ops.filter(e => e.status === 'SUCCEEDED').length;
  const failed = ops.filter(e => e.status === 'FAILED' || e.status === 'ABORTED' || e.status === 'TIMED_OUT').length;
  const activeFilter = statusFilter ?? (running > 0 ? 'active' : 'succeeded');

  const filtered = ops.filter(e => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return e.status === 'RUNNING';
    if (activeFilter === 'succeeded') return e.status === 'SUCCEEDED';
    return e.status === 'FAILED' || e.status === 'ABORTED' || e.status === 'TIMED_OUT';
  });

  const refresh = async () => { setRefreshing(true); await Promise.all([loadOps(), loadDnssec()]); setRefreshing(false); };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Zone Operations" subtitle="DNS workflows, DNSSEC key rotation, and child zone creation"
        loading={loading} refreshing={refreshing} onRefresh={refresh} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-medium">Dismiss</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={Clock} color="blue" value={running} label="Running" />
        <StatCard icon={AlertTriangle} color="amber" value={awaiting} label="Awaiting Approval" />
        <StatCard icon={CheckCircle} color="emerald" value={succeeded} label="Succeeded" />
        <StatCard icon={XCircle} color="red" value={failed} label="Failed" />
      </div>

      {/* DNSSEC KSK Status + Rotation Triggers */}
      {signingZones.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">DNSSEC Key Signing Keys</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {signingZones.map(z => (
              <div key={z.zoneId} className="flex items-center gap-4 rounded-lg border p-3">
                <Shield className="h-4 w-4 text-emerald-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{z.zoneName}</div>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {z.ksks.map(k => (
                      <div key={k.Name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <KeyRound className="h-3 w-3" />
                        <span className="font-mono">{k.Name}</span>
                        <Badge variant="secondary" className={cn('text-[10px]', kskStatusColor[k.Status])}>{k.Status}</Badge>
                        <span>tag:{k.KeyTag}</span>
                        <span className="text-muted-foreground/60">{new Date(k.CreatedDate).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => triggerRotation(z)} disabled={!!starting}
                  className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors',
                    starting === z.zoneId ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700')}>
                  {starting === z.zoneId ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  {starting === z.zoneId ? 'Starting…' : 'Rotate KSK'}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Execution list */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {(['active', 'succeeded', 'failed', 'all'] as const).map(f => {
            const count = f === 'all' ? ops.length : f === 'active' ? running : f === 'succeeded' ? succeeded : failed;
            return (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  activeFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                {f.charAt(0).toUpperCase() + f.slice(1)}{count > 0 && ` (${count})`}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <select className="rounded-md border bg-transparent px-2 py-1 text-xs" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="create-zone">Create Zone</option>
          <option value="ksk-rotation">KSK Rotation</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No operations found</div>
        ) : filtered.map(op => {
          const isAwaiting = op.status === 'RUNNING' && op.taskToken;
          return (
            <div key={op.executionArn} className="flex items-center gap-4 rounded-lg border p-3">
              <span className={cn('inline-block h-2 w-2 rounded-full shrink-0',
                isAwaiting ? 'bg-amber-400 animate-pulse' : op.status === 'RUNNING' ? 'bg-blue-400 animate-pulse' : op.status === 'SUCCEEDED' ? 'bg-emerald-500' : 'bg-red-500')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{op.zoneName || op.name}</span>
                  <Badge variant="secondary" className={cn('text-[10px]', typeColor[op.type])}>{typeLabel[op.type] || op.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {op.type === 'ksk-rotation' && op.oldKskName && <>{op.oldKskName} → {op.newKskName}</>}
                  {op.type === 'create-zone' && op.parentZoneName && <>parent: {op.parentZoneName}</>}
                  {op.currentStep && (
                    <span className="ml-2 font-mono text-blue-600">
                      @ {op.currentStep}
                      {op.taskToken && <span className="text-amber-600 ml-1">(awaiting approval)</span>}
                    </span>
                  )}
                </div>
              </div>
              {op.taskToken && approvalLabels[op.currentStep] && (
                <button onClick={() => approveTask(op)} disabled={approving === op.executionArn}
                  className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap',
                    approving === op.executionArn ? 'bg-amber-400 cursor-wait' : 'bg-amber-600 hover:bg-amber-700')}>
                  <CheckCircle className="h-3 w-3" />
                  {approving === op.executionArn ? 'Approving…' : approvalLabels[op.currentStep]}
                </button>
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">{op.startDate ? new Date(op.startDate).toLocaleString() : ''}</span>
              <Badge variant="secondary" className={cn('text-[10px]', statusColor[op.status])}>{op.status}</Badge>
              <a href={aws.sfnExecution(op.executionArn)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /></a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
