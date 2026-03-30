import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({ title, subtitle, loading, refreshing, onRefresh }: {
  title: string;
  subtitle: string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button onClick={onRefresh} className="rounded-md border p-1.5 hover:bg-muted">
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </button>
        )}
        <span className={cn('inline-block h-2 w-2 rounded-full transition-colors duration-300',
          loading ? 'bg-blue-400 animate-pulse' : 'bg-emerald-500')} />
      </div>
    </div>
  );
}
