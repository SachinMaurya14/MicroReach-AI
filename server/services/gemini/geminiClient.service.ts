import crypto from 'node:crypto';
import { GoogleGenAI, type Schema } from '@google/genai';
import { getServerConfig } from '../../config/env.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';

const PREFERRED_FAST_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-4-hydrogen',
] as const;

const GEMINI_TIMEOUT_MS = 16_000;
const MODEL_LIST_CACHE_TTL_MS = 15 * 60 * 1000;

interface CachedModelsEntry {
  keyHash: string;
  models: string[];
  expiresAt: number;
}

let cachedModels: CachedModelsEntry | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDeveloperAiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractStatusCode(err: unknown): number | null {
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    if (typeof rec.status === 'number') return rec.status;
    if (typeof rec.statusCode === 'number') return rec.statusCode;
    if (typeof rec.code === 'number') return rec.code;
  }
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const codeMatch = msg.match(/"code"\s*:\s*(\d{3})|\b(400|401|403|404|429|500|502|503|504)\b/);
  if (codeMatch) {
    return Number(codeMatch[1] || codeMatch[2]);
  }
  return null;
}

function isAuthError(err: unknown): boolean {
  const status = extractStatusCode(err);
  if (status === 401) return true;
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('unauthenticated') ||
    msg.includes('access_token_type_unsupported')
  );
}

function isPermissionDeniedError(err: unknown): boolean {
  const status = extractStatusCode(err);
  if (status === 403) return true;
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return msg.includes('permission_denied');
}

function isModelNotFoundError(err: unknown): boolean {
  const status = extractStatusCode(err);
  if (status === 404) return true;
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('not_found') ||
    msg.includes('is not found') ||
    msg.includes('not supported for generatecontent')
  );
}

function isRetryableTransientError(err: unknown): boolean {
  const status = extractStatusCode(err);
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('resource_exhausted') ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    msg.includes('econnreset')
  );
}

function summarizeProviderError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'unknown');
  return raw.replace(/AIza[0-9A-Za-z_-]+|AQ\.[0-9A-Za-z_-]+/g, '[redacted]').slice(0, 160);
}

