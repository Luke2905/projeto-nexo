import { config } from "dotenv";
import path from "node:path";
import { z } from "zod";

// Load .env from project root — override:true wins over tsx's built-in empty injection
config({ path: path.resolve(process.cwd(), ".env"), override: true });
// Fallback: also try one level up in case the entry point is run from server/
config({ path: path.resolve(process.cwd(), "..", ".env"), override: false });

const envSchema = z.object({
  VITE_APP_ID: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres."),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório. Ex: mysql://user:password@localhost:3306/nexo"),
  OAUTH_SERVER_URL: z.string().optional(),
  OWNER_OPEN_ID: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  PORT: z.string().transform(Number).default("3000"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  // Removido process.exit(1) para não derrubar a Serverless Function inteira no Vercel.
}

const envData = parsedEnv.success ? parsedEnv.data : (process.env as any);

export const ENV = {
  appId: envData.VITE_APP_ID ?? "",
  cookieSecret: envData.JWT_SECRET || "",
  databaseUrl: envData.DATABASE_URL || "",
  oAuthServerUrl: envData.OAUTH_SERVER_URL ?? "",
  ownerOpenId: envData.OWNER_OPEN_ID ?? "",
  isProduction: envData.NODE_ENV === "production",
  forgeApiUrl: envData.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: envData.BUILT_IN_FORGE_API_KEY ?? "",
  port: envData.PORT ? Number(envData.PORT) : 3000,
};
