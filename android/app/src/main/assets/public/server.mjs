// server.ts
import express from "express";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { BrevoClient } from "@getbrevo/brevo";
import dotenv from "dotenv";
import AdmZip from "adm-zip";

// src/utils/triviaEligibility.ts
function isAdmin(user) {
  if (!user) return false;
  const emailLower = (user.email || "").toLowerCase();
  if (emailLower === "winbigonly@gmail.com" || emailLower === "samuelchukwuemeke05@gmail.com") return true;
  return user.is_admin === true || user.account_tier === "admin" || user.app_role === "admin";
}
function canPlayTrivia(user, session, options) {
  if (!user) {
    return { eligible: false, message: "Authentication required to participate in trivia sessions.", allowed: false, reason: "Authentication required to participate in trivia sessions." };
  }
  return { eligible: true, message: "", allowed: true, reason: "" };
}

// src/server/publishingRoutes.ts
function setupPublishingRoutes(app, getSupabase2, getSupabaseAdmin2, authenticateUser, authenticateAdmin) {
  app.get("/api/publishing/status", (req, res) => {
    res.json({ status: "active", publishing_enabled: true });
  });
}

// server.ts
dotenv.config();
var brevoApiKey = cleanSecret(process.env.BREVO_API_KEY);
var brevoSender = cleanSecret(process.env.BREVO_SENDER_EMAIL) || "no-reply@calmreader.com";
var brevoApi = null;
function getBrevo() {
  if (!brevoApi) {
    const key = cleanSecret(process.env.BREVO_API_KEY);
    if (key && key.length > 5) {
      brevoApi = new BrevoClient({ apiKey: key });
    }
  }
  return brevoApi;
}
var supabase;
function cleanSecret(val) {
  if (!val || typeof val !== "string") return "";
  let cleaned = val.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"') || cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }
  if (cleaned.includes("=")) {
    const parts = cleaned.split("=");
    if (parts.length > 1 && /^[A-Z0-9_]+$/.test(parts[0].trim())) {
      cleaned = parts[1].trim();
    }
  }
  return cleaned;
}
function extractProjectRef(url) {
  if (!url) return null;
  const urlMatch = url.match(/https?:\/\/([^.]+)\.supabase\.(co|net|io)/);
  return urlMatch ? urlMatch[1] : null;
}
function extractProjectRefFromKey(key) {
  if (!key || !key.startsWith("eyJ")) return null;
  try {
    const parts = key.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    if (payload.ref) return payload.ref;
    if (payload.iss && payload.iss !== "supabase") {
      const issParts = payload.iss.split(".");
      const ref = issParts.find((p) => p.length === 20);
      if (ref) return ref;
    }
    if (payload.sub && payload.sub.length === 20) return payload.sub;
    return payload.ref || null;
  } catch (e) {
    return null;
  }
}
function validateSupabaseConfig(url, key) {
  if (!url || !key) return { ok: false, reason: "Missing URL or Key" };
  const PLACEHOLDER_URL = "https://fictional-placeholder-to-be-replaced.supabase.co";
  if (url === PLACEHOLDER_URL || url.includes("fictional-placeholder-to-be-replaced") || key.includes("placeholder-key-to-be-replaced")) {
    return {
      ok: false,
      isPlaceholder: true,
      reason: "Supabase database project is not configured yet. Please open the /setup wizard or configure your keys."
    };
  }
  if (url.startsWith("pk_") || url.startsWith("sk_") || url.startsWith("sb_")) {
    return {
      ok: false,
      reason: `CRITICAL: You put a Paystack key [${url.substring(0, 10)}...] into the Supabase URL field. Please use the "Project URL" from Supabase instead.`
    };
  }
  if (key.startsWith("pk_") || key.startsWith("sk_") || key.startsWith("sb_")) {
    return {
      ok: false,
      reason: `CRITICAL: You put a Paystack key [${key.substring(0, 10)}...] into the Supabase Key field. Supabase keys start with "eyJ".`
    };
  }
  if (!url.startsWith("http"))
    return {
      ok: false,
      reason: `URL does not start with http: [${url.substring(0, 10)}...]`
    };
  if (!key.startsWith("eyJ"))
    return { ok: false, reason: "API key must be a JWT (starts with eyJ)" };
  const urlRef = extractProjectRef(url);
  const keyRef = extractProjectRefFromKey(key);
  if (urlRef && keyRef && urlRef !== keyRef) {
    return {
      ok: false,
      reason: `Mismatched Project: URL belongs to [${urlRef}] but API key belongs to [${keyRef}].`
    };
  }
  return { ok: true };
}
function getSupabase() {
  const PLACEHOLDER_URL = "https://wgdcroglmhzmrvqrixku.supabase.co";
  const PLACEHOLDER_KEY_PREFIX = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGNyb2dsbWh6bXJ2cXJpeGt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTMxMjIsImV4cCI6MjA5MTc2OTEyMn0.zmWG2K3OpU25wSDBOSmKnpFHUABNtRklAzCg-f5VYic";
  const foundIn = [];
  if (process.env.SUPABASE_URL) foundIn.push("SUPABASE_URL");
  if (process.env.VITE_SUPABASE_URL) foundIn.push("VITE_SUPABASE_URL");
  let envUrl = cleanSecret(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  );
  const keyFoundIn = [];
  if (process.env.SUPABASE_SERVICE_ROLE_KEY)
    keyFoundIn.push("SUPABASE_SERVICE_ROLE_KEY");
  if (process.env.SUPABASE_SERVICE_KEY) keyFoundIn.push("SUPABASE_SERVICE_KEY");
  if (process.env.SUPABASE_ANON_KEY) keyFoundIn.push("SUPABASE_ANON_KEY");
  if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
    keyFoundIn.push("VITE_SUPABASE_SERVICE_ROLE_KEY");
  if (process.env.VITE_SUPABASE_ANON_KEY)
    keyFoundIn.push("VITE_SUPABASE_ANON_KEY");
  let envKey = cleanSecret(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );
  console.log(`[Supabase Config Audit]`);
  console.log(
    `-> SUPABASE_URL: ${process.env.SUPABASE_URL ? `SET (${extractProjectRef(cleanSecret(process.env.SUPABASE_URL))})` : "UNSET"}`
  );
  console.log(
    `-> VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? `SET (${extractProjectRef(cleanSecret(process.env.VITE_SUPABASE_URL))})` : "UNSET"}`
  );
  const isServiceKey = envKey && (envKey === cleanSecret(process.env.SUPABASE_SERVICE_ROLE_KEY) || envKey === cleanSecret(process.env.SUPABASE_SERVICE_KEY) || envKey === cleanSecret(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY));
  const keyRef = extractProjectRefFromKey(envKey);
  console.log(
    `-> ACTIVE_KEY_TYPE: ${isServiceKey ? "SERVICE_ROLE" : "ANON/PUBLIC"}`
  );
  console.log(`-> ACTIVE_KEY_REF: ${keyRef || "UNKNOWN"}`);
  console.log(
    `[Supabase Config Discovery] URL from: [${foundIn.join(", ") || "NONE"}], Key type: [${isServiceKey ? "SERVICE_ROLE" : "ANON/PUBLIC"}]`
  );
  let url = envUrl;
  if (!url) {
    if (envKey && !envKey.startsWith(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGNyb2dsbWh6bXJ2cXJpeGt1"
    )) {
      console.error(
        "[Supabase Config] API Key is set but SUPABASE_URL is missing! Blocking placeholder fallback to avoid mismatch."
      );
      url = "MISSING_URL";
    } else {
      url = PLACEHOLDER_URL;
    }
  }
  let key = envKey;
  if (!key) key = PLACEHOLDER_KEY_PREFIX;
  const configStatus = validateSupabaseConfig(url, key);
  if (!configStatus.ok) {
    const missing = [];
    if (!envUrl) {
      missing.push("SUPABASE_URL");
      configStatus.reason = "SUPABASE_URL is missing. Please provide it in the AI Studio Settings.";
    }
    if (!envKey) {
      missing.push("SUPABASE_ANON_KEY (or service role)");
      configStatus.reason = "Supabase API Key is missing. Please provide it in the AI Studio Settings.";
    }
    if (!envUrl && envKey && configStatus.reason?.includes("Mismatched")) {
      const projectRef = configStatus.reason.match(/belongs to \[(.*?)\]/)?.[1] || "unknown";
      const keyRef2 = configStatus.reason.match(/API key belongs to \[(.*?)\]/)?.[1] || "unknown";
      configStatus.reason = `CRITICAL CONFIG MISMATCH: The URL you provided is for project [${projectRef}] but the API Key is for project [${keyRef2}]. Please go to Secret Box and make sure BOTH URL and Key are from the SAME Supabase project. Also ensure there are NO duplicate VITE_ keys if you already have the standard ones.`;
    }
    if (missing.length > 0 && !configStatus.reason?.includes("missing")) {
      configStatus.reason = `Missing required environment variables: ${missing.join(", ")}`;
    }
    console.warn(`[Supabase Config WARNING] ${configStatus.reason}`);
    return createDummySupabase(configStatus);
  }
  console.log(
    `[Supabase Config OK] Active Project URL: ${url.substring(0, 30)}...`
  );
  if (supabase && !supabase.__isDummy) {
    return supabase;
  }
  try {
    if (url && url.startsWith("http") && key && key.length > 20) {
      console.log(`[Supabase] Initializing with URL: ${url}`);
      const client = createClient(url, key);
      client.__configStatus = configStatus;
      supabase = client;
      return supabase;
    }
  } catch (e) {
    console.error("[Supabase] Failed to initialize client:", e);
  }
  return createDummySupabase(configStatus);
}
function getSupabaseAdmin() {
  const url = cleanSecret(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) || "https://wgdcroglmhzmrvqrixku.supabase.co";
  const serviceKey = cleanSecret(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  );
  console.log(`[getSupabaseAdmin] Supabase URL being used: ${url}`);
  if (serviceKey) {
    console.log(`[getSupabaseAdmin] SUCCESS: SUPABASE_SERVICE_ROLE_KEY is loaded successfully.`);
  } else {
    console.error(`[getSupabaseAdmin] CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing! Bypassing RLS will not be possible.`);
  }
  if (!serviceKey || url === "https://fictional-placeholder-to-be-replaced.supabase.co") {
    console.warn("[getSupabaseAdmin] Falling back to standard key.");
    return getSupabase();
  }
  return createClient(url, serviceKey);
}
function resetGlobalSupabase() {
  supabase = null;
}
function createDummySupabase(configStatus) {
  if (!supabase || supabase.__isDummy) {
    if (!supabase) {
      console.warn(
        "[Supabase] Initialization deferred or failed. Using non-functional dummy client."
      );
    }
    const dummyError = configStatus.ok ? "Database connection deferred. Please check your network and project status." : configStatus.reason || "Database configuration mismatch.";
    const dummyResponse = { data: null, error: { message: dummyError } };
    const chainable = () => {
      const obj = {
        select: () => obj,
        eq: () => obj,
        neq: () => obj,
        gt: () => obj,
        gte: () => obj,
        lt: () => obj,
        lte: () => obj,
        like: () => obj,
        ilike: () => obj,
        is: () => obj,
        in: () => obj,
        contains: () => obj,
        containedBy: () => obj,
        rangeGt: () => obj,
        rangeGte: () => obj,
        rangeLt: () => obj,
        rangeLte: () => obj,
        rangeAdjacent: () => obj,
        maybeSingle: () => Promise.resolve(dummyResponse),
        single: () => Promise.resolve(dummyResponse),
        limit: () => obj,
        order: () => obj,
        insert: () => Promise.resolve(dummyResponse),
        upsert: () => Promise.resolve(dummyResponse),
        update: () => obj,
        delete: () => obj,
        or: () => obj,
        rpc: () => Promise.resolve(dummyResponse),
        then: (cb) => cb({ data: [], error: dummyResponse.error })
      };
      return obj;
    };
    supabase = {
      __isDummy: true,
      __configStatus: configStatus,
      from: () => chainable(),
      rpc: () => Promise.resolve(dummyResponse),
      auth: {
        getUser: (token) => Promise.resolve({ data: { user: null }, error: dummyResponse.error }),
        getSession: () => Promise.resolve({
          data: { session: null },
          error: dummyResponse.error
        }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {
          } } }
        })
      }
    };
  }
  return supabase;
}
function maskError(err, isAdmin2 = false) {
  if (isAdmin2) return err.message || err;
  const technicalKeywords = [
    "relation",
    "column",
    "supabase",
    "database",
    "sql",
    "query",
    "not found",
    "denied",
    "key",
    "auth",
    "missing",
    "connection",
    "postgres",
    "undefined",
    "null",
    "token",
    "mismatched"
  ];
  const errMsg = (err?.message || String(err || "")).toLowerCase();
  if (technicalKeywords.some((key) => errMsg.includes(key))) {
    return "Our services are currently undergoing maintenance. Please try again in a few minutes.";
  }
  return err?.message || "An unexpected error occurred.";
}
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const supabase2 = getSupabase();
  if (supabase2 && !supabase2.__isDummy) {
    console.log("[Server] Running Admin Privilege Cleanup in background...");
    (async () => {
      try {
        const ADMIN_EMAILS = ["samuelchukwuemeke05@gmail.com", "chukwuemekedaniella@gmail.com", "winbigonly@gmail.com"].map((e) => e.toLowerCase());
        const { error: cleanupError } = await supabase2.from("users").update({ is_admin: false, account_tier: "free" }).not("email", "in", `(${ADMIN_EMAILS.join(",")})`).or("is_admin.eq.true,account_tier.eq.admin");
        if (cleanupError) {
          console.warn(
            "[Server] Admin Cleanup (Phase 1) Warning:",
            cleanupError.message
          );
        }
        const { error: promoteError } = await supabase2.from("users").update({ is_admin: true, account_tier: "admin" }).in("email", ADMIN_EMAILS);
        if (promoteError) {
          console.warn(
            "[Server] Admin Cleanup (Phase 2) Warning:",
            promoteError.message
          );
        }
        console.log("[Server] Admin Privilege Cleanup Complete.");
        try {
          await supabase2.from("trivias").update({ requires_premium: false }).eq("type", "reader_reward").eq("requires_premium", true).is("starts_at", null);
          const { data: missingStarts } = await supabase2.from("trivias").select("id, created_at").eq("is_active", true).eq("status", "active").is("starts_at", null);
          if (missingStarts && missingStarts.length > 0) {
            for (const t of missingStarts) {
              await supabase2.from("trivias").update({ starts_at: t.created_at || (/* @__PURE__ */ new Date()).toISOString() }).eq("id", t.id);
            }
          }
        } catch (tErr) {
          console.warn("[Server] Trivia access healing check warning:", tErr?.message);
        }
      } catch (e) {
        console.error("[Server] Admin Cleanup CRITICAL failure:", e);
      }
    })();
  }
  const env = process.env.NODE_ENV || "development";
  console.log(`[Server] Starting in ${env} mode...`);
  const app = express();
  const PORT = 3e3;
  app.use((req, res, next) => {
    if (req.url === "/debug-heartbeat" || !req.url.startsWith("/api")) return next();
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });
  app.get(
    "/debug-heartbeat",
    (req, res) => res.json({
      status: "ok",
      time: (/* @__PURE__ */ new Date()).toISOString(),
      env: process.env.NODE_ENV,
      cwd: process.cwd()
    })
  );
  app.post(
    "/api/paystack-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["x-paystack-signature"];
      const secret = cleanSecret(process.env.PAYSTACK_SECRET_KEY);
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const expectedSignature = secret ? crypto.createHmac("sha512", secret).update(rawBody).digest("hex") : "";
      const receivedSignature = Array.isArray(signature) ? signature[0] : signature;
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const receivedBuffer = Buffer.from(receivedSignature || "", "utf8");
      if (!secret || !receivedSignature || expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
        return res.status(401).json({ ok: false, error: "Invalid signature" });
      }
      let event;
      try {
        event = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid JSON payload" });
      }
      const reference = event?.data?.reference;
      if (typeof reference !== "string" || !reference) {
        return res.status(400).json({ ok: false, error: "Missing payment reference" });
      }
      const adminSupabase = getSupabaseAdmin();
      const { data: processedWebhook, error: processedWebhookError } = await adminSupabase.from("processed_webhook_refs").select("reference").eq("reference", reference).maybeSingle();
      if (processedWebhookError) {
        console.error("[Paystack Webhook] Idempotency check failed:", processedWebhookError.message);
        return res.status(500).json({ ok: false, error: "Webhook processing unavailable" });
      }
      if (processedWebhook) {
        return res.status(200).json({ ok: true });
      }
      if (event?.event !== "charge.success" || event?.data?.metadata?.type !== "event_ticket") {
        return res.status(200).json({ ok: true });
      }
      const metadata = event.data.metadata;
      const {
        event_id: eventId,
        tier_id: tierId,
        user_id: userId,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_phone: attendeePhone,
        ticket_number: ticketNumber
      } = metadata;
      if (!eventId || !tierId || !userId || !attendeeName || !attendeeEmail || !attendeePhone || !ticketNumber || typeof event.data.amount !== "number") {
        return res.status(400).json({ ok: false, error: "Incomplete event ticket metadata" });
      }
      const { data: tier, error: tierError } = await adminSupabase.from("event_ticket_tiers").select("price_kobo, event_id").eq("id", tierId).maybeSingle();
      if (tierError) {
        console.error("[Paystack Webhook] Tier lookup failed:", tierError.message);
        return res.status(500).json({ ok: false, error: "Ticket tier lookup failed" });
      }
      if (!tier || String(tier.event_id) !== String(eventId)) {
        console.warn(
          "[Paystack Webhook] Event/tier mismatch:",
          reference,
          eventId,
          tier?.event_id || null
        );
        return res.status(400).json({ ok: false, reason: "event_tier_mismatch" });
      }
      const expectedAmount = Number(tier.price_kobo);
      if (!Number.isSafeInteger(expectedAmount) || expectedAmount !== event.data.amount) {
        console.warn(
          "[Paystack Webhook] Amount mismatch:",
          reference,
          "expected:",
          expectedAmount,
          "received:",
          event.data.amount
        );
        return res.status(400).json({ ok: false, reason: "amount_mismatch" });
      }
      const qrCodeHash = crypto.createHash("sha256").update(`${reference}:${ticketNumber}`).digest("hex");
      const { data: ticket, error: ticketError } = await adminSupabase.rpc(
        "issue_ticket_from_webhook",
        {
          p_ticket_number: ticketNumber,
          p_event_id: eventId,
          p_tier_id: tierId,
          p_user_id: userId,
          p_attendee_name: attendeeName,
          p_attendee_email: attendeeEmail,
          p_attendee_phone: attendeePhone,
          p_price_paid_kobo: event.data.amount,
          p_paystack_reference: reference,
          p_qr_code_hash: qrCodeHash
        }
      );
      if (ticketError) {
        const errorText = `${ticketError.code || ""} ${ticketError.message || ""}`;
        if (/duplicate_reference|already_processed/i.test(errorText)) {
          console.warn("[Paystack Webhook] Reference already processed:", reference);
          return res.status(200).json({ ok: true });
        }
        console.error("[Paystack Webhook] Ticket issuance failed:", ticketError.message);
        return res.status(500).json({ ok: false, error: "Ticket issuance failed" });
      }
      const ticketRecord = Array.isArray(ticket) ? ticket[0] : ticket;
      return res.status(200).json({ ok: true, ticket_id: ticketRecord?.id || ticketRecord });
    }
  );
  app.use(express.json());
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/dev/simulate-webhook", async (req, res) => {
      const { amount, event_id: eventId, tier_id: tierId, user_id: userId } = req.body || {};
      if (typeof amount !== "number" || !Number.isSafeInteger(amount) || !eventId || !tierId || !userId) {
        return res.status(400).json({
          ok: false,
          error: "amount, event_id, tier_id, and user_id are required"
        });
      }
      const timestamp = Date.now();
      const event = {
        event: "charge.success",
        data: {
          reference: `TEST_${timestamp}`,
          amount,
          metadata: {
            type: "event_ticket",
            event_id: eventId,
            tier_id: tierId,
            user_id: userId,
            attendee_name: "Test User",
            attendee_email: "test@test.com",
            attendee_phone: "+2348000000000",
            ticket_number: `TEST-${timestamp}`
          }
        }
      };
      const rawBody = JSON.stringify(event);
      const secret = cleanSecret(process.env.PAYSTACK_SECRET_KEY);
      if (!secret) {
        return res.status(500).json({ ok: false, error: "PAYSTACK_SECRET_KEY is not configured" });
      }
      const signature = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
      const webhookResponse = await fetch(`http://127.0.0.1:${PORT}/api/paystack-webhook`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-paystack-signature": signature
        },
        body: rawBody
      });
      const responseBody = await webhookResponse.text();
      res.status(webhookResponse.status);
      const contentType = webhookResponse.headers.get("content-type");
      if (contentType) res.setHeader("content-type", contentType);
      return res.send(responseBody);
    });
  }
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.sendFile(path.resolve(process.cwd(), "public/sw.js"));
  });
  app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.sendFile(path.resolve(process.cwd(), "public/manifest.json"));
  });
  app.get("/icon.svg", (req, res) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.sendFile(path.resolve(process.cwd(), "public/icon.svg"));
  });
  app.use("/api", (req, res, next) => {
    const acceptsHtml = req.headers.accept && req.headers.accept.includes("text/html");
    const isAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest" || req.headers.accept && req.headers.accept.includes("application/json");
    const hasAuth = !!req.headers.authorization;
    if (acceptsHtml && !isAjax && !hasAuth) {
      return res.redirect("/login");
    }
    next();
  });
  app.get("/api/health", async (req, res) => {
    let dbStatus = "unknown";
    try {
      const supabase3 = getSupabase();
      if (!supabase3 || supabase3.__isDummy) {
        dbStatus = "misconfigured";
      } else {
        const { error } = await supabase3.from("users").select("count", { count: "exact", head: true }).limit(1);
        dbStatus = error ? "error" : "ok";
      }
    } catch (e) {
      dbStatus = "exception";
    }
    res.json({
      status: "ok",
      db: dbStatus,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      env: process.env.NODE_ENV,
      config: supabase2.__configStatus || { ok: true }
    });
  });
  let cachedCloudflareCredentials = null;
  async function resolveCloudflareCredentials() {
    if (cachedCloudflareCredentials) {
      return cachedCloudflareCredentials;
    }
    let accountId = cleanSecret(process.env.CLOUDFLARE_ACCOUNT_ID);
    let apiToken = cleanSecret(process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY);
    if (!apiToken && !accountId) {
      return null;
    }
    const isIdHex32 = accountId && accountId.length === 32 && /^[a-f0-9]+$/i.test(accountId);
    const isTokenHex32 = apiToken && apiToken.length === 32 && /^[a-f0-9]+$/i.test(apiToken);
    const idHasTokenPrefix = accountId && (accountId.startsWith("cfut_") || accountId.length > 32);
    if (idHasTokenPrefix && isTokenHex32) {
      console.log("[Cloudflare Auto-Healing] Swapped credentials detected in environment. Performing automatic healing...");
      const temp = accountId;
      accountId = apiToken;
      apiToken = temp;
    }
    const isValidAccountIdNow = accountId && accountId.length === 32 && /^[a-f0-9]+$/i.test(accountId);
    if (!isValidAccountIdNow && apiToken) {
      console.log(`[Cloudflare Auto-Healing] Account ID "${accountId}" is invalid/empty. Attempting dynamic lookup via Cloudflare Accounts API...`);
      try {
        const cfResponse = await fetch("https://api.cloudflare.com/client/v4/accounts", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json"
          }
        });
        if (cfResponse.ok) {
          const data = await cfResponse.json();
          if (data && data.success && Array.isArray(data.result) && data.result.length > 0) {
            const resolvedId = data.result[0].id;
            if (resolvedId && typeof resolvedId === "string") {
              console.log(`[Cloudflare Auto-Healing] Dynamically resolved Account ID: ${resolvedId}`);
              accountId = resolvedId;
            }
          }
        }
      } catch (err) {
        console.error("[Cloudflare Auto-Healing] Account list dynamic resolution failed:", err.message);
      }
    }
    const finalAccountId = accountId.trim();
    const finalApiToken = apiToken.trim();
    if (finalAccountId && finalApiToken) {
      cachedCloudflareCredentials = { accountId: finalAccountId, apiToken: finalApiToken };
      return cachedCloudflareCredentials;
    }
    return null;
  }
  app.get("/api/generate-image-proxy", async (req, res) => {
    const { prompt, width, height, seed } = req.query;
    const promptStr = typeof prompt === "string" ? prompt : "";
    if (!promptStr) {
      return res.status(400).json({ error: "prompt query param is required and must be a string" });
    }
    const w = typeof width === "string" ? width : "512";
    const h = typeof height === "string" ? height : "512";
    const s = typeof seed === "string" ? seed : Math.floor(Math.random() * 1e6).toString();
    const creds = await resolveCloudflareCredentials();
    if (creds) {
      const { accountId, apiToken } = creds;
      console.log(`[API Image Proxy] Cloudflare Workers AI routed. Account ID: ${accountId.substring(0, 5)}...`);
      const cfModelsToTry = [
        "@cf/black-forest-labs/flux-1-schnell",
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        "@cf/bytedance/sdxl-lightning-bytedance"
      ];
      for (const cfModel of cfModelsToTry) {
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cfModel}`;
        console.log(`[API Image Proxy] Querying Cloudflare Workers AI model "${cfModel}"...`);
        const maxCfRetries = 2;
        for (let attempt = 0; attempt < maxCfRetries; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 400));
            }
            const cfResponse = await fetch(cfUrl, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                prompt: promptStr,
                width: parseInt(w) || 512,
                height: parseInt(h) || 512,
                seed: parseInt(s) || void 0
              })
            });
            if (cfResponse.ok) {
              const arrayBuffer = await cfResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              if (buffer.length > 500) {
                const contentType = cfResponse.headers.get("content-type") || "";
                if (contentType.includes("application/json") || buffer.toString("utf-8").trim().startsWith("{")) {
                  try {
                    const parsed = JSON.parse(buffer.toString("utf-8"));
                    const hasErrors = parsed.success === false || Array.isArray(parsed.errors) && parsed.errors.length > 0;
                    if (hasErrors) {
                      console.warn(`[API Image Proxy] Cloudflare returned error JSON payload:`, parsed);
                      continue;
                    }
                    if (parsed.success && parsed.result) {
                      let base64Data = "";
                      if (typeof parsed.result === "string") {
                        base64Data = parsed.result;
                      } else if (parsed.result && typeof parsed.result.image === "string") {
                        base64Data = parsed.result.image;
                      }
                      if (base64Data) {
                        const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
                        const decodedBuffer = Buffer.from(base64Clean, "base64");
                        console.log(`[API Image Proxy] Decoded Base64 response into buffer of size: ${decodedBuffer.length} bytes.`);
                        res.setHeader("Content-Type", "image/png");
                        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                        res.setHeader("X-Generated-By", "Cloudflare-Workers-AI");
                        return res.send(decodedBuffer);
                      }
                    }
                  } catch (e) {
                  }
                }
                console.log(`[API Image Proxy] Successfully generated image via Cloudflare model "${cfModel}". Buffer size: ${buffer.length} bytes.`);
                res.setHeader("Content-Type", "image/png");
                res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                res.setHeader("X-Generated-By", "Cloudflare-Workers-AI");
                return res.send(buffer);
              }
            } else {
              const textResponse = await cfResponse.text();
              console.warn(`[API Image Proxy] Cloudflare model "${cfModel}" attempt ${attempt + 1} failed with HTTP ${cfResponse.status}: ${textResponse}`);
            }
          } catch (cfErr) {
            console.error(`[API Image Proxy] Exception on Cloudflare Workers AI model "${cfModel}" attempt ${attempt + 1}:`, cfErr.message || cfErr);
          }
        }
      }
      console.warn(`[API Image Proxy] All active Cloudflare Workers AI models failed or timed out. Falling back to multi-model backup orchestration...`);
    } else {
      console.log(`[API Image Proxy] Cloudflare credentials not set or could not be healed. Falling back to multi-model public nodes...`);
    }
    const modelsToTry = [
      "",
      // default (flux)
      "turbo",
      "flux-anime",
      "flux-realism",
      "flux-3d"
    ];
    let lastError = "";
    for (const model of modelsToTry) {
      let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptStr)}?width=${w}&height=${h}&seed=${s}&nologo=true&enhance=true`;
      if (model) {
        url += `&model=${model}`;
      }
      console.log(`[API Image Proxy] Trying model "${model || "flux"}"...`);
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const delay = Math.pow(2, attempt) * 500;
            console.log(`[API Image Proxy] Retrying model "${model || "flux"}" after ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          const response = await fetch(url);
          if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try {
              const text = await response.text();
              const parsed = JSON.parse(text);
              errMsg = parsed.error || parsed.message || (parsed.accepts ? "Queue limits" : errMsg);
            } catch (e) {
            }
            console.warn(`[API Image Proxy] Attempt ${attempt + 1} for ${model || "flux"} failed: ${errMsg}`);
            lastError = errMsg;
            if (response.status === 400) {
              break;
            }
            continue;
          }
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            let errMsg = "JSON response received instead of raw visual data";
            try {
              const parsed = await response.json();
              errMsg = parsed.error || parsed.message || (parsed.accepts ? "Queue limit reached" : errMsg);
            } catch (e) {
            }
            console.warn(`[API Image Proxy] Model "${model || "flux"}" returned JSON error: ${errMsg}`);
            lastError = errMsg;
            continue;
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          if (buffer.length < 1e3) {
            const textContent = buffer.toString("utf-8");
            if (textContent.includes("error") || textContent.includes("Queue full") || textContent.includes("limit")) {
              console.warn(`[API Image Proxy] Tiny response buffer with error text detected: ${textContent}`);
              lastError = textContent;
              continue;
            }
          }
          console.log(`[API Image Proxy] Successfully generated with model "${model || "flux"}". Buffer size: ${buffer.length} bytes.`);
          res.setHeader("Content-Type", contentType || "image/jpeg");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.setHeader("X-Generated-By", "Pollinations-AI");
          return res.send(buffer);
        } catch (err) {
          console.error(`[API Image Proxy] Exception on model "${model || "flux"}", attempt ${attempt + 1}:`, err.message || err);
          lastError = err.message || "Network request error";
        }
      }
    }
    return res.status(503).json({
      error: `AI Image synthesis is temporarily overloaded across all active cloud and proxy models. ${lastError ? `Details: ${lastError}` : ""}. Please try again in 5-10 seconds.`
    });
  });
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, width, height } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "prompt is required in the JSON body" });
      }
      const workerUrl = cleanSecret(process.env.VITE_IMAGE_WORKER_URL);
      if (workerUrl && workerUrl.startsWith("http")) {
        console.log(`[Express Dev Proxy] Forwarding POST /api/generate-image to Worker: ${workerUrl}`);
        try {
          const response = await fetch(workerUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt, width, height })
          });
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            res.setHeader("Content-Type", "image/jpeg");
            return res.send(Buffer.from(buffer));
          } else {
            const errText = await response.text();
            console.warn(`[Express Dev Proxy] Forward failed with status ${response.status}: ${errText}. Falling back to Pollinations/Cloudflare internal engine.`);
          }
        } catch (workerErr) {
          console.warn("[Express Dev Proxy] Exception trying to contact VITE_IMAGE_WORKER_URL, falling back:", workerErr.message || workerErr);
        }
      }
      console.log("[Express Dev Proxy] Invoking local fallbacks for design elements...");
      const w = width || "512";
      const h = height || "512";
      const seed = Math.floor(Math.random() * 1e6).toString();
      const cfProxyUrl = `http://localhost:3000/api/generate-image-proxy?prompt=${encodeURIComponent(prompt)}&width=${w}&height=${h}&seed=${seed}`;
      try {
        const response = await fetch(cfProxyUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          res.setHeader("Content-Type", response.headers.get("Content-Type") || "image/jpeg");
          return res.send(Buffer.from(buffer));
        } else {
          const errText = await response.text();
          return res.status(response.status).json({ error: `Fallback generator failed: ${errText}` });
        }
      } catch (fallbackErr) {
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true`;
        try {
          const response = await fetch(pollUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            res.setHeader("Content-Type", "image/jpeg");
            return res.send(Buffer.from(buffer));
          }
        } catch (directErr) {
          return res.status(500).json({ error: `All image generation routes failed: ${directErr.message}` });
        }
        return res.status(500).json({ error: `Fallback generator experienced an exception: ${fallbackErr.message}` });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to process image request" });
    }
  });
  app.post(["/api/generate-ai-text", "/api/ai/generate"], async (req, res) => {
    const { prompt, options } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }
    let userId = req.body?.userId || req.body?.options?.userId;
    let resolvedUser = null;
    const rawAuthHeader = req.headers.authorization || req.headers.Authorization || "";
    let token = rawAuthHeader;
    if (typeof rawAuthHeader === "string" && rawAuthHeader.toLowerCase().startsWith("bearer ")) {
      token = rawAuthHeader.substring(7).trim();
    }
    try {
      const supabase3 = getSupabaseAdmin();
      if (token && token !== "undefined" && token !== "null") {
        const { data: authData } = await supabase3.auth.getUser(token);
        if (authData?.user) {
          resolvedUser = authData.user;
          userId = authData.user.id;
        } else if (rawAuthHeader !== token) {
          const { data: headerData } = await supabase3.auth.getUser(rawAuthHeader);
          if (headerData?.user) {
            resolvedUser = headerData.user;
            userId = headerData.user.id;
          }
        }
      }
      if (!resolvedUser && userId) {
        if (supabase3.auth?.admin?.getUserById) {
          try {
            const { data: adminData } = await supabase3.auth.admin.getUserById(userId);
            if (adminData?.user) {
              resolvedUser = adminData.user;
            }
          } catch (adminErr) {
            console.warn("[AI Proxy] admin.getUserById notice:", adminErr?.message);
          }
        }
        if (!resolvedUser) {
          const { data: dbUser } = await supabase3.from("users").select("id, email, full_name, role, account_tier").eq("id", userId).maybeSingle();
          if (dbUser) {
            resolvedUser = dbUser;
          }
        }
      }
    } catch (tokenErr) {
      console.warn("[AI Proxy] Supabase auth extraction notice:", tokenErr?.message);
    }
    if (!resolvedUser) {
      resolvedUser = { id: userId || "authenticated-user", email: "user@calmreader.com" };
    }
    console.log(`[AI Proxy] User context established: ${resolvedUser?.email || userId}`);
    const apiKey = cleanSecret(
      process.env.VITE_OPEN_ROUTER_KEY || process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_KEY || process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_KEY
    );
    const opts = options || {};
    let requestedModel = opts.model || "google/gemini-2.5-flash";
    if (requestedModel === "google/gemini-2.0-flash-001" || requestedModel.includes("gemini-2.0-flash")) {
      requestedModel = "google/gemini-2.5-flash";
    }
    const systemInstruction = opts.systemInstruction || "You are a professional content architect and editor for CalmReader.";
    const isFreeRequested = requestedModel && (requestedModel.endsWith(":free") || requestedModel === "openrouter/free");
    const modelsToTry = isFreeRequested ? [
      requestedModel,
      "google/gemini-2.0-flash-exp:free",
      "google/gemini-2.5-flash",
      "openrouter/free"
    ] : [
      requestedModel,
      "google/gemini-2.5-flash",
      "openrouter/auto"
    ];
    const uniqueModels = Array.from(new Set(modelsToTry)).filter(Boolean);
    let lastError = "";
    let isRateLimited = false;
    if (apiKey) {
      let hasFatalOpenRouterError = false;
      for (const model of uniqueModels) {
        if (hasFatalOpenRouterError) {
          break;
        }
        const maxRetries = 2;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              const delay = Math.min(Math.pow(2, attempt) * 1e3, 3e4);
              console.log(`[API AI Text Proxy] Retrying model "${model}" after ${delay}ms due to previous rate limit/error...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
            console.log(`[API AI Text Proxy] Requesting "${model}" (attempt ${attempt + 1}/${maxRetries})...`);
            const payload = {
              model,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
              ],
              max_tokens: opts.max_tokens || 1500
            };
            if (opts.responseMimeType === "application/json") {
              payload.response_format = { type: "json_object" };
            }
            const isFreeModel = model.endsWith(":free") || model === "openrouter/free";
            const refererToUse = isFreeModel ? "https://calmreader.com" : process.env.APP_URL || "https://calmreader1.pages.dev";
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": refererToUse,
                "X-Title": "CalmReader",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });
            if (!response.ok) {
              let errMsg = `HTTP ${response.status}`;
              try {
                const text2 = await response.text();
                const parsed = JSON.parse(text2);
                errMsg = parsed.error?.message || parsed.message || errMsg;
              } catch (e) {
              }
              console.warn(`[API AI Text Proxy] Model "${model}" failed (HTTP ${response.status}): ${errMsg}`);
              if (response.status === 429) {
                isRateLimited = true;
              }
              if (response.status === 401 || response.status === 402 || response.status === 403 || errMsg.toLowerCase().includes("user not found")) {
                hasFatalOpenRouterError = true;
                console.warn("[API AI Text Proxy] OpenRouter upstream authentication failed. Switching immediately to direct Gemini engine.");
                break;
              }
              lastError = errMsg;
              continue;
            }
            const result = await response.json();
            const text = result.choices?.[0]?.message?.content;
            if (!text) {
              console.warn(`[API AI Text Proxy] Model "${model}" returned empty content structure.`);
              lastError = "Empty text payload returned";
              continue;
            }
            console.log(`[API AI Text Proxy] Successfully completed text synthesis with model "${model}".`);
            return res.json({ text });
          } catch (err) {
            console.error(`[API AI Text Proxy] Exception during model "${model}":`, err.message || err);
            lastError = err.message || "Network request error";
          }
        }
      }
    } else {
      lastError = "No OpenRouter API key configured on server environments.";
    }
    if (lastError.toLowerCase().includes("user not found")) {
      lastError = "OpenRouter key invalid (User not found). Attempting Gemini fallback.";
    }
    const geminiApiKey = cleanSecret(
      process.env.GEMINI_API_KEY || process.env.CALM_GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY
    );
    if (geminiApiKey) {
      console.log(`[API AI Text Proxy] OpenRouter generation failed or key is absent. Deploying high-resiliency direct fallback to Google Gemini API...`);
      try {
        const geminiModel = "gemini-2.5-flash";
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
        const geminiPayload = {
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          systemInstruction: {
            parts: [
              { text: systemInstruction }
            ]
          },
          generationConfig: {}
        };
        if (opts.responseMimeType === "application/json") {
          geminiPayload.generationConfig.responseMimeType = "application/json";
        }
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(geminiPayload)
        });
        if (geminiRes.ok) {
          const result = await geminiRes.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(`[API AI Text Proxy] Successfully synthesized text fallback using Google Gemini API directly.`);
            return res.json({ text });
          }
        } else {
          const errText = await geminiRes.text();
          console.warn(`[API AI Text Proxy] Gemini direct API responded with error status: ${geminiRes.status}. Body: ${errText}`);
          lastError += ` | Gemini Fallback status ${geminiRes.status}: ${errText}`;
        }
      } catch (geminiErr) {
        console.error(`[API AI Text Proxy] Critical exception on Gemini fallback:`, geminiErr.message || geminiErr);
        lastError += ` | Gemini Fallback exception: ${geminiErr.message}`;
      }
    }
    if (isRateLimited || lastError.includes("429") || lastError.toLowerCase().includes("rate limit") || lastError.toLowerCase().includes("too many requests") || lastError.toLowerCase().includes("busy")) {
      return res.status(429).json({
        error: "Trivia generation is busy. Please try again in a few moments."
      });
    }
    if (!lastError || lastError.trim() === "" || lastError.trim() === ".") {
      lastError = "AI generation providers are currently unavailable or rate limited. Please verify API keys in Settings.";
    }
    return res.status(503).json({
      error: `AI text generation proxy is temporarily unconfigured or overloaded. Please check your system Settings / Secrets. Error Details: ${lastError}`,
      details: lastError
    });
  });
  app.get("/api/auth/callback", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Google Sign-In Callback</title>
  <style>
    body {
      background-color: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.1);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border-left-color: #10b981;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h2 {
      font-size: 1.25rem;
      margin-bottom: 8px;
    }
    p {
      color: #8b949e;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>Completing Sign-In</h2>
  <p>Connecting securely to CalmReader, please wait...</p>
  <script>
    (function() {
      // Collect authentication token parameters from hash or query
      const hash = window.location.hash;
      const search = window.location.search;
      
      const payload = {
        type: 'GOOGLE_AUTH_CALLBACK',
        hash: hash || '',
        search: search || ''
      };

      console.log("[OAuth Callback] Communicating authentication with parent workspace:", payload);

      if (window.opener) {
        window.opener.postMessage(payload, '*');
        setTimeout(function() {
          window.close();
        }, 1000);
      } else {
        console.warn("[OAuth Callback] Opener window is missing.");
        // Standalone fallback: redirect to front page with original hash
        window.location.href = '/' + hash;
      }
    })();
  </script>
</body>
</html>
    `);
  });
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email, otp, type } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const brevoClient = getBrevo();
    if (!brevoClient) {
      console.warn("Brevo not configured. Email NOT sent.");
      return res.status(503).json({
        error: "Email service not configured. Please set BREVO_API_KEY in settings."
      });
    }
    try {
      const subject = type === "otp" ? "Your verification code" : "Welcome to CalmReader";
      const text = type === "otp" ? `Your verification code is: ${otp}. It will expire in 10 minutes.` : `Welcome to CalmReader! Please verify your email to start reading.`;
      await brevoClient.transactionalEmails.sendTransacEmail({
        subject,
        textContent: text,
        sender: { name: "CalmReader Auth", email: brevoSender },
        to: [{ email }]
      });
      res.json({ success: true, message: "Email sent via Brevo" });
    } catch (err) {
      console.error("Brevo error:", err);
      res.status(500).json({ error: "Failed to send email", details: err.message });
    }
  });
  app.get("/api/config/paystack-status", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800");
      const isEnvSet = !!process.env.PAYSTACK_SECRET_KEY;
      let isDbSet = false;
      const supabase3 = getSupabase();
      if (supabase3) {
        const { data } = await supabase3.from("config").select("value").eq("key", "paystack_secret_key").maybeSingle();
        isDbSet = !!data?.value;
      }
      res.json({ configured: isEnvSet || isDbSet });
    } catch (e) {
      console.error("Paystack status check error:", e);
      res.json({
        configured: !!process.env.PAYSTACK_SECRET_KEY,
        error: "Partial check failed"
      });
    }
  });
  const authenticateUser = async (req, res, next) => {
    const supabase3 = getSupabase();
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined" || token === "null" || token.length < 10) {
      return res.status(401).json({ error: "No valid token provided" });
    }
    try {
      const {
        data: { user },
        error
      } = await supabase3.auth.getUser(token);
      if (error || !user)
        return res.status(401).json({ error: "Invalid token" });
      let profile = null;
      try {
        const { data: p, error: pErr } = await supabase3.from("users").select("*").eq("id", user.id).maybeSingle();
        if (pErr) {
          console.error(`[Auth] Profile fetch by ID error: ${pErr.message}`);
        } else {
          profile = p;
        }
      } catch (e) {
        console.error(`[Auth] Profile fetch exception: ${e.message}`);
      }
      if (!profile) {
        profile = {
          id: user.id,
          email: user.email,
          account_tier: "free",
          is_admin: false
        };
      }
      const ADMIN_EMAILS = ["samuelchukwuemeke05@gmail.com", "chukwuemekedaniella@gmail.com", "winbigonly@gmail.com"];
      if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
        profile.is_admin = true;
        profile.account_tier = "admin";
      }
      if (profile.account_tier !== "free" && profile.account_tier !== "admin" && profile.tier_expires_at) {
        const expiresAt = new Date(profile.tier_expires_at).getTime();
        const now = Date.now();
        if (now > expiresAt) {
          console.log(
            `[Tier] Reverting user ${user.id} to free because tier expired at ${profile.tier_expires_at}`
          );
          const { error: revErr } = await supabase3.from("users").update({
            account_tier: "free",
            is_premium: false,
            is_approved_author: false,
            tier_expires_at: null
          }).eq("id", user.id);
          if (!revErr) {
            profile.account_tier = "free";
            profile.is_premium = false;
            profile.is_approved_author = false;
            profile.tier_expires_at = null;
          }
        }
      }
      req.user = user;
      req.profile = profile;
      if (user?.id) {
        try {
          supabase3.rpc("update_user_session", { p_user_id: user.id }).then(({ error: rpcErr }) => {
            if (rpcErr) {
              supabase3.from("user_sessions").upsert({
                user_id: user.id,
                last_active_at: (/* @__PURE__ */ new Date()).toISOString()
              }, { onConflict: "user_id" }).then(() => {
              }).catch(() => {
              });
            }
          }).catch(() => {
          });
        } catch (sessErr) {
        }
      }
      next();
    } catch (err) {
      console.error("Auth error:", err);
      res.status(500).json({ error: "Authentication failed" });
    }
  };
  const authenticateAdmin = async (req, res, next) => {
    const supabase3 = getSupabase();
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn("[AdminAuth] No token provided for " + req.url);
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined" || token === "null" || token.length < 10) {
      return res.status(401).json({ error: "No valid token provided" });
    }
    if (supabase3.__isDummy && process.env.NODE_ENV !== "production") {
      console.warn(
        "[AdminAuth] Using fallback dummy admin because Supabase is unconfigured."
      );
      req.user = {
        id: "00000000-0000-0000-0000-000000000000",
        email: "chukwuemekedaniella@gmail.com"
      };
      req.profile = {
        id: "00000000-0000-0000-0000-000000000000",
        email: "chukwuemekedaniella@gmail.com",
        account_tier: "admin",
        is_admin: true
      };
      return next();
    }
    try {
      const {
        data: { user },
        error
      } = await supabase3.auth.getUser(token);
      if (error || !user) {
        if (error?.message === "Auth session missing!") {
          console.warn("[AdminAuth] getUser failed: Auth session missing!");
        } else {
          console.error(
            "[AdminAuth] getUser failed:",
            error?.message || "User null"
          );
        }
        return res.status(401).json({ error: "Invalid token", details: error?.message });
      }
      let profile = null;
      const { data } = await supabase3.from("users").select("*").eq("id", user.id).maybeSingle();
      profile = data;
      const ADMIN_EMAILS = ["samuelchukwuemeke05@gmail.com", "chukwuemekedaniella@gmail.com", "winbigonly@gmail.com"];
      if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        if (!profile) {
          profile = {
            id: user.id,
            email: user.email,
            is_admin: true,
            account_tier: "admin"
          };
        } else {
          profile.is_admin = true;
          profile.account_tier = "admin";
        }
      }
      const isAdmin2 = !!profile?.is_admin && ADMIN_EMAILS.includes(user.email?.toLowerCase());
      if (!isAdmin2) {
        console.warn(`[AdminAuth] Access denied for ${user.email}`);
        return res.status(403).json({ error: "Admin resource. Access denied." });
      }
      req.user = user;
      req.profile = profile || {
        email: user.email,
        account_tier: "admin",
        is_admin: true,
        id: user.id
      };
      next();
    } catch (err) {
      console.error("[AdminAuth] Critical failure:", err.message);
      res.status(500).json({ error: "Authentication system failure" });
    }
  };
  setupPublishingRoutes(app, getSupabase, getSupabaseAdmin, authenticateUser, authenticateAdmin);
  app.get("/api/auth/validate-session", authenticateUser, async (req, res) => {
    try {
      const user = req.user;
      const profile = req.profile;
      const lowerEmail = (user.email || "").toLowerCase();
      const isAdminEmail = lowerEmail === "samuelchukwuemeke05@gmail.com" || lowerEmail === "chukwuemekedaniella@gmail.com" || lowerEmail === "winbigonly@gmail.com";
      const accountTier = isAdminEmail ? "admin" : profile?.account_tier || "free";
      return res.status(200).json({
        userId: user.id,
        email: user.email,
        accountTier,
        isAdmin: isAdminEmail || accountTier === "admin"
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to validate session", details: err.message });
    }
  });
  app.post("/api/auth/validate-session", authenticateUser, async (req, res) => {
    try {
      const user = req.user;
      const profile = req.profile;
      const lowerEmail = (user.email || "").toLowerCase();
      const isAdminEmail = lowerEmail === "samuelchukwuemeke05@gmail.com" || lowerEmail === "chukwuemekedaniella@gmail.com" || lowerEmail === "winbigonly@gmail.com";
      const accountTier = isAdminEmail ? "admin" : profile?.account_tier || "free";
      return res.status(200).json({
        userId: user.id,
        email: user.email,
        accountTier,
        isAdmin: isAdminEmail || accountTier === "admin"
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to validate session", details: err.message });
    }
  });
  app.post("/api/purchase/ebook", authenticateUser, async (req, res) => {
    try {
      const { reference, ebookId, amount } = req.body;
      const supabase3 = getSupabase();
      const { data: trans, error } = await supabase3.from("transactions").insert({
        user_id: req.user.id,
        book_id: ebookId,
        type: "purchase",
        amount: amount || 0,
        status: "successful",
        paystack_reference: reference
      }).select().single();
      if (error) throw error;
      try {
        await logUserActivity(req.user.id, "book_purchase", { book_id: ebookId, amount, reference });
      } catch (logErr) {
        console.warn("[Tracking] Ebook purchase tracking skip:", logErr.message);
      }
      if (trans) {
        try {
          const { data: existingEpic } = await supabase3.from("ebook_purchases").select("*").eq("user_id", req.user.id).eq("ebook_id", ebookId).maybeSingle();
          if (!existingEpic) {
            await supabase3.from("ebook_purchases").insert({
              user_id: req.user.id,
              ebook_id: ebookId,
              purchase_id: trans.id
            });
            console.log(`[API Purchase] ebook_purchases entry successfully recorded for user ${req.user.id} and book ${ebookId}`);
          }
        } catch (epicErr) {
          console.error("[API Purchase] ebook_purchases record skipped/failed:", epicErr.message || epicErr);
        }
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post(
    "/api/auth/verify-registration",
    authenticateUser,
    async (req, res) => {
      try {
        const { reference } = req.body;
        const supabase3 = getSupabaseAdmin();
        const { error } = await supabase3.from("users").update({ registration_paid: true }).eq("id", req.user.id);
        if (error) throw error;
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.post("/api/upgrade/premium", authenticateUser, async (req, res) => {
    try {
      const { reference } = req.body;
      const supabase3 = getSupabaseAdmin();
      if (reference?.startsWith("MOCK_")) {
        console.log(
          `[Payment] Handling MOCK premium upgrade for user ${req.user.id}`
        );
        if (!supabase3.__isDummy) {
          await supabase3.from("users").update({ account_tier: "premium", is_premium: true }).eq("id", req.user.id);
        }
        return res.json({ success: true, message: "Mock upgrade successful" });
      }
      const { error } = await supabase3.from("users").update({
        account_tier: "premium",
        is_premium: true,
        premium_upgrade_date: /* @__PURE__ */ new Date()
      }).eq("id", req.user.id);
      if (error && !supabase3.__isDummy) throw error;
      if (!supabase3.__isDummy) {
        await supabase3.from("transactions").insert({
          user_id: req.user.id,
          type: "premium_upgrade",
          amount: 1500,
          status: "completed",
          paystack_reference: reference
        });
        try {
          const { data: referral } = await supabase3.from("referrals").select("*").eq("referred_id", req.user.id).or("reward_granted.eq.0,reward_granted.eq.false").maybeSingle();
          if (referral) {
            const bonusAmount = referral.reward_amount || 100;
            await supabase3.from("transactions").insert({
              user_id: referral.referrer_id,
              type: "referral_bonus",
              amount: bonusAmount,
              status: "completed",
              paystack_reference: reference || `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
            });
            await supabase3.rpc("increment_user_balance", {
              p_user_id: referral.referrer_id,
              p_wallet_delta: bonusAmount,
              p_total_earned_delta: bonusAmount
            });
            const rewardVal = typeof referral.reward_granted === "number" ? 1 : true;
            await supabase3.from("referrals").update({ reward_granted: rewardVal }).eq("id", referral.id);
            console.log(`[Referral Reward] Credited referral bonus of \u20A6${bonusAmount} to referrer ${referral.referrer_id} for user ${req.user.id} premium upgrade.`);
          }
        } catch (refErr) {
          console.error("[Referral Reward] Failed to award premium upgrade referral bonus:", refErr);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[Payment] Upgrade Error:", err);
      res.status(500).json({ error: err.message || "Failed to process upgrade" });
    }
  });
  app.get("/api/config/promo-price", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800");
      const supabase3 = getSupabase();
      let price = 3e3;
      if (!supabase3.__isDummy) {
        const { data, error } = await supabase3.from("config").select("*").eq("key", "promo_studio_weekly_price").maybeSingle();
        if (data && data.value) {
          const parsed = parseInt(data.value, 10);
          if (!isNaN(parsed)) price = parsed;
        }
      }
      res.json({ price });
    } catch (err) {
      res.json({ price: 3e3, error: err.message });
    }
  });
  app.post("/api/config/promo-price", authenticateAdmin, async (req, res) => {
    try {
      const { price } = req.body;
      const parsedPrice = parseInt(price, 10);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: "Invalid price value" });
      }
      const supabase3 = getSupabase();
      if (!supabase3.__isDummy) {
        const { error } = await supabase3.from("config").upsert({ key: "promo_studio_weekly_price", value: parsedPrice.toString() });
        if (error) throw error;
      }
      res.json({ success: true, price: parsedPrice });
    } catch (err) {
      console.error("[Config] Promo price update failed:", err);
      res.status(500).json({ error: err.message || "Failed to update configuration" });
    }
  });
  app.post("/api/subscribe/promo-studio", authenticateUser, async (req, res) => {
    try {
      const { reference, price } = req.body;
      const finalPrice = parseInt(price, 10) || 3e3;
      const supabase3 = getSupabase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      if (!supabase3.__isDummy) {
        const { error: userErr } = await supabase3.from("users").update({
          promo_studio_expires_at: expiresAt
        }).eq("id", req.user.id);
        if (userErr) {
          console.warn("[Subscribe] Table column promo_studio_expires_at write failed. Schema migration might not have run yet: ", userErr.message);
        }
        await supabase3.from("transactions").insert({
          user_id: req.user.id,
          type: "promo_studio_subscription",
          amount: finalPrice,
          status: "completed",
          paystack_reference: reference || "MOCK_" + Date.now()
        }).catch((err) => {
          console.error("[Subscribe] Transaction logs insert failed: ", err.message);
        });
      }
      res.json({ success: true, expiresAt, message: "Subscription updated successfully" });
    } catch (err) {
      console.error("[Subscribe] Promo subscription failed:", err);
      res.status(500).json({ error: err.message || "Failed to finalize subscription" });
    }
  });
  app.post("/api/apply/author", authenticateUser, async (req, res) => {
    try {
      const {
        reference,
        fee_paid,
        bank_name,
        account_number,
        account_name,
        writing_sample_url,
        bio
      } = req.body;
      const supabase3 = getSupabase();
      if (reference?.startsWith("MOCK_")) {
        console.log(
          `[Author] Handling MOCK application for user ${req.user.id}`
        );
        if (!supabase3.__isDummy) {
          await supabase3.from("users").update({
            bank_name,
            account_number,
            account_name,
            author_application_date: /* @__PURE__ */ new Date()
          }).eq("id", req.user.id);
          await supabase3.from("author_applications").insert({
            user_id: req.user.id,
            fee_paid: fee_paid || 5e3,
            paystack_reference: reference,
            status: "pending"
          });
        }
        return res.json({
          success: true,
          message: "Mock application submitted"
        });
      }
      if (!supabase3.__isDummy) {
        await supabase3.from("users").update({
          bank_name,
          account_number,
          account_name,
          author_application_date: /* @__PURE__ */ new Date()
        }).eq("id", req.user.id);
      }
      const { error } = await supabase3.from("author_applications").insert({
        user_id: req.user.id,
        fee_paid: fee_paid || 5e3,
        paystack_reference: reference,
        status: "pending"
      });
      if (error && !supabase3.__isDummy) throw error;
      try {
        await logUserActivity(req.user.id, "author_apply", { fee_paid: fee_paid || 5e3, reference, bank_name });
      } catch (logErr) {
        console.warn("[Tracking] Author apply tracking skip:", logErr.message);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[Author] Application Error:", err);
      res.status(500).json({ error: err.message || "Failed to submit application" });
    }
  });
  app.post(
    "/api/upgrade/author-apply",
    (req, res) => res.redirect(307, "/api/apply/author")
  );
  app.delete(
    "/api/admin/trivia/delete/:id",
    authenticateUser,
    async (req, res) => {
      try {
        const { id } = req.params;
        const supabase3 = getSupabase();
        const isAdmin2 = req.profile?.account_tier === "admin";
        const userId = req.profile?.id;
        if (req.profile?.account_tier !== "admin" && req.profile?.account_tier !== "author") {
          return res.status(403).json({ error: "Access denied." });
        }
        if (id === "general") {
          if (!isAdmin2) {
            return res.status(403).json({ error: "Only the CEO can delete general trivia." });
          }
          try {
            await supabase3.from("trivias").delete().is("book_id", null);
          } catch (tErr) {
            console.warn("[Trivia Delete API] 'trivias' table delete skipped:", tErr);
          }
          const [qRes2, aRes2] = await Promise.all([
            supabase3.from("trivia_questions").delete().is("ebook_id", null),
            supabase3.from("daily_trivia_attempts").delete().is("ebook_id", null)
          ]);
          return res.json({ success: true, message: "General trivia deleted successfully" });
        }
        if (!isAdmin2) {
          let session = null;
          try {
            const { data } = await supabase3.from("trivias").select("book_id").eq("id", id).maybeSingle();
            session = data;
          } catch (tErr) {
            console.warn("[Trivia Delete API] 'trivias' table select skipped:", tErr);
          }
          const bookIdToCheck = session?.book_id || id;
          if (bookIdToCheck) {
            const { data: book } = await supabase3.from("books").select("user_id").eq("id", bookIdToCheck).maybeSingle();
            if (book && book.user_id !== userId) {
              return res.status(403).json({ error: "You can only delete your own trivia sessions." });
            }
          }
        }
        try {
          await supabase3.from("trivias").delete().or(`id.eq.${id},book_id.eq.${id}`);
        } catch (tErr) {
          console.warn("[Trivia Delete API] 'trivias' table delete skipped:", tErr);
        }
        const qQuery = supabase3.from("trivia_questions").delete().or(`id.eq.${id},ebook_id.eq.${id}`);
        const aQuery = supabase3.from("daily_trivia_attempts").delete().or(`id.eq.${id},ebook_id.eq.${id}`);
        const [qRes, aRes] = await Promise.all([qQuery, aQuery]);
        res.json({ success: true, message: "Trivia challenge, questions, and attempts deleted successfully" });
      } catch (err) {
        console.error("Delete trivia error:", err);
        res.status(500).json({ error: "Failed to delete: " + err.message });
      }
    }
  );
  app.post(
    "/api/admin/trivia/clean-ghosts",
    authenticateUser,
    async (req, res) => {
      const isAdmin2 = req.profile?.account_tier === "admin";
      if (!isAdmin2) {
        return res.status(403).json({ error: "Only the CEO can clean ghost records." });
      }
      try {
        const supabase3 = getSupabase();
        const ghostTitles = [
          "SAMPLE",
          "TEST",
          "DUMMY",
          "DELETED",
          "[DELETED]",
          "VOLUME 4",
          "VOLUME-4",
          "VOLUME 4-CHAPTER 1",
          "VOLUME 4 - CHAPTER 1",
          "I AM IN SO MUCH TROUBLE",
          "MUCH TROUBLE"
        ];
        const { data: allBooks } = await supabase3.from("books").select("id, title");
        const ghostBookIds = [];
        if (allBooks) {
          allBooks.forEach((b) => {
            const titleUpper = (b.title || "").toUpperCase();
            if (ghostTitles.some((gt) => titleUpper.includes(gt))) {
              ghostBookIds.push(b.id);
            }
          });
        }
        console.log(`[CleanGhosts] Found ghost book IDs to delete:`, ghostBookIds);
        if (ghostBookIds.length > 0) {
          await supabase3.from("books").delete().in("id", ghostBookIds);
          await supabase3.from("trivias").delete().in("book_id", ghostBookIds);
          await supabase3.from("trivia_questions").delete().in("ebook_id", ghostBookIds);
          await supabase3.from("daily_trivia_attempts").delete().in("ebook_id", ghostBookIds);
        }
        const { data: currentBooks } = await supabase3.from("books").select("id");
        const { data: currentTrivias } = await supabase3.from("trivias").select("id, book_id");
        const validBookIds = new Set((currentBooks || []).map((b) => b.id));
        const orphanedTriviaBookIds = [];
        if (currentTrivias) {
          currentTrivias.forEach((t) => {
            if (t.book_id !== null && !validBookIds.has(t.book_id)) {
              orphanedTriviaBookIds.push(t.book_id);
            }
          });
        }
        console.log(`[CleanGhosts] Found orphaned trivia book IDs to delete:`, orphanedTriviaBookIds);
        if (orphanedTriviaBookIds.length > 0) {
          await supabase3.from("trivias").delete().in("book_id", orphanedTriviaBookIds);
          await supabase3.from("trivia_questions").delete().in("ebook_id", orphanedTriviaBookIds);
          await supabase3.from("daily_trivia_attempts").delete().in("ebook_id", orphanedTriviaBookIds);
        }
        res.json({
          success: true,
          message: "Ghost records and orphaned trivias cleaned up successfully.",
          cleanedGhostBooksCount: ghostBookIds.length,
          cleanedOrphanedCount: orphanedTriviaBookIds.length
        });
      } catch (err) {
        console.error("[CleanGhosts] Error:", err);
        res.status(500).json({ error: err.message || "Failed to run ghost cleanup." });
      }
    }
  );
  app.get(
    "/api/admin/author-applications",
    authenticateAdmin,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        console.log("[Admin] Fetching author applications...");
        const { data, error } = await supabase3.from("author_applications").select("*").order("created_at", { ascending: false });
        if (error) {
          const errMsg = String(error.message || "").toLowerCase();
          const isTimeout = errMsg.includes("timeout") || errMsg.includes("cancel") || errMsg.includes("deadlock");
          const isMissing = error.code === "42P01" || error.code === "PGRST114" || error.code === "PGRST205" || error.message && (error.message.toLowerCase().includes("missing") || error.message.toLowerCase().includes("not find") || error.message.toLowerCase().includes("schema cache") || error.message.toLowerCase().includes("does not exist"));
          const isPermission = error.code === "42501" || error.message && error.message.toLowerCase().includes("permission");
          if (isMissing || isTimeout || isPermission) {
            console.warn(
              `[Admin] Handled expected fetch author-applications status (${error.code}): ${error.message}`
            );
          } else {
            console.error(
              "Fetch author-applications error details:",
              JSON.stringify(error, null, 2)
            );
          }
          if (isTimeout) {
            return res.json({
              applications: [],
              error: "Database timeout or block occurred. Please check database server load or locks."
            });
          }
          if (isMissing) {
            return res.json({
              applications: [],
              warning: "Applications table not found in database. Please run migrations in the admin panel."
            });
          }
          if (isPermission) {
            return res.json({
              applications: [],
              error: "Permission denied. Check if RLS is enabled or if you're using the correct API key."
            });
          }
          return res.json({
            applications: [],
            error: error.message || "Database error fetching applications",
            details: error
          });
        }
        if (!data || data.length === 0) {
          return res.json({ applications: [] });
        }
        const userIds = [...new Set(data.map((v) => v.user_id))].filter(
          Boolean
        );
        let userMap = {};
        if (userIds.length > 0) {
          try {
            const { data: users, error: usersError } = await supabase3.from("users").select("id, email, full_name, username").in("id", userIds);
            if (!usersError) {
              userMap = (users || []).reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
              }, {});
            } else {
              console.warn("User join query failed:", usersError);
            }
          } catch (e) {
            console.error("Manual user join failed:", e);
          }
        }
        const applicationsWithUsers = data.map((v) => ({
          ...v,
          users: userMap[v.user_id] || {
            email: "Unknown",
            full_name: "User Data Missing"
          }
        }));
        res.json({ applications: applicationsWithUsers });
      } catch (err) {
        console.error("Admin applications route CRITICAL error:", err);
        res.status(500).json({
          error: "Server Error fetching applications",
          details: err.message
        });
      }
    }
  );
  app.post(
    "/api/admin/author-applications/resolve",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { applicationId, action, admin_note } = req.body;
        const supabase3 = getSupabase();
        const { data: appData, error: appErr } = await supabase3.from("author_applications").select("*").eq("id", applicationId).single();
        if (appErr || !appData)
          return res.status(404).json({ error: "Application not found" });
        const status = action === "approve" ? "approved" : "rejected";
        const { error: updateErr } = await supabase3.from("author_applications").update({
          status,
          admin_note,
          reviewed_at: /* @__PURE__ */ new Date()
        }).eq("id", applicationId);
        if (updateErr) throw updateErr;
        if (action === "approve") {
          const { error: userErr } = await supabase3.from("users").update({
            account_tier: "author",
            is_approved_author: true
          }).eq("id", appData.user_id);
          if (userErr) throw userErr;
        }
        try {
          await logUserActivity(appData.user_id, action === "approve" ? "author_approved" : "author_rejected", {
            admin_note,
            resolved_by: req.user?.email
          });
        } catch (logErr) {
          console.warn("[Tracking] Author resolution tracking skip:", logErr.message);
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.post(
    "/api/affiliate/generate",
    authenticateUser,
    async (req, res) => {
      try {
        const { book_id } = req.body;
        const user = req.user;
        const profile = req.profile;
        if (profile.account_tier === "free") {
          return res.status(403).json({
            error: "You must be a Premium user or Author to generate affiliate links."
          });
        }
        const affiliate_code = `${user.id.slice(0, 8)}_${book_id.slice(0, 8)}_${Date.now()}`;
        const supabase3 = getSupabase();
        const { data, error } = await supabase3.from("affiliate_links").insert({ book_id, affiliate_id: user.id, affiliate_code }).select().single();
        if (error) return res.status(500).json({ error: error.message });
        const rawAppUrl = process.env.APP_URL || "";
        const baseAppUrl = rawAppUrl.includes("MY_APP_URL") || !rawAppUrl ? `${req.protocol}://${req.get("host")}` : rawAppUrl.replace(/\/$/, "");
        const affiliateLink = `${baseAppUrl}/purchase/${book_id}?ref=${affiliate_code}`;
        res.json({ success: true, affiliate_code, affiliateLink });
      } catch (err) {
        console.error("Affiliate generation error:", err);
        res.status(500).json({ error: "Failed to generate link" });
      }
    }
  );
  app.post(
    "/api/trivias/purchase-access",
    authenticateUser,
    async (req, res) => {
      try {
        const { reference, ebookId } = req.body;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const supabase3 = getSupabase();
        let amount = 200;
        try {
          const tQuery = isGeneral ? supabase3.from("trivias").select("price").is("book_id", null).single() : supabase3.from("trivias").select("price").eq("book_id", ebookId).single();
          const { data: triviaData } = await tQuery;
          if (triviaData?.price !== void 0 && triviaData?.price !== null) {
            amount = triviaData.price;
          }
        } catch (priceErr) {
          console.warn("[Trivias Price API] Failed to fetch price from 'trivias' table, using default of 200:", priceErr);
        }
        const { error } = await supabase3.from("transactions").insert({
          user_id: req.user.id,
          book_id: dbId,
          type: "trivia_access",
          amount,
          status: "successful",
          paystack_reference: reference
        });
        if (error) throw error;
        res.json({ success: true, amount });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.post(
    "/api/withdrawal/request",
    authenticateUser,
    async (req, res) => {
      try {
        const user = req.user;
        const { amount, bank_name, account_number, account_name } = req.body;
        const supabase3 = getSupabase();
        const MIN_WITHDRAWAL = 5e3;
        if (amount < MIN_WITHDRAWAL) {
          return res.status(400).json({ error: `Minimum withdrawal is \u20A6${MIN_WITHDRAWAL}` });
        }
        const userId = req.profile?.id || user.id;
        const { data: earnings } = await supabase3.from("transactions").select("amount").eq("user_id", userId).in("type", [
          "author_earning",
          "affiliate_commission",
          "referral_bonus",
          "trivia_win"
        ]);
        const totalEarned = earnings?.reduce((sum, t) => sum + t.amount, 0) || 0;
        const { data: withdrawalsData } = await supabase3.from("withdrawals").select("amount, status").eq("user_id", userId);
        const withdrawals = withdrawalsData?.filter(
          (w) => w.status === "approved" || w.status === "paid" || w.status === 1 || w.status === "1" || w.status === 3 || w.status === "3"
        ) || [];
        const totalWithdrawn = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;
        const available = totalEarned - totalWithdrawn;
        if (amount > available)
          return res.status(400).json({ error: "Insufficient balance" });
        const { data: withdrawal, error } = await supabase3.from("withdrawals").insert({
          user_id: userId,
          amount,
          bank_name,
          account_number,
          account_name
        }).select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, withdrawal });
      } catch (err) {
        console.error("Withdrawal request error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  app.get("/api/admin/health/db", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const configStatus = supabase3.__configStatus || { ok: true };
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "Using Placeholder";
      const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "Using Placeholder";
      let purchaseLogs = [];
      let richRecentPurchases = [];
      let rawTransactions = [];
      try {
        if (supabase3 && !supabase3.__isDummy) {
          const { data: recentPurchases, error: rpErr } = await supabase3.from("transactions").select("*").in("type", ["purchase", "premium_upgrade", "trivia", "trivia_purchase"]).order("created_at", { ascending: false }).limit(30);
          if (recentPurchases && recentPurchases.length > 0) {
            const uids = [...new Set(recentPurchases.map((r) => r.user_id))].filter(Boolean);
            const bids = [...new Set(recentPurchases.map((r) => r.book_id))].filter(Boolean);
            let userEmailMap = {};
            let adminUserIds = /* @__PURE__ */ new Set();
            if (uids.length > 0) {
              const { data: uUsers } = await supabase3.from("users").select("id, email, is_admin, account_tier").in("id", uids);
              (uUsers || []).forEach((u) => {
                const email = (u.email || "").toLowerCase();
                userEmailMap[u.id] = u.email || "No Email";
                const isEmailAdmin = email === "samuelchukwuemeke05@gmail.com";
                if (u.is_admin || u.account_tier === "admin" || isEmailAdmin) {
                  adminUserIds.add(u.id);
                }
              });
            }
            const filteredPurchases = recentPurchases.filter((r) => {
              const email = (userEmailMap[r.user_id] || r.buyer_email || "").toLowerCase();
              const isAdminEmail = email === "samuelchukwuemeke05@gmail.com";
              return !adminUserIds.has(r.user_id) && !isAdminEmail;
            });
            rawTransactions = filteredPurchases;
            let bookTitleMap = {};
            if (bids.length > 0) {
              const { data: uBooks } = await supabase3.from("books").select("id, title").in("id", bids);
              (uBooks || []).forEach((b) => {
                bookTitleMap[b.id] = b.title;
              });
            }
            richRecentPurchases = filteredPurchases.map((r) => {
              const email = userEmailMap[r.user_id] || r.buyer_email || "Unknown User";
              const bookTitle = r.book_id ? bookTitleMap[r.book_id] || `Book #${r.book_id}` : "N/A / Premium Upgrade";
              return {
                id: r.id,
                email,
                bookTitle,
                reference: r.paystack_reference || "N/A (INTERNAL)",
                amount: r.amount || 0,
                status: r.status || "completed",
                createdAt: r.created_at
              };
            });
            purchaseLogs = filteredPurchases.map((r) => {
              const email = userEmailMap[r.user_id] || r.buyer_email || "Unknown User";
              const bookTitle = r.book_id ? bookTitleMap[r.book_id] || `Book #${r.book_id}` : "N/A / Premium Upgrade";
              const formattedTime = new Date(r.created_at).toLocaleTimeString();
              const pRef = r.paystack_reference || "N/A";
              let level = "log";
              let statusEmoji = "\u2705";
              if (r.status !== "successful" && r.status !== "completed") {
                level = "warn";
                statusEmoji = "\u26A0\uFE0F";
              }
              return {
                time: formattedTime,
                type: level,
                message: `\u{1F6D2} [PURCHASE] ${statusEmoji} User: ${email} | Item: ${bookTitle} | Price: \u20A6${r.amount} | Ref: ${pRef} | Status: ${(r.status || "completed").toUpperCase()}`
              };
            });
          }
        }
      } catch (err) {
        console.error("Error building live purchase logs:", err);
      }
      res.json({
        status: configStatus.ok ? "ok" : "error",
        db: supabase3 && !supabase3.__isDummy ? "healthy" : "misconfigured",
        config: {
          url,
          key: envKey,
          projectRef: extractProjectRef(url),
          keyProjectRef: extractProjectRefFromKey(envKey)
        },
        configStatus,
        envStatus: {
          CALM_GEMINI_KEY: process.env.CALM_GEMINI_KEY ? "SET" : "MISSING",
          PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ? "SET" : "MISSING",
          MAILTRAP_API_TOKEN: process.env.MAILTRAP_API_TOKEN ? "SET" : "MISSING",
          SUPABASE_URL: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
        },
        purchaseLogs,
        richRecentPurchases,
        rawTransactions
      });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });
  app.get("/api/setup/get-config", (req, res) => {
    try {
      res.json({
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
        key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ""
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/setup/test-config", async (req, res) => {
    try {
      const { url, key, serviceRoleKey } = req.body;
      const cleanUrl = cleanSecret(url);
      const cleanKey = cleanSecret(key);
      const validation = validateSupabaseConfig(cleanUrl, cleanKey);
      if (!validation.ok) {
        return res.json({
          ok: false,
          error: validation.reason,
          details: "Mismatch detected between URL and Key."
        });
      }
      if (serviceRoleKey) {
        const cleanServiceKey = cleanSecret(serviceRoleKey);
        if (!cleanServiceKey.startsWith("eyJ")) {
          return res.json({
            ok: false,
            error: "Service Role Key must be a JWT (starts with eyJ)",
            details: "Invalid Service Role Key format."
          });
        }
        const serviceKeyRef = extractProjectRefFromKey(cleanServiceKey);
        const urlRef = extractProjectRef(cleanUrl);
        if (urlRef && serviceKeyRef && urlRef !== serviceKeyRef) {
          return res.json({
            ok: false,
            error: `Mismatched Service Role Key Project: URL belongs to [${urlRef}] but Service Key belongs to [${serviceKeyRef}].`,
            details: "Service Role Key project reference mismatch."
          });
        }
      }
      const tempClient = createClient(cleanUrl, cleanKey);
      const { error } = await tempClient.from("users").select("id").limit(1);
      if (error) {
        return res.json({
          ok: false,
          error: error.message,
          details: "Connection failed even though format is correct. Check if your project is active."
        });
      }
      res.json({
        ok: true,
        message: "Configuration is valid and connection was successful!",
        projectRefs: {
          url: extractProjectRef(cleanUrl),
          key: extractProjectRefFromKey(cleanKey)
        }
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  app.post("/api/setup/save-config", async (req, res) => {
    try {
      const { url, key, serviceRoleKey } = req.body;
      const cleanUrl = cleanSecret(url);
      const cleanKey = cleanSecret(key);
      const validation = validateSupabaseConfig(cleanUrl, cleanKey);
      if (!validation.ok) {
        return res.json({
          ok: false,
          error: validation.reason,
          details: "Mismatch detected between URL and Key."
        });
      }
      const cleanServiceKey = serviceRoleKey ? cleanSecret(serviceRoleKey) : "";
      if (cleanServiceKey) {
        if (!cleanServiceKey.startsWith("eyJ")) {
          return res.json({
            ok: false,
            error: "Service Role Key must be a JWT (starts with eyJ)",
            details: "Invalid Service Role Key format."
          });
        }
        const serviceKeyRef = extractProjectRefFromKey(cleanServiceKey);
        const urlRef = extractProjectRef(cleanUrl);
        if (urlRef && serviceKeyRef && urlRef !== serviceKeyRef) {
          return res.json({
            ok: false,
            error: `Mismatched Service Role Key Project: URL belongs to [${urlRef}] but Service Key belongs to [${serviceKeyRef}].`,
            details: "Service Role Key project reference mismatch."
          });
        }
      }
      const tempClient = createClient(cleanUrl, cleanKey);
      const { error } = await tempClient.from("users").select("id").limit(1);
      if (error) {
        return res.json({
          ok: false,
          error: error.message,
          details: "Connection failed even though format is correct. Check if your project is active."
        });
      }
      let envContent = "";
      if (fs.existsSync(".env")) {
        envContent = fs.readFileSync(".env", "utf8");
      }
      const setEnvVar = (content, name, value) => {
        const regex = new RegExp(`^${name}=.*$`, "m");
        if (regex.test(content)) {
          return content.replace(regex, `${name}=${value}`);
        } else {
          return content + `
${name}=${value}`;
        }
      };
      let newEnv = envContent;
      newEnv = setEnvVar(newEnv, "SUPABASE_URL", cleanUrl);
      newEnv = setEnvVar(newEnv, "VITE_SUPABASE_URL", cleanUrl);
      newEnv = setEnvVar(newEnv, "SUPABASE_ANON_KEY", cleanKey);
      newEnv = setEnvVar(newEnv, "VITE_SUPABASE_ANON_KEY", cleanKey);
      if (cleanServiceKey) {
        newEnv = setEnvVar(newEnv, "SUPABASE_SERVICE_ROLE_KEY", cleanServiceKey);
        process.env.SUPABASE_SERVICE_ROLE_KEY = cleanServiceKey;
      }
      fs.writeFileSync(".env", newEnv.trim() + "\n");
      process.env.SUPABASE_URL = cleanUrl;
      process.env.VITE_SUPABASE_URL = cleanUrl;
      process.env.SUPABASE_ANON_KEY = cleanKey;
      process.env.VITE_SUPABASE_ANON_KEY = cleanKey;
      resetGlobalSupabase();
      res.json({
        ok: true,
        message: "Configuration saved successfully! The server is now fully connected.",
        projectRefs: {
          url: extractProjectRef(cleanUrl),
          key: extractProjectRefFromKey(cleanKey)
        }
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  app.get("/api/user/balance", authenticateUser, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      if (supabase3.__isDummy) {
        return res.json({
          balance: 0,
          t_points: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          error: "Wallet service unavailable."
        });
      }
      const userId = req.profile?.id;
      const isAdmin2 = !!req.profile?.is_admin && [
        "samuelchukwuemeke05@gmail.com"
      ].includes(req.user?.email?.toLowerCase());
      const { data: earnings, error: eError } = await supabase3.from("transactions").select("amount").eq("user_id", userId).in("type", [
        "author_earning",
        "affiliate_commission",
        "referral_bonus",
        "trivia_win"
      ]);
      if (eError) throw eError;
      const totalEarnedCalculated = earnings?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const { data: rawWithdrawals, error: wError } = await supabase3.from("withdrawals").select("amount, status").eq("user_id", userId);
      if (wError) throw wError;
      const withdrawals = rawWithdrawals?.filter(
        (w) => w.status === "approved" || w.status === "paid" || w.status === "pending" || w.status === 1 || w.status === "1" || w.status === 0 || w.status === "0" || w.status === 3 || w.status === "3"
      ) || [];
      const totalWithdrawnCalculated = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;
      res.json({
        balance: req.profile?.wallet_balance || totalEarnedCalculated - totalWithdrawnCalculated,
        t_points: req.profile?.t_points || 0,
        totalEarned: req.profile?.total_earned || totalEarnedCalculated,
        totalWithdrawn: req.profile?.total_withdrawn || totalWithdrawnCalculated
      });
    } catch (err) {
      console.error("Fetch balance error:", err);
      res.status(500).json({ error: maskError(err, req.profile?.is_admin) });
    }
  });
  app.get("/api/user/transactions", authenticateUser, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const user = req.user;
      const userId = req.profile?.id || user.id;
      const { data, error } = await supabase3.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const cleanTransactions = (data || []).filter((t) => {
        if (!t.user_id) return false;
        if (t.buyer_email === "No Email") return false;
        if (t.type === "mock" || t.type === "test") return false;
        const ref = (t.paystack_reference || "").toLowerCase();
        if (ref.includes("mock") || ref.includes("test")) return false;
        if (t.amount === 100 && (ref.includes("free") || ref.startsWith("manual-admin") || ref.startsWith("manual-"))) return false;
        return true;
      });
      res.json({ transactions: cleanTransactions });
    } catch (err) {
      console.error("User transactions fetch error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/admin/withdrawals", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { data: withdrawals, error: withdrawalError } = await supabase3.from("withdrawals").select("*").eq("status", "pending").order("created_at", { ascending: true });
      if (withdrawalError) {
        console.error("Admin withdrawals fetch error:", withdrawalError);
        return res.json({ withdrawals: [], error: withdrawalError.message });
      }
      if (!withdrawals || withdrawals.length === 0) {
        return res.json({ withdrawals: [] });
      }
      const userIds = [
        ...new Set(withdrawals.map((w) => w.user_id))
      ].filter(Boolean);
      let userMap = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase3.from("users").select("id, email, full_name").in("id", userIds);
        if (usersError) {
          console.error(
            "Join users error for withdrawals:",
            usersError.message
          );
        } else {
          userMap = (users || []).reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }
      const withdrawalsWithUsers = withdrawals.map((w) => ({
        ...w,
        users: userMap[w.user_id] || {
          email: "Unknown",
          full_name: "Deleted User"
        }
      }));
      res.json({ withdrawals: withdrawalsWithUsers });
    } catch (err) {
      console.error("Admin withdrawals error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/admin/withdrawals", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { withdrawalId, action, admin_note } = req.body;
      if (action === "approve") {
        await supabase3.from("withdrawals").update({ status: "approved", processed_at: /* @__PURE__ */ new Date() }).eq("id", withdrawalId);
        const { data: withdrawal } = await supabase3.from("withdrawals").select("user_id, amount").eq("id", withdrawalId).single();
        if (withdrawal) {
          await supabase3.from("transactions").insert({
            user_id: withdrawal.user_id,
            type: "withdrawal",
            amount: -withdrawal.amount,
            status: "completed"
          });
        }
      } else if (action === "reject") {
        await supabase3.from("withdrawals").update({ status: "rejected", admin_note }).eq("id", withdrawalId);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Admin withdrawal action error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/admin/books", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      let allBooks = [];
      let booksError = null;
      const adminSelectStrategies = [
        // 1. Pure metadata without cards_json to avoid heavy payload entirely (limit 350)
        {
          select: "id, title, user_id, price, pdf_price, public_slug, is_published, status, cover_image, admin_note, report_count, created_at",
          limit: 350,
          desc: "pure metadata columns without cards_json with limit 350"
        },
        // 2. Fallback check with lower limit (limit 150)
        {
          select: "id, title, user_id, price, pdf_price, public_slug, is_published, status, cover_image, admin_note, report_count, created_at",
          limit: 150,
          desc: "pure metadata fallback limit 150"
        }
      ];
      for (const strategy of adminSelectStrategies) {
        try {
          const { data, error } = await supabase3.from("books").select(strategy.select).order("created_at", { ascending: false }).limit(strategy.limit);
          if (!error && data) {
            allBooks = data;
            booksError = null;
            break;
          } else {
            booksError = error;
            console.warn(
              `[Admin API] Strategy '${strategy.desc}' failed:`,
              error.message || error
            );
          }
        } catch (ex) {
          booksError = ex;
          console.error(
            `[Admin API] Strategy '${strategy.desc}' raised exception:`,
            ex.message || ex
          );
        }
      }
      if (booksError && allBooks.length === 0) {
        console.error(
          "Admin books fetch error after all strategies:",
          booksError
        );
        return res.json({
          books: [],
          error: typeof booksError === "object" ? booksError.message || JSON.stringify(booksError) : String(booksError)
        });
      }
      if (!allBooks || allBooks.length === 0) {
        return res.json({ books: [] });
      }
      const userIds = [...new Set(allBooks.map((b) => b.user_id))].filter(
        Boolean
      );
      let userMap = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase3.from("users").select("id, email, full_name").in("id", userIds);
        if (usersError) {
          console.error("Join users error for books:", usersError.message);
        } else {
          userMap = (users || []).reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }
      const booksWithUsers = (allBooks || []).map((book) => ({
        ...book,
        is_suspended: book.status === -2 || book.status === "-2" || book.is_suspended === true || book.is_suspended === 1,
        users: userMap[book.user_id] || {
          email: "Unknown Author",
          full_name: "Unknown Author"
        }
      }));
      res.json({ books: booksWithUsers });
    } catch (err) {
      console.error("Admin books error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/admin/books/:id", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const supabase3 = getSupabaseAdmin();
      const { data: book, error } = await supabase3.from("books").select("*").eq("id", id).maybeSingle();
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      if (book.user_id) {
        const { data: user } = await supabase3.from("users").select("id, email, full_name").eq("id", book.user_id).maybeSingle();
        if (user) {
          book.users = user;
        }
      }
      res.json({ book });
    } catch (err) {
      console.error("Fetch single book admin error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch book" });
    }
  });
  app.get("/api/admin/books/:id/cards", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const supabase3 = getSupabase();
      const { data, error } = await supabase3.from("books").select("cards_json").eq("id", id).maybeSingle();
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ cards_json: data?.cards_json || [] });
    } catch (err) {
      console.error("Fetch single book cards error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch book cards" });
    }
  });
  app.post("/api/admin/books", authenticateAdmin, async (req, res) => {
    try {
      const { bookId, action, admin_note } = req.body;
      const statusValue = action === "approve" ? 1 : -1;
      const supabase3 = getSupabase();
      const { error } = await supabase3.from("books").update({
        status: statusValue,
        admin_note: admin_note || null,
        is_published: action === "approve" ? 1 : 0
      }).eq("id", bookId);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      console.error("Admin book action error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/admin/books/review", authenticateAdmin, async (req, res) => {
    try {
      const { bookId, action, admin_note } = req.body;
      if (!bookId || !action) {
        return res.status(400).json({ error: "Missing bookId or action" });
      }
      const supabase3 = getSupabaseAdmin();
      const { data: book, error: fetchError } = await supabase3.from("books").select("title, user_id").eq("id", bookId).single();
      if (fetchError || !book) {
        return res.status(404).json({ error: "Book not found" });
      }
      const statusValue = action === "approve" ? 3 : 5;
      const isPublished = action === "approve" ? 1 : 0;
      const { error: updateError } = await supabase3.from("books").update({
        status: statusValue,
        admin_note: admin_note || null,
        is_published: isPublished
      }).eq("id", bookId);
      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
      const notificationTitle = action === "approve" ? "eBook Approved & Published! \u{1F680}" : "eBook Submission Declined \u274C";
      const notificationMessage = action === "approve" ? `Your eBook "${book.title}" has been approved and is now live on CalmReader!` : `your content doesn't align with our terms and policies please contact admin`;
      const { error: notifError } = await supabase3.from("author_notifications").insert({
        author_id: book.user_id,
        ebook_id: bookId,
        type: "compliance_review",
        title: notificationTitle,
        message: notificationMessage,
        is_read: false,
        metadata: { action, admin_note }
      });
      if (notifError) {
        console.error("Failed to insert compliance notification:", notifError.message);
      }
      if (action === "approve") {
        try {
          const { data: authorData } = await supabase3.from("users").select("email, full_name").eq("id", book.user_id).maybeSingle();
          const authorEmail = authorData?.email;
          if (authorEmail) {
            const brevoClient = getBrevo();
            if (brevoClient) {
              const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || "https://calmreader.app";
              const bookUrl = `${baseUrl}/read/${bookId}`;
              await brevoClient.transactionalEmails.sendTransacEmail({
                sender: { email: brevoSender, name: "CalmReader Publishing" },
                to: [{ email: authorEmail }],
                subject: `\u{1F389} Congratulations! Your eBook "${book.title}" is now published on CalmReader`,
                htmlContent: `
                  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
                    <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #f3f4f6;">
                      <h1 style="color: #059669; margin: 0; font-size: 24px; font-weight: 800;">\u{1F4DA} CalmReader Publishing</h1>
                    </div>
                    <div style="padding: 24px 0;">
                      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Congratulations, ${authorData.full_name || "Author"}! \u{1F389}</h2>
                      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Great news! Your eBook <strong>"${book.title}"</strong> has passed our compliance review and has been officially approved & published on CalmReader.</p>
                      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Readers worldwide can now discover, read, and purchase your literary work directly on the platform.</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${bookUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block;">View Your Live Book</a>
                      </div>
                    </div>
                    <div style="border-t: 1px solid #f3f4f6; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                      <p style="margin: 0;">CalmReader Publishing Team \u2022 Elevating Independent Authors</p>
                    </div>
                  </div>
                `
              });
              await supabase3.from("email_logs").insert({
                recipient_email: authorEmail,
                subject: `\u{1F389} Congratulations! Your eBook "${book.title}" is now published on CalmReader`,
                template_name: "author_congratulations_published",
                metadata: { bookId, title: book.title },
                status: "sent",
                sent_at: (/* @__PURE__ */ new Date()).toISOString()
              });
              console.log(`[Brevo Email] Author congratulations email sent to ${authorEmail} for book "${book.title}"`);
            }
          }
        } catch (emailErr) {
          console.error("Failed to send Brevo author congratulations email:", emailErr?.message || emailErr);
        }
      } else if (action === "reject" || action === "decline") {
        try {
          const { data: authorData } = await supabase3.from("users").select("email, full_name").eq("id", book.user_id).maybeSingle();
          const authorEmail = authorData?.email;
          if (authorEmail) {
            const brevoClient = getBrevo();
            if (brevoClient) {
              const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || "https://calmreader.app";
              await brevoClient.transactionalEmails.sendTransacEmail({
                sender: { email: brevoSender, name: "CalmReader Publishing Team" },
                to: [{ email: authorEmail }],
                subject: `Action Required: Revisions Requested for eBook "${book.title}"`,
                htmlContent: `
                  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
                    <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #f3f4f6;">
                      <h1 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 800;">\u{1F4DA} CalmReader Editorial Feedback</h1>
                    </div>
                    <div style="padding: 24px 0;">
                      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Hello ${authorData.full_name || "Author"},</h2>
                      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Our editorial team reviewed your eBook submission <strong>"${book.title}"</strong> and has requested a few adjustments before it can be published.</p>
                      
                      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 8px;">
                        <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px; text-transform: uppercase; font-weight: 800;">Editor Notes & Instructions:</h3>
                        <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5; white-space: pre-line;">${admin_note || "Please review your content formatting and ensure all chapters adhere to platform guidelines."}</p>
                      </div>

                      <p style="color: #374151; font-size: 15px; line-height: 1.6;">You can make the requested updates by opening your author dashboard and selecting "My Authored Books".</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}/my-books" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block;">Update Your eBook</a>
                      </div>
                    </div>
                    <div style="border-t: 1px solid #f3f4f6; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                      <p style="margin: 0;">CalmReader Editorial Team</p>
                    </div>
                  </div>
                `
              });
              await supabase3.from("email_logs").insert({
                recipient_email: authorEmail,
                subject: `Action Required: Revisions Requested for eBook "${book.title}"`,
                template_name: "author_revisions_requested",
                metadata: { bookId, title: book.title, admin_note },
                status: "sent",
                sent_at: (/* @__PURE__ */ new Date()).toISOString()
              });
              console.log(`[Brevo Email] Author revision feedback email sent to ${authorEmail} for book "${book.title}"`);
            }
          }
        } catch (emailErr) {
          console.error("Failed to send Brevo author revision email:", emailErr?.message || emailErr);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Admin book compliance review error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  const bookCoversCache = /* @__PURE__ */ new Map();
  app.get("/api/books/:id/cover", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
      const id = req.params.id;
      if (bookCoversCache.has(id)) {
        return res.json({ cover_image: bookCoversCache.get(id) });
      }
      const supabase3 = getSupabaseAdmin();
      const { data, error } = await supabase3.from("books").select("id, cover_image").eq("id", id).maybeSingle();
      if (error) {
        console.error(`[CoverFetch] Failed to fetch cover for book ${id}:`, error.message);
        return res.status(500).json({ error: error.message });
      }
      if (data && data.cover_image) {
        let coverUrl = data.cover_image;
        if (coverUrl && !coverUrl.startsWith("http") && !coverUrl.startsWith("data:")) {
          try {
            const { data: urlData } = supabase3.storage.from("media").getPublicUrl(coverUrl);
            coverUrl = urlData?.publicUrl || coverUrl;
          } catch (storageErr) {
            console.warn("[CoverFetch] Error getting media bucket public URL:", storageErr);
          }
        }
        bookCoversCache.set(id, coverUrl);
        return res.json({ cover_image: coverUrl });
      }
      return res.json({ cover_image: null });
    } catch (err) {
      console.error("[CoverFetch] Exception:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/books/public/:idOrSlug", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      const { idOrSlug } = req.params;
      if (!idOrSlug) {
        return res.status(400).json({ error: "Book identifier is required" });
      }
      const supabase3 = getSupabaseAdmin();
      let book = null;
      const { data: bySlug } = await supabase3.from("books").select("id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, cover_image, created_at, genre_id, report_count").eq("public_slug", idOrSlug).maybeSingle();
      if (bySlug) {
        book = bySlug;
      }
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      if (!book && isUUID) {
        const { data: byId } = await supabase3.from("books").select("id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, cover_image, created_at, genre_id, report_count").eq("id", idOrSlug).maybeSingle();
        if (byId) book = byId;
      }
      if (!book && /^\d+$/.test(idOrSlug)) {
        const { data: byNum } = await supabase3.from("books").select("id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, cover_image, created_at, genre_id, report_count").eq("id", parseInt(idOrSlug, 10)).maybeSingle();
        if (byNum) book = byNum;
      }
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      return res.json({ book });
    } catch (err) {
      console.error("[PublicBookFetch] Error fetching book:", err);
      return res.status(500).json({ error: "Failed to fetch book" });
    }
  });
  app.get("/book/:slug", (req, res) => {
    const { slug } = req.params;
    const { ref, aff } = req.query;
    const referral = ref || aff;
    if (referral) {
      return res.redirect(`/ebook/${encodeURIComponent(slug)}?ref=${encodeURIComponent(String(referral))}`);
    } else {
      return res.redirect(`/ebook/${encodeURIComponent(slug)}`);
    }
  });
  app.delete("/api/books/:id", authenticateUser, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      const id = req.params.id;
      console.log(
        `[DeleteBook] Attempting to delete book ${id} by user ${req.user.id}`
      );
      const { data: book, error: fetchError } = await supabase3.from("books").select("id, user_id, title, admin_note").eq("id", id).maybeSingle();
      if (fetchError || !book) {
        return res.status(fetchError ? 500 : 404).json({
          error: fetchError ? `Failed to verify book: ${fetchError.message}` : "Book not found"
        });
      }
      const isOwner = book.user_id === req.user.id;
      const adminEmails = [
        "samuelchukwuemeke05@gmail.com"
      ];
      const isAdmin2 = !!(adminEmails.includes(req.user?.email?.toLowerCase() || "") || req.profile?.is_admin || req.profile?.account_tier === "admin");
      if (!isOwner && !isAdmin2) {
        return res.status(403).json({ error: "Permission denied." });
      }
      const deletedTitle = `[DELETED] ${book.title}_${Date.now()}`;
      let updateQuery = supabase3.from("books").update({
        title: deletedTitle,
        status: -1,
        is_published: 0,
        admin_note: (book.admin_note || "") + ` [DELETED BY ${isAdmin2 ? "ADMIN" : "OWNER"}]`
      }).eq("id", id);
      if (!isAdmin2) {
        updateQuery = updateQuery.eq("user_id", req.user.id);
      }
      const { error: updateError } = await updateQuery;
      if (updateError) {
        console.warn("[DeleteBook] Soft-delete/rename update failed:", updateError.message);
      }
      try {
        await supabase3.from("transactions").update({ book_id: null }).eq("book_id", id);
      } catch (e) {
        console.warn("[DeleteBook] Failed to nullify book_id in transactions:", e.message || e);
      }
      const cleanupTables = [
        "discovery_items",
        "featured_content",
        "user_discovery_cache",
        "ebook_views",
        "trivia_questions",
        "trivias",
        "reported_content",
        "affiliate_links",
        "ebook_purchases",
        "daily_trivia_attempts",
        "user_trivia_attempts",
        "author_notifications",
        "reading_progress",
        "trivia_promos"
      ];
      for (const table of cleanupTables) {
        try {
          await supabase3.from(table).delete().eq("book_id", id);
        } catch (e) {
        }
        try {
          await supabase3.from(table).delete().eq("ebook_id", id);
        } catch (e) {
        }
        try {
          await supabase3.from(table).delete().eq("content_id", id);
        } catch (e) {
        }
      }
      let deleteQuery = supabase3.from("books").delete().eq("id", id);
      if (!isAdmin2) {
        deleteQuery = deleteQuery.eq("user_id", req.user.id);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.warn(
          "[DeleteBook] Hard delete failed, persistent soft delete applied:",
          deleteError.message
        );
        return res.status(200).json({
          success: true,
          status: "soft_deleted",
          message: `Book "${book.title}" was deactivated and hidden from the store. (Permanent history rows exist). Details: ${deleteError.message}`
        });
      }
      console.log(`[DeleteBook] Book ${id} deleted permanently.`);
      res.json({
        success: true,
        status: "permanently_deleted",
        message: `Book "${book.title}" was permanently deleted.`
      });
    } catch (err) {
      console.error("[DeleteBook] Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.get(
    ["/api/admin/download-project-zip", "/api/download-project-zip"],
    async (req, res) => {
      try {
        console.log(
          "[DownloadZip] Generating ZIP archive of project source..."
        );
        const zip = new AdmZip();
        const rootDir = process.cwd();
        const addDirToZip = (dirPath, zipPathPrefix) => {
          const items = fs.readdirSync(dirPath);
          for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const relativeZipPath = path.join(zipPathPrefix, item);
            if (item === "node_modules" || item === ".git" || item === "dist" || item === ".env" || item === ".env.local" || item === ".cache" || item === ".upm" || item === ".next" || item === "package-lock.json") {
              continue;
            }
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              addDirToZip(fullPath, relativeZipPath);
            } else {
              zip.addLocalFile(fullPath, zipPathPrefix);
            }
          }
        };
        addDirToZip(rootDir, "");
        const buffer = zip.toBuffer();
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=project-source.zip"
        );
        res.end(buffer);
        console.log("[DownloadZip] ZIP download completed successfully.");
      } catch (err) {
        console.error("[DownloadZip] Error:", err);
        res.status(500).json({ error: "Failed to generate zip file: " + err.message });
      }
    }
  );
  app.get("/api/admin/vault", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { data, error } = await supabase3.from("vault").select("*").order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") {
          return res.json({
            vault: [],
            needsMigration: true,
            message: "Vault table does not exist yet. Please execute the VAULT_SETUP.sql script in your Supabase SQL Editor."
          });
        }
        return res.status(500).json({ error: error.message });
      }
      res.json({ vault: data || [], needsMigration: false });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/admin/vault", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { title, type, content, tags, difficulty, image_url } = req.body;
      if (!title || !type || !content) {
        return res.status(400).json({ error: "Missing required fields: title, type, content" });
      }
      const { data, error } = await supabase3.from("vault").insert({
        title,
        type,
        content,
        tags: tags || null,
        difficulty: difficulty || "medium",
        image_url: image_url || null
      }).select("*").maybeSingle();
      if (error) {
        if (error.code === "42P01") {
          return res.status(400).json({ error: "Vault table does not exist yet. Please execute the VAULT_SETUP.sql script in your Supabase SQL Editor." });
        }
        return res.status(500).json({ error: error.message });
      }
      res.json({ success: true, item: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/admin/vault/:id", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { id } = req.params;
      const { error } = await supabase3.from("vault").delete().eq("id", id);
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post(
    "/api/admin/run-migrations",
    authenticateAdmin,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        const checks = [
          { table: "users", column: "is_approved_author" },
          { table: "users", column: "account_tier" },
          { table: "users", column: "tier_expires_at" },
          { table: "author_applications", column: "status" },
          { table: "upgrade_tokens", column: "benefit_duration_days" },
          { table: "trivias", column: "price" },
          { table: "trivias", column: "target_tier" },
          { table: "trivias", column: "promotional_writeup" }
        ];
        const missingFields = [];
        const missingTables = [];
        const { error: appErr } = await supabase3.from("author_applications").select("id").limit(1);
        if (appErr && appErr.code === "42P01")
          missingTables.push("author_applications");
        for (const check of checks) {
          try {
            const { error } = await supabase3.from(check.table).select(check.column).limit(1);
            if (error) {
              if (error.code === "42P01") {
                if (!missingTables.includes(check.table))
                  missingTables.push(check.table);
              } else if (error.message && (error.message.includes("column") || error.message.includes("not exist"))) {
                missingFields.push(`${check.table}.${check.column}`);
              }
            }
          } catch (e) {
            console.error(`Check failed for ${check.table}.${check.column}`);
          }
        }
        if (missingTables.length === 0 && missingFields.length === 0) {
          return res.json({
            success: true,
            message: "System health check passed. All tables and columns are present."
          });
        }
        res.json({
          success: false,
          message: "Schema mismatch detected.",
          missingTables,
          missingFields,
          action: "Please execute the migration script in your Supabase SQL Editor. You can find it in 'migrations.ts' or the Setup Wizard."
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      let { data: users, error } = await supabase3.from("users").select("id, email, full_name, username, account_tier, is_admin, is_premium, wallet_balance, t_points, created_at").order("created_at", { ascending: false });
      if (error) {
        console.warn("[Admin Users API] Querying users table failed, falling back to user_profiles_public:", error.message);
        const fallbackRes = await supabase3.from("user_profiles_public").select("id, full_name, username, account_tier, is_admin, is_premium, wallet_balance, t_points, created_at").order("created_at", { ascending: false });
        if (fallbackRes.error) return res.status(500).json({ error: fallbackRes.error.message });
        users = fallbackRes.data;
      }
      let sessionsMap = /* @__PURE__ */ new Map();
      try {
        const { data: sessions } = await supabase3.from("user_sessions").select("user_id, last_active_at");
        if (sessions) {
          sessions.forEach((s) => {
            if (s.user_id && s.last_active_at) {
              sessionsMap.set(s.user_id, s.last_active_at);
            }
          });
        }
      } catch (sessErr) {
        console.warn("[Admin Users API] Could not fetch user_sessions:", sessErr.message);
      }
      const usersWithSessions = (users || []).map((u) => ({
        ...u,
        last_active_at: sessionsMap.get(u.id) || null
      }));
      res.json({ users: usersWithSessions });
    } catch (err) {
      console.error("Admin users error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/admin/users/payout", authenticateAdmin, async (req, res) => {
    try {
      const { userId, bank_name, account_number, account_name } = req.body;
      const supabase3 = getSupabaseAdmin();
      const { error } = await supabase3.from("users").update({ bank_name, account_number, account_name }).eq("id", userId);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      const { userId: id, action, value } = req.body;
      let updateData = {};
      let targetTable = "users";
      if (action === "toggle_admin") {
        updateData.is_admin = !!value;
      } else if (action === "toggle_premium") {
        updateData.is_premium = !!value;
      } else if (action === "toggle_suspend") {
        updateData.is_suspended = !!value;
      } else if (action === "toggle_book_suspend") {
        updateData.status = value ? -2 : 1;
        targetTable = "books";
      }
      const { error } = await supabase3.from(targetTable).update(updateData).eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      console.error("Admin user action error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/admin/upgrade-tokens", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { data: tokens, error } = await supabase3.from("upgrade_tokens").select("*").order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ tokens: tokens || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/admin/upgrade-tokens", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { email, tier, expires_in_days, benefit_duration_days } = req.body;
      if (!tier)
        return res.status(400).json({ error: "Target tier is required" });
      console.log(
        `[Admin] Generating ${tier} token for ${email || "any user"}`
      );
      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      const daysValid = parseInt(expires_in_days) || 7;
      const benefitDays = benefit_duration_days ? parseInt(benefit_duration_days) : null;
      const tokenExpiresAt = new Date(
        Date.now() + daysValid * 24 * 60 * 60 * 1e3
      ).toISOString();
      const { data, error } = await supabase3.from("upgrade_tokens").insert({
        token,
        user_email: email || null,
        target_tier: tier,
        // Explicit assignment
        benefit_duration_days: benefitDays,
        token_expires_at: tokenExpiresAt
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, token: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete(
    "/api/admin/upgrade-tokens/:id",
    authenticateAdmin,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        const { id } = req.params;
        const { error } = await supabase3.from("upgrade_tokens").delete().eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.post("/api/admin/users/tier", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      const { userId, tier, duration_days } = req.body;
      const { data: user } = await supabase3.from("users").select("email").eq("id", userId).single();
      if (!user) return res.status(404).json({ error: "User not found" });
      const { error } = await supabase3.rpc("admin_set_user_tier", {
        p_email: user.email,
        p_new_tier: tier,
        p_duration_days: duration_days ? parseInt(duration_days) : null
      });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get(
    "/api/admin/user/:id/activity",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const supabase3 = getSupabase();
        const [userRes, booksRes, transRes, applyRes] = await Promise.all([
          supabase3.from("users").select("*").eq("id", id).single(),
          supabase3.from("books").select("*").eq("user_id", id),
          supabase3.from("transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }),
          supabase3.from("author_applications").select("*").eq("user_id", id)
        ]);
        if (userRes.error) throw userRes.error;
        if (applyRes.error) {
          console.warn(
            "[Admin API] Failed to fetch author applications for user activity, falling back to empty list:",
            applyRes.error
          );
        }
        if (booksRes.error) {
          console.warn(
            "[Admin API] Failed to fetch books for user activity:",
            booksRes.error
          );
        }
        if (transRes.error) {
          console.warn(
            "[Admin API] Failed to fetch transactions for user activity:",
            transRes.error
          );
        }
        let activities = [];
        try {
          const { data: actData } = await supabase3.from("user_activity").select("*").eq("user_id", id).order("created_at", { ascending: false });
          if (actData) activities = actData;
        } catch (e) {
          console.warn("[Admin User Activity] Failed to fetch user_activity:", e.message);
        }
        let session = null;
        try {
          const { data: sessData } = await supabase3.from("user_sessions").select("*").eq("user_id", id).maybeSingle();
          if (sessData) session = sessData;
        } catch (e) {
          console.warn("[Admin User Session] Failed to fetch user_sessions:", e.message);
        }
        res.json({
          profile: userRes.data,
          books: booksRes.data || [],
          transactions: transRes.data || [],
          applications: applyRes.data || [],
          activities,
          session
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  const logUserActivity = async (userId, action, metadata = null) => {
    try {
      const supabase3 = getSupabase();
      await supabase3.from("user_activity").insert({
        user_id: userId,
        action,
        metadata: metadata ? typeof metadata === "object" ? JSON.stringify(metadata) : String(metadata) : null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (e) {
      console.warn("[Tracking] Failed to log user activity:", e.message);
    }
  };
  app.post("/api/tracking/ping", authenticateUser, async (req, res) => {
    res.json({ success: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/tracking/activity", authenticateUser, async (req, res) => {
    try {
      const { action, metadata } = req.body;
      if (!action) return res.status(400).json({ error: "Action is required" });
      await logUserActivity(req.profile.id, action, metadata);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/redeem-token", authenticateUser, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { token } = req.body;
      console.log(
        `[Token] User ${req.user.email} attempting to claim token: ${token}`
      );
      const { data, error } = await supabase3.rpc("redeem_upgrade_token", {
        p_token: token
      });
      if (error) {
        console.error(`[Token] RPC Error claiming token ${token}:`, error);
        return res.status(500).json({ error: error.message });
      }
      if (!data.success) {
        return res.status(400).json({ error: data.error });
      }
      console.log(
        `[Token] SUCCESS: ${req.user.email} upgraded to ${data.new_tier}`
      );
      res.json({ success: true, new_tier: data.new_tier });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const results = await Promise.allSettled([
        supabase3.from("users").select("*", { count: "exact", head: true }),
        supabase3.from("users").select("*", { count: "exact", head: true }).or("is_premium.eq.true,is_premium.eq.1"),
        supabase3.from("books").select("*", { count: "exact", head: true }),
        supabase3.from("books").select("*", { count: "exact", head: true }).or("status.eq.0,status.eq.2"),
        supabase3.from("withdrawals").select("status"),
        supabase3.from("transactions").select("amount, commission"),
        supabase3.from("books").select("*", { count: "exact", head: true }).ilike("admin_note", "%type:blog%"),
        supabase3.from("books").select("*", { count: "exact", head: true }).ilike("admin_note", "%type:video%")
      ]);
      const getCount = (res2) => res2.status === "fulfilled" && !res2.value.error ? res2.value.count : 0;
      const getTransactions = (res2) => res2.status === "fulfilled" && !res2.value.error ? res2.value.data : [];
      const totalUsers = getCount(results[0]);
      const premiumUsers = getCount(results[1]);
      const totalBooks = getCount(results[2]);
      const pendingBooks = getCount(results[3]);
      const pendingWithdrawals = results[4].status === "fulfilled" && results[4].value.data ? results[4].value.data.filter((w) => w.status === "pending" || w.status === 0 || w.status === "0").length : 0;
      const transData = getTransactions(results[5]);
      const totalBlogs = getCount(results[6]);
      const totalVideos = getCount(results[7]);
      const totalRevenue = (transData || [])?.reduce(
        (sum, t) => sum + (t.commission || t.amount || 0),
        0
      ) || 0;
      res.json({
        stats: {
          totalUsers,
          premiumUsers,
          totalBooks,
          pendingBooks,
          pendingWithdrawals,
          totalRevenue,
          totalBlogs,
          totalVideos
        }
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/report/book", authenticateUser, async (req, res) => {
    try {
      const { book_id, reason } = req.body;
      const user = req.user;
      const supabase3 = getSupabase();
      const { error } = await supabase3.from("reported_content").insert({ book_id, reporter_id: user.id, reason });
      if (error) return res.status(500).json({ error: error.message });
      try {
        await supabase3.rpc("increment_book_report_count", { book_id });
      } catch (e) {
        console.warn(
          "RPC increment_book_report_count not available, skipping."
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Report book error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/referral/record", async (req, res) => {
    try {
      const { referrer_id, referred_id } = req.body;
      const supabase3 = getSupabase();
      let finalReferrerId = referrer_id;
      let finalReferredId = referred_id;
      if (referrer_id) {
        const { data: refUser } = await supabase3.from("users").select("id").eq("id", referrer_id).maybeSingle();
        if (refUser) {
          finalReferrerId = refUser.id;
        } else {
          const { data: mprUser } = await supabase3.from("users").select("id").ilike("mpr_code", referrer_id.trim()).maybeSingle();
          if (mprUser) {
            finalReferrerId = mprUser.id;
            console.log(
              `[Referral] Resolved MPR code ${referrer_id} to ${finalReferrerId}`
            );
          } else if (referrer_id.length === 8 && !referrer_id.includes("-")) {
            const { data: shortRef } = await supabase3.from("users").select("id").ilike("id", `${referrer_id}%`).limit(1).maybeSingle();
            if (shortRef) {
              finalReferrerId = shortRef.id;
              console.log(
                `[Referral] Resolved short code ${referrer_id} to ${finalReferrerId}`
              );
            }
          }
        }
      }
      if (referred_id) {
        const { data: newUser } = await supabase3.from("users").select("id").eq("id", referred_id).maybeSingle();
        if (newUser) finalReferredId = newUser.id;
      }
      const { error } = await supabase3.from("referrals").insert({
        referrer_id: finalReferrerId,
        referred_id: finalReferredId,
        reward_granted: false
      });
      if (error && !error.message.includes("unique constraint")) {
        console.error("Referral record error:", error);
        return res.status(400).json({ error: error.message });
      }
      if (finalReferrerId) {
        logMprAudit({
          mpr_id: finalReferrerId,
          action_type: "recruited_author",
          target_type: "referral",
          target_id: String(finalReferredId || "unknown"),
          details: { referrer_code: referrer_id, referred_id: finalReferredId },
          ip_address: req.ip
        });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Referral recording exception:", err);
      res.status(500).json({ error: "Failed to record referral" });
    }
  });
  app.post("/api/referral/track-click", async (req, res) => {
    try {
      const { ref, slug, book_id } = req.body;
      if (!ref) {
        return res.json({ success: false, message: "No referral code provided" });
      }
      const supabase3 = getSupabase();
      let referrerUserId = null;
      const cleanRef = String(ref).trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);
      if (isUUID) {
        const { data: uById } = await supabase3.from("users").select("id").eq("id", cleanRef).maybeSingle();
        if (uById) referrerUserId = uById.id;
      }
      if (!referrerUserId) {
        const { data: uByCode } = await supabase3.from("users").select("id").or(`referral_code.eq.${cleanRef},mpr_code.eq.${cleanRef}`).maybeSingle();
        if (uByCode) referrerUserId = uByCode.id;
      }
      if (!referrerUserId && cleanRef.length === 8 && !cleanRef.includes("-")) {
        const { data: uByPrefix } = await supabase3.from("users").select("id").ilike("id", `${cleanRef}%`).maybeSingle();
        if (uByPrefix) referrerUserId = uByPrefix.id;
      }
      if (referrerUserId) {
        try {
          await logMprAudit({
            mpr_id: referrerUserId,
            action_type: "referral_link_click",
            target_type: "ebook",
            target_id: String(book_id || slug || cleanRef),
            details: {
              ref_code: cleanRef,
              book_slug: slug,
              book_id,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            },
            ip_address: req.ip
          });
        } catch (logErr) {
          console.warn("[Referral Track] Non-critical logMprAudit notice:", logErr);
        }
      }
      console.log(`[Referral Track] Click tracked for ref: ${cleanRef}, book: ${slug || book_id || "unknown"}`);
      res.json({ success: true, referrer_id: referrerUserId });
    } catch (err) {
      console.warn("[Referral Track] Click tracking non-fatal error:", err?.message || err);
      res.json({ success: false, error: err?.message || "Failed to track click" });
    }
  });
  app.post("/api/referral/grant-reward", async (req, res) => {
    try {
      const { referred_user_id } = req.body;
      const supabase3 = getSupabase();
      const { data: referral } = await supabase3.from("referrals").select("*").eq("referred_id", referred_user_id).or("reward_granted.eq.0,reward_granted.eq.false").single();
      if (referral) {
        const rewardAmount = referral.reward_amount || 100;
        await supabase3.from("transactions").insert({
          user_id: referral.referrer_id,
          type: "referral_bonus",
          amount: rewardAmount,
          status: "completed"
        });
        await supabase3.rpc("increment_user_balance", {
          p_user_id: referral.referrer_id,
          p_wallet_delta: rewardAmount,
          p_total_earned_delta: rewardAmount
        });
        const updateVal = typeof referral.reward_granted === "number" ? 1 : true;
        await supabase3.from("referrals").update({ reward_granted: updateVal }).eq("id", referral.id);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Grant reward error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });
  app.get("/api/mpr/dashboard", authenticateUser, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const user = req.user;
      const profile = req.profile || {};
      const isMPR = profile.account_tier === "marketing_partner" || profile.account_tier === "mpr" || profile.role === "marketing_partner" || profile.is_admin === true || profile.account_tier === "admin";
      if (!isMPR) {
        return res.status(403).json({ error: "Access denied. Marketing Partner account required." });
      }
      let mprCode = profile.mpr_code;
      if (!mprCode) {
        mprCode = `MPR-${user.id.substring(0, 6).toUpperCase()}`;
        try {
          await supabase3.from("users").update({ mpr_code: mprCode }).eq("id", user.id);
        } catch (codeErr) {
          console.warn("[MPR] Auto code creation notice:", codeErr);
        }
      }
      const { data: rawReferrals } = await supabase3.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false });
      const referralList = rawReferrals || [];
      const referredUserIds = referralList.map((r) => r.referred_id).filter(Boolean);
      let recruits = [];
      if (referredUserIds.length > 0) {
        const { data: recruitedUsers } = await supabase3.from("users").select("id, email, full_name, username, account_tier, is_approved_author, is_premium, created_at").in("id", referredUserIds);
        const { data: authorBooks } = await supabase3.from("books").select("user_id, id").in("user_id", referredUserIds);
        const booksPerUser = (authorBooks || []).reduce((acc, b) => {
          acc[b.user_id] = (acc[b.user_id] || 0) + 1;
          return acc;
        }, {});
        recruits = (recruitedUsers || []).map((u) => {
          const refInfo = referralList.find((r) => r.referred_id === u.id);
          const bookCount = booksPerUser[u.id] || 0;
          const isAuthor = u.account_tier === "author" || u.is_approved_author || bookCount > 0;
          return {
            id: u.id,
            name: u.full_name || u.username || u.email || "Author Recruit",
            email: u.email,
            dateJoined: u.created_at || refInfo?.created_at || (/* @__PURE__ */ new Date()).toISOString(),
            status: isAuthor ? "approved" : "pending",
            isAuthor,
            bookCount,
            commissionEarned: isAuthor ? 1e3 + bookCount * 500 : 100
          };
        });
      }
      const { data: txs } = await supabase3.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      const mprCommissions = (txs || []).filter(
        (t) => ["mpr_commission", "affiliate_commission", "referral_bonus"].includes(t.type)
      );
      const totalEarnings = mprCommissions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const pendingCommissions = profile.pending_mpr_earnings || 0;
      const commissionRate = profile.mpr_commission_rate || 10;
      res.json({
        success: true,
        profile: {
          id: user.id,
          email: user.email,
          full_name: profile.full_name || user.email,
          username: profile.username || "",
          account_tier: profile.account_tier,
          role: profile.role || "marketing_partner",
          mpr_code: mprCode,
          mpr_commission_rate: commissionRate,
          total_mpr_earnings: Math.max(totalEarnings, profile.total_mpr_earnings || 0),
          pending_mpr_earnings: pendingCommissions,
          bank_name: profile.bank_name || "",
          account_number: profile.account_number || "",
          account_name: profile.account_name || ""
        },
        stats: {
          totalRecruits: referralList.length,
          totalAuthors: recruits.filter((r) => r.isAuthor).length,
          totalEarnings: Math.max(totalEarnings, profile.total_mpr_earnings || 0),
          pendingCommissions,
          activeCampaigns: 3,
          clicks: referralList.length * 7 + 14,
          ctr: "12.5%",
          conversionRate: referralList.length > 0 ? `${Math.round(recruits.filter((r) => r.isAuthor).length / referralList.length * 100)}%` : "10%"
        },
        recruits,
        commissions: mprCommissions
      });
    } catch (err) {
      console.error("[MPR] Dashboard error:", err);
      res.status(500).json({ error: err.message || "Failed to load MPR dashboard" });
    }
  });
  app.post("/api/mpr/update-code", authenticateUser, async (req, res) => {
    try {
      const { mpr_code } = req.body;
      if (!mpr_code || typeof mpr_code !== "string" || mpr_code.trim().length < 3) {
        return res.status(400).json({ error: "Code must be at least 3 characters long." });
      }
      const cleanCode = mpr_code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const supabase3 = getSupabase();
      const { data: existing } = await supabase3.from("users").select("id").eq("mpr_code", cleanCode).neq("id", req.user.id).maybeSingle();
      if (existing) {
        return res.status(400).json({ error: "This referral code is already taken by another user." });
      }
      const { error } = await supabase3.from("users").update({ mpr_code: cleanCode }).eq("id", req.user.id);
      if (error) throw error;
      res.json({ success: true, mpr_code: cleanCode });
    } catch (err) {
      console.error("[MPR] Code update error:", err);
      res.status(500).json({ error: err.message || "Failed to update MPR code" });
    }
  });
  app.post("/api/mpr/settings", authenticateUser, async (req, res) => {
    try {
      const { bank_name, account_number, account_name, mpr_code } = req.body;
      const supabase3 = getSupabase();
      const updates = {};
      if (bank_name !== void 0) updates.bank_name = bank_name;
      if (account_number !== void 0) updates.account_number = account_number;
      if (account_name !== void 0) updates.account_name = account_name;
      if (mpr_code) updates.mpr_code = mpr_code.trim().toUpperCase();
      const { error } = await supabase3.from("users").update(updates).eq("id", req.user.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("[MPR] Settings update error:", err);
      res.status(500).json({ error: err.message || "Failed to save MPR settings" });
    }
  });
  app.post("/api/mpr/withdraw", authenticateUser, async (req, res) => {
    try {
      const { amount, bank_name, account_number, account_name } = req.body;
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount < 1e3) {
        return res.status(400).json({ error: "Minimum withdrawal amount is \u20A61,000." });
      }
      const supabase3 = getSupabase();
      const user = req.user;
      const { error } = await supabase3.from("payment_requests").insert({
        user_id: user.id,
        amount: Math.round(numAmount),
        method: "mpr_payout",
        status: "pending",
        details: JSON.stringify({ bank_name, account_number, account_name })
      });
      if (error) throw error;
      logMprAudit({
        mpr_id: user.id,
        action_type: "requested_payout",
        target_type: "withdrawal",
        target_id: user.id,
        details: { amount: Math.round(numAmount), bank_name, account_number, account_name },
        ip_address: req.ip
      });
      res.json({ success: true, message: "Payout request submitted successfully." });
    } catch (err) {
      console.error("[MPR] Withdraw error:", err);
      res.status(500).json({ error: err.message || "Failed to process withdrawal request" });
    }
  });
  app.get("/api/admin/mpr/hub", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      const { data: rawUsers, error: usersErr } = await supabase3.from("users").select("id, email, full_name, username, account_tier, role, mpr_code, mpr_commission_rate, total_mpr_earnings, pending_mpr_earnings, bank_name, account_number, account_name, created_at, is_suspended, status, is_approved_author").or("account_tier.eq.marketing_partner,account_tier.eq.mpr,role.eq.marketing_partner,mpr_code.not.is.null").order("created_at", { ascending: false });
      if (usersErr) throw usersErr;
      const mprUsers = rawUsers || [];
      const mprIds = mprUsers.map((u) => u.id);
      const { data: allReferrals } = await supabase3.from("referrals").select("*").order("created_at", { ascending: false });
      const referralsList = allReferrals || [];
      const { data: allBooks } = await supabase3.from("books").select("user_id, id, title, price, status");
      const booksList = allBooks || [];
      const booksByUser = booksList.reduce((acc, b) => {
        if (b.user_id) {
          acc[b.user_id] = (acc[b.user_id] || 0) + 1;
        }
        return acc;
      }, {});
      const { data: allTxs } = await supabase3.from("transactions").select("*").or("type.eq.mpr_commission,type.eq.affiliate_commission,type.eq.referral_bonus").order("created_at", { ascending: false });
      const txsList = allTxs || [];
      const { data: allPayouts } = await supabase3.from("payment_requests").select("*").eq("method", "mpr_payout").order("created_at", { ascending: false });
      const payoutsList = allPayouts || [];
      const mprsWithStats = mprUsers.map((u) => {
        const userReferrals = referralsList.filter((r) => r.referrer_id === u.id);
        const recruitedIds = userReferrals.map((r) => r.referred_id);
        const authorsCount = recruitedIds.filter((id) => (booksByUser[id] || 0) > 0).length;
        const userTxs = txsList.filter((t) => t.user_id === u.id);
        const totalEarnings = userTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const userPayouts = payoutsList.filter((p) => p.user_id === u.id);
        const totalPaidOut2 = userPayouts.filter((p) => p.status === "approved" || p.status === "completed").reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const pendingPayout = userPayouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const status = u.is_suspended || u.status === "suspended" ? "suspended" : u.status || "active";
        return {
          id: u.id,
          name: u.full_name || u.username || u.email?.split("@")[0] || "MPR Partner",
          email: u.email,
          mpr_code: u.mpr_code || `MPR-${u.id.substring(0, 6).toUpperCase()}`,
          status,
          commission_rate: u.mpr_commission_rate || 10,
          total_recruits: userReferrals.length,
          total_authors: authorsCount,
          total_earnings: Math.max(totalEarnings, u.total_mpr_earnings || 0),
          total_paid: totalPaidOut2,
          pending_earnings: u.pending_mpr_earnings || pendingPayout,
          bank_name: u.bank_name || "",
          account_number: u.account_number || "",
          account_name: u.account_name || "",
          created_at: u.created_at
        };
      });
      const totalMprs = mprsWithStats.length;
      const activeMprs = mprsWithStats.filter((m) => m.status === "active").length;
      const suspendedMprs = mprsWithStats.filter((m) => m.status === "suspended").length;
      const totalRecruits = mprsWithStats.reduce((sum, m) => sum + m.total_recruits, 0);
      const totalAuthors = mprsWithStats.reduce((sum, m) => sum + m.total_authors, 0);
      const totalCommissions = mprsWithStats.reduce((sum, m) => sum + m.total_earnings, 0);
      const totalPaidOut = mprsWithStats.reduce((sum, m) => sum + m.total_paid, 0);
      const pendingCommissions = mprsWithStats.reduce((sum, m) => sum + m.pending_earnings, 0);
      res.json({
        success: true,
        overview: {
          totalMprs,
          activeMprs,
          suspendedMprs,
          totalRecruits,
          totalAuthors,
          totalCommissions,
          totalPaidOut,
          pendingCommissions
        },
        mprs: mprsWithStats
      });
    } catch (err) {
      console.error("[Admin MPR Hub] Overview error:", err);
      res.status(500).json({ error: err.message || "Failed to load MPR Hub data" });
    }
  });
  app.get("/api/admin/mpr/:id", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const supabase3 = getSupabaseAdmin();
      const { data: mprUser, error: userErr } = await supabase3.from("users").select("*").eq("id", id).single();
      if (userErr || !mprUser) {
        return res.status(404).json({ error: "Marketing Partner not found" });
      }
      const { data: userReferrals } = await supabase3.from("referrals").select("*").eq("referrer_id", id).order("created_at", { ascending: false });
      const referralList = userReferrals || [];
      const recruitedIds = referralList.map((r) => r.referred_id).filter(Boolean);
      let recruitedAuthors = [];
      if (recruitedIds.length > 0) {
        const { data: recUsers } = await supabase3.from("users").select("id, email, full_name, username, account_tier, is_approved_author, is_premium, created_at").in("id", recruitedIds);
        const { data: authorBooks } = await supabase3.from("books").select("user_id, id, title, price").in("user_id", recruitedIds);
        const booksMap = (authorBooks || []).reduce((acc, b) => {
          if (!acc[b.user_id]) acc[b.user_id] = [];
          acc[b.user_id].push(b);
          return acc;
        }, {});
        recruitedAuthors = (recUsers || []).map((u) => {
          const ref = referralList.find((r) => r.referred_id === u.id);
          const userBooks = booksMap[u.id] || [];
          const isAuthor = u.account_tier === "author" || u.is_approved_author || userBooks.length > 0;
          return {
            id: u.id,
            name: u.full_name || u.username || u.email,
            email: u.email,
            dateJoined: ref?.created_at || u.created_at,
            status: isAuthor ? "approved" : "pending",
            isAuthor,
            bookCount: userBooks.length,
            books: userBooks,
            rewardGranted: ref?.reward_granted || false
          };
        });
      }
      const { data: txs } = await supabase3.from("transactions").select("*").eq("user_id", id).order("created_at", { ascending: false });
      const { data: payouts } = await supabase3.from("payment_requests").select("*").eq("user_id", id).order("created_at", { ascending: false });
      res.json({
        success: true,
        mpr: {
          ...mprUser,
          mpr_code: mprUser.mpr_code || `MPR-${mprUser.id.substring(0, 6).toUpperCase()}`,
          status: mprUser.is_suspended || mprUser.status === "suspended" ? "suspended" : mprUser.status || "active"
        },
        recruits: recruitedAuthors,
        transactions: txs || [],
        payouts: payouts || []
      });
    } catch (err) {
      console.error("[Admin MPR Detail] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load MPR details" });
    }
  });
  app.post("/api/admin/mpr/:id/action", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, payload } = req.body;
      const supabase3 = getSupabaseAdmin();
      if (action === "set_status") {
        const { status } = payload;
        if (status === "deleted") {
          await supabase3.from("users").update({
            account_tier: "free",
            role: "user",
            status: "active",
            is_suspended: false
          }).eq("id", id);
        } else {
          const isSuspended = status === "suspended";
          await supabase3.from("users").update({
            status,
            is_suspended: isSuspended
          }).eq("id", id);
        }
        return res.json({ success: true, message: `MPR status updated to ${status}` });
      }
      if (action === "set_rate") {
        const { rate } = payload;
        const numRate = parseFloat(rate);
        if (isNaN(numRate) || numRate < 1 || numRate > 100) {
          return res.status(400).json({ error: "Commission rate must be between 1% and 100%." });
        }
        await supabase3.from("users").update({
          mpr_commission_rate: numRate
        }).eq("id", id);
        return res.json({ success: true, message: `Commission rate updated to ${numRate}%` });
      }
      if (action === "adjust_balance") {
        const { amount, reason, type = "credit" } = payload;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return res.status(400).json({ error: "Invalid adjustment amount." });
        }
        const delta = type === "credit" ? numAmount : -numAmount;
        await supabase3.from("transactions").insert({
          user_id: id,
          amount: delta,
          type: "mpr_commission",
          status: "successful",
          admin_note: reason || "Manual admin adjustment"
        });
        await supabase3.rpc("increment_user_balance", {
          p_user_id: id,
          p_wallet_delta: delta,
          p_total_earned_delta: type === "credit" ? delta : 0
        });
        return res.json({ success: true, message: `Balance adjusted by \u20A6${numAmount.toLocaleString()}` });
      }
      if (action === "send_notification") {
        const { subject, message } = payload;
        const { data: targetUser } = await supabase3.from("users").select("email, full_name").eq("id", id).single();
        if (targetUser && targetUser.email) {
          try {
            const brevoClient = getBrevo();
            if (brevoClient) {
              await brevoClient.transactionalEmails.sendTransacEmail({
                subject: subject || "Notification from CalmReader Admin",
                textContent: message,
                sender: { email: brevoSender, name: "CalmReader Executive Team" },
                to: [{ email: targetUser.email }]
              });
            }
          } catch (e) {
            console.warn("[Admin MPR] Email dispatch error:", e);
          }
        }
        return res.json({ success: true, message: "Notification dispatched to partner." });
      }
      if (action === "assign_mpr") {
        await supabase3.from("users").update({
          account_tier: "marketing_partner",
          role: "marketing_partner",
          status: "active",
          is_suspended: false
        }).eq("id", id);
        logMprAudit({
          mpr_id: id,
          admin_id: req.user?.id,
          action_type: "admin_updated_mpr",
          target_type: "profile",
          target_id: id,
          details: { action: "assign_mpr" },
          ip_address: req.ip
        });
        return res.json({ success: true, message: "User successfully upgraded to Marketing Partner!" });
      }
      return res.status(400).json({ error: "Unknown action provided" });
    } catch (err) {
      console.error("[Admin MPR Action] Error:", err);
      res.status(500).json({ error: err.message || "Failed to execute admin action" });
    }
  });
  const inMemoryAuditLogs = [];
  async function logMprAudit(entry) {
    const memoryRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      mpr_id: entry.mpr_id || null,
      admin_id: entry.admin_id || null,
      action_type: entry.action_type,
      target_type: entry.target_type,
      target_id: String(entry.target_id || ""),
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryAuditLogs.unshift(memoryRecord);
    if (inMemoryAuditLogs.length > 500) inMemoryAuditLogs.pop();
    try {
      const supabase3 = getSupabaseAdmin();
      await supabase3.from("mpr_audit_log").insert({
        mpr_id: memoryRecord.mpr_id,
        admin_id: memoryRecord.admin_id,
        action_type: memoryRecord.action_type,
        target_type: memoryRecord.target_type,
        target_id: memoryRecord.target_id,
        details: memoryRecord.details,
        ip_address: memoryRecord.ip_address,
        created_at: memoryRecord.created_at
      });
    } catch (dbErr) {
      console.warn("[MPR Audit] Notice: database insert bypassed, stored in memory cache:", dbErr?.message || dbErr);
    }
  }
  ;
  app.get("/api/admin/mpr/analytics", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      const { startDate, endDate, mprId } = req.query;
      let queryUsers = supabase3.from("users").select("id, email, full_name, username, account_tier, role, mpr_code, mpr_commission_rate, total_mpr_earnings, pending_mpr_earnings, bank_name, account_number, account_name, created_at, is_suspended, status").or("account_tier.eq.marketing_partner,account_tier.eq.mpr,role.eq.marketing_partner,mpr_code.not.is.null").order("created_at", { ascending: false });
      if (mprId) {
        queryUsers = queryUsers.eq("id", mprId);
      }
      const { data: rawUsers } = await queryUsers;
      const mprUsers = rawUsers || [];
      let queryReferrals = supabase3.from("referrals").select("*").order("created_at", { ascending: false });
      if (startDate) {
        queryReferrals = queryReferrals.gte("created_at", new Date(startDate).toISOString());
      }
      if (endDate) {
        queryReferrals = queryReferrals.lte("created_at", new Date(endDate).toISOString());
      }
      const { data: rawReferrals } = await queryReferrals;
      const referralsList = rawReferrals || [];
      const recruitedUserIds = Array.from(new Set(referralsList.map((r) => r.referred_id).filter(Boolean)));
      let recruitedUsersMap = {};
      if (recruitedUserIds.length > 0) {
        const { data: recUsers } = await supabase3.from("users").select("id, email, full_name, username, account_tier, is_approved_author, created_at").in("id", recruitedUserIds);
        (recUsers || []).forEach((u) => {
          recruitedUsersMap[u.id] = u;
        });
      }
      let authorBooksMap = {};
      if (recruitedUserIds.length > 0) {
        const { data: allBooks } = await supabase3.from("books").select("id, user_id, title, price, status").in("user_id", recruitedUserIds);
        (allBooks || []).forEach((b) => {
          if (!authorBooksMap[b.user_id]) authorBooksMap[b.user_id] = [];
          authorBooksMap[b.user_id].push(b);
        });
      }
      let authorRevenueMap = {};
      if (recruitedUserIds.length > 0) {
        const { data: authorTxs } = await supabase3.from("transactions").select("user_id, book_id, amount, type, status, created_at").in("user_id", recruitedUserIds).eq("status", "successful");
        (authorTxs || []).forEach((t) => {
          authorRevenueMap[t.user_id] = (authorRevenueMap[t.user_id] || 0) + (parseFloat(t.amount) || 0);
        });
      }
      const { data: allTxs } = await supabase3.from("transactions").select("*").or("type.eq.mpr_commission,type.eq.affiliate_commission,type.eq.referral_bonus").order("created_at", { ascending: false });
      const txsList = allTxs || [];
      const { data: allPayouts } = await supabase3.from("payment_requests").select("*").eq("method", "mpr_payout").order("created_at", { ascending: false });
      const payoutsList = allPayouts || [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString();
      let activeMprCount = 0;
      const mprPerformance = mprUsers.map((u) => {
        const userReferrals = referralsList.filter((r) => r.referrer_id === u.id);
        const recruits = userReferrals.map((r) => {
          const recUser = recruitedUsersMap[r.referred_id] || {};
          const userBooks = authorBooksMap[r.referred_id] || [];
          const isAuthor = recUser.account_tier === "author" || recUser.is_approved_author || userBooks.length > 0;
          const revenue = authorRevenueMap[r.referred_id] || 0;
          return {
            id: r.referred_id,
            name: recUser.full_name || recUser.username || recUser.email || "Recruit",
            email: recUser.email || "unknown@calmreader.com",
            account_tier: recUser.account_tier || "free",
            isAuthor,
            bookCount: userBooks.length,
            revenue,
            dateJoined: r.created_at || recUser.created_at || u.created_at,
            status: isAuthor ? "author" : "user"
          };
        });
        const authorsCount = recruits.filter((r) => r.isAuthor).length;
        const recruitsCount = recruits.length;
        const hasRecentRecruit = userReferrals.some((r) => r.created_at >= thirtyDaysAgo);
        if (hasRecentRecruit) activeMprCount++;
        const revenueGenerated = recruits.reduce((sum, r) => sum + r.revenue, 0);
        const userTxs = txsList.filter((t) => t.user_id === u.id);
        const commissionEarned = userTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const userPayouts = payoutsList.filter((p) => p.user_id === u.id);
        const commissionPaid = userPayouts.filter((p) => p.status === "approved" || p.status === "completed" || p.status === "paid").reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const commissionPending = userPayouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || (u.pending_mpr_earnings || 0);
        const clicksCount = Math.max(recruitsCount * 5 + 12, 1);
        const conversionRate = Number((recruitsCount / clicksCount * 100).toFixed(1));
        const authorConversionRate = recruitsCount > 0 ? Number((authorsCount / recruitsCount * 100).toFixed(1)) : 0;
        const status = u.is_suspended || u.status === "suspended" ? "suspended" : hasRecentRecruit ? "active" : "inactive";
        return {
          id: u.id,
          name: u.full_name || u.username || u.email?.split("@")[0] || "MPR Partner",
          email: u.email,
          mpr_code: u.mpr_code || `MPR-${u.id.substring(0, 6).toUpperCase()}`,
          status,
          commission_rate: u.mpr_commission_rate || 10,
          joined_at: u.created_at,
          recruitsCount,
          authorsCount,
          clicksCount,
          conversionRate,
          authorConversionRate,
          revenueGenerated,
          commissionEarned: Math.max(commissionEarned, u.total_mpr_earnings || 0),
          commissionPaid,
          commissionPending,
          triviaCreatedCount: 0,
          campaignsCount: 1,
          recruits
        };
      });
      const totalMprs = mprPerformance.length;
      const totalRecruits = mprPerformance.reduce((acc, m) => acc + m.recruitsCount, 0);
      const totalAuthors = mprPerformance.reduce((acc, m) => acc + m.authorsCount, 0);
      const totalRevenue = mprPerformance.reduce((acc, m) => acc + m.revenueGenerated, 0);
      const totalCommissionsPaid = mprPerformance.reduce((acc, m) => acc + m.commissionPaid, 0);
      const pendingCommissions = mprPerformance.reduce((acc, m) => acc + m.commissionPending, 0);
      res.json({
        success: true,
        overview: {
          totalMprs,
          activeMprs: activeMprCount,
          totalRecruits,
          activeAuthors: totalAuthors,
          totalRevenue,
          totalCommissionsPaid,
          pendingCommissions
        },
        mprs: mprPerformance,
        filters: { startDate: startDate || null, endDate: endDate || null, mprId: mprId || null }
      });
    } catch (err) {
      console.error("[MPR Analytics API] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load MPR analytics" });
    }
  });
  app.get(["/api/admin/mpr/:mprId/analytics", "/api/admin/mpr/[mprId]/analytics"], authenticateAdmin, async (req, res) => {
    try {
      const { mprId } = req.params;
      const supabase3 = getSupabaseAdmin();
      const { data: mprUser, error: uErr } = await supabase3.from("users").select("*").eq("id", mprId).single();
      if (uErr || !mprUser) {
        return res.status(404).json({ error: "MPR Partner not found" });
      }
      const { data: userReferrals } = await supabase3.from("referrals").select("*").eq("referrer_id", mprId).order("created_at", { ascending: false });
      const referralList = userReferrals || [];
      const recruitedIds = referralList.map((r) => r.referred_id).filter(Boolean);
      let recruits = [];
      let totalRevenueGenerated = 0;
      if (recruitedIds.length > 0) {
        const { data: recUsers } = await supabase3.from("users").select("id, email, full_name, username, account_tier, is_approved_author, created_at").in("id", recruitedIds);
        const { data: authorBooks } = await supabase3.from("books").select("id, user_id, title, price").in("user_id", recruitedIds);
        const { data: authorTxs } = await supabase3.from("transactions").select("user_id, amount, status").in("user_id", recruitedIds).eq("status", "successful");
        const booksMap = (authorBooks || []).reduce((acc, b) => {
          if (!acc[b.user_id]) acc[b.user_id] = [];
          acc[b.user_id].push(b);
          return acc;
        }, {});
        const txMap = (authorTxs || []).reduce((acc, t) => {
          acc[t.user_id] = (acc[t.user_id] || 0) + (parseFloat(t.amount) || 0);
          return acc;
        }, {});
        recruits = (recUsers || []).map((u) => {
          const ref = referralList.find((r) => r.referred_id === u.id);
          const userBooks = booksMap[u.id] || [];
          const isAuthor = u.account_tier === "author" || u.is_approved_author || userBooks.length > 0;
          const revenue = txMap[u.id] || 0;
          totalRevenueGenerated += revenue;
          return {
            id: u.id,
            name: u.full_name || u.username || u.email,
            email: u.email,
            dateJoined: ref?.created_at || u.created_at,
            status: isAuthor ? "approved_author" : "user",
            isAuthor,
            bookCount: userBooks.length,
            books: userBooks,
            revenue
          };
        });
      }
      const { data: txs } = await supabase3.from("transactions").select("*").eq("user_id", mprId).order("created_at", { ascending: false });
      const { data: payouts } = await supabase3.from("payment_requests").select("*").eq("user_id", mprId).order("created_at", { ascending: false });
      const commissionEarned = (txs || []).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const commissionPaid = (payouts || []).filter((p) => p.status === "approved" || p.status === "completed" || p.status === "paid").reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const commissionPending = (payouts || []).filter((p) => p.status === "pending").reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || (mprUser.pending_mpr_earnings || 0);
      let auditLogs = [];
      try {
        const { data: dbLogs } = await supabase3.from("mpr_audit_log").select("*").eq("mpr_id", mprId).order("created_at", { ascending: false }).limit(50);
        if (dbLogs) auditLogs = dbLogs;
      } catch (_) {
      }
      if (auditLogs.length === 0) {
        auditLogs = inMemoryAuditLogs.filter((l) => l.mpr_id === mprId);
      }
      const clicksCount = Math.max(recruits.length * 5 + 12, 1);
      const authorsCount = recruits.filter((r) => r.isAuthor).length;
      res.json({
        success: true,
        mpr: {
          ...mprUser,
          mpr_code: mprUser.mpr_code || `MPR-${mprUser.id.substring(0, 6).toUpperCase()}`,
          status: mprUser.is_suspended || mprUser.status === "suspended" ? "suspended" : mprUser.status || "active"
        },
        stats: {
          recruitsCount: recruits.length,
          authorsCount,
          clicksCount,
          conversionRate: Number((recruits.length / clicksCount * 100).toFixed(1)),
          authorConversionRate: recruits.length > 0 ? Number((authorsCount / recruits.length * 100).toFixed(1)) : 0,
          revenueGenerated: totalRevenueGenerated,
          commissionEarned: Math.max(commissionEarned, mprUser.total_mpr_earnings || 0),
          commissionPaid,
          commissionPending
        },
        recruits,
        commissions: txs || [],
        payouts: payouts || [],
        marketingActions: {
          triviaCreated: 0,
          campaignsLaunched: 1,
          linksShared: clicksCount
        },
        auditLogs
      });
    } catch (err) {
      console.error("[Single MPR Analytics] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load individual MPR analytics" });
    }
  });
  app.get("/api/admin/mpr/audit", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
      const offset = (page - 1) * limit;
      const { mprId, actionType, targetType, startDate, endDate, search } = req.query;
      let dbLogs = [];
      let totalCount = 0;
      let usedFallback = false;
      try {
        let query = supabase3.from("mpr_audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false });
        if (mprId) query = query.eq("mpr_id", mprId);
        if (actionType && actionType !== "all") query = query.eq("action_type", actionType);
        if (targetType && targetType !== "all") query = query.eq("target_type", targetType);
        if (startDate) query = query.gte("created_at", new Date(startDate).toISOString());
        if (endDate) query = query.lte("created_at", new Date(endDate).toISOString());
        const { data, count, error } = await query.range(offset, offset + limit - 1);
        if (!error && data) {
          dbLogs = data;
          totalCount = count || data.length;
        } else {
          usedFallback = true;
        }
      } catch (tableErr) {
        usedFallback = true;
      }
      if (usedFallback || dbLogs.length === 0) {
        let filteredMem = [...inMemoryAuditLogs];
        if (mprId) filteredMem = filteredMem.filter((l) => l.mpr_id === mprId);
        if (actionType && actionType !== "all") filteredMem = filteredMem.filter((l) => l.action_type === actionType);
        if (targetType && targetType !== "all") filteredMem = filteredMem.filter((l) => l.target_type === targetType);
        if (startDate) filteredMem = filteredMem.filter((l) => l.created_at >= new Date(startDate).toISOString());
        if (endDate) filteredMem = filteredMem.filter((l) => l.created_at <= new Date(endDate).toISOString());
        totalCount = Math.max(totalCount, filteredMem.length);
        dbLogs = filteredMem.slice(offset, offset + limit);
      }
      const userIdsToFetch = Array.from(/* @__PURE__ */ new Set([
        ...dbLogs.map((l) => l.mpr_id).filter(Boolean),
        ...dbLogs.map((l) => l.admin_id).filter(Boolean)
      ]));
      let userMap = {};
      if (userIdsToFetch.length > 0) {
        try {
          const { data: users } = await supabase3.from("users").select("id, email, full_name, username, mpr_code").in("id", userIdsToFetch);
          (users || []).forEach((u) => {
            userMap[u.id] = {
              name: u.full_name || u.username || u.email?.split("@")[0] || "User",
              email: u.email,
              mpr_code: u.mpr_code
            };
          });
        } catch (_) {
        }
      }
      const enrichedLogs = dbLogs.map((log) => ({
        ...log,
        mpr: log.mpr_id ? userMap[log.mpr_id] || { name: "MPR Partner", email: "" } : null,
        admin: log.admin_id ? userMap[log.admin_id] || { name: "Administrator", email: "" } : null
      }));
      let finalLogs = enrichedLogs;
      if (search && typeof search === "string" && search.trim()) {
        const q = search.toLowerCase();
        finalLogs = enrichedLogs.filter(
          (l) => l.action_type?.toLowerCase().includes(q) || l.target_type?.toLowerCase().includes(q) || l.mpr?.name?.toLowerCase().includes(q) || l.mpr?.email?.toLowerCase().includes(q) || JSON.stringify(l.details || {}).toLowerCase().includes(q)
        );
      }
      res.json({
        success: true,
        logs: finalLogs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1
        },
        summary: {
          total: totalCount,
          createdTrivia: inMemoryAuditLogs.filter((l) => l.action_type === "created_trivia").length,
          recruitedAuthor: inMemoryAuditLogs.filter((l) => l.action_type === "recruited_author").length,
          requestedPayout: inMemoryAuditLogs.filter((l) => l.action_type === "requested_payout").length
        }
      });
    } catch (err) {
      console.error("[MPR Audit Trail API] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load audit trail" });
    }
  });
  app.get("/api/mpr/audit/self", authenticateUser, async (req, res) => {
    try {
      const user = req.user;
      const profile = req.profile || {};
      const isMpr = profile.account_tier === "marketing_partner" || profile.account_tier === "mpr" || profile.role === "marketing_partner" || profile.is_admin === true || profile.account_tier === "admin";
      if (!isMpr) {
        return res.status(403).json({ error: "Access denied. Marketing Partner account required." });
      }
      const supabase3 = getSupabaseAdmin();
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
      const offset = (page - 1) * limit;
      let logs = [];
      let total = 0;
      try {
        const { data, count, error } = await supabase3.from("mpr_audit_log").select("*", { count: "exact" }).eq("mpr_id", user.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
        if (!error && data) {
          logs = data;
          total = count || data.length;
        }
      } catch (_) {
      }
      if (logs.length === 0) {
        const mem = inMemoryAuditLogs.filter((l) => l.mpr_id === user.id);
        total = mem.length;
        logs = mem.slice(offset, offset + limit);
      }
      res.json({
        success: true,
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      });
    } catch (err) {
      console.error("[MPR Self Audit] Error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch your audit logs" });
    }
  });
  app.post("/api/mpr/audit/record", async (req, res) => {
    try {
      const { action_type, target_type, target_id, details, mpr_code, mpr_id } = req.body;
      const supabase3 = getSupabase();
      let finalMprId = mpr_id;
      if (!finalMprId && mpr_code) {
        const { data: mprUser } = await supabase3.from("users").select("id").ilike("mpr_code", mpr_code.trim()).maybeSingle();
        if (mprUser) finalMprId = mprUser.id;
      }
      if (finalMprId) {
        await logMprAudit({
          mpr_id: finalMprId,
          action_type: action_type || "shared_link",
          target_type: target_type || "referral",
          target_id: target_id || "link",
          details: details || {},
          ip_address: req.ip
        });
      }
      res.json({ success: true });
    } catch (err) {
      console.warn("[MPR Audit Record Client] Notice:", err?.message || err);
      res.json({ success: false });
    }
  });
  app.post("/api/webhooks/user-confirmed", async (req, res) => {
    console.log("[Webhook User Confirmed] Received payload:", JSON.stringify(req.body));
    const webhookSecret = req.headers["x-webhook-secret"];
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.warn(`[Webhook User Confirmed] Unauthorized mismatch secret: expected: ${expectedSecret}, got: ${webhookSecret}`);
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const payload = req.body || {};
      const record = payload.record || {};
      const userEmail = record.email || payload.email || "Unknown email";
      const confirmedAt = record.confirmed_at || payload.confirmed_at || (/* @__PURE__ */ new Date()).toISOString();
      console.log(`[Webhook User Confirmed] User ${userEmail} confirmed email at ${confirmedAt}`);
      const brevoClient = getBrevo();
      const adminEmail = process.env.ADMIN_EMAIL || "samuelchukwuemeke05@gmail.com";
      if (brevoClient) {
        await brevoClient.transactionalEmails.sendTransacEmail({
          subject: `\u{1F389} New User Confirmed Email on CalmReader!`,
          textContent: `A new user (${userEmail}) has confirmed their email address at ${confirmedAt}.`,
          htmlContent: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e7ff; border-radius: 16px;">
              <h2 style="color: #4f46e5; margin-top: 0;">\u{1F389} New User Confirmed!</h2>
              <p>A new user has successfully confirmed their email address on CalmReader.</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px; color: #4b5563;">Email:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #1f2937;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #4b5563;">Confirmed At:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #1f2937;">${confirmedAt}</td>
                </tr>
              </table>
              <p style="margin-top: 20px; font-size: 11px; color: #9ca3af;">This notification was automatically sent via Supabase Database Webhook & CalmReader System.</p>
            </div>
          `,
          sender: { email: brevoSender, name: "CalmReader System" },
          to: [{ email: adminEmail }]
        });
        console.log(`[Webhook User Confirmed] Contact notification email successfully dispatched to ${adminEmail}`);
      } else {
        console.warn(`[Webhook User Confirmed] Brevo client is unconfigured. Logging notification output only: User ${userEmail} confirmed email.`);
      }
      return res.json({ success: true, message: "Webhook processed successfully" });
    } catch (err) {
      console.error("[Webhook User Confirmed] Critical failure processing payload:", err);
      return res.status(500).json({ error: "Internal processing failure", details: err.message });
    }
  });
  app.post("/api/paystack-webhook-legacy", async (req, res) => {
    const event = req.body;
    console.log(
      `[Paystack Webhook] Received event: ${event.event}`,
      JSON.stringify(event.data?.metadata)
    );
    if (event.event === "charge.success") {
      const { amount, metadata, customer, reference } = event.data;
      console.log(
        `[Paystack Webhook] Processing success for ${customer.email}, amount: ${amount}, reference: ${reference}`
      );
      const { book_id, affiliate_code, type } = metadata;
      const supabase3 = getSupabase();
      const saleAmount = amount / 100;
      if (type === "premium_upgrade") {
        const { data: user } = await supabase3.from("users").select("email").eq("email", customer.email).single();
        if (user) {
          await supabase3.rpc("admin_set_user_tier", {
            p_email: user.email,
            p_new_tier: "premium"
          });
          await supabase3.from("transactions").insert({
            user_id: user.id,
            type: "premium_upgrade",
            amount: saleAmount,
            status: "completed",
            paystack_reference: reference,
            commission: saleAmount
          });
          const { data: referral } = await supabase3.from("referrals").select("*").eq("referred_id", user.id).or("reward_granted.eq.0,reward_granted.eq.false").single();
          if (referral) {
            const bonusAmount = referral.reward_amount || 100;
            await supabase3.from("transactions").insert({
              user_id: referral.referrer_id,
              type: "referral_bonus",
              amount: bonusAmount,
              status: "completed"
            });
            await supabase3.rpc("increment_user_balance", {
              p_user_id: referral.referrer_id,
              p_wallet_delta: bonusAmount,
              p_total_earned_delta: bonusAmount
            });
            const rewardVal = typeof referral.reward_granted === "number" ? 1 : true;
            await supabase3.from("referrals").update({ reward_granted: rewardVal }).eq("id", referral.id);
          }
        }
      } else if (book_id) {
        let bookQuery = supabase3.from("books").select("id, user_id, price, content_type, author_share, platform_share, mpr_share, mpr_referral_code, admin_note, users(id, is_admin, email, referred_by_mpr, mpr_referral_locked)").eq("id", book_id).single();
        let { data: book, error: bErr } = await bookQuery;
        if (bErr && (bErr.message?.includes("column") || bErr.message?.includes("does not exist"))) {
          const { data: fbBook } = await supabase3.from("books").select("id, user_id, price, users(id, is_admin, email)").eq("id", book_id).single();
          book = fbBook;
        }
        if (book) {
          let isLaneB = false;
          const rawLane = (book.publishing_lane || book.content_type || "").toLowerCase();
          if (rawLane === "lane_b" || rawLane === "ipc" || rawLane === "independent") {
            isLaneB = true;
          } else if (book.admin_note && (book.admin_note.includes("content_type=ipc") || book.admin_note.includes("lane_b"))) {
            isLaneB = true;
          }
          const isPlatformOwner = book.users?.is_admin === true || book.users?.is_admin === 1;
          let processingFee = saleAmount * 0.015;
          if (saleAmount >= 2500) {
            processingFee += 100;
          }
          processingFee = Math.min(2e3, Math.round(processingFee));
          const netRevenue = Math.max(0, saleAmount - processingFee);
          let referringMprId = book.users?.referred_by_mpr || null;
          if (!referringMprId && book.mpr_referral_code) {
            const { data: mprUser } = await supabase3.from("users").select("id, email, is_suspended").or(`referral_code.eq.${book.mpr_referral_code},username.ilike.${book.mpr_referral_code}`).limit(1).maybeSingle();
            if (mprUser && mprUser.id !== book.user_id && mprUser.email !== book.users?.email && !mprUser.is_suspended) {
              referringMprId = mprUser.id;
              await supabase3.from("users").update({
                referred_by_mpr: mprUser.id,
                mpr_assigned_at: (/* @__PURE__ */ new Date()).toISOString()
              }).eq("id", book.user_id);
            }
          }
          if (referringMprId === book.user_id) {
            referringMprId = null;
          }
          if (referringMprId && !book.users?.mpr_referral_locked) {
            await supabase3.from("users").update({ mpr_referral_locked: true }).eq("id", book.user_id);
          }
          let authorAmount = 0;
          let mprAmount = 0;
          let platformNet = 0;
          let mprType = "none";
          if (isPlatformOwner) {
            authorAmount = netRevenue;
            platformNet = 0;
            mprAmount = 0;
          } else if (isLaneB) {
            authorAmount = Math.round(netRevenue * 0.7);
            const rawPlatformShare = netRevenue - authorAmount;
            if (referringMprId) {
              mprAmount = Math.round(rawPlatformShare * 0.05);
              mprType = "mpr_referral_bonus";
            }
            platformNet = rawPlatformShare - mprAmount;
          } else {
            authorAmount = Math.round(netRevenue * 0.3);
            if (referringMprId) {
              mprAmount = Math.round(netRevenue * 0.2);
              mprType = "mpr_commission";
            }
            platformNet = netRevenue - authorAmount - mprAmount;
          }
          const transactionType = type === "pdf_purchase" ? "pdf_purchase" : "author_earning";
          await supabase3.from("transactions").insert({
            user_id: book.user_id,
            type: transactionType,
            amount: authorAmount,
            book_id,
            status: "completed",
            paystack_reference: reference,
            commission: platformNet + processingFee
          });
          await supabase3.rpc("increment_user_balance", {
            p_user_id: book.user_id,
            p_wallet_delta: authorAmount,
            p_total_earned_delta: authorAmount
          });
          if (referringMprId && mprAmount > 0) {
            await supabase3.from("transactions").insert({
              user_id: referringMprId,
              type: mprType,
              amount: mprAmount,
              book_id,
              status: "completed",
              paystack_reference: reference,
              commission: 0
            });
            await supabase3.rpc("increment_user_balance", {
              p_user_id: referringMprId,
              p_wallet_delta: mprAmount,
              p_total_earned_delta: mprAmount
            });
          }
          const isIpc = isLaneB || book?.publishing_lane === "ipc";
          if (!isIpc) {
            try {
              const { count: totalSales } = await supabase3.from("transactions").select("*", { count: "exact", head: true }).eq("book_id", book_id).eq("status", "completed");
              if ((totalSales || 0) >= 100) {
                await supabase3.from("books").update({ ipc_conversion_status: "eligible" }).eq("id", book_id).eq("ipc_conversion_status", "none");
              }
            } catch (salesErr) {
              console.warn("[IPC Sales Check Warning]", salesErr.message);
            }
          }
          if (affiliate_code) {
            const affiliateShare = 0.1;
            const { data: affiliateLink } = await supabase3.from("affiliate_links").select("affiliate_id, id").eq("affiliate_code", affiliate_code).single();
            if (affiliateLink) {
              const commissionAmount = Math.round(saleAmount * affiliateShare);
              await supabase3.from("transactions").insert({
                user_id: affiliateLink.affiliate_id,
                type: "affiliate_commission",
                amount: commissionAmount,
                book_id,
                affiliate_link_id: affiliateLink.id,
                status: "completed",
                paystack_reference: reference
              });
              await supabase3.rpc("increment_user_balance", {
                p_user_id: affiliateLink.affiliate_id,
                p_wallet_delta: commissionAmount,
                p_total_earned_delta: commissionAmount
              });
              await supabase3.rpc("increment_affiliate_clicks", {
                link_id: affiliateLink.id
              });
            }
          }
          const { data: buyer } = await supabase3.from("users").select("id").eq("email", customer.email).single();
          if (buyer) {
            const { data: referral } = await supabase3.from("referrals").select("*").eq("referred_id", buyer.id).eq("reward_granted", 0).single();
            if (referral) {
              const bonusAmount = referral.reward_amount || 100;
              await supabase3.from("transactions").insert({
                user_id: referral.referrer_id,
                type: "referral_bonus",
                amount: bonusAmount,
                status: "completed"
              });
              await supabase3.rpc("increment_user_balance", {
                p_user_id: referral.referrer_id,
                p_wallet_delta: bonusAmount,
                p_total_earned_delta: bonusAmount
              });
              await supabase3.from("referrals").update({ reward_granted: 1 }).eq("id", referral.id);
            }
          }
          if (buyer) {
            console.log(
              `[Webhook] Granting access to ${customer.email} for book ${book_id}`
            );
            await supabase3.from("transactions").insert({
              user_id: buyer.id,
              book_id,
              buyer_email: customer.email,
              amount: saleAmount,
              type: "purchase",
              status: "successful",
              paystack_reference: reference
            });
            try {
              const { data: existingEpic } = await supabase3.from("ebook_purchases").select("*").eq("user_id", buyer.id).eq("ebook_id", book_id).maybeSingle();
              if (!existingEpic) {
                await supabase3.from("ebook_purchases").insert({
                  user_id: buyer.id,
                  ebook_id: book_id,
                  purchase_id: reference ? void 0 : void 0
                  // optional column
                });
                console.log(`[Webhook] ebook_purchases safe record inserted for user ${buyer.id} and book ${book_id}`);
              } else {
                console.log(`[Webhook] ebook_purchases entry already exists for user ${buyer.id} and book ${book_id}`);
              }
            } catch (e) {
              console.log(
                "[Webhook] ebook_purchases safe insert skipped:",
                e.message || e
              );
            }
          }
        }
      }
    }
    res.sendStatus(200);
  });
  app.get("/api/user/purchases", authenticateUser, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const userId = req.profile?.id;
      let purchased_ids = [];
      try {
        const { data, error } = await supabase3.from("ebook_purchases").select("ebook_id").eq("user_id", userId);
        if (error) throw error;
        purchased_ids = (data || []).map((p) => p.ebook_id);
      } catch (dbErr) {
        console.log("[Purchases API] Using transactions table fallback.");
        const { data, error } = await supabase3.from("transactions").select("book_id").eq("user_id", userId).eq("status", "successful").eq("type", "purchase");
        if (error) throw error;
        purchased_ids = (data || []).map((p) => p.book_id).filter(Boolean);
      }
      res.json({ purchased_ids });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/author/stats", authenticateUser, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      if (supabase3.__isDummy) return res.json({ stats: [] });
      const authorId = req.profile?.id;
      const { data: authorBooks } = await supabase3.from("books").select("id, title").eq("user_id", authorId).neq("status", -1);
      if (!authorBooks || authorBooks.length === 0) {
        return res.json({ stats: [] });
      }
      const bookIds = authorBooks.map((b) => b.id);
      const { data: salesData } = await supabase3.from("transactions").select(
        `
          id,
          book_id, 
          amount, 
          type, 
          created_at,
          users!transactions_user_id_fkey (
            id,
            email,
            full_name
          )
        `
      ).in("book_id", bookIds).eq("status", "completed").order("created_at", { ascending: false });
      const { data: triviaData } = await supabase3.from("daily_trivia_attempts").select("ebook_id").in("ebook_id", bookIds);
      const stats = authorBooks.map((book) => {
        const bookSales = (salesData || []).filter(
          (s) => s.book_id === book.id
        );
        const salesCount = bookSales.length;
        const revenue = bookSales.reduce((sum, s) => sum + s.amount, 0);
        const participants = (triviaData || []).filter(
          (t) => t.ebook_id === book.id
        ).length;
        return {
          id: book.id,
          title: book.title,
          salesCount,
          revenue,
          participants,
          recentSales: bookSales.slice(0, 5).map((s) => ({
            id: s.id,
            amount: s.amount,
            date: s.created_at,
            buyer: s.users
          }))
        };
      });
      res.json({
        stats,
        summary: {
          totalSales: stats.reduce((sum, s) => sum + s.salesCount, 0),
          totalRevenue: stats.reduce((sum, s) => sum + s.revenue, 0),
          totalParticipants: stats.reduce((sum, s) => sum + s.participants, 0)
        }
      });
    } catch (err) {
      console.error("Author stats fetch error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });
  app.post("/api/author/takedown/request", authenticateUser, async (req, res) => {
    try {
      const { bookId, reason } = req.body;
      if (!bookId || !reason) {
        return res.status(400).json({ error: "Book ID and reason are required." });
      }
      const userId = req.profile?.id || req.user?.id;
      const supabase3 = getSupabaseAdmin();
      const { data: book, error: bookErr } = await supabase3.from("books").select("id, title, user_id").eq("id", bookId).single();
      if (bookErr || !book) {
        return res.status(404).json({ error: "Book not found." });
      }
      if (String(book.user_id) !== String(userId) && !req.profile?.is_admin) {
        return res.status(403).json({ error: "You are not authorized to request takedown for this book." });
      }
      const { data: requestData, error: insertErr } = await supabase3.from("takedown_requests").insert({
        book_id: bookId,
        author_id: userId,
        reason: reason.trim(),
        status: "pending",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }).select().single();
      if (insertErr) {
        console.warn("[Takedown Request] Insert warning:", insertErr.message);
      }
      await supabase3.from("books").update({ status: "takedown_requested" }).eq("id", bookId);
      return res.json({ success: true, request: requestData || { book_id: bookId, reason } });
    } catch (err) {
      console.error("Takedown request API error:", err);
      res.status(500).json({ error: err.message || "Failed to submit takedown request." });
    }
  });
  app.get("/api/admin/takedown/requests", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      const { data: requests, error } = await supabase3.from("takedown_requests").select("*").order("created_at", { ascending: false });
      if (error || !requests) {
        return res.json({ requests: [] });
      }
      const bookIds = [...new Set(requests.map((r) => r.book_id))].filter(Boolean);
      const authorIds = [...new Set(requests.map((r) => r.author_id))].filter(Boolean);
      let bookMap = {};
      let authorMap = {};
      if (bookIds.length > 0) {
        const { data: books } = await supabase3.from("books").select("id, title, cover_image, is_published, status").in("id", bookIds);
        if (books) {
          bookMap = books.reduce((acc, b) => {
            acc[b.id] = b;
            return acc;
          }, {});
        }
      }
      if (authorIds.length > 0) {
        const { data: authors } = await supabase3.from("users").select("id, email, full_name").in("id", authorIds);
        if (authors) {
          authorMap = authors.reduce((acc, a) => {
            acc[a.id] = a;
            return acc;
          }, {});
        }
      }
      const mappedRequests = requests.map((r) => ({
        ...r,
        books: bookMap[r.book_id] || { title: "Unknown Book" },
        users: authorMap[r.author_id] || { email: "Unknown Author" }
      }));
      res.json({ requests: mappedRequests });
    } catch (err) {
      console.error("Admin takedowns fetch error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.post("/api/admin/takedown/approve", authenticateAdmin, async (req, res) => {
    try {
      const { requestId } = req.body;
      if (!requestId) return res.status(400).json({ error: "Request ID is required." });
      const supabase3 = getSupabaseAdmin();
      const { data: request, error: reqErr } = await supabase3.from("takedown_requests").select("*").eq("id", requestId).single();
      if (reqErr || !request) {
        return res.status(404).json({ error: "Takedown request not found." });
      }
      await supabase3.from("takedown_requests").update({
        status: "approved",
        resolved_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", requestId);
      await supabase3.from("books").update({
        status: -1,
        is_published: 0
      }).eq("id", request.book_id);
      await supabase3.from("author_notifications").insert({
        author_id: request.author_id,
        ebook_id: request.book_id,
        type: "takedown_approved",
        title: "eBook Takedown Approved \u{1F5D1}\uFE0F",
        message: "Your request to take down your eBook has been approved by admin and the content has been archived.",
        is_read: false,
        metadata: { requestId }
      }).catch(() => {
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Approve takedown error:", err);
      res.status(500).json({ error: err.message || "Failed to approve takedown request." });
    }
  });
  app.post("/api/admin/takedown/reject", authenticateAdmin, async (req, res) => {
    try {
      const { requestId, adminNote } = req.body;
      if (!requestId) return res.status(400).json({ error: "Request ID is required." });
      const supabase3 = getSupabaseAdmin();
      const { data: request, error: reqErr } = await supabase3.from("takedown_requests").select("*").eq("id", requestId).single();
      if (reqErr || !request) {
        return res.status(404).json({ error: "Takedown request not found." });
      }
      await supabase3.from("takedown_requests").update({
        status: "rejected",
        admin_note: adminNote || null,
        resolved_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", requestId);
      await supabase3.from("books").update({
        status: 1,
        is_published: 1
      }).eq("id", request.book_id);
      await supabase3.from("author_notifications").insert({
        author_id: request.author_id,
        ebook_id: request.book_id,
        type: "takedown_rejected",
        title: "eBook Takedown Request Declined \u274C",
        message: `Your takedown request was reviewed and declined. ${adminNote ? `Admin Note: "${adminNote}"` : ""}`,
        is_read: false,
        metadata: { requestId, adminNote }
      }).catch(() => {
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Reject takedown error:", err);
      res.status(500).json({ error: err.message || "Failed to reject takedown request." });
    }
  });
  app.get("/api/admin/books/pending", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      let { data: books, error } = await supabase3.from("books").select("id, title, user_id, price, pdf_price, public_slug, is_published, status, cover_image, admin_note, report_count, created_at").in("status", [1, 2]).order("created_at", { ascending: false });
      if (error) {
        console.warn("[Admin API] Pending books primary query warning:", error.message);
        const { data: fallbackBooks, error: fallbackError } = await supabase3.from("books").select("id, title, user_id, price, status, is_published, created_at").in("status", [1, 2]).order("created_at", { ascending: false });
        if (fallbackError) {
          console.error("[Admin API] Pending books fallback query failed:", fallbackError.message);
          return res.status(500).json({ error: fallbackError.message || "Failed to query pending books", books: [] });
        }
        books = fallbackBooks || [];
      }
      if (!books) {
        books = [];
      }
      const userIds = [...new Set(books.map((b) => b.user_id))].filter(Boolean);
      let userMap = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase3.from("users").select("id, email, full_name").in("id", userIds);
        if (users) {
          userMap = users.reduce((acc, u) => {
            acc[u.id] = u;
            return acc;
          }, {});
        }
      }
      const mappedBooks = books.map((b) => ({
        ...b,
        users: userMap[b.user_id] || { email: "Unknown User", full_name: "Unknown User" }
      }));
      return res.json({ books: mappedBooks });
    } catch (err) {
      console.error("Fetch pending books error:", err);
      return res.status(500).json({ error: err.message || "Internal server error", books: [] });
    }
  });
  app.get("/api/admin/books/submitted", authenticateAdmin, async (req, res) => {
    req.url = "/api/admin/books/pending";
    return app._router.handle(req, res);
  });
  app.get(
    "/api/author/notifications",
    authenticateUser,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        if (supabase3.__isDummy)
          return res.json({ notifications: [], unreadCount: 0 });
        const authorId = req.profile?.id || req.user?.id;
        if (!authorId) {
          return res.status(400).json({ error: "Missing author identity" });
        }
        const { data, error } = await supabase3.from("author_notifications").select("*").eq("author_id", authorId).order("created_at", { ascending: false });
        if (error) {
          if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
            console.warn(
              "[Notifications] public.author_notifications table missing."
            );
            return res.json({
              notifications: [],
              unreadCount: 0,
              warning: "Author notifications table does not exist in your database schema yet. Please apply the migration."
            });
          }
          return res.status(500).json({ error: error.message });
        }
        const unreadCount = (data || []).filter((n) => !n.is_read).length;
        res.json({
          notifications: data || [],
          unreadCount
        });
      } catch (err) {
        console.error("Author notifications fetch exception:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  app.post(
    "/api/author/notifications/mark-read",
    authenticateUser,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        if (supabase3.__isDummy) return res.json({ success: true });
        const authorId = req.profile?.id || req.user?.id;
        if (!authorId) {
          return res.status(400).json({ error: "Missing author identity" });
        }
        const { notificationIds, all } = req.body;
        let query = supabase3.from("author_notifications").update({ is_read: true, read_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("author_id", authorId);
        if (!all && Array.isArray(notificationIds) && notificationIds.length > 0) {
          query = query.in("id", notificationIds);
        } else if (!all) {
          return res.status(400).json({ error: "Either specify notificationIds or set all=true" });
        }
        const { error } = await query;
        if (error) {
          if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
            return res.json({
              success: false,
              error: "Notification table not created yet. Please apply migrations in Setup or Admin Panel."
            });
          }
          return res.status(500).json({ error: error.message });
        }
        res.json({ success: true });
      } catch (err) {
        console.error("Marking notifications read exception:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  app.get("/api/supabase-config", (req, res) => {
    try {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      let key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
      if (!key) {
        key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
      }
      res.json({ url, key });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/supabase-proxy", async (req, res) => {
    try {
      const { url, method = "GET", headers = {}, body } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Target URL is required." });
      }
      const configuredUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://wgdcroglmhzmrvqrixku.supabase.co";
      const targetHost = new URL(url).hostname;
      const configuredHost = new URL(configuredUrl).hostname;
      if (targetHost !== configuredHost) {
        return res.status(403).json({ error: "Access to non-configured Supabase project forbidden." });
      }
      const cleanHeaders = {};
      for (const [k, v] of Object.entries(headers)) {
        const lower = k.toLowerCase();
        if (lower !== "host" && lower !== "connection" && lower !== "content-length") {
          cleanHeaders[k] = String(v);
        }
      }
      if (!cleanHeaders["apikey"]) {
        const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        if (anonKey) cleanHeaders["apikey"] = anonKey;
      }
      const fetchOptions = {
        method,
        headers: cleanHeaders
      };
      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }
      const response = await fetch(url, fetchOptions);
      const responseText = await response.text();
      const responseHeaders = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });
      return res.json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseText
      });
    } catch (err) {
      console.error("[Supabase Proxy] Request error:", err);
      return res.status(500).json({ error: err?.message || "Proxy request failed" });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    try {
      const supabase3 = getSupabase();
      const { data, error } = await supabase3.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({
        session: data.session,
        user: data.user
      });
    } catch (err) {
      console.error("[Auth Login] Server login error:", err);
      return res.status(500).json({ error: err?.message || "Login failed" });
    }
  });
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, fullName, username, phoneNumber, dateOfBirth } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    try {
      const supabase3 = getSupabase();
      const admin = getSupabaseAdmin();
      const appUrl = process.env.APP_URL || "https://calmreader1.pages.dev";
      if (phoneNumber) {
        const cleanPhone = phoneNumber.trim();
        const { data: existingPhone } = await admin.from("users").select("id").or(`contact.eq.${cleanPhone},phone.eq.${cleanPhone}`).maybeSingle();
        if (existingPhone) {
          return res.status(400).json({ error: "This phone number is already registered to another account." });
        }
      }
      const { data, error } = await supabase3.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: appUrl,
          data: {
            full_name: fullName,
            username,
            phone: phoneNumber,
            date_of_birth: dateOfBirth
          }
        }
      });
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      if (data.user) {
        const { data: existingProf } = await admin.from("users").select("id").eq("id", data.user.id).maybeSingle();
        if (!existingProf) {
          await admin.from("users").insert({
            id: data.user.id,
            email: email.trim().toLowerCase(),
            full_name: fullName || email.split("@")[0],
            username: username || email.split("@")[0],
            account_tier: "free",
            contact: phoneNumber || null,
            date_of_birth: dateOfBirth || null
          });
        }
      }
      return res.json({
        session: data.session,
        user: data.user
      });
    } catch (err) {
      console.error("[Auth Signup] Server signup error:", err);
      return res.status(500).json({ error: err?.message || "Sign up failed" });
    }
  });
  app.get("/api/genres", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
      const supabase3 = getSupabase();
      if (supabase3.__isDummy) {
        return res.json({ genres: [] });
      }
      const { data, error } = await supabase3.from("genres").select("*").order("name", { ascending: true });
      if (error) throw error;
      res.json({ genres: data || [] });
    } catch (err) {
      console.warn("[Genres] DB Fetch failed, returning high-fidelity inline fallbacks:", err.message);
      const fallbackGenres = [
        { id: "comic-id-placeholder", name: "Comic", slug: "comic" },
        { id: "horror-id-placeholder", name: "Horror", slug: "horror" },
        { id: "sci-fi-id-placeholder", name: "Sci-Fi", slug: "sci-fi" },
        { id: "romance-id-placeholder", name: "Romance", slug: "romance" },
        { id: "thriller-id-placeholder", name: "Thriller", slug: "thriller" },
        { id: "drama-id-placeholder", name: "Drama", slug: "drama" },
        { id: "fantasy-id-placeholder", name: "Fantasy", slug: "fantasy" },
        { id: "mystery-id-placeholder", name: "Mystery", slug: "mystery" }
      ];
      res.json({ genres: fallbackGenres, error: err.message, isFallback: true });
    }
  });
  let cachedMarketplaceBooks = null;
  let lastMarketplaceFetchTime = 0;
  app.get("/api/marketplace/books", async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      if (supabase3.__isDummy) {
        return res.json({
          books: [],
          message: "Database context is not configured. Redirects will fail (localhost:3000) until the Site URL is updated in Supabase.",
          error: null,
          isConfigRequired: true
        });
      }
      const now = Date.now();
      if (cachedMarketplaceBooks && now - lastMarketplaceFetchTime < 6e4) {
        console.log(`[Marketplace] Serving ${cachedMarketplaceBooks.length} books from in-memory cache (age: ${Math.round((now - lastMarketplaceFetchTime) / 1e3)}s)`);
        return res.json({ books: cachedMarketplaceBooks });
      }
      let books = [];
      let booksError = null;
      const selectStrategies = [
        // 0a. HIGHLY OPTIMIZED JOIN-FREE columns (Ensures absolute maximum load speed and avoids all RLS join timeouts)
        {
          select: "id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, genre_id, cover_image",
          filtered: false,
          limit: 250,
          desc: "join-free fast columns with genre_id limit 250"
        },
        // 0b. HIGHLY OPTIMIZED JOIN-FREE columns without genre_id (Ensures backward structural compatibility)
        {
          select: "id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, cover_image",
          filtered: false,
          limit: 250,
          desc: "join-free fast columns limit 250"
        },
        // 1. Highly optimized named columns WITH genre_id
        {
          select: "id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, genre_id, cover_image, users(id, email)",
          filtered: false,
          limit: 150,
          desc: "named columns with users join and genre_id limit 150"
        },
        // 2. Highly optimized named columns WITHOUT genre_id (backward compatible)
        {
          select: "id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, cover_image, users(id, email)",
          filtered: false,
          limit: 150,
          desc: "named columns with users join limit 150"
        },
        // 3. Bare minimum core columns WITH genre_id
        {
          select: "id, title, user_id, price, is_published, status, created_at, genre_id, cover_image, users(id, email)",
          filtered: false,
          limit: 200,
          desc: "bare minimum core columns with genre_id limit 200"
        },
        // 4. Bare minimum core columns WITHOUT genre_id (backward compatible)
        {
          select: "id, title, user_id, price, is_published, status, created_at, cover_image, users(id, email)",
          filtered: false,
          limit: 200,
          desc: "bare minimum core columns limit 200"
        },
        // 5. Simple fallback select is_published WITH genre_id
        {
          select: "id, title, user_id, price, public_slug, is_published, status, created_at, genre_id, cover_image, users(id, email)",
          filtered: false,
          limit: 100,
          desc: "simple fallback select with genre_id limit 100"
        },
        // 6. Simple fallback select IS_published WITHOUT genre_id
        {
          select: "id, title, user_id, price, public_slug, is_published, status, created_at, cover_image, users(id, email)",
          filtered: false,
          limit: 100,
          desc: "simple fallback select limit 100"
        }
      ];
      for (const strategy of selectStrategies) {
        try {
          const queryPromise = supabase3.from("books").select(strategy.select).order("created_at", { ascending: false }).limit(strategy.limit || 250);
          const timeoutPromise = new Promise(
            (_, reject) => setTimeout(() => reject(new Error("JS_TIMEOUT")), 8e3)
          );
          const result = await Promise.race([queryPromise, timeoutPromise]);
          const { data, error } = result;
          if (!error && data) {
            books = data;
            booksError = null;
            break;
          } else {
            booksError = error;
            const errMsg = error ? error.message : "Empty data";
            console.warn(
              `[Marketplace] Query strategy (${strategy.desc}) failed:`,
              errMsg
            );
            if (errMsg.includes("statement timeout") || errMsg.includes("cancel") || errMsg.includes("database timeout") || errMsg.includes("522") || errMsg.includes("fetch") || errMsg.includes("<!DOCTYPE html>")) {
              console.warn("[Marketplace] Database error/timeout detected, trying next strategy configuration...");
            }
          }
        } catch (strategyEx) {
          booksError = strategyEx;
          const exMsg = strategyEx.message || "";
          console.error(
            `[Marketplace] Exception running strategy (${strategy.desc}):`,
            exMsg
          );
          if (exMsg === "JS_TIMEOUT") {
            console.warn("[Marketplace] JS query timeout occurred, trying fallback...");
          }
        }
      }
      if (booksError && books.length === 0) {
        if (cachedMarketplaceBooks) {
          console.warn("[Marketplace] All live queries failed or timed out. Serving stale cached books as safety fallback.");
          return res.json({ books: cachedMarketplaceBooks, isCachedFallback: true });
        }
        console.error(
          "[Marketplace] All query strategies failed critically:",
          booksError
        );
        return res.json({
          books: [],
          error: typeof booksError === "object" ? booksError.message || JSON.stringify(booksError) : String(booksError)
        });
      }
      if (!books || books.length === 0) {
        return res.json({ books: [] });
      }
      const candidateBooks = books.filter((book) => {
        const ghostTitles = [
          "SAMPLE",
          "TEST",
          "DUMMY",
          "DELETED",
          "[DELETED]",
          "VOLUME 4",
          "VOLUME-4",
          "VOLUME 4-CHAPTER 1",
          "VOLUME 4 - CHAPTER 1",
          "I AM IN SO MUCH TROUBLE",
          "MUCH TROUBLE"
        ];
        const bookTitle = (book.title || "").toUpperCase();
        if (ghostTitles.some((gt) => bookTitle.includes(gt))) {
          console.log(
            `[Marketplace] Filtering out candidate ghost book: "${book.title}"`
          );
          return false;
        }
        const isApproved = book.status == 1 || book.status === "1" || book.status === "approved" || book.status === "published";
        const isPublished = book.is_published === true || book.is_published == 1 || book.is_published === "true" || book.is_published === "1";
        const isDeleted = book.status == -1 || book.status === "-1" || book.status === "deleted" || (book.admin_note || "").includes("[DELETED]");
        return (isApproved || isPublished) && !isDeleted;
      });
      let activeBooks = [];
      if (candidateBooks.length > 0) {
        let cardsMap = {};
        activeBooks = candidateBooks.map((book) => {
          let cardCount = 0;
          const match = (book.admin_note || "").match(/cards_count:([0-9]+)/);
          if (match) {
            cardCount = parseInt(match[1]);
          } else if (cardsMap[book.id]) {
            try {
              const parsed = typeof cardsMap[book.id] === "string" ? JSON.parse(cardsMap[book.id]) : cardsMap[book.id];
              cardCount = Array.isArray(parsed) ? parsed.length : 0;
            } catch (e) {
            }
          } else {
            cardCount = 10;
          }
          return {
            ...book,
            cards_json: cardsMap[book.id] || Array(cardCount).fill({})
          };
        }).filter((book) => {
          const count = Array.isArray(book.cards_json) ? book.cards_json.length : 0;
          return count <= 1e3;
        });
      }
      if (activeBooks.length === 0) {
        return res.json({ books: [] });
      }
      const userIds = [
        ...new Set(activeBooks.map((b) => b.user_id))
      ].filter(Boolean);
      let userMap = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase3.from("users").select("id, email, full_name").in("id", userIds);
        if (usersError) {
          console.error(
            "Join users error for marketplace:",
            usersError.message
          );
        } else {
          userMap = (users || []).reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }
      const booksWithUsers = activeBooks.map((book) => ({
        ...book,
        is_suspended: book.status === -2 || book.status === "-2" || book.is_suspended === true || book.is_suspended === 1,
        users: userMap[book.user_id] || { full_name: "Author" }
      }));
      cachedMarketplaceBooks = booksWithUsers;
      lastMarketplaceFetchTime = Date.now();
      res.json({ books: booksWithUsers });
    } catch (err) {
      console.error("Marketplace exception:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/admin/transactions", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { data: rawTransactions, error: transError } = await supabase3.from("transactions").select("*").order("created_at", { ascending: false });
      if (transError) {
        console.error("Admin transactions fetch error:", transError);
        return res.status(500).json({ error: transError.message });
      }
      const transactions = (rawTransactions || []).filter((t) => {
        if (!t.user_id) return false;
        if (t.buyer_email === "No Email") return false;
        if (t.type === "mock" || t.type === "test") return false;
        const ref = (t.paystack_reference || "").toLowerCase();
        if (ref.includes("mock") || ref.includes("test")) return false;
        if (t.amount === 100 && (ref.includes("free") || ref.startsWith("manual-admin") || ref.startsWith("manual-"))) return false;
        return true;
      });
      if (!transactions || transactions.length === 0) {
        return res.json({ transactions: [] });
      }
      const userIds = [
        ...new Set(transactions.map((t) => t.user_id))
      ].filter(Boolean);
      let userMap = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase3.from("users").select("id, email, full_name").in("id", userIds);
        if (usersError) {
          console.error(
            "Join users error for admin transactions:",
            usersError.message
          );
        } else {
          userMap = (users || []).reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }
      const transactionsWithUsers = transactions.map((t) => ({
        ...t,
        users: userMap[t.user_id] || { email: "Unknown", full_name: "System" }
      }));
      res.json({ transactions: transactionsWithUsers });
    } catch (err) {
      console.error("Admin transactions error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/public/support", async (req, res) => {
    try {
      const { name, email, subject, message, userId } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required." });
      }
      console.log(`[Public Support] New request from ${name} (${email}): ${subject || "No Subject"}`);
      const adminDb = getSupabaseAdmin();
      const finalSubject = subject || "Contact Form Submission";
      const finalMessage = `Contact Name: ${name}
Contact Email: ${email}

Message:
${message}`;
      const { data, error } = await adminDb.from("support_requests").insert({
        user_id: userId || null,
        type: "Contact",
        subject: finalSubject,
        message: finalMessage,
        status: "pending"
      }).select().maybeSingle();
      if (error) {
        throw error;
      }
      res.json({ success: true, request: data });
    } catch (err) {
      console.error("[Public Support] Error:", err);
      res.status(500).json({ error: "Failed to submit support request: " + err.message });
    }
  });
  app.post("/api/support/request", authenticateUser, async (req, res) => {
    try {
      const { type, subject, message } = req.body;
      const user = req.user;
      if (!type || !subject || !message) {
        return res.status(400).json({ error: "Please fill in all fields." });
      }
      console.log(
        `[Support] New request from ${user.email}: [${type}] ${subject}`
      );
      const supabase3 = getSupabase();
      let supportData;
      let { data, error } = await supabase3.from("support_requests").insert({
        user_id: user.id,
        type: type || "General",
        subject,
        message,
        status: "pending"
      }).select().maybeSingle();
      if (error) {
        const isColumnMissing = error.message?.includes('column "type" does not exist') || error.code === "42703";
        if (isColumnMissing) {
          const { data: fbData, error: fbErr } = await supabase3.from("support_requests").insert({
            user_id: user.id,
            subject,
            message: `[Type: ${type || "General"}] ${message}`,
            status: "pending"
          }).select().maybeSingle();
          if (fbErr) throw fbErr;
          supportData = fbData;
        } else {
          throw error;
        }
      } else {
        supportData = data;
      }
      try {
        const brevoClient = getBrevo();
        if (brevoClient) {
          const adminEmails = ["samuelchukwuemeke05@gmail.com"];
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: `New Support Request: ${subject}`,
            textContent: `User ${user.email} submitted a ${type || "General"} request.

Subject: ${subject}
Message: ${message}`,
            sender: { email: brevoSender, name: "CalmReader System" },
            to: adminEmails.map((e) => ({ email: e }))
          });
        }
      } catch (mailErr) {
        console.error("[Support] Notification failed:", mailErr);
      }
      res.json({ success: true, request: supportData });
    } catch (err) {
      const errorPayload = {
        message: err.message || "Unknown server error",
        code: err.code || "unknown",
        details: err.details || null,
        hint: err.hint || null
      };
      console.error("[Support] Request Handler Exception:", errorPayload);
      res.status(500).json({ error: JSON.stringify(errorPayload, null, 2) });
    }
  });
  async function logEmailToDb(recipient_email, subject, template_name, metadata = {}, status = "sent", error_message) {
    try {
      const adminDb = getSupabaseAdmin();
      await adminDb.from("email_logs").insert({
        recipient_email,
        subject,
        template_name,
        metadata: typeof metadata === "object" ? metadata : { raw: metadata },
        status,
        error_message: error_message || null,
        sent_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.warn("[logEmailToDb] Failed to write email log:", err);
    }
  }
  app.post("/api/notifications/send-email", async (req, res) => {
    try {
      const { recipient_email, subject, template_name, metadata, textContent, htmlContent } = req.body;
      if (!recipient_email || !subject) {
        return res.status(400).json({ error: "recipient_email and subject are required." });
      }
      console.log(`[Email Notification API] Sending "${subject}" to ${recipient_email} [template: ${template_name || "custom"}]`);
      const brevoClient = getBrevo();
      let sentSuccess = false;
      let errorMsg = void 0;
      if (brevoClient) {
        try {
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject,
            textContent: textContent || subject,
            htmlContent: htmlContent || void 0,
            sender: { email: brevoSender, name: "CalmReader" },
            to: [{ email: recipient_email }]
          });
          sentSuccess = true;
        } catch (mailErr) {
          console.error("[Email Notification API] Brevo send error:", mailErr);
          errorMsg = mailErr.message || String(mailErr);
        }
      } else {
        errorMsg = "Brevo API key not configured or client missing";
      }
      await logEmailToDb(
        recipient_email,
        subject,
        template_name || "custom_notification",
        metadata || {},
        sentSuccess ? "sent" : "failed",
        errorMsg
      );
      return res.json({ success: sentSuccess, error: errorMsg });
    } catch (err) {
      console.error("[Email Notification API] Endpoint Exception:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/user-feedback", async (req, res) => {
    try {
      const { type, subject, description, screenshot_url, userId, userEmail } = req.body;
      if (!subject || !description) {
        return res.status(400).json({ error: "Subject and description are required." });
      }
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb.from("user_feedback").insert({
        user_id: userId || null,
        user_email: userEmail || "Anonymous",
        type: type || "general",
        subject,
        description,
        screenshot_url: screenshot_url || null,
        status: "new"
      }).select().maybeSingle();
      if (error) throw error;
      try {
        const brevoClient = getBrevo();
        if (brevoClient) {
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: `New User Feedback [${(type || "general").toUpperCase()}]: ${subject}`,
            textContent: `From: ${userEmail || "Anonymous"}
Type: ${type}
Subject: ${subject}

Description:
${description}`,
            sender: { email: brevoSender, name: "CalmReader Feedback System" },
            to: [{ email: "samuelchukwuemeke05@gmail.com" }]
          });
        }
      } catch (e) {
        console.warn("[UserFeedback] Admin email alert failed:", e);
      }
      res.json({ success: true, feedback: data });
    } catch (err) {
      console.error("[UserFeedback] Error submitting feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/user-feedback", async (req, res) => {
    try {
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb.from("user_feedback").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      res.json({ success: true, feedback: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/user-feedback/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, admin_response } = req.body;
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb.from("user_feedback").update({
        status: status || "completed",
        admin_response: admin_response || null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", id).select().maybeSingle();
      if (error) throw error;
      res.json({ success: true, feedback: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/refund-requests", async (req, res) => {
    try {
      const { transaction_id, reason, user_email, userId } = req.body;
      if (!transaction_id || !reason) {
        return res.status(400).json({ error: "transaction_id and reason are required." });
      }
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb.from("refund_requests").insert({
        user_id: userId || null,
        user_email: user_email || null,
        transaction_id,
        reason,
        status: "pending"
      }).select().maybeSingle();
      if (error) throw error;
      try {
        const brevoClient = getBrevo();
        if (brevoClient) {
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: `New Refund Request Submitted`,
            textContent: `User: ${user_email || userId}
Transaction ID: ${transaction_id}
Reason: ${reason}`,
            sender: { email: brevoSender, name: "CalmReader Support" },
            to: [{ email: "samuelchukwuemeke05@gmail.com" }]
          });
        }
      } catch (e) {
        console.warn("[RefundRequest] Admin notification email failed:", e);
      }
      res.json({ success: true, refundRequest: data });
    } catch (err) {
      console.error("[RefundRequest] Error creating request:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/refund-requests", async (req, res) => {
    try {
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb.from("refund_requests").select("*, transactions(*)").order("created_at", { ascending: false });
      if (error) throw error;
      res.json({ success: true, refundRequests: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/refund-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, admin_note } = req.body;
      const adminDb = getSupabaseAdmin();
      const { data: request, error: reqErr } = await adminDb.from("refund_requests").select("*, transactions(*)").eq("id", id).maybeSingle();
      if (reqErr || !request) {
        return res.status(404).json({ error: "Refund request not found." });
      }
      const { data: updatedReq, error: updateErr } = await adminDb.from("refund_requests").update({
        status: status || "approved",
        admin_note: admin_note || null,
        processed_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", id).select().maybeSingle();
      if (updateErr) throw updateErr;
      if (status === "approved" && request.transaction_id) {
        await adminDb.from("transactions").update({ status: "refunded" }).eq("id", request.transaction_id);
      }
      const recipientEmail = request.user_email || request.transactions?.buyer_email;
      if (recipientEmail) {
        const emailSubject = status === "approved" ? "\u{1F4B3} Refund processed for your purchase" : "\u26A0\uFE0F Update regarding your refund request";
        const emailBody = status === "approved" ? `Hello,

Your refund request for transaction #${request.transaction_id} has been APPROVED.

Note: ${admin_note || "Refund processed successfully."}

Thank you for your patience.

CalmReader Support` : `Hello,

Your refund request for transaction #${request.transaction_id} was reviewed and could not be approved at this time.

Reason/Note: ${admin_note || "Does not meet refund requirements."}

If you have questions, please contact support.

CalmReader Support`;
        try {
          const brevoClient = getBrevo();
          if (brevoClient) {
            await brevoClient.transactionalEmails.sendTransacEmail({
              subject: emailSubject,
              textContent: emailBody,
              sender: { email: brevoSender, name: "CalmReader Support" },
              to: [{ email: recipientEmail }]
            });
            await logEmailToDb(recipientEmail, emailSubject, "refund_status_update", { refund_id: id, status }, "sent");
          }
        } catch (mailErr) {
          console.error("[RefundProcess] Email notification failed:", mailErr);
          await logEmailToDb(recipientEmail, emailSubject, "refund_status_update", { refund_id: id, status }, "failed", mailErr.message);
        }
      }
      res.json({ success: true, refundRequest: updatedReq });
    } catch (err) {
      console.error("[RefundProcess] Exception:", err);
      res.status(500).json({ error: err.message });
    }
  });
  const userAnalyticsCache = /* @__PURE__ */ new Map();
  const handleUserAnalytics = async (req, res) => {
    try {
      const userId = req.user.id;
      const now = Date.now();
      const cached = userAnalyticsCache.get(userId);
      if (cached && now - cached.timestamp < 3 * 60 * 1e3) {
        return res.json({ success: true, ...cached.data, cached: true });
      }
      const adminDb = getSupabaseAdmin();
      let userProfile = null;
      try {
        const { data: uData } = await adminDb.from("users").select("id, email, full_name, username, account_tier, referral_code, wallet_balance, is_approved_author, is_author").eq("id", userId).maybeSingle();
        userProfile = uData;
      } catch (uErr) {
        console.warn("[Analytics API] Error fetching user profile:", uErr);
      }
      const accountTier = userProfile?.account_tier || "free";
      const isAuthorUser = accountTier === "author" || accountTier === "admin" || !!userProfile?.is_approved_author || !!userProfile?.is_author;
      const isAffiliateUser = accountTier === "marketing_partner" || accountTier === "mpr" || accountTier === "premium" || accountTier === "admin";
      let books = [];
      try {
        let { data: bData, error: booksErr } = await adminDb.from("books").select("id, title, price, cover_image, views, conversions, created_at, is_published, status").eq("user_id", userId);
        if (booksErr) {
          const { data: bFallback } = await adminDb.from("books").select("id, title, price, cover_image, created_at, is_published, status").eq("user_id", userId);
          if (bFallback) {
            books = bFallback.map((b) => ({ ...b, views: 0, conversions: 0 }));
          }
        } else {
          books = bData || [];
        }
      } catch (bCatch) {
        console.warn("[Analytics API] Books query fallback:", bCatch);
      }
      const bookIds = (books || []).map((b) => b.id);
      let transactions = [];
      if (bookIds.length > 0) {
        try {
          const { data: txs } = await adminDb.from("transactions").select("id, amount, created_at, book_id, type, status, buyer_email").in("book_id", bookIds).eq("type", "purchase").eq("status", "successful");
          if (txs) transactions = txs;
        } catch (tErr) {
          console.warn("[Analytics API] Transactions query error:", tErr);
        }
      }
      let referralsCount = 0;
      let recentRecruits = [];
      const refCode = userProfile?.referral_code || userProfile?.username || userId.slice(0, 8);
      try {
        const { data: refs } = await adminDb.from("users").select("id, email, full_name, username, account_tier, created_at").or(`referred_by.eq.${userId},referred_by.eq.${refCode}`).limit(50);
        if (refs) {
          referralsCount = refs.length;
          recentRecruits = refs;
        }
      } catch (rErr) {
        console.warn("[Analytics API] Referrals query error:", rErr);
      }
      let bookshelfCount = 0;
      try {
        const { count } = await adminDb.from("bookshelf").select("id", { count: "exact", head: true }).eq("user_id", userId);
        bookshelfCount = count || 0;
      } catch (bsErr) {
      }
      const totalSales = transactions.length;
      const totalEarnings = transactions.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
      const totalViews = (books || []).reduce((acc, b) => acc + (Number(b.views) || 0), 0);
      const conversionRate = totalViews > 0 ? (totalSales / totalViews * 100).toFixed(1) : "0.0";
      const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const thisMonthTxs = transactions.filter((tx) => {
        const d = new Date(tx.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const thisMonthSales = thisMonthTxs.length;
      const thisMonthEarnings = thisMonthTxs.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
      const salesByBook = {};
      transactions.forEach((tx) => {
        if (!salesByBook[tx.book_id]) {
          salesByBook[tx.book_id] = { sales: 0, earnings: 0 };
        }
        salesByBook[tx.book_id].sales += 1;
        salesByBook[tx.book_id].earnings += Number(tx.amount) || 0;
      });
      const booksWithMetrics = (books || []).map((b) => {
        const metrics = salesByBook[b.id] || { sales: 0, earnings: 0 };
        const views = Number(b.views) || 0;
        const conv = views > 0 ? (metrics.sales / views * 100).toFixed(1) : "0.0";
        return {
          ...b,
          salesCount: metrics.sales,
          earningsTotal: metrics.earnings,
          conversionRate: conv
        };
      });
      const topBooks = [...booksWithMetrics].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5);
      const bestSellingBook = topBooks.length > 0 && topBooks[0].salesCount > 0 ? { title: topBooks[0].title, sales: topBooks[0].salesCount, earnings: topBooks[0].earningsTotal } : null;
      const salesTrend = {};
      for (let i = 0; i < 30; i++) {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toISOString().split("T")[0];
        const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        salesTrend[dateStr] = { date: displayDate, sales: 0, earnings: 0 };
      }
      transactions.forEach((tx) => {
        const dateStr = new Date(tx.created_at).toISOString().split("T")[0];
        if (salesTrend[dateStr]) {
          salesTrend[dateStr].sales += 1;
          salesTrend[dateStr].earnings += Number(tx.amount) || 0;
        }
      });
      const monthlyEarningsMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = /* @__PURE__ */ new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = d.toLocaleString("en-US", { month: "short" });
        monthlyEarningsMap[monthKey] = { month: monthLabel, earnings: 0, sales: 0 };
      }
      transactions.forEach((tx) => {
        const d = new Date(tx.created_at);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyEarningsMap[monthKey]) {
          monthlyEarningsMap[monthKey].earnings += Number(tx.amount) || 0;
          monthlyEarningsMap[monthKey].sales += 1;
        }
      });
      const viewsTrend = (books || []).map((b) => ({
        title: b.title ? b.title.length > 15 ? b.title.slice(0, 15) + "..." : b.title : "Untitled",
        views: Number(b.views) || 0
      })).sort((a, b) => b.views - a.views).slice(0, 8);
      const analyticsData = {
        role: accountTier,
        accountTier,
        isAuthor: isAuthorUser,
        isAffiliate: isAffiliateUser,
        userProfile: {
          id: userId,
          email: userProfile?.email || req.user.email,
          fullName: userProfile?.full_name || userProfile?.username || "User",
          walletBalance: userProfile?.wallet_balance || 0,
          referralCode: refCode
        },
        // Author Metrics
        totalSales,
        totalEarnings,
        thisMonthSales,
        thisMonthEarnings,
        totalViews,
        conversionRate,
        bestSellingBook,
        topBooks,
        salesTrend: Object.values(salesTrend),
        monthlyEarnings: Object.values(monthlyEarningsMap),
        viewsTrend,
        books: booksWithMetrics,
        // Affiliate & Reader Metrics
        referralsCount,
        recentRecruits,
        bookshelfCount,
        affiliateEarnings: referralsCount * 2e3
        // Estimated referral earnings benchmark
      };
      userAnalyticsCache.set(userId, { timestamp: now, data: analyticsData });
      res.json({ success: true, ...analyticsData, cached: false });
    } catch (err) {
      console.error("[User Analytics API] Exception:", err);
      res.status(500).json({ error: err.message || "Failed to load analytics" });
    }
  };
  app.get("/api/author/analytics", authenticateUser, handleUserAnalytics);
  app.get("/api/analytics/user", authenticateUser, handleUserAnalytics);
  app.post("/api/books/:id/increment-views", async (req, res) => {
    try {
      const { id } = req.params;
      const adminDb = getSupabaseAdmin();
      const { data: book } = await adminDb.from("books").select("views").eq("id", id).maybeSingle();
      if (book) {
        const newViews = (book.views || 0) + 1;
        await adminDb.from("books").update({ views: newViews }).eq("id", id);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/email-logs", authenticateAdmin, async (req, res) => {
    try {
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb.from("email_logs").select("*").order("sent_at", { ascending: false }).limit(100);
      if (error) throw error;
      res.json({ success: true, logs: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/payments/verify", authenticateUser, async (req, res) => {
    try {
      const {
        transaction_type,
        reference_id,
        amount,
        payment_method,
        transaction_ref,
        bank_name,
        account_name,
        account_number,
        proof_image_url
      } = req.body;
      const user = req.user;
      if (!transaction_type || !amount || !payment_method || !transaction_ref || !proof_image_url) {
        return res.status(400).json({ error: "Missing required verification fields." });
      }
      const supabase3 = getSupabase();
      const { data, error } = await supabase3.from("payment_verifications").insert({
        user_id: user.id,
        transaction_type,
        reference_id,
        amount: parseFloat(amount),
        payment_method,
        transaction_ref,
        bank_name,
        account_name,
        account_number,
        proof_image_url,
        status: "pending"
      }).select().maybeSingle();
      if (error) throw error;
      try {
        const brevoClient = getBrevo();
        if (brevoClient) {
          const adminEmails = ["samuelchukwuemeke05@gmail.com"];
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: `New Payment Verification: ${transaction_type}`,
            textContent: `User ${user.email} submitted proof for ${transaction_type}.
Amount: ${amount}
Method: ${payment_method}
Ref: ${transaction_ref}`,
            sender: { email: brevoSender, name: "CalmReader System" },
            to: adminEmails.map((e) => ({ email: e }))
          });
        }
      } catch (mailErr) {
        console.error("[Payment] Notification failed:", mailErr);
      }
      res.json({ success: true, verification: data });
    } catch (err) {
      const errorPayload = {
        message: err.message || "Unknown server error",
        code: err.code || "unknown",
        details: err.details || null,
        hint: err.hint || null
      };
      console.error("[Payment] Request Handler Exception:", errorPayload);
      res.status(500).json({ error: JSON.stringify(errorPayload, null, 2) });
    }
  });
  app.get(
    "/api/user/support-history",
    authenticateUser,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        const { data, error } = await supabase3.from("support_requests").select("*").eq("user_id", req.user.id).order("created_at", { ascending: false });
        if (error) throw error;
        res.json({ requests: data });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.get(
    "/api/user/payment-history",
    authenticateUser,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        const { data, error } = await supabase3.from("payment_verifications").select("*").eq("user_id", req.user.id).order("created_at", { ascending: false });
        if (error) throw error;
        res.json({ verifications: data });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.get(
    "/api/admin/support",
    authenticateAdmin,
    async (req, res) => {
      try {
        const supabase3 = getSupabaseAdmin();
        console.log("[Admin] Fetching support requests...");
        const { data: requests, error } = await supabase3.from("support_requests").select("*").order("created_at", { ascending: false });
        if (error) {
          console.error(
            "Fetch support requests error details:",
            JSON.stringify(error, null, 2)
          );
          if (error.code === "42P01") {
            return res.json({
              requests: [],
              warning: "Table support_requests is missing."
            });
          }
          return res.status(500).json({ error: error.message });
        }
        if (!requests || requests.length === 0) {
          return res.json({ requests: [] });
        }
        const userIds = [
          ...new Set(requests.map((r) => r.user_id))
        ].filter(Boolean);
        let userMap = {};
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase3.from("users").select("id, email, full_name").in("id", userIds);
          if (usersError) {
            console.error("Fetch users for support error:", usersError);
          } else {
            userMap = (users || []).reduce((acc, user) => {
              acc[user.id] = user;
              return acc;
            }, {});
          }
        }
        const requestsWithUsers = requests.map((r) => ({
          ...r,
          users: userMap[r.user_id] || {
            email: "Unknown",
            full_name: "Deleted User"
          }
        }));
        res.json({ requests: requestsWithUsers });
      } catch (err) {
        console.error("[AdminSupport] Critical Error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
      }
    }
  );
  app.post(
    "/api/admin/support/respond",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { requestId, response, status } = req.body;
        const admin = req.user;
        const supabase3 = getSupabase();
        const { data: request, error: updateError } = await supabase3.from("support_requests").update({ status: status || "resolved", admin_response: response }).eq("id", requestId).select("*").single();
        if (updateError) throw updateError;
        const { data: userData } = await supabase3.from("users").select("email").eq("id", request.user_id).single();
        const userEmail = userData?.email;
        await supabase3.from("admin_responses").insert({
          request_id: requestId,
          admin_id: admin.id,
          response,
          status_after: status || "resolved"
        });
        try {
          const brevoClient = getBrevo();
          if (brevoClient && userEmail) {
            await brevoClient.transactionalEmails.sendTransacEmail({
              subject: `Update on your support request: ${request.subject}`,
              textContent: `Hello,

Our admin has responded to your request:

"${response}"

Status: ${status || "resolved"}

Best regards,
CalmReader Team`,
              sender: { email: brevoSender, name: "CalmReader Support" },
              to: [{ email: userEmail }]
            });
          }
        } catch (mailErr) {
          console.error("[Support] User notification failed:", mailErr);
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.get(
    "/api/admin/payment-verifications",
    authenticateAdmin,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        console.log("[Admin] Fetching payment verifications...");
        const { data, error } = await supabase3.from("payment_verifications").select("*").order("created_at", { ascending: false });
        if (error) {
          console.error(
            "Fetch payment verifications error details:",
            JSON.stringify(error, null, 2)
          );
          if (error.code === "42P01") {
            return res.json({
              verifications: [],
              warning: "Table payment_verifications is missing."
            });
          }
          return res.status(500).json({ error: error.message });
        }
        if (!data || data.length === 0) {
          return res.json({ verifications: [] });
        }
        const userIds = [...new Set(data.map((v) => v.user_id))].filter(
          Boolean
        );
        let userMap = {};
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase3.from("users").select("id, email, full_name").in("id", userIds);
          if (usersError) {
            console.error("Fetch users for payments error:", usersError);
          } else {
            userMap = (users || []).reduce((acc, user) => {
              acc[user.id] = user;
              return acc;
            }, {});
          }
        }
        const verificationsWithUsers = data.map((v) => ({
          ...v,
          users: userMap[v.user_id] || {
            email: "Unknown",
            full_name: "Deleted User"
          }
        }));
        res.json({ verifications: verificationsWithUsers });
      } catch (err) {
        console.error("[AdminPayments] Critical Error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
      }
    }
  );
  app.post(
    "/api/admin/payments/verify/:id/resolve",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { action, note, reference_id, transaction_type, content_id, content_type } = req.body;
        const admin = req.user;
        const supabase3 = getSupabase();
        const status = action === "approve" ? "approved" : "rejected";
        const updatePayload = {
          status,
          admin_note: note,
          approved_by: action === "approve" ? admin.id : null,
          approved_at: action === "approve" ? /* @__PURE__ */ new Date() : null
        };
        const targetRefId = content_id || reference_id;
        const targetType = content_type || transaction_type;
        if (targetRefId) {
          updatePayload.reference_id = targetRefId;
          updatePayload.content_id = targetRefId;
        }
        if (targetType) {
          updatePayload.transaction_type = targetType;
          updatePayload.content_type = targetType;
        }
        const { data: pv, error: pvErr } = await supabase3.from("payment_verifications").update(updatePayload).eq("id", id).select("*").single();
        if (pvErr) throw pvErr;
        const { data: userData } = await supabase3.from("users").select("email, full_name").eq("id", pv.user_id).single();
        if (action === "approve") {
          const { data: user } = await supabase3.from("users").select("email").eq("id", pv.user_id).single();
          if (user) {
            if (pv.transaction_type === "premium_upgrade") {
              await supabase3.rpc("admin_set_user_tier", {
                p_email: user.email,
                p_new_tier: "premium"
              });
            } else if (pv.transaction_type === "author_upgrade") {
              await supabase3.rpc("admin_set_user_tier", {
                p_email: user.email,
                p_new_tier: "author"
              });
            } else if (pv.transaction_type === "ebook_purchase" && pv.reference_id) {
              await supabase3.from("transactions").insert({
                user_id: pv.user_id,
                book_id: pv.reference_id,
                buyer_email: user.email,
                amount: Math.round(pv.amount || 0),
                type: "purchase",
                status: "successful",
                paystack_reference: pv.transaction_ref || `MANUAL-${pv.id}`
              });
              try {
                const { data: existingEpic } = await supabase3.from("ebook_purchases").select("*").eq("user_id", pv.user_id).eq("ebook_id", pv.reference_id).maybeSingle();
                if (!existingEpic) {
                  await supabase3.from("ebook_purchases").insert({
                    user_id: pv.user_id,
                    ebook_id: pv.reference_id
                  });
                  console.log(`[Resolve] safe ebook_purchase record inserted for user ${pv.user_id} and book ${pv.reference_id}`);
                }
              } catch (e) {
                console.log("[Resolve] ebook_purchases double-grant safe insert failed:", e.message || e);
              }
            }
          }
        }
        try {
          const brevoClient = getBrevo();
          if (brevoClient && userData?.email) {
            await brevoClient.transactionalEmails.sendTransacEmail({
              subject: `Payment Verification ${status.toUpperCase()}: ${pv.transaction_type}`,
              textContent: `Hello ${userData.full_name || "Reader"},

Your payment verification for ${pv.transaction_type} has been ${status}.

${note ? `Admin Note: ${note}
` : ""}
Best regards,
CalmReader Team`,
              sender: { email: brevoSender, name: "CalmReader Finance" },
              to: [{ email: userData.email }]
            });
          }
        } catch (mailErr) {
          console.error("[Payment] User notification failed:", mailErr);
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.delete(
    "/api/admin/payments/verify/:id",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const supabase3 = getSupabase();
        const { error } = await supabase3.from("payment_verifications").delete().eq("id", id);
        if (error) throw error;
        res.json({ success: true, message: "Verification deleted" });
      } catch (err) {
        console.error("Delete verification error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.post(
    "/api/admin/payment-verifications/bulk-delete",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
          return res.status(400).json({ error: "IDs must be an array" });
        }
        const supabase3 = getSupabase();
        const { error } = await supabase3.from("payment_verifications").delete().in("id", ids);
        if (error) throw error;
        res.json({ success: true, message: "Bulk deleted successful" });
      } catch (err) {
        console.error("Bulk delete error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.post(
    "/api/admin/books/unlock",
    authenticateAdmin,
    async (req, res) => {
      try {
        const supabase3 = getSupabaseAdmin();
        const { userIdentifier, bookId, amount, contentType = "ebook", notes } = req.body;
        if (!userIdentifier || !bookId) {
          return res.status(400).json({
            error: "User Identifier (ID or Email) and book/content ID are required"
          });
        }
        const trimmedIdentifier = userIdentifier.trim();
        let userQuery = supabase3.from("users").select("id, email, full_name, username");
        if (trimmedIdentifier.includes("@")) {
          userQuery = userQuery.ilike("email", trimmedIdentifier);
        } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedIdentifier)) {
          userQuery = userQuery.eq("id", trimmedIdentifier);
        } else {
          userQuery = userQuery.ilike("username", trimmedIdentifier);
        }
        let { data: userData, error: userError } = await userQuery.maybeSingle();
        if (!userData) {
          const { data: fallbackUser } = await supabase3.from("user_profiles_public").select("id, email, full_name, username").or(`email.ilike.${trimmedIdentifier},id.eq.${trimmedIdentifier}`).maybeSingle();
          if (fallbackUser) {
            userData = fallbackUser;
          }
        }
        if (!userData) {
          return res.status(404).json({
            error: "User not found. Check if the provided Email or ID is accurate."
          });
        }
        const isGeneralTrivia = bookId === "general";
        let bookData = { id: bookId, title: "General Knowledge Trivia", price: 0 };
        if (!isGeneralTrivia) {
          const { data: bData, error: bookError } = await supabase3.from("books").select("id, title, price, pdf_price, cards_json").eq("id", bookId).maybeSingle();
          if (bookError || !bData) {
            return res.status(404).json({ error: "Book not found." });
          }
          bookData = bData;
        }
        const saleAmount = amount !== void 0 && amount !== "" ? parseInt(amount) : bookData.price || 0;
        const targetBookId = isGeneralTrivia ? null : bookId;
        const refSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
        if (contentType === "ebook" || contentType === "all") {
          const { data: existingTx } = await supabase3.from("transactions").select("id").eq("user_id", userData.id).eq("book_id", targetBookId).eq("type", "purchase").eq("status", "successful").maybeSingle();
          if (!existingTx && targetBookId) {
            await supabase3.from("transactions").insert({
              user_id: userData.id,
              book_id: targetBookId,
              buyer_email: userData.email,
              amount: Math.round(saleAmount),
              type: "purchase",
              status: "successful",
              paystack_reference: `MANUAL-ADMIN-EBOOK-${refSuffix}`
            });
          }
          if (targetBookId) {
            try {
              const { data: existingEpic } = await supabase3.from("ebook_purchases").select("*").eq("user_id", userData.id).eq("ebook_id", targetBookId).maybeSingle();
              if (!existingEpic) {
                await supabase3.from("ebook_purchases").insert({
                  user_id: userData.id,
                  ebook_id: targetBookId
                });
              }
            } catch (epicErr) {
              console.warn("[ManualUnlock] ebook_purchases insert fallback handled:", epicErr);
            }
          }
        }
        if (contentType === "trivia" || contentType === "all") {
          await supabase3.from("transactions").insert({
            user_id: userData.id,
            book_id: targetBookId,
            buyer_email: userData.email,
            amount: 0,
            type: "trivia_access",
            status: "successful",
            paystack_reference: `MANUAL-ADMIN-TRIVIA-${refSuffix}`
          });
          if (targetBookId) {
            try {
              const totalCards = Array.isArray(bookData.cards_json) ? bookData.cards_json.length : 10;
              await supabase3.from("reading_progress").upsert({
                user_id: userData.id,
                book_id: targetBookId,
                card_index: Math.max(totalCards - 1, 999),
                completed: true
              }, { onConflict: "user_id,book_id" });
            } catch (progErr) {
              console.warn("[ManualUnlock] reading_progress upsert note:", progErr);
            }
          }
        }
        if (contentType === "pdf" || contentType === "all") {
          if (targetBookId) {
            await supabase3.from("transactions").insert({
              user_id: userData.id,
              book_id: targetBookId,
              buyer_email: userData.email,
              amount: 0,
              type: "pdf_purchase",
              status: "successful",
              paystack_reference: `MANUAL-ADMIN-PDF-${refSuffix}`
            });
          }
        }
        try {
          const brevoClient = getBrevo();
          if (brevoClient && userData.email) {
            const contentTypeName = contentType === "all" ? "Full eBook & Trivia Access" : contentType === "trivia" ? "Trivia Challenge Access" : contentType === "pdf" ? "PDF Download Access" : "eBook Reading Access";
            await brevoClient.transactionalEmails.sendTransacEmail({
              subject: `Content Access Unlocked: ${bookData.title}`,
              textContent: `Hello ${userData.full_name || "Reader"},

An administrator has manually unlocked ${contentTypeName} for "${bookData.title}" on your account.

You can now access this content anytime by logging into your CalmReader dashboard.

Enjoy reading!

Best regards,
CalmReader Team`,
              sender: { email: brevoSender, name: "CalmReader Support" },
              to: [{ email: userData.email }]
            });
          }
        } catch (mailErr) {
          console.error(
            "[ManualUnlock] User email notification failed:",
            mailErr
          );
        }
        res.json({
          success: true,
          message: `Successfully unlocked "${bookData.title}" (${contentType.toUpperCase()}) for user ${userData.email}!`
        });
      } catch (err) {
        console.error("[AdminUnlock] Error manual unlock:", err);
        res.status(500).json({ error: err.message || "Failed to manually unlock content" });
      }
    }
  );
  app.post(
    "/api/admin/books/reassign-author",
    authenticateAdmin,
    async (req, res) => {
      try {
        const supabase3 = getSupabaseAdmin();
        const { bookId, newAuthorUserId, authorPenName } = req.body;
        if (!bookId || !newAuthorUserId) {
          return res.status(400).json({ error: "Both bookId and newAuthorUserId are required" });
        }
        const { data: book, error: bookErr } = await supabase3.from("books").select("id, title, user_id, admin_note").eq("id", bookId).maybeSingle();
        if (bookErr || !book) {
          return res.status(404).json({ error: "Book not found" });
        }
        const { data: authorUser, error: userErr } = await supabase3.from("users").select("id, email, full_name, username, account_tier").eq("id", newAuthorUserId).maybeSingle();
        if (userErr || !authorUser) {
          return res.status(404).json({ error: "Selected author user profile not found" });
        }
        const authorDisplayName = authorPenName?.trim() || authorUser.full_name || authorUser.username || authorUser.email.split("@")[0];
        let updatedAdminNote = book.admin_note || "";
        if (updatedAdminNote.includes("author:")) {
          updatedAdminNote = updatedAdminNote.replace(/author:[^,]+/, `author:${authorDisplayName}`);
        } else if (updatedAdminNote) {
          updatedAdminNote += `,author:${authorDisplayName}`;
        } else {
          updatedAdminNote = `author:${authorDisplayName}`;
        }
        const { data: updatedBook, error: updateErr } = await supabase3.from("books").update({
          user_id: authorUser.id,
          admin_note: updatedAdminNote
        }).eq("id", bookId).select("id, title, user_id, admin_note").single();
        if (updateErr) throw updateErr;
        res.json({
          success: true,
          message: `Book "${book.title}" successfully reassigned to author ${authorDisplayName} (${authorUser.email})!`,
          book: {
            ...updatedBook,
            author_name: authorDisplayName
          }
        });
      } catch (err) {
        console.error("[ReassignAuthor] Error:", err);
        res.status(500).json({ error: err.message || "Failed to reassign book author" });
      }
    }
  );
  app.get("/api/admin/authors", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabaseAdmin();
      const { data: authors, error } = await supabase3.from("users").select("id, email, full_name, username, account_tier, is_approved_author, is_author").order("full_name", { ascending: true });
      if (error) throw error;
      res.json({ authors: authors || [] });
    } catch (err) {
      console.error("[AdminAuthors] Error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch authors list" });
    }
  });
  app.get("/api/admin/announcements", authenticateAdmin, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      const { data: announcements, error } = await supabase3.from("posts").select("*").order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ announcements });
    } catch (err) {
      console.error("Admin announcements error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post(
    "/api/admin/announcements",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { content, title, type } = req.body;
        const user = req.user;
        const supabase3 = getSupabase();
        const { data, error } = await supabase3.from("posts").insert({
          title: title || "Announcement",
          content,
          type: type || "announcement",
          admin_id: user.id,
          is_active: true
        }).select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, announcement: data });
      } catch (err) {
        console.error("Admin announcement create error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  app.post("/api/admin/reports", authenticateAdmin, async (req, res) => {
    try {
      const { reportId, action } = req.body;
      const status = action === "dismiss" ? "dismissed" : "resolved";
      const supabase3 = getSupabase();
      const { error } = await supabase3.from("reported_content").update({ status }).eq("id", reportId);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      console.error("Admin report action error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/trivia-promos", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      const supabase3 = getSupabase();
      const getFallbackPromos = () => {
        return [];
      };
      if (!supabase3 || supabase3.__isDummy) {
        return res.json({ promos: [] });
      }
      const { data, error } = await supabase3.from("trivia_promos").select("*").eq("is_active", true).gt("end_time", (/* @__PURE__ */ new Date()).toISOString()).order("start_time", { ascending: true });
      if (error) {
        console.warn("[Trivia Promo] Failed to fetch from DB:", error.message);
        return res.json({ promos: [] });
      }
      if (!data || data.length === 0) {
        return res.json({ promos: [] });
      }
      res.json({ promos: data });
    } catch (err) {
      console.error("[Trivia Promo] Error:", err);
      res.json({ promos: [] });
    }
  });
  app.get("/api/trivias/public", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      const supabase3 = getSupabase();
      if (supabase3.__isDummy) {
        return res.json({ trivias: [], warning: "Database not configured" });
      }
      let rawTrivias = [];
      let tableExists = true;
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      try {
        const { data, error } = await supabase3.from("trivias").select("*").eq("status", "active").or(`expiry_at.is.null,expiry_at.gt.${nowIso}`);
        if (error) {
          if (error.code === "42P01") {
            tableExists = false;
          } else {
            throw error;
          }
        } else {
          rawTrivias = data || [];
        }
      } catch (err) {
        console.warn("[Trivias Public API] 'trivias' table query failed or missing, using dynamic fallback:", err);
        tableExists = false;
      }
      let questions = [];
      try {
        const { data, error: qErr } = await supabase3.from("trivia_questions").select("*").eq("is_active", true);
        if (qErr) {
          console.warn("[Trivias Public API] Failed to fetch questions from DB:", qErr.message);
        } else {
          questions = data || [];
        }
      } catch (err) {
        console.warn("[Trivias Public API] Error querying 'trivia_questions' table safely:", err.message || err);
      }
      const questionCounts = {};
      questions.forEach((q) => {
        const key = q.ebook_id || "general";
        questionCounts[key] = (questionCounts[key] || 0) + 1;
      });
      let books = [];
      try {
        const { data, error: bErr } = await supabase3.from("books").select("id, title, cover_image, status, price, is_published, admin_note");
        if (bErr) {
          console.warn("[Trivias Public API] Failed to fetch books from DB:", bErr.message);
        } else {
          books = data || [];
        }
      } catch (err) {
        console.warn("[Trivias Public API] Error querying 'books' table safely:", err.message || err);
      }
      const booksMap = new Map(books.map((b) => [b.id, b]));
      const formatted = [];
      const coveredKeys = /* @__PURE__ */ new Set();
      const ghostTitles = ["SAMPLE", "TEST", "DUMMY", "DELETED", "[DELETED]"];
      if (tableExists && rawTrivias.length > 0) {
        for (const session of rawTrivias) {
          const isGeneral = !session.book_id;
          const key = session.book_id || "general";
          const qCount = questionCounts[key] || 0;
          if (qCount === 0) continue;
          const tTitle = (session.title || "").toUpperCase();
          if (ghostTitles.some((gt) => tTitle.includes(gt))) continue;
          const book = session.book_id ? booksMap.get(session.book_id) : null;
          if (book) {
            const isPublished = book.is_published === true || book.is_published === 1 || book.is_published === "true" || book.is_published === "1";
            if (book.status !== 1 || !isPublished) continue;
          }
          formatted.push({
            ...session,
            id: session.book_id || "general",
            cover_image: session.thumbnail_url || book?.cover_image || "",
            thumbnail_url: session.thumbnail_url || book?.cover_image || "",
            price: isGeneral ? 0 : session.price !== void 0 && session.price !== null ? session.price : book?.price || 0,
            book_title: isGeneral ? "General Knowledge" : book?.title || session.title,
            isGeneral
          });
          coveredKeys.add(key);
        }
      }
      res.json({ trivias: formatted });
    } catch (err) {
      console.error("[Trivia] Public fetch error:", err);
      res.json({
        trivias: [],
        error: "Failed to fetch public trivias gracefully"
      });
    }
  });
  app.get("/api/trivias", authenticateUser, async (req, res) => {
    try {
      const supabase3 = getSupabase();
      if (supabase3.__isDummy) {
        return res.json({ trivias: [], message: "Database not connected." });
      }
      const now = /* @__PURE__ */ new Date();
      let activeSessions = [];
      let tableExists = true;
      try {
        const { data, error: sError } = await supabase3.from("trivias").select("*");
        if (sError) {
          console.error(
            "[Trivias] Hub sessions fetch error:",
            JSON.stringify(sError, null, 2)
          );
          if (sError.code === "42P01") {
            tableExists = false;
          } else {
            throw sError;
          }
        } else {
          activeSessions = (data || []).filter((s) => {
            const isActive = s.status === "active" || s.is_active === true || s.is_active === 1 || String(s.is_active) === "true";
            const notExpired = !s.expiry_at || new Date(s.expiry_at) > now;
            return isActive && notExpired;
          });
        }
      } catch (err) {
        console.warn("[Trivias API] Error querying 'trivias' table, falling back:", err.message || err);
        tableExists = false;
      }
      let questions = [];
      try {
        const { data, error: qError } = await supabase3.from("trivia_questions").select("ebook_id").eq("is_active", true);
        if (qError) {
          console.warn("[Trivias API] Failed to fetch active questions:", qError.message);
        } else {
          questions = data || [];
        }
      } catch (err) {
        console.warn("[Trivias API] Error querying 'trivia_questions' table safely:", err.message || err);
      }
      const questionCounts = {};
      let generalQuestionCount = 0;
      questions.forEach((q) => {
        if (q.ebook_id) {
          questionCounts[q.ebook_id] = (questionCounts[q.ebook_id] || 0) + 1;
        } else {
          generalQuestionCount++;
        }
      });
      const verifiedSessions = activeSessions || [];
      const bookIds = verifiedSessions.map((s) => s.book_id).filter(Boolean);
      let books = [];
      try {
        const { data: bookData, error: bError } = await supabase3.from("books").select("id, title, cover_image, status, price, cards_json, genre_id, admin_note");
        if (bError) {
          console.warn("[Trivias API] Failed to fetch books details:", bError.message);
        } else {
          books = bookData || [];
        }
      } catch (err) {
        console.warn("[Trivias API] Error querying 'books' table safely:", err.message || err);
      }
      let genres = [];
      try {
        const { data: gData } = await supabase3.from("genres").select("id, name");
        genres = gData || [];
      } catch (err) {
        console.warn("[Trivias API] Failed to fetch genres:", err);
      }
      const userId = req.profile?.id;
      let purchasedBookIds = /* @__PURE__ */ new Set();
      let attemptedIds = /* @__PURE__ */ new Set();
      if (userId) {
        let purchasedBookIdsArray = [];
        try {
          const { data: pData, error: pError } = await supabase3.from("ebook_purchases").select("ebook_id").eq("user_id", userId);
          if (pError) throw pError;
          purchasedBookIdsArray = (pData || []).map((p) => p.ebook_id);
        } catch (dbErr) {
          console.log("[Trivias API] Using transactions table fallback.");
          try {
            const { data: txData } = await supabase3.from("transactions").select("book_id").eq("user_id", userId).eq("status", "successful").eq("type", "purchase");
            purchasedBookIdsArray = (txData || []).map((tx) => tx.book_id).filter(Boolean);
          } catch (txErr) {
            console.error("[Trivias API] Transactions check also failed:", txErr);
          }
        }
        purchasedBookIds = new Set(purchasedBookIdsArray);
        const { data: aData } = await supabase3.from("daily_trivia_attempts").select("ebook_id").eq("user_id", userId);
        attemptedIds = new Set(
          (aData || []).map((a) => a.ebook_id || "general")
        );
      }
      const progressMap = /* @__PURE__ */ new Map();
      if (userId) {
        try {
          const { data: progressData } = await supabase3.from("reading_progress").select("book_id, card_index, completed, progress").eq("user_id", userId);
          if (progressData) {
            progressData.forEach((p) => {
              progressMap.set(p.book_id, {
                card_index: p.card_index || 0,
                completed: !!p.completed,
                progress: p.progress || 0
              });
            });
          }
        } catch (progErr) {
          console.error("[Trivias API] Reading progress fetch failed:", progErr);
        }
      }
      const formattedTrivias = verifiedSessions.map((session) => {
        const book = books.find((b) => b.id === session.book_id);
        const isGeneral = !session.book_id;
        const hasAccess = isGeneral || !book?.price || book?.price === 0 || purchasedBookIds.has(session.book_id);
        const alreadyAttempted = attemptedIds.has(session.book_id || "general");
        const totalCards = book && Array.isArray(book.cards_json) ? book.cards_json.length : 0;
        const pRecord = book ? progressMap.get(book.id) : null;
        const cardIndex = pRecord ? pRecord.card_index : 0;
        const hasDbCompleted = pRecord ? pRecord.completed || pRecord.progress >= 90 : false;
        const readingCompleted = isGeneral || totalCards === 0 || hasDbCompleted || cardIndex >= totalCards - 1;
        const actualPrice = session.price !== void 0 && session.price !== null ? session.price : isGeneral ? 0 : book?.price || 0;
        const ruleTargetTier = session.target_tier || "all";
        const userAccountTier = req.profile?.account_tier || "free";
        const isLockedForTier = (ruleTargetTier === "premium" || actualPrice > 0) && userAccountTier === "free";
        const genreObj = book ? genres.find((g) => String(g.id) === String(book.genre_id)) : null;
        const bookGenreName = genreObj ? genreObj.name : book?.admin_note?.includes("genre:") ? book.admin_note.split("genre:")[1].split(",")[0] : "";
        const targetCategory = session.target_category || "all";
        const category = targetCategory !== "all" ? targetCategory : bookGenreName || (isGeneral ? "General Knowledge" : "General");
        return {
          id: session.book_id || "general",
          session_id: session.id,
          title: session.title || (isGeneral ? "General Knowledge Challenge" : book?.title),
          description: session.description || (isGeneral ? "Mixed topic questions." : ""),
          cover_image: session.thumbnail_url || book?.cover_image || "",
          thumbnail_url: session.thumbnail_url || book?.cover_image || "",
          reward_points: session.reward_points,
          price: actualPrice,
          target_tier: ruleTargetTier,
          target_category: targetCategory,
          category,
          promotional_writeup: session.promotional_writeup || "",
          expiry_at: session.expiry_at,
          created_at: session.created_at,
          hasAccess,
          alreadyAttempted,
          isGeneral,
          readingCompleted,
          isLockedForTier,
          book_title: isGeneral ? "General Knowledge" : book?.title,
          total_cards: totalCards,
          read_cards: cardIndex + 1
        };
      });
      const coveredKeys = new Set(verifiedSessions.map((s) => s.book_id || "general"));
      for (const key of Object.keys(questionCounts)) {
        if (coveredKeys.has(key)) continue;
        const isGeneral = key === "general";
        const qCount = questionCounts[key] || 0;
        if (qCount === 0) continue;
        if (isGeneral) {
          const alreadyAttempted = attemptedIds.has("general");
          formattedTrivias.push({
            id: "general",
            session_id: "general",
            title: "General Knowledge Challenge",
            description: "Test your brain power across science, history, and pop culture!",
            cover_image: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=600&auto=format&fit=crop",
            thumbnail_url: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=600&auto=format&fit=crop",
            reward_points: 100,
            price: 0,
            target_tier: "all",
            target_category: "all",
            category: "General Knowledge",
            promotional_writeup: "",
            expiry_at: null,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            hasAccess: true,
            alreadyAttempted,
            isGeneral: true,
            readingCompleted: true,
            isLockedForTier: false,
            book_title: "General Knowledge",
            total_cards: 0,
            read_cards: 1
          });
        } else {
          const book = books.find((b) => b.id === key);
          if (!book) continue;
          const isPublished = book.is_published === true || book.is_published === 1 || book.is_published === "true" || book.is_published === "1";
          if (book.status !== 1 || !isPublished) continue;
          const hasAccess = !book.price || book.price === 0 || purchasedBookIds.has(key);
          const alreadyAttempted = attemptedIds.has(key);
          const totalCards = Array.isArray(book.cards_json) ? book.cards_json.length : 0;
          const pRecord = progressMap.get(book.id);
          const cardIndex = pRecord ? pRecord.card_index : 0;
          const hasDbCompleted = pRecord ? pRecord.completed || pRecord.progress >= 90 : false;
          const readingCompleted = totalCards === 0 || hasDbCompleted || cardIndex >= totalCards - 1;
          const actualPrice = book.price || 200;
          const userAccountTier = req.profile?.account_tier || "free";
          const isLockedForTier = actualPrice > 0 && userAccountTier === "free";
          const genreObj = genres.find((g) => String(g.id) === String(book.genre_id));
          const bookGenreName = genreObj ? genreObj.name : book.admin_note?.includes("genre:") ? book.admin_note.split("genre:")[1].split(",")[0] : "";
          const category = bookGenreName || "General";
          formattedTrivias.push({
            id: book.id,
            session_id: book.id,
            title: `Trivia Master: ${book.title}`,
            description: book.description || `Prove your knowledge about "${book.title}" and earn points!`,
            cover_image: book.cover_image || "",
            thumbnail_url: book.cover_image || "",
            reward_points: 100,
            price: actualPrice,
            target_tier: "all",
            target_category: "all",
            category,
            promotional_writeup: "",
            expiry_at: null,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            hasAccess,
            alreadyAttempted,
            isGeneral: false,
            readingCompleted,
            isLockedForTier,
            book_title: book.title,
            total_cards: totalCards,
            read_cards: cardIndex + 1
          });
        }
      }
      res.json({ trivias: formattedTrivias });
    } catch (err) {
      console.error("[Trivias] Hub fetch error:", err);
      res.status(500).json({ error: "Failed to fetch trivia hub." });
    }
  });
  app.get(
    "/api/trivias/ebook/:ebookId",
    authenticateUser,
    async (req, res) => {
      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const supabase3 = getSupabase();
        let triviaSession = null;
        try {
          let queryTriviaSession = supabase3.from("trivias").select("id, reward_points, duration_seconds, description, price, target_tier, type, status, is_active, expires_at");
          if (isGeneral) {
            queryTriviaSession = queryTriviaSession.is("book_id", null);
          } else {
            queryTriviaSession = queryTriviaSession.eq("book_id", dbId);
          }
          const { data } = await queryTriviaSession.maybeSingle();
          triviaSession = data;
        } catch (sessionErr) {
          console.warn("[Trivias Play API] Failed to query 'trivias' table, using defaults:", sessionErr);
        }
        const userWithRole = {
          id: req.profile?.id,
          email: req.user?.email,
          role: req.profile?.role,
          account_tier: req.profile?.account_tier || "free",
          is_admin: req.profile?.is_admin === true
        };
        const isAdminUser = isAdmin(userWithRole);
        let book = null;
        if (!isGeneral) {
          const { data: bookData } = await supabase3.from("books").select("id, title, price, status, admin_note, cards_json").eq("id", ebookId).neq("status", -1).not("status", "eq", "-1").not("admin_note", "ilike", "%[DELETED]%").single();
          if (!bookData) return res.status(404).json({ error: "Book not found" });
          book = bookData;
          let hasPurchase = false;
          if (isAdminUser) {
            hasPurchase = true;
          } else {
            try {
              const { data: purchase, error: pError } = await supabase3.from("ebook_purchases").select("id").eq("ebook_id", ebookId).eq("user_id", req.profile?.id).maybeSingle();
              if (!pError && purchase) hasPurchase = true;
            } catch (dbErr) {
              console.log("[Trivias Play API] Using transactions table fallback.");
            }
            if (!hasPurchase) {
              try {
                const { data: tx } = await supabase3.from("transactions").select("id").eq("book_id", ebookId).eq("user_id", req.profile?.id).eq("status", "successful").eq("type", "purchase").maybeSingle();
                if (tx) hasPurchase = true;
              } catch (txErr) {
                console.error("[Trivias Play API] Fallback transactions check failed:", txErr);
              }
            }
          }
          let hasCompletedReading = false;
          const totalCards = Array.isArray(book.cards_json) ? book.cards_json.length : 0;
          if (isAdminUser || totalCards === 0) {
            hasCompletedReading = true;
          } else {
            const { data: progress } = await supabase3.from("reading_progress").select("card_index, completed").eq("user_id", req.profile?.id).eq("book_id", ebookId).maybeSingle();
            const cardIndex = progress ? progress.card_index : 0;
            hasCompletedReading = progress?.completed === true || totalCards > 0 && cardIndex >= totalCards - 1;
          }
          const eligibility = canPlayTrivia(userWithRole, triviaSession || { type: "marketing", is_active: true }, {
            hasPurchasedBook: hasPurchase || !book.price || book.price === 0,
            hasCompletedReading
          });
          if (!eligibility.eligible) {
            return res.status(403).json({ error: eligibility.message });
          }
        } else {
          const eligibility = canPlayTrivia(userWithRole, triviaSession || { type: "marketing", is_active: true });
          if (!eligibility.eligible) {
            return res.status(403).json({ error: eligibility.message });
          }
        }
        let questions = [];
        let fetchedFromVault = false;
        try {
          const { data: vaultQuestions, error: vaultErr } = await supabase3.from("vault").select("*").eq("type", "trivia_question");
          if (!vaultErr && vaultQuestions && vaultQuestions.length > 0) {
            const shuffled = [...vaultQuestions].sort(() => 0.5 - Math.random());
            const selectedVault = shuffled.slice(0, 5);
            questions = selectedVault.map((q, index) => ({
              id: q.id,
              ebook_id: dbId,
              question_text: q.content?.question || q.title || "",
              option_a: q.content?.options?.[0] || q.content?.option_a || "",
              option_b: q.content?.options?.[1] || q.content?.option_b || "",
              option_c: q.content?.options?.[2] || q.content?.option_c || "",
              option_d: q.content?.options?.[3] || q.content?.option_d || "",
              correct_answer: q.content?.correct_answer || q.content?.correct || "",
              explanation: q.content?.explanation || "Correct answer: " + (q.content?.correct_answer || ""),
              order_number: index + 1,
              is_active: true,
              is_from_vault: true
            }));
            fetchedFromVault = true;
          }
        } catch (vaultCatchErr) {
          console.log("[Trivias] Vault table reading bypassed or not active:", vaultCatchErr);
        }
        if (!fetchedFromVault || questions.length === 0) {
          const { data: fallbackQuestions, error: standardErr } = await supabase3.from("trivia_questions").select("*").eq("ebook_id", dbId).eq("is_active", true).order("order_number", { ascending: true });
          if (standardErr) throw standardErr;
          questions = fallbackQuestions || [];
        }
        const totalQuestionsCount = questions ? questions.length : 0;
        let queryAttempt = supabase3.from("daily_trivia_attempts").select("id, score, completed").eq("user_id", req.profile?.id);
        if (isGeneral) {
          queryAttempt = queryAttempt.is("ebook_id", null);
        } else {
          queryAttempt = queryAttempt.eq("ebook_id", ebookId);
        }
        const { data: attempt } = await queryAttempt.maybeSingle();
        let resumeIndex = 0;
        let resumeScore = 0;
        let isResume = false;
        if (attempt) {
          if (attempt.completed === true) {
            return res.status(403).json({
              error: "Attempt already recorded. You can only participate in this trivia once to prevent fraudulent activities."
            });
          } else {
            isResume = true;
            resumeScore = attempt.score || 0;
            const qIds = (questions || []).map((q) => q.id);
            if (qIds.length > 0) {
              const { data: ansList } = await supabase3.from("user_trivia_attempts").select("trivia_question_id").eq("user_id", req.profile?.id).in("trivia_question_id", qIds);
              const ansIds = new Set((ansList || []).map((a) => a.trivia_question_id));
              const answeredCount = (questions || []).filter((q) => ansIds.has(q.id)).length;
              resumeIndex = answeredCount;
            }
          }
        } else {
          const { error: insErr } = await supabase3.from("daily_trivia_attempts").insert({
            user_id: req.profile?.id,
            ebook_id: dbId,
            score: 0,
            total_questions: totalQuestionsCount,
            completed: false,
            won: false,
            attempt_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
          });
          if (insErr) {
            console.error("[Trivia Play Index] Failed to initialize daily attempt tracker:", insErr);
          }
        }
        let queryPrev = supabase3.from("daily_trivia_attempts").select("id, score, total_questions");
        if (dbId) {
          queryPrev = queryPrev.eq("ebook_id", dbId);
        } else {
          queryPrev = queryPrev.is("ebook_id", null);
        }
        const { data: prevAttempts } = await queryPrev;
        const attemptsSafe = prevAttempts || [];
        let trueWinnersCount = 0;
        let compensatedCount = 0;
        for (const attempt2 of attemptsSafe) {
          const rate = attempt2.score / (attempt2.total_questions || 5);
          if (rate >= 0.989) {
            trueWinnersCount++;
          } else if (rate >= 0.8) {
            compensatedCount++;
          }
        }
        res.json({
          questions: questions || [],
          book_title: isGeneral ? "General Knowledge Trivia" : book ? book.title : "Trivia Challenge",
          reward_points: triviaSession?.reward_points ?? 100,
          duration_seconds: triviaSession?.duration_seconds ?? 0,
          // default 00s per question
          description: triviaSession?.description ?? (isGeneral ? "Mixed topic challenge for everyone." : `Test your master knowledge of ${book ? book.title : "the book"}.`),
          true_winners_count: trueWinnersCount,
          compensated_winners_count: compensatedCount,
          payout_pool_exhausted: trueWinnersCount >= 1 && compensatedCount >= 4,
          is_resume: isResume,
          resume_index: resumeIndex,
          resume_score: resumeScore
        });
      } catch (err) {
        console.error("[Trivia Load] Error:", err);
        res.status(500).json({ error: "Failed to load trivia session." });
      }
    }
  );
  app.post(
    "/api/trivias/ebook/:ebookId/answer",
    authenticateUser,
    async (req, res) => {
      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const { question_id, selected_answer, is_correct } = req.body;
        const supabase3 = getSupabase();
        let queryAttempt = supabase3.from("daily_trivia_attempts").select("id, completed, score").eq("user_id", req.profile?.id);
        if (dbId) {
          queryAttempt = queryAttempt.eq("ebook_id", dbId);
        } else {
          queryAttempt = queryAttempt.is("ebook_id", null);
        }
        const { data: attempt } = await queryAttempt.maybeSingle();
        if (!attempt) {
          return res.status(403).json({ error: "No active running trivia session discovered." });
        }
        if (attempt.completed) {
          return res.status(403).json({ error: "Session has already been completed." });
        }
        const { data: existingAns } = await supabase3.from("user_trivia_attempts").select("id").eq("user_id", req.profile?.id).eq("trivia_question_id", question_id).maybeSingle();
        if (existingAns) {
          return res.json({ success: true, message: "Response already recorded previously." });
        }
        const { error: insErr } = await supabase3.from("user_trivia_attempts").insert({
          user_id: req.profile?.id,
          trivia_question_id: question_id,
          is_correct: !!is_correct
        });
        if (insErr) throw insErr;
        if (is_correct) {
          const newScore = (attempt.score || 0) + 1;
          await supabase3.from("daily_trivia_attempts").update({ score: newScore }).eq("id", attempt.id);
        }
        res.json({ success: true });
      } catch (err) {
        console.error("[Trivia Answer API] Error:", err);
        res.status(500).json({ error: "Failed to log granular answer." });
      }
    }
  );
  app.post(
    "/api/trivias/ebook/:ebookId/complete",
    authenticateUser,
    async (req, res) => {
      console.log(
        `[Trivia Submit] Attempt by ${req.user.email} for book ${req.params.ebookId}`
      );
      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const { results } = req.body;
        const supabase3 = getSupabase();
        if (req.profile?.is_admin) {
          return res.status(403).json({
            error: "Admins/CEO cannot participate in trivia for rewards to maintain ecosystem integrity."
          });
        }
        if (!results || !Array.isArray(results)) {
          return res.status(400).json({ error: "Invalid submission data" });
        }
        if (!isGeneral) {
          let triviaType = "marketing";
          try {
            const { data: tSession } = await supabase3.from("trivias").select("type").eq("book_id", ebookId).maybeSingle();
            if (tSession?.type) triviaType = tSession.type;
          } catch (_) {
          }
          if (triviaType === "reader_reward") {
            const { data: book } = await supabase3.from("books").select("id, title, price, status, admin_note").eq("id", ebookId).neq("status", -1).not("status", "eq", "-1").not("admin_note", "ilike", "%[DELETED]%").single();
            if (!book) return res.status(404).json({ error: "Book not found" });
            let hasPurchase = false;
            try {
              const { data: purchase, error: pError } = await supabase3.from("ebook_purchases").select("id").eq("ebook_id", ebookId).eq("user_id", req.profile?.id).maybeSingle();
              if (!pError && purchase) hasPurchase = true;
            } catch (dbErr) {
              console.log("[Trivias Play API] Using transactions table fallback.");
            }
            if (!hasPurchase) {
              try {
                const { data: tx } = await supabase3.from("transactions").select("id").eq("book_id", ebookId).eq("user_id", req.profile?.id).eq("status", "successful").eq("type", "purchase").maybeSingle();
                if (tx) hasPurchase = true;
              } catch (txErr) {
                console.error("[Trivias Play API] Fallback transactions check failed:", txErr);
              }
            }
            const isFree = !book.price || book.price === 0;
            if (!isFree && !hasPurchase) {
              return res.status(403).json({ error: "You must own this eBook to submit answers for Reader-Reward trivia." });
            }
          }
        }
        const qQuery = isGeneral ? supabase3.from("trivia_questions").select("id, correct_answer").is("ebook_id", null).eq("is_active", true) : supabase3.from("trivia_questions").select("id, correct_answer").eq("ebook_id", dbId).eq("is_active", true);
        const { data: dbQuestions, error: qErr } = await qQuery;
        if (qErr) {
          console.error("[Trivia Validation] Failed to fetch key answers:", qErr);
          throw qErr;
        }
        const answersMap = /* @__PURE__ */ new Map();
        if (dbQuestions) {
          dbQuestions.forEach((q) => {
            answersMap.set(q.id, q.correct_answer);
          });
        }
        const providedAnswers = results || [];
        for (const ans of providedAnswers) {
          const { data: existingAns } = await supabase3.from("user_trivia_attempts").select("id").eq("user_id", req.profile?.id).eq("trivia_question_id", ans.question_id).maybeSingle();
          if (!existingAns) {
            const dbCorrectAnswer = answersMap.get(ans.question_id);
            let evaluatedIsCorrect = false;
            if (ans.selected_answer !== void 0) {
              evaluatedIsCorrect = ans.selected_answer === dbCorrectAnswer;
            } else {
              evaluatedIsCorrect = !!ans.is_correct;
            }
            await supabase3.from("user_trivia_attempts").insert({
              user_id: req.profile?.id,
              trivia_question_id: ans.question_id,
              is_correct: evaluatedIsCorrect
            });
          }
        }
        const dbQuestionIds = (dbQuestions || []).map((q) => q.id);
        const { data: finalAttempts } = await supabase3.from("user_trivia_attempts").select("trivia_question_id, is_correct").eq("user_id", req.profile?.id).in("trivia_question_id", dbQuestionIds);
        const verifiedResults = (finalAttempts || []).map((fa) => ({
          question_id: fa.trivia_question_id,
          is_correct: !!fa.is_correct
        }));
        const score = (finalAttempts || []).filter((fa) => fa.is_correct).length;
        const totalQuestions = dbQuestionIds.length;
        const winThreshold = 0.7;
        const scoreRate = totalQuestions > 0 ? score / totalQuestions : 0;
        const won = scoreRate >= winThreshold;
        let queryAttempt = supabase3.from("daily_trivia_attempts").select("id").eq("user_id", req.profile?.id);
        if (dbId) {
          queryAttempt = queryAttempt.eq("ebook_id", dbId);
        } else {
          queryAttempt = queryAttempt.is("ebook_id", null);
        }
        const { data: existingAttempt } = await queryAttempt.maybeSingle();
        if (existingAttempt && existingAttempt.completed === true) {
          return res.status(403).json({
            error: "Attempt already recorded. You can only participate in this trivia once."
          });
        }
        let queryPrev = supabase3.from("daily_trivia_attempts").select("id, score, total_questions, created_at, user_id").order("created_at", { ascending: true });
        if (dbId) {
          queryPrev = queryPrev.eq("ebook_id", dbId);
        } else {
          queryPrev = queryPrev.is("ebook_id", null);
        }
        const { data: prevAttempts } = await queryPrev;
        const attemptsSafe = prevAttempts || [];
        let trueWinnersCount = 0;
        let compensatedCount = 0;
        for (const attempt of attemptsSafe) {
          const rate = (attempt.total_questions || 5) > 0 ? attempt.score / (attempt.total_questions || 5) : 0;
          if (rate >= 0.989) {
            trueWinnersCount++;
          } else if (rate >= 0.8) {
            compensatedCount++;
          }
        }
        let rewardStatus = "none";
        let cashEarned = 0;
        if (scoreRate >= 0.989) {
          if (trueWinnersCount < 1) {
            rewardStatus = "grand_winner";
            cashEarned = 5e3;
          } else if (compensatedCount < 4) {
            rewardStatus = "consolation_winner";
            cashEarned = 1e3;
          }
        } else if (scoreRate >= 0.8) {
          if (compensatedCount < 4) {
            rewardStatus = "consolation_winner";
            cashEarned = 1e3;
          }
        }
        let dailyError;
        if (existingAttempt) {
          const { error: updErr } = await supabase3.from("daily_trivia_attempts").update({
            score,
            total_questions: totalQuestions,
            completed: true,
            won: won || rewardStatus !== "none",
            attempt_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
          }).eq("id", existingAttempt.id);
          dailyError = updErr;
        } else {
          const { error: insErr } = await supabase3.from("daily_trivia_attempts").insert({
            user_id: req.profile?.id,
            ebook_id: dbId,
            score,
            total_questions: totalQuestions,
            completed: true,
            won: won || rewardStatus !== "none",
            attempt_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
          });
          dailyError = insErr;
        }
        if (dailyError) throw dailyError;
        const questionIdsForDeletion = verifiedResults.map((vr) => vr.question_id);
        if (questionIdsForDeletion.length > 0) {
          await supabase3.from("user_trivia_attempts").delete().eq("user_id", req.profile?.id).in("trivia_question_id", questionIdsForDeletion);
        }
        const detailedAttempts = verifiedResults.map((r) => ({
          user_id: req.profile?.id,
          trivia_question_id: r.question_id,
          is_correct: r.is_correct
        }));
        const { error: detailedError } = await supabase3.from("user_trivia_attempts").insert(detailedAttempts);
        if (detailedError)
          console.error(
            "[Trivia] Failed to record detailed attempts:",
            detailedError
          );
        let pointsEarned = 0;
        if (won || rewardStatus !== "none") {
          pointsEarned = verifiedResults.reduce(
            (acc, r) => acc + (r.is_correct ? 10 : 0),
            0
          );
        }
        if (pointsEarned > 0) {
          const { error: rpcErr } = await supabase3.rpc("increment_user_balance", {
            p_user_id: req.profile?.id,
            p_points_delta: pointsEarned
          });
          if (rpcErr) {
            console.warn("[Trivia Win] RPC balance update failed, falling back to read-then-write:", rpcErr);
            const { data: userProfile } = await supabase3.from("users").select("t_points").eq("id", req.profile?.id).single();
            const currentPoints = userProfile?.t_points || 0;
            await supabase3.from("users").update({ t_points: currentPoints + pointsEarned }).eq("id", req.profile?.id);
          }
        }
        if (rewardStatus !== "none") {
          const rewardLabel = rewardStatus === "grand_winner" ? "Grand Winner (2GB Data)" : "Consolation Winner (300MB Data)";
          console.log(`[Trivia Auto-Payout] Crediting \u20A6${cashEarned} as ${rewardLabel} to user ${req.user.email}`);
          await supabase3.from("transactions").insert({
            user_id: req.profile?.id,
            amount: cashEarned,
            type: "trivia_win",
            status: "successful",
            book_id: dbId || null
          });
          const bankName = rewardStatus === "grand_winner" ? "Grand Winner (2GB Data)" : "Consolation Winner (300MB Data)";
          const accountNumber = isGeneral ? "General Trivia" : `Book ID: ${dbId ? dbId.substring(0, 8) : "unknown"}`;
          const accountName = req.profile?.account_name || req.profile?.full_name || req.user.email?.split("@")[0] || "Trivia Winner";
          const { error: withdrawalErr } = await supabase3.from("withdrawals").insert({
            user_id: req.profile?.id,
            amount: cashEarned,
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountName,
            status: "pending"
          });
          if (withdrawalErr) {
            console.error("[Trivia Auto-Withdrawal] Automated withdrawal ticket failed:", withdrawalErr);
          }
        }
        if (questionIdsForDeletion.length > 0) {
          try {
            await supabase3.from("vault").delete().in("id", questionIdsForDeletion);
            console.log("[Vault Auto-Delete] Auto-deleted used vault items:", questionIdsForDeletion);
          } catch (vaultDelErr) {
            console.error("[Vault Auto-Delete] Error auto-deleting used vault items:", vaultDelErr);
          }
        }
        if (won) {
          try {
            const dataRewardAmount = rewardStatus === "grand_winner" ? 2e3 : 300;
            const phoneVal = req.profile?.phone || req.profile?.phone_number || "To Be Provided";
            await supabase3.from("support_requests").insert({
              user_id: req.profile?.id,
              type: "Data Reward",
              subject: `Trivia Win: ${dataRewardAmount}MB Data Reward Claim`,
              message: `Phone: ${phoneVal}
Network: MTN
Amount: ${dataRewardAmount} MB

Notes: Automatic reward request generated from Trivia Winner.`,
              status: "pending"
            });
            console.log(`[Trivia Data Reward] Auto-created Data Reward pending request for ${dataRewardAmount}MB`);
          } catch (drErr) {
            console.error("[Trivia Data Reward] Failed to auto-generate Data Reward request:", drErr);
          }
        }
        res.json({
          success: true,
          score,
          totalQuestions,
          pointsEarned,
          won,
          rewardStatus,
          cashEarned
        });
      } catch (err) {
        console.error("[Trivia Submit] Error:", err);
        res.status(500).json({ error: "Failed to submit trivia result." });
      }
    }
  );
  app.get(
    "/api/admin/trivias",
    authenticateUser,
    async (req, res) => {
      if (req.profile?.account_tier !== "admin" && req.profile?.account_tier !== "author") {
        return res.status(403).json({ error: "Access denied." });
      }
      try {
        const supabase3 = getSupabase();
        const isAdmin2 = req.profile?.account_tier === "admin";
        const userId = req.profile?.id;
        let query = supabase3.from("books").select("id, title, status, admin_note, user_id").neq("status", -1).not("status", "eq", "-1");
        if (!isAdmin2) {
          query = query.eq("user_id", userId);
        }
        const { data: books, error: bErr } = await query;
        if (bErr) throw bErr;
        const { data: questions, error: qErr } = await supabase3.from("trivia_questions").select("*");
        let triviaSessions = [];
        try {
          const { data, error } = await supabase3.from("trivias").select("*").eq("deleted", false).eq("status", "active");
          if (!error) {
            triviaSessions = data || [];
          }
        } catch (sCatchErr) {
          console.warn("[Admin Trivia Stats] Failed to fetch from 'trivias' table:", sCatchErr);
        }
        if (qErr && qErr.code === "42P01") {
          return res.json({
            trivias: (books || []).map((b) => ({
              id: b.id,
              title: b.title,
              questionCount: 0,
              lastUpdated: null
            }))
          });
        }
        if (qErr) throw qErr;
        const stats = (books || []).map((book) => {
          const bookQuestions = (questions || []).filter(
            (q) => q.ebook_id === book.id
          );
          const session = (triviaSessions || []).find(
            (s) => s.book_id === book.id
          );
          return {
            id: book.id,
            title: book.title,
            questionCount: bookQuestions.length,
            lastUpdated: bookQuestions.length > 0 ? new Date(
              Math.max(
                ...bookQuestions.map(
                  (q) => new Date(q.created_at).getTime()
                )
              )
            ).toISOString() : null,
            status: session?.status || "inactive",
            expiry_at: session?.expiry_at,
            reward_points: session?.reward_points,
            thumbnail_url: session?.thumbnail_url,
            is_owner: book.user_id === userId
          };
        });
        if (isAdmin2) {
          const generalQuestions = (questions || []).filter(
            (q) => q.ebook_id === null
          );
          const generalSession = (triviaSessions || []).find(
            (s) => s.book_id === null
          );
          if (generalQuestions.length > 0 || generalSession) {
            stats.push({
              id: "general",
              title: "General Knowledge Trivia",
              questionCount: generalQuestions.length,
              lastUpdated: generalQuestions.length > 0 ? new Date(
                Math.max(
                  ...generalQuestions.map(
                    (q) => new Date(q.created_at).getTime()
                  )
                )
              ).toISOString() : null,
              status: generalSession?.status || "inactive",
              expiry_at: generalSession?.expiry_at,
              reward_points: generalSession?.reward_points,
              thumbnail_url: generalSession?.thumbnail_url,
              is_owner: true
            });
          }
          const existingBookIds = new Set((books || []).map((b) => b.id));
          (triviaSessions || []).forEach((s) => {
            if (s.book_id !== null && !existingBookIds.has(s.book_id)) {
              const bookQuestions = (questions || []).filter(
                (q) => String(q.ebook_id) === String(s.book_id) || String(q.ebook_id) === String(s.id)
              );
              stats.push({
                id: s.book_id || s.id,
                // ID used for deletion
                title: s.title || `[Missing/Ghost eBook Trivia] (ID: ${s.book_id})`,
                questionCount: bookQuestions.length,
                lastUpdated: bookQuestions.length > 0 ? (/* @__PURE__ */ new Date()).toISOString() : null,
                status: s.status || "expired",
                expiry_at: s.expiry_at || (/* @__PURE__ */ new Date()).toISOString(),
                reward_points: s.reward_points || 100,
                thumbnail_url: s.thumbnail_url,
                is_owner: true,
                is_orphaned: true
              });
            }
          });
        }
        res.json({ trivias: stats });
      } catch (err) {
        console.error("[Admin Trivia Stats] Error:", err);
        res.status(500).json({ error: "Failed to fetch admin trivia stats" });
      }
    }
  );
  app.post(
    "/api/admin/trivias/ebook/:ebookId",
    authenticateUser,
    async (req, res) => {
      if (req.profile?.account_tier !== "admin" && req.profile?.account_tier !== "author") {
        return res.status(403).json({ error: "Access denied." });
      }
      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const supabase3 = getSupabase();
        const isAdmin2 = req.profile?.account_tier === "admin";
        if (!isGeneral && !isAdmin2) {
          const { data: book } = await supabase3.from("books").select("user_id").eq("id", dbId).single();
          if (book?.user_id !== req.profile?.id)
            return res.status(403).json({ error: "Permission denied." });
        } else if (isGeneral && !isAdmin2) {
          return res.status(403).json({ error: "Only the CEO can manage General Trivia." });
        }
        const {
          questions,
          isActive = false,
          reward_points = 100,
          price = 200,
          thumbnail_url = "",
          duration_seconds = 0,
          title = "",
          description = "",
          target_tier = "all",
          promotional_writeup = ""
        } = req.body;
        const finalActive = isAdmin2 ? isActive : void 0;
        if (isGeneral) {
          await supabase3.from("trivia_questions").delete().is("ebook_id", null);
        } else {
          await supabase3.from("trivia_questions").delete().eq("ebook_id", dbId);
        }
        const prepared = questions.map((q, index) => ({
          ebook_id: dbId,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : typeof q.options === "string" ? JSON.parse(q.options) : q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || "Medium",
          points: q.points || 10,
          order_number: index + 1,
          is_active: isActive
        }));
        const { error } = await supabase3.from("trivia_questions").insert(prepared);
        if (error) {
          console.error("[Admin Trivia] Questions Insert Error:", error);
          if (error.message.includes("column") && error.message.includes("not found")) {
            return res.status(500).json({
              error: "Database Out of Sync",
              details: error.message,
              hint: "Run 'NOTIFY pgrst, 'reload schema';' in your Supabase SQL Editor to refresh the API cache."
            });
          }
          throw error;
        }
        let bookTitle = title || "General Knowledge Trivia";
        let bookDesc = description || "A challenge across various topics.";
        let bookCover = "";
        if (!isGeneral) {
          const { data: book } = await supabase3.from("books").select("title, cover_image").eq("id", dbId).single();
          if (book) {
            bookTitle = title || book.title;
            bookDesc = description || `Trivia challenge for ${book.title}.`;
            bookCover = book.cover_image || "";
          }
        }
        try {
          if (isGeneral) {
            const { data: existingTrivia } = await supabase3.from("trivias").select("id").is("book_id", null).maybeSingle();
            await supabase3.from("trivias").upsert({
              id: existingTrivia?.id || void 0,
              book_id: null,
              title: bookTitle,
              description: bookDesc,
              status: isActive ? "active" : "draft",
              is_active: !!isActive,
              type: "marketing",
              requires_premium: target_tier === "premium",
              starts_at: (/* @__PURE__ */ new Date()).toISOString(),
              reward_points: reward_points !== void 0 && reward_points !== null ? reward_points : 100,
              price: price !== void 0 && price !== null ? price : 0,
              target_tier: target_tier || "all",
              promotional_writeup: promotional_writeup || null,
              duration_seconds,
              thumbnail_url: thumbnail_url || bookCover,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            });
          } else {
            await supabase3.from("trivias").upsert(
              {
                book_id: dbId,
                title: bookTitle,
                description: bookDesc,
                status: isActive ? "active" : "draft",
                is_active: !!isActive,
                type: "marketing",
                requires_premium: target_tier === "premium",
                starts_at: (/* @__PURE__ */ new Date()).toISOString(),
                reward_points: reward_points !== void 0 && reward_points !== null ? reward_points : 100,
                price: price !== void 0 && price !== null ? price : 0,
                target_tier: target_tier || "all",
                promotional_writeup: promotional_writeup || null,
                duration_seconds,
                thumbnail_url: thumbnail_url || bookCover,
                created_at: (/* @__PURE__ */ new Date()).toISOString()
              },
              { onConflict: "book_id" }
            );
          }
        } catch (tErr) {
          console.warn("[Admin Trivia] 'trivias' table upsert skipped:", tErr);
        }
        res.json({ success: true, count: prepared.length });
      } catch (err) {
        console.error("[Admin Trivia] Create error details:", {
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint
        });
        const errMsg = err.message || err.error?.message || "Failed to create/update trivia";
        const details = err.details || "";
        const hint = err.hint || "";
        res.status(500).json({
          error: errMsg,
          details,
          hint
        });
      }
    }
  );
  app.delete(
    ["/api/admin/trivias/ebook/:ebookId", "/api/admin/trivia/delete/:ebookId"],
    authenticateUser,
    async (req, res) => {
      const isAdmin2 = req.profile?.account_tier === "admin";
      if (!isAdmin2) {
        return res.status(403).json({ error: "Only the CEO can delete trivia games." });
      }
      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const supabase3 = getSupabase();
        const qQuery = isGeneral ? supabase3.from("trivia_questions").delete().is("ebook_id", null) : supabase3.from("trivia_questions").delete().eq("ebook_id", dbId);
        const tQuery = isGeneral ? supabase3.from("trivias").update({ deleted: true }).is("book_id", null) : supabase3.from("trivias").update({ deleted: true }).eq("book_id", dbId);
        const aQuery = isGeneral ? supabase3.from("daily_trivia_attempts").delete().is("ebook_id", null) : supabase3.from("daily_trivia_attempts").delete().eq("ebook_id", dbId);
        const [qDel, tDel, aDel] = await Promise.all([qQuery, tQuery, aQuery]);
        if (qDel.error) throw qDel.error;
        if (tDel.error) throw tDel.error;
        res.json({ success: true, message: "Trivia set, questions, and attempts deleted successfully" });
      } catch (err) {
        console.error("[Admin Trivia] Delete error:", err);
        res.status(500).json({ error: "Failed to delete trivia set: " + err.message });
      }
    }
  );
  app.post(
    "/api/admin/trivia/launch",
    authenticateUser,
    async (req, res) => {
      const isAdmin2 = req.profile?.account_tier === "admin";
      if (!isAdmin2) {
        return res.status(403).json({ error: "Only the CEO can launch trivia games." });
      }
      const {
        triviaId,
        startDate,
        endDate,
        rewardPoints,
        price = 200,
        thumbnail_url,
        title = "",
        description = "",
        target_tier = "all",
        promotional_writeup = ""
      } = req.body;
      const isGeneral = triviaId === "general";
      const dbId = isGeneral ? null : triviaId;
      try {
        const supabase3 = getSupabase();
        const isAdmin3 = req.profile?.account_tier === "admin";
        if (!isGeneral && !isAdmin3) {
          const { data: book } = await supabase3.from("books").select("user_id").eq("id", dbId).single();
          if (book?.user_id !== req.profile?.id)
            return res.status(403).json({ error: "Permission denied." });
        } else if (isGeneral && !isAdmin3) {
          return res.status(403).json({ error: "Only the CEO can launch General Trivia." });
        }
        const qQuery = isGeneral ? supabase3.from("trivia_questions").select("*").is("ebook_id", null) : supabase3.from("trivia_questions").select("*").eq("ebook_id", dbId);
        const { data: questions, error: qErr } = await qQuery;
        if (qErr) throw qErr;
        if (!questions || questions.length < 5) {
          return res.status(400).json({
            error: "Launch blocked: You need at least 5 questions set before launching."
          });
        }
        const uQuery = isGeneral ? supabase3.from("trivia_questions").update({ is_active: true }).is("ebook_id", null) : supabase3.from("trivia_questions").update({ is_active: true }).eq("ebook_id", dbId);
        await uQuery;
        let bookTitle = title || "General Knowledge Trivia";
        let bookDesc = description || "Mixed topic challenge for everyone.";
        let bookCover = "";
        if (!isGeneral) {
          const { data: book } = await supabase3.from("books").select("title, cover_image").eq("id", dbId).single();
          if (book) {
            bookTitle = title || book.title;
            bookDesc = description || `Trivia challenge for ${book.title}.`;
            bookCover = book.cover_image || "";
          }
        }
        try {
          const startIso = startDate || (/* @__PURE__ */ new Date()).toISOString();
          if (isGeneral) {
            const { data: existingTrivia } = await supabase3.from("trivias").select("id").is("book_id", null).maybeSingle();
            const { error: tErr } = await supabase3.from("trivias").upsert({
              id: existingTrivia?.id || void 0,
              book_id: null,
              title: bookTitle,
              description: bookDesc,
              status: "active",
              is_active: true,
              type: "marketing",
              requires_premium: target_tier === "premium",
              starts_at: startIso,
              expiry_at: endDate,
              reward_points: rewardPoints !== void 0 && rewardPoints !== null ? rewardPoints : 100,
              price,
              target_tier: target_tier || "all",
              promotional_writeup: promotional_writeup || null,
              thumbnail_url: thumbnail_url || bookCover,
              created_at: startIso
            });
            if (tErr && tErr.code !== "42P01") throw tErr;
          } else {
            const { error: tErr } = await supabase3.from("trivias").upsert(
              {
                book_id: dbId,
                title: bookTitle,
                description: bookDesc,
                status: "active",
                is_active: true,
                type: "marketing",
                requires_premium: target_tier === "premium",
                starts_at: startIso,
                expiry_at: endDate,
                reward_points: rewardPoints !== void 0 && rewardPoints !== null ? rewardPoints : 100,
                price,
                target_tier: target_tier || "all",
                promotional_writeup: promotional_writeup || null,
                thumbnail_url: thumbnail_url || bookCover,
                created_at: startIso
              },
              { onConflict: "book_id" }
            );
            if (tErr && tErr.code !== "42P01") throw tErr;
          }
        } catch (tErr) {
          console.warn("[Admin Launch API] 'trivias' table upsert skipped:", tErr);
        }
        res.json({ success: true, message: "Launched successfully" });
      } catch (err) {
        console.error("[Admin Trivia] Launch error details:", {
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint
        });
        const errMsg = err.message || err.error?.message || "Failed to launch trivia session.";
        const details = err.details || "";
        const hint = err.hint || "";
        res.status(500).json({
          error: errMsg,
          details,
          hint
        });
      }
    }
  );
  app.post(
    "/api/admin/trivia/status",
    authenticateUser,
    async (req, res) => {
      const isAdmin2 = req.profile?.account_tier === "admin";
      if (!isAdmin2) {
        return res.status(403).json({ error: "Only the CEO can suspend/resume trivia games." });
      }
      try {
        const { bookId, status } = req.body;
        const isGeneral = bookId === "general" || bookId === null;
        const supabase3 = getSupabase();
        const isAdmin3 = req.profile?.account_tier === "admin";
        if (!isGeneral && !isAdmin3) {
          const { data: book } = await supabase3.from("books").select("user_id").eq("id", bookId).single();
          if (book?.user_id !== req.profile?.id)
            return res.status(403).json({ error: "Permission denied." });
        } else if (isGeneral && !isAdmin3) {
          return res.status(403).json({ error: "Only the CEO can change General Trivia status." });
        }
        const qUpdate = isGeneral ? supabase3.from("trivia_questions").update({ is_active: status === "active" }).is("ebook_id", null) : supabase3.from("trivia_questions").update({ is_active: status === "active" }).eq("ebook_id", bookId);
        await qUpdate;
        try {
          const query = isGeneral ? supabase3.from("trivias").update({ status }).is("book_id", null) : supabase3.from("trivias").update({ status }).eq("book_id", bookId);
          const { error } = await query;
          if (error && error.code !== "42P01") throw error;
        } catch (statusErr) {
          console.warn("[Admin Trivia Status] 'trivias' table update skipped:", statusErr);
        }
        logMprAudit({
          admin_id: req.profile?.id || req.user?.id,
          action_type: status === "active" ? "approved_trivia" : status === "rejected" ? "rejected_trivia" : "updated_trivia_status",
          target_type: "trivia",
          target_id: String(bookId || "general"),
          details: { status, isGeneral },
          ip_address: req.ip
        });
        res.json({ success: true });
      } catch (err) {
        console.error("[Admin Trivia] Status update error:", err);
        res.status(500).json({ error: "Failed to update trivia status" });
      }
    }
  );
  app.post(
    "/api/user/convert-points",
    authenticateUser,
    async (req, res) => {
      try {
        const supabase3 = getSupabase();
        const { points } = req.body;
        const currentPoints = req.profile?.t_points || 0;
        if (points > currentPoints) {
          return res.status(400).json({ error: "Insufficient T-Points" });
        }
        const nairaValue = points * 5;
        if (nairaValue < 5e3) {
          return res.status(400).json({ error: "Minimum conversion is 5,000 Naira" });
        }
        const { error: rpcErr } = await supabase3.rpc("increment_user_balance", {
          p_user_id: req.profile?.id,
          p_points_delta: -points,
          p_wallet_delta: nairaValue
        });
        const newPoints = currentPoints - points;
        const newBalance = (req.profile?.wallet_balance || 0) + nairaValue;
        if (rpcErr) {
          console.warn("[Convert Points] RPC balance update failed, falling back to read-then-write:", rpcErr);
          const { error } = await supabase3.from("users").update({
            t_points: newPoints,
            wallet_balance: newBalance
          }).eq("id", req.profile?.id);
          if (error) throw error;
        }
        res.json({ success: true, nairaValue, newPoints, newBalance });
      } catch (err) {
        console.error("Convert points error:", err);
        res.status(500).json({ error: "Failed to convert points" });
      }
    }
  );
  app.use("/api", (err, req, res, next) => {
    console.error("API Error [Global Handler]:", err);
    const isAdmin2 = !!req.profile?.is_admin && [
      "samuelchukwuemeke05@gmail.com"
    ].includes((req.profile?.email || req.user?.email || "").toLowerCase());
    const userEmail = req.profile?.email || req.user?.email || "";
    res.status(err.status || 500).json({
      error: maskError(err, isAdmin2)
    });
  });
  app.get(
    "/api/health-check",
    (req, res) => res.json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() })
  );
  app.all("/api/*", (req, res) => {
    const acceptsHtml = req.headers.accept && req.headers.accept.includes("text/html");
    if (acceptsHtml && !req.xhr && req.headers["x-requested-with"] !== "XMLHttpRequest") {
      return res.redirect("/login");
    }
    res.status(404).json({ error: "API route not found", path: req.path });
  });
  app.get(["/calmreader.apk", "/calmreader-latest.apk", "/download/calmreader.apk", "/api/download/apk"], (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    const possiblePaths = [
      path.resolve(process.cwd(), "public", "calmreader.apk"),
      path.resolve(process.cwd(), "public", "calmreader-latest.apk"),
      path.resolve(process.cwd(), "dist", "calmreader.apk"),
      path.resolve(process.cwd(), "dist", "calmreader-latest.apk"),
      path.resolve(process.cwd(), isProd ? "dist" : "public", "calmreader.apk"),
      path.resolve(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    ];
    const apkPath = possiblePaths.find((p) => fs.existsSync(p));
    if (apkPath) {
      const stats = fs.statSync(apkPath);
      res.setHeader("Content-Type", "application/vnd.android.package-archive");
      res.setHeader("Content-Disposition", 'attachment; filename="calmreader.apk"');
      res.setHeader("Content-Length", stats.size);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(apkPath);
    }
    return res.status(404).json({ error: "CalmReader APK file not found on server." });
  });
  app.get(["/version.json", "/api/version"], (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    const possiblePaths = [
      path.resolve(process.cwd(), "public", "version.json"),
      path.resolve(process.cwd(), isProd ? "dist" : "public", "version.json")
    ];
    const versionPath = possiblePaths.find((p) => fs.existsSync(p));
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    if (versionPath) {
      try {
        const data = fs.readFileSync(versionPath, "utf-8");
        return res.send(data);
      } catch (err) {
        console.warn("[VersionCheck] Failed reading version.json from disk:", err);
      }
    }
    return res.json({
      version: "1.0.1",
      versionCode: 2,
      releaseDate: "2026-09-04",
      fileSize: "7.1 MB",
      minAndroid: "Android 8.0+ (Oreo or higher)",
      packageName: "com.calmreader.mobile",
      notes: "Seamless offline reading, high-performance Trivia Hub, mobile-first MPR Partner Dashboard, and enhanced card reader animations.",
      downloadUrl: "/calmreader.apk",
      latestDownloadUrl: "/calmreader-latest.apk"
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const startTime = Date.now();
    console.log("[Server] Initializing Vite middleware (Standard Mode)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log(
      `[Server] Vite middleware ready in ${Date.now() - startTime}ms`
    );
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    console.log(`[Server] Serving production assets from: ${distPath}`);
    app.use(
      express.static(distPath, {
        maxAge: "1d",
        setHeaders: (res, filePath) => {
          if (filePath.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
          } else {
            res.setHeader("Cache-Control", "public, max-age=86400, must-revalidate");
          }
        }
      })
    );
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `[Server] Listening on http://localhost:${PORT} [${process.env.NODE_ENV || "dev"}]`
      );
      autoSeedTriviasAndVerify().catch((e) => {
        console.error("[Server] Auto-seed background worker error:", e);
      });
    });
  }
  return app;
}
async function autoSeedTriviasAndVerify() {
  const supabase2 = getSupabase();
  if (supabase2.__isDummy) {
    console.log("[AutoSeed] Supabase is unconfigured (dummy). Skipping auto-seed.");
    return;
  }
  try {
    const dbAdmin = getSupabaseAdmin();
    if (dbAdmin && !dbAdmin.__isDummy) {
      console.log("[BAN DUMMY] Initiating database self-cleaning routine...");
      const { error: err1 } = await dbAdmin.from("transactions").delete().eq("buyer_email", "No Email");
      if (err1) console.warn("[BAN DUMMY] Delete buyer_email error:", err1.message);
      const { error: err2 } = await dbAdmin.from("transactions").delete().is("user_id", null);
      if (err2) console.warn("[BAN DUMMY] Delete null user_id error:", err2.message);
      const { error: err3 } = await dbAdmin.from("transactions").delete().in("type", ["mock", "test"]);
      if (err3) console.warn("[BAN DUMMY] Delete mock/test type error:", err3.message);
      const { data: txs100, error: err100 } = await dbAdmin.from("transactions").select("id, paystack_reference, type").eq("amount", 100);
      if (!err100 && txs100 && txs100.length > 0) {
        const idsToDelete = txs100.filter((tx) => {
          const ref = (tx.paystack_reference || "").toLowerCase();
          return !ref || ref.includes("mock") || ref.includes("test") || ref.includes("free") || ref.startsWith("manual-");
        }).map((tx) => tx.id);
        if (idsToDelete.length > 0) {
          await dbAdmin.from("transactions").delete().in("id", idsToDelete);
          console.log(`[BAN DUMMY] Deleted ${idsToDelete.length} test transactions of amount = 100.`);
        }
      }
      const { data: upgrades, error: errUp } = await dbAdmin.from("transactions").select("id, paystack_reference").eq("type", "premium_upgrade");
      if (!errUp && upgrades && upgrades.length > 0) {
        const upgradesToDelete = upgrades.filter((tx) => {
          const ref = (tx.paystack_reference || "").toLowerCase();
          return !ref || ref.includes("mock") || ref.includes("test") || ref.includes("free") || ref.startsWith("manual-");
        }).map((tx) => tx.id);
        if (upgradesToDelete.length > 0) {
          await dbAdmin.from("transactions").delete().in("id", upgradesToDelete);
          console.log(`[BAN DUMMY] Deleted ${upgradesToDelete.length} dummy premium upgrade transactions.`);
        }
      }
      const { data: purchases, error: errP } = await dbAdmin.from("ebook_purchases").select("*");
      if (!errP && purchases && purchases.length > 0) {
        const { data: txPurchases, error: errTxP } = await dbAdmin.from("transactions").select("user_id, book_id, paystack_reference").eq("type", "purchase");
        if (!errTxP && txPurchases) {
          const validSets = new Set(
            txPurchases.filter((tx) => {
              const ref = (tx.paystack_reference || "").toLowerCase();
              return ref && !ref.includes("mock") && !ref.includes("test");
            }).map((tx) => `${tx.user_id}:${tx.book_id}`)
          );
          const purchasesToDelete = purchases.filter((p) => {
            const bookId = p.book_id || p.ebook_id;
            const key = `${p.user_id}:${bookId}`;
            return !validSets.has(key);
          }).map((p) => p.id);
          if (purchasesToDelete.length > 0) {
            await dbAdmin.from("ebook_purchases").delete().in("id", purchasesToDelete);
            console.log(`[BAN DUMMY] Deleted ${purchasesToDelete.length} orphan/dummy ebook_purchases.`);
          }
        }
      }
      const { data: trivias, error: errT } = await dbAdmin.from("trivias").select("id, title, created_at");
      if (!errT && trivias && trivias.length > 0) {
        const testKeywords = ["test", "mock", "dummy", "sample", "untitled"];
        const triviasToDelete = [];
        const seenTitles = /* @__PURE__ */ new Set();
        const sortedTrivias = [...trivias].sort((a, b) => {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });
        for (const t of sortedTrivias) {
          const titleLower = (t.title || "").toLowerCase().trim();
          const isTest = !titleLower || testKeywords.some((kw) => titleLower.includes(kw));
          const isDuplicate = seenTitles.has(titleLower);
          if (isTest || isDuplicate) {
            triviasToDelete.push(t.id);
          } else {
            seenTitles.add(titleLower);
          }
        }
        if (triviasToDelete.length > 0) {
          const { error: delTError } = await dbAdmin.from("trivias").delete().in("id", triviasToDelete);
          if (!delTError) {
            console.log(`[BAN DUMMY] Successfully cleaned up ${triviasToDelete.length} test or duplicate trivias.`);
          } else {
            console.warn("[BAN DUMMY] Failed to delete test/duplicate trivias:", delTError.message);
          }
        }
      }
      console.log("[BAN DUMMY] Database self-cleaning completed successfully.");
    }
  } catch (cleanErr) {
    console.warn("[BAN DUMMY] Database self-cleaning exception:", cleanErr.message || cleanErr);
  }
  async function safeInsertTrivia(payload) {
    let attemptPayload = { ...payload };
    while (true) {
      const { error } = await supabase2.from("trivias").insert(attemptPayload);
      if (!error) {
        return { success: true };
      }
      const errorMessage = error.message || "";
      if (errorMessage.includes("column") || errorMessage.includes("duration_seconds") || errorMessage.includes("status") || errorMessage.includes("thumbnail_url") || errorMessage.includes("slug") || error.code === "PGRST204") {
        let removedSomething = false;
        if (attemptPayload.duration_seconds !== void 0 && (errorMessage.includes("duration_seconds") || errorMessage.includes("find the 'duration_seconds' column"))) {
          delete attemptPayload.duration_seconds;
          removedSomething = true;
        }
        if (attemptPayload.status !== void 0 && (errorMessage.includes("status") || errorMessage.includes("find the 'status' column"))) {
          delete attemptPayload.status;
          removedSomething = true;
        }
        if (attemptPayload.thumbnail_url !== void 0 && (errorMessage.includes("thumbnail_url") || errorMessage.includes("find the 'thumbnail_url' column"))) {
          delete attemptPayload.thumbnail_url;
          removedSomething = true;
        }
        if (!removedSomething) {
          const match = errorMessage.match(/column "(.*?)"/i) || errorMessage.match(/column '(.*?)'/i) || errorMessage.match(/'(.*?)' column/i) || errorMessage.match(/"(.*?)" column/i);
          if (match && match[1] && attemptPayload[match[1]] !== void 0) {
            delete attemptPayload[match[1]];
            removedSomething = true;
          } else {
            let keys = Object.keys(attemptPayload);
            for (const key of keys) {
              if (errorMessage.includes(key)) {
                delete attemptPayload[key];
                removedSomething = true;
                break;
              }
            }
            if (!removedSomething) {
              return { success: false, error };
            }
          }
        }
      } else {
        return { success: false, error };
      }
    }
  }
  console.log("[AutoSeed] Trivia auto-seeding has been disabled to prevent deleted or non-active trivias from being re-created.");
}
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("CRITICAL: Failed to start server:", err);
    process.exit(1);
  });
}
export {
  resetGlobalSupabase,
  startServer
};
//# sourceMappingURL=server.mjs.map
