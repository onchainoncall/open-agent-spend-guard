import { describe, expect, it } from 'vitest';
import { PaymentRequiredV2Schema } from '@x402/core/schemas';
import { OasgError, normalizeX402PaymentRequired } from '../src/index.js';
import { BASE_USDC, PAYEE, x402Challenge } from './fixtures.js';

const options = {
  agentId: 'research-agent-01',
  observedAt: '2026-07-10T18:00:00Z',
};

describe('x402 v2 adapter', () => {
  it('normalizes an exact Base payment option', () => {
    const request = normalizeX402PaymentRequired(x402Challenge(), options);
    expect(request.chainId).toBe('eip155:8453');
    expect(request.assetId).toBe(BASE_USDC);
    expect(request.amount).toBe('100000000');
  });

  it('matches the pinned x402 core v2 runtime schema', () => {
    expect(PaymentRequiredV2Schema.safeParse(x402Challenge()).success).toBe(true);
  });

  it('normalizes the EVM payee address to lowercase', () => {
    const challenge = x402Challenge();
    challenge.accepts[0]!.payTo = PAYEE.toUpperCase().replace('0X', '0x');
    expect(normalizeX402PaymentRequired(challenge, options).counterparty).toBe(PAYEE);
  });

  it('derives a deterministic request id and raw hash', () => {
    const first = normalizeX402PaymentRequired(x402Challenge(), options);
    const second = normalizeX402PaymentRequired(x402Challenge(), options);
    expect(first.requestId).toBe(second.requestId);
    expect(first.source?.rawHash).toBe(second.source?.rawHash);
  });

  it('accepts an explicit request id and purpose', () => {
    const request = normalizeX402PaymentRequired(x402Challenge(), {
      ...options,
      requestId: 'customer_req_001',
      purpose: 'dataset_purchase',
    });
    expect(request.requestId).toBe('customer_req_001');
    expect(request.purpose).toBe('dataset_purchase');
  });

  it('selects a requested accepts index', () => {
    const challenge = x402Challenge();
    challenge.accepts.push({ ...challenge.accepts[0]!, amount: '42', payTo: '0x3333333333333333333333333333333333333333' });
    const request = normalizeX402PaymentRequired(challenge, { ...options, acceptIndex: 1 });
    expect(request.amount).toBe('42');
    expect(request.source?.metadata?.acceptIndex).toBe(1);
  });

  it('rejects an out-of-range accepts index', () => {
    expect(() => normalizeX402PaymentRequired(x402Challenge(), { ...options, acceptIndex: 3 })).toThrow(OasgError);
  });

  it('rejects x402 v1 input', () => {
    expect(() => normalizeX402PaymentRequired({ x402Version: 1, accepts: [] }, options)).toThrow(/Invalid x402/);
  });

  it('rejects non-atomic amounts', () => {
    const challenge = x402Challenge();
    challenge.accepts[0]!.amount = '$0.10';
    expect(() => normalizeX402PaymentRequired(challenge, options)).toThrow(/Invalid x402/);
  });

  it('rejects unsupported schemes', () => {
    const challenge = x402Challenge();
    challenge.accepts[0]!.scheme = 'upto';
    expect(() => normalizeX402PaymentRequired(challenge, options)).toThrow(/supports the x402 exact scheme/);
  });

  it('rejects malformed EVM asset addresses', () => {
    const challenge = x402Challenge();
    challenge.accepts[0]!.asset = 'USDC';
    expect(() => normalizeX402PaymentRequired(challenge, options)).toThrow(/20-byte addresses/);
  });

  it('rejects malformed EVM payee addresses', () => {
    const challenge = x402Challenge();
    challenge.accepts[0]!.payTo = 'merchant.example';
    expect(() => normalizeX402PaymentRequired(challenge, options)).toThrow(/Invalid x402/);
  });

  it('carries period spend into the normalized request', () => {
    expect(normalizeX402PaymentRequired(x402Challenge(), { ...options, spentInPeriod: '77' }).spentInPeriod).toBe('77');
  });

  it('creates a portable non-EVM token identifier', () => {
    const challenge = x402Challenge();
    challenge.accepts[0]!.network = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    challenge.accepts[0]!.asset = 'So11111111111111111111111111111111111111112';
    challenge.accepts[0]!.payTo = '9xQeWvG816bUx9EPfEZ9z9Jc5pvqP2c6AQn2xY3Q9ABC';
    expect(normalizeX402PaymentRequired(challenge, options).assetId).toContain('/token:So111');
  });
});
