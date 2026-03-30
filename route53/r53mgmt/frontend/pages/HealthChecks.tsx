import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, CheckCircle2, XCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useHealthChecks } from '@/hooks/useApi';
import type { AwsHealthCheck } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { awsConsole as aws } from '@/lib/console-urls';

function isHealthy(hc: AwsHealthCheck) {
  if (hc.checkerResults.length === 0) return 'unknown';
  const healthyCount = hc.checkerResults.filter(c => c.StatusReport?.Status?.startsWith('Success')).length;
  return healthyCount > hc.checkerResults.length / 2 ? 'healthy' : 'unhealthy';
}

function HealthCheckRow({ hc }: { hc: AwsHealthCheck }) {
  const [open, setOpen] = useState(false);
  const status = isHealthy(hc);
  const cfg = hc.HealthCheckConfig;
  const endpoint = cfg.FullyQualifiedDomainName || cfg.IPAddress || '—';

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setOpen(!open)}>
        <TableCell>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </TableCell>
        <TableCell>
          {status === 'healthy' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            : status === 'unhealthy' ? <XCircle className="h-4 w-4 text-red-500" />
            : <Activity className="h-4 w-4 text-zinc-400" />}
        </TableCell>
        <TableCell className="font-mono text-sm">{endpoint}</TableCell>
        <TableCell><Badge variant="secondary" className="text-[10px]">{cfg.Type}</Badge></TableCell>
        <TableCell className="text-sm text-muted-foreground">:{cfg.Port}{cfg.ResourcePath || ''}</TableCell>
        <TableCell className="text-sm">{hc.checkerResults.length} checkers</TableCell>
        <TableCell className="text-xs text-muted-foreground">{cfg.RequestInterval}s</TableCell>
        <TableCell><a href={aws.healthCheck(hc.Id)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /></a></TableCell>
      </TableRow>
      {open && hc.checkerResults.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 p-0">
            <div className="px-8 py-3 space-y-2 animate-fade-in">
              <div className="text-xs font-medium text-muted-foreground mb-2">Regional Health Checkers</div>
              {hc.checkerResults.map((c, i) => {
                const ok = c.StatusReport?.Status?.startsWith('Success');
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                    <span className="w-24 font-mono text-xs">{c.Region || '—'}</span>
                    <span className="w-28 font-mono text-xs text-muted-foreground">{c.IPAddress || '—'}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded', ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50')}>
                      {c.StatusReport?.Status || 'Unknown'}
                    </span>
                  </div>
                );
              })}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function HealthChecks() {
  const { data: checks, loading, refreshing, refetch } = useHealthChecks();
  const healthy = checks.filter(h => isHealthy(h) === 'healthy').length;
  const unhealthy = checks.filter(h => isHealthy(h) === 'unhealthy').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Health Checks"
        subtitle={loading ? 'Loading...' : `${checks.length} health checks`}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refetch}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Activity} color="blue" value={checks.length} label="Total" />
        <StatCard icon={CheckCircle2} color="emerald" value={healthy} label="Healthy" />
        <StatCard icon={XCircle} color="red" value={unhealthy} label="Unhealthy" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-8">Status</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Port/Path</TableHead>
              <TableHead>Checkers</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.length === 0 && !loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No health checks configured</TableCell></TableRow>
            ) : checks.map(hc => <HealthCheckRow key={hc.Id} hc={hc} />)}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
