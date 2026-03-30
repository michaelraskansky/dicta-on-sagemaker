import { KMSClient, CreateKeyCommand } from '@aws-sdk/client-kms';

const kms = new KMSClient({ region: 'us-east-1' });

export async function handler(event) {
  const { newKskName, accountId } = event;

  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      { Sid: 'Enable IAM User Permissions', Effect: 'Allow', Principal: { AWS: `arn:aws:iam::${accountId}:root` }, Action: 'kms:*', Resource: '*' },
      { Sid: 'Allow Route 53 DNSSEC Service', Effect: 'Allow', Principal: { Service: 'dnssec-route53.amazonaws.com' },
        Action: ['kms:DescribeKey', 'kms:GetPublicKey', 'kms:Sign'], Resource: '*',
        Condition: { StringEquals: { 'aws:SourceAccount': accountId }, ArnLike: { 'aws:SourceArn': 'arn:aws:route53:::hostedzone/*' } } },
      { Sid: 'Allow Route 53 DNSSEC to CreateGrant', Effect: 'Allow', Principal: { Service: 'dnssec-route53.amazonaws.com' },
        Action: 'kms:CreateGrant', Resource: '*', Condition: { Bool: { 'kms:GrantIsForAWSResource': 'true' } } },
    ],
  });

  const key = await kms.send(new CreateKeyCommand({
    KeySpec: 'ECC_NIST_P256', KeyUsage: 'SIGN_VERIFY', Policy: policy,
    Description: `DNSSEC KSK for rotation: ${newKskName}`,
  }));

  console.log(`Created KMS key: ${key.KeyMetadata.KeyId}`);

  return {
    kmsKeyArn: key.KeyMetadata.Arn,
    kmsKeyId: key.KeyMetadata.KeyId,
  };
}
