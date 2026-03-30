// Background record + DNSSEC indexer.
// Fetches all records from all zones into memory on startup, refreshes every 10 min.
// Self-throttles to ~3 req/s to leave headroom for interactive API calls.

import {
  Route53Client,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
  GetDNSSECCommand,
} from '@aws-sdk/client-route-53';

export interface IndexedRecord { name: string; type: string; value: string; ttl: number; zoneId: string; zoneName: string }
export interface DnssecSummary { zoneId: string; zoneName: string; signing: boolean; ksks: any[] }

export const index = {
  records: [] as IndexedRecord[],
  dnssec: [] as DnssecSummary[],
  zoneCount: 0,
  lastUpdated: null as Date | null,
  building: false,
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function buildIndex(r53: Route53Client) {
  if (index.building) return;
  index.building = true;
  try {
    const zones = [];
    let marker: string | undefined;
    do {
      const resp = await r53.send(new ListHostedZonesCommand({ Marker: marker }));
      zones.push(...(resp.HostedZones || []));
      marker = resp.IsTruncated ? resp.NextMarker : undefined;
    } while (marker);

    const records: IndexedRecord[] = [];
    const dnssec: DnssecSummary[] = [];
    for (const z of zones) {
      const zoneId = z.Id!.replace('/hostedzone/', '');
      const zoneName = z.Name!.replace(/\.$/, '');
      try {
        let startName: string | undefined;
        let startType: string | undefined;
        do {
          const resp = await r53.send(new ListResourceRecordSetsCommand({
            HostedZoneId: z.Id!, StartRecordName: startName, StartRecordType: startType as any,
          }));
          for (const r of resp.ResourceRecordSets || []) {
            const values = r.ResourceRecords?.map(rr => rr.Value!) || [];
            if (r.AliasTarget) values.push(`ALIAS → ${r.AliasTarget.DNSName}`);
            for (const v of values) {
              records.push({ name: r.Name!, type: r.Type!, value: v, ttl: r.TTL || 0, zoneId, zoneName });
            }
          }
          if (resp.IsTruncated) { startName = resp.NextRecordName; startType = resp.NextRecordType; }
          else startName = undefined;
        } while (startName);
      } catch {}
      try {
        const ds = await r53.send(new GetDNSSECCommand({ HostedZoneId: z.Id! }));
        dnssec.push({ zoneId, zoneName, signing: ds.Status?.ServeSignature === 'SIGNING', ksks: ds.KeySigningKeys || [] });
      } catch {
        dnssec.push({ zoneId, zoneName, signing: false, ksks: [] });
      }
      await sleep(330); // ~3 req/s throttle
    }
    index.records = records;
    index.dnssec = dnssec;
    index.zoneCount = zones.length;
    index.lastUpdated = new Date();
    console.log(`Search index built: ${records.length} records across ${zones.length} zones`);
  } finally {
    index.building = false;
  }
}

export function startIndexer(r53: Route53Client) {
  buildIndex(r53);
  setInterval(() => buildIndex(r53), 10 * 60 * 1000);
}
