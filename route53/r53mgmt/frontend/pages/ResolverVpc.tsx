import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Network, ArrowDownToLine, ArrowUpFromLine, Route, ExternalLink } from 'lucide-react';
import { useResolverEndpoints, useResolverRules } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { awsConsole as aws } from '@/lib/console-urls';

const dirBadge: Record<string, { className: string; icon: typeof ArrowDownToLine }> = {
  INBOUND: { className: 'bg-blue-100 text-blue-700', icon: ArrowDownToLine },
  OUTBOUND: { className: 'bg-purple-100 text-purple-700', icon: ArrowUpFromLine },
};

const ruleTypeBadge: Record<string, string> = {
  FORWARD: 'bg-blue-100 text-blue-700',
  SYSTEM: 'bg-zinc-100 text-zinc-700',
  RECURSIVE: 'bg-emerald-100 text-emerald-700',
};

export function ResolverVpc() {
  const { data: endpoints, live: epLive, refreshing, refetch: epRefetch } = useResolverEndpoints();
  const { data: rules, live: ruLive, refetch: ruRefetch } = useResolverRules();
  const live = epLive || ruLive;
  const refetch = async () => { await Promise.all([epRefetch(), ruRefetch()]); };

  const inbound = endpoints.filter(e => e.Direction === 'INBOUND').length;
  const outbound = endpoints.filter(e => e.Direction === 'OUTBOUND').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Resolver & VPC"
        subtitle="Resolver endpoints, forwarding rules, and VPC associations"
        loading={!live}
        refreshing={refreshing}
        onRefresh={refetch}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={ArrowDownToLine} color="blue" value={inbound} label="Inbound" />
        <StatCard icon={ArrowUpFromLine} color="purple" value={outbound} label="Outbound" />
        <StatCard icon={Route} color="emerald" value={rules.length} label="Rules" />
        <StatCard icon={Network} color="amber" value={new Set(endpoints.map(e => e.HostVPCId)).size} label="VPCs" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Resolver Endpoints</CardTitle></CardHeader>
        <div className="px-6 pb-6 space-y-4">
          {endpoints.map(ep => {
            const dir = dirBadge[ep.Direction] || dirBadge.INBOUND;
            const DirIcon = dir.icon;
            return (
              <div key={ep.Id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DirIcon className="h-4 w-4" />
                    <span className="font-medium text-sm">{ep.Name || ep.Id}</span>
                    <Badge variant="secondary" className={cn('text-[10px]', dir.className)}>{ep.Direction}</Badge>
                    <a href={aws.resolverEndpoint(ep.Id)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /></a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{ep.HostVPCId}</Badge>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">{ep.Status}</Badge>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(ep.ipAddresses || []).map(ip => (
                    <div key={ip.Ip} className="flex items-center gap-3 rounded bg-muted/50 px-3 py-2 text-sm">
                      <span className="font-mono">{ip.Ip}</span>
                      <span className="text-xs text-muted-foreground">{ip.SubnetId}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Resolver Rules</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target IPs</TableHead>
              <TableHead>VPC Associations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map(rule => (
              <TableRow key={rule.Id}>
                <TableCell className="font-medium text-sm">
                  {rule.Name || rule.Id}
                  <a href={aws.resolverRule(rule.Id)} target="_blank" rel="noreferrer" className="ml-2 text-muted-foreground hover:text-foreground inline-flex"><ExternalLink className="h-3 w-3" /></a>
                </TableCell>
                <TableCell className="font-mono text-sm">{rule.DomainName}</TableCell>
                <TableCell><Badge variant="secondary" className={cn('text-[10px]', ruleTypeBadge[rule.RuleType])}>{rule.RuleType}</Badge></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {rule.TargetIps?.map(t => `${t.Ip}:${t.Port}`).join(', ') || '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{(rule.vpcAssociations || []).length} VPC{(rule.vpcAssociations || []).length !== 1 ? 's' : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
