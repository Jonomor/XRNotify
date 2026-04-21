/**
 * NemoClaw — NVIDIA agent execution governance wrapper.
 *
 * CLI-based implementation. Calls the nemoclaw binary via execSync.
 * If the CLI is not available in the Railway container (install failed),
 * falls back to policy-only mode: YAML policies are still generated and
 * logged for audit purposes, but not enforced at the sandbox level.
 *
 * Fire-and-forget pattern. Must NEVER gate primary operations.
 */

import { execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createModuleLogger } from '@/lib/logger';

const logger = createModuleLogger('nemoclaw');
const execAsync = promisify(exec);

const NEMOCLAW_ENABLED = process.env['NEMOCLAW_ENABLED'] === 'true';
const NVIDIA_API_KEY = process.env['NVIDIA_API_KEY'];
const AGENT_TYPE = 'xrnotify-platform';

// ── Types (preserve existing public interface) ────────────────────────────

export interface GovernanceResult {
  governed: boolean;
  policyApplied: string;
  auditId: string;
}

export interface ExecutionLogParams {
  agentId: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  metadata?: Record<string, unknown>;
}

// ── Availability check ────────────────────────────────────────────────────

type Mode = 'active' | 'policy-only' | 'disabled';

let _mode: Mode | null = null;

function detectMode(): Mode {
  if (_mode !== null) return _mode;
  if (!NEMOCLAW_ENABLED) {
    logger.info('NEMOCLAW_ENABLED not set — governance disabled');
    _mode = 'disabled';
    return _mode;
  }
  if (!NVIDIA_API_KEY) {
    logger.info('NVIDIA_API_KEY not set — governance disabled');
    _mode = 'disabled';
    return _mode;
  }
  try {
    execSync('nemoclaw --version', { stdio: 'pipe' });
    logger.info('Runtime check: CLI available — governance active');
    _mode = 'active';
  } catch {
    logger.info('Runtime check: CLI not found — policy-only mode');
    _mode = 'policy-only';
  }
  return _mode;
}

// ── Policy generation ─────────────────────────────────────────────────────

interface Policy {
  agentType: string;
  allowedDomains: string[];
  allowedOperations: string[];
  blockedOperations: string[];
  auditLevel: 'NONE' | 'SUMMARY' | 'FULL';
  timeoutMs: number;
}

function generatePlatformPolicy(): Policy {
  return {
    agentType: AGENT_TYPE,
    allowedDomains: [
      // Database / cache
      'supabase.co',
      'supabase.in',
      // Billing
      'api.stripe.com',
      // LLM observability + inference
      'bifrost-gateway-production-e973.up.railway.app',
      'integrate.api.nvidia.com',
    ],
    allowedOperations: [
      'db.read',
      'db.write',
      'http.fetch',
      'json.parse',
      'json.stringify',
    ],
    blockedOperations: [
      'file.write',
      'process.spawn',
      'network.external.unauthorized',
    ],
    auditLevel: 'SUMMARY',
    timeoutMs: 30 * 60 * 1000,
  };
}

function generatePolicyYaml(policy: Policy): string {
  const hosts = policy.allowedDomains.map((d) => `    - ${d}`).join('\n');
  return `
version: "1"
agent: ${policy.agentType}
network:
  egress:
    allow:
${hosts}
    deny:
      - "*"
filesystem:
  allow:
    - /sandbox
    - /tmp
  deny:
    - /
process:
  allow_privilege_escalation: false
timeout_ms: ${policy.timeoutMs}
audit_level: ${policy.auditLevel}
`.trim();
}

// ── Audit trail (in-memory ring buffer) ───────────────────────────────────

const AUDIT_MAX = 10_000;
const _auditTrail: Array<{
  id: string;
  ts: string;
  agentId: string;
  action: string;
  result: string;
  metadata?: Record<string, unknown>;
}> = [];

function recordAudit(entry: Omit<(typeof _auditTrail)[number], 'id' | 'ts'>): string {
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  _auditTrail.push({ id, ts: new Date().toISOString(), ...entry });
  if (_auditTrail.length > AUDIT_MAX) _auditTrail.shift();
  return id;
}

// ── Public API (preserves existing call signatures) ───────────────────────

export class NemoClawClient {
  async governAgent(
    agentId: string,
    _purpose: string,
  ): Promise<GovernanceResult> {
    const mode = detectMode();
    if (mode === 'disabled') {
      return { governed: false, policyApplied: '', auditId: '' };
    }
    const policy = generatePlatformPolicy();
    const yaml = generatePolicyYaml(policy);
    const auditId = recordAudit({
      agentId,
      action: 'govern_agent',
      result: 'success',
      metadata: { mode, policyBytes: yaml.length },
    });

    if (mode === 'active') {
      try {
        const sandboxName = `platform-${Date.now()}`;
        const policyPath = `/tmp/nemoclaw-${sandboxName}.yaml`;
        await execAsync(
          `cat > ${policyPath} << 'POLICYEOF'\n${yaml}\nPOLICYEOF`,
        );
        await execAsync(
          `NVIDIA_API_KEY=${NVIDIA_API_KEY} nemoclaw onboard --name ${sandboxName} --policy ${policyPath} --non-interactive`,
          { timeout: 60_000 },
        );
      } catch (err) {
        logger.warn({ err }, 'Sandbox onboard failed — continuing without enforcement');
      }
    }

    return {
      governed: mode === 'active',
      policyApplied: policy.agentType,
      auditId,
    };
  }

  async logExecution(params: ExecutionLogParams): Promise<void> {
    if (detectMode() === 'disabled') return;
    recordAudit({
      agentId: params.agentId,
      action: params.action,
      result: params.result,
      metadata: params.metadata,
    });
  }

  getAuditTrail(limit = 100): typeof _auditTrail {
    return _auditTrail.slice(-limit);
  }
}

let _instance: NemoClawClient | null = null;

export function getNemoClaw(): NemoClawClient {
  if (!_instance) _instance = new NemoClawClient();
  return _instance;
}
