import { describe, expect, it } from 'vitest';
import { normalizeSafeMultisigTransaction } from '../src/index.js';
import { PAYEE, safeTransaction } from './fixtures.js';

const options = {
  agentId: 'treasury-agent-01',
  chainId: 'eip155:8453',
  assetId: 'eip155:8453/slip44:60',
};

describe('Safe Transaction Service adapter', () => {
  it('normalizes a native CALL transfer', () => {
    const request = normalizeSafeMultisigTransaction(safeTransaction(), options);
    expect(request.amount).toBe('100000000000000000');
    expect(request.counterparty).toBe(PAYEE);
    expect(request.source?.type).toBe('safe.multisig_transaction');
  });

  it('uses submissionDate as the observation time', () => {
    expect(normalizeSafeMultisigTransaction(safeTransaction(), options).observedAt).toBe('2026-07-10T18:00:00Z');
  });

  it('allows an explicit observation time override', () => {
    const request = normalizeSafeMultisigTransaction(safeTransaction(), {
      ...options,
      observedAt: '2026-07-10T19:00:00Z',
    });
    expect(request.observedAt).toBe('2026-07-10T19:00:00Z');
  });

  it('derives a deterministic request id', () => {
    expect(normalizeSafeMultisigTransaction(safeTransaction(), options).requestId).toBe(
      normalizeSafeMultisigTransaction(safeTransaction(), options).requestId,
    );
  });

  it('accepts explicit request metadata', () => {
    const request = normalizeSafeMultisigTransaction(safeTransaction(), {
      ...options,
      requestId: 'safe_customer_001',
      purpose: 'treasury_transfer',
      spentInPeriod: '10',
    });
    expect(request.requestId).toBe('safe_customer_001');
    expect(request.purpose).toBe('treasury_transfer');
    expect(request.spentInPeriod).toBe('10');
  });

  it('normalizes mixed-case EVM counterparties', () => {
    const tx = safeTransaction();
    tx.to = PAYEE.toUpperCase().replace('0X', '0x');
    expect(normalizeSafeMultisigTransaction(tx, options).counterparty).toBe(PAYEE);
  });

  it('rejects delegate calls', () => {
    const tx = safeTransaction();
    tx.operation = 1;
    expect(() => normalizeSafeMultisigTransaction(tx, options)).toThrow(/delegate calls/);
  });

  it('rejects calldata rather than misclassifying token effects', () => {
    const tx = safeTransaction();
    tx.data = '0xa9059cbb00000000';
    expect(() => normalizeSafeMultisigTransaction(tx, options)).toThrow(/rejects Safe calldata/);
  });

  it.each([
    ['gasPrice', (tx: ReturnType<typeof safeTransaction>) => (tx.gasPrice = '1')],
    ['gasToken', (tx: ReturnType<typeof safeTransaction>) => (tx.gasToken = '0x3333333333333333333333333333333333333333')],
    ['refundReceiver', (tx: ReturnType<typeof safeTransaction>) => (tx.refundReceiver = '0x3333333333333333333333333333333333333333')],
  ])('rejects non-default Safe %s refund configuration', (_field, mutate) => {
    const tx = safeTransaction();
    mutate(tx);
    expect(() => normalizeSafeMultisigTransaction(tx, options)).toThrow(/gas-refund configuration/);
  });

  it('requires an observation time when submissionDate is absent', () => {
    const tx = safeTransaction();
    delete tx.submissionDate;
    expect(() => normalizeSafeMultisigTransaction(tx, options)).toThrow(/Provide observedAt/);
  });

  it('rejects an asset identifier from another chain', () => {
    expect(() =>
      normalizeSafeMultisigTransaction(safeTransaction(), { ...options, assetId: 'eip155:1/slip44:60' }),
    ).toThrow(/must belong/);
  });

  it.each(['1.5', '-1', '01', '1e18'])('rejects malformed Safe value %s', (value) => {
    const tx = safeTransaction();
    tx.value = value;
    expect(() => normalizeSafeMultisigTransaction(tx, options)).toThrow(/Invalid safe/);
  });

  it.each([
    ['safe', (tx: ReturnType<typeof safeTransaction>) => (tx.safe = 'not-an-address')],
    ['to', (tx: ReturnType<typeof safeTransaction>) => (tx.to = 'not-an-address')],
    ['nonce', (tx: ReturnType<typeof safeTransaction>) => (tx.nonce = '-1')],
  ])('rejects malformed Safe %s', (_field, mutate) => {
    const tx = safeTransaction();
    mutate(tx);
    expect(() => normalizeSafeMultisigTransaction(tx, options)).toThrow(/Invalid safe/);
  });

  it('records Safe nonce and confirmation evidence', () => {
    const metadata = normalizeSafeMultisigTransaction(safeTransaction(), options).source?.metadata;
    expect(metadata?.nonce).toBe('42');
    expect(metadata?.confirmationsRequired).toBe(2);
    expect(metadata?.confirmationsObserved).toBe(0);
  });
});
