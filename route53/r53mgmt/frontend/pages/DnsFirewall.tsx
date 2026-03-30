import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, ShieldAlert, List, Network, ExternalLink } from 'lucide-react';
import { useFirewallRuleGroups, useFirewallDomainLists } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { awsConsole as aws } from '@/lib/console-urls';

const actionColor: Record<string, string> = {
  ALLOW: 'bg-emerald-100 text-emerald-700',
  BLOCK: 'bg-red-100 text-red-700',
  ALERT: 'bg-amber-100 text-amber-700',
};

export function DnsFirewall() {
  const { data: ruleGroups, live: rgLive, refreshing: rgRefreshing, refetch: rgRefetch } = useFirewallRuleGroups();
  const { data: domainLists, live: dlLive, refetch: dlRefetch } = useFirewallDomainLists();
  const live = rgLive || dlLive;
  const refetch = async () => { await Promise.all([rgRefetch(), dlRefetch()]); };

  const totalVpcs = new Set(ruleGroups.flatMap(g => (g.vpcAssociations || []).map(v => v.vpcId))).size;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="DNS Firewall"
        subtitle="Resolver DNS Firewall rule groups and domain lists"
        loading={!live}
        refreshing={rgRefreshing}
        onRefresh={refetch}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ShieldCheck} color="blue" value={ruleGroups.length} label="Rule Groups" />
        <StatCard icon={List} color="purple" value={domainLists.length} label="Domain Lists" />
        <StatCard icon={Network} color="emerald" value={totalVpcs} label="Protected VPCs" />
      </div>

      {ruleGroups.map(group => (
        <Card key={group.Id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                {group.Name}
                <a href={aws.firewallRuleGroup(group.Id)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /></a>
              </CardTitle>
              <div className="flex gap-2">
                {(group.vpcAssociations || []).map(v => (
                  <Badge key={v.vpcId} variant="outline" className="text-[10px]">{v.name || v.vpcId}</Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Domain List</TableHead>
                  <TableHead>Block Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(group.rules || []).map((rule, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{rule.Priority}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px]', actionColor[rule.Action])}>{rule.Action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{rule.FirewallDomainListId}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{rule.BlockResponse || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle className="text-base">Domain Lists</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Domain Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domainLists.map(dl => (
                <TableRow key={dl.Id}>
                  <TableCell className="font-medium text-sm">
                    {dl.Name}
                    <a href={aws.firewallDomainList(dl.Id)} target="_blank" rel="noreferrer" className="ml-2 text-muted-foreground hover:text-foreground inline-flex"><ExternalLink className="h-3 w-3" /></a>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{dl.Id}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('text-[10px]',
                      dl.ManagedOwnerName === 'Route 53 Resolver DNS Firewall' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {dl.ManagedOwnerName ? 'AWS' : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{dl.DomainCount ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
