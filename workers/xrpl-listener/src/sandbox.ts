// =============================================================================
// E2B Sandboxed Execution
// =============================================================================
// Executes AI classification in an isolated Python sandbox via E2B.
// The LLM call, response parsing, and validation all happen inside
// the sandbox. Only clean, validated JSON exits.
// =============================================================================

import pino from 'pino';

const logger = pino({ name: 'e2b-sandbox' });

export interface SandboxConfig {
  enabled: boolean;
  apiKey: string;
  timeoutMs: number;
}

function getConfig(): SandboxConfig {
  return {
    enabled: process.env['E2B_ENABLED'] === 'true',
    apiKey: process.env['E2B_API_KEY'] || '',
    timeoutMs: 30000,
  };
}

export interface SandboxResult<T> {
  success: boolean;
  data: T | null;
  sandboxId: string | null;
  executionTimeMs: number;
  error: string | null;
}

export interface ClassificationResult {
  isAnomalous: boolean;
  confidence: number;
  category: string;
  reasoning: string;
}

interface ClassifyParams {
  gatewayUrl: string;
  masterKey: string;
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Execute AI classification inside an E2B Python sandbox.
 * The LLM call, JSON parsing, and validation all happen
 * inside the sandbox. Only validated results exit.
 * Returns null-data result if E2B is disabled or fails.
 */
export async function classifyInSandbox(
  params: ClassifyParams
): Promise<SandboxResult<ClassificationResult>> {
  const config = getConfig();
  const startTime = Date.now();

  if (!config.enabled || !config.apiKey) {
    return {
      success: false,
      data: null,
      sandboxId: null,
      executionTimeMs: 0,
      error: 'E2B disabled',
    };
  }

  try {
    const { Sandbox } = await import('@e2b/code-interpreter');

    const sandbox = await Sandbox.create({
      apiKey: config.apiKey,
      timeoutMs: config.timeoutMs,
    });

    const sandboxId = sandbox.sandboxId;
    logger.debug({ sandboxId }, '[E2B] Sandbox created');

    try {
      // Escape the prompt for safe Python string embedding
      const escapedPrompt = params.prompt
        .replace(/\\/g, '\\\\')
        .replace(/"""/g, '\\"\\"\\"')
        .replace(/\n/g, '\\n');

      const pythonScript = `
import json
import urllib.request

gateway_url = "${params.gatewayUrl}"
master_key = "${params.masterKey}"
model = "${params.model}"
max_tokens = ${params.maxTokens}
temperature = ${params.temperature}

prompt = """${escapedPrompt}"""

body = json.dumps({
    "model": model,
    "messages": [{"role": "user", "content": prompt}],
    "max_tokens": max_tokens,
    "temperature": temperature,
}).encode("utf-8")

headers = {
    "Authorization": f"Bearer {master_key}",
    "Content-Type": "application/json",
}

req = urllib.request.Request(
    f"{gateway_url}/chat/completions",
    data=body,
    headers=headers,
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    raise SystemExit(1)

content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

# Strip markdown fences if present
content = content.strip()
if content.startswith("\`\`\`json"):
    content = content[7:]
if content.startswith("\`\`\`"):
    content = content[3:]
if content.endswith("\`\`\`"):
    content = content[:-3]
content = content.strip()

try:
    result = json.loads(content)
except json.JSONDecodeError as e:
    print(json.dumps({"error": f"JSON parse failed: {e}", "raw": content[:500]}))
    raise SystemExit(1)

# Validate required fields
is_anomalous = bool(result.get("isAnomalous", False))
confidence = float(result.get("confidence", 0))
category = str(result.get("category", "unknown"))
reasoning = str(result.get("reasoning", ""))

confidence = max(0.0, min(1.0, confidence))

validated = {
    "isAnomalous": is_anomalous,
    "confidence": confidence,
    "category": category,
    "reasoning": reasoning,
}

print(json.dumps(validated))
`;

      const execution = await sandbox.runCode(pythonScript);

      const stdout = (execution.logs?.stdout ?? []).join('').trim();
      const stderr = (execution.logs?.stderr ?? []).join('').trim();

      if (execution.error || !stdout) {
        logger.warn({ sandboxId, stderr, error: execution.error }, '[E2B] Sandbox execution failed');
        return {
          success: false,
          data: null,
          sandboxId,
          executionTimeMs: Date.now() - startTime,
          error: execution.error?.name || stderr || 'No output from sandbox',
        };
      }

      const classification = JSON.parse(stdout) as ClassificationResult;

      if (classification && 'error' in classification) {
        logger.warn({ sandboxId, error: classification }, '[E2B] Sandbox returned error');
        return {
          success: false,
          data: null,
          sandboxId,
          executionTimeMs: Date.now() - startTime,
          error: String((classification as Record<string, unknown>)['error']),
        };
      }

      logger.info({
        sandboxId,
        executionTimeMs: Date.now() - startTime,
        isAnomalous: classification.isAnomalous,
      }, '[E2B] Sandbox classification completed');

      return {
        success: true,
        data: classification,
        sandboxId,
        executionTimeMs: Date.now() - startTime,
        error: null,
      };
    } finally {
      try {
        await sandbox.kill();
        logger.debug({ sandboxId }, '[E2B] Sandbox destroyed');
      } catch (killErr) {
        logger.warn({ err: killErr, sandboxId }, '[E2B] Failed to destroy sandbox');
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err }, '[E2B] Sandbox creation failed');
    return {
      success: false,
      data: null,
      sandboxId: null,
      executionTimeMs: Date.now() - startTime,
      error: message,
    };
  }
}
