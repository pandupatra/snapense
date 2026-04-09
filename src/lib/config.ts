interface EnvConfig {
  betterAuthUrl: string;
  betterAuthSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  geminiApiKey: string;
  geminiModel: string;
  mayarApiKey?: string;
  mayarSecretKey?: string;
}

const REQUIRED_ENV_VARS: ReadonlyArray<keyof EnvConfig> = [
  "betterAuthUrl",
  "betterAuthSecret",
  "googleClientId",
  "googleClientSecret",
  "geminiApiKey",
  "geminiModel",
] as const;

// Mayar keys are optional - app works in free mode without them
const OPTIONAL_ENV_VARS: ReadonlyArray<keyof EnvConfig> = [
  "mayarApiKey",
  "mayarSecretKey",
] as const;

function validateEnv(): EnvConfig {
  const config: Partial<EnvConfig> = {};
  const missing: string[] = [];

  // Check required vars
  for (const key of REQUIRED_ENV_VARS) {
    const envVar = getEnvVarName(key);
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
    } else {
      (config[key] as string) = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\n` +
      `Please set these in your .env.local file.`
    );
  }

  // Add optional vars if present
  for (const key of OPTIONAL_ENV_VARS) {
    const envVar = getEnvVarName(key);
    const value = process.env[envVar];
    if (value) {
      (config[key] as string) = value;
    }
  }

  return config as EnvConfig;
}

function getEnvVarName(key: keyof EnvConfig): string {
  const names: Record<keyof EnvConfig, string> = {
    betterAuthUrl: "BETTER_AUTH_URL",
    betterAuthSecret: "BETTER_AUTH_SECRET",
    googleClientId: "GOOGLE_CLIENT_ID",
    googleClientSecret: "GOOGLE_CLIENT_SECRET",
    geminiApiKey: "GEMINI_API_KEY",
    geminiModel: "GEMINI_MODEL",
    mayarApiKey: "MAYAR_API_KEY",
    mayarSecretKey: "MAYAR_SECRET_KEY",
  };
  return names[key];
}

// Singleton - validates once at startup
let _config: EnvConfig | null = null;
export function getConfig(): EnvConfig {
  if (!_config) {
    _config = validateEnv();
  }
  return _config;
}

export type { EnvConfig };
