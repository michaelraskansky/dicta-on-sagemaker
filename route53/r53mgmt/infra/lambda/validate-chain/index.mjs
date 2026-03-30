// DNSSEC KSK rotation helper Lambda
// Two actions: "extractDs" (parse GetDNSSEC response) and "validate" (verify chain)
import { Route53Client, GetDNSSECCommand } from '@aws-sdk/client-route-53';
import { resolve } from 'dns/promises';

const r53 = new Route53Client({ region: 'us-east-1' });

export async function handler(event) {
  if (event.action === 'extractDs') return extractDs(event);
  if (event.action === 'validate') return validate(event);
  throw new Error(`Unknown action: ${event.action}`);
}

function extractDs(event) {
  const { dnssecStatus, oldKskName, newKskName } = event;
  const ksks = dnssecStatus.KeySigningKeys || [];
  const oldKsk = ksks.find(k => k.Name === oldKskName);
  const newKsk = ksks.find(k => k.Name === newKskName);
  if (!oldKsk) throw new Error(`Old KSK "${oldKskName}" not found. Available: ${ksks.map(k => k.Name).join(', ')}`);
  if (!newKsk) throw new Error(`New KSK "${newKskName}" not found. Available: ${ksks.map(k => k.Name).join(', ')}`);
  return { oldDs: oldKsk.DSRecord || oldKsk.DsRecord, newDs: newKsk.DSRecord || newKsk.DsRecord, oldKmsArn: oldKsk.KmsArn };
}

async function validate(event) {
  const { hostedZoneId, zoneName, newKskName, parentZoneId } = event;
  const checks = [];

  // 1. Verify new KSK is ACTIVE
  const dnssec = await r53.send(new GetDNSSECCommand({ HostedZoneId: hostedZoneId }));
  const newKsk = (dnssec.KeySigningKeys || []).find(k => k.Name === newKskName);
  checks.push({
    name: 'new_ksk_active',
    pass: newKsk?.Status === 'ACTIVE',
    detail: newKsk ? `Status: ${newKsk.Status}` : 'KSK not found',
  });

  // 2. Verify zone is SIGNING
  checks.push({
    name: 'zone_signing',
    pass: dnssec.Status?.ServeSignature === 'SIGNING',
    detail: `ServeSignature: ${dnssec.Status?.ServeSignature}`,
  });

  // 3. Verify DNSKEY resolvable (best-effort — non-public zones may not resolve)
  try {
    const dnskeys = await resolve(zoneName, 'DNSKEY').catch(() => []);
    checks.push({ name: 'dnskey_resolvable', pass: dnskeys.length > 0, detail: dnskeys.length > 0 ? `${dnskeys.length} DNSKEY records` : 'Not resolvable (non-public zone?)' });
  } catch {
    checks.push({ name: 'dnskey_resolvable', pass: true, detail: 'DNS query skipped (non-public zone)' });
  }

  // 4. If parent in our account, verify it's healthy
  if (parentZoneId) {
    try {
      const parent = await r53.send(new GetDNSSECCommand({ HostedZoneId: parentZoneId }));
      checks.push({
        name: 'parent_zone_healthy',
        pass: parent.Status?.ServeSignature === 'SIGNING',
        detail: `Parent: ${parent.Status?.ServeSignature}`,
      });
    } catch (e) {
      checks.push({ name: 'parent_zone_healthy', pass: false, detail: e.message });
    }
  }

  // DNSKEY resolution is best-effort (fails for non-public zones) — exclude from pass/fail
  return { valid: checks.filter(c => c.name !== 'dnskey_resolvable').every(c => c.pass), checks };
}
