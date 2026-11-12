const dotenv = require("dotenv");
dotenv.config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const compression = require("compression");
const errorHandler = require("./middleware/errorHandler");
mongoose.set("autoIndex", false);

const requiredEnvironment = [
  "MONGO_URI",
  "JWT_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "GEMINI_API_KEY",
  "EMAIL_USER",
  "EMAIL_PASS",
  ...(process.env.NODE_ENV === "production"
    ? ["RAZORPAY_WEBHOOK_SECRET", "FRONTEND_URL"]
    : []),
];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
if (missingEnvironment.length) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}
if (
  process.env.NODE_ENV === "production" &&
  process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_")
) {
  throw new Error("Production deployments must use a live Razorpay key");
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,https://my-ecom-s.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.disable("x-powered-by");
const proxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS, 10);
app.set("trust proxy", Number.isInteger(proxyHops) && proxyHops >= 0 ? proxyHops : 0);
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});
app.use(helmet());
app.use(compression());
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json", limit: "32kb" }),
);
app.use(express.json({ limit: "32kb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: false,
  }),
);

app.get("/health/live", (req, res) => res.status(200).json({ status: "live" }));
app.get("/health/ready", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not-ready" });
});

app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/address", require("./routes/addressRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});
app.use(errorHandler);

const start = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: false,
  });
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== "isdbgrid") {
    const message = "MongoDB replica set or sharded cluster is required for checkout transactions";
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`${message}; continuing outside production`);
  }
  const migration = await mongoose.connection.db
    .collection("schema_migrations")
    .findOne({ _id: "production-v1" });
  if (!migration) {
    throw new Error("Database migration production-v1 is required before startup");
  }

  const port = Number.parseInt(process.env.PORT, 10) || 5000;
  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 35000;
  server.keepAliveTimeout = 5000;

  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`Received ${signal}; shutting down`);
    server.close(async (error) => {
      if (error) {
        console.error("HTTP server shutdown failed", { error: error.name });
        process.exitCode = 1;
      }
      await mongoose.disconnect();
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  return server;
};

if (require.main === module) {
  start().catch((error) => {
    console.error("Server startup failed", { error: error.name });
    process.exitCode = 1;
  });
}

module.exports = { app, start };
