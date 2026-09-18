import "../server/_core/env";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Fallback for any other API route
app.use((req, res) => {
  res.status(404).json({ error: "API Route Not Found" });
});

export default function (req: any, res: any) {
  try {
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel API Wrapper Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error?.message });
  }
}
