import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv/dist/ajv.js';
import addFormats from 'ajv-formats/dist/index.js';
import policySchema from '../schemas/policy.schema.json' with { type: 'json' };
import requestSchema from '../schemas/request.schema.json' with { type: 'json' };
import decisionSchema from '../schemas/decision.schema.json' with { type: 'json' };
import evidenceSchema from '../schemas/evidence.schema.json' with { type: 'json' };
import type { EvidencePackage, SpendDecision, SpendPolicy, SpendRequest } from './types.js';
import { ValidationError } from './errors.js';
import { chainFromAssetId } from './normalize.js';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validatePolicySchema = ajv.compile<SpendPolicy>(policySchema);
const validateRequestSchema = ajv.compile<SpendRequest>(requestSchema);
const validateDecisionSchema = ajv.compile<SpendDecision>(decisionSchema);
const validateEvidenceSchema = ajv.compile<EvidencePackage>(evidenceSchema);

function copyErrors(errors: ErrorObject[] | null | undefined): ErrorObject[] {
  return errors ? structuredClone(errors) : [];
}

export function assertPolicy(value: unknown): asserts value is SpendPolicy {
  if (!validatePolicySchema(value)) throw new ValidationError('policy', copyErrors(validatePolicySchema.errors));
  const seenAssets = new Set<string>();
  const semanticErrors: string[] = [];
  for (const [index, asset] of value.rules.assets.entries()) {
    if (seenAssets.has(asset.assetId)) semanticErrors.push(`/rules/assets/${index}/assetId is duplicated.`);
    seenAssets.add(asset.assetId);
    if (!value.rules.allowedChains.includes(chainFromAssetId(asset.assetId))) {
      semanticErrors.push(`/rules/assets/${index}/assetId belongs to a chain outside allowedChains.`);
    }
    if (
      asset.approvalRequiredAbove !== undefined &&
      BigInt(asset.approvalRequiredAbove) > BigInt(asset.maxPerTransaction)
    ) {
      semanticErrors.push(`/rules/assets/${index}/approvalRequiredAbove exceeds maxPerTransaction.`);
    }
  }
  if (semanticErrors.length > 0) throw new ValidationError('policy', semanticErrors);
}

export function assertRequest(value: unknown): asserts value is SpendRequest {
  if (!validateRequestSchema(value)) throw new ValidationError('request', copyErrors(validateRequestSchema.errors));
}

export function assertDecision(value: unknown): asserts value is SpendDecision {
  if (!validateDecisionSchema(value)) throw new ValidationError('decision', copyErrors(validateDecisionSchema.errors));
}

export function assertEvidence(value: unknown): asserts value is EvidencePackage {
  if (!validateEvidenceSchema(value)) throw new ValidationError('evidence', copyErrors(validateEvidenceSchema.errors));
}

export function validationResult(
  kind: 'policy' | 'request' | 'decision' | 'evidence',
  value: unknown,
): { valid: boolean; errors: ErrorObject[] } {
  const validator: ValidateFunction =
    kind === 'policy'
      ? validatePolicySchema
      : kind === 'request'
        ? validateRequestSchema
        : kind === 'decision'
          ? validateDecisionSchema
          : validateEvidenceSchema;
  const valid = validator(value);
  return { valid, errors: copyErrors(validator.errors) };
}
