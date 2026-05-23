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
  groqApiKey: requireEnv('GROQ_API_KEY'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Verify Groq API key is present
if (!config.groqApiKey) {
  console.warn('⚠️  WARNING: GROQ_API_KEY is not set');
  console.warn('⚠️  Get a valid key from: https://console.groq.com/keys');
}

