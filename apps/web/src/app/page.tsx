import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@my-scope/shared/constants";
import type {
  HealthCheckResponse,
  ReadyCheckResponse,
} from "@my-scope/shared/types";

const healthSample: HealthCheckResponse = {
  status: "ok",
  service: `${APP_NAME} API`,
  timestamp: new Date().toISOString(),
  version: "1.0.0",
};

const readySample: ReadyCheckResponse = {
  status: "ready",
  service: `${APP_NAME} API`,
  timestamp: new Date().toISOString(),
};

const endpoints = [
  {
    title: "Health Check",
    path: "/health",
    status: healthSample.status,
    description: "Basic uptime and version sanity check.",
    payload: healthSample,
  },
  {
    title: "Ready Check",
    path: "/ready",
    status: readySample.status,
    description: "Dependency readiness before traffic hits.",
    payload: readySample,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--accent))_0%,_transparent_45%)]">
      <div className="container relative py-16">
        <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,184,107,0.6)_0%,_rgba(255,184,107,0)_70%)] blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute left-0 top-40 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(99,179,237,0.5)_0%,_rgba(99,179,237,0)_70%)] blur-3xl animate-float-slow" />

        <section className="relative z-10 grid gap-10">
          <div className="max-w-2xl space-y-4 animate-fade-up">
            <Badge variant="secondary" className="w-fit">
              Shared constants + types
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-shadow-soft md:text-5xl">
              {APP_NAME} Health Console
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Constant from shared package: <span className="font-bold text-foreground">"{APP_NAME}"</span>
            </p>
            <p className="text-lg text-muted-foreground">
              Frontend status dashboard built with shadcn UI components. Express
              serves the backend routes, and shared packages keep the contract
              consistent across the stack.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button>Run checks</Button>
              <Button asChild variant="outline">
                <a href="http://localhost:3000/health">Open /health</a>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
            {endpoints.map((endpoint) => {
              const isHealthy =
                endpoint.status === "ok" || endpoint.status === "ready";

              return (
                <Card
                  key={endpoint.path}
                  className="backdrop-blur-sm bg-white/80 shadow-soft"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{endpoint.title}</CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          isHealthy
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }
                      >
                        {endpoint.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardDescription>{endpoint.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Endpoint</span>
                      <span className="font-medium text-foreground">
                        {endpoint.path}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Service</span>
                      <span className="font-medium text-foreground">
                        {endpoint.payload.service}
                      </span>
                    </div>
                    {"version" in endpoint.payload && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Version</span>
                        <span className="font-medium text-foreground">
                          {endpoint.payload.version}
                        </span>
                      </div>
                    )}
                    <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      {endpoint.payload.timestamp}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
