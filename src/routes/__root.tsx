import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";
import { TelegramAutoAuth } from "@/components/TelegramAutoAuth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try refreshing or head back home.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0d0a1f" },
      { title: "NurSahifa — Inglizcha so'zlarni AI bilan o'rganing" },
      { name: "description", content: "Kitob sahifasini rasmga oling — NurSahifa AI yordamida so'zlarni ajratib flashcardga aylantiradi va Swipe orqali yodlatadi." },
      { property: "og:title", content: "NurSahifa — Inglizcha so'zlarni AI bilan o'rganing" },
      { property: "og:description", content: "Kitob sahifasini rasmga oling — NurSahifa AI yordamida so'zlarni ajratib flashcardga aylantiradi va Swipe orqali yodlatadi." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "NurSahifa — Inglizcha so'zlarni AI bilan o'rganing" },
      { name: "twitter:description", content: "Kitob sahifasini rasmga oling — NurSahifa AI yordamida so'zlarni ajratib flashcardga aylantiradi va Swipe orqali yodlatadi." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9686db19-ffab-485f-a564-fa0c5db9cb8f" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9686db19-ffab-485f-a564-fa0c5db9cb8f" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let toastId: string | number | undefined;
    const onOffline = async () => {
      const { toast } = await import("sonner");
      toastId = toast.error("Internet aloqasi yo'q. Ulanishni tekshiring.", { duration: Infinity });
    };
    const onOnline = async () => {
      const { toast } = await import("sonner");
      if (toastId !== undefined) toast.dismiss(toastId);
      toast.success("Internet tiklandi");
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TelegramAutoAuth />
      <Outlet />
      <Toaster position="top-center" richColors theme="dark" />
    </QueryClientProvider>
  );
}
