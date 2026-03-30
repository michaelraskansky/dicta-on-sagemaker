import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { useZones, API } from '@/hooks/useApi';

export function CreateChildZoneDialog({ open, onOpenChange, prefilledParentZoneId }: {
  open: boolean; onOpenChange: (v: boolean) => void; prefilledParentZoneId?: string;
}) {
  const navigate = useNavigate();
  const { data: zones } = useZones();
  const [parentZoneId, setParentZoneId] = useState(prefilledParentZoneId || '');
  const [subdomain, setSubdomain] = useState('');
  const [fullZoneName, setFullZoneName] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (v: boolean) => {
    if (v) { setParentZoneId(prefilledParentZoneId || ''); setSubdomain(''); setFullZoneName(''); setComment(''); setError(null); }
    onOpenChange(v);
  };

  const zoneOptions = useMemo(() =>
    zones.map(z => ({ id: z.Id!.replace('/hostedzone/', ''), name: z.Name!.replace(/\.$/, '') }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  [zones]);

  const selectedParent = zoneOptions.find(z => z.id === parentZoneId);
  const childZoneName = selectedParent ? `${subdomain}.${selectedParent.name}` : fullZoneName;
  const isValid = selectedParent ? subdomain.length > 0 && !subdomain.includes('.') : fullZoneName.length > 0;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API}/zones/create-child`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childZoneName, parentZoneId: parentZoneId || null, comment: comment || undefined }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({ error: 'Request failed' })); setError(body.error || 'Failed to create zone'); return; }
      handleOpenChange(false);
      navigate('/operations');
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Create Child Zone</h2>
            <p className="text-sm text-muted-foreground">Create a delegated subdomain zone</p>
          </div>

          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parent Zone</label>
            <select className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" value={parentZoneId}
              onChange={e => { setParentZoneId(e.target.value); setSubdomain(''); setFullZoneName(''); }}>
              {zoneOptions.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              <option value="">None (external parent)</option>
            </select>
            {selectedParent && <p className="text-xs text-muted-foreground">NS records will be added automatically</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {selectedParent ? 'Subdomain' : 'Zone Name'}
            </label>
            {selectedParent ? (
              <div className="flex">
                <input className="flex-1 rounded-l-md border border-r-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="staging" value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase())} autoFocus />
                <div className="rounded-r-md border bg-muted px-3 py-2 text-sm text-muted-foreground">.{selectedParent.name}</div>
              </div>
            ) : (
              <input className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="api.partner-domain.net" value={fullZoneName} onChange={e => setFullZoneName(e.target.value.toLowerCase())} autoFocus />
            )}
            {isValid && <p className="text-xs text-muted-foreground">Creates: {childZoneName}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comment <span className="text-muted-foreground/50">(optional)</span></label>
            <input className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Staging environment" value={comment} onChange={e => setComment(e.target.value)} maxLength={256} />
          </div>

          {!parentZoneId && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Parent zone is not managed here. After creation, you'll need to manually add NS records to the parent zone. The workflow will pause until you confirm.</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => handleOpenChange(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={!isValid || submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Zone'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
