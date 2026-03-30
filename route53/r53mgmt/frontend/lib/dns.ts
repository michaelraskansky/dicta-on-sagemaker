import type { AwsHostedZone } from '@/hooks/useApi';

export const typeColors: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  AAAA: 'bg-indigo-100 text-indigo-700',
  CNAME: 'bg-purple-100 text-purple-700',
  MX: 'bg-amber-100 text-amber-700',
  TXT: 'bg-emerald-100 text-emerald-700',
  NS: 'bg-zinc-100 text-zinc-700',
  SOA: 'bg-zinc-100 text-zinc-700',
  CAA: 'bg-rose-100 text-rose-700',
  SRV: 'bg-cyan-100 text-cyan-700',
  RRSIG: 'bg-orange-100 text-orange-700',
  DNSKEY: 'bg-orange-100 text-orange-700',
  DS: 'bg-orange-100 text-orange-700',
  NSEC: 'bg-orange-100 text-orange-700',
  NSEC3: 'bg-orange-100 text-orange-700',
  NSEC3PARAM: 'bg-orange-100 text-orange-700',
};

export function extractZoneId(zone: AwsHostedZone): string {
  return zone.Id.replace('/hostedzone/', '');
}
