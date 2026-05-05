import { Request, Response } from 'express';
import { generateConfig, RequestInput } from '../services/configGenerator';
import { createServicePR } from '../services/githubService';
import {
  ALLOWED_PATTERNS,
  ALLOWED_ENVIRONMENTS,
  ALLOWED_REGIONS,
  PatternKey,
  EnvironmentKey,
} from '../patterns';

const SERVICE_NAME_REGEX = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;

export async function handleRequest(
  req: Request,
  res: Response,
): Promise<void> {
  // Treat body as unknown map – we validate each field explicitly
  const body = req.body as Record<string, unknown>;

  const { pattern, service_name, environment, region, options } = body;

  // Validate pattern
  if (
    typeof pattern !== 'string' ||
    !(ALLOWED_PATTERNS as readonly string[]).includes(pattern)
  ) {
    res.status(400).json({
      error: `Invalid or missing 'pattern'. Allowed values: ${ALLOWED_PATTERNS.join(', ')}`,
    });
    return;
  }

  // Validate service_name
  if (
    typeof service_name !== 'string' ||
    !SERVICE_NAME_REGEX.test(service_name)
  ) {
    res.status(400).json({
      error:
        "Invalid or missing 'service_name'. Must be 3–64 lowercase letters, digits, or hyphens, starting and ending with a letter or digit.",
    });
    return;
  }

  // Validate environment
  if (
    typeof environment !== 'string' ||
    !(ALLOWED_ENVIRONMENTS as readonly string[]).includes(environment)
  ) {
    res.status(400).json({
      error: `Invalid or missing 'environment'. Allowed values: ${ALLOWED_ENVIRONMENTS.join(', ')}`,
    });
    return;
  }

  // Validate region
  if (
    typeof region !== 'string' ||
    !(ALLOWED_REGIONS as readonly string[]).includes(region)
  ) {
    res.status(400).json({
      error: `Invalid or missing 'region'. Allowed values: ${ALLOWED_REGIONS.join(', ')}`,
    });
    return;
  }

  // Validate options (optional object)
  const opts =
    options !== null && typeof options === 'object' && !Array.isArray(options)
      ? (options as Record<string, unknown>)
      : {};

  const input: RequestInput = {
    pattern: pattern as PatternKey,
    service_name,
    environment: environment as EnvironmentKey,
    region,
    options: {
      db: opts.db === true,
      pubsub: opts.pubsub === true,
    },
  };

  try {
    const configYaml = generateConfig(input);
    const prUrl = await createServicePR(input, configYaml);
    res.json({ status: 'PR_CREATED', pr_url: prUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[handleRequest] Failed to create PR:', message);
    res.status(500).json({ error: `Failed to create PR: ${message}` });
  }
}
