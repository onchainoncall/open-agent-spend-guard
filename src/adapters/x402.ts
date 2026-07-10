import { OasgError, ValidationError } from '../errors.js';
import { isEvmAddress, normalizeIdentifier, x402AssetId } from '../normalize.js';
import { sha256 } from '../canonical.js';
import { REQUEST_SCHEMA_VERSION, type SpendRequest, type X402PaymentRequiredV2 } from '../types.js';
import { assertRequest } from '../schema.js';

export interface X402AdapterOptions {
  agentId: string;
  observedAt: string;
  purpose?: string;
  requestId?: string;
  acceptIndex?: number;
  spentInPeriod?: string;
}

function assertX402(value: unknown): asserts value is X402PaymentRequiredV2 {
  const candidate = value as Partial<X402PaymentRequiredV2> | null;
  const valid =
    candidate !== null &&
    typeof candidate === 'object' &&
    candidate.x402Version === 2 &&
    typeof candidate.resource?.url === 'string' &&
    Array.isArray(candidate.accepts) &&
    candidate.accepts.length > 0 &&
    candidate.accepts.every(
      (entry) =>
        entry &&
        typeof entry.scheme === 'string' &&
        typeof entry.network === 'string' &&
        typeof entry.asset === 'string' &&
        typeof entry.amount === 'string' &&
        /^(0|[1-9][0-9]*)$/.test(entry.amount) &&
        typeof entry.payTo === 'string' &&
        (!entry.network.startsWith('eip155:') || isEvmAddress(entry.payTo)) &&
        Number.isFinite(entry.maxTimeoutSeconds) &&
        entry.maxTimeoutSeconds > 0,
    );
  if (!valid) throw new ValidationError('x402', 'Expected an x402 v2 PaymentRequired object.');
}

export function normalizeX402PaymentRequired(value: unknown, options: X402AdapterOptions): SpendRequest {
  assertX402(value);
  const acceptIndex = options.acceptIndex ?? 0;
  const accepted = value.accepts[acceptIndex];
  if (!accepted) throw new OasgError('X402_ACCEPT_INDEX', `No x402 payment option exists at index ${acceptIndex}.`);
  if (accepted.scheme !== 'exact') {
    throw new OasgError('UNSUPPORTED_X402_SCHEME', `v0.1 supports the x402 exact scheme, not ${accepted.scheme}.`);
  }
  const rawHash = sha256(value);
  let assetId: string;
  try {
    assetId = x402AssetId(accepted.network, accepted.asset);
  } catch (error) {
    throw new OasgError('X402_ASSET_IDENTIFIER', error instanceof Error ? error.message : String(error));
  }
  const request: SpendRequest = {
    schemaVersion: REQUEST_SCHEMA_VERSION,
    requestId: options.requestId ?? `x402_${rawHash.slice(0, 24)}_${acceptIndex}`,
    agentId: options.agentId,
    chainId: accepted.network,
    assetId,
    amount: accepted.amount,
    counterparty: normalizeIdentifier(accepted.payTo),
    purpose: options.purpose ?? 'x402_resource_payment',
    observedAt: options.observedAt,
    source: {
      type: 'x402.payment_required.v2',
      reference: value.resource.url,
      rawHash,
      metadata: {
        scheme: accepted.scheme,
        acceptIndex,
        maxTimeoutSeconds: accepted.maxTimeoutSeconds,
      },
    },
  };
  if (options.spentInPeriod !== undefined) request.spentInPeriod = options.spentInPeriod;
  assertRequest(request);
  return request;
}
