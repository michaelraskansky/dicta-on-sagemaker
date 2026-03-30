import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Globe, Server, ArrowRight, ExternalLink } from 'lucide-react';
import { useTrafficPolicies, type AwsTrafficPolicy } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { awsConsole as aws } from '@/lib/console-urls';

const ruleTypeMap: Record<string, string> = { geo: 'geolocation', failover: 'failover', weighted: 'weighted', latency: 'latency', multivalue: 'multivalue' };
const ruleColors: Record<string, string> = { geo: 'border-emerald-300 bg-emerald-50', failover: 'border-red-300 bg-red-50', weighted: 'border-blue-300 bg-blue-50', latency: 'border-purple-300 bg-purple-50' };
const ruleBadgeColors: Record<string, string> = { geo: 'bg-emerald-100 text-emerald-700', failover: 'bg-red-100 text-red-700', weighted: 'bg-blue-100 text-blue-700', latency: 'bg-purple-100 text-purple-700' };

function getLocationLabel(loc: { IsDefault?: boolean; Country?: string; Continent?: string; Subdivision?: string; FailoverType?: string; Weight?: number }): string {
  if (loc.IsDefault) return 'Default';
  if (loc.Country) return loc.Country;
  if (loc.Continent) return loc.Continent;
  if (loc.Subdivision) return loc.Subdivision;
  if (loc.FailoverType) return loc.FailoverType;
  if (loc.Weight !== undefined) return `Weight: ${loc.Weight}`;
  return '';
}

function PolicyFlow({ policy }: { policy: AwsTrafficPolicy }) {
  let doc: { Endpoints?: Record<string, { Value?: string }>; Rules?: Record<string, { RuleType?: string; Locations?: unknown[]; Items?: unknown[] }>; StartRule?: string; StartEndpoint?: string; RecordType?: string } | null = null;
  try { doc = typeof policy.document === 'string' ? JSON.parse(policy.document) : policy.document; } catch {}

  const instances = policy.instances || [];
  const endpoints = doc?.Endpoints || {};
  const rules = doc?.Rules || {};
  const startRule = doc?.StartRule ? rules[doc.StartRule] : null;
  const startEndpoint = doc?.StartEndpoint ? endpoints[doc.StartEndpoint] : null;

  // Build endpoint list with labels from the rule
  let routedEndpoints: { value: string; label: string }[] = [];
  if (startRule) {
    const locations = startRule.Locations || startRule.Items || [];
    routedEndpoints = locations.map(loc => {
      const epId = (loc as { EndpointReference?: string }).EndpointReference;
      const ep = epId ? endpoints[epId] : null;
      return { value: ep?.Value || epId || '?', label: getLocationLabel(loc as Parameters<typeof getLocationLabel>[0]) };
    });
  } else if (startEndpoint) {
    routedEndpoints = [{ value: startEndpoint.Value || '', label: '' }];
  }

  const ruleType = startRule?.RuleType || '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {policy.Name}
            <a href={aws.trafficPolicy(policy.Id)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /></a>
          </CardTitle>
          <div className="flex items-center gap-2">
            {ruleType && <Badge variant="secondary" className={cn('text-[10px]', ruleBadgeColors[ruleType])}>{ruleTypeMap[ruleType] || ruleType}</Badge>}
            <Badge variant="outline" className="text-[10px]">v{policy.LatestVersion}</Badge>
            <Badge variant="outline" className="text-[10px]">{instances.length} instance{instances.length !== 1 ? 's' : ''}</Badge>
            <Badge variant="secondary" className="text-[10px]">{policy.Type}</Badge>
          </div>
        </div>
        {policy.Comment && <p className="text-xs text-muted-foreground">{policy.Comment}</p>}
      </CardHeader>
      <CardContent>
        {/* Flow visualization */}
        <div className="flex items-center gap-4">
          {/* Start node */}
          <div className="flex items-center gap-2 rounded-lg border-2 border-zinc-300 bg-zinc-50 px-4 py-3">
            <Globe className="h-4 w-4 text-zinc-600" />
            <span className="font-mono text-sm font-medium">{doc?.RecordType || policy.Type}</span>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* Rule node (if any) */}
          {startRule && (
            <>
              <div className={cn('flex items-center gap-2 rounded-lg border-2 px-4 py-3', ruleColors[ruleType] || 'border-zinc-300 bg-zinc-50')}>
                <GitBranch className="h-4 w-4" />
                <span className="text-sm font-medium">{ruleTypeMap[ruleType] || ruleType}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </>
          )}

          {/* Endpoints */}
          <div className="flex flex-col gap-2">
            {routedEndpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-2">
                {ep.label && <span className="w-16 text-right text-[10px] font-medium text-muted-foreground">{ep.label}</span>}
                <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3 shadow-sm">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-sm">{ep.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instances */}
        {instances.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Instances</div>
            {instances.map(inst => (
              <div key={inst.Id} className="flex items-center gap-3 rounded bg-muted/50 px-3 py-2 text-sm">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono">{inst.Name}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-muted-foreground">{inst.HostedZoneId}</span>
                <Badge variant="secondary" className="text-[10px]">{inst.State}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TrafficFlow() {
  const { data: policies, live, refreshing, refetch } = useTrafficPolicies();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Traffic Flow"
        subtitle="Traffic policies and routing visualizations"
        loading={!live}
        refreshing={refreshing}
        onRefresh={refetch}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={GitBranch} color="blue" value={policies.length} label="Policies" />
        <StatCard icon={Server} color="purple" value={policies.reduce((a, p) => a + (p.instances?.length || 0), 0)} label="Instances" />
        <StatCard icon={Globe} color="emerald" value={policies.reduce((a, p) => a + (p.TrafficPolicyCount || 1), 0)} label="Versions" />
      </div>

      {policies.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No traffic policies configured</CardContent></Card>
      ) : policies.map(p => <PolicyFlow key={p.Id} policy={p} />)}
    </div>
  );
}
