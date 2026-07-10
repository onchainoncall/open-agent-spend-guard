import type {
  SafeMultisigTransaction,
  SpendPolicy,
  SpendRequest,
  X402PaymentRequiredV2,
} from '../src/index.js';

export const BASE_USDC = 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
export const PAYEE = '0x1111111111111111111111111111111111111111';

export function basePolicy(): SpendPolicy {
  return {
    schemaVersion: 'oasg.policy.v1',
    policyId: 'base-ops-usdc',
    version: 1,
    rules: {
      allowedChains: ['eip155:8453'],
      assets: [
        {
          assetId: BASE_USDC,
          maxPerTransaction: '500000000',
          approvalRequiredAbove: '200000000',
          periodBudget: { period: 'day', limit: '1000000000' },
        },
      ],
      allowedCounterparties: [PAYEE],
      allowedPurposes: ['x402_resource_payment'],
    },
  };
}

export function baseRequest(): SpendRequest {
  return {
    schemaVersion: 'oasg.request.v1',
    requestId: 'req_base_001',
    agentId: 'ops-rebalancer-02',
    chainId: 'eip155:8453',
    assetId: BASE_USDC,
    amount: '100000000',
    counterparty: PAYEE,
    purpose: 'x402_resource_payment',
    observedAt: '2026-07-10T18:00:00Z',
    spentInPeriod: '250000000',
  };
}

export function x402Challenge(): X402PaymentRequiredV2 {
  return {
    x402Version: 2,
    resource: { url: 'https://api.example.test/research', mimeType: 'application/json' },
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453',
        asset: '0x833589FCD6eDb6E08f4c7C32D4f71b54bDa02913',
        amount: '100000000',
        payTo: PAYEE,
        maxTimeoutSeconds: 60,
        extra: { name: 'USDC', version: '2' },
      },
    ],
  };
}

export function safeTransaction(): SafeMultisigTransaction {
  return {
    safe: '0x2222222222222222222222222222222222222222',
    to: PAYEE,
    value: '100000000000000000',
    data: '0x',
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: '42',
    safeTxHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    submissionDate: '2026-07-10T18:00:00Z',
    isExecuted: false,
    confirmationsRequired: 2,
    confirmations: [],
  };
}
