export type HealthCheckResponse = {
  status: "ok" | "degraded";
  service: string;
  timestamp: string;
  version: string;
};

export type ReadyCheckResponse = {
  status: "ready" | "not_ready";
  service: string;
  timestamp: string;
};