export function mapGeminiProviderError(err: unknown, diagnostic?: string): AppHttpError {
  if (err instanceof AppHttpError) return err;
  const msg = err instanceof Error ? err.message : 'Gemini request failed.';
  const lower = msg.toLowerCase();
  const status = extractStatusCode(err);

  if (status === 429 || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return new AppHttpError(
      429,
      'gemini_quota_exceeded',
      'Gemini API rate or quota limit reached. Please retry shortly.'
    );
  }
  if (isAuthError(err)) {
    return new AppHttpError(
      503,
      'gemini_auth_failed',
      `Gemini API key was rejected (401 Unauthenticated). Verify GEMINI_API_KEY configuration.${
        diagnostic ? ` (${diagnostic})` : ''
      }`
    );
  }
  if (isPermissionDeniedError(err)) {
    return new AppHttpError(
      503,
      'gemini_permission_denied',
      `Gemini API permission denied (403). Verify API access and key permissions.${
        diagnostic ? ` (${diagnostic})` : ''
      }`
    );
  }
  if (isModelNotFoundError(err)) {
    return new AppHttpError(
      502,
      'gemini_model_not_found',
      `Requested Gemini model was not found or does not support generateContent.${
        diagnostic ? ` (${diagnostic})` : ''
      }`
    );
  }
  if (status === 504 || lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return new AppHttpError(
      504,
      'gemini_timeout',
      'Gemini API request timed out. Please retry.'
    );
  }
  if (status !== null && status >= 500) {
    return new AppHttpError(
      502,
      'gemini_upstream_error',
      `Gemini provider returned transient upstream error (${status}): ${summarizeProviderError(err)}`
    );
  }
  return new AppHttpError(
    502,
    'gemini_generation_failed',
    `Gemini generation error: ${summarizeProviderError(err)}`
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini request timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function listAvailableGeminiModels(
  apiKey: string,
  forceRefresh = false
): Promise<string[]> {
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  if (
    !forceRefresh &&
    cachedModels &&
    cachedModels.keyHash === keyHash &&
    Date.now() < cachedModels.expiresAt &&
    cachedModels.models.length > 0
  ) {
    return cachedModels.models;
  }

  const ai = createDeveloperAiClient(apiKey);
  const pager = await withTimeout(ai.models.list(), 10_000);
  const supported: string[] = [];

  for await (const m of pager) {
    const actions = m.supportedActions ?? [];
    if (!actions.includes('generateContent')) continue;
    const shortName = String(m.name || '').replace(/^models\//, '').trim();
    if (shortName) supported.push(shortName);
  }

  if (supported.length > 0) {
    cachedModels = {
      keyHash,
      models: supported,
      expiresAt: Date.now() + MODEL_LIST_CACHE_TTL_MS,
    };
  }
  return supported;
}

function selectOrderedModels(configuredModel: string, availableModels: string[]): string[] {
  const cleaned = configuredModel.trim();
  const availableSet = new Set(availableModels);

  if (availableModels.length > 0) {
    const preferredAvailable = PREFERRED_FAST_MODELS.filter((m) => availableSet.has(m));
    const ordered: string[] = [];

    // Avoid stalling on gemini-3.8-flash if faster verified flash models exist
    if (cleaned && availableSet.has(cleaned) && cleaned !== 'gemini-3.8-flash') {
      ordered.push(cleaned);
    }
    for (const m of preferredAvailable) {
      if (!ordered.includes(m)) ordered.push(m);
    }
    if (cleaned && availableSet.has(cleaned) && !ordered.includes(cleaned)) {
      ordered.push(cleaned);
    }
    for (const m of availableModels) {
      if (m.includes('flash') && !m.includes('tts') && !m.includes('image') && !ordered.includes(m)) {
        ordered.push(m);
      }
    }
    return ordered.slice(0, 4);
  }

  return Array.from(new Set([cleaned, ...PREFERRED_FAST_MODELS].filter(Boolean))).slice(0, 4);
}

export interface GeminiExecutionResult<T> {
  data: T;
  modelUsed: string;
  endpointMode: 'gemini_developer_api';
}

export async function generateGeminiStructured<T>(params: {
  systemInstruction: string;
  contents: string;
  responseSchema?: Schema;
  seed?: number;
}): Promise<GeminiExecutionResult<T>> {
  const cfg = getServerConfig();
  if (!cfg.geminiApiKey) {
    throw new AppHttpError(
      503,
      'gemini_not_configured',
      'Gemini AI personalization requires GEMINI_API_KEY configuration.'
    );
  }

  const ai = createDeveloperAiClient(cfg.geminiApiKey);

  let availableModels: string[] = [];
  try {
    availableModels = await listAvailableGeminiModels(cfg.geminiApiKey);
  } catch (err) {
    if (isAuthError(err) || isPermissionDeniedError(err)) {
      throw mapGeminiProviderError(err, summarizeProviderError(err));
    }
  }

  const models = selectOrderedModels(cfg.geminiModel || 'gemini-3.6-flash', availableModels);
  if (models.length === 0) {
    throw new AppHttpError(
      502,
      'gemini_model_not_found',
      'No generateContent-capable Gemini models were returned by the provider.'
    );
  }

  let lastError: unknown = null;
  const attemptSummaries: string[] = [];

  for (const modelName of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: params.contents,
            config: {
              systemInstruction: params.systemInstruction,
              ...(params.responseSchema
                ? {
                    responseMimeType: 'application/json',
                    responseSchema: params.responseSchema,
                  }
                : {}),
              ...(typeof params.seed === 'number' ? { seed: params.seed } : {}),
            },
          }),
          GEMINI_TIMEOUT_MS
        );

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new AppHttpError(502, 'gemini_empty_response', 'Gemini returned an empty response.');
        }

        if (params.responseSchema) {
          const cleanedJson = rawText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          try {
            const parsed = JSON.parse(cleanedJson) as T;
            return {
              data: parsed,
              modelUsed: modelName,
              endpointMode: 'gemini_developer_api',
            };
          } catch {
            if (attempt === 0) {
              continue;
            }
            throw new AppHttpError(
              502,
              'gemini_invalid_json',
              'Gemini returned malformed structured JSON output.'
            );
          }
        }

        return {
          data: rawText as unknown as T,
          modelUsed: modelName,
          endpointMode: 'gemini_developer_api',
        };
      } catch (err) {
        lastError = err;
        attemptSummaries.push(`${modelName}: ${summarizeProviderError(err)}`);

        // Never retry invalid credentials or permissions
        if (isAuthError(err) || isPermissionDeniedError(err)) {
          throw mapGeminiProviderError(err, attemptSummaries[attemptSummaries.length - 1]);
        }

        // Model 404 -> skip to next verified model immediately
        if (isModelNotFoundError(err)) {
          break;
        }

        // Malformed JSON or empty output -> don't downgrade silently, throw if retry exhausted
        if (
          err instanceof AppHttpError &&
          (err.code === 'gemini_invalid_json' || err.code === 'gemini_empty_response')
        ) {
          throw err;
        }

        if (attempt === 0 && isRetryableTransientError(err)) {
          await sleep(450 + Math.floor(Math.random() * 250));
          continue;
        }

        // If timeout or 5xx exhausted on one model and another model candidate exists, try next model
        if (isRetryableTransientError(err)) {
          break;
        }

        throw mapGeminiProviderError(
          err,
          attemptSummaries[attemptSummaries.length - 1]
        );
      }
    }
  }

  throw mapGeminiProviderError(
    lastError,
    [attemptSummaries[0], attemptSummaries[attemptSummaries.length - 1]]
      .filter(Boolean)
      .join(' | ')
  );
}

export async function verifyGeminiConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  endpointMode: 'gemini_developer_api';
  configuredModel: string;
  activeModel: string | null;
  availableModelsCount: number;
  sampleAvailableModels: string[];
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}> {
  const cfg = getServerConfig();
  if (!cfg.geminiApiKey) {
    return {
      configured: false,
      connected: false,
      endpointMode: 'gemini_developer_api',
      configuredModel: cfg.geminiModel,
      activeModel: null,
      availableModelsCount: 0,
      sampleAvailableModels: [],
      latencyMs: null,
      errorCode: 'gemini_not_configured',
      errorMessage: 'GEMINI_API_KEY is not configured.',
    };
  }

  const startedAt = Date.now();
  try {
    const models = await listAvailableGeminiModels(cfg.geminiApiKey, true);
    const ordered = selectOrderedModels(cfg.geminiModel, models);
    const result = await generateGeminiStructured<string>({
      systemInstruction: 'Reply with strictly the word READY and nothing else.',
      contents: 'Health check ping.',
    });
    return {
      configured: true,
      connected: Boolean(result.data),
      endpointMode: 'gemini_developer_api',
      configuredModel: cfg.geminiModel,
      activeModel: result.modelUsed,
      availableModelsCount: models.length,
      sampleAvailableModels: ordered,
      latencyMs: Date.now() - startedAt,
      errorCode: null,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapGeminiProviderError(err);
    return {
      configured: true,
      connected: false,
      endpointMode: 'gemini_developer_api',
      configuredModel: cfg.geminiModel,
      activeModel: null,
      availableModelsCount: 0,
      sampleAvailableModels: [],
      latencyMs: Date.now() - startedAt,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    };
  }
}
