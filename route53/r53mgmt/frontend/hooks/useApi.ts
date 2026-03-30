// Generic data fetcher for AWS API endpoints.
// API base URL is configurable via VITE_API_URL env var (defaults to '' for Vite proxy in dev).
// Each useX hook below is a typed wrapper — pages call these, not useApi directly.
// The `live` flag indicates whether the API responded successfully (true) or fell back to the fallback value (false).

import { useState, useEffect, useCallback } from 'react';

export const API = `${import.meta.env.VITE_API_URL || ''}/api`;

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function useApi<T>(path: string, fallback: T): { data: T; loading: boolean; live: boolean; refreshing: boolean; refetch: () => Promise<void> } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const [result] = await Promise.all([
      fetchApi<T>(path),
      isRefresh ? new Promise(r => setTimeout(r, 400)) : Promise.resolve(),
    ]);
    if (result !== null) { setData(result); setLive(true); }
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, [path]);

  useEffect(() => { load(false); }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return { data, loading, live, refreshing, refetch };
}

// Typed API calls
export interface AwsHostedZone {
  Id: string;
  Name: string;
  CallerReference: string;
  Config: { Comment: string; PrivateZone: boolean };
  ResourceRecordSetCount: number;
}

export interface AwsRecordSet {
  Name: string;
  Type: string;
  TTL?: number;
  ResourceRecords?: { Value: string }[];
  AliasTarget?: { DNSName: string; HostedZoneId: string; EvaluateTargetHealth: boolean };
}

export interface AwsHealthCheck {
  Id: string;
  HealthCheckConfig: {
    IPAddress?: string;
    Port?: number;
    Type: string;
    ResourcePath?: string;
    FullyQualifiedDomainName?: string;
    RequestInterval: number;
    FailureThreshold: number;
  };
  checkerResults: {
    Region?: string;
    IPAddress?: string;
    StatusReport?: { Status?: string; CheckedTime?: string };
  }[];
}

export interface AwsDnssecStatus {
  status: { ServeSignature: string } | null;
  keySigningKeys: {
    Name: string;
    Status: string;
    KmsArn: string;
    SigningAlgorithmMnemonic: string;
    KeyTag: number;
    CreatedDate: string;
  }[];
}

export interface AwsZoneDetail {
  zone: AwsHostedZone;
  delegationSet: { NameServers: string[] };
  tags: { Key: string; Value: string }[];
  dnssec: { ServeSignature: string } | null;
  keySigningKeys: AwsDnssecStatus['keySigningKeys'];
}

// --- Firewall types ---
export interface AwsFirewallRuleGroup {
  Id: string;
  Name: string;
  rules: { Priority: number; Action: string; FirewallDomainListId: string; BlockResponse?: string }[];
  vpcAssociations: { vpcId: string; name?: string; status: string }[];
}

export interface AwsFirewallDomainList {
  Id: string;
  Name: string;
  DomainCount?: number;
  ManagedOwnerName?: string;
}

// --- Resolver types ---
export interface AwsResolverEndpoint {
  Id: string;
  Name?: string;
  Direction: string;
  Status: string;
  HostVPCId: string;
  ipAddresses: { Ip: string; SubnetId: string }[];
}

export interface AwsResolverRule {
  Id: string;
  Name?: string;
  DomainName: string;
  RuleType: string;
  TargetIps?: { Ip: string; Port: number }[];
  vpcAssociations: { VpcId?: string; Name?: string; Status?: string }[];
}

// --- Domain types ---
export interface AwsDomain {
  name: string;
  expiry?: string;
  autoRenew: boolean;
  transferLock: boolean;
  registrar?: string;
  nameservers?: string[];
  status?: string[];
}

// --- Traffic Flow types ---
export interface AwsTrafficPolicy {
  Id: string;
  Name: string;
  Type: string;
  LatestVersion: number;
  TrafficPolicyCount?: number;
  Comment?: string;
  document?: string;
  instances: { Id: string; Name: string; HostedZoneId: string; State: string }[];
}

export function useZones() {
  return useApi<AwsHostedZone[]>('/zones', []);
}

export function useZoneDetail(zoneId: string) {
  return useApi<AwsZoneDetail | null>(`/zones/${zoneId}`, null);
}

export function useRecords(zoneId: string) {
  return useApi<AwsRecordSet[]>(`/zones/${zoneId}/records`, []);
}

export function useHealthChecks() {
  return useApi<AwsHealthCheck[]>('/health-checks', []);
}

// --- Firewall hooks ---

export function useFirewallRuleGroups() {
  return useApi<AwsFirewallRuleGroup[]>('/firewall/rule-groups', []);
}

export function useFirewallDomainLists() {
  return useApi<AwsFirewallDomainList[]>('/firewall/domain-lists', []);
}

// --- Resolver hooks ---

export function useResolverEndpoints() {
  return useApi<AwsResolverEndpoint[]>('/resolver/endpoints', []);
}

export function useResolverRules() {
  return useApi<AwsResolverRule[]>('/resolver/rules', []);
}

// --- Domains hook ---

export function useDomains() {
  return useApi<AwsDomain[]>('/domains', []);
}

// --- Traffic Flow hook ---

export function useTrafficPolicies() {
  return useApi<AwsTrafficPolicy[]>('/traffic-policies', []);
}
