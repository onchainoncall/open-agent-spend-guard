import { sha256 } from './canonical.js';
import { assertDecision, assertPolicy, assertRequest } from './schema.js';
import { chainFromAssetId, normalizeIdentifier } from './normalize.js';
import {
  DECISION_SCHEMA_VERSION,
  type AssetRule,
  type ReasonCode,
  type SpendDecision,
  type SpendPolicy,
  type SpendRequest,
} from './types.js';

interface Result {
  outcome: SpendDecision['outcome'];
  reasonCode: ReasonCode;
  explanation: string;
  matchedRule: string;
  projectedPeriodSpend?: string;
}

function result(
  outcome: Result['outcome'],
  reasonCode: ReasonCode,
  explanation: string,
  matchedRule: string,
  projectedPeriodSpend?: string,
): Result {
  return projectedPeriodSpend === undefined
    ? { outcome, reasonCode, explanation, matchedRule }
    : { outcome, reasonCode, explanation, matchedRule, projectedPeriodSpend };
}

function evaluateRules(policy: SpendPolicy, request: SpendRequest): Result {
  if (!policy.rules.allowedChains.includes(request.chainId)) {
    return result('block', 'chain.not_allowed', `Chain ${request.chainId} is not allowed by this policy.`, '/rules/allowedChains');
  }

  if (chainFromAssetId(request.assetId) !== request.chainId) {
    return result('block', 'asset.chain_mismatch', 'The asset identifier does not belong to the requested chain.', '/assetId');
  }

  const asset = policy.rules.assets.find((candidate) => candidate.assetId === request.assetId);
  if (!asset) {
    return result('block', 'asset.not_allowed', `Asset ${request.assetId} is not allowed by this policy.`, '/rules/assets');
  }

  const counterparty = normalizeIdentifier(request.counterparty);
  if (
    policy.rules.allowedCounterparties &&
    !policy.rules.allowedCounterparties.map(normalizeIdentifier).includes(counterparty)
  ) {
    return result(
      'block',
      'counterparty.not_allowed',
      `Counterparty ${request.counterparty} is not allowed by this policy.`,
      '/rules/allowedCounterparties',
    );
  }

  if (policy.rules.allowedPurposes && !policy.rules.allowedPurposes.includes(request.purpose)) {
    return result('block', 'purpose.not_allowed', `Purpose ${request.purpose} is not allowed by this policy.`, '/rules/allowedPurposes');
  }

  const amount = BigInt(request.amount);
  if (amount > BigInt(asset.maxPerTransaction)) {
    return result(
      'block',
      'amount.max_transaction',
      `Amount ${request.amount} exceeds the per-transaction limit ${asset.maxPerTransaction}.`,
      assetPath(policy, asset, 'maxPerTransaction'),
    );
  }

  let projectedPeriodSpend: string | undefined;
  if (asset.periodBudget) {
    if (request.spentInPeriod === undefined) {
      return result(
        'block',
        'budget.snapshot_required',
        `A current ${asset.periodBudget.period} spend snapshot is required for this asset.`,
        assetPath(policy, asset, 'periodBudget'),
      );
    }
    const spent = BigInt(request.spentInPeriod);
    projectedPeriodSpend = (spent + amount).toString();
    if (BigInt(projectedPeriodSpend) > BigInt(asset.periodBudget.limit)) {
      return result(
        'block',
        'budget.period_limit',
        `Projected ${asset.periodBudget.period} spend ${projectedPeriodSpend} exceeds the limit ${asset.periodBudget.limit}.`,
        assetPath(policy, asset, 'periodBudget/limit'),
        projectedPeriodSpend,
      );
    }
  }

  if (asset.approvalRequiredAbove !== undefined && amount > BigInt(asset.approvalRequiredAbove)) {
    return result(
      'approval_required',
      'approval.threshold',
      `Amount ${request.amount} requires approval above ${asset.approvalRequiredAbove}.`,
      assetPath(policy, asset, 'approvalRequiredAbove'),
      projectedPeriodSpend,
    );
  }

  return result('allow', 'policy.allow', 'The request satisfies every active policy rule.', '/rules', projectedPeriodSpend);
}

function assetPath(policy: SpendPolicy, asset: AssetRule, suffix: string): string {
  return `/rules/assets/${policy.rules.assets.indexOf(asset)}/${suffix}`;
}

export function evaluate(policyInput: unknown, requestInput: unknown): SpendDecision {
  assertPolicy(policyInput);
  assertRequest(requestInput);
  const policy = policyInput;
  const request = requestInput;
  const evaluated = evaluateRules(policy, request);
  const policyHash = sha256(policy);
  const requestHash = sha256(request);
  const decisionSeed = {
    schemaVersion: DECISION_SCHEMA_VERSION,
    policyHash,
    requestHash,
    outcome: evaluated.outcome,
    reasonCode: evaluated.reasonCode,
  };

  const facts: SpendDecision['facts'] = {
    chainId: request.chainId,
    assetId: request.assetId,
    amount: request.amount,
    counterparty: request.counterparty,
    purpose: request.purpose,
  };
  if (request.spentInPeriod !== undefined) facts.spentInPeriod = request.spentInPeriod;
  if (evaluated.projectedPeriodSpend !== undefined) facts.projectedPeriodSpend = evaluated.projectedPeriodSpend;

  const decision: SpendDecision = {
    schemaVersion: DECISION_SCHEMA_VERSION,
    decisionId: `oasg_${sha256(decisionSeed).slice(0, 32)}`,
    outcome: evaluated.outcome,
    reasonCode: evaluated.reasonCode,
    explanation: evaluated.explanation,
    matchedRule: evaluated.matchedRule,
    policy: { policyId: policy.policyId, version: policy.version, hash: policyHash },
    request: { requestId: request.requestId, hash: requestHash },
    facts,
    evaluatedAt: request.observedAt,
  };
  assertDecision(decision);
  return decision;
}
