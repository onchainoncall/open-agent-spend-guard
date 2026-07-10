export const POLICY_SCHEMA_VERSION = 'oasg.policy.v1' as const;
export const REQUEST_SCHEMA_VERSION = 'oasg.request.v1' as const;
export const DECISION_SCHEMA_VERSION = 'oasg.decision.v1' as const;
export const EVIDENCE_SCHEMA_VERSION = 'oasg.evidence.v1' as const;

export type AtomicAmount = string;
export type DecisionOutcome = 'allow' | 'block' | 'approval_required';

export interface PeriodBudget {
  period: 'day';
  limit: AtomicAmount;
}

export interface AssetRule {
  assetId: string;
  maxPerTransaction: AtomicAmount;
  approvalRequiredAbove?: AtomicAmount;
  periodBudget?: PeriodBudget;
}

export interface SpendPolicy {
  schemaVersion: typeof POLICY_SCHEMA_VERSION;
  policyId: string;
  version: number;
  name?: string;
  rules: {
    allowedChains: string[];
    assets: AssetRule[];
    allowedCounterparties?: string[];
    allowedPurposes?: string[];
  };
}

export interface RequestSource {
  type: string;
  reference?: string;
  rawHash?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SpendRequest {
  schemaVersion: typeof REQUEST_SCHEMA_VERSION;
  requestId: string;
  agentId: string;
  chainId: string;
  assetId: string;
  amount: AtomicAmount;
  counterparty: string;
  purpose: string;
  observedAt: string;
  spentInPeriod?: AtomicAmount;
  source?: RequestSource;
}

export type ReasonCode =
  | 'chain.not_allowed'
  | 'asset.chain_mismatch'
  | 'asset.not_allowed'
  | 'counterparty.not_allowed'
  | 'purpose.not_allowed'
  | 'amount.max_transaction'
  | 'budget.snapshot_required'
  | 'budget.period_limit'
  | 'approval.threshold'
  | 'policy.allow';

export interface SpendDecision {
  schemaVersion: typeof DECISION_SCHEMA_VERSION;
  decisionId: string;
  outcome: DecisionOutcome;
  reasonCode: ReasonCode;
  explanation: string;
  matchedRule: string;
  policy: {
    policyId: string;
    version: number;
    hash: string;
  };
  request: {
    requestId: string;
    hash: string;
  };
  facts: {
    chainId: string;
    assetId: string;
    amount: AtomicAmount;
    counterparty: string;
    purpose: string;
    spentInPeriod?: AtomicAmount;
    projectedPeriodSpend?: AtomicAmount;
  };
  evaluatedAt: string;
}

export interface EvidencePackage {
  schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  packageId: string;
  createdAt: string;
  policy: SpendPolicy;
  request: SpendRequest;
  decision: SpendDecision;
}

export interface X402PaymentRequirementV2 {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface X402PaymentRequiredV2 {
  x402Version: 2;
  error?: string;
  resource: {
    url: string;
    description?: string;
    mimeType?: string;
    serviceName?: string;
    tags?: string[];
    iconUrl?: string;
  };
  accepts: X402PaymentRequirementV2[];
  extensions?: Record<string, unknown>;
}

export interface SafeMultisigTransaction {
  safe: string;
  to: string;
  value: string;
  data?: string | null;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver?: string | null;
  nonce: number | string;
  safeTxHash?: string;
  transactionHash?: string | null;
  submissionDate?: string;
  isExecuted?: boolean;
  confirmationsRequired?: number;
  confirmations?: unknown[];
}
