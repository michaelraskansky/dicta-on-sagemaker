import { useNavigate, useLocation } from 'react-router-dom';
import { Globe, LayoutDashboard, Activity, ShieldCheck, GitBranch, FileText, Network, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LiveZoneTree } from './LiveZoneTree';
import { useZones } from '@/hooks/useApi';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/health-checks', label: 'Health Checks', icon: Activity },
  { path: '/firewall', label: 'DNS Firewall', icon: ShieldCheck },
  { path: '/traffic-flow', label: 'Traffic Flow', icon: GitBranch },
  { path: '/domains', label: 'Domains', icon: FileText },
  { path: '/resolver', label: 'Resolver & VPC', icon: Network },
  { path: '/operations', label: 'Zone Operations', icon: Zap },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: zones } = useZones();

  const totalRecords = zones.reduce((a, z) => a + z.ResourceRecordSetCount, 0);

  return (
    <div className="flex w-64 flex-col border-r bg-zinc-950 text-zinc-100">
      <div className="flex items-center gap-2 px-4 py-4">
        <Globe className="h-5 w-5 text-blue-400" />
        <span className="text-sm font-semibold tracking-tight">R53 Manager</span>
      </div>

      <Separator className="bg-zinc-800" />

      <div className="flex flex-col gap-0.5 px-2 py-3">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200')}>
              <Icon className="h-4 w-4" />{item.label}
            </button>
          );
        })}
      </div>

      <Separator className="bg-zinc-800" />

      <div className="px-3 pt-3 pb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Zones</span>
      </div>
      <ScrollArea className="flex-1 px-2">
        <LiveZoneTree zones={zones} />
      </ScrollArea>

      <Separator className="bg-zinc-800" />

      <div className="grid grid-cols-2 gap-2 px-3 py-3 text-center">
        <div>
          <div className="text-lg font-bold text-white">{zones.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Zones</div>
        </div>
        <div>
          <div className="text-lg font-bold text-white">{totalRecords}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Records</div>
        </div>
      </div>
    </div>
  );
}
