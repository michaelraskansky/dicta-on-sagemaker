import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, FileText, Shield, AlertTriangle, ExternalLink, Plus } from 'lucide-react';
import { useZones } from '@/hooks/useApi';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { awsConsole as aws } from '@/lib/console-urls';
import { extractZoneId } from '@/lib/dns';
import { CreateChildZoneDialog } from '@/components/CreateChildZoneDialog';

export function Dashboard() {
  const navigate = useNavigate();
  const { data: zones, loading, refreshing, refetch } = useZones();
  const [createOpen, setCreateOpen] = useState(false);

  const publicZones = zones.filter(z => !z.Config.PrivateZone);
  const privateZones = zones.filter(z => z.Config.PrivateZone);
  const totalRecords = zones.reduce((a, z) => a + z.ResourceRecordSetCount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Dashboard"
          subtitle={loading ? 'Loading...' : `${zones.length} hosted zones across account`}
          loading={loading}
          refreshing={refreshing}
          onRefresh={refetch}
        />
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Create Child Zone
        </button>
      </div>
      <CreateChildZoneDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Globe} color="blue" value={zones.length} label="Hosted Zones" />
        <StatCard icon={FileText} color="purple" value={totalRecords} label="DNS Records" />
        <StatCard icon={Shield} color="emerald" value={publicZones.length} label="Public Zones" />
        <StatCard icon={AlertTriangle} color="amber" value={privateZones.length} label="Private Zones" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Public Zones</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {publicZones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No public zones</p>
            ) : publicZones.map(z => (
              <div key={z.Id} className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
                <button className="font-medium font-mono text-left" onClick={() => navigate(`/zone/${extractZoneId(z)}`)}>{z.Name}</button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{z.ResourceRecordSetCount} records</span>
                  <a href={aws.zone(extractZoneId(z))} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}><ExternalLink className="h-3 w-3" /></a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Private Zones</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {privateZones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No private zones</p>
            ) : privateZones.map(z => (
              <div key={z.Id} className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
                <button className="text-left" onClick={() => navigate(`/zone/${extractZoneId(z)}`)}>
                  <span className="font-medium font-mono">{z.Name}</span>
                  <Badge variant="secondary" className="ml-2 text-[10px]">Private</Badge>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{z.ResourceRecordSetCount} records</span>
                  <a href={aws.zone(extractZoneId(z))} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /></a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
