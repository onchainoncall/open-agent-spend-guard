import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import express from 'express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import {
  createEvidencePackage,
  normalizeX402PaymentRequired,
} from 'open-agent-spend-guard';

const NETWORK = 'eip155:84532';
const FACILITATOR_URL = 'https://x402.org/facilitator';
const TEST_RECEIVER = '0x1111111111111111111111111111111111111111';
const PORT = Number.parseInt(process.env.PORT ?? '4021', 10);
const ARTIFACT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'artifacts');

function decodeBase64Json(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return JSON.parse(Buffer.from(normalized + padding, 'base64').toString('utf8'));
}

function policyFor(request, variant) {
  const rules = {
    allowedChains: [request.chainId],
    assets: [],
    allowedCounterparties: [request.counterparty],
    allowedPurposes: [request.purpose],
  };

  if (variant === 'allow') {
    rules.assets.push({
      assetId: request.assetId,
      maxPerTransaction: request.amount,
    });
  } else if (variant === 'approval') {
    rules.assets.push({
      assetId: request.assetId,
      maxPerTransaction: request.amount,
      approvalRequiredAbove: (BigInt(request.amount) - 1n).toString(),
    });
  } else {
    rules.assets.push({
      assetId: request.assetId,
      maxPerTransaction: (BigInt(request.amount) - 1n).toString(),
    });
  }

  return {
    schemaVersion: 'oasg.policy.v1',
    policyId: `base-sepolia-x402-${variant}`,
    version: 1,
    name: `Base Sepolia x402 ${variant} policy`,
    rules,
  };
}

async function writeJson(name, value) {
  await writeFile(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme());

await resourceServer.initialize();

const app = express();
app.use(
  paymentMiddleware(
    {
      'GET /weather': {
        accepts: {
          scheme: 'exact',
          price: '$0.001',
          network: NETWORK,
          payTo: TEST_RECEIVER,
        },
        description: 'Synthetic weather payload for an x402 policy walkthrough',
        mimeType: 'application/json',
      },
    },
    resourceServer,
    undefined,
    undefined,
    false,
  ),
);
app.get('/weather', (_request, response) => {
  response.json({ condition: 'clear', source: 'synthetic-demo' });
});

const server = await new Promise((resolve, reject) => {
  const listener = app.listen(PORT, '127.0.0.1', () => resolve(listener));
  listener.once('error', reject);
});

try {
  const capturedAt = new Date().toISOString();
  const resourceUrl = `http://127.0.0.1:${PORT}/weather`;
  const response = await fetch(resourceUrl, {
    headers: {
      accept: 'application/json',
      'user-agent': 'onchain-on-call-base-sepolia-walkthrough/1.0',
    },
  });

  if (response.status !== 402) {
    throw new Error(`Expected HTTP 402, received ${response.status}.`);
  }

  const encodedChallenge = response.headers.get('payment-required');
  if (!encodedChallenge) {
    throw new Error('The x402 middleware returned no PAYMENT-REQUIRED header.');
  }

  const challenge = decodeBase64Json(encodedChallenge);
  const request = normalizeX402PaymentRequired(challenge, {
    agentId: 'onchain-on-call-base-sepolia-walkthrough',
    observedAt: capturedAt,
    requestId: 'x402_base_sepolia_walkthrough_001',
  });

  const evidence = {
    allow: createEvidencePackage(policyFor(request, 'allow'), request),
    approval: createEvidencePackage(policyFor(request, 'approval'), request),
    block: createEvidencePackage(policyFor(request, 'block'), request),
  };

  const outcomes = Object.fromEntries(
    Object.entries(evidence).map(([name, item]) => [name, item.decision.outcome]),
  );
  const expected = {
    allow: 'allow',
    approval: 'approval_required',
    block: 'block',
  };

  if (JSON.stringify(outcomes) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected policy outcomes: ${JSON.stringify(outcomes)}`);
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeJson('payment-required.json', challenge);
  await writeJson('normalized-request.json', request);
  await writeJson('evidence-allow.json', evidence.allow);
  await writeJson('evidence-approval-required.json', evidence.approval);
  await writeJson('evidence-block.json', evidence.block);
  await writeJson('run-summary.json', {
    status: 'passed',
    capturedAt,
    protocol: 'x402 v2',
    network: NETWORK,
    facilitator: FACILITATOR_URL,
    resourceUrl,
    httpStatus: response.status,
    paymentRequiredHeaderPresent: true,
    assetId: request.assetId,
    atomicAmount: request.amount,
    outcomes,
    settlementAttempted: false,
    settlementReason: 'Challenge and policy-evidence walkthrough only; no account key or test token was used.',
  });

  console.log(JSON.stringify({ status: 'passed', outcomes, artifactDir: ARTIFACT_DIR }, null, 2));
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
