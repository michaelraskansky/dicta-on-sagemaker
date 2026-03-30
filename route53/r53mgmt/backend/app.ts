// Express API — thin proxy between the React frontend and AWS APIs.
// No business logic here; just marshals requests to Route 53 and Step Functions SDKs.
// Exported from this file so it can be wrapped for any deployment target (Lambda, ECS, etc.).
// For local dev, backend/server.ts imports this and calls listen().

import {
  Route53Client,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
  GetDNSSECCommand,
  ListHealthChecksCommand,
  GetHealthCheckStatusCommand,
  ListTagsForResourceCommand,
  TestDNSAnswerCommand,
  GetHostedZoneCommand,
  ListTrafficPoliciesCommand,
  GetTrafficPolicyCommand,
  ListTrafficPolicyInstancesByPolicyCommand,
} from '@aws-sdk/client-route-53';
import {
  SFNClient,
  StartExecutionCommand,
  ListExecutionsCommand,
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
  SendTaskSuccessCommand,
} from '@aws-sdk/client-sfn';
import {
  Route53ResolverClient,
  ListFirewallRuleGroupsCommand,
  ListFirewallRulesCommand,
  ListFirewallDomainListsCommand,
  ListFirewallRuleGroupAssociationsCommand,
  ListResolverEndpointsCommand,
  ListResolverEndpointIpAddressesCommand,
  ListResolverRulesCommand,
  ListResolverRuleAssociationsCommand,
} from '@aws-sdk/client-route53resolver';
import {
  Route53DomainsClient,
  ListDomainsCommand,
  GetDomainDetailCommand,
} from '@aws-sdk/client-route-53-domains';
import express from 'express';
import cors from 'cors';
import { index, startIndexer, type IndexedRecord } from './indexer.js';

const app = express();
app.use(express.json());
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: CORS_ORIGIN }));

// --- Config from env vars (defaults work for local dev) ---
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN || '';
if (!STATE_MACHINE_ARN) console.warn('STATE_MACHINE_ARN not set — rotation endpoints will fail');

const CREATE_ZONE_STATE_MACHINE_ARN = process.env.CREATE_ZONE_STATE_MACHINE_ARN || '';
if (!CREATE_ZONE_STATE_MACHINE_ARN) console.warn('CREATE_ZONE_STATE_MACHINE_ARN not set — child zone creation will fail');

const r53 = new Route53Client({ region: AWS_REGION });
const sfn = new SFNClient({ region: AWS_REGION });
const resolver = new Route53ResolverClient({ region: AWS_REGION });
// Route 53 Domains API only works in us-east-1
const domains = new Route53DomainsClient({ region: 'us-east-1' });

// --- Simple TTL cache — avoids Route 53 throttling with multiple users ---
const cache = new Map<string, { data: any; expiry: number }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  const data = await fn();
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

const TTL = 60_000; // 60s for most endpoints

// Sweep expired cache entries every 5 min to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now >= entry.expiry) cache.delete(key);
  }
}, 5 * 60_000);

function apiError(res: express.Response, status: number, publicMsg: string, err: unknown) {
  console.error(publicMsg, err);
  res.status(status).json({ error: publicMsg });
}

const ZONE_ID_RE = /^[A-Z0-9]{1,32}$/i;
function validZoneId(id: string): boolean {
  return ZONE_ID_RE.test(id);
}

const DNS_NAME_RE = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
function validDnsName(name: string): boolean {
  return name.length <= 253 && DNS_NAME_RE.test(name);
}

// List all hosted zones
app.get('/api/zones', async (_req, res) => {
  try {
    const zones = await cached('zones', TTL, async () => {
      const all = [];
      let marker: string | undefined;
      do {
        const cmd = new ListHostedZonesCommand({ Marker: marker });
        const resp = await r53.send(cmd);
        all.push(...(resp.HostedZones || []));
        marker = resp.IsTruncated ? resp.NextMarker : undefined;
      } while (marker);
      return all;
    });
    res.json(zones);
  } catch (err) {
    apiError(res, 500, 'Failed to list zones', err);
  }
});

