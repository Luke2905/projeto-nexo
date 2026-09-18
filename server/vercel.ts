import "./_core/env";
import express, { type ErrorRequestHandler } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

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
    onError({ error, path }) {
      console.error(`[tRPC] ${path ?? "unknown"}:`, error);
    },
  })
);

// Fallback for any other API route
app.use((req, res) => {
  res.status(404).json({ error: "API Route Not Found" });
});

const handleError: ErrorRequestHandler = (error, _req, res, next) => {
  console.error("API request failed:", error);
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = Number(error.status ?? error.statusCode);
  const isClientError = status >= 400 && status < 500;
  res.status(isClientError ? status : 500).json({
    error: isClientError ? "Invalid request" : "Internal Server Error",
  });
};
app.use(handleError);

export default app;
