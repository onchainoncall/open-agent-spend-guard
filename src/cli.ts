import { readFile } from 'node:fs/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Command } from 'commander';
import { canonicalJson, sha256 } from './canonical.js';
import { normalizeSafeMultisigTransaction, type SafeAdapterOptions } from './adapters/safe.js';
import { normalizeX402PaymentRequired, type X402AdapterOptions } from './adapters/x402.js';
import { evaluate } from './evaluator.js';
import { createEvidencePackage } from './evidence.js';
import { OasgError } from './errors.js';
import { validationResult } from './schema.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of input) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson(path: string): Promise<unknown> {
  const source = path === '-' ? await readStdin() : await readFile(path, 'utf8');
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new OasgError('INVALID_JSON', `Could not parse JSON from ${path}.`, String(error));
  }
}

function writeJson(value: unknown, compact = false): void {
  output.write(`${compact ? canonicalJson(value) : JSON.stringify(value, null, 2)}\n`);
}

function parseIndex(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new OasgError('INVALID_INDEX', 'Accept index must be a non-negative integer.');
  return parsed;
}

function x402Options(options: Record<string, string | number | undefined>): X402AdapterOptions {
  const result: X402AdapterOptions = {
    agentId: String(options.agent),
    observedAt: String(options.observedAt),
  };
  if (options.purpose !== undefined) result.purpose = String(options.purpose);
  if (options.requestId !== undefined) result.requestId = String(options.requestId);
  if (options.acceptIndex !== undefined) result.acceptIndex = Number(options.acceptIndex);
  if (options.spentInPeriod !== undefined) result.spentInPeriod = String(options.spentInPeriod);
  return result;
}

function safeOptions(options: Record<string, string | undefined>): SafeAdapterOptions {
  const result: SafeAdapterOptions = {
    agentId: String(options.agent),
    chainId: String(options.chain),
    assetId: String(options.asset),
  };
  if (options.observedAt !== undefined) result.observedAt = options.observedAt;
  if (options.purpose !== undefined) result.purpose = options.purpose;
  if (options.requestId !== undefined) result.requestId = options.requestId;
  if (options.spentInPeriod !== undefined) result.spentInPeriod = options.spentInPeriod;
  return result;
}

export async function main(argv = process.argv): Promise<void> {
  const program = new Command();
  program
    .name('oasg')
    .description('Deterministic spend-policy decisions for agent-initiated onchain payments.')
    .version('0.1.0');

  program
    .command('evaluate')
    .description('Evaluate a normalized request against a policy.')
    .requiredOption('-p, --policy <file>', 'policy JSON file')
    .requiredOption('-r, --request <file>', 'request JSON file, or - for stdin')
    .option('--evidence', 'emit a complete reproducible evidence package')
    .option('--compact', 'emit canonical single-line JSON')
    .action(async (options) => {
      const policy = await readJson(options.policy);
      const request = await readJson(options.request);
      writeJson(options.evidence ? createEvidencePackage(policy, request) : evaluate(policy, request), options.compact);
    });

  program
    .command('normalize-x402')
    .description('Normalize one x402 v2 PaymentRequired option into an OASG request.')
    .requiredOption('-i, --input <file>', 'x402 PaymentRequired JSON, or - for stdin')
    .requiredOption('--agent <id>', 'agent identifier')
    .requiredOption('--observed-at <iso>', 'observation time in ISO 8601 format')
    .option('--purpose <slug>', 'payment purpose')
    .option('--request-id <id>', 'request identifier')
    .option('--accept-index <n>', 'zero-based accepts index', parseIndex, 0)
    .option('--spent-in-period <atomic>', 'already-spent atomic amount')
    .option('--compact', 'emit canonical single-line JSON')
    .action(async (options) => writeJson(normalizeX402PaymentRequired(await readJson(options.input), x402Options(options)), options.compact));

  program
    .command('normalize-safe')
    .description('Normalize a Safe native-transfer multisig transaction into an OASG request.')
    .requiredOption('-i, --input <file>', 'Safe transaction JSON, or - for stdin')
    .requiredOption('--agent <id>', 'agent identifier')
    .requiredOption('--chain <caip2>', 'CAIP-2 chain identifier')
    .requiredOption('--asset <caip19>', 'native asset identifier')
    .option('--observed-at <iso>', 'observation time; falls back to submissionDate')
    .option('--purpose <slug>', 'payment purpose')
    .option('--request-id <id>', 'request identifier')
    .option('--spent-in-period <atomic>', 'already-spent atomic amount')
    .option('--compact', 'emit canonical single-line JSON')
    .action(async (options) => writeJson(normalizeSafeMultisigTransaction(await readJson(options.input), safeOptions(options)), options.compact));

  program
    .command('validate')
    .description('Validate a policy, request, decision, or evidence document.')
    .argument('<kind>', 'policy, request, decision, or evidence')
    .argument('<file>', 'JSON file, or - for stdin')
    .action(async (kind, file) => {
      if (!['policy', 'request', 'decision', 'evidence'].includes(kind)) {
        throw new OasgError('VALIDATION_KIND', 'Kind must be policy, request, decision, or evidence.');
      }
      const checked = validationResult(kind, await readJson(file));
      writeJson(checked);
      if (!checked.valid) process.exitCode = 1;
    });

  program
    .command('hash')
    .description('Compute the canonical SHA-256 hash of a JSON document.')
    .argument('<file>', 'JSON file, or - for stdin')
    .action(async (file) => writeJson({ algorithm: 'sha256', hash: sha256(await readJson(file)) }));

  await program.parseAsync(argv);
}

main().catch((error: unknown) => {
  const known = error instanceof OasgError;
  process.stderr.write(
    `${JSON.stringify({
      error: known ? error.code : 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : String(error),
      ...(known && error.details !== undefined ? { details: error.details } : {}),
    })}\n`,
  );
  process.exitCode = 1;
});
