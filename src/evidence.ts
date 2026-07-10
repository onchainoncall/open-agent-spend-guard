import { sha256 } from './canonical.js';
import { evaluate } from './evaluator.js';
import { assertEvidence, assertPolicy, assertRequest } from './schema.js';
import { EVIDENCE_SCHEMA_VERSION, type EvidencePackage } from './types.js';

export function createEvidencePackage(policyInput: unknown, requestInput: unknown): EvidencePackage {
  assertPolicy(policyInput);
  assertRequest(requestInput);
  const decision = evaluate(policyInput, requestInput);
  const packageId = `oasge_${sha256({
    policyHash: decision.policy.hash,
    requestHash: decision.request.hash,
    decisionId: decision.decisionId,
  }).slice(0, 32)}`;
  const evidence: EvidencePackage = {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    packageId,
    createdAt: requestInput.observedAt,
    policy: structuredClone(policyInput),
    request: structuredClone(requestInput),
    decision,
  };
  assertEvidence(evidence);
  return evidence;
}
