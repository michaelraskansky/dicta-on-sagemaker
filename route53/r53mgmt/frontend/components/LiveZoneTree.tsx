import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Globe, Lock } from 'lucide-react';
import type { AwsHostedZone } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { extractZoneId } from '@/lib/dns';

interface TreeNode {
  label: string;
  zone?: AwsHostedZone;
  children: TreeNode[];
}

function buildTree(zones: AwsHostedZone[]): TreeNode[] {
  // Group by domain hierarchy
  const roots: TreeNode[] = [];
  const sorted = [...zones].sort((a, b) => a.Name.localeCompare(b.Name));

  for (const zone of sorted) {
    const name = zone.Name.replace(/\.$/, '');
    const parts = name.split('.').reverse();
    let nodes = roots;
    for (let i = 0; i < parts.length; i++) {
      const label = parts.slice(0, i + 1).reverse().join('.');
      let node = nodes.find(n => n.label === label);
      if (!node) {
        node = { label, children: [] };
        nodes.push(node);
      }
      if (i === parts.length - 1) node.zone = zone;
      nodes = node.children;
    }
  }
  return roots;
}

function TreeNodeView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const navigate = useNavigate();
  const { zoneId: activeZoneId } = useParams();
  const hasChildren = node.children.length > 0;
  const isActive = node.zone && extractZoneId(node.zone) === activeZoneId;

  return (
    <div>
      <button
        className={cn(
          'group flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) setOpen(!open);
          if (node.zone) navigate(`/zone/${extractZoneId(node.zone)}`);
        }}
      >
        {hasChildren ? (
          <ChevronRight className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-90')} />
        ) : <span className="w-3" />}
        <Globe className="h-3 w-3 shrink-0 text-zinc-500" />
        <span className="truncate">{node.zone ? node.zone.Name.replace(/\.$/, '') : node.label}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {node.zone && (
            <>
              <span className="text-[10px] text-zinc-600">{node.zone.ResourceRecordSetCount}</span>
              {node.zone.Config.PrivateZone && <Lock className="h-2.5 w-2.5 text-zinc-600" />}
            </>
          )}
        </span>
      </button>
      {open && hasChildren && (
        <div className="animate-slide-in">
          {node.children.map(child => (
            <TreeNodeView key={child.label} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveZoneTree({ zones }: { zones: AwsHostedZone[] }) {
  const tree = useMemo(() => buildTree(zones), [zones]);
  return (
    <div className="py-1">
      {tree.map(node => <TreeNodeView key={node.label} node={node} depth={0} />)}
    </div>
  );
}
