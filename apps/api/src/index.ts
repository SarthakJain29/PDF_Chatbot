import express from "express";
// Use relative import for now to ensure it works
import { APP_NAME } from "../../../packages/shared/.dist/constants/index.js";
import type {
  HealthCheckResponse,
  ReadyCheckResponse,
} from "../../../packages/shared/.dist/types/index.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SERVICE_NAME = `${APP_NAME} API`;

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get("/health", (req, res) => {
  console.log(`[HEALTH] Request received from ${req.ip}`);
  const payload: HealthCheckResponse = {
    status: "ok",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };
  console.log(`[HEALTH] Response:`, JSON.stringify(payload, null, 2));
  res.json(payload);
});

app.get("/ready", (req, res) => {
  console.log(`[READY] Request received from ${req.ip}`);
  const payload: ReadyCheckResponse = {
    status: "ready",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  };
  console.log(`[READY] Response:`, JSON.stringify(payload, null, 2));
  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`🚀 ${SERVICE_NAME} running on http://localhost:${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`📡 Ready: http://localhost:${PORT}/ready`);
  console.log(`📦 APP_NAME constant: "${APP_NAME}"`);
});
