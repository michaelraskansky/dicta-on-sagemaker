// AWS Console URL generators.
// Route 53 (zones, health checks, domains, traffic) is global — always us-east-1.
// Resolver, DNS Firewall, and Step Functions are regional — use VITE_AWS_REGION.

const GLOBAL = 'us-east-1';
const REGIONAL = import.meta.env.VITE_AWS_REGION || 'us-east-1';

export const awsConsole = {
  // Global (Route 53)
  zone: (id: string) => `https://${GLOBAL}.console.aws.amazon.com/route53/v2/hostedzones#ListRecordSets/${id}`,
  dnssec: (id: string) => `https://${GLOBAL}.console.aws.amazon.com/route53/v2/hostedzones#ListRecordSets/${id}/dnssec`,
  healthCheck: (id: string) => `https://${GLOBAL}.console.aws.amazon.com/route53/v2/healthchecks/home#/details/${id}`,
  domain: (name: string) => `https://${GLOBAL}.console.aws.amazon.com/route53/home#/DomainDetail/${name}`,
  trafficPolicy: (id: string) => `https://${GLOBAL}.console.aws.amazon.com/route53/trafficflow/policies/details/${id}`,

  // Regional
  sfnExecution: (arn: string) => `https://${REGIONAL}.console.aws.amazon.com/states/home#/v2/executions/details/${arn}`,
  firewallRuleGroup: (id: string) => `https://${REGIONAL}.console.aws.amazon.com/vpcconsole/home?region=${REGIONAL}#DNSFirewallRuleGroupDetails:FirewallRuleGroupId=${id}`,
  firewallDomainList: (id: string) => `https://${REGIONAL}.console.aws.amazon.com/vpcconsole/home?region=${REGIONAL}#DNSFirewallDomainListDetails:DomainListId=${id}`,
  resolverEndpoint: (id: string) => `https://${REGIONAL}.console.aws.amazon.com/route53resolver/home?region=${REGIONAL}#/endpoint/${id}`,
  resolverRule: (id: string) => `https://${REGIONAL}.console.aws.amazon.com/route53resolver/home?region=${REGIONAL}#/rule/${id}`,
};
