const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: requireEnv('JWT_SECRET'),
  mongodbUri: requireEnv('MONGODB_URI'),
  redis: {
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  geminiApiKey: requireEnv('GEMINI_API_KEY'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Verify API key format
if (config.geminiApiKey && !config.geminiApiKey.startsWith('AIza')) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY does not start with "AIza" - this may be invalid');
  console.warn('⚠️  Get a valid key from: https://aistudio.google.com/app/apikey');
}

