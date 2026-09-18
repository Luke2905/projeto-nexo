import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink, TRPCClientError } from "@trpc/client";
import { isPublicChallengePath } from "@shared/publicChallenges";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";
import "./cartoon.css";
import "./appearance.css";
import { applyVisualTheme, readVisualTheme } from "./lib/visualTheme";

// Restore the selected appearance before React's first render.
applyVisualTheme(readVisualTheme());

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: operation => isPublicChallengePath(operation.path),
      true: httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch(input, init) {
          // Deployment protection needs its cookie even for public API routes.
          // The server skips account authentication for these batches, so sending
          // same-origin cookies still does not wake TiDB.
          return globalThis.fetch(input, { ...init, credentials: "same-origin" });
        },
      }),
      false: httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        headers() {
          // Preview auto-login fallback: when the browser blocks iframe cookies
          // (Safari ITP / private browsing / WebView), the runtime mirrors the
          // session into sessionStorage so we can forward it as a Bearer token.
          // The regular OAuth cookie flow keeps working and takes priority server-side.
          try {
            const raw = sessionStorage.getItem("manus-cookie");
            if (raw) {
              const prefix = `${COOKIE_NAME}=`;
              const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
              const token = pair?.trim().slice(prefix.length);
              if (token) {
                return { Authorization: `Bearer ${token}` };
              }
            }
          } catch {
            // sessionStorage unavailable
          }
          return {};
        },
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
