import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const colorClasses: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
  red: { bg: 'bg-red-50', icon: 'text-red-600' },
  zinc: { bg: 'bg-zinc-50', icon: 'text-zinc-600' },
};

export function StatCard({ icon: Icon, color, value, label }: {
  icon: LucideIcon;
  color: string;
  value: number | string;
  label: string;
}) {
  const c = colorClasses[color] || colorClasses.zinc;
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`rounded-lg p-2.5 ${c.bg}`}><Icon className={`h-5 w-5 ${c.icon}`} /></div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
