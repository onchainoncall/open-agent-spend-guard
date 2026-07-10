import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cli = new URL('../dist/cli.js', import.meta.url).pathname;
const root = new URL('..', import.meta.url).pathname;

function run(args: string[]): any {
  return JSON.parse(execFileSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' }));
}

describe('packaged CLI', () => {
  it('reports the release version', () => {
    expect(execFileSync(process.execPath, [cli, '--version'], { encoding: 'utf8' }).trim()).toBe('0.1.1');
  });

  it.each([
    ['allow', 'allow'],
    ['approval', 'approval_required'],
    ['block', 'block'],
  ])('evaluates the bundled %s example', (name, outcome) => {
    const decision = run([
      'evaluate',
      '--policy',
      'examples/policy.base-usdc.json',
      '--request',
      `examples/request.${name}.json`,
    ]);
    expect(decision.outcome).toBe(outcome);
  });

  it('emits a complete evidence package', () => {
    const evidence = run([
      'evaluate',
      '-p',
      'examples/policy.base-usdc.json',
      '-r',
      'examples/request.allow.json',
      '--evidence',
    ]);
    expect(evidence.schemaVersion).toBe('oasg.evidence.v1');
    expect(evidence.decision.outcome).toBe('allow');
  });

  it('normalizes the bundled x402 example', () => {
    const request = run([
      'normalize-x402',
      '--input',
      'examples/x402.payment-required.json',
      '--agent',
      'cli-agent-01',
      '--observed-at',
      '2026-07-10T18:00:00Z',
    ]);
    expect(request.source.type).toBe('x402.payment_required.v2');
  });

  it('normalizes the bundled Safe example', () => {
    const request = run([
      'normalize-safe',
      '--input',
      'examples/safe.native-transfer.json',
      '--agent',
      'cli-agent-01',
      '--chain',
      'eip155:8453',
      '--asset',
      'eip155:8453/slip44:60',
    ]);
    expect(request.source.type).toBe('safe.multisig_transaction');
  });

  it('validates a request from stdin', () => {
    const source = readFileForStdin('examples/request.allow.json');
    const result = spawnSync(process.execPath, [cli, 'validate', 'request', '-'], {
      cwd: root,
      encoding: 'utf8',
      input: source,
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).valid).toBe(true);
  });

  it('rejects a schema-valid policy with semantic errors', () => {
    const policy = JSON.parse(readFileForStdin('examples/policy.base-usdc.json'));
    policy.rules.assets.push(structuredClone(policy.rules.assets[0]));
    const result = spawnSync(process.execPath, [cli, 'validate', 'policy', '-'], {
      cwd: root,
      encoding: 'utf8',
      input: JSON.stringify(policy),
    });
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stdout);
    expect(output.valid).toBe(false);
    expect(output.errors[0].keyword).toBe('semantic');
  });

  it('returns structured errors and a nonzero status for invalid JSON', () => {
    const result = spawnSync(process.execPath, [cli, 'validate', 'request', '-'], {
      cwd: root,
      encoding: 'utf8',
      input: '{bad json',
    });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr).error).toBe('INVALID_JSON');
  });
});

function readFileForStdin(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}