// Get zone details + tags
app.get('/api/zones/:zoneId', async (req, res) => {
  const id = req.params.zoneId;
  if (!validZoneId(id)) { res.status(400).json({ error: 'Invalid zone ID' }); return; }
  try {
    const data = await cached(`zone:${id}`, TTL, async () => {
      const [zone, tags, dnssec] = await Promise.all([
        r53.send(new GetHostedZoneCommand({ Id: id })),
        r53.send(new ListTagsForResourceCommand({ ResourceId: id, ResourceType: 'hostedzone' })),
        r53.send(new GetDNSSECCommand({ HostedZoneId: id })).catch(() => null),
      ]);
      return {
        zone: zone.HostedZone,
        delegationSet: zone.DelegationSet,
        tags: tags.ResourceTagSet?.Tags || [],
        dnssec: dnssec?.Status || null,
        keySigningKeys: dnssec?.KeySigningKeys || [],
      };
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to get zone details', err);
  }
});

// List records for a zone
app.get('/api/zones/:zoneId/records', async (req, res) => {
  const id = req.params.zoneId;
  if (!validZoneId(id)) { res.status(400).json({ error: 'Invalid zone ID' }); return; }
  try {
    const zid = id;
    const records = await cached(`records:${zid}`, TTL, async () => {
      const all = [];
      let startName: string | undefined;
      let startType: string | undefined;
      do {
        const resp = await r53.send(new ListResourceRecordSetsCommand({
          HostedZoneId: zid, StartRecordName: startName, StartRecordType: startType as any,
        }));
        all.push(...(resp.ResourceRecordSets || []));
        if (resp.IsTruncated) { startName = resp.NextRecordName; startType = resp.NextRecordType; }
        else startName = undefined;
      } while (startName);
      return all;
    });
    res.json(records);
  } catch (err) {
    apiError(res, 500, 'Failed to list records', err);
  }
});

// DNSSEC status for a zone
app.get('/api/zones/:zoneId/dnssec', async (req, res) => {
  const id = req.params.zoneId;
  if (!validZoneId(id)) { res.status(400).json({ error: 'Invalid zone ID' }); return; }
  try {
    const zid = id;
    const data = await cached(`dnssec:${zid}`, TTL, async () => {
      const resp = await r53.send(new GetDNSSECCommand({ HostedZoneId: zid }));
      return { status: resp.Status, keySigningKeys: resp.KeySigningKeys };
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to get DNSSEC status', err);
  }
});

// List all health checks with status
app.get('/api/health-checks', async (_req, res) => {
  try {
    const data = await cached('health-checks', 30_000, async () => {
      const resp = await r53.send(new ListHealthChecksCommand({}));
      const checks = resp.HealthChecks || [];
      return Promise.all(
        checks.map(async (hc) => {
          try {
            const status = await r53.send(new GetHealthCheckStatusCommand({ HealthCheckId: hc.Id! }));
            return { ...hc, checkerResults: status.HealthCheckObservations || [] };
          } catch {
            return { ...hc, checkerResults: [] };
          }
        })
      );
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to list health checks', err);
  }
});

// Test DNS answer
app.get('/api/test-dns', async (req, res) => {
  const { hostedZoneId, recordName, recordType } = req.query;
  if (!hostedZoneId || !validZoneId(hostedZoneId as string)) {
    res.status(400).json({ error: 'Invalid or missing hostedZoneId' }); return;
  }
  if (!recordName || !recordType) {
    res.status(400).json({ error: 'Missing recordName or recordType' }); return;
  }
  try {
    const resp = await r53.send(new TestDNSAnswerCommand({
      HostedZoneId: hostedZoneId as string,
      RecordName: recordName as string,
      RecordType: recordType as any,
    }));
    res.json(resp);
  } catch (err) {
    apiError(res, 500, 'Failed to test DNS answer', err);
  }
});

// --- Background index (see indexer.ts) ---
startIndexer(r53);

// Cross-zone search API — queries the in-memory index
app.get('/api/search', async (req, res) => {
  try {
    const { q, type, zone, mode = 'contains', ttlMin, ttlMax, limit = '50' } = req.query as Record<string, string>;
    if (!q || q.length < 2) { res.json([]); return; }
    if (q.length > 253) { res.status(400).json({ error: 'Query too long' }); return; }

    const ql = q.toLowerCase();
    const match = (text: string) => {
      const t = text.toLowerCase();
      switch (mode) {
        case 'exact': return t === ql;
        case 'starts': return t.startsWith(ql);
        case 'ends': return t.endsWith(ql);
        default: return t.includes(ql);
      }
    };

    const max = Math.min(Number(limit) || 50, 200);
    const results: IndexedRecord[] = [];
    for (const r of index.records) {
      if (results.length >= max) break;
      if (type && r.type !== type) continue;
      if (zone && r.zoneName !== zone) continue;
      if (ttlMin && r.ttl < Number(ttlMin)) continue;
      if (ttlMax && r.ttl > Number(ttlMax)) continue;
      if (match(r.name) || match(r.value)) results.push(r);
    }
    res.json(results);
  } catch (err) {
    apiError(res, 500, 'Search failed', err);
  }
});

app.get('/api/search/stats', (_req, res) => {
  res.json({
    recordCount: index.records.length,
    zoneCount: index.zoneCount,
    lastUpdated: index.lastUpdated?.toISOString() || null,
    building: index.building,
  });
});

app.get('/api/dnssec/summary', (_req, res) => {
  res.json(index.dnssec);
});

// --- Zone mutation endpoints ---
app.post('/api/zones/create-child', async (req, res) => {
  if (!CREATE_ZONE_STATE_MACHINE_ARN) { res.status(503).json({ error: 'Child zone creation not configured — set CREATE_ZONE_STATE_MACHINE_ARN' }); return; }
  try {
    const { childZoneName, parentZoneId, comment } = req.body;
    if (!childZoneName || !validDnsName(childZoneName)) { res.status(400).json({ error: 'Invalid or missing childZoneName' }); return; }
    if (parentZoneId && !validZoneId(parentZoneId)) { res.status(400).json({ error: 'Invalid parentZoneId' }); return; }
    if (comment && comment.length > 256) { res.status(400).json({ error: 'Comment too long (max 256 chars)' }); return; }
    const sanitizedName = childZoneName.replace(/[^a-zA-Z0-9.-]/g, '-');
    const result = await sfn.send(new StartExecutionCommand({
      stateMachineArn: CREATE_ZONE_STATE_MACHINE_ARN,
      name: `create-${sanitizedName}-${Date.now()}`.slice(0, 80),
      input: JSON.stringify({ childZoneName, parentZoneId: parentZoneId || null, comment: comment || '' }),
    }));
    cache.delete('zones');
    res.json({ executionArn: result.executionArn, startDate: result.startDate?.toISOString() });
  } catch (err) { apiError(res, 500, 'Failed to start child zone creation', err); }
});

// --- Unified operations endpoint ---
const MANUAL_STATES = ['NotifyManualDsAdd', 'NotifyManualDsRemove', 'NotifyManualNs'];

async function enrichExecution(e: { executionArn?: string; name?: string; status?: string; startDate?: Date; stopDate?: Date }) {
  let currentStep = '';
  let taskToken = '';
  if (e.status === 'RUNNING') {
    try {
      const hist = await sfn.send(new GetExecutionHistoryCommand({ executionArn: e.executionArn!, reverseOrder: true, maxResults: 200 }));
      const entered = hist.events?.find(ev => ev.type === 'TaskStateEntered' || ev.type === 'WaitStateEntered');
      currentStep = (entered as any)?.stateEnteredEventDetails?.name || '';
      if (MANUAL_STATES.includes(currentStep)) {
        const scheduled = hist.events?.find(ev => ev.type === 'TaskScheduled');
        if (scheduled?.taskScheduledEventDetails?.parameters) {
          try { const params = JSON.parse(scheduled.taskScheduledEventDetails.parameters); taskToken = params.TaskToken || ''; } catch {}
        }
      }
    } catch {}
  }
  let input: any = {};
  try { const desc = await sfn.send(new DescribeExecutionCommand({ executionArn: e.executionArn! })); input = JSON.parse(desc.input || '{}'); } catch {}
  return { executionArn: e.executionArn, name: e.name, status: e.status, startDate: e.startDate?.toISOString(), stopDate: e.stopDate?.toISOString(), currentStep, taskToken, input };
}

app.get('/api/operations', async (req, res) => {
  try {
    const typeFilter = req.query.type as string | undefined;
    const arns: { arn: string; type: string }[] = [];
    if (STATE_MACHINE_ARN && typeFilter !== 'create-zone') arns.push({ arn: STATE_MACHINE_ARN, type: 'ksk-rotation' });
    if (CREATE_ZONE_STATE_MACHINE_ARN && typeFilter !== 'ksk-rotation') arns.push({ arn: CREATE_ZONE_STATE_MACHINE_ARN, type: 'create-zone' });
    if (arns.length === 0) { res.json([]); return; }

    const allExecutions = await Promise.all(arns.map(async ({ arn, type }) => {
      const list = await sfn.send(new ListExecutionsCommand({ stateMachineArn: arn, maxResults: 20 }));
      const enriched = await Promise.all((list.executions || []).map(enrichExecution));
      return enriched.map(e => type === 'create-zone'
        ? { ...e, type, zoneName: e.input.childZoneName || '', parentZoneName: '' }
        : { ...e, type, zoneName: e.input.zoneName || '', oldKskName: e.input.oldKskName || '', newKskName: e.input.newKskName || '' });
    }));

    const zones = cache.get('zones')?.data as any[] | undefined;
    const merged = allExecutions.flat().map(e => {
      if (e.type === 'create-zone' && e.input?.parentZoneId && zones) {
        const parent = zones.find((z: any) => z.Id?.includes(e.input.parentZoneId));
        if (parent) return { ...e, parentZoneName: parent.Name?.replace(/\.$/, '') || '', input: undefined };
      }
      return { ...e, input: undefined };
    });
    merged.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    res.json(merged);
  } catch (err) { apiError(res, 500, 'Failed to list operations', err); }
});

app.post('/api/operations/approve', async (req, res) => {
  try {
    const { taskToken } = req.body;
    if (!taskToken) { res.status(400).json({ error: 'Missing taskToken' }); return; }
    await sfn.send(new SendTaskSuccessCommand({ taskToken, output: JSON.stringify({ approved: true, approvedAt: new Date().toISOString() }) }));
    res.json({ success: true });
  } catch (err) { apiError(res, 500, 'Failed to approve task', err); }
});

// --- Rotation endpoints (deprecated — proxy to /api/operations) ---

// Deprecated — redirects to /api/operations
app.get('/api/rotation/executions', async (_req, res) => {
  if (!STATE_MACHINE_ARN) { res.status(503).json({ error: 'Rotation not configured — set STATE_MACHINE_ARN' }); return; }
  res.redirect(307, '/api/operations?type=ksk-rotation');
});

app.post('/api/rotation/start', async (req, res) => {
  if (!STATE_MACHINE_ARN) { res.status(503).json({ error: 'Rotation not configured — set STATE_MACHINE_ARN' }); return; }
  try {
    const { hostedZoneId, zoneName, oldKskName, newKskName, parentZoneId } = req.body;
    if (!hostedZoneId || !zoneName || !oldKskName || !newKskName) {
      res.status(400).json({ error: 'Missing required fields' }); return;
    }
    const result = await sfn.send(new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      name: `${newKskName}-${Date.now()}`,
      input: JSON.stringify({
        hostedZoneId, zoneName, oldKskName, newKskName,
        parentZoneId: parentZoneId || null,
        dsTtlSeconds: 3600, dsTtlWaitSeconds: 7200, dnskeyTtlWaitSeconds: 7200,
      }),
    }));
    res.json({ executionArn: result.executionArn, startDate: result.startDate?.toISOString() });
  } catch (err) {
    apiError(res, 500, 'Failed to start rotation', err);
  }
});

// Deprecated — redirects to /api/operations/approve
app.post('/api/rotation/approve', async (_req, res) => {
  res.redirect(307, '/api/operations/approve');
});

// --- DNS Firewall endpoints ---
// Uses Route 53 Resolver DNS Firewall APIs

app.get('/api/firewall/rule-groups', async (_req, res) => {
  try {
    const data = await cached('firewall-rule-groups', TTL, async () => {
      const resp = await resolver.send(new ListFirewallRuleGroupsCommand({}));
      const groups = resp.FirewallRuleGroups || [];
      return Promise.all(groups.map(async (g) => {
        const [rules, assocs] = await Promise.all([
          resolver.send(new ListFirewallRulesCommand({ FirewallRuleGroupId: g.Id! })),
          resolver.send(new ListFirewallRuleGroupAssociationsCommand({ FirewallRuleGroupId: g.Id! })),
        ]);
        return { ...g, rules: rules.FirewallRules || [], vpcAssociations: (assocs.FirewallRuleGroupAssociations || []).map(a => ({ vpcId: a.VpcId, name: a.Name, status: a.Status })) };
      }));
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to list firewall rule groups', err);
  }
});

app.get('/api/firewall/domain-lists', async (_req, res) => {
  try {
    const data = await cached('firewall-domain-lists', TTL, async () => {
      const resp = await resolver.send(new ListFirewallDomainListsCommand({}));
      return resp.FirewallDomainLists || [];
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to list firewall domain lists', err);
  }
});

// --- Resolver endpoints ---

app.get('/api/resolver/endpoints', async (_req, res) => {
  try {
    const data = await cached('resolver-endpoints', TTL, async () => {
      const resp = await resolver.send(new ListResolverEndpointsCommand({}));
      return Promise.all((resp.ResolverEndpoints || []).map(async (ep) => {
        const ips = await resolver.send(new ListResolverEndpointIpAddressesCommand({ ResolverEndpointId: ep.Id! }));
        return { ...ep, ipAddresses: ips.IpAddresses || [] };
      }));
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to list resolver endpoints', err);
  }
});

app.get('/api/resolver/rules', async (_req, res) => {
  try {
    const data = await cached('resolver-rules', TTL, async () => {
      const resp = await resolver.send(new ListResolverRulesCommand({}));
      return Promise.all((resp.ResolverRules || []).map(async (rule) => {
        const assocs = await resolver.send(new ListResolverRuleAssociationsCommand({
          Filters: [{ Name: 'ResolverRuleId', Values: [rule.Id!] }],
        }));
        return { ...rule, vpcAssociations: assocs.ResolverRuleAssociations || [] };
      }));
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to list resolver rules', err);
  }
});

// --- Domains endpoints ---
// Route 53 Domains API — only returns domains registered through Route 53

app.get('/api/domains', async (_req, res) => {
  try {
    const data = await cached('domains', TTL, async () => {
      const resp = await domains.send(new ListDomainsCommand({}));
      return Promise.all((resp.Domains || []).map(async (d) => {
        try {
          const detail = await domains.send(new GetDomainDetailCommand({ DomainName: d.DomainName! }));
          return { name: d.DomainName, expiry: d.Expiry?.toISOString(), autoRenew: d.AutoRenew, transferLock: d.TransferLock, registrar: detail.RegistrarName, nameservers: detail.Nameservers?.map(ns => ns.Name) || [], status: detail.StatusList || [] };
        } catch {
          return { name: d.DomainName, expiry: d.Expiry?.toISOString(), autoRenew: d.AutoRenew, transferLock: d.TransferLock };
        }
      }));
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to list domains', err);
  }
});

// --- Traffic Flow endpoints ---
// Traffic policies contain a JSON Document describing the routing tree

app.get('/api/traffic-policies', async (_req, res) => {
  try {
    const data = await cached('traffic-policies', TTL, async () => {
      const resp = await r53.send(new ListTrafficPoliciesCommand({}));
      return Promise.all((resp.TrafficPolicySummaries || []).map(async (s) => {
        const policy = await r53.send(new GetTrafficPolicyCommand({ Id: s.Id!, Version: s.LatestVersion! }));
        const instances = await r53.send(new ListTrafficPolicyInstancesByPolicyCommand({ TrafficPolicyId: s.Id!, TrafficPolicyVersion: s.LatestVersion! }));
        return { ...s, document: policy.TrafficPolicy?.Document, instances: instances.TrafficPolicyInstances || [] };
      }));
    });
    res.json(data);
  } catch (err) {
    apiError(res, 500, 'Failed to list traffic policies', err);
  }
});

export { app };
