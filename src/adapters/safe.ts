import { sha256 } from '../canonical.js';
import { OasgError, ValidationError } from '../errors.js';
import { isEvmAddress, normalizeIdentifier } from '../normalize.js';
import { assertRequest } from '../schema.js';
import { REQUEST_SCHEMA_VERSION, type SafeMultisigTransaction, type SpendRequest } from '../types.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface SafeAdapterOptions {
  agentId: string;
  chainId: string;
  assetId: string;
  observedAt?: string;
  purpose?: string;
  requestId?: string;
  spentInPeriod?: string;
}

function assertSafe(value: unknown): asserts value is SafeMultisigTransaction {
  const candidate = value as Partial<SafeMultisigTransaction> | null;
  const valid =
    candidate !== null &&
    typeof candidate === 'object' &&
    typeof candidate.safe === 'string' &&
    isEvmAddress(candidate.safe) &&
    typeof candidate.to === 'string' &&
    isEvmAddress(candidate.to) &&
    typeof candidate.value === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(candidate.value) &&
    Number.isInteger(candidate.operation) &&
    typeof candidate.safeTxGas === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(candidate.safeTxGas) &&
    typeof candidate.baseGas === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(candidate.baseGas) &&
    typeof candidate.gasPrice === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(candidate.gasPrice) &&
    typeof candidate.gasToken === 'string' &&
    isEvmAddress(candidate.gasToken) &&
    (candidate.refundReceiver === undefined || candidate.refundReceiver === null || isEvmAddress(candidate.refundReceiver)) &&
    ((typeof candidate.nonce === 'number' && Number.isInteger(candidate.nonce) && candidate.nonce >= 0) ||
      (typeof candidate.nonce === 'string' && /^(0|[1-9][0-9]*)$/.test(candidate.nonce)));
  if (!valid) throw new ValidationError('safe', 'Expected a Safe Transaction Service multisig transaction.');
}

export function normalizeSafeMultisigTransaction(value: unknown, options: SafeAdapterOptions): SpendRequest {
  assertSafe(value);
  if (value.operation !== 0) {
    throw new OasgError('UNSUPPORTED_SAFE_OPERATION', 'v0.1 rejects Safe delegate calls and supports CALL only.');
  }
  if (value.data && value.data !== '0x') {
    throw new OasgError(
      'UNSUPPORTED_SAFE_CALLDATA',
      'v0.1 rejects Safe calldata because token transfers and arbitrary contract effects require decoding.',
    );
  }
  const refundReceiver = value.refundReceiver ? normalizeIdentifier(value.refundReceiver) : ZERO_ADDRESS;
  if (value.gasPrice !== '0' || normalizeIdentifier(value.gasToken) !== ZERO_ADDRESS || refundReceiver !== ZERO_ADDRESS) {
    throw new OasgError(
      'UNSUPPORTED_SAFE_GAS_REFUND',
      'v0.1 rejects Safe gas-refund configuration because it can move value outside the normalized transfer amount.',
    );
  }
  const observedAt = options.observedAt ?? value.submissionDate;
  if (!observedAt) throw new OasgError('SAFE_OBSERVED_AT', 'Provide observedAt when the Safe response has no submissionDate.');
  if (!options.assetId.startsWith(`${options.chainId}/`)) {
    throw new OasgError('SAFE_ASSET_CHAIN_MISMATCH', 'Safe assetId must belong to the supplied chainId.');
  }
  const rawHash = sha256(value);
  const reference = value.safeTxHash ?? value.transactionHash ?? `safe:${value.safe}:nonce:${value.nonce}`;
  const request: SpendRequest = {
    schemaVersion: REQUEST_SCHEMA_VERSION,
    requestId: options.requestId ?? `safe_${rawHash.slice(0, 24)}`,
    agentId: options.agentId,
    chainId: options.chainId,
    assetId: options.assetId,
    amount: value.value,
    counterparty: normalizeIdentifier(value.to),
    purpose: options.purpose ?? 'safe_native_transfer',
    observedAt,
    source: {
      type: 'safe.multisig_transaction',
      reference,
      rawHash,
      metadata: {
        safe: normalizeIdentifier(value.safe),
        nonce: String(value.nonce),
        isExecuted: value.isExecuted ?? false,
        confirmationsRequired: value.confirmationsRequired ?? 0,
        confirmationsObserved: value.confirmations?.length ?? 0,
      },
    },
  };
  if (options.spentInPeriod !== undefined) request.spentInPeriod = options.spentInPeriod;
  assertRequest(request);
  return request;
}
