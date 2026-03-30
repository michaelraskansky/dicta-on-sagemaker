import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Topbar({ onSearchClick }: { onSearchClick: () => void }) {
  return (
    <div className="flex h-14 items-center justify-between border-b px-6">
      <div />
      <Button
        variant="outline"
        className="w-72 justify-start gap-2 text-muted-foreground"
        onClick={onSearchClick}
      >
        <Search className="h-4 w-4" />
        <span>Search all zones…</span>
        <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>
      <div />
    </div>
  );
}
