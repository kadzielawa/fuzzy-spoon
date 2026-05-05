import * as yaml from 'js-yaml';
import { patterns, PatternKey, EnvironmentKey } from '../patterns';

export interface RequestInput {
  pattern: PatternKey;
  service_name: string;
  environment: EnvironmentKey;
  region: string;
  options?: {
    db?: boolean;
    pubsub?: boolean;
  };
}

interface ServiceConfig {
  service: string;
  environment: string;
  region: string;
  pattern: string;
  modules: string[];
  generated_at: string;
}

export function generateConfig(input: RequestInput): string {
  const patternDef = patterns[input.pattern];
  const modules = [...patternDef.modules];

  if (input.options?.db && patternDef.optionalModules.db) {
    modules.push(patternDef.optionalModules.db);
  }
  if (input.options?.pubsub && patternDef.optionalModules.pubsub) {
    modules.push(patternDef.optionalModules.pubsub);
  }

  const config: ServiceConfig = {
    service: input.service_name,
    environment: input.environment,
    region: input.region,
    pattern: input.pattern,
    modules,
    generated_at: new Date().toISOString(),
  };

  return yaml.dump(config, { lineWidth: -1 });
}
