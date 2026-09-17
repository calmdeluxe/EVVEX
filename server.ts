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
import { canPlayTrivia, isAdmin as checkIsAdmin } from "./src/utils/triviaEligibility";
import { setupPublishingRoutes } from "./src/server/publishingRoutes";

dotenv.config();

const brevoApiKey = cleanSecret(process.env.BREVO_API_KEY);
const brevoSender =
  cleanSecret(process.env.BREVO_SENDER_EMAIL) || "no-reply@calmreader.com";

let brevoApi: BrevoClient | null = null;
function getBrevo() {
  if (!brevoApi) {
    const key = cleanSecret(process.env.BREVO_API_KEY);
    if (key && key.length > 5) {
      brevoApi = new BrevoClient({ apiKey: key });
    }
  }
  return brevoApi;
}

let supabase: any;

/**
 * Robustly cleans a secret by stripping quotes, whitespace,
 * and common prefixes like "KEY=" if the user pasted the whole line.
 */
function cleanSecret(val: string | undefined): string {
  if (!val || typeof val !== "string") return "";
  let cleaned = val.trim();
  // Remove surrounding quotes if any
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }
  // If the user pasted the whole line like "SUPABASE_URL=...", extract just the value
  // Only split if the first part looks like a typical environment variable name (ALL_CAPS)
  if (cleaned.includes("=")) {
    const parts = cleaned.split("=");
    if (parts.length > 1 && /^[A-Z0-9_]+$/.test(parts[0].trim())) {
      cleaned = parts[1].trim();
    }
  }
  return cleaned;
}

function extractProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  // Handle both https://abc.supabase.co and https://abc.supabase.net or any other variant
  const urlMatch = url.match(/https?:\/\/([^.]+)\.supabase\.(co|net|io)/);
  return urlMatch ? urlMatch[1] : null;
}

function extractProjectRefFromKey(key: string | undefined): string | null {
  if (!key || !key.startsWith("eyJ")) return null;
  try {
    const parts = key.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

    // Some keys use 'sub' or 'ref' or 'iss'
    // For service_role keys, 'ref' is common.
    // For anon keys, it might be in 'iss'.
    if (payload.ref) return payload.ref;
    if (payload.iss && payload.iss !== "supabase") {
      const issParts = payload.iss.split(".");
      const ref = issParts.find((p: string) => p.length === 20); // Supabase refs are usually 20 chars
      if (ref) return ref;
    }
    if (payload.sub && payload.sub.length === 20) return payload.sub;

    return payload.ref || null;
  } catch (e) {
    return null;
  }
}

/**
 * Validates if the Supabase URL and Key belong to the same project
 */
function validateSupabaseConfig(
  url: string,
  key: string,
): { ok: boolean; reason?: string; isPlaceholder?: boolean } {
  if (!url || !key) return { ok: false, reason: "Missing URL or Key" };

  // Explicit check for the unconfigured placeholder URL/Key
  const PLACEHOLDER_URL = "https://fictional-placeholder-to-be-replaced.supabase.co";
  if (url === PLACEHOLDER_URL || url.includes("fictional-placeholder-to-be-replaced") || key.includes("placeholder-key-to-be-replaced")) {
    return {
      ok: false,
      isPlaceholder: true,
      reason: "Supabase database project is not configured yet. Please open the /setup wizard or configure your keys.",
    };
  }

  // Explicit check for Paystack keys swapped into Supabase fields
  if (url.startsWith("pk_") || url.startsWith("sk_") || url.startsWith("sb_")) {
    return {
      ok: false,
      reason: `CRITICAL: You put a Paystack key [${url.substring(0, 10)}...] into the Supabase URL field. Please use the "Project URL" from Supabase instead.`,
    };
  }
  if (key.startsWith("pk_") || key.startsWith("sk_") || key.startsWith("sb_")) {
    return {
      ok: false,
      reason: `CRITICAL: You put a Paystack key [${key.substring(0, 10)}...] into the Supabase Key field. Supabase keys start with "eyJ".`,
    };
  }

  if (!url.startsWith("http"))
    return {
      ok: false,
      reason: `URL does not start with http: [${url.substring(0, 10)}...]`,
    };
  if (!key.startsWith("eyJ"))
    return { ok: false, reason: "API key must be a JWT (starts with eyJ)" };

  const urlRef = extractProjectRef(url);
  const keyRef = extractProjectRefFromKey(key);

  if (urlRef && keyRef && urlRef !== keyRef) {
    return {
      ok: false,
      reason: `Mismatched Project: URL belongs to [${urlRef}] but API key belongs to [${keyRef}].`,
    };
  }
  return { ok: true };
}

function getSupabase() {
  const PLACEHOLDER_URL = "https://wgdcroglmhzmrvqrixku.supabase.co";
  const PLACEHOLDER_KEY_PREFIX = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGNyb2dsbWh6bXJ2cXJpeGt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTMxMjIsImV4cCI6MjA5MTc2OTEyMn0.zmWG2K3OpU25wSDBOSmKnpFHUABNtRklAzCg-f5VYic";

  // Prioritize and CLEAN non-placeholder secrets
  const foundIn = [];
  if (process.env.SUPABASE_URL) foundIn.push("SUPABASE_URL");
  if (process.env.VITE_SUPABASE_URL) foundIn.push("VITE_SUPABASE_URL");

  let envUrl = cleanSecret(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
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
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY,
  );

  // LOG ALL CANDIDATES to help user identify what's being picked
  console.log(`[Supabase Config Audit]`);
  console.log(
    `-> SUPABASE_URL: ${process.env.SUPABASE_URL ? `SET (${extractProjectRef(cleanSecret(process.env.SUPABASE_URL))})` : "UNSET"}`,
  );
  console.log(
    `-> VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? `SET (${extractProjectRef(cleanSecret(process.env.VITE_SUPABASE_URL))})` : "UNSET"}`,
  );

  const isServiceKey =
    envKey &&
    (envKey === cleanSecret(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
      envKey === cleanSecret(process.env.SUPABASE_SERVICE_KEY) ||
      envKey === cleanSecret(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY));

  const keyRef = extractProjectRefFromKey(envKey);
  console.log(
    `-> ACTIVE_KEY_TYPE: ${isServiceKey ? "SERVICE_ROLE" : "ANON/PUBLIC"}`,
  );
  console.log(`-> ACTIVE_KEY_REF: ${keyRef || "UNKNOWN"}`);

  console.log(
    `[Supabase Config Discovery] URL from: [${foundIn.join(", ") || "NONE"}], Key type: [${isServiceKey ? "SERVICE_ROLE" : "ANON/PUBLIC"}]`,
  );

  let url = envUrl;
  if (!url) {
    if (
      envKey &&
      !envKey.startsWith(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGNyb2dsbWh6bXJ2cXJpeGt1",
      )
    ) {
      console.error(
        "[Supabase Config] API Key is set but SUPABASE_URL is missing! Blocking placeholder fallback to avoid mismatch.",
      );
      url = "MISSING_URL";
    } else {
      url = PLACEHOLDER_URL;
    }
  }

  let key = envKey;
  if (!key) key = PLACEHOLDER_KEY_PREFIX; // Fallback to placeholder if missing

  const configStatus = validateSupabaseConfig(url, key);

  if (!configStatus.ok) {
    const missing = [];
    if (!envUrl) {
      missing.push("SUPABASE_URL");
      configStatus.reason =
        "SUPABASE_URL is missing. Please provide it in the AI Studio Settings.";
    }
    if (!envKey) {
      missing.push("SUPABASE_ANON_KEY (or service role)");
      configStatus.reason =
        "Supabase API Key is missing. Please provide it in the AI Studio Settings.";
    }

    // Specifically handle the case where Key is provided but it mismatched the placeholder URL
    if (!envUrl && envKey && configStatus.reason?.includes("Mismatched")) {
      const projectRef =
        configStatus.reason.match(/belongs to \[(.*?)\]/)?.[1] || "unknown";
      const keyRef =
        configStatus.reason.match(/API key belongs to \[(.*?)\]/)?.[1] ||
        "unknown";
      configStatus.reason = `CRITICAL CONFIG MISMATCH: The URL you provided is for project [${projectRef}] but the API Key is for project [${keyRef}]. Please go to Secret Box and make sure BOTH URL and Key are from the SAME Supabase project. Also ensure there are NO duplicate VITE_ keys if you already have the standard ones.`;
    }

    if (missing.length > 0 && !configStatus.reason?.includes("missing")) {
      configStatus.reason = `Missing required environment variables: ${missing.join(", ")}`;
    }
    console.warn(`[Supabase Config WARNING] ${configStatus.reason}`);
    // If it's a critical error (like wrong key format), use dummy to prevent app crash
    return createDummySupabase(configStatus);
  }

  console.log(
    `[Supabase Config OK] Active Project URL: ${url.substring(0, 30)}...`,
  );

  // If already initialized and NOT a dummy, return it
  if (supabase && !supabase.__isDummy) {
    return supabase;
  }

  // Try to initialize
  try {
    if (url && url.startsWith("http") && key && key.length > 20) {
      console.log(`[Supabase] Initializing with URL: ${url}`);
      const client = createClient(url, key);

      // Attach the validation status for UI feedback
      (client as any).__configStatus = configStatus;

      supabase = client;
      return supabase;
    }
  } catch (e) {
    console.error("[Supabase] Failed to initialize client:", e);
  }

  // Fallback to dummy if still not initialized or if initialization failed
  return createDummySupabase(configStatus);
}

function getSupabaseAdmin() {
  const url = cleanSecret(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) || "https://wgdcroglmhzmrvqrixku.supabase.co";
  const serviceKey = cleanSecret(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
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

export function resetGlobalSupabase() {
  supabase = null;
}

function createDummySupabase(configStatus: { ok: boolean; reason?: string }) {
  if (!supabase || supabase.__isDummy) {
    if (!supabase) {
      console.warn(
        "[Supabase] Initialization deferred or failed. Using non-functional dummy client.",
      );
    }

    // We already have a dummy or need a new one
    const dummyError = configStatus.ok
      ? "Database connection deferred. Please check your network and project status."
      : configStatus.reason || "Database configuration mismatch.";

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
        then: (cb: any) => cb({ data: [], error: dummyResponse.error }),
      };
      return obj;
    };

    supabase = {
      __isDummy: true,
      __configStatus: configStatus,
      from: () => chainable(),
      rpc: () => Promise.resolve(dummyResponse),
      auth: {
        getUser: (token: string) =>
          Promise.resolve({ data: { user: null }, error: dummyResponse.error }),
        getSession: () =>
          Promise.resolve({
            data: { session: null },
            error: dummyResponse.error,
          }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
    };
  }
  return supabase;
}

/**
 * Utility to mask technical errors for non-admin users
 */
function maskError(err: any, isAdmin: boolean = false) {
  // Treat the requester as admin if they have the isAdmin flag
  if (isAdmin) return err.message || err;

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
    "mismatched",
  ];
  const errMsg = (err?.message || String(err || "")).toLowerCase();

  if (technicalKeywords.some((key) => errMsg.includes(key))) {
    return "Our services are currently undergoing maintenance. Please try again in a few minutes.";
  }

  return err?.message || "An unexpected error occurred.";
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer() {
  const supabase = getSupabase();

  // 🛡️ CRITICAL SECURITY: Admin Cleanup on Start (Non-blocking Background Task)
  // Ensure only authorized emails have admin privileges in the database
  if (supabase && !supabase.__isDummy) {
    console.log("[Server] Running Admin Privilege Cleanup in background...");
    (async () => {
      try {
        const ADMIN_EMAILS = ["samuelchukwuemeke05@gmail.com", "chukwuemekedaniella@gmail.com", "winbigonly@gmail.com"].map((e) => e.toLowerCase());

        // 1. Remove admin privileges from all EXCEPT the authorized admins
        // Standard supabase-js syntax for NOT IN. Only touch users who are admin/is_admin to avoid demoting premium/authors
        const { error: cleanupError } = await supabase
          .from("users")
          .update({ is_admin: false, account_tier: "free" })
          .not("email", "in", `(${ADMIN_EMAILS.join(",")})`)
          .or("is_admin.eq.true,account_tier.eq.admin");

        if (cleanupError) {
          console.warn(
            "[Server] Admin Cleanup (Phase 1) Warning:",
            cleanupError.message,
          );
        }

        // 2. Ensure authorized are admins
        const { error: promoteError } = await supabase
          .from("users")
          .update({ is_admin: true, account_tier: "admin" })
          .in("email", ADMIN_EMAILS);

        if (promoteError) {
          console.warn(
            "[Server] Admin Cleanup (Phase 2) Warning:",
            promoteError.message,
          );
        }

        console.log("[Server] Admin Privilege Cleanup Complete.");

        // 3. Fix trivia creation defaults & access:
        // Ensure all active trivias have starts_at, valid requires_premium flag, and marketing type
        try {
          // Fix all reader_reward trivias that are missing a start date
          await supabase
            .from("trivias")
            .update({ requires_premium: false })
            .eq("type", "reader_reward")
            .eq("requires_premium", true)
            .is("starts_at", null);

          // Set default start date for active trivias missing starts_at
          const { data: missingStarts } = await supabase
            .from("trivias")
            .select("id, created_at")
            .eq("is_active", true)
            .eq("status", "active")
            .is("starts_at", null);

          if (missingStarts && missingStarts.length > 0) {
            for (const t of missingStarts) {
              await supabase
                .from("trivias")
                .update({ starts_at: t.created_at || new Date().toISOString() })
                .eq("id", t.id);
            }
          }
        } catch (tErr: any) {
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
  const PORT = 3000;

  // Request logger for API calls only (prevents logging every dev asset request)
  app.use((req, res, next) => {
    if (req.url === "/debug-heartbeat" || !req.url.startsWith("/api")) return next();
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });

  // Early heartbeat
  app.get("/debug-heartbeat", (req, res) =>
    res.json({
      status: "ok",
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
    }),
  );

  app.post(
    "/api/paystack-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["x-paystack-signature"];
      const secret = cleanSecret(process.env.PAYSTACK_SECRET_KEY);
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const expectedSignature = secret
        ? crypto.createHmac("sha512", secret).update(rawBody).digest("hex")
        : "";
      const receivedSignature = Array.isArray(signature) ? signature[0] : signature;
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const receivedBuffer = Buffer.from(receivedSignature || "", "utf8");

      if (
        !secret ||
        !receivedSignature ||
        expectedBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        return res.status(401).json({ ok: false, error: "Invalid signature" });
      }

      let event: any;
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
      const { data: processedWebhook, error: processedWebhookError } = await adminSupabase
        .from("processed_webhook_refs")
        .select("reference")
        .eq("reference", reference)
        .maybeSingle();

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
        ticket_number: ticketNumber,
      } = metadata;

      if (
        !eventId ||
        !tierId ||
        !userId ||
        !attendeeName ||
        !attendeeEmail ||
        !attendeePhone ||
        !ticketNumber ||
        typeof event.data.amount !== "number"
      ) {
        return res.status(400).json({ ok: false, error: "Incomplete event ticket metadata" });
      }

      const { data: tier, error: tierError } = await adminSupabase
        .from("event_ticket_tiers")
        .select("price_kobo, event_id")
        .eq("id", tierId)
        .maybeSingle();

      if (tierError) {
        console.error("[Paystack Webhook] Tier lookup failed:", tierError.message);
        return res.status(500).json({ ok: false, error: "Ticket tier lookup failed" });
      }

      if (!tier || String(tier.event_id) !== String(eventId)) {
        console.warn(
          "[Paystack Webhook] Event/tier mismatch:",
          reference,
          eventId,
          tier?.event_id || null,
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
          event.data.amount,
        );
        return res.status(400).json({ ok: false, reason: "amount_mismatch" });
      }

      const qrCodeHash = crypto
        .createHash("sha256")
        .update(`${reference}:${ticketNumber}`)
        .digest("hex");

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
          p_qr_code_hash: qrCodeHash,
        },
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
    },
  );

  app.use(express.json());

  // Development-only Paystack webhook simulator. Never register in production.
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/dev/simulate-webhook", async (req, res) => {
      const { amount, event_id: eventId, tier_id: tierId, user_id: userId } = req.body || {};

      if (
        typeof amount !== "number" ||
        !Number.isSafeInteger(amount) ||
        !eventId ||
        !tierId ||
        !userId
      ) {
        return res.status(400).json({
          ok: false,
          error: "amount, event_id, tier_id, and user_id are required",
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
            ticket_number: `TEST-${timestamp}`,
          },
        },
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
          "x-paystack-signature": signature,
        },
        body: rawBody,
      });
      const responseBody = await webhookResponse.text();

      res.status(webhookResponse.status);
      const contentType = webhookResponse.headers.get("content-type");
      if (contentType) res.setHeader("content-type", contentType);
      return res.send(responseBody);
    });
  }

  // Serve PWA assets directly to prevent any redirect issues (essential for service workers)
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

  // Interceptor for /api routes to prevent raw JSON/HTML rendering when accessed directly in browser
  app.use("/api", (req, res, next) => {
    const acceptsHtml = req.headers.accept && req.headers.accept.includes("text/html");
    const isAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest" || (req.headers.accept && req.headers.accept.includes("application/json"));
    const hasAuth = !!req.headers.authorization;

    if (acceptsHtml && !isAjax && !hasAuth) {
      return res.redirect("/login");
    }
    next();
  });

  app.get("/api/health", async (req, res) => {
    let dbStatus = "unknown";
    try {
      const supabase = getSupabase();
      if (!supabase || supabase.__isDummy) {
        dbStatus = "misconfigured";
      } else {
        const { error } = await supabase
          .from("users")
          .select("count", { count: "exact", head: true })
          .limit(1);
        dbStatus = error ? "error" : "ok";
      }
    } catch (e) {
      dbStatus = "exception";
    }
    res.json({
      status: "ok",
      db: dbStatus,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      config: (supabase as any).__configStatus || { ok: true },
    });
  });

  // Server-side image generation proxy with smart multi-model fallbacks and backoff retries
  let cachedCloudflareCredentials: { accountId: string; apiToken: string } | null = null;

  async function resolveCloudflareCredentials(): Promise<{ accountId: string; apiToken: string } | null> {
    if (cachedCloudflareCredentials) {
      return cachedCloudflareCredentials;
    }

    let accountId = cleanSecret(process.env.CLOUDFLARE_ACCOUNT_ID);
    let apiToken = cleanSecret(process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY);

    if (!apiToken && !accountId) {
      return null;
    }

    // Cloudflare Account ID: 32-character hexadecimal string
    // Cloudflare Token: typically starts with "cfut_" or is a longer key
    const isIdHex32 = accountId && accountId.length === 32 && /^[a-f0-9]+$/i.test(accountId);
    const isTokenHex32 = apiToken && apiToken.length === 32 && /^[a-f0-9]+$/i.test(apiToken);
    const idHasTokenPrefix = accountId && (accountId.startsWith("cfut_") || accountId.length > 32);

    // Swap detection and self-healing
    if (idHasTokenPrefix && isTokenHex32) {
      console.log("[Cloudflare Auto-Healing] Swapped credentials detected in environment. Performing automatic healing...");
      const temp = accountId;
      accountId = apiToken;
      apiToken = temp;
    }

    // Attempt dynamically fetching Account ID using GET /accounts list if invalid or missing
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
      } catch (err: any) {
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
    const s = typeof seed === "string" ? seed : Math.floor(Math.random() * 1000000).toString();

    // 1. Try Cloudflare Workers AI if credentials are set
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
                seed: parseInt(s) || undefined
              })
            });

            if (cfResponse.ok) {
              const arrayBuffer = await cfResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              if (buffer.length > 500) {
                // If the response is JSON, we might have received an error inside 200 OK. Let's do a quick safety check.
                const contentType = cfResponse.headers.get("content-type") || "";
                if (contentType.includes("application/json") || buffer.toString("utf-8").trim().startsWith("{")) {
                  try {
                    const parsed = JSON.parse(buffer.toString("utf-8"));
                    const hasErrors = parsed.success === false || (Array.isArray(parsed.errors) && parsed.errors.length > 0);
                    if (hasErrors) {
                      console.warn(`[API Image Proxy] Cloudflare returned error JSON payload:`, parsed);
                      continue;
                    }

                    // Decode base64 binary if success JSON holds base64 data
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
                    // Not valid JSON, process as standard binary buffer
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
          } catch (cfErr: any) {
            console.error(`[API Image Proxy] Exception on Cloudflare Workers AI model "${cfModel}" attempt ${attempt + 1}:`, cfErr.message || cfErr);
          }
        }
      }
      console.warn(`[API Image Proxy] All active Cloudflare Workers AI models failed or timed out. Falling back to multi-model backup orchestration...`);
    } else {
      console.log(`[API Image Proxy] Cloudflare credentials not set or could not be healed. Falling back to multi-model public nodes...`);
    }

    // 2. Backup Orchestration (Pollinations AI Multi-Model fallbacks)
    const modelsToTry = [
      "", // default (flux)
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
            } catch (e) {}
            console.warn(`[API Image Proxy] Attempt ${attempt + 1} for ${model || "flux"} failed: ${errMsg}`);
            lastError = errMsg;

            if (response.status === 400) {
              break; // Don't retry bad request params
            }
            continue; // Retry
          }

          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            let errMsg = "JSON response received instead of raw visual data";
            try {
              const parsed = await response.json();
              errMsg = parsed.error || parsed.message || (parsed.accepts ? "Queue limit reached" : errMsg);
            } catch (e) {}
            console.warn(`[API Image Proxy] Model "${model || "flux"}" returned JSON error: ${errMsg}`);
            lastError = errMsg;
            continue; // Try next model or retry
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length < 1000) {
            const textContent = buffer.toString("utf-8");
            if (textContent.includes("error") || textContent.includes("Queue full") || textContent.includes("limit")) {
              console.warn(`[API Image Proxy] Tiny response buffer with error text detected: ${textContent}`);
              lastError = textContent;
              continue; // Try next model
            }
          }

          console.log(`[API Image Proxy] Successfully generated with model "${model || "flux"}". Buffer size: ${buffer.length} bytes.`);

          res.setHeader("Content-Type", contentType || "image/jpeg");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.setHeader("X-Generated-By", "Pollinations-AI");
          return res.send(buffer);

        } catch (err: any) {
          console.error(`[API Image Proxy] Exception on model "${model || "flux"}", attempt ${attempt + 1}:`, err.message || err);
          lastError = err.message || "Network request error";
        }
      }
    }

    return res.status(503).json({
      error: `AI Image synthesis is temporarily overloaded across all active cloud and proxy models. ${lastError ? `Details: ${lastError}` : ""}. Please try again in 5-10 seconds.`
    });
  });

  // Server-side POST proxy for Cloudflare Pages /api/generate-image compatibility
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
        } catch (workerErr: any) {
          console.warn("[Express Dev Proxy] Exception trying to contact VITE_IMAGE_WORKER_URL, falling back:", workerErr.message || workerErr);
        }
      }

      // If no Worker configured or if the Worker call failed, fallback to the robust cloud generator
      console.log("[Express Dev Proxy] Invoking local fallbacks for design elements...");
      // Redirect or fetch internally from get /api/generate-image-proxy
      // Instead of redirecting we can perform an internal fetch or invoke the generator
      const w = width || "512";
      const h = height || "512";
      const seed = Math.floor(Math.random() * 1000000).toString();
      
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
      } catch (fallbackErr: any) {
        // Fallback to direct Pollinations query if localhost fetch has issues
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true`;
        try {
          const response = await fetch(pollUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            res.setHeader("Content-Type", "image/jpeg");
            return res.send(Buffer.from(buffer));
          }
        } catch (directErr: any) {
          return res.status(500).json({ error: `All image generation routes failed: ${directErr.message}` });
        }
        return res.status(500).json({ error: `Fallback generator experienced an exception: ${fallbackErr.message}` });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to process image request" });
    }
  });

  // Server-side text generation proxy with smart multi-model fallbacks and backoff retries
  app.post(["/api/generate-ai-text", "/api/ai/generate"], async (req, res) => {
    const { prompt, options } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // 1. Resolve user identity from Supabase session token or request body
    let userId = req.body?.userId || req.body?.options?.userId;
    let resolvedUser: any = null;
    const rawAuthHeader = (req.headers.authorization || req.headers.Authorization || "") as string;
    let token = rawAuthHeader;
    if (typeof rawAuthHeader === "string" && rawAuthHeader.toLowerCase().startsWith("bearer ")) {
      token = rawAuthHeader.substring(7).trim();
    }

    try {
      const supabase = getSupabaseAdmin();
      if (token && token !== "undefined" && token !== "null") {
        const { data: authData } = await supabase.auth.getUser(token);
        if (authData?.user) {
          resolvedUser = authData.user;
          userId = authData.user.id;
        } else if (rawAuthHeader !== token) {
          const { data: headerData } = await supabase.auth.getUser(rawAuthHeader);
          if (headerData?.user) {
            resolvedUser = headerData.user;
            userId = headerData.user.id;
          }
        }
      }

      // 2. Fallback: resolve user by userId using admin.getUserById
      if (!resolvedUser && userId) {
        if (supabase.auth?.admin?.getUserById) {
          try {
            const { data: adminData } = await supabase.auth.admin.getUserById(userId);
            if (adminData?.user) {
              resolvedUser = adminData.user;
            }
          } catch (adminErr: any) {
            console.warn("[AI Proxy] admin.getUserById notice:", adminErr?.message);
          }
        }

        // Additional fallback: check users table
        if (!resolvedUser) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("id, email, full_name, role, account_tier")
            .eq("id", userId)
            .maybeSingle();
          if (dbUser) {
            resolvedUser = dbUser;
          }
        }
      }
    } catch (tokenErr: any) {
      console.warn("[AI Proxy] Supabase auth extraction notice:", tokenErr?.message);
    }

    // 3. Fallback check: ensure non-null user context
    if (!resolvedUser) {
      resolvedUser = { id: userId || "authenticated-user", email: "user@calmreader.com" };
    }

    console.log(`[AI Proxy] User context established: ${resolvedUser?.email || userId}`);

    const apiKey = cleanSecret(
      process.env.VITE_OPEN_ROUTER_KEY ||
      process.env.VITE_OPENROUTER_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPEN_ROUTER_KEY ||
      process.env.OPEN_ROUTER_API_KEY ||
      process.env.OPENROUTER_KEY ||
      process.env.VITE_OPENROUTER_KEY
    );

    const opts = options || {};
    let requestedModel = opts.model || "google/gemini-2.5-flash";
    if (requestedModel === "google/gemini-2.0-flash-001" || requestedModel.includes("gemini-2.0-flash")) {
      requestedModel = "google/gemini-2.5-flash";
    }
    const systemInstruction = opts.systemInstruction || "You are a professional content architect and editor for CalmReader.";
    
    const isFreeRequested = requestedModel && (requestedModel.endsWith(":free") || requestedModel === "openrouter/free");
    // Fallback models to iterate through on rate limits or errors
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

    // Deduplicate models preserving priority
    const uniqueModels = Array.from(new Set(modelsToTry)).filter(Boolean);

    let lastError = "";
    let isRateLimited = false;

    // 1. Try OpenRouter if key is present and not invalid
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
              const delay = Math.min(Math.pow(2, attempt) * 1000, 30000); // 2s, 4s, 8s... max 30s
              console.log(`[API AI Text Proxy] Retrying model "${model}" after ${delay}ms due to previous rate limit/error...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            console.log(`[API AI Text Proxy] Requesting "${model}" (attempt ${attempt + 1}/${maxRetries})...`);
            
            const payload: any = {
              model: model,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
              ],
              max_tokens: opts.max_tokens || 1500
            };

            if (opts.responseMimeType === 'application/json') {
              payload.response_format = { type: "json_object" };
            }

            const isFreeModel = model.endsWith(":free") || model === "openrouter/free";
            const refererToUse = isFreeModel ? "https://calmreader.com" : (process.env.APP_URL || "https://calmreader1.pages.dev");

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
                const text = await response.text();
                const parsed = JSON.parse(text);
                errMsg = parsed.error?.message || parsed.message || errMsg;
              } catch (e) {}
              
              console.warn(`[API AI Text Proxy] Model "${model}" failed (HTTP ${response.status}): ${errMsg}`);
              
              if (response.status === 429) {
                isRateLimited = true;
              }

              // If OpenRouter key is invalid, unauthorized, or returns "User not found."
              if (response.status === 401 || response.status === 402 || response.status === 403 || errMsg.toLowerCase().includes("user not found")) {
                hasFatalOpenRouterError = true;
                console.warn("[API AI Text Proxy] OpenRouter upstream authentication failed. Switching immediately to direct Gemini engine.");
                break;
              }

              lastError = errMsg;
              continue; // Retry same model
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

          } catch (err: any) {
            console.error(`[API AI Text Proxy] Exception during model "${model}":`, err.message || err);
            lastError = err.message || "Network request error";
          }
        }
      }
    } else {
      lastError = "No OpenRouter API key configured on server environments.";
    }

    // If OpenRouter failed due to invalid provider key, mark clearly before fallback
    if (lastError.toLowerCase().includes("user not found")) {
      lastError = "OpenRouter key invalid (User not found). Attempting Gemini fallback.";
    }

    // 2. High-reliability fallback to Google Gemini API if Gemini key is available
    const geminiApiKey = cleanSecret(
      process.env.GEMINI_API_KEY ||
      process.env.CALM_GEMINI_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_KEY
    );

    if (geminiApiKey) {
      console.log(`[API AI Text Proxy] OpenRouter generation failed or key is absent. Deploying high-resiliency direct fallback to Google Gemini API...`);
      try {
        const geminiModel = "gemini-2.5-flash";
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

        const geminiPayload: any = {
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

        if (opts.responseMimeType === 'application/json') {
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
      } catch (geminiErr: any) {
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

  // Secure lightweight OAuth redirect/callback handler for Google/Supabase
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

  // Mailtrap Email/OTP Route
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email, otp, type } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });
    const brevoClient = getBrevo();
    if (!brevoClient) {
      console.warn("Brevo not configured. Email NOT sent.");
      return res.status(503).json({
        error:
          "Email service not configured. Please set BREVO_API_KEY in settings.",
      });
    }

    try {
      const subject =
        type === "otp" ? "Your verification code" : "Welcome to CalmReader";
      const text =
        type === "otp"
          ? `Your verification code is: ${otp}. It will expire in 10 minutes.`
          : `Welcome to CalmReader! Please verify your email to start reading.`;

      await brevoClient.transactionalEmails.sendTransacEmail({
        subject: subject,
        textContent: text,
        sender: { name: "CalmReader Auth", email: brevoSender },
        to: [{ email }],
      });

      res.json({ success: true, message: "Email sent via Brevo" });
    } catch (err: any) {
      console.error("Brevo error:", err);
      res
        .status(500)
        .json({ error: "Failed to send email", details: err.message });
    }
  });

  app.get("/api/config/paystack-status", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800");
      const isEnvSet = !!process.env.PAYSTACK_SECRET_KEY;
      let isDbSet = false;

      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("config")
          .select("value")
          .eq("key", "paystack_secret_key")
          .maybeSingle();
        isDbSet = !!data?.value;
      }

      res.json({ configured: isEnvSet || isDbSet });
    } catch (e) {
      console.error("Paystack status check error:", e);
      res.json({
        configured: !!process.env.PAYSTACK_SECRET_KEY,
        error: "Partial check failed",
      });
    }
  });

  // Auth Middleware
  const authenticateUser = async (req: any, res: any, next: any) => {
    const supabase = getSupabase();
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
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user)
        return res.status(401).json({ error: "Invalid token" });

      // Fetch profile safely
      let profile = null;
      try {
        const { data: p, error: pErr } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (pErr) {
          console.error(`[Auth] Profile fetch by ID error: ${pErr.message}`);
        } else {
          profile = p;
        }
      } catch (e: any) {
        console.error(`[Auth] Profile fetch exception: ${e.message}`);
      }

      if (!profile) {
        // Fallback or Minimal Profile
        profile = {
          id: user.id,
          email: user.email,
          account_tier: "free",
          is_admin: false,
        };
      }

      const ADMIN_EMAILS = ["samuelchukwuemeke05@gmail.com", "chukwuemekedaniella@gmail.com", "winbigonly@gmail.com"];

      // Force admin status for CEO emails even if profile is missing admin flag
      if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
        profile.is_admin = true;
        profile.account_tier = "admin";
      }

      // AUTO-REVERSAL: If tier has expired, revert to free
      if (
        profile.account_tier !== "free" &&
        profile.account_tier !== "admin" &&
        profile.tier_expires_at
      ) {
        const expiresAt = new Date(profile.tier_expires_at).getTime();
        const now = Date.now();
        if (now > expiresAt) {
          console.log(
            `[Tier] Reverting user ${user.id} to free because tier expired at ${profile.tier_expires_at}`,
          );
          const { error: revErr } = await supabase
            .from("users")
            .update({
              account_tier: "free",
              is_premium: false,
              is_approved_author: false,
              tier_expires_at: null,
            })
            .eq("id", user.id);

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

      // Track last active session in background
      if (user?.id) {
        try {
          supabase.rpc("update_user_session", { p_user_id: user.id }).then(({ error: rpcErr }) => {
            if (rpcErr) {
              supabase.from("user_sessions").upsert({
                user_id: user.id,
                last_active_at: new Date().toISOString()
              }, { onConflict: "user_id" }).then(() => {}).catch(() => {});
            }
          }).catch(() => {});
        } catch (sessErr) {
          // ignore tracking error
        }
      }

      next();
    } catch (err) {
      console.error("Auth error:", err);
      res.status(500).json({ error: "Authentication failed" });
    }
  };

  const authenticateAdmin = async (req: any, res: any, next: any) => {
    const supabase = getSupabase();
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn("[AdminAuth] No token provided for " + req.url);
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined" || token === "null" || token.length < 10) {
      return res.status(401).json({ error: "No valid token provided" });
    }

    // Resilience: If Supabase is unconfigured (dummy), allow testing progress in development
    if (supabase.__isDummy && process.env.NODE_ENV !== "production") {
      console.warn(
        "[AdminAuth] Using fallback dummy admin because Supabase is unconfigured.",
      );
      req.user = {
        id: "00000000-0000-0000-0000-000000000000",
        email: "chukwuemekedaniella@gmail.com",
      };
      req.profile = {
        id: "00000000-0000-0000-0000-000000000000",
        email: "chukwuemekedaniella@gmail.com",
        account_tier: "admin",
        is_admin: true,
      };
      return next();
    }
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        if (error?.message === "Auth session missing!") {
          console.warn("[AdminAuth] getUser failed: Auth session missing!");
        } else {
          console.error(
            "[AdminAuth] getUser failed:",
            error?.message || "User null",
          );
        }
        return res
          .status(401)
          .json({ error: "Invalid token", details: error?.message });
      }

      // Fetch profile safely to check database is_admin status
      let profile = null;
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = data;

      const ADMIN_EMAILS = ["samuelchukwuemeke05@gmail.com", "chukwuemekedaniella@gmail.com", "winbigonly@gmail.com"];

      // Force admin status for authorized emails even if profile table doesn't have it set directly in database
      if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        if (!profile) {
          profile = {
            id: user.id,
            email: user.email,
            is_admin: true,
            account_tier: "admin",
          };
        } else {
          profile.is_admin = true;
          profile.account_tier = "admin";
        }
      }

      const isAdmin =
        !!profile?.is_admin && ADMIN_EMAILS.includes(user.email?.toLowerCase());

      if (!isAdmin) {
        console.warn(`[AdminAuth] Access denied for ${user.email}`);
        return res
          .status(403)
          .json({ error: "Admin resource. Access denied." });
      }

      req.user = user;
      req.profile = profile || {
        email: user.email,
        account_tier: "admin",
        is_admin: true,
        id: user.id,
      };
      next();
    } catch (err: any) {
      console.error("[AdminAuth] Critical failure:", err.message);
      res.status(500).json({ error: "Authentication system failure" });
    }
  };

  // Mount Publishing System & Campaign Contracts Routes
  setupPublishingRoutes(app, getSupabase, getSupabaseAdmin, authenticateUser, authenticateAdmin);

  // Session Validation Endpoint to prevent redirect bleed and verify user role
  app.get("/api/auth/validate-session", authenticateUser, async (req: any, res: any) => {
    try {
      const user = req.user;
      const profile = req.profile;
      
      const lowerEmail = (user.email || '').toLowerCase();
      const isAdminEmail = lowerEmail === 'samuelchukwuemeke05@gmail.com' || lowerEmail === 'chukwuemekedaniella@gmail.com' || lowerEmail === 'winbigonly@gmail.com';
      const accountTier = isAdminEmail ? 'admin' : (profile?.account_tier || 'free');

      return res.status(200).json({
        userId: user.id,
        email: user.email,
        accountTier: accountTier,
        isAdmin: isAdminEmail || accountTier === 'admin'
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to validate session", details: err.message });
    }
  });

  app.post("/api/auth/validate-session", authenticateUser, async (req: any, res: any) => {
    try {
      const user = req.user;
      const profile = req.profile;
      
      const lowerEmail = (user.email || '').toLowerCase();
      const isAdminEmail = lowerEmail === 'samuelchukwuemeke05@gmail.com' || lowerEmail === 'chukwuemekedaniella@gmail.com' || lowerEmail === 'winbigonly@gmail.com';
      const accountTier = isAdminEmail ? 'admin' : (profile?.account_tier || 'free');

      return res.status(200).json({
        userId: user.id,
        email: user.email,
        accountTier: accountTier,
        isAdmin: isAdminEmail || accountTier === 'admin'
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to validate session", details: err.message });
    }
  });

  // --- USER TIERS & UPGRADES ---

  // Record eBook Purchase
  app.post("/api/purchase/ebook", authenticateUser, async (req: any, res) => {
    try {
      const { reference, ebookId, amount } = req.body;
      const supabase = getSupabase();

      const { data: trans, error } = await supabase
        .from("transactions")
        .insert({
          user_id: req.user.id,
          book_id: ebookId,
          type: "purchase",
          amount: amount || 0,
          status: "successful",
          paystack_reference: reference,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      try {
        await logUserActivity(req.user.id, "book_purchase", { book_id: ebookId, amount, reference });
      } catch (logErr: any) {
        console.warn("[Tracking] Ebook purchase tracking skip:", logErr.message);
      }

      // Also safely grant to ebook_purchases right away for instantaneous bookshelf rendering!
      if (trans) {
        try {
          const { data: existingEpic } = await supabase
            .from("ebook_purchases")
            .select("*")
            .eq("user_id", req.user.id)
            .eq("ebook_id", ebookId)
            .maybeSingle();

          if (!existingEpic) {
            await supabase.from("ebook_purchases").insert({
              user_id: req.user.id,
              ebook_id: ebookId,
              purchase_id: trans.id
            });
            console.log(`[API Purchase] ebook_purchases entry successfully recorded for user ${req.user.id} and book ${ebookId}`);
          }
        } catch (epicErr: any) {
          console.error("[API Purchase] ebook_purchases record skipped/failed:", epicErr.message || epicErr);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify Registration Payment (₦1,000)
  app.post(
    "/api/auth/verify-registration",
    authenticateUser,
    async (req: any, res) => {
      try {
        const { reference } = req.body;
        const supabase = getSupabaseAdmin();

        // In a real app, verify reference with Paystack API here
        // For now, we update the profile.
        const { error } = await supabase
          .from("users")
          .update({ registration_paid: true })
          .eq("id", req.user.id);

        if (error) throw error;
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Verify Premium Upgrade (₦1,500)
  app.post("/api/upgrade/premium", authenticateUser, async (req: any, res) => {
    try {
      const { reference } = req.body;
      const supabase = getSupabaseAdmin();

      // Handle MOCK references for easy testing
      if (reference?.startsWith("MOCK_")) {
        console.log(
          `[Payment] Handling MOCK premium upgrade for user ${req.user.id}`,
        );
        // If supabase is NOT dummy, try to update but don't crash if it fails
        if (!supabase.__isDummy) {
          await supabase
            .from("users")
            .update({ account_tier: "premium", is_premium: true })
            .eq("id", req.user.id);
        }
        return res.json({ success: true, message: "Mock upgrade successful" });
      }

      const { error } = await supabase
        .from("users")
        .update({
          account_tier: "premium",
          is_premium: true,
          premium_upgrade_date: new Date(),
        })
        .eq("id", req.user.id);

      if (error && !supabase.__isDummy) throw error;

      // Record transaction
      if (!supabase.__isDummy) {
        await supabase.from("transactions").insert({
          user_id: req.user.id,
          type: "premium_upgrade",
          amount: 1500,
          status: "completed",
          paystack_reference: reference,
        });

        // Grant referral reward on upgrade (if any)
        try {
          const { data: referral } = await supabase
            .from("referrals")
            .select("*")
            .eq("referred_id", req.user.id)
            .or("reward_granted.eq.0,reward_granted.eq.false")
            .maybeSingle();

          if (referral) {
            const bonusAmount = referral.reward_amount || 100;
            
            // Insert transaction for the referrer
            await supabase.from("transactions").insert({
              user_id: referral.referrer_id,
              type: "referral_bonus",
              amount: bonusAmount,
              status: "completed",
              paystack_reference: reference || `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
            });

            // Credit referrer's wallet
            await supabase.rpc("increment_user_balance", {
              p_user_id: referral.referrer_id,
              p_wallet_delta: bonusAmount,
              p_total_earned_delta: bonusAmount
            });

            const rewardVal = typeof referral.reward_granted === "number" ? 1 : true;
            await supabase
              .from("referrals")
              .update({ reward_granted: rewardVal })
              .eq("id", referral.id);
              
            console.log(`[Referral Reward] Credited referral bonus of ₦${bonusAmount} to referrer ${referral.referrer_id} for user ${req.user.id} premium upgrade.`);
          }
        } catch (refErr) {
          console.error("[Referral Reward] Failed to award premium upgrade referral bonus:", refErr);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("[Payment] Upgrade Error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to process upgrade" });
    }
  });

  // Get Promo Studio Weekly Price
  app.get("/api/config/promo-price", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800");
      const supabase = getSupabase();
      let price = 3000; // Default fallback to 3,000 Naira
      
      if (!supabase.__isDummy) {
        const { data, error } = await supabase
          .from("config")
          .select("*")
          .eq("key", "promo_studio_weekly_price")
          .maybeSingle();
        if (data && data.value) {
          const parsed = parseInt(data.value, 10);
          if (!isNaN(parsed)) price = parsed;
        }
      }
      res.json({ price });
    } catch (err: any) {
      res.json({ price: 3000, error: err.message });
    }
  });

  // Update Promo Studio Weekly Price (Admin Only)
  app.post("/api/config/promo-price", authenticateAdmin, async (req: any, res) => {
    try {
      const { price } = req.body;
      const parsedPrice = parseInt(price, 10);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: "Invalid price value" });
      }

      const supabase = getSupabase();
      if (!supabase.__isDummy) {
        const { error } = await supabase
          .from("config")
          .upsert({ key: "promo_studio_weekly_price", value: parsedPrice.toString() });
        if (error) throw error;
      }
      res.json({ success: true, price: parsedPrice });
    } catch (err: any) {
      console.error("[Config] Promo price update failed:", err);
      res.status(500).json({ error: err.message || "Failed to update configuration" });
    }
  });

  // Subscribe to Promo Studio
  app.post("/api/subscribe/promo-studio", authenticateUser, async (req: any, res) => {
    try {
      const { reference, price } = req.body;
      const finalPrice = parseInt(price, 10) || 3000;
      const supabase = getSupabase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future

      if (!supabase.__isDummy) {
        const { error: userErr } = await supabase
          .from("users")
          .update({
            promo_studio_expires_at: expiresAt,
          })
          .eq("id", req.user.id);

        if (userErr) {
          console.warn("[Subscribe] Table column promo_studio_expires_at write failed. Schema migration might not have run yet: ", userErr.message);
          // Fallback: update in user metadata/profile if profile allows metadata, or log but allow mock-through
        }

        // Record transaction
        await supabase.from("transactions").insert({
          user_id: req.user.id,
          type: "promo_studio_subscription",
          amount: finalPrice,
          status: "completed",
          paystack_reference: reference || "MOCK_" + Date.now(),
        }).catch((err: any) => {
          console.error("[Subscribe] Transaction logs insert failed: ", err.message);
        });
      }

      res.json({ success: true, expiresAt, message: "Subscription updated successfully" });
    } catch (err: any) {
      console.error("[Subscribe] Promo subscription failed:", err);
      res.status(500).json({ error: err.message || "Failed to finalize subscription" });
    }
  });

  // Submit Author Application
  app.post("/api/apply/author", authenticateUser, async (req: any, res) => {
    try {
      const {
        reference,
        fee_paid,
        bank_name,
        account_number,
        account_name,
        writing_sample_url,
        bio,
      } = req.body;
      const supabase = getSupabase();

      // Handle MOCK references for testing
      if (reference?.startsWith("MOCK_")) {
        console.log(
          `[Author] Handling MOCK application for user ${req.user.id}`,
        );
        if (!supabase.__isDummy) {
          await supabase
            .from("users")
            .update({
              bank_name,
              account_number,
              account_name,
              author_application_date: new Date(),
            })
            .eq("id", req.user.id);
          await supabase.from("author_applications").insert({
            user_id: req.user.id,
            fee_paid: fee_paid || 5000,
            paystack_reference: reference,
            status: "pending",
          });
        }
        return res.json({
          success: true,
          message: "Mock application submitted",
        });
      }

      // Update user bank info
      if (!supabase.__isDummy) {
        await supabase
          .from("users")
          .update({
            bank_name,
            account_number,
            account_name,
            author_application_date: new Date(),
          })
          .eq("id", req.user.id);
      }

      const { error } = await supabase.from("author_applications").insert({
        user_id: req.user.id,
        fee_paid: fee_paid || 5000,
        paystack_reference: reference,
        status: "pending",
      });

      if (error && !supabase.__isDummy) throw error;

      // Log activity
      try {
        await logUserActivity(req.user.id, "author_apply", { fee_paid: fee_paid || 5000, reference, bank_name });
      } catch (logErr: any) {
        console.warn("[Tracking] Author apply tracking skip:", logErr.message);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("[Author] Application Error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to submit application" });
    }
  });

  // Alias for backward compatibility
  app.post("/api/upgrade/author-apply", (req, res) =>
    res.redirect(307, "/api/apply/author"),
  );

  // Admin & Author: Delete Trivia
  app.delete(
    "/api/admin/trivia/delete/:id",
    authenticateUser,
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const supabase = getSupabase();
        const isAdmin = req.profile?.account_tier === "admin";
        const userId = req.profile?.id;

        if (req.profile?.account_tier !== "admin" && req.profile?.account_tier !== "author") {
          return res.status(403).json({ error: "Access denied." });
        }

        // If it's a general trivia session, only admin/CEO can delete
        if (id === "general") {
          if (!isAdmin) {
             return res.status(403).json({ error: "Only the CEO can delete general trivia." });
          }
          try {
            await supabase.from("trivias").delete().is("book_id", null);
          } catch (tErr) {
            console.warn("[Trivia Delete API] 'trivias' table delete skipped:", tErr);
          }
          const [qRes, aRes] = await Promise.all([
            supabase.from("trivia_questions").delete().is("ebook_id", null),
            supabase.from("daily_trivia_attempts").delete().is("ebook_id", null),
          ]);
          return res.json({ success: true, message: "General trivia deleted successfully" });
        }

        // For book-specific trivia: check if user has ownership of the book (unless admin)
        if (!isAdmin) {
          // Find the book/session first
          let session: any = null;
          try {
            const { data } = await supabase
              .from("trivias")
              .select("book_id")
              .eq("id", id)
              .maybeSingle();
            session = data;
          } catch (tErr) {
            console.warn("[Trivia Delete API] 'trivias' table select skipped:", tErr);
          }

          const bookIdToCheck = session?.book_id || id;
          if (bookIdToCheck) {
            const { data: book } = await supabase
              .from("books")
              .select("user_id")
              .eq("id", bookIdToCheck)
              .maybeSingle();

            if (book && book.user_id !== userId) {
              return res.status(403).json({ error: "You can only delete your own trivia sessions." });
            }
          }
        }

        try {
          await supabase.from("trivias").delete().or(`id.eq.${id},book_id.eq.${id}`);
        } catch (tErr) {
          console.warn("[Trivia Delete API] 'trivias' table delete skipped:", tErr);
        }
        const qQuery = supabase.from("trivia_questions").delete().or(`id.eq.${id},ebook_id.eq.${id}`);
        const aQuery = supabase.from("daily_trivia_attempts").delete().or(`id.eq.${id},ebook_id.eq.${id}`);

        const [qRes, aRes] = await Promise.all([qQuery, aQuery]);

        res.json({ success: true, message: "Trivia challenge, questions, and attempts deleted successfully" });
      } catch (err: any) {
        console.error("Delete trivia error:", err);
        res.status(500).json({ error: "Failed to delete: " + err.message });
      }
    },
  );

  // Admin/CEO: Clean Ghost and Orphaned Records
  app.post(
    "/api/admin/trivia/clean-ghosts",
    authenticateUser,
    async (req: any, res: any) => {
      const isAdmin = req.profile?.account_tier === "admin";
      if (!isAdmin) {
        return res.status(403).json({ error: "Only the CEO can clean ghost records." });
      }

      try {
        const supabase = getSupabase();
        
        // 1. Identify all ghost titles
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

        // 2. Query all books in database to find those with ghost titles
        const { data: allBooks } = await supabase
          .from("books")
          .select("id, title");

        const ghostBookIds: string[] = [];
        if (allBooks) {
          allBooks.forEach((b: any) => {
            const titleUpper = (b.title || "").toUpperCase();
            if (ghostTitles.some(gt => titleUpper.includes(gt))) {
              ghostBookIds.push(b.id);
            }
          });
        }

        console.log(`[CleanGhosts] Found ghost book IDs to delete:`, ghostBookIds);

        // 3. Cascade delete of any books matching ghost titles plus any trivia matching those IDs
        if (ghostBookIds.length > 0) {
          // Delete books
          await supabase.from("books").delete().in("id", ghostBookIds);
          // Delete trivias matching those book ids
          await supabase.from("trivias").delete().in("book_id", ghostBookIds);
          // Delete trivia questions matching those ebook_id
          await supabase.from("trivia_questions").delete().in("ebook_id", ghostBookIds);
          // Delete daily trivia attempts
          await supabase.from("daily_trivia_attempts").delete().in("ebook_id", ghostBookIds);
        }

        // 4. Also find and delete orphaned trivias (trivias with a book_id that no longer exists in the 'books' table)
        const { data: currentBooks } = await supabase.from("books").select("id");
        const { data: currentTrivias } = await supabase.from("trivias").select("id, book_id");
        
        const validBookIds = new Set((currentBooks || []).map(b => b.id));
        const orphanedTriviaBookIds: string[] = [];

        if (currentTrivias) {
          currentTrivias.forEach((t: any) => {
            if (t.book_id !== null && !validBookIds.has(t.book_id)) {
              orphanedTriviaBookIds.push(t.book_id);
            }
          });
        }

        console.log(`[CleanGhosts] Found orphaned trivia book IDs to delete:`, orphanedTriviaBookIds);

        if (orphanedTriviaBookIds.length > 0) {
          await supabase.from("trivias").delete().in("book_id", orphanedTriviaBookIds);
          await supabase.from("trivia_questions").delete().in("ebook_id", orphanedTriviaBookIds);
          await supabase.from("daily_trivia_attempts").delete().in("ebook_id", orphanedTriviaBookIds);
        }

        res.json({ 
          success: true, 
          message: "Ghost records and orphaned trivias cleaned up successfully.",
          cleanedGhostBooksCount: ghostBookIds.length,
          cleanedOrphanedCount: orphanedTriviaBookIds.length
        });
      } catch (err: any) {
        console.error("[CleanGhosts] Error:", err);
        res.status(500).json({ error: err.message || "Failed to run ghost cleanup." });
      }
    }
  );

  // Admin: List Author Applications
  app.get(
    "/api/admin/author-applications",
    authenticateAdmin,
    async (req: any, res: any) => {
      try {
        const supabase = getSupabase();
        console.log("[Admin] Fetching author applications...");

        const { data, error } = await supabase
          .from("author_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          // Handle common errors gracefully
          const errMsg = String(error.message || "").toLowerCase();
          const isTimeout =
            errMsg.includes("timeout") ||
            errMsg.includes("cancel") ||
            errMsg.includes("deadlock");
          const isMissing =
            error.code === "42P01" ||
            error.code === "PGRST114" ||
            error.code === "PGRST205" ||
            (error.message &&
              (error.message.toLowerCase().includes("missing") ||
                error.message.toLowerCase().includes("not find") ||
                error.message.toLowerCase().includes("schema cache") ||
                error.message.toLowerCase().includes("does not exist")));
          const isPermission =
            error.code === "42501" ||
            (error.message &&
              error.message.toLowerCase().includes("permission"));

          if (isMissing || isTimeout || isPermission) {
            console.warn(
              `[Admin] Handled expected fetch author-applications status (${error.code}): ${error.message}`,
            );
          } else {
            console.error(
              "Fetch author-applications error details:",
              JSON.stringify(error, null, 2),
            );
          }

          if (isTimeout) {
            return res.json({
              applications: [],
              error:
                "Database timeout or block occurred. Please check database server load or locks.",
            });
          }
          if (isMissing) {
            return res.json({
              applications: [],
              warning:
                "Applications table not found in database. Please run migrations in the admin panel.",
            });
          }
          if (isPermission) {
            return res.json({
              applications: [],
              error:
                "Permission denied. Check if RLS is enabled or if you're using the correct API key.",
            });
          }
          return res.json({
            applications: [],
            error: error.message || "Database error fetching applications",
            details: error,
          });
        }

        if (!data || data.length === 0) {
          return res.json({ applications: [] });
        }

        // Manual join users to avoid complex RLS recursion if any exists
        const userIds = [...new Set(data.map((v: any) => v.user_id))].filter(
          Boolean,
        );
        let userMap: Record<string, any> = {};

        if (userIds.length > 0) {
          try {
            const { data: users, error: usersError } = await supabase
              .from("users")
              .select("id, email, full_name, username")
              .in("id", userIds);

            if (!usersError) {
              userMap = (users || []).reduce((acc: any, user: any) => {
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

        const applicationsWithUsers = data.map((v: any) => ({
          ...v,
          users: userMap[v.user_id] || {
            email: "Unknown",
            full_name: "User Data Missing",
          },
        }));

        res.json({ applications: applicationsWithUsers });
      } catch (err: any) {
        console.error("Admin applications route CRITICAL error:", err);
        res.status(500).json({
          error: "Server Error fetching applications",
          details: err.message,
        });
      }
    },
  );

  // Admin: Resolve Author Application
  app.post(
    "/api/admin/author-applications/resolve",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { applicationId, action, admin_note } = req.body;
        const supabase = getSupabase();

        const { data: appData, error: appErr } = await supabase
          .from("author_applications")
          .select("*")
          .eq("id", applicationId)
          .single();

        if (appErr || !appData)
          return res.status(404).json({ error: "Application not found" });

        const status = action === "approve" ? "approved" : "rejected";

        const { error: updateErr } = await supabase
          .from("author_applications")
          .update({
            status,
            admin_note,
            reviewed_at: new Date(),
          })
          .eq("id", applicationId);

        if (updateErr) throw updateErr;

        if (action === "approve") {
          const { error: userErr } = await supabase
            .from("users")
            .update({
              account_tier: "author",
              is_approved_author: true,
            })
            .eq("id", appData.user_id);

          if (userErr) throw userErr;
        }

        // Log resolved activity
        try {
          await logUserActivity(appData.user_id, action === "approve" ? "author_approved" : "author_rejected", {
            admin_note,
            resolved_by: (req as any).user?.email
          });
        } catch (logErr: any) {
          console.warn("[Tracking] Author resolution tracking skip:", logErr.message);
        }

        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Affiliate Generation (RESTRICTED TO PREMIUM/AUTHOR)
  app.post(
    "/api/affiliate/generate",
    authenticateUser,
    async (req: any, res) => {
      try {
        const { book_id } = req.body;
        const user = req.user;
        const profile = req.profile;

        if (profile.account_tier === "free") {
          return res
            .status(403)
            .json({
              error:
                "You must be a Premium user or Author to generate affiliate links.",
            });
        }

        const affiliate_code = `${user.id.slice(0, 8)}_${book_id.slice(0, 8)}_${Date.now()}`;

        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("affiliate_links")
          .insert({ book_id, affiliate_id: user.id, affiliate_code })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });

        const rawAppUrl = process.env.APP_URL || "";
        const baseAppUrl =
          rawAppUrl.includes("MY_APP_URL") || !rawAppUrl
            ? `${req.protocol}://${req.get("host")}`
            : rawAppUrl.replace(/\/$/, "");

        const affiliateLink = `${baseAppUrl}/purchase/${book_id}?ref=${affiliate_code}`;
        res.json({ success: true, affiliate_code, affiliateLink });
      } catch (err: any) {
        console.error("Affiliate generation error:", err);
        res.status(500).json({ error: "Failed to generate link" });
      }
    },
  );

  // Purchase Trivia Access
  app.post(
    "/api/trivias/purchase-access",
    authenticateUser,
    async (req: any, res) => {
      try {
        const { reference, ebookId } = req.body;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const supabase = getSupabase();

        // Fetch dynamic price from trivia session
        let amount = 200;
        try {
          const tQuery = isGeneral
            ? supabase
                .from("trivias")
                .select("price")
                .is("book_id", null)
                .single()
            : supabase
                .from("trivias")
                .select("price")
                .eq("book_id", ebookId)
                .single();

          const { data: triviaData } = await tQuery;
          if (triviaData?.price !== undefined && triviaData?.price !== null) {
            amount = triviaData.price;
          }
        } catch (priceErr) {
          console.warn("[Trivias Price API] Failed to fetch price from 'trivias' table, using default of 200:", priceErr);
        }

        const { error } = await supabase.from("transactions").insert({
          user_id: req.user.id,
          book_id: dbId,
          type: "trivia_access",
          amount: amount,
          status: "successful",
          paystack_reference: reference,
        });

        if (error) throw error;
        res.json({ success: true, amount });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Withdrawal Request
  app.post(
    "/api/withdrawal/request",
    authenticateUser,
    async (req: any, res) => {
      try {
        const user = req.user;
        const { amount, bank_name, account_number, account_name } = req.body;
        const supabase = getSupabase();

        const MIN_WITHDRAWAL = 5000;
        if (amount < MIN_WITHDRAWAL) {
          return res
            .status(400)
            .json({ error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL}` });
        }

        // Calculate available balance
        const userId = req.profile?.id || user.id;
        const { data: earnings } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .in("type", [
            "author_earning",
            "affiliate_commission",
            "referral_bonus",
            "trivia_win",
          ]);

        const totalEarned =
          earnings?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

        const { data: withdrawalsData } = await supabase
          .from("withdrawals")
          .select("amount, status")
          .eq("user_id", userId);

        const withdrawals = withdrawalsData?.filter((w: any) =>
          w.status === "approved" || w.status === "paid" || w.status === 1 || w.status === "1" || w.status === 3 || w.status === "3"
        ) || [];

        const totalWithdrawn =
          withdrawals?.reduce((sum: number, w: any) => sum + w.amount, 0) || 0;
        const available = totalEarned - totalWithdrawn;

        if (amount > available)
          return res.status(400).json({ error: "Insufficient balance" });

        const { data: withdrawal, error } = await supabase
          .from("withdrawals")
          .insert({
            user_id: userId,
            amount,
            bank_name,
            account_number,
            account_name,
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, withdrawal });
      } catch (err: any) {
        console.error("Withdrawal request error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get("/api/admin/health/db", authenticateAdmin, async (req: any, res) => {
    try {
      const supabase = getSupabase();
      const configStatus = (supabase as any).__configStatus || { ok: true };

      const url =
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        "Using Placeholder";
      const envKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        "Using Placeholder";

      // Fetch recent checkout / purchase transactions to show in Engine Health Console
      let purchaseLogs: any[] = [];
      let richRecentPurchases: any[] = [];
      let rawTransactions: any[] = [];

      try {
        if (supabase && !supabase.__isDummy) {
          const { data: recentPurchases, error: rpErr } = await supabase
            .from("transactions")
            .select("*")
            .in("type", ["purchase", "premium_upgrade", "trivia", "trivia_purchase"])
            .order("created_at", { ascending: false })
            .limit(30);

          if (recentPurchases && recentPurchases.length > 0) {
            const uids = [...new Set(recentPurchases.map(r => r.user_id))].filter(Boolean);
            const bids = [...new Set(recentPurchases.map(r => r.book_id))].filter(Boolean);

            let userEmailMap: Record<string, string> = {};
            let adminUserIds: Set<string> = new Set();
            if (uids.length > 0) {
              const { data: uUsers } = await supabase.from("users").select("id, email, is_admin, account_tier").in("id", uids);
              (uUsers || []).forEach(u => {
                const email = (u.email || "").toLowerCase();
                userEmailMap[u.id] = u.email || "No Email";
                const isEmailAdmin =
                  email === "samuelchukwuemeke05@gmail.com";
                
                if (u.is_admin || u.account_tier === "admin" || isEmailAdmin) {
                  adminUserIds.add(u.id);
                }
              });
            }

            // Exclude admin records both by checking ID and by checking buyer_email (if present)
            const filteredPurchases = recentPurchases.filter(r => {
              const email = (userEmailMap[r.user_id] || r.buyer_email || "").toLowerCase();
              const isAdminEmail =
                email === "samuelchukwuemeke05@gmail.com";
              
              return !adminUserIds.has(r.user_id) && !isAdminEmail;
            });

            rawTransactions = filteredPurchases;

            let bookTitleMap: Record<number, string> = {};
            if (bids.length > 0) {
              const { data: uBooks } = await supabase.from("books").select("id, title").in("id", bids);
              (uBooks || []).forEach(b => {
                bookTitleMap[b.id] = b.title;
              });
            }

            richRecentPurchases = filteredPurchases.map(r => {
              const email = userEmailMap[r.user_id] || r.buyer_email || "Unknown User";
              const bookTitle = r.book_id ? (bookTitleMap[r.book_id] || `Book #${r.book_id}`) : "N/A / Premium Upgrade";
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

            purchaseLogs = filteredPurchases.map(r => {
              const email = userEmailMap[r.user_id] || r.buyer_email || "Unknown User";
              const bookTitle = r.book_id ? (bookTitleMap[r.book_id] || `Book #${r.book_id}`) : "N/A / Premium Upgrade";
              const formattedTime = new Date(r.created_at).toLocaleTimeString();
              const pRef = r.paystack_reference || "N/A";
              
              let level = "log";
              let statusEmoji = "✅";
              if (r.status !== "successful" && r.status !== "completed") {
                level = "warn";
                statusEmoji = "⚠️";
              }

              return {
                time: formattedTime,
                type: level,
                message: `🛒 [PURCHASE] ${statusEmoji} User: ${email} | Item: ${bookTitle} | Price: ₦${r.amount} | Ref: ${pRef} | Status: ${(r.status || 'completed').toUpperCase()}`
              };
            });
          }
        }
      } catch (err: any) {
        console.error("Error building live purchase logs:", err);
      }

      res.json({
        status: configStatus.ok ? "ok" : "error",
        db: supabase && !supabase.__isDummy ? "healthy" : "misconfigured",
        config: {
          url,
          key: envKey,
          projectRef: extractProjectRef(url),
          keyProjectRef: extractProjectRefFromKey(envKey),
        },
        configStatus,
        envStatus: {
          CALM_GEMINI_KEY: process.env.CALM_GEMINI_KEY ? "SET" : "MISSING",
          PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY
            ? "SET"
            : "MISSING",
          MAILTRAP_API_TOKEN: process.env.MAILTRAP_API_TOKEN
            ? "SET"
            : "MISSING",
          SUPABASE_URL: !!(
            process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
          ),
          SUPABASE_SERVICE_ROLE_KEY: !!(
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_SERVICE_KEY ||
            process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
          ),
        },
        purchaseLogs,
        richRecentPurchases,
        rawTransactions
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Get active configurations (pre-fill form on Setup page)
  app.get("/api/setup/get-config", (req, res) => {
    try {
      res.json({
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
        key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ""
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Setup Diagnostic - Test if a pair of keys actually work together
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
          details: "Mismatch detected between URL and Key.",
        });
      }

      if (serviceRoleKey) {
        const cleanServiceKey = cleanSecret(serviceRoleKey);
        if (!cleanServiceKey.startsWith("eyJ")) {
          return res.json({
            ok: false,
            error: "Service Role Key must be a JWT (starts with eyJ)",
            details: "Invalid Service Role Key format.",
          });
        }
        const serviceKeyRef = extractProjectRefFromKey(cleanServiceKey);
        const urlRef = extractProjectRef(cleanUrl);
        if (urlRef && serviceKeyRef && urlRef !== serviceKeyRef) {
          return res.json({
            ok: false,
            error: `Mismatched Service Role Key Project: URL belongs to [${urlRef}] but Service Key belongs to [${serviceKeyRef}].`,
            details: "Service Role Key project reference mismatch.",
          });
        }
      }

      // Try actual connection
      const tempClient = createClient(cleanUrl, cleanKey);
      const { error } = await tempClient.from("users").select("id").limit(1);

      if (error) {
        return res.json({
          ok: false,
          error: error.message,
          details:
            "Connection failed even though format is correct. Check if your project is active.",
        });
      }

      res.json({
        ok: true,
        message: "Configuration is valid and connection was successful!",
        projectRefs: {
          url: extractProjectRef(cleanUrl),
          key: extractProjectRefFromKey(cleanKey),
        },
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Setup Diagnostic - Save validated keys permanently
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
          details: "Mismatch detected between URL and Key.",
        });
      }

      const cleanServiceKey = serviceRoleKey ? cleanSecret(serviceRoleKey) : "";
      if (cleanServiceKey) {
        if (!cleanServiceKey.startsWith("eyJ")) {
          return res.json({
            ok: false,
            error: "Service Role Key must be a JWT (starts with eyJ)",
            details: "Invalid Service Role Key format.",
          });
        }
        const serviceKeyRef = extractProjectRefFromKey(cleanServiceKey);
        const urlRef = extractProjectRef(cleanUrl);
        if (urlRef && serviceKeyRef && urlRef !== serviceKeyRef) {
          return res.json({
            ok: false,
            error: `Mismatched Service Role Key Project: URL belongs to [${urlRef}] but Service Key belongs to [${serviceKeyRef}].`,
            details: "Service Role Key project reference mismatch.",
          });
        }
      }

      // Try actual connection
      const tempClient = createClient(cleanUrl, cleanKey);
      const { error } = await tempClient.from("users").select("id").limit(1);

      if (error) {
        return res.json({
          ok: false,
          error: error.message,
          details: "Connection failed even though format is correct. Check if your project is active.",
        });
      }

      // Format clean .env content
      let envContent = "";
      if (fs.existsSync(".env")) {
        envContent = fs.readFileSync(".env", "utf8");
      }

      // Helper function to update or append in .env content
      const setEnvVar = (content: string, name: string, value: string) => {
        const regex = new RegExp(`^${name}=.*$`, "m");
        if (regex.test(content)) {
          return content.replace(regex, `${name}=${value}`);
        } else {
          return content + `\n${name}=${value}`;
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

      // Write to .env
      fs.writeFileSync(".env", newEnv.trim() + "\n");

      // Update in memory so server uses them immediately
      process.env.SUPABASE_URL = cleanUrl;
      process.env.VITE_SUPABASE_URL = cleanUrl;
      process.env.SUPABASE_ANON_KEY = cleanKey;
      process.env.VITE_SUPABASE_ANON_KEY = cleanKey;

      // Force recreate server-side client
      resetGlobalSupabase();

      res.json({
        ok: true,
        message: "Configuration saved successfully! The server is now fully connected.",
        projectRefs: {
          url: extractProjectRef(cleanUrl),
          key: extractProjectRefFromKey(cleanKey),
        },
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // User Balance (Consolidated)
  app.get("/api/user/balance", authenticateUser, async (req: any, res) => {
    try {
      const supabase = getSupabase();
      if (supabase.__isDummy) {
        return res.json({
          balance: 0,
          t_points: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          error: "Wallet service unavailable.",
        });
      }

      const userId = req.profile?.id;
      const isAdmin =
        !!req.profile?.is_admin &&
        [
          "samuelchukwuemeke05@gmail.com",
        ].includes(req.user?.email?.toLowerCase());

      // Fetch calculated earnings from transactions
      const { data: earnings, error: eError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .in("type", [
          "author_earning",
          "affiliate_commission",
          "referral_bonus",
          "trivia_win",
        ]);

      if (eError) throw eError;

      const totalEarnedCalculated =
        earnings?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

      // Withdrawals
      const { data: rawWithdrawals, error: wError } = await supabase
        .from("withdrawals")
        .select("amount, status")
        .eq("user_id", userId);

      if (wError) throw wError;

      const withdrawals = rawWithdrawals?.filter((w: any) =>
        w.status === "approved" || w.status === "paid" || w.status === "pending" || w.status === 1 || w.status === "1" || w.status === 0 || w.status === "0" || w.status === 3 || w.status === "3"
      ) || [];

      const totalWithdrawnCalculated =
        withdrawals?.reduce((sum: number, w: any) => sum + w.amount, 0) || 0;

      res.json({
        balance:
          req.profile?.wallet_balance ||
          totalEarnedCalculated - totalWithdrawnCalculated,
        t_points: req.profile?.t_points || 0,
        totalEarned: req.profile?.total_earned || totalEarnedCalculated,
        totalWithdrawn:
          req.profile?.total_withdrawn || totalWithdrawnCalculated,
      });
    } catch (err: any) {
      console.error("Fetch balance error:", err);
      res.status(500).json({ error: maskError(err, req.profile?.is_admin) });
    }
  });

  // User Transactions
  app.get("/api/user/transactions", authenticateUser, async (req: any, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user;
      const userId = req.profile?.id || user.id;
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ error: error.message });

      // BAN DUMMY: filter out test/mock data
      const cleanTransactions = (data || []).filter((t: any) => {
        if (!t.user_id) return false;
        if (t.buyer_email === "No Email") return false;
        if (t.type === "mock" || t.type === "test") return false;
        
        const ref = (t.paystack_reference || "").toLowerCase();
        if (ref.includes("mock") || ref.includes("test")) return false;
        if (t.amount === 100 && (ref.includes("free") || ref.startsWith("manual-admin") || ref.startsWith("manual-"))) return false;
        return true;
      });

      res.json({ transactions: cleanTransactions });
    } catch (err: any) {
      console.error("User transactions fetch error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin Withdrawals
  app.get("/api/admin/withdrawals", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabase();
      // Fetch withdrawals first
      const { data: withdrawals, error: withdrawalError } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (withdrawalError) {
        console.error("Admin withdrawals fetch error:", withdrawalError);
        return res.json({ withdrawals: [], error: withdrawalError.message });
      }

      if (!withdrawals || withdrawals.length === 0) {
        return res.json({ withdrawals: [] });
      }

      // Manual join users
      const userIds = [
        ...new Set(withdrawals.map((w: any) => w.user_id)),
      ].filter(Boolean);
      let userMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, email, full_name")
          .in("id", userIds);

        if (usersError) {
          console.error(
            "Join users error for withdrawals:",
            usersError.message,
          );
        } else {
          userMap = (users || []).reduce((acc: any, user: any) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }

      const withdrawalsWithUsers = withdrawals.map((w: any) => ({
        ...w,
        users: userMap[w.user_id] || {
          email: "Unknown",
          full_name: "Deleted User",
        },
      }));

      res.json({ withdrawals: withdrawalsWithUsers });
    } catch (err) {
      console.error("Admin withdrawals error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/withdrawals", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabase();
      const { withdrawalId, action, admin_note } = req.body;

      if (action === "approve") {
        await supabase
          .from("withdrawals")
          .update({ status: "approved", processed_at: new Date() })
          .eq("id", withdrawalId);
        const { data: withdrawal } = await supabase
          .from("withdrawals")
          .select("user_id, amount")
          .eq("id", withdrawalId)
          .single();
        if (withdrawal) {
          await supabase.from("transactions").insert({
            user_id: withdrawal.user_id,
            type: "withdrawal",
            amount: -withdrawal.amount,
            status: "completed",
          });
        }
      } else if (action === "reject") {
        await supabase
          .from("withdrawals")
          .update({ status: "rejected", admin_note })
          .eq("id", withdrawalId);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Admin withdrawal action error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin Books Approval
  app.get("/api/admin/books", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      // Robust, timeout-resistant retrieve strategy for admin books view
      let allBooks: any[] = [];
      let booksError: any = null;

      const adminSelectStrategies = [
        // 1. Pure metadata without cards_json to avoid heavy payload entirely (limit 350)
        {
          select:
            "id, title, user_id, price, pdf_price, public_slug, is_published, status, cover_image, admin_note, report_count, created_at",
          limit: 350,
          desc: "pure metadata columns without cards_json with limit 350",
        },
        // 2. Fallback check with lower limit (limit 150)
        {
          select:
            "id, title, user_id, price, pdf_price, public_slug, is_published, status, cover_image, admin_note, report_count, created_at",
          limit: 150,
          desc: "pure metadata fallback limit 150",
        }
      ];

      for (const strategy of adminSelectStrategies) {
        try {
          const { data, error } = await supabase
            .from("books")
            .select(strategy.select)
            .order("created_at", { ascending: false })
            .limit(strategy.limit);

          if (!error && data) {
            allBooks = data;
            booksError = null;
            break;
          } else {
            booksError = error;
            console.warn(
              `[Admin API] Strategy '${strategy.desc}' failed:`,
              error.message || error,
            );
          }
        } catch (ex: any) {
          booksError = ex;
          console.error(
            `[Admin API] Strategy '${strategy.desc}' raised exception:`,
            ex.message || ex,
          );
        }
      }

      if (booksError && allBooks.length === 0) {
        console.error(
          "Admin books fetch error after all strategies:",
          booksError,
        );
        return res.json({
          books: [],
          error:
            typeof booksError === "object"
              ? booksError.message || JSON.stringify(booksError)
              : String(booksError),
        });
      }

      if (!allBooks || allBooks.length === 0) {
        return res.json({ books: [] });
      }

      // Fetch authors manually
      const userIds = [...new Set(allBooks.map((b: any) => b.user_id))].filter(
        Boolean,
      );
      let userMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, email, full_name")
          .in("id", userIds);

        if (usersError) {
          console.error("Join users error for books:", usersError.message);
        } else {
          userMap = (users || []).reduce((acc: any, user: any) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }

      const booksWithUsers = (allBooks || []).map((book: any) => ({
        ...book,
        is_suspended:
          book.status === -2 ||
          book.status === "-2" ||
          book.is_suspended === true ||
          book.is_suspended === 1,
        users: userMap[book.user_id] || {
          email: "Unknown Author",
          full_name: "Unknown Author",
        },
      }));

      res.json({ books: booksWithUsers });
    } catch (err: any) {
      console.error("Admin books error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Get Full Single Book Details
  app.get("/api/admin/books/:id", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseAdmin();
      const { data: book, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      if (book.user_id) {
        const { data: user } = await supabase
          .from("users")
          .select("id, email, full_name")
          .eq("id", book.user_id)
          .maybeSingle();
        if (user) {
          book.users = user;
        }
      }

      res.json({ book });
    } catch (err: any) {
      console.error("Fetch single book admin error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch book" });
    }
  });

  // Admin: Get Single Book Cards dynamically
  app.get("/api/admin/books/:id/cards", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("books")
        .select("cards_json")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ cards_json: data?.cards_json || [] });
    } catch (err: any) {
      console.error("Fetch single book cards error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch book cards" });
    }
  });

  app.post("/api/admin/books", authenticateAdmin, async (req, res) => {
    try {
      const { bookId, action, admin_note } = req.body;
      const statusValue = action === "approve" ? 1 : -1; // 1 = approved, -1 = rejected

      const supabase = getSupabase();
      const { error } = await supabase
        .from("books")
        .update({
          status: statusValue,
          admin_note: admin_note || null,
          is_published: action === "approve" ? 1 : 0,
        })
        .eq("id", bookId);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      console.error("Admin book action error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin Book Compliance Review & Instant Notification Endpoint
  app.post("/api/admin/books/review", authenticateAdmin, async (req, res) => {
    try {
      const { bookId, action, admin_note } = req.body;
      if (!bookId || !action) {
        return res.status(400).json({ error: "Missing bookId or action" });
      }

      const supabase = getSupabaseAdmin();

      // 1. Fetch the book to get title and user_id
      const { data: book, error: fetchError } = await supabase
        .from("books")
        .select("title, user_id")
        .eq("id", bookId)
        .single();

      if (fetchError || !book) {
        return res.status(404).json({ error: "Book not found" });
      }

      const statusValue = action === "approve" ? 3 : 5; // 3 = published, 5 = rejected
      const isPublished = action === "approve" ? 1 : 0;

      // 2. Update book status
      const { error: updateError } = await supabase
        .from("books")
        .update({
          status: statusValue,
          admin_note: admin_note || null,
          is_published: isPublished,
        })
        .eq("id", bookId);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      // 3. Insert notification to the author
      const notificationTitle = action === "approve" 
        ? "eBook Approved & Published! 🚀" 
        : "eBook Submission Declined ❌";
      
      const notificationMessage = action === "approve"
        ? `Your eBook "${book.title}" has been approved and is now live on CalmReader!`
        : `your content doesn't align with our terms and policies please contact admin`;

      const { error: notifError } = await supabase
        .from("author_notifications")
        .insert({
          author_id: book.user_id,
          ebook_id: bookId,
          type: "compliance_review",
          title: notificationTitle,
          message: notificationMessage,
          is_read: false,
          metadata: { action, admin_note },
        });

      if (notifError) {
        console.error("Failed to insert compliance notification:", notifError.message);
      }

      // 4. Send Brevo Transactional Congratulations or Revisions Email to Author
      if (action === "approve") {
        try {
          const { data: authorData } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("id", book.user_id)
            .maybeSingle();

          const authorEmail = authorData?.email;
          if (authorEmail) {
            const brevoClient = getBrevo();
            if (brevoClient) {
              const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://calmreader.app';
              const bookUrl = `${baseUrl}/read/${bookId}`;
              await brevoClient.transactionalEmails.sendTransacEmail({
                sender: { email: brevoSender, name: "CalmReader Publishing" },
                to: [{ email: authorEmail }],
                subject: `🎉 Congratulations! Your eBook "${book.title}" is now published on CalmReader`,
                htmlContent: `
                  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
                    <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #f3f4f6;">
                      <h1 style="color: #059669; margin: 0; font-size: 24px; font-weight: 800;">📚 CalmReader Publishing</h1>
                    </div>
                    <div style="padding: 24px 0;">
                      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Congratulations, ${authorData.full_name || 'Author'}! 🎉</h2>
                      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Great news! Your eBook <strong>"${book.title}"</strong> has passed our compliance review and has been officially approved & published on CalmReader.</p>
                      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Readers worldwide can now discover, read, and purchase your literary work directly on the platform.</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${bookUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block;">View Your Live Book</a>
                      </div>
                    </div>
                    <div style="border-t: 1px solid #f3f4f6; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                      <p style="margin: 0;">CalmReader Publishing Team • Elevating Independent Authors</p>
                    </div>
                  </div>
                `,
              });

              // Log to email_logs
              await supabase.from("email_logs").insert({
                recipient_email: authorEmail,
                subject: `🎉 Congratulations! Your eBook "${book.title}" is now published on CalmReader`,
                template_name: "author_congratulations_published",
                metadata: { bookId, title: book.title },
                status: "sent",
                sent_at: new Date().toISOString(),
              });
              console.log(`[Brevo Email] Author congratulations email sent to ${authorEmail} for book "${book.title}"`);
            }
          }
        } catch (emailErr: any) {
          console.error("Failed to send Brevo author congratulations email:", emailErr?.message || emailErr);
        }
      } else if (action === "reject" || action === "decline") {
        try {
          const { data: authorData } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("id", book.user_id)
            .maybeSingle();

          const authorEmail = authorData?.email;
          if (authorEmail) {
            const brevoClient = getBrevo();
            if (brevoClient) {
              const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://calmreader.app';
              await brevoClient.transactionalEmails.sendTransacEmail({
                sender: { email: brevoSender, name: "CalmReader Publishing Team" },
                to: [{ email: authorEmail }],
                subject: `Action Required: Revisions Requested for eBook "${book.title}"`,
                htmlContent: `
                  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
                    <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #f3f4f6;">
                      <h1 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 800;">📚 CalmReader Editorial Feedback</h1>
                    </div>
                    <div style="padding: 24px 0;">
                      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Hello ${authorData.full_name || 'Author'},</h2>
                      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Our editorial team reviewed your eBook submission <strong>"${book.title}"</strong> and has requested a few adjustments before it can be published.</p>
                      
                      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 8px;">
                        <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px; text-transform: uppercase; font-weight: 800;">Editor Notes & Instructions:</h3>
                        <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5; white-space: pre-line;">${admin_note || 'Please review your content formatting and ensure all chapters adhere to platform guidelines.'}</p>
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
                `,
              });

              await supabase.from("email_logs").insert({
                recipient_email: authorEmail,
                subject: `Action Required: Revisions Requested for eBook "${book.title}"`,
                template_name: "author_revisions_requested",
                metadata: { bookId, title: book.title, admin_note },
                status: "sent",
                sent_at: new Date().toISOString(),
              });
              console.log(`[Brevo Email] Author revision feedback email sent to ${authorEmail} for book "${book.title}"`);
            }
          }
        } catch (emailErr: any) {
          console.error("Failed to send Brevo author revision email:", emailErr?.message || emailErr);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Admin book compliance review error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Public Endpoint to Lazy-Load Book Cover Image to resolve JS_TIMEOUT / database timeouts
  const bookCoversCache = new Map<string, string>();
  app.get("/api/books/:id/cover", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
      const id = req.params.id;
      if (bookCoversCache.has(id)) {
        return res.json({ cover_image: bookCoversCache.get(id) });
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("books")
        .select("id, cover_image")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(`[CoverFetch] Failed to fetch cover for book ${id}:`, error.message);
        return res.status(500).json({ error: error.message });
      }

      if (data && data.cover_image) {
        let coverUrl = data.cover_image;
        if (coverUrl && !coverUrl.startsWith("http") && !coverUrl.startsWith("data:")) {
          try {
            const { data: urlData } = supabase.storage.from("media").getPublicUrl(coverUrl);
            coverUrl = urlData?.publicUrl || coverUrl;
          } catch (storageErr) {
            console.warn("[CoverFetch] Error getting media bucket public URL:", storageErr);
          }
        }
        bookCoversCache.set(id, coverUrl);
        return res.json({ cover_image: coverUrl });
      }

      return res.json({ cover_image: null });
    } catch (err: any) {
      console.error("[CoverFetch] Exception:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public Endpoint to Fetch Published eBook Details (Used by /book/:slug and /ebook/:idOrSlug)
  app.get("/api/books/public/:idOrSlug", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      const { idOrSlug } = req.params;
      if (!idOrSlug) {
        return res.status(400).json({ error: "Book identifier is required" });
      }

      const supabase = getSupabaseAdmin();
      let book = null;

      // 1. Try fetching by public_slug
      const { data: bySlug } = await supabase
        .from("books")
        .select("id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, cover_image, created_at, genre_id, report_count")
        .eq("public_slug", idOrSlug)
        .maybeSingle();

      if (bySlug) {
        book = bySlug;
      }

      // 2. Try fetching by UUID if not found
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      if (!book && isUUID) {
        const { data: byId } = await supabase
          .from("books")
          .select("id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, cover_image, created_at, genre_id, report_count")
          .eq("id", idOrSlug)
          .maybeSingle();
        if (byId) book = byId;
      }

      // 3. Try fetching by numeric ID if applicable
      if (!book && /^\d+$/.test(idOrSlug)) {
        const { data: byNum } = await supabase
          .from("books")
          .select("id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, cover_image, created_at, genre_id, report_count")
          .eq("id", parseInt(idOrSlug, 10))
          .maybeSingle();
        if (byNum) book = byNum;
      }

      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      return res.json({ book });
    } catch (err: any) {
      console.error("[PublicBookFetch] Error fetching book:", err);
      return res.status(500).json({ error: "Failed to fetch book" });
    }
  });

  // Redirect fallback for /book/:slug referral links to /ebook/:slug
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

  // Delete Book (Author or Admin)
  app.delete("/api/books/:id", authenticateUser, async (req: any, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const id = req.params.id;

      console.log(
        `[DeleteBook] Attempting to delete book ${id} by user ${req.user.id}`,
      );

      // 1. Check if user owns the book or is admin
      const { data: book, error: fetchError } = await supabase
        .from("books")
        .select("id, user_id, title, admin_note")
        .eq("id", id)
        .maybeSingle();

      if (fetchError || !book) {
        return res
          .status(fetchError ? 500 : 404)
          .json({
            error: fetchError ? `Failed to verify book: ${fetchError.message}` : "Book not found",
          });
      }

      const isOwner = book.user_id === req.user.id;
      const adminEmails = [
        "samuelchukwuemeke05@gmail.com",
      ];
      const isAdmin = !!(
        adminEmails.includes(req.user?.email?.toLowerCase() || "") ||
        req.profile?.is_admin ||
        req.profile?.account_tier === "admin"
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Permission denied." });
      }

      // 2. Perform Atomic Renaming (Safety net for "Title already exists" conflict)
      const deletedTitle = `[DELETED] ${book.title}_${Date.now()}`;
      
      let updateQuery = supabase
        .from("books")
        .update({
          title: deletedTitle,
          status: -1,
          is_published: 0,
          admin_note:
            (book.admin_note || "") +
            ` [DELETED BY ${isAdmin ? "ADMIN" : "OWNER"}]`,
        })
        .eq("id", id);

      if (!isAdmin) {
        updateQuery = updateQuery.eq("user_id", req.user.id);
      }

      const { error: updateError } = await updateQuery;
      if (updateError) {
        console.warn("[DeleteBook] Soft-delete/rename update failed:", updateError.message);
      }

      // 3. Nullify references in Transactions to avoid foreign key violations
      try {
        await supabase
          .from("transactions")
          .update({ book_id: null })
          .eq("book_id", id);
      } catch (e: any) {
        console.warn("[DeleteBook] Failed to nullify book_id in transactions:", e.message || e);
      }

      // 4. Cleanup associated data (Manually due to some FK structures)
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
          await supabase.from(table).delete().eq("book_id", id);
        } catch (e: any) {
          // column may not exist, ignored
        }
        try {
          await supabase.from(table).delete().eq("ebook_id", id);
        } catch (e: any) {
          // column may not exist, ignored
        }
        try {
          await supabase.from(table).delete().eq("content_id", id);
        } catch (e: any) {
          // column may not exist, ignored
        }
      }

      // 5. Final Hard Delete Attempt
      let deleteQuery = supabase
        .from("books")
        .delete()
        .eq("id", id);

      if (!isAdmin) {
        deleteQuery = deleteQuery.eq("user_id", req.user.id);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.warn(
          "[DeleteBook] Hard delete failed, persistent soft delete applied:",
          deleteError.message,
        );
        return res.status(200).json({
          success: true,
          status: "soft_deleted",
          message: `Book "${book.title}" was deactivated and hidden from the store. (Permanent history rows exist). Details: ${deleteError.message}`,
        });
      }

      console.log(`[DeleteBook] Book ${id} deleted permanently.`);
      res.json({
        success: true,
        status: "permanently_deleted",
        message: `Book "${book.title}" was permanently deleted.`,
      });
    } catch (err: any) {
      console.error("[DeleteBook] Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Download Project Source as ZIP (Accessible for project export)
  app.get(
    ["/api/admin/download-project-zip", "/api/download-project-zip"],
    async (req: any, res: any) => {
      try {
        console.log(
          "[DownloadZip] Generating ZIP archive of project source...",
        );
        const zip = new AdmZip();
        const rootDir = process.cwd();

        const addDirToZip = (dirPath: string, zipPathPrefix: string) => {
          const items = fs.readdirSync(dirPath);
          for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const relativeZipPath = path.join(zipPathPrefix, item);

            // Exclude development/dependency/sensitive folders & files
            if (
              item === "node_modules" ||
              item === ".git" ||
              item === "dist" ||
              item === ".env" ||
              item === ".env.local" ||
              item === ".cache" ||
              item === ".upm" ||
              item === ".next" ||
              item === "package-lock.json"
            ) {
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
          "attachment; filename=project-source.zip",
        );
        res.end(buffer);
        console.log("[DownloadZip] ZIP download completed successfully.");
      } catch (err: any) {
        console.error("[DownloadZip] Error:", err);
        res
          .status(500)
          .json({ error: "Failed to generate zip file: " + err.message });
      }
    },
  );

  // Admin: Get Vault Items
  app.get("/api/admin/vault", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("vault")
        .select("*")
        .order("created_at", { ascending: false });

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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Add Vault Item
  app.post("/api/admin/vault", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabase();
      const { title, type, content, tags, difficulty, image_url } = req.body;

      if (!title || !type || !content) {
        return res.status(400).json({ error: "Missing required fields: title, type, content" });
      }

      const { data, error } = await supabase
        .from("vault")
        .insert({
          title,
          type,
          content,
          tags: tags || null,
          difficulty: difficulty || "medium",
          image_url: image_url || null,
        })
        .select("*")
        .maybeSingle();

      if (error) {
        if (error.code === "42P01") {
          return res.status(400).json({ error: "Vault table does not exist yet. Please execute the VAULT_SETUP.sql script in your Supabase SQL Editor." });
        }
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, item: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete Vault Item
  app.delete("/api/admin/vault/:id", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabase();
      const { id } = req.params;

      const { error } = await supabase
        .from("vault")
        .delete()
        .eq("id", id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Run Migrations
  app.post(
    "/api/admin/run-migrations",
    authenticateAdmin,
    async (req: any, res: any) => {
      try {
        const supabase = getSupabase();

        // Enhanced health check for specific columns mentioned as missing
        const checks = [
          { table: "users", column: "is_approved_author" },
          { table: "users", column: "account_tier" },
          { table: "users", column: "tier_expires_at" },
          { table: "author_applications", column: "status" },
          { table: "upgrade_tokens", column: "benefit_duration_days" },
          { table: "trivias", column: "price" },
          { table: "trivias", column: "target_tier" },
          { table: "trivias", column: "promotional_writeup" },
        ];

        const missingFields = [];
        const missingTables = [];

        // Check author_applications table existence
        const { error: appErr } = await supabase
          .from("author_applications")
          .select("id")
          .limit(1);
        if (appErr && appErr.code === "42P01")
          missingTables.push("author_applications");

        // Check columns in users
        for (const check of checks) {
          try {
            const { error } = await supabase
              .from(check.table)
              .select(check.column)
              .limit(1);
            if (error) {
              if (error.code === "42P01") {
                if (!missingTables.includes(check.table))
                  missingTables.push(check.table);
              } else if (
                error.message &&
                (error.message.includes("column") ||
                  error.message.includes("not exist"))
              ) {
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
            message:
              "System health check passed. All tables and columns are present.",
          });
        }

        res.json({
          success: false,
          message: "Schema mismatch detected.",
          missingTables,
          missingFields,
          action:
            "Please execute the migration script in your Supabase SQL Editor. You can find it in 'migrations.ts' or the Setup Wizard.",
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Admin Users Management
  app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      let { data: users, error } = await supabase
        .from("users")
        .select("id, email, full_name, username, account_tier, is_admin, is_premium, wallet_balance, t_points, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Admin Users API] Querying users table failed, falling back to user_profiles_public:", error.message);
        const fallbackRes = await supabase
          .from("user_profiles_public")
          .select("id, full_name, username, account_tier, is_admin, is_premium, wallet_balance, t_points, created_at")
          .order("created_at", { ascending: false });
        
        if (fallbackRes.error) return res.status(500).json({ error: fallbackRes.error.message });
        users = fallbackRes.data;
      }

      // Fetch active session tracking records to determine who is online
      let sessionsMap = new Map<string, string>();
      try {
        const { data: sessions } = await supabase
          .from("user_sessions")
          .select("user_id, last_active_at");
        if (sessions) {
          sessions.forEach((s: any) => {
            if (s.user_id && s.last_active_at) {
              sessionsMap.set(s.user_id, s.last_active_at);
            }
          });
        }
      } catch (sessErr: any) {
        console.warn("[Admin Users API] Could not fetch user_sessions:", sessErr.message);
      }

      const usersWithSessions = (users || []).map((u: any) => ({
        ...u,
        last_active_at: sessionsMap.get(u.id) || null
      }));

      res.json({ users: usersWithSessions });
    } catch (err) {
      console.error("Admin users error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Update User Payout Details
  app.post("/api/admin/users/payout", authenticateAdmin, async (req, res) => {
    try {
      const { userId, bank_name, account_number, account_name } = req.body;
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from("users")
        .update({ bank_name, account_number, account_name })
        .eq("id", userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { userId: id, action, value } = req.body;

      let updateData: any = {};
      let targetTable = "users";

      // Determine columns to update based on boolean type in database
      if (action === "toggle_admin") {
        updateData.is_admin = !!value;
      } else if (action === "toggle_premium") {
        updateData.is_premium = !!value;
      } else if (action === "toggle_suspend") {
        updateData.is_suspended = !!value;
      } else if (action === "toggle_book_suspend") {
        updateData.status = value ? -2 : 1; // -2 represents suspended, 1 represents approved/active
        targetTable = "books";
      }

      const { error } = await supabase
        .from(targetTable)
        .update(updateData)
        .eq("id", id);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      console.error("Admin user action error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- UPGRADE TOKENS (Temporal Links) ---

  app.get("/api/admin/upgrade-tokens", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabase();
      const { data: tokens, error } = await supabase
        .from("upgrade_tokens")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      res.json({ tokens: tokens || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/upgrade-tokens", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabase();
      const { email, tier, expires_in_days, benefit_duration_days } = req.body;

      if (!tier)
        return res.status(400).json({ error: "Target tier is required" });

      console.log(
        `[Admin] Generating ${tier} token for ${email || "any user"}`,
      );

      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      const daysValid = parseInt(expires_in_days) || 7;
      const benefitDays = benefit_duration_days
        ? parseInt(benefit_duration_days)
        : null;
      const tokenExpiresAt = new Date(
        Date.now() + daysValid * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from("upgrade_tokens")
        .insert({
          token,
          user_email: email || null,
          target_tier: tier, // Explicit assignment
          benefit_duration_days: benefitDays,
          token_expires_at: tokenExpiresAt,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, token: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete(
    "/api/admin/upgrade-tokens/:id",
    authenticateAdmin,
    async (req, res) => {
      try {
        const supabase = getSupabase();
        const { id } = req.params;
        const { error } = await supabase
          .from("upgrade_tokens")
          .delete()
          .eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  app.post("/api/admin/users/tier", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { userId, tier, duration_days } = req.body;

      const { data: user } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();
      if (!user) return res.status(404).json({ error: "User not found" });

      const { error } = await supabase.rpc("admin_set_user_tier", {
        p_email: user.email,
        p_new_tier: tier,
        p_duration_days: duration_days ? parseInt(duration_days) : null,
      });

      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User Activity Summary for Admin
  app.get(
    "/api/admin/user/:id/activity",
    authenticateAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const supabase = getSupabase();

        const [userRes, booksRes, transRes, applyRes] = await Promise.all([
          supabase.from("users").select("*").eq("id", id).single(),
          supabase.from("books").select("*").eq("user_id", id),
          supabase
            .from("transactions")
            .select("*")
            .eq("user_id", id)
            .order("created_at", { ascending: false }),
          supabase.from("author_applications").select("*").eq("user_id", id),
        ]);

        if (userRes.error) throw userRes.error;

        // Handle potentially missing tables and other errors on optional arrays
        if (applyRes.error) {
          console.warn(
            "[Admin API] Failed to fetch author applications for user activity, falling back to empty list:",
            applyRes.error,
          );
        }
        if (booksRes.error) {
          console.warn(
            "[Admin API] Failed to fetch books for user activity:",
            booksRes.error,
          );
        }
        if (transRes.error) {
          console.warn(
            "[Admin API] Failed to fetch transactions for user activity:",
            transRes.error,
          );
        }

        let activities: any[] = [];
        try {
          const { data: actData } = await supabase
            .from("user_activity")
            .select("*")
            .eq("user_id", id)
            .order("created_at", { ascending: false });
          if (actData) activities = actData;
        } catch (e: any) {
          console.warn("[Admin User Activity] Failed to fetch user_activity:", e.message);
        }

        let session: any = null;
        try {
          const { data: sessData } = await supabase
            .from("user_sessions")
            .select("*")
            .eq("user_id", id)
            .maybeSingle();
          if (sessData) session = sessData;
        } catch (e: any) {
          console.warn("[Admin User Session] Failed to fetch user_sessions:", e.message);
        }

        res.json({
          profile: userRes.data,
          books: booksRes.data || [],
          transactions: transRes.data || [],
          applications: applyRes.data || [],
          activities,
          session,
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // User Presence & Live Auditing APIs
  const logUserActivity = async (userId: string, action: string, metadata: any = null) => {
    try {
      const supabase = getSupabase();
      await supabase.from("user_activity").insert({
        user_id: userId,
        action: action,
        metadata: metadata ? (typeof metadata === "object" ? JSON.stringify(metadata) : String(metadata)) : null,
        created_at: new Date().toISOString()
      });
    } catch (e: any) {
      console.warn("[Tracking] Failed to log user activity:", e.message);
    }
  };

  app.post("/api/tracking/ping", authenticateUser, async (req: any, res: any) => {
    res.json({ success: true, timestamp: new Date().toISOString() });
  });

  app.post("/api/tracking/activity", authenticateUser, async (req: any, res: any) => {
    try {
      const { action, metadata } = req.body;
      if (!action) return res.status(400).json({ error: "Action is required" });
      await logUserActivity(req.profile.id, action, metadata);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/redeem-token", authenticateUser, async (req: any, res) => {
    try {
      const supabase = getSupabase();
      const { token } = req.body;

      console.log(
        `[Token] User ${req.user.email} attempting to claim token: ${token}`,
      );

      // We call the RPC function created in migration
      const { data, error } = await supabase.rpc("redeem_upgrade_token", {
        p_token: token,
      });

      if (error) {
        console.error(`[Token] RPC Error claiming token ${token}:`, error);
        return res.status(500).json({ error: error.message });
      }

      if (!data.success) {
        return res.status(400).json({ error: data.error });
      }

      console.log(
        `[Token] SUCCESS: ${req.user.email} upgraded to ${data.new_tier}`,
      );
      res.json({ success: true, new_tier: data.new_tier });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabase();
      // Use Promise.allSettled for stats to handle missing columns or tables gracefully
      const results = await Promise.allSettled([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .or("is_premium.eq.true,is_premium.eq.1"),
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase
          .from("books")
          .select("*", { count: "exact", head: true })
          .or("status.eq.0,status.eq.2"),
        supabase
          .from("withdrawals")
          .select("status"),
        supabase.from("transactions").select("amount, commission"),
        supabase
          .from("books")
          .select("*", { count: "exact", head: true })
          .ilike("admin_note", "%type:blog%"),
        supabase
          .from("books")
          .select("*", { count: "exact", head: true })
          .ilike("admin_note", "%type:video%"),
      ]);

      const getCount = (res: any) =>
        res.status === "fulfilled" && !res.value.error ? res.value.count : 0;
      const getTransactions = (res: any) =>
        res.status === "fulfilled" && !res.value.error ? res.value.data : [];

      const totalUsers = getCount(results[0]);
      const premiumUsers = getCount(results[1]);
      const totalBooks = getCount(results[2]);
      const pendingBooks = getCount(results[3]);
      const pendingWithdrawals = results[4].status === "fulfilled" && results[4].value.data ? results[4].value.data.filter((w: any) => w.status === 'pending' || w.status === 0 || w.status === '0').length : 0;
      const transData = getTransactions(results[5]);
      const totalBlogs = getCount(results[6]);
      const totalVideos = getCount(results[7]);

      const totalRevenue =
        (transData || [])?.reduce(
          (sum: number, t: any) => sum + (t.commission || t.amount || 0),
          0,
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
          totalVideos,
        },
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Report Book
  app.post("/api/report/book", authenticateUser, async (req: any, res) => {
    try {
      const { book_id, reason } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const { error } = await supabase
        .from("reported_content")
        .insert({ book_id, reporter_id: user.id, reason });

      if (error) return res.status(500).json({ error: error.message });

      // Increment report count on book safely using rpc if available
      try {
        await supabase.rpc("increment_book_report_count", { book_id });
      } catch (e) {
        console.warn(
          "RPC increment_book_report_count not available, skipping.",
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Report book error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Referral Recording
  app.post("/api/referral/record", async (req, res) => {
    try {
      const { referrer_id, referred_id } = req.body;
      const supabase = getSupabase();

      let finalReferrerId = referrer_id;
      let finalReferredId = referred_id;

      // Robust Referral ID Resolution
      if (referrer_id) {
        // Try exact match first
        const { data: refUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", referrer_id)
          .maybeSingle();
        if (refUser) {
          finalReferrerId = refUser.id;
        } else {
          // Try MPR code match
          const { data: mprUser } = await supabase
            .from("users")
            .select("id")
            .ilike("mpr_code", referrer_id.trim())
            .maybeSingle();
          if (mprUser) {
            finalReferrerId = mprUser.id;
            console.log(
              `[Referral] Resolved MPR code ${referrer_id} to ${finalReferrerId}`
            );
          } else if (referrer_id.length === 8 && !referrer_id.includes("-")) {
            // Try short code (first segment of UUID)
            const { data: shortRef } = await supabase
              .from("users")
              .select("id")
              .ilike("id", `${referrer_id}%`)
              .limit(1)
              .maybeSingle();
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
        const { data: newUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", referred_id)
          .maybeSingle();
        if (newUser) finalReferredId = newUser.id;
      }

      const { error } = await supabase.from("referrals").insert({
        referrer_id: finalReferrerId,
        referred_id: finalReferredId,
        reward_granted: false,
      });

      if (error && !error.message.includes("unique constraint")) {
        console.error("Referral record error:", error);
        return res.status(400).json({ error: error.message });
      }

      // Record in MPR audit trail if referrer is an MPR
      if (finalReferrerId) {
        logMprAudit({
          mpr_id: finalReferrerId,
          action_type: "recruited_author",
          target_type: "referral",
          target_id: String(finalReferredId || "unknown"),
          details: { referrer_code: referrer_id, referred_id: finalReferredId },
          ip_address: req.ip,
        });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Referral recording exception:", err);
      res.status(500).json({ error: "Failed to record referral" });
    }
  });

  // Track eBook / Book Referral Link Click
  app.post("/api/referral/track-click", async (req, res) => {
    try {
      const { ref, slug, book_id } = req.body;
      if (!ref) {
        return res.json({ success: false, message: "No referral code provided" });
      }

      const supabase = getSupabase();
      let referrerUserId: string | null = null;
      const cleanRef = String(ref).trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);
      
      if (isUUID) {
        const { data: uById } = await supabase.from("users").select("id").eq("id", cleanRef).maybeSingle();
        if (uById) referrerUserId = uById.id;
      }

      if (!referrerUserId) {
        const { data: uByCode } = await supabase
          .from("users")
          .select("id")
          .or(`referral_code.eq.${cleanRef},mpr_code.eq.${cleanRef}`)
          .maybeSingle();
        if (uByCode) referrerUserId = uByCode.id;
      }

      if (!referrerUserId && cleanRef.length === 8 && !cleanRef.includes("-")) {
        const { data: uByPrefix } = await supabase
          .from("users")
          .select("id")
          .ilike("id", `${cleanRef}%`)
          .maybeSingle();
        if (uByPrefix) referrerUserId = uByPrefix.id;
      }

      // Log click in MPR audit trail if referrer identified
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
              timestamp: new Date().toISOString(),
            },
            ip_address: req.ip,
          });
        } catch (logErr) {
          console.warn("[Referral Track] Non-critical logMprAudit notice:", logErr);
        }
      }

      console.log(`[Referral Track] Click tracked for ref: ${cleanRef}, book: ${slug || book_id || 'unknown'}`);
      res.json({ success: true, referrer_id: referrerUserId });
    } catch (err: any) {
      console.warn("[Referral Track] Click tracking non-fatal error:", err?.message || err);
      res.json({ success: false, error: err?.message || "Failed to track click" });
    }
  });

  // Referral Reward
  app.post("/api/referral/grant-reward", async (req, res) => {
    try {
      const { referred_user_id } = req.body;
      const supabase = getSupabase();
      const { data: referral } = await supabase
        .from("referrals")
        .select("*")
        .eq("referred_id", referred_user_id)
        .or("reward_granted.eq.0,reward_granted.eq.false")
        .single();

      if (referral) {
        const rewardAmount = referral.reward_amount || 100;
        await supabase.from("transactions").insert({
          user_id: referral.referrer_id,
          type: "referral_bonus",
          amount: rewardAmount,
          status: "completed",
        });

        // Credit the referrer's wallet balance
        await supabase.rpc("increment_user_balance", {
          p_user_id: referral.referrer_id,
          p_wallet_delta: rewardAmount,
          p_total_earned_delta: rewardAmount
        });

        const updateVal =
          typeof referral.reward_granted === "number" ? 1 : true;
        await supabase
          .from("referrals")
          .update({ reward_granted: updateVal })
          .eq("id", referral.id);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Grant reward error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // MPR (Marketing Partner Role) APIs
  app.get("/api/mpr/dashboard", authenticateUser, async (req: any, res: any) => {
    try {
      const supabase = getSupabase();
      const user = req.user;
      const profile = req.profile || {};

      const isMPR =
        profile.account_tier === "marketing_partner" ||
        profile.account_tier === "mpr" ||
        profile.role === "marketing_partner" ||
        profile.is_admin === true ||
        profile.account_tier === "admin";

      if (!isMPR) {
        return res.status(403).json({ error: "Access denied. Marketing Partner account required." });
      }

      // Auto-generate mpr_code if missing
      let mprCode = profile.mpr_code;
      if (!mprCode) {
        mprCode = `MPR-${user.id.substring(0, 6).toUpperCase()}`;
        try {
          await supabase.from("users").update({ mpr_code: mprCode }).eq("id", user.id);
        } catch (codeErr) {
          console.warn("[MPR] Auto code creation notice:", codeErr);
        }
      }

      // Fetch referrals by this MPR user
      const { data: rawReferrals } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      const referralList = rawReferrals || [];
      const referredUserIds = referralList.map((r: any) => r.referred_id).filter(Boolean);

      let recruits: any[] = [];
      if (referredUserIds.length > 0) {
        const { data: recruitedUsers } = await supabase
          .from("users")
          .select("id, email, full_name, username, account_tier, is_approved_author, is_premium, created_at")
          .in("id", referredUserIds);

        const { data: authorBooks } = await supabase
          .from("books")
          .select("user_id, id")
          .in("user_id", referredUserIds);

        const booksPerUser = (authorBooks || []).reduce((acc: any, b: any) => {
          acc[b.user_id] = (acc[b.user_id] || 0) + 1;
          return acc;
        }, {});

        recruits = (recruitedUsers || []).map((u: any) => {
          const refInfo = referralList.find((r: any) => r.referred_id === u.id);
          const bookCount = booksPerUser[u.id] || 0;
          const isAuthor = u.account_tier === "author" || u.is_approved_author || bookCount > 0;
          return {
            id: u.id,
            name: u.full_name || u.username || u.email || "Author Recruit",
            email: u.email,
            dateJoined: u.created_at || refInfo?.created_at || new Date().toISOString(),
            status: isAuthor ? "approved" : "pending",
            isAuthor,
            bookCount,
            commissionEarned: isAuthor ? 1000 + (bookCount * 500) : 100,
          };
        });
      }

      // Fetch transactions / commissions for this MPR user
      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const mprCommissions = (txs || []).filter((t: any) =>
        ["mpr_commission", "affiliate_commission", "referral_bonus"].includes(t.type)
      );

      const totalEarnings = mprCommissions.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
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
          account_name: profile.account_name || "",
        },
        stats: {
          totalRecruits: referralList.length,
          totalAuthors: recruits.filter((r: any) => r.isAuthor).length,
          totalEarnings: Math.max(totalEarnings, profile.total_mpr_earnings || 0),
          pendingCommissions: pendingCommissions,
          activeCampaigns: 3,
          clicks: (referralList.length * 7) + 14,
          ctr: "12.5%",
          conversionRate: referralList.length > 0 ? `${Math.round((recruits.filter((r: any) => r.isAuthor).length / referralList.length) * 100)}%` : "10%"
        },
        recruits,
        commissions: mprCommissions,
      });
    } catch (err: any) {
      console.error("[MPR] Dashboard error:", err);
      res.status(500).json({ error: err.message || "Failed to load MPR dashboard" });
    }
  });

  app.post("/api/mpr/update-code", authenticateUser, async (req: any, res: any) => {
    try {
      const { mpr_code } = req.body;
      if (!mpr_code || typeof mpr_code !== "string" || mpr_code.trim().length < 3) {
        return res.status(400).json({ error: "Code must be at least 3 characters long." });
      }

      const cleanCode = mpr_code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const supabase = getSupabase();

      // Check uniqueness
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("mpr_code", cleanCode)
        .neq("id", req.user.id)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: "This referral code is already taken by another user." });
      }

      const { error } = await supabase
        .from("users")
        .update({ mpr_code: cleanCode })
        .eq("id", req.user.id);

      if (error) throw error;

      res.json({ success: true, mpr_code: cleanCode });
    } catch (err: any) {
      console.error("[MPR] Code update error:", err);
      res.status(500).json({ error: err.message || "Failed to update MPR code" });
    }
  });

  app.post("/api/mpr/settings", authenticateUser, async (req: any, res: any) => {
    try {
      const { bank_name, account_number, account_name, mpr_code } = req.body;
      const supabase = getSupabase();

      const updates: any = {};
      if (bank_name !== undefined) updates.bank_name = bank_name;
      if (account_number !== undefined) updates.account_number = account_number;
      if (account_name !== undefined) updates.account_name = account_name;
      if (mpr_code) updates.mpr_code = mpr_code.trim().toUpperCase();

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", req.user.id);

      if (error) throw error;

      res.json({ success: true });
    } catch (err: any) {
      console.error("[MPR] Settings update error:", err);
      res.status(500).json({ error: err.message || "Failed to save MPR settings" });
    }
  });

  app.post("/api/mpr/withdraw", authenticateUser, async (req: any, res: any) => {
    try {
      const { amount, bank_name, account_number, account_name } = req.body;
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount < 1000) {
        return res.status(400).json({ error: "Minimum withdrawal amount is ₦1,000." });
      }

      const supabase = getSupabase();
      const user = req.user;

      // Insert into payment_requests
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        amount: Math.round(numAmount),
        method: "mpr_payout",
        status: "pending",
        details: JSON.stringify({ bank_name, account_number, account_name }),
      });

      if (error) throw error;

      // Log in MPR audit trail
      logMprAudit({
        mpr_id: user.id,
        action_type: "requested_payout",
        target_type: "withdrawal",
        target_id: user.id,
        details: { amount: Math.round(numAmount), bank_name, account_number, account_name },
        ip_address: req.ip,
      });

      res.json({ success: true, message: "Payout request submitted successfully." });
    } catch (err: any) {
      console.error("[MPR] Withdraw error:", err);
      res.status(500).json({ error: err.message || "Failed to process withdrawal request" });
    }
  });

  // ==========================================
  // ADMIN MPR ACCOUNT HUB APIS
  // ==========================================
  app.get("/api/admin/mpr/hub", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabaseAdmin();

      // 1. Fetch all MPR users
      const { data: rawUsers, error: usersErr } = await supabase
        .from("users")
        .select("id, email, full_name, username, account_tier, role, mpr_code, mpr_commission_rate, total_mpr_earnings, pending_mpr_earnings, bank_name, account_number, account_name, created_at, is_suspended, status, is_approved_author")
        .or("account_tier.eq.marketing_partner,account_tier.eq.mpr,role.eq.marketing_partner,mpr_code.not.is.null")
        .order("created_at", { ascending: false });

      if (usersErr) throw usersErr;

      const mprUsers = rawUsers || [];
      const mprIds = mprUsers.map((u: any) => u.id);

      // 2. Fetch all referrals
      const { data: allReferrals } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      const referralsList = allReferrals || [];

      // 3. Fetch books to identify recruited authors
      const { data: allBooks } = await supabase
        .from("books")
        .select("user_id, id, title, price, status");
      
      const booksList = allBooks || [];
      const booksByUser = booksList.reduce((acc: any, b: any) => {
        if (b.user_id) {
          acc[b.user_id] = (acc[b.user_id] || 0) + 1;
        }
        return acc;
      }, {});

      // 4. Fetch commission transactions
      const { data: allTxs } = await supabase
        .from("transactions")
        .select("*")
        .or("type.eq.mpr_commission,type.eq.affiliate_commission,type.eq.referral_bonus")
        .order("created_at", { ascending: false });

      const txsList = allTxs || [];

      // 5. Fetch payout requests
      const { data: allPayouts } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("method", "mpr_payout")
        .order("created_at", { ascending: false });

      const payoutsList = allPayouts || [];

      // Aggregate data per MPR
      const mprsWithStats = mprUsers.map((u: any) => {
        const userReferrals = referralsList.filter((r: any) => r.referrer_id === u.id);
        const recruitedIds = userReferrals.map((r: any) => r.referred_id);
        const authorsCount = recruitedIds.filter((id: string) => (booksByUser[id] || 0) > 0).length;
        
        const userTxs = txsList.filter((t: any) => t.user_id === u.id);
        const totalEarnings = userTxs.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
        
        const userPayouts = payoutsList.filter((p: any) => p.user_id === u.id);
        const totalPaidOut = userPayouts
          .filter((p: any) => p.status === "approved" || p.status === "completed")
          .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

        const pendingPayout = userPayouts
          .filter((p: any) => p.status === "pending")
          .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

        const status = u.is_suspended || u.status === "suspended" ? "suspended" : (u.status || "active");

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
          total_paid: totalPaidOut,
          pending_earnings: u.pending_mpr_earnings || pendingPayout,
          bank_name: u.bank_name || "",
          account_number: u.account_number || "",
          account_name: u.account_name || "",
          created_at: u.created_at,
        };
      });

      // Compute Global Overview
      const totalMprs = mprsWithStats.length;
      const activeMprs = mprsWithStats.filter((m: any) => m.status === "active").length;
      const suspendedMprs = mprsWithStats.filter((m: any) => m.status === "suspended").length;
      const totalRecruits = mprsWithStats.reduce((sum: number, m: any) => sum + m.total_recruits, 0);
      const totalAuthors = mprsWithStats.reduce((sum: number, m: any) => sum + m.total_authors, 0);
      const totalCommissions = mprsWithStats.reduce((sum: number, m: any) => sum + m.total_earnings, 0);
      const totalPaidOut = mprsWithStats.reduce((sum: number, m: any) => sum + m.total_paid, 0);
      const pendingCommissions = mprsWithStats.reduce((sum: number, m: any) => sum + m.pending_earnings, 0);

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
          pendingCommissions,
        },
        mprs: mprsWithStats,
      });
    } catch (err: any) {
      console.error("[Admin MPR Hub] Overview error:", err);
      res.status(500).json({ error: err.message || "Failed to load MPR Hub data" });
    }
  });

  app.get("/api/admin/mpr/:id", authenticateAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseAdmin();

      // 1. Fetch MPR Profile
      const { data: mprUser, error: userErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (userErr || !mprUser) {
        return res.status(404).json({ error: "Marketing Partner not found" });
      }

      // 2. Fetch Referrals by this partner
      const { data: userReferrals } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", id)
        .order("created_at", { ascending: false });

      const referralList = userReferrals || [];
      const recruitedIds = referralList.map((r: any) => r.referred_id).filter(Boolean);

      let recruitedAuthors: any[] = [];
      if (recruitedIds.length > 0) {
        const { data: recUsers } = await supabase
          .from("users")
          .select("id, email, full_name, username, account_tier, is_approved_author, is_premium, created_at")
          .in("id", recruitedIds);

        const { data: authorBooks } = await supabase
          .from("books")
          .select("user_id, id, title, price")
          .in("user_id", recruitedIds);

        const booksMap = (authorBooks || []).reduce((acc: any, b: any) => {
          if (!acc[b.user_id]) acc[b.user_id] = [];
          acc[b.user_id].push(b);
          return acc;
        }, {});

        recruitedAuthors = (recUsers || []).map((u: any) => {
          const ref = referralList.find((r: any) => r.referred_id === u.id);
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
            rewardGranted: ref?.reward_granted || false,
          };
        });
      }

      // 3. Fetch Transactions / Commissions
      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      // 4. Fetch Payout Requests
      const { data: payouts } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      res.json({
        success: true,
        mpr: {
          ...mprUser,
          mpr_code: mprUser.mpr_code || `MPR-${mprUser.id.substring(0, 6).toUpperCase()}`,
          status: mprUser.is_suspended || mprUser.status === "suspended" ? "suspended" : (mprUser.status || "active"),
        },
        recruits: recruitedAuthors,
        transactions: txs || [],
        payouts: payouts || [],
      });
    } catch (err: any) {
      console.error("[Admin MPR Detail] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load MPR details" });
    }
  });

  app.post("/api/admin/mpr/:id/action", authenticateAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { action, payload } = req.body;
      const supabase = getSupabaseAdmin();

      if (action === "set_status") {
        const { status } = payload; // "active" | "suspended" | "deleted"
        if (status === "deleted") {
          // Revert MPR role to free user
          await supabase.from("users").update({
            account_tier: "free",
            role: "user",
            status: "active",
            is_suspended: false,
          }).eq("id", id);
        } else {
          const isSuspended = status === "suspended";
          await supabase.from("users").update({
            status,
            is_suspended: isSuspended,
          }).eq("id", id);
        }
        return res.json({ success: true, message: `MPR status updated to ${status}` });
      }

      if (action === "set_rate") {
        const { rate } = payload; // e.g. 15
        const numRate = parseFloat(rate);
        if (isNaN(numRate) || numRate < 1 || numRate > 100) {
          return res.status(400).json({ error: "Commission rate must be between 1% and 100%." });
        }
        await supabase.from("users").update({
          mpr_commission_rate: numRate,
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
        await supabase.from("transactions").insert({
          user_id: id,
          amount: delta,
          type: "mpr_commission",
          status: "successful",
          admin_note: reason || "Manual admin adjustment",
        });

        // Update user's wallet/earnings
        await supabase.rpc("increment_user_balance", {
          p_user_id: id,
          p_wallet_delta: delta,
          p_total_earned_delta: type === "credit" ? delta : 0,
        });

        return res.json({ success: true, message: `Balance adjusted by ₦${numAmount.toLocaleString()}` });
      }

      if (action === "send_notification") {
        const { subject, message } = payload;
        const { data: targetUser } = await supabase.from("users").select("email, full_name").eq("id", id).single();
        if (targetUser && targetUser.email) {
          try {
            const brevoClient = getBrevo();
            if (brevoClient) {
              await brevoClient.transactionalEmails.sendTransacEmail({
                subject: subject || "Notification from CalmReader Admin",
                textContent: message,
                sender: { email: brevoSender, name: "CalmReader Executive Team" },
                to: [{ email: targetUser.email }],
              });
            }
          } catch (e) {
            console.warn("[Admin MPR] Email dispatch error:", e);
          }
        }
        return res.json({ success: true, message: "Notification dispatched to partner." });
      }

      if (action === "assign_mpr") {
        // Assign any user to Marketing Partner role
        await supabase.from("users").update({
          account_tier: "marketing_partner",
          role: "marketing_partner",
          status: "active",
          is_suspended: false,
        }).eq("id", id);
        logMprAudit({
          mpr_id: id,
          admin_id: req.user?.id,
          action_type: "admin_updated_mpr",
          target_type: "profile",
          target_id: id,
          details: { action: "assign_mpr" },
          ip_address: req.ip,
        });
        return res.json({ success: true, message: "User successfully upgraded to Marketing Partner!" });
      }

      return res.status(400).json({ error: "Unknown action provided" });
    } catch (err: any) {
      console.error("[Admin MPR Action] Error:", err);
      res.status(500).json({ error: err.message || "Failed to execute admin action" });
    }
  });

  // ==========================================
  // MPR AUDIT LOG & ANALYTICS INFRASTRUCTURE
  // ==========================================

  // In-memory buffer to support instant audit availability & fallbacks
  const inMemoryAuditLogs: any[] = [];

  async function logMprAudit(entry: {
    mpr_id?: string | null;
    admin_id?: string | null;
    action_type: string;
    target_type: string;
    target_id: string;
    details?: any;
    ip_address?: string | null;
  }) {
    const memoryRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      mpr_id: entry.mpr_id || null,
      admin_id: entry.admin_id || null,
      action_type: entry.action_type,
      target_type: entry.target_type,
      target_id: String(entry.target_id || ""),
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      created_at: new Date().toISOString(),
    };
    inMemoryAuditLogs.unshift(memoryRecord);
    if (inMemoryAuditLogs.length > 500) inMemoryAuditLogs.pop();

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("mpr_audit_log").insert({
        mpr_id: memoryRecord.mpr_id,
        admin_id: memoryRecord.admin_id,
        action_type: memoryRecord.action_type,
        target_type: memoryRecord.target_type,
        target_id: memoryRecord.target_id,
        details: memoryRecord.details,
        ip_address: memoryRecord.ip_address,
        created_at: memoryRecord.created_at,
      });
    } catch (dbErr: any) {
      console.warn("[MPR Audit] Notice: database insert bypassed, stored in memory cache:", dbErr?.message || dbErr);
    }
  };

  // 1. MPR Analytics Dashboard API (Admin Overview + Performance)
  app.get("/api/admin/mpr/analytics", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabaseAdmin();
      const { startDate, endDate, mprId } = req.query;

      // Fetch all MPR users
      let queryUsers = supabase
        .from("users")
        .select("id, email, full_name, username, account_tier, role, mpr_code, mpr_commission_rate, total_mpr_earnings, pending_mpr_earnings, bank_name, account_number, account_name, created_at, is_suspended, status")
        .or("account_tier.eq.marketing_partner,account_tier.eq.mpr,role.eq.marketing_partner,mpr_code.not.is.null")
        .order("created_at", { ascending: false });

      if (mprId) {
        queryUsers = queryUsers.eq("id", mprId);
      }

      const { data: rawUsers } = await queryUsers;
      const mprUsers = rawUsers || [];

      // Fetch Referrals with optional date range
      let queryReferrals = supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (startDate) {
        queryReferrals = queryReferrals.gte("created_at", new Date(startDate).toISOString());
      }
      if (endDate) {
        queryReferrals = queryReferrals.lte("created_at", new Date(endDate).toISOString());
      }

      const { data: rawReferrals } = await queryReferrals;
      const referralsList = rawReferrals || [];

      // Unique recruited user IDs
      const recruitedUserIds = Array.from(new Set(referralsList.map((r: any) => r.referred_id).filter(Boolean)));

      // Fetch recruited users
      let recruitedUsersMap: Record<string, any> = {};
      if (recruitedUserIds.length > 0) {
        const { data: recUsers } = await supabase
          .from("users")
          .select("id, email, full_name, username, account_tier, is_approved_author, created_at")
          .in("id", recruitedUserIds);
        (recUsers || []).forEach((u: any) => {
          recruitedUsersMap[u.id] = u;
        });
      }

      // Fetch author books
      let authorBooksMap: Record<string, any[]> = {};
      if (recruitedUserIds.length > 0) {
        const { data: allBooks } = await supabase
          .from("books")
          .select("id, user_id, title, price, status")
          .in("user_id", recruitedUserIds);
        (allBooks || []).forEach((b: any) => {
          if (!authorBooksMap[b.user_id]) authorBooksMap[b.user_id] = [];
          authorBooksMap[b.user_id].push(b);
        });
      }

      // Fetch author sales & transactions
      let authorRevenueMap: Record<string, number> = {};
      if (recruitedUserIds.length > 0) {
        const { data: authorTxs } = await supabase
          .from("transactions")
          .select("user_id, book_id, amount, type, status, created_at")
          .in("user_id", recruitedUserIds)
          .eq("status", "successful");
        (authorTxs || []).forEach((t: any) => {
          authorRevenueMap[t.user_id] = (authorRevenueMap[t.user_id] || 0) + (parseFloat(t.amount) || 0);
        });
      }

      // Fetch commission transactions & payouts
      const { data: allTxs } = await supabase
        .from("transactions")
        .select("*")
        .or("type.eq.mpr_commission,type.eq.affiliate_commission,type.eq.referral_bonus")
        .order("created_at", { ascending: false });
      const txsList = allTxs || [];

      const { data: allPayouts } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("method", "mpr_payout")
        .order("created_at", { ascending: false });
      const payoutsList = allPayouts || [];

      // Active MPRs: at least 1 recruit in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      let activeMprCount = 0;

      // Build Per-MPR Performance
      const mprPerformance = mprUsers.map((u: any) => {
        const userReferrals = referralsList.filter((r: any) => r.referrer_id === u.id);
        
        const recruits = userReferrals.map((r: any) => {
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
            status: isAuthor ? "author" : "user",
          };
        });

        const authorsCount = recruits.filter((r: any) => r.isAuthor).length;
        const recruitsCount = recruits.length;

        const hasRecentRecruit = userReferrals.some((r: any) => r.created_at >= thirtyDaysAgo);
        if (hasRecentRecruit) activeMprCount++;

        const revenueGenerated = recruits.reduce((sum: number, r: any) => sum + r.revenue, 0);

        const userTxs = txsList.filter((t: any) => t.user_id === u.id);
        const commissionEarned = userTxs.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);

        const userPayouts = payoutsList.filter((p: any) => p.user_id === u.id);
        const commissionPaid = userPayouts
          .filter((p: any) => p.status === "approved" || p.status === "completed" || p.status === "paid")
          .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

        const commissionPending = userPayouts
          .filter((p: any) => p.status === "pending")
          .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0) || (u.pending_mpr_earnings || 0);

        const clicksCount = Math.max(recruitsCount * 5 + 12, 1);
        const conversionRate = Number(((recruitsCount / clicksCount) * 100).toFixed(1));
        const authorConversionRate = recruitsCount > 0 ? Number(((authorsCount / recruitsCount) * 100).toFixed(1)) : 0;

        const status = u.is_suspended || u.status === "suspended" ? "suspended" : (hasRecentRecruit ? "active" : "inactive");

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
          recruits,
        };
      });

      // Overview aggregates
      const totalMprs = mprPerformance.length;
      const totalRecruits = mprPerformance.reduce((acc: number, m: any) => acc + m.recruitsCount, 0);
      const totalAuthors = mprPerformance.reduce((acc: number, m: any) => acc + m.authorsCount, 0);
      const totalRevenue = mprPerformance.reduce((acc: number, m: any) => acc + m.revenueGenerated, 0);
      const totalCommissionsPaid = mprPerformance.reduce((acc: number, m: any) => acc + m.commissionPaid, 0);
      const pendingCommissions = mprPerformance.reduce((acc: number, m: any) => acc + m.commissionPending, 0);

      res.json({
        success: true,
        overview: {
          totalMprs,
          activeMprs: activeMprCount,
          totalRecruits,
          activeAuthors: totalAuthors,
          totalRevenue,
          totalCommissionsPaid,
          pendingCommissions,
        },
        mprs: mprPerformance,
        filters: { startDate: startDate || null, endDate: endDate || null, mprId: mprId || null },
      });
    } catch (err: any) {
      console.error("[MPR Analytics API] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load MPR analytics" });
    }
  });

  // Detailed Analytics for Single MPR
  app.get(["/api/admin/mpr/:mprId/analytics", "/api/admin/mpr/[mprId]/analytics"], authenticateAdmin, async (req: any, res: any) => {
    try {
      const { mprId } = req.params;
      const supabase = getSupabaseAdmin();

      // 1. Fetch MPR Profile
      const { data: mprUser, error: uErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", mprId)
        .single();

      if (uErr || !mprUser) {
        return res.status(404).json({ error: "MPR Partner not found" });
      }

      // 2. Fetch Referrals
      const { data: userReferrals } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", mprId)
        .order("created_at", { ascending: false });

      const referralList = userReferrals || [];
      const recruitedIds = referralList.map((r: any) => r.referred_id).filter(Boolean);

      // 3. Recruited users & books
      let recruits: any[] = [];
      let totalRevenueGenerated = 0;

      if (recruitedIds.length > 0) {
        const { data: recUsers } = await supabase
          .from("users")
          .select("id, email, full_name, username, account_tier, is_approved_author, created_at")
          .in("id", recruitedIds);

        const { data: authorBooks } = await supabase
          .from("books")
          .select("id, user_id, title, price")
          .in("user_id", recruitedIds);

        const { data: authorTxs } = await supabase
          .from("transactions")
          .select("user_id, amount, status")
          .in("user_id", recruitedIds)
          .eq("status", "successful");

        const booksMap = (authorBooks || []).reduce((acc: any, b: any) => {
          if (!acc[b.user_id]) acc[b.user_id] = [];
          acc[b.user_id].push(b);
          return acc;
        }, {});

        const txMap = (authorTxs || []).reduce((acc: any, t: any) => {
          acc[t.user_id] = (acc[t.user_id] || 0) + (parseFloat(t.amount) || 0);
          return acc;
        }, {});

        recruits = (recUsers || []).map((u: any) => {
          const ref = referralList.find((r: any) => r.referred_id === u.id);
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
            revenue,
          };
        });
      }

      // 4. Commissions & Transactions
      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", mprId)
        .order("created_at", { ascending: false });

      const { data: payouts } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", mprId)
        .order("created_at", { ascending: false });

      const commissionEarned = (txs || []).reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      const commissionPaid = (payouts || [])
        .filter((p: any) => p.status === "approved" || p.status === "completed" || p.status === "paid")
        .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
      const commissionPending = (payouts || [])
        .filter((p: any) => p.status === "pending")
        .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0) || (mprUser.pending_mpr_earnings || 0);

      // 5. Audit Log for this MPR
      let auditLogs: any[] = [];
      try {
        const { data: dbLogs } = await supabase
          .from("mpr_audit_log")
          .select("*")
          .eq("mpr_id", mprId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (dbLogs) auditLogs = dbLogs;
      } catch (_) {}

      if (auditLogs.length === 0) {
        auditLogs = inMemoryAuditLogs.filter((l: any) => l.mpr_id === mprId);
      }

      const clicksCount = Math.max(recruits.length * 5 + 12, 1);
      const authorsCount = recruits.filter((r: any) => r.isAuthor).length;

      res.json({
        success: true,
        mpr: {
          ...mprUser,
          mpr_code: mprUser.mpr_code || `MPR-${mprUser.id.substring(0, 6).toUpperCase()}`,
          status: mprUser.is_suspended || mprUser.status === "suspended" ? "suspended" : (mprUser.status || "active"),
        },
        stats: {
          recruitsCount: recruits.length,
          authorsCount,
          clicksCount,
          conversionRate: Number(((recruits.length / clicksCount) * 100).toFixed(1)),
          authorConversionRate: recruits.length > 0 ? Number(((authorsCount / recruits.length) * 100).toFixed(1)) : 0,
          revenueGenerated: totalRevenueGenerated,
          commissionEarned: Math.max(commissionEarned, mprUser.total_mpr_earnings || 0),
          commissionPaid,
          commissionPending,
        },
        recruits,
        commissions: txs || [],
        payouts: payouts || [],
        marketingActions: {
          triviaCreated: 0,
          campaignsLaunched: 1,
          linksShared: clicksCount,
        },
        auditLogs,
      });
    } catch (err: any) {
      console.error("[Single MPR Analytics] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load individual MPR analytics" });
    }
  });

  // 2. MPR Audit Trail API (Admin View)
  app.get("/api/admin/mpr/audit", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabaseAdmin();
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
      const offset = (page - 1) * limit;

      const { mprId, actionType, targetType, startDate, endDate, search } = req.query;

      let dbLogs: any[] = [];
      let totalCount = 0;
      let usedFallback = false;

      try {
        let query = supabase
          .from("mpr_audit_log")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false });

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

      // If database returned no records or table doesn't exist yet, merge with inMemoryAuditLogs
      if (usedFallback || dbLogs.length === 0) {
        let filteredMem = [...inMemoryAuditLogs];
        if (mprId) filteredMem = filteredMem.filter((l: any) => l.mpr_id === mprId);
        if (actionType && actionType !== "all") filteredMem = filteredMem.filter((l: any) => l.action_type === actionType);
        if (targetType && targetType !== "all") filteredMem = filteredMem.filter((l: any) => l.target_type === targetType);
        if (startDate) filteredMem = filteredMem.filter((l: any) => l.created_at >= new Date(startDate).toISOString());
        if (endDate) filteredMem = filteredMem.filter((l: any) => l.created_at <= new Date(endDate).toISOString());

        totalCount = Math.max(totalCount, filteredMem.length);
        dbLogs = filteredMem.slice(offset, offset + limit);
      }

      // Fetch user profile maps for mpr_id and admin_id
      const userIdsToFetch = Array.from(new Set([
        ...dbLogs.map((l: any) => l.mpr_id).filter(Boolean),
        ...dbLogs.map((l: any) => l.admin_id).filter(Boolean),
      ]));

      let userMap: Record<string, any> = {};
      if (userIdsToFetch.length > 0) {
        try {
          const { data: users } = await supabase
            .from("users")
            .select("id, email, full_name, username, mpr_code")
            .in("id", userIdsToFetch);
          (users || []).forEach((u: any) => {
            userMap[u.id] = {
              name: u.full_name || u.username || u.email?.split("@")[0] || "User",
              email: u.email,
              mpr_code: u.mpr_code,
            };
          });
        } catch (_) {}
      }

      const enrichedLogs = dbLogs.map((log: any) => ({
        ...log,
        mpr: log.mpr_id ? (userMap[log.mpr_id] || { name: "MPR Partner", email: "" }) : null,
        admin: log.admin_id ? (userMap[log.admin_id] || { name: "Administrator", email: "" }) : null,
      }));

      // Search filter if provided
      let finalLogs = enrichedLogs;
      if (search && typeof search === "string" && search.trim()) {
        const q = search.toLowerCase();
        finalLogs = enrichedLogs.filter((l: any) =>
          l.action_type?.toLowerCase().includes(q) ||
          l.target_type?.toLowerCase().includes(q) ||
          l.mpr?.name?.toLowerCase().includes(q) ||
          l.mpr?.email?.toLowerCase().includes(q) ||
          JSON.stringify(l.details || {}).toLowerCase().includes(q)
        );
      }

      res.json({
        success: true,
        logs: finalLogs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
        summary: {
          total: totalCount,
          createdTrivia: inMemoryAuditLogs.filter((l: any) => l.action_type === "created_trivia").length,
          recruitedAuthor: inMemoryAuditLogs.filter((l: any) => l.action_type === "recruited_author").length,
          requestedPayout: inMemoryAuditLogs.filter((l: any) => l.action_type === "requested_payout").length,
        },
      });
    } catch (err: any) {
      console.error("[MPR Audit Trail API] Error:", err);
      res.status(500).json({ error: err.message || "Failed to load audit trail" });
    }
  });

  // 3. MPR Self-Audit View API (Current Partner only)
  app.get("/api/mpr/audit/self", authenticateUser, async (req: any, res: any) => {
    try {
      const user = req.user;
      const profile = req.profile || {};
      const isMpr =
        profile.account_tier === "marketing_partner" ||
        profile.account_tier === "mpr" ||
        profile.role === "marketing_partner" ||
        profile.is_admin === true ||
        profile.account_tier === "admin";

      if (!isMpr) {
        return res.status(403).json({ error: "Access denied. Marketing Partner account required." });
      }

      const supabase = getSupabaseAdmin();
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);
      const offset = (page - 1) * limit;

      let logs: any[] = [];
      let total = 0;

      try {
        const { data, count, error } = await supabase
          .from("mpr_audit_log")
          .select("*", { count: "exact" })
          .eq("mpr_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (!error && data) {
          logs = data;
          total = count || data.length;
        }
      } catch (_) {}

      if (logs.length === 0) {
        const mem = inMemoryAuditLogs.filter((l: any) => l.mpr_id === user.id);
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
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (err: any) {
      console.error("[MPR Self Audit] Error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch your audit logs" });
    }
  });

  // 4. Helper endpoint to record client actions (e.g. shared link clicks)
  app.post("/api/mpr/audit/record", async (req: any, res: any) => {
    try {
      const { action_type, target_type, target_id, details, mpr_code, mpr_id } = req.body;
      const supabase = getSupabase();

      let finalMprId = mpr_id;
      if (!finalMprId && mpr_code) {
        const { data: mprUser } = await supabase
          .from("users")
          .select("id")
          .ilike("mpr_code", mpr_code.trim())
          .maybeSingle();
        if (mprUser) finalMprId = mprUser.id;
      }

      if (finalMprId) {
        await logMprAudit({
          mpr_id: finalMprId,
          action_type: action_type || "shared_link",
          target_type: target_type || "referral",
          target_id: target_id || "link",
          details: details || {},
          ip_address: req.ip,
        });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.warn("[MPR Audit Record Client] Notice:", err?.message || err);
      res.json({ success: false });
    }
  });

  // Supabase User Email Confirmed Webhook
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
      const confirmedAt = record.confirmed_at || payload.confirmed_at || new Date().toISOString();

      console.log(`[Webhook User Confirmed] User ${userEmail} confirmed email at ${confirmedAt}`);

      // Send admin notification using the preloaded Brevo mail config
      const brevoClient = getBrevo();
      const adminEmail = process.env.ADMIN_EMAIL || "samuelchukwuemeke05@gmail.com";

      if (brevoClient) {
        await brevoClient.transactionalEmails.sendTransacEmail({
          subject: `🎉 New User Confirmed Email on CalmReader!`,
          textContent: `A new user (${userEmail}) has confirmed their email address at ${confirmedAt}.`,
          htmlContent: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e7ff; border-radius: 16px;">
              <h2 style="color: #4f46e5; margin-top: 0;">🎉 New User Confirmed!</h2>
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
          to: [{ email: adminEmail }],
        });
        console.log(`[Webhook User Confirmed] Contact notification email successfully dispatched to ${adminEmail}`);
      } else {
        console.warn(`[Webhook User Confirmed] Brevo client is unconfigured. Logging notification output only: User ${userEmail} confirmed email.`);
      }

      return res.json({ success: true, message: "Webhook processed successfully" });
    } catch (err: any) {
      console.error("[Webhook User Confirmed] Critical failure processing payload:", err);
      return res.status(500).json({ error: "Internal processing failure", details: err.message });
    }
  });

  // Legacy book and premium payment handler retained for compatibility.
  app.post("/api/paystack-webhook-legacy", async (req, res) => {
    const event = req.body;
    console.log(
      `[Paystack Webhook] Received event: ${event.event}`,
      JSON.stringify(event.data?.metadata),
    );

    if (event.event === "charge.success") {
      const { amount, metadata, customer, reference } = event.data;
      console.log(
        `[Paystack Webhook] Processing success for ${customer.email}, amount: ${amount}, reference: ${reference}`,
      );
      const { book_id, affiliate_code, type } = metadata;
      const supabase = getSupabase();

      const saleAmount = amount / 100; // Paystack is in kobo

      if (type === "premium_upgrade") {
        const { data: user } = await supabase
          .from("users")
          .select("email")
          .eq("email", customer.email)
          .single();
        if (user) {
          await supabase.rpc("admin_set_user_tier", {
            p_email: user.email,
            p_new_tier: "premium",
          });
          await supabase.from("transactions").insert({
            user_id: user.id,
            type: "premium_upgrade",
            amount: saleAmount,
            status: "completed",
            paystack_reference: reference,
            commission: saleAmount,
          });
          // Grant referral reward
          const { data: referral } = await supabase
            .from("referrals")
            .select("*")
            .eq("referred_id", user.id)
            .or("reward_granted.eq.0,reward_granted.eq.false")
            .single();

          if (referral) {
            const bonusAmount = referral.reward_amount || 100;
            await supabase.from("transactions").insert({
              user_id: referral.referrer_id,
              type: "referral_bonus",
              amount: bonusAmount,
              status: "completed",
            });

            // Credit referrer's wallet balance
            await supabase.rpc("increment_user_balance", {
              p_user_id: referral.referrer_id,
              p_wallet_delta: bonusAmount,
              p_total_earned_delta: bonusAmount
            });

            const rewardVal =
              typeof referral.reward_granted === "number" ? 1 : true;
            await supabase
              .from("referrals")
              .update({ reward_granted: rewardVal })
              .eq("id", referral.id);
          }
        }
      } else if (book_id) {
        // 1. Record the main sale with IPC vs FC Revenue Split & MPR Rewards
        let bookQuery = supabase
          .from("books")
          .select("id, user_id, price, content_type, author_share, platform_share, mpr_share, mpr_referral_code, admin_note, users(id, is_admin, email, referred_by_mpr, mpr_referral_locked)")
          .eq("id", book_id)
          .single();

        let { data: book, error: bErr } = await bookQuery;
        // Resilient fallback if extra columns don't exist yet
        if (bErr && (bErr.message?.includes("column") || bErr.message?.includes("does not exist"))) {
          const { data: fbBook } = await supabase
            .from("books")
            .select("id, user_id, price, users(id, is_admin, email)")
            .eq("id", book_id)
            .single();
          book = fbBook;
        }

        if (book) {
          // Detect Publishing Lane: Lane B (Independent Publishing / IPC) vs Lane A (Entertainment Content / FC)
          let isLaneB = false;
          const rawLane = (book.publishing_lane || book.content_type || '').toLowerCase();
          if (rawLane === 'lane_b' || rawLane === 'ipc' || rawLane === 'independent') {
            isLaneB = true;
          } else if (book.admin_note && (book.admin_note.includes("content_type=ipc") || book.admin_note.includes("lane_b"))) {
            isLaneB = true;
          }

          // Check for Platform Owner (Admin) status
          const isPlatformOwner = book.users?.is_admin === true || book.users?.is_admin === 1;

          // GROSS VS NET REVENUE & COST DEDUCTION LOGIC
          // Paystack Domestic Processing Fee: 1.5% + ₦100 (waived for < ₦2,500, capped at ₦2,000)
          // Platform absorbs gateway fee from gross first, then splits net revenue
          let processingFee = saleAmount * 0.015;
          if (saleAmount >= 2500) {
            processingFee += 100;
          }
          processingFee = Math.min(2000, Math.round(processingFee));
          const netRevenue = Math.max(0, saleAmount - processingFee);

          // Determine referring MPR for this author/book
          let referringMprId: string | null = book.users?.referred_by_mpr || null;
          
          // Check mpr_referral_code on the book if not set on user profile
          if (!referringMprId && book.mpr_referral_code) {
            const { data: mprUser } = await supabase
              .from("users")
              .select("id, email, is_suspended")
              .or(`referral_code.eq.${book.mpr_referral_code},username.ilike.${book.mpr_referral_code}`)
              .limit(1)
              .maybeSingle();

            if (mprUser && mprUser.id !== book.user_id && mprUser.email !== book.users?.email && !mprUser.is_suspended) {
              referringMprId = mprUser.id;
              // Link referring MPR to author with timestamp for 6-month switch window
              await supabase.from("users").update({ 
                referred_by_mpr: mprUser.id,
                mpr_assigned_at: new Date().toISOString()
              }).eq("id", book.user_id);
            }
          }

          // Anti-fraud: ensure author cannot refer themselves
          if (referringMprId === book.user_id) {
            referringMprId = null;
          }

          // Lock MPR referral on first sale (prevents arbitrary removal during initial 6-month contract)
          if (referringMprId && !book.users?.mpr_referral_locked) {
            await supabase.from("users").update({ mpr_referral_locked: true }).eq("id", book.user_id);
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
            // Lane B — Independent Publishing (30,000+ words)
            // Creator receives 70% of Net Revenue (creator retains 100% copyright)
            // Platform receives 30% of Net Revenue
            // MPR is optional: referring MPR receives 5% bonus from platform's 30% share (author keeps full 70%)
            authorAmount = Math.round(netRevenue * 0.70);
            const rawPlatformShare = netRevenue - authorAmount;

            if (referringMprId) {
              mprAmount = Math.round(rawPlatformShare * 0.05);
              mprType = "mpr_referral_bonus";
            }
            platformNet = rawPlatformShare - mprAmount;
          } else {
            // Lane A — CalmReader Entertainment Content (< 30,000 words)
            // Net Split: 30% Author Net / 20% MPR Net (viral/management) / 50% Platform Net
            authorAmount = Math.round(netRevenue * 0.30);
            if (referringMprId) {
              mprAmount = Math.round(netRevenue * 0.20);
              mprType = "mpr_commission";
            }
            platformNet = netRevenue - authorAmount - mprAmount;
          }

          const transactionType = type === "pdf_purchase" ? "pdf_purchase" : "author_earning";

          // 1. Author Earning (Calculated on Net Revenue)
          await supabase.from("transactions").insert({
            user_id: book.user_id,
            type: transactionType,
            amount: authorAmount,
            book_id,
            status: "completed",
            paystack_reference: reference,
            commission: platformNet + processingFee,
          });

          // Credit author's wallet
          await supabase.rpc("increment_user_balance", {
            p_user_id: book.user_id,
            p_wallet_delta: authorAmount,
            p_total_earned_delta: authorAmount
          });

          // 2. MPR Reward / Commission (From Net Revenue)
          if (referringMprId && mprAmount > 0) {
            await supabase.from("transactions").insert({
              user_id: referringMprId,
              type: mprType,
              amount: mprAmount,
              book_id,
              status: "completed",
              paystack_reference: reference,
              commission: 0
            });

            // Credit MPR's wallet
            await supabase.rpc("increment_user_balance", {
              p_user_id: referringMprId,
              p_wallet_delta: mprAmount,
              p_total_earned_delta: mprAmount
            });
          }

          // 3. Check 100 sales threshold for FC -> IPC Conversion Eligibility
          const isIpc = isLaneB || ((book as any)?.publishing_lane === 'ipc');
          if (!isIpc) {
            try {
              const { count: totalSales } = await supabase
                .from("transactions")
                .select("*", { count: "exact", head: true })
                .eq("book_id", book_id)
                .eq("status", "completed");

              if ((totalSales || 0) >= 100) {
                await supabase
                  .from("books")
                  .update({ ipc_conversion_status: "eligible" })
                  .eq("id", book_id)
                  .eq("ipc_conversion_status", "none");
              }
            } catch (salesErr: any) {
              console.warn("[IPC Sales Check Warning]", salesErr.message);
            }
          }

          // Affiliate Commission
          if (affiliate_code) {
            const affiliateShare = 0.10;
            const { data: affiliateLink } = await supabase
              .from("affiliate_links")
              .select("affiliate_id, id")
              .eq("affiliate_code", affiliate_code)
              .single();

            if (affiliateLink) {
              const commissionAmount = Math.round(saleAmount * affiliateShare);
              await supabase.from("transactions").insert({
                user_id: affiliateLink.affiliate_id,
                type: "affiliate_commission",
                amount: commissionAmount,
                book_id,
                affiliate_link_id: affiliateLink.id,
                status: "completed",
                paystack_reference: reference,
              });

              // Credit affiliate's wallet balance
              await supabase.rpc("increment_user_balance", {
                p_user_id: affiliateLink.affiliate_id,
                p_wallet_delta: commissionAmount,
                p_total_earned_delta: commissionAmount
              });

              await supabase.rpc("increment_affiliate_clicks", {
                link_id: affiliateLink.id,
              });
            }
          }

          // Grant referral reward on first purchase if not already granted
          const { data: buyer } = await supabase
            .from("users")
            .select("id")
            .eq("email", customer.email)
            .single();
          if (buyer) {
            const { data: referral } = await supabase
              .from("referrals")
              .select("*")
              .eq("referred_id", buyer.id)
              .eq("reward_granted", 0)
              .single();

            if (referral) {
              const bonusAmount = referral.reward_amount || 100;
              await supabase.from("transactions").insert({
                user_id: referral.referrer_id,
                type: "referral_bonus",
                amount: bonusAmount,
                status: "completed",
              });

              // Credit referrer's wallet balance
              await supabase.rpc("increment_user_balance", {
                p_user_id: referral.referrer_id,
                p_wallet_delta: bonusAmount,
                p_total_earned_delta: bonusAmount
              });

              await supabase
                .from("referrals")
                .update({ reward_granted: 1 })
                .eq("id", referral.id);
            }
          }

          // 2. GRANT ACCESS (Unlock Book via Purchase Transaction)
          // We use public.transactions because ebook_purchases might be a VIEW over it
          if (buyer) {
            console.log(
              `[Webhook] Granting access to ${customer.email} for book ${book_id}`,
            );

            // Insert the master 'purchase' record for the buyer
            await supabase.from("transactions").insert({
              user_id: buyer.id,
              book_id: book_id,
              buyer_email: customer.email,
              amount: saleAmount,
              type: "purchase",
              status: "successful",
              paystack_reference: reference,
            });

            // Also try to update ebook_purchases directly for backward compatibility if it's a table
            try {
              const { data: existingEpic } = await supabase
                .from("ebook_purchases")
                .select("*")
                .eq("user_id", buyer.id)
                .eq("ebook_id", book_id)
                .maybeSingle();

              if (!existingEpic) {
                await supabase.from("ebook_purchases").insert({
                  user_id: buyer.id,
                  ebook_id: book_id,
                  purchase_id: reference ? undefined : undefined // optional column
                });
                console.log(`[Webhook] ebook_purchases safe record inserted for user ${buyer.id} and book ${book_id}`);
              } else {
                console.log(`[Webhook] ebook_purchases entry already exists for user ${buyer.id} and book ${book_id}`);
              }
            } catch (e: any) {
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

  // Get user's purchased eBooks
  app.get("/api/user/purchases", authenticateUser, async (req: any, res) => {
    try {
      const supabase = getSupabase();
      const userId = req.profile?.id;
      let purchased_ids: string[] = [];

      try {
        const { data, error } = await supabase
          .from("ebook_purchases")
          .select("ebook_id")
          .eq("user_id", userId);

        if (error) throw error;
        purchased_ids = (data || []).map((p: any) => p.ebook_id);
      } catch (dbErr) {
        console.log("[Purchases API] Using transactions table fallback.");
        // Fallback to transactions table directly
        const { data, error } = await supabase
          .from("transactions")
          .select("book_id")
          .eq("user_id", userId)
          .eq("status", "successful")
          .eq("type", "purchase");

        if (error) throw error;
        purchased_ids = (data || []).map((p: any) => p.book_id).filter(Boolean);
      }

      res.json({ purchased_ids });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Author Stats (Sales, Revenue, Trivia Participation)
  app.get("/api/author/stats", authenticateUser, async (req: any, res) => {
    try {
      const supabase = getSupabase();
      if (supabase.__isDummy) return res.json({ stats: [] });

      const authorId = req.profile?.id;

      // Fetch author's books
      const { data: authorBooks } = await supabase
        .from("books")
        .select("id, title")
        .eq("user_id", authorId)
        .neq("status", -1);

      if (!authorBooks || authorBooks.length === 0) {
        return res.json({ stats: [] });
      }

      const bookIds = authorBooks.map((b) => b.id);

      // 1. Sales (Transactions)
      const { data: salesData } = await supabase
        .from("transactions")
        .select(
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
        `,
        )
        .in("book_id", bookIds)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      // 2. Trivia Participation
      const { data: triviaData } = await supabase
        .from("daily_trivia_attempts")
        .select("ebook_id")
        .in("ebook_id", bookIds);

      // Aggregating
      const stats = authorBooks.map((book) => {
        const bookSales = (salesData || []).filter(
          (s) => s.book_id === book.id,
        );
        const salesCount = bookSales.length;
        const revenue = bookSales.reduce((sum, s) => sum + s.amount, 0);
        const participants = (triviaData || []).filter(
          (t) => t.ebook_id === book.id,
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
            buyer: s.users,
          })),
        };
      });

      res.json({
        stats,
        summary: {
          totalSales: stats.reduce((sum, s) => sum + s.salesCount, 0),
          totalRevenue: stats.reduce((sum, s) => sum + s.revenue, 0),
          totalParticipants: stats.reduce((sum, s) => sum + s.participants, 0),
        },
      });
    } catch (err: any) {
      console.error("Author stats fetch error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // Takedown Request Endpoint (Author)
  app.post("/api/author/takedown/request", authenticateUser, async (req: any, res) => {
    try {
      const { bookId, reason } = req.body;
      if (!bookId || !reason) {
        return res.status(400).json({ error: "Book ID and reason are required." });
      }

      const userId = req.profile?.id || req.user?.id;
      const supabase = getSupabaseAdmin();

      // Verify book ownership
      const { data: book, error: bookErr } = await supabase
        .from("books")
        .select("id, title, user_id")
        .eq("id", bookId)
        .single();

      if (bookErr || !book) {
        return res.status(404).json({ error: "Book not found." });
      }

      if (String(book.user_id) !== String(userId) && !req.profile?.is_admin) {
        return res.status(403).json({ error: "You are not authorized to request takedown for this book." });
      }

      // Create takedown request
      const { data: requestData, error: insertErr } = await supabase
        .from("takedown_requests")
        .insert({
          book_id: bookId,
          author_id: userId,
          reason: reason.trim(),
          status: "pending",
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertErr) {
        console.warn("[Takedown Request] Insert warning:", insertErr.message);
      }

      // Mark book status as takedown_requested
      await supabase.from("books").update({ status: "takedown_requested" }).eq("id", bookId);

      return res.json({ success: true, request: requestData || { book_id: bookId, reason } });
    } catch (err: any) {
      console.error("Takedown request API error:", err);
      res.status(500).json({ error: err.message || "Failed to submit takedown request." });
    }
  });

  // Admin Takedowns List Endpoint
  app.get("/api/admin/takedown/requests", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { data: requests, error } = await supabase
        .from("takedown_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !requests) {
        return res.json({ requests: [] });
      }

      const bookIds = [...new Set(requests.map((r: any) => r.book_id))].filter(Boolean);
      const authorIds = [...new Set(requests.map((r: any) => r.author_id))].filter(Boolean);

      let bookMap: Record<string, any> = {};
      let authorMap: Record<string, any> = {};

      if (bookIds.length > 0) {
        const { data: books } = await supabase.from("books").select("id, title, cover_image, is_published, status").in("id", bookIds);
        if (books) {
          bookMap = books.reduce((acc: any, b: any) => { acc[b.id] = b; return acc; }, {});
        }
      }

      if (authorIds.length > 0) {
        const { data: authors } = await supabase.from("users").select("id, email, full_name").in("id", authorIds);
        if (authors) {
          authorMap = authors.reduce((acc: any, a: any) => { acc[a.id] = a; return acc; }, {});
        }
      }

      const mappedRequests = requests.map((r: any) => ({
        ...r,
        books: bookMap[r.book_id] || { title: "Unknown Book" },
        users: authorMap[r.author_id] || { email: "Unknown Author" }
      }));

      res.json({ requests: mappedRequests });
    } catch (err: any) {
      console.error("Admin takedowns fetch error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Admin Approve Takedown Endpoint
  app.post("/api/admin/takedown/approve", authenticateAdmin, async (req, res) => {
    try {
      const { requestId } = req.body;
      if (!requestId) return res.status(400).json({ error: "Request ID is required." });

      const supabase = getSupabaseAdmin();
      const { data: request, error: reqErr } = await supabase
        .from("takedown_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (reqErr || !request) {
        return res.status(404).json({ error: "Takedown request not found." });
      }

      await supabase.from("takedown_requests").update({
        status: "approved",
        resolved_at: new Date().toISOString()
      }).eq("id", requestId);

      await supabase.from("books").update({
        status: -1,
        is_published: 0
      }).eq("id", request.book_id);

      await supabase.from("author_notifications").insert({
        author_id: request.author_id,
        ebook_id: request.book_id,
        type: "takedown_approved",
        title: "eBook Takedown Approved 🗑️",
        message: "Your request to take down your eBook has been approved by admin and the content has been archived.",
        is_read: false,
        metadata: { requestId }
      }).catch(() => {});

      res.json({ success: true });
    } catch (err: any) {
      console.error("Approve takedown error:", err);
      res.status(500).json({ error: err.message || "Failed to approve takedown request." });
    }
  });

  // Admin Reject Takedown Endpoint
  app.post("/api/admin/takedown/reject", authenticateAdmin, async (req, res) => {
    try {
      const { requestId, adminNote } = req.body;
      if (!requestId) return res.status(400).json({ error: "Request ID is required." });

      const supabase = getSupabaseAdmin();
      const { data: request, error: reqErr } = await supabase
        .from("takedown_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (reqErr || !request) {
        return res.status(404).json({ error: "Takedown request not found." });
      }

      await supabase.from("takedown_requests").update({
        status: "rejected",
        admin_note: adminNote || null,
        resolved_at: new Date().toISOString()
      }).eq("id", requestId);

      await supabase.from("books").update({
        status: 1,
        is_published: 1
      }).eq("id", request.book_id);

      await supabase.from("author_notifications").insert({
        author_id: request.author_id,
        ebook_id: request.book_id,
        type: "takedown_rejected",
        title: "eBook Takedown Request Declined ❌",
        message: `Your takedown request was reviewed and declined. ${adminNote ? `Admin Note: "${adminNote}"` : ''}`,
        is_read: false,
        metadata: { requestId, adminNote }
      }).catch(() => {});

      res.json({ success: true });
    } catch (err: any) {
      console.error("Reject takedown error:", err);
      res.status(500).json({ error: err.message || "Failed to reject takedown request." });
    }
  });

  // Admin Pending Books List Endpoint
  app.get("/api/admin/books/pending", authenticateAdmin, async (req, res) => {
    try {
      // Ensure the query uses the SUPABASE_SERVICE_ROLE_KEY to bypass RLS
      const supabase = getSupabaseAdmin();
      let { data: books, error } = await supabase
        .from("books")
        .select("id, title, user_id, price, pdf_price, public_slug, is_published, status, cover_image, admin_note, report_count, created_at")
        .in("status", [1, 2])
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Admin API] Pending books primary query warning:", error.message);
        // Fallback with core columns in case custom columns do not exist
        const { data: fallbackBooks, error: fallbackError } = await supabase
          .from("books")
          .select("id, title, user_id, price, status, is_published, created_at")
          .in("status", [1, 2])
          .order("created_at", { ascending: false });

        if (fallbackError) {
          console.error("[Admin API] Pending books fallback query failed:", fallbackError.message);
          return res.status(500).json({ error: fallbackError.message || "Failed to query pending books", books: [] });
        }
        books = fallbackBooks || [];
      }

      if (!books) {
        books = [];
      }

      const userIds = [...new Set(books.map((b: any) => b.user_id))].filter(Boolean);
      let userMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, email, full_name").in("id", userIds);
        if (users) {
          userMap = users.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
        }
      }

      const mappedBooks = books.map((b: any) => ({
        ...b,
        users: userMap[b.user_id] || { email: "Unknown User", full_name: "Unknown User" }
      }));

      return res.json({ books: mappedBooks });
    } catch (err: any) {
      console.error("Fetch pending books error:", err);
      return res.status(500).json({ error: err.message || "Internal server error", books: [] });
    }
  });

  app.get("/api/admin/books/submitted", authenticateAdmin, async (req, res) => {
    req.url = "/api/admin/books/pending";
    return (app as any)._router.handle(req, res);
  });

  // Fetch Author Notifications
  app.get(
    "/api/author/notifications",
    authenticateUser,
    async (req: any, res) => {
      try {
        const supabase = getSupabase();
        if (supabase.__isDummy)
          return res.json({ notifications: [], unreadCount: 0 });

        const authorId = req.profile?.id || req.user?.id;
        if (!authorId) {
          return res.status(400).json({ error: "Missing author identity" });
        }

        const { data, error } = await supabase
          .from("author_notifications")
          .select("*")
          .eq("author_id", authorId)
          .order("created_at", { ascending: false });

        if (error) {
          if (
            error.message &&
            error.message.includes("relation") &&
            error.message.includes("does not exist")
          ) {
            console.warn(
              "[Notifications] public.author_notifications table missing.",
            );
            return res.json({
              notifications: [],
              unreadCount: 0,
              warning:
                "Author notifications table does not exist in your database schema yet. Please apply the migration.",
            });
          }
          return res.status(500).json({ error: error.message });
        }

        const unreadCount = (data || []).filter((n: any) => !n.is_read).length;

        res.json({
          notifications: data || [],
          unreadCount,
        });
      } catch (err: any) {
        console.error("Author notifications fetch exception:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Mark Author Notifications as Read
  app.post(
    "/api/author/notifications/mark-read",
    authenticateUser,
    async (req: any, res) => {
      try {
        const supabase = getSupabase();
        if (supabase.__isDummy) return res.json({ success: true });

        const authorId = req.profile?.id || req.user?.id;
        if (!authorId) {
          return res.status(400).json({ error: "Missing author identity" });
        }

        const { notificationIds, all } = req.body;

        let query = supabase
          .from("author_notifications")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("author_id", authorId);

        if (
          !all &&
          Array.isArray(notificationIds) &&
          notificationIds.length > 0
        ) {
          query = query.in("id", notificationIds);
        } else if (!all) {
          return res
            .status(400)
            .json({ error: "Either specify notificationIds or set all=true" });
        }

        const { error } = await query;

        if (error) {
          if (
            error.message &&
            error.message.includes("relation") &&
            error.message.includes("does not exist")
          ) {
            return res.json({
              success: false,
              error:
                "Notification table not created yet. Please apply migrations in Setup or Admin Panel.",
            });
          }
          return res.status(500).json({ error: error.message });
        }

        res.json({ success: true });
      } catch (err: any) {
        console.error("Marking notifications read exception:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Expose public Supabase configuration to frontend to synchronize credentials dynamically
  app.get("/api/supabase-config", (req, res) => {
    try {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      let key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
      
      // CRITICAL DEVELOPMENT FALLBACK: 
      // If VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY is not defined but service role is, 
      // utilize service role key so standard dynamic client initialization does not fail.
      if (!key) {
        key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
              process.env.SUPABASE_SERVICE_KEY || 
              process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
      }
      
      res.json({ url, key });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Resilient Supabase Proxy to bypass client-side network, CORS, and adblocker issues
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

      const cleanHeaders: Record<string, string> = {};
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

      const fetchOptions: RequestInit = {
        method,
        headers: cleanHeaders,
      };

      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const responseText = await response.text();

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      return res.json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseText
      });
    } catch (err: any) {
      console.error("[Supabase Proxy] Request error:", err);
      return res.status(500).json({ error: err?.message || "Proxy request failed" });
    }
  });

  // Dedicated Server-Side Login Fallback
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({
        session: data.session,
        user: data.user
      });
    } catch (err: any) {
      console.error("[Auth Login] Server login error:", err);
      return res.status(500).json({ error: err?.message || "Login failed" });
    }
  });

  // Dedicated Server-Side Signup Fallback
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, fullName, username, phoneNumber, dateOfBirth } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    try {
      const supabase = getSupabase();
      const admin = getSupabaseAdmin();
      const appUrl = process.env.APP_URL || "https://calmreader1.pages.dev";

      // Check phone uniqueness if provided
      if (phoneNumber) {
        const cleanPhone = phoneNumber.trim();
        const { data: existingPhone } = await admin
          .from("users")
          .select("id")
          .or(`contact.eq.${cleanPhone},phone.eq.${cleanPhone}`)
          .maybeSingle();

        if (existingPhone) {
          return res.status(400).json({ error: "This phone number is already registered to another account." });
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: appUrl,
          data: {
            full_name: fullName,
            username: username,
            phone: phoneNumber,
            date_of_birth: dateOfBirth
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (data.user) {
        const { data: existingProf } = await admin
          .from("users")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

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
    } catch (err: any) {
      console.error("[Auth Signup] Server signup error:", err);
      return res.status(500).json({ error: err?.message || "Sign up failed" });
    }
  });

  // Genres
  app.get("/api/genres", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
      const supabase = getSupabase();
      if (supabase.__isDummy) {
        return res.json({ genres: [] });
      }
      const { data, error } = await supabase.from("genres").select("*").order("name", { ascending: true });
      if (error) throw error;
      res.json({ genres: data || [] });
    } catch (err: any) {
      console.warn("[Genres] DB Fetch failed, returning high-fidelity inline fallbacks:", err.message);
      const fallbackGenres = [
        { id: "comic-id-placeholder", name: "Comic", slug: "comic" },
        { id: "horror-id-placeholder", name: "Horror", slug: "horror" },
        { id: "sci-fi-id-placeholder", name: "Sci-Fi", slug: "sci-fi" },
        { id: "romance-id-placeholder", name: "Romance", slug: "romance" },
        { id: "thriller-id-placeholder", name: "Thriller", slug: "thriller" },
        { id: "drama-id-placeholder", name: "Drama", slug: "drama" },
        { id: "fantasy-id-placeholder", name: "Fantasy", slug: "fantasy" },
        { id: "mystery-id-placeholder", name: "Mystery", slug: "mystery" },
      ];
      res.json({ genres: fallbackGenres, error: err.message, isFallback: true });
    }
  });

  // In-memory cache for Marketplace books to resolve JS_TIMEOUT issue
  let cachedMarketplaceBooks: any[] | null = null;
  let lastMarketplaceFetchTime = 0;

  // Marketplace
  app.get("/api/marketplace/books", async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();

      if (supabase.__isDummy) {
        return res.json({
          books: [],
          message:
            "Database context is not configured. Redirects will fail (localhost:3000) until the Site URL is updated in Supabase.",
          error: null,
          isConfigRequired: true,
        });
      }

      // 1. Serve from cache if fresh (younger than 60 seconds) to ensure outstanding response speeds
      const now = Date.now();
      if (cachedMarketplaceBooks && (now - lastMarketplaceFetchTime < 60000)) {
        console.log(`[Marketplace] Serving ${cachedMarketplaceBooks.length} books from in-memory cache (age: ${Math.round((now - lastMarketplaceFetchTime) / 1000)}s)`);
        return res.json({ books: cachedMarketplaceBooks });
      }

      // Robust fallback sequence to deal with schema variations/missing column caches
      let books: any[] = [];
      let booksError: any = null;

      const selectStrategies = [
        // 0a. HIGHLY OPTIMIZED JOIN-FREE columns (Ensures absolute maximum load speed and avoids all RLS join timeouts)
        {
          select:
            "id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, genre_id, cover_image",
          filtered: false,
          limit: 250,
          desc: "join-free fast columns with genre_id limit 250",
        },
        // 0b. HIGHLY OPTIMIZED JOIN-FREE columns without genre_id (Ensures backward structural compatibility)
        {
          select:
            "id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, cover_image",
          filtered: false,
          limit: 250,
          desc: "join-free fast columns limit 250",
        },
        // 1. Highly optimized named columns WITH genre_id
        {
          select:
            "id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, genre_id, cover_image, users(id, email)",
          filtered: false,
          limit: 150,
          desc: "named columns with users join and genre_id limit 150",
        },
        // 2. Highly optimized named columns WITHOUT genre_id (backward compatible)
        {
          select:
            "id, title, user_id, price, pdf_price, public_slug, is_published, status, admin_note, report_count, created_at, cover_image, users(id, email)",
          filtered: false,
          limit: 150,
          desc: "named columns with users join limit 150",
        },
        // 3. Bare minimum core columns WITH genre_id
        {
          select: "id, title, user_id, price, is_published, status, created_at, genre_id, cover_image, users(id, email)",
          filtered: false,
          limit: 200,
          desc: "bare minimum core columns with genre_id limit 200",
        },
        // 4. Bare minimum core columns WITHOUT genre_id (backward compatible)
        {
          select: "id, title, user_id, price, is_published, status, created_at, cover_image, users(id, email)",
          filtered: false,
          limit: 200,
          desc: "bare minimum core columns limit 200",
        },
        // 5. Simple fallback select is_published WITH genre_id
        {
          select:
            "id, title, user_id, price, public_slug, is_published, status, created_at, genre_id, cover_image, users(id, email)",
          filtered: false,
          limit: 100,
          desc: "simple fallback select with genre_id limit 100",
        },
        // 6. Simple fallback select IS_published WITHOUT genre_id
        {
          select:
            "id, title, user_id, price, public_slug, is_published, status, created_at, cover_image, users(id, email)",
          filtered: false,
          limit: 100,
          desc: "simple fallback select limit 100",
        },
      ];

      for (const strategy of selectStrategies) {
        try {
          // Race query with a generous 8000ms timeout
          const queryPromise = supabase
            .from("books")
            .select(strategy.select)
            .order("created_at", { ascending: false })
            .limit(strategy.limit || 250);

          const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
            setTimeout(() => reject(new Error("JS_TIMEOUT")), 8000)
          );

          const result = await Promise.race([queryPromise, timeoutPromise]);
          const { data, error } = result;

          if (!error && data) {
            books = data;
            booksError = null;
            break; // Success!
          } else {
            booksError = error;
            const errMsg = error ? error.message : "Empty data";
            console.warn(
              `[Marketplace] Query strategy (${strategy.desc}) failed:`,
              errMsg
            );
            if (
              errMsg.includes("statement timeout") || 
              errMsg.includes("cancel") || 
              errMsg.includes("database timeout") || 
              errMsg.includes("522") || 
              errMsg.includes("fetch") || 
              errMsg.includes("<!DOCTYPE html>")
            ) {
              console.warn("[Marketplace] Database error/timeout detected, trying next strategy configuration...");
            }
          }
        } catch (strategyEx: any) {
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
          error:
            typeof booksError === "object"
              ? booksError.message || JSON.stringify(booksError)
              : String(booksError),
        });
      }

      if (!books || books.length === 0) {
        return res.json({ books: [] });
      }

      // Filter candidates in-memory first based on status/dates/metadata (excludes cards_json checks for now)
      const candidateBooks = books.filter((book: any) => {
        // 1. SPECIFIC GHOST BOOK EXCLUSION (Aggressive removal of reported samples)
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
            `[Marketplace] Filtering out candidate ghost book: "${book.title}"`,
          );
          return false;
        }

        // 2. Status conventions (must be 1/approved for discovery)
        const isApproved =
          book.status == 1 ||
          book.status === "1" ||
          book.status === "approved" ||
          book.status === "published";

        // Handle various publication conventions
        const isPublished =
          book.is_published === true ||
          book.is_published == 1 ||
          book.is_published === "true" ||
          book.is_published === "1";

        // Explicitly exclude anything that has been marked as deleted
        const isDeleted =
          book.status == -1 ||
          book.status === "-1" ||
          book.status === "deleted" ||
          (book.admin_note || "").includes("[DELETED]");

        // Final guard: only books that are BOTH approved and published and NOT samples
        return (isApproved || isPublished) && !isDeleted;
      });

      let activeBooks: any[] = [];
      if (candidateBooks.length > 0) {
        let cardsMap: Record<string, any> = {};
        // Bypassed heavy parallel database requests for legacy cards JSON retrieval to achieve maximum load speeds.

        // Apply metadata and inject card list placeholders to avoid transferring massive card text contents
        activeBooks = candidateBooks
          .map((book: any) => {
            let cardCount = 0;
            const match = (book.admin_note || "").match(/cards_count:([0-9]+)/);
            if (match) {
              cardCount = parseInt(match[1]);
            } else if (cardsMap[book.id]) {
              try {
                const parsed = typeof cardsMap[book.id] === "string"
                  ? JSON.parse(cardsMap[book.id])
                  : cardsMap[book.id];
                cardCount = Array.isArray(parsed) ? parsed.length : 0;
              } catch (e) {}
            } else {
              cardCount = 10; // Default placeholder
            }

            return {
              ...book,
              cards_json: cardsMap[book.id] || Array(cardCount).fill({}),
            };
          })
          .filter((book: any) => {
            // ABNORMAL CARD COUNT PROTECTION
            const count = Array.isArray(book.cards_json) ? book.cards_json.length : 0;
            return count <= 1000;
          });
      }

      if (activeBooks.length === 0) {
        return res.json({ books: [] });
      }

      // Fetch the authors for these books manually to avoid join errors
      const userIds = [
        ...new Set(activeBooks.map((b: any) => b.user_id)),
      ].filter(Boolean);
      let userMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, email, full_name")
          .in("id", userIds);

        if (usersError) {
          console.error(
            "Join users error for marketplace:",
            usersError.message,
          );
        } else {
          userMap = (users || []).reduce((acc: any, user: any) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }

      // Attach user info to books
      const booksWithUsers = activeBooks.map((book: any) => ({
        ...book,
        is_suspended:
          book.status === -2 ||
          book.status === "-2" ||
          book.is_suspended === true ||
          book.is_suspended === 1,
        users: userMap[book.user_id] || { full_name: "Author" },
      }));

      // Cache the successful books with users mapping
      cachedMarketplaceBooks = booksWithUsers;
      lastMarketplaceFetchTime = Date.now();

      res.json({ books: booksWithUsers });
    } catch (err: any) {
      console.error("Marketplace exception:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin Transactions
  app.get("/api/admin/transactions", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabase();

      // 1. Fetch transactions
      const { data: rawTransactions, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (transError) {
        console.error("Admin transactions fetch error:", transError);
        return res.status(500).json({ error: transError.message });
      }

      // BAN DUMMY: filter out test/mock data
      const transactions = (rawTransactions || []).filter((t: any) => {
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

      // 2. Fetch users manually to avoid join issues
      const userIds = [
        ...new Set(transactions.map((t: any) => t.user_id)),
      ].filter(Boolean);
      let userMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, email, full_name")
          .in("id", userIds);

        if (usersError) {
          console.error(
            "Join users error for admin transactions:",
            usersError.message,
          );
        } else {
          userMap = (users || []).reduce((acc: any, user: any) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }

      const transactionsWithUsers = transactions.map((t: any) => ({
        ...t,
        users: userMap[t.user_id] || { email: "Unknown", full_name: "System" },
      }));

      res.json({ transactions: transactionsWithUsers });
    } catch (err: any) {
      console.error("Admin transactions error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public Support Requests (Contact form from /support)
  app.post("/api/public/support", async (req: any, res) => {
    try {
      const { name, email, subject, message, userId } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required." });
      }

      console.log(`[Public Support] New request from ${name} (${email}): ${subject || 'No Subject'}`);

      const adminDb = getSupabaseAdmin();
      const finalSubject = subject || "Contact Form Submission";
      const finalMessage = `Contact Name: ${name}\nContact Email: ${email}\n\nMessage:\n${message}`;

      const { data, error } = await adminDb
        .from("support_requests")
        .insert({
          user_id: userId || null,
          type: "Contact",
          subject: finalSubject,
          message: finalMessage,
          status: "pending"
        })
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      res.json({ success: true, request: data });
    } catch (err: any) {
      console.error("[Public Support] Error:", err);
      res.status(500).json({ error: "Failed to submit support request: " + err.message });
    }
  });

  // Support Requests
  app.post("/api/support/request", authenticateUser, async (req: any, res) => {
    try {
      const { type, subject, message } = req.body;
      const user = req.user;

      if (!type || !subject || !message) {
        return res.status(400).json({ error: "Please fill in all fields." });
      }

      console.log(
        `[Support] New request from ${user.email}: [${type}] ${subject}`,
      );

      const supabase = getSupabase();

      // Try insert with 'type'
      let supportData;
      let { data, error } = await supabase
        .from("support_requests")
        .insert({
          user_id: user.id,
          type: type || "General",
          subject,
          message,
          status: "pending",
        })
        .select()
        .maybeSingle();

      if (error) {
        // Fallback for missing 'type' column
        const isColumnMissing =
          error.message?.includes('column "type" does not exist') ||
          error.code === "42703";
        if (isColumnMissing) {
          const { data: fbData, error: fbErr } = await supabase
            .from("support_requests")
            .insert({
              user_id: user.id,
              subject,
              message: `[Type: ${type || "General"}] ${message}`,
              status: "pending",
            })
            .select()
            .maybeSingle();
          if (fbErr) throw fbErr;
          supportData = fbData;
        } else {
          throw error;
        }
      } else {
        supportData = data;
      }

      // Notify Admins
      try {
        const brevoClient = getBrevo();
        if (brevoClient) {
          const adminEmails = ["samuelchukwuemeke05@gmail.com"];
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: `New Support Request: ${subject}`,
            textContent: `User ${user.email} submitted a ${type || "General"} request.\n\nSubject: ${subject}\nMessage: ${message}`,
            sender: { email: brevoSender, name: "CalmReader System" },
            to: adminEmails.map((e) => ({ email: e })),
          });
        }
      } catch (mailErr) {
        console.error("[Support] Notification failed:", mailErr);
      }

      res.json({ success: true, request: supportData });
    } catch (err: any) {
      const errorPayload = {
        message: err.message || "Unknown server error",
        code: err.code || "unknown",
        details: err.details || null,
        hint: err.hint || null,
      };
      console.error("[Support] Request Handler Exception:", errorPayload);
      res.status(500).json({ error: JSON.stringify(errorPayload, null, 2) });
    }
  });

  // Helper function to log sent email into email_logs table
  async function logEmailToDb(
    recipient_email: string,
    subject: string,
    template_name: string,
    metadata: any = {},
    status: 'sent' | 'failed' | 'queued' = 'sent',
    error_message?: string
  ) {
    try {
      const adminDb = getSupabaseAdmin();
      await adminDb.from('email_logs').insert({
        recipient_email,
        subject,
        template_name,
        metadata: typeof metadata === 'object' ? metadata : { raw: metadata },
        status,
        error_message: error_message || null,
        sent_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[logEmailToDb] Failed to write email log:', err);
    }
  }

  // 1. Email Notification Sending Endpoint
  app.post("/api/notifications/send-email", async (req: any, res) => {
    try {
      const { recipient_email, subject, template_name, metadata, textContent, htmlContent } = req.body;
      if (!recipient_email || !subject) {
        return res.status(400).json({ error: "recipient_email and subject are required." });
      }

      console.log(`[Email Notification API] Sending "${subject}" to ${recipient_email} [template: ${template_name || 'custom'}]`);
      const brevoClient = getBrevo();
      let sentSuccess = false;
      let errorMsg: string | undefined = undefined;

      if (brevoClient) {
        try {
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: subject,
            textContent: textContent || subject,
            htmlContent: htmlContent || undefined,
            sender: { email: brevoSender, name: "CalmReader" },
            to: [{ email: recipient_email }],
          });
          sentSuccess = true;
        } catch (mailErr: any) {
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
    } catch (err: any) {
      console.error("[Email Notification API] Endpoint Exception:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. User Feedback Loop Endpoints
  app.post("/api/user-feedback", async (req: any, res) => {
    try {
      const { type, subject, description, screenshot_url, userId, userEmail } = req.body;
      if (!subject || !description) {
        return res.status(400).json({ error: "Subject and description are required." });
      }

      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb
        .from("user_feedback")
        .insert({
          user_id: userId || null,
          user_email: userEmail || "Anonymous",
          type: type || "general",
          subject,
          description,
          screenshot_url: screenshot_url || null,
          status: "new"
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // Send admin notification via Brevo
      try {
        const brevoClient = getBrevo();
        if (brevoClient) {
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: `New User Feedback [${(type || 'general').toUpperCase()}]: ${subject}`,
            textContent: `From: ${userEmail || 'Anonymous'}\nType: ${type}\nSubject: ${subject}\n\nDescription:\n${description}`,
            sender: { email: brevoSender, name: "CalmReader Feedback System" },
            to: [{ email: "samuelchukwuemeke05@gmail.com" }],
          });
        }
      } catch (e) {
        console.warn("[UserFeedback] Admin email alert failed:", e);
      }

      res.json({ success: true, feedback: data });
    } catch (err: any) {
      console.error("[UserFeedback] Error submitting feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/user-feedback", async (req: any, res) => {
    try {
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb
        .from("user_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json({ success: true, feedback: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/user-feedback/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, admin_response } = req.body;
      const adminDb = getSupabaseAdmin();

      const { data, error } = await adminDb
        .from("user_feedback")
        .update({
          status: status || 'completed',
          admin_response: admin_response || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;
      res.json({ success: true, feedback: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Refund Request System Endpoints
  app.post("/api/refund-requests", async (req: any, res) => {
    try {
      const { transaction_id, reason, user_email, userId } = req.body;
      if (!transaction_id || !reason) {
        return res.status(400).json({ error: "transaction_id and reason are required." });
      }

      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb
        .from("refund_requests")
        .insert({
          user_id: userId || null,
          user_email: user_email || null,
          transaction_id,
          reason,
          status: "pending"
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // Send admin notification email via Brevo
      try {
        const brevoClient = getBrevo();
        if (brevoClient) {
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: `New Refund Request Submitted`,
            textContent: `User: ${user_email || userId}\nTransaction ID: ${transaction_id}\nReason: ${reason}`,
            sender: { email: brevoSender, name: "CalmReader Support" },
            to: [{ email: "samuelchukwuemeke05@gmail.com" }],
          });
        }
      } catch (e) {
        console.warn("[RefundRequest] Admin notification email failed:", e);
      }

      res.json({ success: true, refundRequest: data });
    } catch (err: any) {
      console.error("[RefundRequest] Error creating request:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/refund-requests", async (req: any, res) => {
    try {
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb
        .from("refund_requests")
        .select("*, transactions(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json({ success: true, refundRequests: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/refund-requests/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, admin_note } = req.body; // 'approved' or 'rejected'
      const adminDb = getSupabaseAdmin();

      const { data: request, error: reqErr } = await adminDb
        .from("refund_requests")
        .select("*, transactions(*)")
        .eq("id", id)
        .maybeSingle();

      if (reqErr || !request) {
        return res.status(404).json({ error: "Refund request not found." });
      }

      const { data: updatedReq, error: updateErr } = await adminDb
        .from("refund_requests")
        .update({
          status: status || 'approved',
          admin_note: admin_note || null,
          processed_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (updateErr) throw updateErr;

      // Update related transaction if approved
      if (status === 'approved' && request.transaction_id) {
        await adminDb
          .from("transactions")
          .update({ status: 'refunded' })
          .eq("id", request.transaction_id);
      }

      // Send Brevo Email notification to buyer
      const recipientEmail = request.user_email || request.transactions?.buyer_email;
      if (recipientEmail) {
        const emailSubject = status === 'approved' 
          ? "💳 Refund processed for your purchase"
          : "⚠️ Update regarding your refund request";
        const emailBody = status === 'approved'
          ? `Hello,\n\nYour refund request for transaction #${request.transaction_id} has been APPROVED.\n\nNote: ${admin_note || 'Refund processed successfully.'}\n\nThank you for your patience.\n\nCalmReader Support`
          : `Hello,\n\nYour refund request for transaction #${request.transaction_id} was reviewed and could not be approved at this time.\n\nReason/Note: ${admin_note || 'Does not meet refund requirements.'}\n\nIf you have questions, please contact support.\n\nCalmReader Support`;

        try {
          const brevoClient = getBrevo();
          if (brevoClient) {
            await brevoClient.transactionalEmails.sendTransacEmail({
              subject: emailSubject,
              textContent: emailBody,
              sender: { email: brevoSender, name: "CalmReader Support" },
              to: [{ email: recipientEmail }],
            });
            await logEmailToDb(recipientEmail, emailSubject, "refund_status_update", { refund_id: id, status }, "sent");
          }
        } catch (mailErr: any) {
          console.error("[RefundProcess] Email notification failed:", mailErr);
          await logEmailToDb(recipientEmail, emailSubject, "refund_status_update", { refund_id: id, status }, "failed", mailErr.message);
        }
      }

      res.json({ success: true, refundRequest: updatedReq });
    } catch (err: any) {
      console.error("[RefundProcess] Exception:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Role-Adaptive Analytics API Endpoint (Author, Premium, Affiliate, Reader, Admin)
  const userAnalyticsCache = new Map<string, { timestamp: number; data: any }>();

  const handleUserAnalytics = async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const now = Date.now();
      const cached = userAnalyticsCache.get(userId);

      if (cached && (now - cached.timestamp < 3 * 60 * 1000)) {
        return res.json({ success: true, ...cached.data, cached: true });
      }

      const adminDb = getSupabaseAdmin();

      // 1. Fetch User Profile
      let userProfile: any = null;
      try {
        const { data: uData } = await adminDb
          .from("users")
          .select("id, email, full_name, username, account_tier, referral_code, wallet_balance, is_approved_author, is_author")
          .eq("id", userId)
          .maybeSingle();
        userProfile = uData;
      } catch (uErr) {
        console.warn("[Analytics API] Error fetching user profile:", uErr);
      }

      const accountTier = userProfile?.account_tier || "free";
      const isAuthorUser = accountTier === "author" || accountTier === "admin" || !!userProfile?.is_approved_author || !!userProfile?.is_author;
      const isAffiliateUser = accountTier === "marketing_partner" || accountTier === "mpr" || accountTier === "premium" || accountTier === "admin";

      // 2. Get author's books safely
      let books: any[] = [];
      try {
        let { data: bData, error: booksErr } = await adminDb
          .from("books")
          .select("id, title, price, cover_image, views, conversions, created_at, is_published, status")
          .eq("user_id", userId);

        if (booksErr) {
          const { data: bFallback } = await adminDb
            .from("books")
            .select("id, title, price, cover_image, created_at, is_published, status")
            .eq("user_id", userId);
          if (bFallback) {
            books = bFallback.map(b => ({ ...b, views: 0, conversions: 0 }));
          }
        } else {
          books = bData || [];
        }
      } catch (bCatch) {
        console.warn("[Analytics API] Books query fallback:", bCatch);
      }

      const bookIds = (books || []).map((b) => b.id);

      // 3. Fetch author book transactions
      let transactions: any[] = [];
      if (bookIds.length > 0) {
        try {
          const { data: txs } = await adminDb
            .from("transactions")
            .select("id, amount, created_at, book_id, type, status, buyer_email")
            .in("book_id", bookIds)
            .eq("type", "purchase")
            .eq("status", "successful");

          if (txs) transactions = txs;
        } catch (tErr) {
          console.warn("[Analytics API] Transactions query error:", tErr);
        }
      }

      // 4. Fetch Referral / Affiliate Metrics
      let referralsCount = 0;
      let recentRecruits: any[] = [];
      const refCode = userProfile?.referral_code || userProfile?.username || userId.slice(0, 8);
      
      try {
        const { data: refs } = await adminDb
          .from("users")
          .select("id, email, full_name, username, account_tier, created_at")
          .or(`referred_by.eq.${userId},referred_by.eq.${refCode}`)
          .limit(50);

        if (refs) {
          referralsCount = refs.length;
          recentRecruits = refs;
        }
      } catch (rErr) {
        console.warn("[Analytics API] Referrals query error:", rErr);
      }

      // 5. Fetch Reader Bookshelf count
      let bookshelfCount = 0;
      try {
        const { count } = await adminDb
          .from("bookshelf")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        bookshelfCount = count || 0;
      } catch (bsErr) {
        // Ignore bookshelf error if table does not exist
      }

      // Calculate total author metrics
      const totalSales = transactions.length;
      const totalEarnings = transactions.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
      const totalViews = (books || []).reduce((acc, b) => acc + (Number(b.views) || 0), 0);
      const conversionRate = totalViews > 0 ? ((totalSales / totalViews) * 100).toFixed(1) : "0.0";

      // Calculate current month metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthTxs = transactions.filter((tx) => {
        const d = new Date(tx.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const thisMonthSales = thisMonthTxs.length;
      const thisMonthEarnings = thisMonthTxs.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);

      // Per-book breakdown
      const salesByBook: Record<string, { sales: number; earnings: number }> = {};
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
        const conv = views > 0 ? ((metrics.sales / views) * 100).toFixed(1) : "0.0";
        return {
          ...b,
          salesCount: metrics.sales,
          earningsTotal: metrics.earnings,
          conversionRate: conv,
        };
      });

      const topBooks = [...booksWithMetrics]
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 5);

      const bestSellingBook = topBooks.length > 0 && topBooks[0].salesCount > 0
        ? { title: topBooks[0].title, sales: topBooks[0].salesCount, earnings: topBooks[0].earningsTotal }
        : null;

      // 30 days daily sales trend
      const salesTrend: Record<string, { date: string; sales: number; earnings: number }> = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date();
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

      // Monthly earnings (last 6 months)
      const monthlyEarningsMap: Record<string, { month: string; earnings: number; sales: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
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

      // Views by Book comparison series
      const viewsTrend = (books || [])
        .map((b) => ({
          title: b.title ? (b.title.length > 15 ? b.title.slice(0, 15) + "..." : b.title) : "Untitled",
          views: Number(b.views) || 0,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 8);

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
        affiliateEarnings: (referralsCount * 2000), // Estimated referral earnings benchmark
      };

      userAnalyticsCache.set(userId, { timestamp: now, data: analyticsData });

      res.json({ success: true, ...analyticsData, cached: false });
    } catch (err: any) {
      console.error("[User Analytics API] Exception:", err);
      res.status(500).json({ error: err.message || "Failed to load analytics" });
    }
  };

  app.get("/api/author/analytics", authenticateUser, handleUserAnalytics);
  app.get("/api/analytics/user", authenticateUser, handleUserAnalytics);

  // 5. Book Views Increment Endpoint
  app.post("/api/books/:id/increment-views", async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminDb = getSupabaseAdmin();
      const { data: book } = await adminDb.from("books").select("views").eq("id", id).maybeSingle();
      if (book) {
        const newViews = (book.views || 0) + 1;
        await adminDb.from("books").update({ views: newViews }).eq("id", id);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 6. Admin Email Logs Endpoint
  app.get("/api/admin/email-logs", authenticateAdmin, async (req: any, res) => {
    try {
      const adminDb = getSupabaseAdmin();
      const { data, error } = await adminDb
        .from("email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      res.json({ success: true, logs: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Payment Verification Submission
  app.post("/api/payments/verify", authenticateUser, async (req: any, res) => {
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
        proof_image_url,
      } = req.body;
      const user = req.user;

      if (
        !transaction_type ||
        !amount ||
        !payment_method ||
        !transaction_ref ||
        !proof_image_url
      ) {
        return res
          .status(400)
          .json({ error: "Missing required verification fields." });
      }

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("payment_verifications")
        .insert({
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
          status: "pending",
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // Notify Admins
      try {
        const brevoClient = getBrevo();
        if (brevoClient) {
          const adminEmails = ["samuelchukwuemeke05@gmail.com"];
          await brevoClient.transactionalEmails.sendTransacEmail({
            subject: `New Payment Verification: ${transaction_type}`,
            textContent: `User ${user.email} submitted proof for ${transaction_type}.\nAmount: ${amount}\nMethod: ${payment_method}\nRef: ${transaction_ref}`,
            sender: { email: brevoSender, name: "CalmReader System" },
            to: adminEmails.map((e) => ({ email: e })),
          });
        }
      } catch (mailErr) {
        console.error("[Payment] Notification failed:", mailErr);
      }

      res.json({ success: true, verification: data });
    } catch (err: any) {
      const errorPayload = {
        message: err.message || "Unknown server error",
        code: err.code || "unknown",
        details: err.details || null,
        hint: err.hint || null,
      };
      console.error("[Payment] Request Handler Exception:", errorPayload);
      res.status(500).json({ error: JSON.stringify(errorPayload, null, 2) });
    }
  });

  app.get(
    "/api/user/support-history",
    authenticateUser,
    async (req: any, res) => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("support_requests")
          .select("*")
          .eq("user_id", req.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        res.json({ requests: data });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  app.get(
    "/api/user/payment-history",
    authenticateUser,
    async (req: any, res) => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("payment_verifications")
          .select("*")
          .eq("user_id", req.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        res.json({ verifications: data });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  app.get(
    "/api/admin/support",
    authenticateAdmin,
    async (req: any, res: any) => {
      try {
        const supabase = getSupabaseAdmin();
        console.log("[Admin] Fetching support requests...");
        const { data: requests, error } = await supabase
          .from("support_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "Fetch support requests error details:",
            JSON.stringify(error, null, 2),
          );
          if (error.code === "42P01") {
            return res.json({
              requests: [],
              warning: "Table support_requests is missing.",
            });
          }
          return res.status(500).json({ error: error.message });
        }

        if (!requests || requests.length === 0) {
          return res.json({ requests: [] });
        }

        // Manual join users
        const userIds = [
          ...new Set(requests.map((r: any) => r.user_id)),
        ].filter(Boolean);
        let userMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, email, full_name")
            .in("id", userIds);

          if (usersError) {
            console.error("Fetch users for support error:", usersError);
          } else {
            userMap = (users || []).reduce((acc: any, user: any) => {
              acc[user.id] = user;
              return acc;
            }, {});
          }
        }

        const requestsWithUsers = requests.map((r: any) => ({
          ...r,
          users: userMap[r.user_id] || {
            email: "Unknown",
            full_name: "Deleted User",
          },
        }));

        res.json({ requests: requestsWithUsers });
      } catch (err: any) {
        console.error("[AdminSupport] Critical Error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
      }
    },
  );

  app.post(
    "/api/admin/support/respond",
    authenticateAdmin,
    async (req: any, res) => {
      try {
        const { requestId, response, status } = req.body;
        const admin = req.user;
        const supabase = getSupabase();

        // 1. Update support request
        const { data: request, error: updateError } = await supabase
          .from("support_requests")
          .update({ status: status || "resolved", admin_response: response })
          .eq("id", requestId)
          .select("*")
          .single();

        if (updateError) throw updateError;

        // 2. Fetch user for notification
        const { data: userData } = await supabase
          .from("users")
          .select("email")
          .eq("id", request.user_id)
          .single();
        const userEmail = userData?.email;

        // 3. Audit response
        await supabase.from("admin_responses").insert({
          request_id: requestId,
          admin_id: admin.id,
          response: response,
          status_after: status || "resolved",
        });

        // 4. Notify User
        try {
          const brevoClient = getBrevo();
          if (brevoClient && userEmail) {
            await brevoClient.transactionalEmails.sendTransacEmail({
              subject: `Update on your support request: ${request.subject}`,
              textContent: `Hello,\n\nOur admin has responded to your request:\n\n"${response}"\n\nStatus: ${status || "resolved"}\n\nBest regards,\nCalmReader Team`,
              sender: { email: brevoSender, name: "CalmReader Support" },
              to: [{ email: userEmail }],
            });
          }
        } catch (mailErr) {
          console.error("[Support] User notification failed:", mailErr);
        }

        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  app.get(
    "/api/admin/payment-verifications",
    authenticateAdmin,
    async (req: any, res: any) => {
      try {
        const supabase = getSupabase();
        console.log("[Admin] Fetching payment verifications...");
        const { data, error } = await supabase
          .from("payment_verifications")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "Fetch payment verifications error details:",
            JSON.stringify(error, null, 2),
          );
          if (error.code === "42P01") {
            return res.json({
              verifications: [],
              warning: "Table payment_verifications is missing.",
            });
          }
          return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
          return res.json({ verifications: [] });
        }

        // Manual join users
        const userIds = [...new Set(data.map((v: any) => v.user_id))].filter(
          Boolean,
        );
        let userMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, email, full_name")
            .in("id", userIds);

          if (usersError) {
            console.error("Fetch users for payments error:", usersError);
          } else {
            userMap = (users || []).reduce((acc: any, user: any) => {
              acc[user.id] = user;
              return acc;
            }, {});
          }
        }

        const verificationsWithUsers = data.map((v: any) => ({
          ...v,
          users: userMap[v.user_id] || {
            email: "Unknown",
            full_name: "Deleted User",
          },
        }));

        res.json({ verifications: verificationsWithUsers });
      } catch (err: any) {
        console.error("[AdminPayments] Critical Error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
      }
    },
  );

  app.post(
    "/api/admin/payments/verify/:id/resolve",
    authenticateAdmin,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const { action, note, reference_id, transaction_type, content_id, content_type } = req.body;
        const admin = req.user;
        const supabase = getSupabase();

        const status = action === "approve" ? "approved" : "rejected";

        const updatePayload: any = {
          status,
          admin_note: note,
          approved_by: action === "approve" ? admin.id : null,
          approved_at: action === "approve" ? new Date() : null,
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

        const { data: pv, error: pvErr } = await supabase
          .from("payment_verifications")
          .update(updatePayload)
          .eq("id", id)
          .select("*")
          .single();

        if (pvErr) throw pvErr;

        // Fetch user data for notification and full_name
        const { data: userData } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", pv.user_id)
          .single();

        if (action === "approve") {
          const { data: user } = await supabase
            .from("users")
            .select("email")
            .eq("id", pv.user_id)
            .single();
          if (user) {
            // Logic based on transaction_type
            if (pv.transaction_type === "premium_upgrade") {
              await supabase.rpc("admin_set_user_tier", {
                p_email: user.email,
                p_new_tier: "premium",
              });
            } else if (pv.transaction_type === "author_upgrade") {
              await supabase.rpc("admin_set_user_tier", {
                p_email: user.email,
                p_new_tier: "author",
              });
            } else if (
              pv.transaction_type === "ebook_purchase" &&
              pv.reference_id
            ) {
              await supabase.from("transactions").insert({
                user_id: pv.user_id,
                book_id: pv.reference_id,
                buyer_email: user.email,
                amount: Math.round(pv.amount || 0),
                type: "purchase",
                status: "successful",
                paystack_reference: pv.transaction_ref || `MANUAL-${pv.id}`,
              });

              try {
                const { data: existingEpic } = await supabase
                  .from("ebook_purchases")
                  .select("*")
                  .eq("user_id", pv.user_id)
                  .eq("ebook_id", pv.reference_id)
                  .maybeSingle();

                if (!existingEpic) {
                  await supabase.from("ebook_purchases").insert({
                    user_id: pv.user_id,
                    ebook_id: pv.reference_id
                  });
                  console.log(`[Resolve] safe ebook_purchase record inserted for user ${pv.user_id} and book ${pv.reference_id}`);
                }
              } catch (e: any) {
                console.log("[Resolve] ebook_purchases double-grant safe insert failed:", e.message || e);
              }
            }
          }
        }

        // Notify User
        try {
          const brevoClient = getBrevo();
          if (brevoClient && userData?.email) {
            await brevoClient.transactionalEmails.sendTransacEmail({
              subject: `Payment Verification ${status.toUpperCase()}: ${pv.transaction_type}`,
              textContent: `Hello ${userData.full_name || "Reader"},\n\nYour payment verification for ${pv.transaction_type} has been ${status}.\n\n${note ? `Admin Note: ${note}\n` : ""}\nBest regards,\nCalmReader Team`,
              sender: { email: brevoSender, name: "CalmReader Finance" },
              to: [{ email: userData.email }],
            });
          }
        } catch (mailErr) {
          console.error("[Payment] User notification failed:", mailErr);
        }

        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // Admin: Delete Payment Verification
  app.delete(
    "/api/admin/payments/verify/:id",
    authenticateAdmin,
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const supabase = getSupabase();
        const { error } = await supabase
          .from("payment_verifications")
          .delete()
          .eq("id", id);
        if (error) throw error;
        res.json({ success: true, message: "Verification deleted" });
      } catch (err: any) {
        console.error("Delete verification error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Admin: Bulk Delete Payment Verifications
  app.post(
    "/api/admin/payment-verifications/bulk-delete",
    authenticateAdmin,
    async (req: any, res: any) => {
      try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
          return res.status(400).json({ error: "IDs must be an array" });
        }
        const supabase = getSupabase();
        const { error } = await supabase
          .from("payment_verifications")
          .delete()
          .in("id", ids);
        if (error) throw error;
        res.json({ success: true, message: "Bulk deleted successful" });
      } catch (err: any) {
        console.error("Bulk delete error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Admin Manual eBook & Content Unlock Action
  app.post(
    "/api/admin/books/unlock",
    authenticateAdmin,
    async (req: any, res: any) => {
      try {
        const supabase = getSupabaseAdmin();
        const { userIdentifier, bookId, amount, contentType = "ebook", notes } = req.body;

        if (!userIdentifier || !bookId) {
          return res
            .status(400)
            .json({
              error: "User Identifier (ID or Email) and book/content ID are required",
            });
        }

        const trimmedIdentifier = userIdentifier.trim();

        // Check if userIdentifier is UUID or Email or Username
        let userQuery = supabase.from("users").select("id, email, full_name, username");
        if (trimmedIdentifier.includes("@")) {
          userQuery = userQuery.ilike("email", trimmedIdentifier);
        } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedIdentifier)) {
          userQuery = userQuery.eq("id", trimmedIdentifier);
        } else {
          userQuery = userQuery.ilike("username", trimmedIdentifier);
        }

        let { data: userData, error: userError } = await userQuery.maybeSingle();
        
        // Fallback: If not found, try raw email query or user_profiles_public
        if (!userData) {
          const { data: fallbackUser } = await supabase
            .from("user_profiles_public")
            .select("id, email, full_name, username")
            .or(`email.ilike.${trimmedIdentifier},id.eq.${trimmedIdentifier}`)
            .maybeSingle();
          if (fallbackUser) {
            userData = fallbackUser;
          }
        }

        if (!userData) {
          return res
            .status(404)
            .json({
              error:
                "User not found. Check if the provided Email or ID is accurate.",
            });
        }

        const isGeneralTrivia = bookId === "general";
        let bookData: any = { id: bookId, title: "General Knowledge Trivia", price: 0 };

        if (!isGeneralTrivia) {
          const { data: bData, error: bookError } = await supabase
            .from("books")
            .select("id, title, price, pdf_price, cards_json")
            .eq("id", bookId)
            .maybeSingle();
          if (bookError || !bData) {
            return res.status(404).json({ error: "Book not found." });
          }
          bookData = bData;
        }

        const saleAmount =
          amount !== undefined && amount !== ""
            ? parseInt(amount)
            : (bookData.price || 0);

        const targetBookId = isGeneralTrivia ? null : bookId;
        const refSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();

        // 1. EBOOK UNLOCK (Purchase transaction + ebook_purchases)
        if (contentType === "ebook" || contentType === "all") {
          const { data: existingTx } = await supabase
            .from("transactions")
            .select("id")
            .eq("user_id", userData.id)
            .eq("book_id", targetBookId)
            .eq("type", "purchase")
            .eq("status", "successful")
            .maybeSingle();

          if (!existingTx && targetBookId) {
            await supabase.from("transactions").insert({
              user_id: userData.id,
              book_id: targetBookId,
              buyer_email: userData.email,
              amount: Math.round(saleAmount),
              type: "purchase",
              status: "successful",
              paystack_reference: `MANUAL-ADMIN-EBOOK-${refSuffix}`,
            });
          }

          if (targetBookId) {
            try {
              const { data: existingEpic } = await supabase
                .from("ebook_purchases")
                .select("*")
                .eq("user_id", userData.id)
                .eq("ebook_id", targetBookId)
                .maybeSingle();

              if (!existingEpic) {
                await supabase.from("ebook_purchases").insert({
                  user_id: userData.id,
                  ebook_id: targetBookId
                });
              }
            } catch (epicErr) {
              console.warn("[ManualUnlock] ebook_purchases insert fallback handled:", epicErr);
            }
          }
        }

        // 2. TRIVIA UNLOCK (trivia_access transaction + reading progress completion)
        if (contentType === "trivia" || contentType === "all") {
          await supabase.from("transactions").insert({
            user_id: userData.id,
            book_id: targetBookId,
            buyer_email: userData.email,
            amount: 0,
            type: "trivia_access",
            status: "successful",
            paystack_reference: `MANUAL-ADMIN-TRIVIA-${refSuffix}`,
          });

          // Mark reading progress to complete so trivia verification passes instantly
          if (targetBookId) {
            try {
              const totalCards = Array.isArray(bookData.cards_json) ? bookData.cards_json.length : 10;
              await supabase.from("reading_progress").upsert({
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

        // 3. PDF UNLOCK (pdf_purchase transaction)
        if (contentType === "pdf" || contentType === "all") {
          if (targetBookId) {
            await supabase.from("transactions").insert({
              user_id: userData.id,
              book_id: targetBookId,
              buyer_email: userData.email,
              amount: 0,
              type: "pdf_purchase",
              status: "successful",
              paystack_reference: `MANUAL-ADMIN-PDF-${refSuffix}`,
            });
          }
        }

        // Notify User via Brevo
        try {
          const brevoClient = getBrevo();
          if (brevoClient && userData.email) {
            const contentTypeName = contentType === "all" ? "Full eBook & Trivia Access" : contentType === "trivia" ? "Trivia Challenge Access" : contentType === "pdf" ? "PDF Download Access" : "eBook Reading Access";
            await brevoClient.transactionalEmails.sendTransacEmail({
              subject: `Content Access Unlocked: ${bookData.title}`,
              textContent: `Hello ${userData.full_name || "Reader"},\n\nAn administrator has manually unlocked ${contentTypeName} for "${bookData.title}" on your account.\n\nYou can now access this content anytime by logging into your CalmReader dashboard.\n\nEnjoy reading!\n\nBest regards,\nCalmReader Team`,
              sender: { email: brevoSender, name: "CalmReader Support" },
              to: [{ email: userData.email }],
            });
          }
        } catch (mailErr) {
          console.error(
            "[ManualUnlock] User email notification failed:",
            mailErr,
          );
        }

        res.json({
          success: true,
          message: `Successfully unlocked "${bookData.title}" (${contentType.toUpperCase()}) for user ${userData.email}!`,
        });
      } catch (err: any) {
        console.error("[AdminUnlock] Error manual unlock:", err);
        res
          .status(500)
          .json({ error: err.message || "Failed to manually unlock content" });
      }
    },
  );

  // Admin Reassign Book to Author
  app.post(
    "/api/admin/books/reassign-author",
    authenticateAdmin,
    async (req: any, res: any) => {
      try {
        const supabase = getSupabaseAdmin();
        const { bookId, newAuthorUserId, authorPenName } = req.body;

        if (!bookId || !newAuthorUserId) {
          return res.status(400).json({ error: "Both bookId and newAuthorUserId are required" });
        }

        // 1. Fetch book
        const { data: book, error: bookErr } = await supabase
          .from("books")
          .select("id, title, user_id, admin_note")
          .eq("id", bookId)
          .maybeSingle();

        if (bookErr || !book) {
          return res.status(404).json({ error: "Book not found" });
        }

        // 2. Fetch new author profile
        const { data: authorUser, error: userErr } = await supabase
          .from("users")
          .select("id, email, full_name, username, account_tier")
          .eq("id", newAuthorUserId)
          .maybeSingle();

        if (userErr || !authorUser) {
          return res.status(404).json({ error: "Selected author user profile not found" });
        }

        const authorDisplayName = authorPenName?.trim() || authorUser.full_name || authorUser.username || authorUser.email.split('@')[0];

        // 3. Update admin_note with new author name if note exists
        let updatedAdminNote = book.admin_note || "";
        if (updatedAdminNote.includes("author:")) {
          updatedAdminNote = updatedAdminNote.replace(/author:[^,]+/, `author:${authorDisplayName}`);
        } else if (updatedAdminNote) {
          updatedAdminNote += `,author:${authorDisplayName}`;
        } else {
          updatedAdminNote = `author:${authorDisplayName}`;
        }

        const { data: updatedBook, error: updateErr } = await supabase
          .from("books")
          .update({
            user_id: authorUser.id,
            admin_note: updatedAdminNote
          })
          .eq("id", bookId)
          .select("id, title, user_id, admin_note")
          .single();

        if (updateErr) throw updateErr;

        res.json({
          success: true,
          message: `Book "${book.title}" successfully reassigned to author ${authorDisplayName} (${authorUser.email})!`,
          book: {
            ...updatedBook,
            author_name: authorDisplayName
          }
        });
      } catch (err: any) {
        console.error("[ReassignAuthor] Error:", err);
        res.status(500).json({ error: err.message || "Failed to reassign book author" });
      }
    }
  );

  // Admin Registered Authors List
  app.get("/api/admin/authors", authenticateAdmin, async (req: any, res: any) => {
    try {
      const supabase = getSupabaseAdmin();
      const { data: authors, error } = await supabase
        .from("users")
        .select("id, email, full_name, username, account_tier, is_approved_author, is_author")
        .order("full_name", { ascending: true });

      if (error) throw error;
      res.json({ authors: authors || [] });
    } catch (err: any) {
      console.error("[AdminAuthors] Error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch authors list" });
    }
  });

  // Admin Announcements
  app.get("/api/admin/announcements", authenticateAdmin, async (req, res) => {
    try {
      const supabase = getSupabase();
      const { data: announcements, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

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
    async (req: any, res) => {
      try {
        const { content, title, type } = req.body;
        const user = req.user;
        const supabase = getSupabase();

        const { data, error } = await supabase
          .from("posts")
          .insert({
            title: title || "Announcement",
            content,
            type: type || "announcement",
            admin_id: user.id,
            is_active: true,
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, announcement: data });
      } catch (err) {
        console.error("Admin announcement create error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post("/api/admin/reports", authenticateAdmin, async (req, res) => {
    try {
      const { reportId, action } = req.body;
      const status = action === "dismiss" ? "dismissed" : "resolved";

      const supabase = getSupabase();
      const { error } = await supabase
        .from("reported_content")
        .update({ status })
        .eq("id", reportId);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      console.error("Admin report action error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- TRIVIA SYSTEM (PUBLIC) ---
  app.get("/api/trivia-promos", async (req: any, res: any) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      const supabase = getSupabase();
      
      const getFallbackPromos = () => {
        return [];
      };

      if (!supabase || supabase.__isDummy) {
        return res.json({ promos: [] });
      }

      const { data, error } = await supabase
        .from("trivia_promos")
        .select("*")
        .eq("is_active", true)
        .gt("end_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (error) {
        console.warn("[Trivia Promo] Failed to fetch from DB:", error.message);
        return res.json({ promos: [] });
      }

      if (!data || data.length === 0) {
        return res.json({ promos: [] });
      }

      res.json({ promos: data });
    } catch (err: any) {
      console.error("[Trivia Promo] Error:", err);
      res.json({ promos: [] });
    }
  });

  app.get("/api/trivias/public", async (req: any, res: any) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      const supabase = getSupabase();

      if (supabase.__isDummy) {
        return res.json({ trivias: [], warning: "Database not configured" });
      }

      // 1. Attempt to fetch active sessions from 'trivias' table
      let rawTrivias: any[] = [];
      let tableExists = true;
      const nowIso = new Date().toISOString();

      try {
        const { data, error } = await supabase
          .from("trivias")
          .select("*")
          .eq("status", "active")
          .or(`expiry_at.is.null,expiry_at.gt.${nowIso}`);

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

      // 2. Fetch active questions from "trivia_questions" safely
      let questions: any[] = [];
      try {
        const { data, error: qErr } = await supabase
          .from("trivia_questions")
          .select("*")
          .eq("is_active", true);

        if (qErr) {
          console.warn("[Trivias Public API] Failed to fetch questions from DB:", qErr.message);
        } else {
          questions = data || [];
        }
      } catch (err: any) {
        console.warn("[Trivias Public API] Error querying 'trivia_questions' table safely:", err.message || err);
      }

      // Group questions by ebook_id
      const questionCounts: { [key: string]: number } = {};
      questions.forEach((q: any) => {
        const key = q.ebook_id || "general";
        questionCounts[key] = (questionCounts[key] || 0) + 1;
      });

      // 3. Fetch books safely
      let books: any[] = [];
      try {
        const { data, error: bErr } = await supabase
          .from("books")
          .select("id, title, cover_image, status, price, is_published, admin_note");
        
        if (bErr) {
          console.warn("[Trivias Public API] Failed to fetch books from DB:", bErr.message);
        } else {
          books = data || [];
        }
      } catch (err: any) {
        console.warn("[Trivias Public API] Error querying 'books' table safely:", err.message || err);
      }

      const booksMap = new Map<string, any>(books.map((b: any) => [b.id, b]));

      // 4. Construct response list
      const formatted: any[] = [];
      const coveredKeys = new Set<string>();

      const ghostTitles = ["SAMPLE", "TEST", "DUMMY", "DELETED", "[DELETED]"];

      // Process rawTrivias from 'trivias' table first if they exist
      if (tableExists && rawTrivias.length > 0) {
        for (const session of rawTrivias) {
          const isGeneral = !session.book_id;
          const key = session.book_id || "general";
          const qCount = questionCounts[key] || 0;

          // Skip if no active questions
          if (qCount === 0) continue;

          // Skip ghost titles
          const tTitle = (session.title || "").toUpperCase();
          if (ghostTitles.some((gt) => tTitle.includes(gt))) continue;

          const book = session.book_id ? booksMap.get(session.book_id) : null;
          if (book) {
            // Book must be published
            const isPublished = book.is_published === true || book.is_published === 1 || book.is_published === "true" || book.is_published === "1";
            if (book.status !== 1 || !isPublished) continue;
          }

          formatted.push({
            ...session,
            id: session.book_id || "general",
            cover_image: session.thumbnail_url || book?.cover_image || "",
            thumbnail_url: session.thumbnail_url || book?.cover_image || "",
            price: isGeneral ? 0 : (session.price !== undefined && session.price !== null ? session.price : (book?.price || 0)),
            book_title: isGeneral ? "General Knowledge" : (book?.title || session.title),
            isGeneral,
          });
          coveredKeys.add(key);
        }
      }

      // Fallback/Dynamic Merging has been disabled to prevent deleted or non-active trivias from appearing.
      res.json({ trivias: formatted });
    } catch (err: any) {
      console.error("[Trivia] Public fetch error:", err);
      res.json({
        trivias: [],
        error: "Failed to fetch public trivias gracefully",
      });
    }
  });

  // --- TRIVIA SYSTEM (EBOOK-LINKED) ---

  // Get all trivias available (mixed eBook and General)
  app.get("/api/trivias", authenticateUser, async (req: any, res: any) => {
    try {
      const supabase = getSupabase();
      if (supabase.__isDummy) {
        return res.json({ trivias: [], message: "Database not connected." });
      }

      // 1. Get all active sessions from the trivias table
      // Robust query in memory to support status = 'active' OR is_active = true
      const now = new Date();
      let activeSessions: any[] = [];
      let tableExists = true;
      try {
        const { data, error: sError } = await supabase
          .from("trivias")
          .select("*");

        if (sError) {
          console.error(
            "[Trivias] Hub sessions fetch error:",
            JSON.stringify(sError, null, 2),
          );
          if (sError.code === "42P01") {
            tableExists = false;
          } else {
            throw sError;
          }
        } else {
          activeSessions = (data || []).filter((s: any) => {
            const isActive = s.status === "active" || s.is_active === true || s.is_active === 1 || String(s.is_active) === "true";
            const notExpired = !s.expiry_at || new Date(s.expiry_at) > now;
            return isActive && notExpired;
          });
        }
      } catch (err: any) {
        console.warn("[Trivias API] Error querying 'trivias' table, falling back:", err.message || err);
        tableExists = false;
      }

      // Fetch active questions count safely
      let questions: any[] = [];
      try {
        const { data, error: qError } = await supabase
          .from("trivia_questions")
          .select("ebook_id")
          .eq("is_active", true);
        if (qError) {
          console.warn("[Trivias API] Failed to fetch active questions:", qError.message);
        } else {
          questions = data || [];
        }
      } catch (err: any) {
        console.warn("[Trivias API] Error querying 'trivia_questions' table safely:", err.message || err);
      }

      const questionCounts: { [key: string]: number } = {};
      let generalQuestionCount = 0;
      questions.forEach((q) => {
        if (q.ebook_id) {
          questionCounts[q.ebook_id] = (questionCounts[q.ebook_id] || 0) + 1;
        } else {
          generalQuestionCount++;
        }
      });

      // Keep active trivia sessions from 'trivias' table, or if they have questions
      const verifiedSessions = (activeSessions || []);

      // 2. Fetch linked eBooks details safely with categories and genre_id
      const bookIds = verifiedSessions.map((s) => s.book_id).filter(Boolean);
      let books: any[] = [];
      try {
        const { data: bookData, error: bError } = await supabase
          .from("books")
          .select("id, title, cover_image, status, price, cards_json, genre_id, admin_note");
        if (bError) {
          console.warn("[Trivias API] Failed to fetch books details:", bError.message);
        } else {
          books = bookData || [];
        }
      } catch (err: any) {
        console.warn("[Trivias API] Error querying 'books' table safely:", err.message || err);
      }

      // Fetch all genres to resolve category names
      let genres: any[] = [];
      try {
        const { data: gData } = await supabase.from("genres").select("id, name");
        genres = gData || [];
      } catch (err) {
        console.warn("[Trivias API] Failed to fetch genres:", err);
      }

      // 3. User Specific Stats
      const userId = req.profile?.id;
      let purchasedBookIds = new Set<string>();
      let attemptedIds = new Set<string>(); // can be uuid or 'general'

      if (userId) {
        // Purchases with fallback
        let purchasedBookIdsArray: any[] = [];
        try {
          const { data: pData, error: pError } = await supabase
            .from("ebook_purchases")
            .select("ebook_id")
            .eq("user_id", userId);
          if (pError) throw pError;
          purchasedBookIdsArray = (pData || []).map((p) => p.ebook_id);
        } catch (dbErr) {
          console.log("[Trivias API] Using transactions table fallback.");
          try {
            const { data: txData } = await supabase
              .from("transactions")
              .select("book_id")
              .eq("user_id", userId)
              .eq("status", "successful")
              .eq("type", "purchase");
            purchasedBookIdsArray = (txData || []).map((tx) => tx.book_id).filter(Boolean);
          } catch (txErr) {
            console.error("[Trivias API] Transactions check also failed:", txErr);
          }
        }
        purchasedBookIds = new Set(purchasedBookIdsArray);

        // Participation tracking (mapping null to 'general' for our frontend/Set)
        const { data: aData } = await supabase
          .from("daily_trivia_attempts")
          .select("ebook_id")
          .eq("user_id", userId);
        attemptedIds = new Set(
          (aData || []).map((a) => a.ebook_id || "general"),
        );
      }

      // 3.5 Fetch User reading progress for all books
      const progressMap = new Map<string, { card_index: number; completed: boolean; progress: number }>();
      if (userId) {
        try {
          const { data: progressData } = await supabase
            .from("reading_progress")
            .select("book_id, card_index, completed, progress")
            .eq("user_id", userId);
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

      // 4. Merge results
      const formattedTrivias = verifiedSessions.map((session) => {
        const book = books.find((b) => b.id === session.book_id);
        const isGeneral = !session.book_id;

        // Access logic: General is always free, eBooks depend on price/purchase
        const hasAccess =
          isGeneral || !book?.price || book?.price === 0 || purchasedBookIds.has(session.book_id);
        const alreadyAttempted = attemptedIds.has(session.book_id || "general");

        // Compute if reading is finished:
        const totalCards = (book && Array.isArray(book.cards_json)) ? book.cards_json.length : 0;
        const pRecord = book ? progressMap.get(book.id) : null;
        const cardIndex = pRecord ? pRecord.card_index : 0;
        const hasDbCompleted = pRecord ? (pRecord.completed || pRecord.progress >= 90) : false;
        const readingCompleted = isGeneral || totalCards === 0 || hasDbCompleted || cardIndex >= totalCards - 1;

        // Custom price fallback: use session price if explicitly set, else book price
        const actualPrice = session.price !== undefined && session.price !== null ? session.price : (isGeneral ? 0 : (book?.price || 0));
        const ruleTargetTier = session.target_tier || 'all';
        const userAccountTier = req.profile?.account_tier || 'free';
        
        // If a trivia is premium (price > 0) or explicitly restricted to premium accounts, then "free" users on the platform cannot access it
        const isLockedForTier = (ruleTargetTier === 'premium' || actualPrice > 0) && userAccountTier === 'free';

        // Resolve category
        const genreObj = book ? genres.find(g => String(g.id) === String(book.genre_id)) : null;
        const bookGenreName = genreObj ? genreObj.name : (book?.admin_note?.includes('genre:') ? book.admin_note.split('genre:')[1].split(',')[0] : '');
        const targetCategory = session.target_category || 'all';
        const category = targetCategory !== 'all' ? targetCategory : (bookGenreName || (isGeneral ? "General Knowledge" : "General"));

        return {
          id: session.book_id || "general",
          session_id: session.id,
          title:
            session.title ||
            (isGeneral ? "General Knowledge Challenge" : book?.title),
          description:
            session.description || (isGeneral ? "Mixed topic questions." : ""),
          cover_image: session.thumbnail_url || book?.cover_image || "",
          thumbnail_url: session.thumbnail_url || book?.cover_image || "",
          reward_points: session.reward_points,
          price: actualPrice,
          target_tier: ruleTargetTier,
          target_category: targetCategory,
          category: category,
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

      const coveredKeys = new Set<string>(verifiedSessions.map(s => s.book_id || "general"));

      // Fallback/Dynamic Merging: scan all question keys
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
            created_at: new Date().toISOString(),
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

          // Filter: book must be published and status = 1
          const isPublished = book.is_published === true || book.is_published === 1 || book.is_published === "true" || book.is_published === "1";
          if (book.status !== 1 || !isPublished) continue;

          const hasAccess = !book.price || book.price === 0 || purchasedBookIds.has(key);
          const alreadyAttempted = attemptedIds.has(key);
          const totalCards = Array.isArray(book.cards_json) ? book.cards_json.length : 0;
          const pRecord = progressMap.get(book.id);
          const cardIndex = pRecord ? pRecord.card_index : 0;
          const hasDbCompleted = pRecord ? (pRecord.completed || pRecord.progress >= 90) : false;
          const readingCompleted = totalCards === 0 || hasDbCompleted || cardIndex >= totalCards - 1;
          const actualPrice = book.price || 200;
          const userAccountTier = req.profile?.account_tier || 'free';
          const isLockedForTier = actualPrice > 0 && userAccountTier === 'free';

          // Resolve category
          const genreObj = genres.find(g => String(g.id) === String(book.genre_id));
          const bookGenreName = genreObj ? genreObj.name : (book.admin_note?.includes('genre:') ? book.admin_note.split('genre:')[1].split(',')[0] : '');
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
            category: category,
            promotional_writeup: "",
            expiry_at: null,
            created_at: new Date().toISOString(),
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
    } catch (err: any) {
      console.error("[Trivias] Hub fetch error:", err);
      res.status(500).json({ error: "Failed to fetch trivia hub." });
    }
  });

  // Get questions for a specific eBook trivia session
  // Get questions for a specific eBook trivia session
  app.get(
    "/api/trivias/ebook/:ebookId",
    authenticateUser,
    async (req: any, res: any) => {
      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const supabase = getSupabase();

        // 0. Fetch trivia session settings to check tier access, and prevent unauthorized play
        let triviaSession: any = null;
        try {
          let queryTriviaSession = supabase
            .from("trivias")
            .select("id, reward_points, duration_seconds, description, price, target_tier, type, status, is_active, expires_at");
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
          account_tier: req.profile?.account_tier || 'free',
          is_admin: req.profile?.is_admin === true,
        };
        const isAdminUser = checkIsAdmin(userWithRole);

        let book: any = null;
        if (!isGeneral) {
          // 1. Verify Book Access
          const { data: bookData } = await supabase
            .from("books")
            .select("id, title, price, status, admin_note, cards_json")
            .eq("id", ebookId)
            .neq("status", -1)
            .not("status", "eq", "-1")
            .not("admin_note", "ilike", "%[DELETED]%")
            .single();
          if (!bookData) return res.status(404).json({ error: "Book not found" });
          book = bookData;

          let hasPurchase = false;
          if (isAdminUser) {
            hasPurchase = true;
          } else {
            try {
              const { data: purchase, error: pError } = await supabase
                .from("ebook_purchases")
                .select("id")
                .eq("ebook_id", ebookId)
                .eq("user_id", req.profile?.id)
                .maybeSingle();
              if (!pError && purchase) hasPurchase = true;
            } catch (dbErr) {
              console.log("[Trivias Play API] Using transactions table fallback.");
            }

            if (!hasPurchase) {
              try {
                const { data: tx } = await supabase
                  .from("transactions")
                  .select("id")
                  .eq("book_id", ebookId)
                  .eq("user_id", req.profile?.id)
                  .eq("status", "successful")
                  .eq("type", "purchase")
                  .maybeSingle();
                if (tx) hasPurchase = true;
              } catch (txErr) {
                console.error("[Trivias Play API] Fallback transactions check failed:", txErr);
              }
            }
          }

          // Check reading progress
          let hasCompletedReading = false;
          const totalCards = Array.isArray(book.cards_json) ? book.cards_json.length : 0;
          if (isAdminUser || totalCards === 0) {
            hasCompletedReading = true;
          } else {
            const { data: progress } = await supabase
              .from("reading_progress")
              .select("card_index, completed")
              .eq("user_id", req.profile?.id)
              .eq("book_id", ebookId)
              .maybeSingle();

            const cardIndex = progress ? progress.card_index : 0;
            hasCompletedReading = progress?.completed === true || (totalCards > 0 && cardIndex >= totalCards - 1);
          }

          // Authoritative canPlayTrivia check (Marketing vs Reader-Reward)
          const eligibility = canPlayTrivia(userWithRole, triviaSession || { type: 'marketing', is_active: true }, {
            hasPurchasedBook: hasPurchase || !book.price || book.price === 0,
            hasCompletedReading: hasCompletedReading,
          });

          if (!eligibility.eligible) {
            return res.status(403).json({ error: eligibility.message });
          }
        } else {
          const eligibility = canPlayTrivia(userWithRole, triviaSession || { type: 'marketing', is_active: true });
          if (!eligibility.eligible) {
            return res.status(403).json({ error: eligibility.message });
          }
        }

        // 3. Fetch Questions (Prefer from central Vault, randomly)
        let questions: any[] = [];
        let fetchedFromVault = false;
        try {
          const { data: vaultQuestions, error: vaultErr } = await supabase
            .from("vault")
            .select("*")
            .eq("type", "trivia_question");
          
          if (!vaultErr && vaultQuestions && vaultQuestions.length > 0) {
            // Pick randomly (shuffle and take up to 5)
            const shuffled = [...vaultQuestions].sort(() => 0.5 - Math.random());
            const selectedVault = shuffled.slice(0, 5);
            
            questions = selectedVault.map((q, index) => ({
              id: q.id,
              ebook_id: dbId,
              question_text: q.content?.question || q.title || '',
              option_a: q.content?.options?.[0] || q.content?.option_a || '',
              option_b: q.content?.options?.[1] || q.content?.option_b || '',
              option_c: q.content?.options?.[2] || q.content?.option_c || '',
              option_d: q.content?.options?.[3] || q.content?.option_d || '',
              correct_answer: q.content?.correct_answer || q.content?.correct || '',
              explanation: q.content?.explanation || 'Correct answer: ' + (q.content?.correct_answer || ''),
              order_number: index + 1,
              is_active: true,
              is_from_vault: true
            }));
            fetchedFromVault = true;
          }
        } catch (vaultCatchErr) {
          console.log("[Trivias] Vault table reading bypassed or not active:", vaultCatchErr);
        }

        // Fallback to standard trivia questions if vault has none
        if (!fetchedFromVault || questions.length === 0) {
          const { data: fallbackQuestions, error: standardErr } = await supabase
            .from("trivia_questions")
            .select("*")
            .eq("ebook_id", dbId)
            .eq("is_active", true)
            .order("order_number", { ascending: true });

          if (standardErr) throw standardErr;
          questions = fallbackQuestions || [];
        }

        const totalQuestionsCount = questions ? questions.length : 0;

        // 2. Check Participation Limit (Fraud Prevention - Session cannot be replayed)
        let queryAttempt = supabase
          .from("daily_trivia_attempts")
          .select("id, score, completed")
          .eq("user_id", req.profile?.id);
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
            return res
              .status(403)
              .json({
                error:
                  "Attempt already recorded. You can only participate in this trivia once to prevent fraudulent activities.",
              });
          } else {
            // This is a RESUME session! Let's count how many questions this user has answered so far.
            isResume = true;
            resumeScore = attempt.score || 0;

            const qIds = (questions || []).map((q) => q.id);
            if (qIds.length > 0) {
              const { data: ansList } = await supabase
                .from("user_trivia_attempts")
                .select("trivia_question_id")
                .eq("user_id", req.profile?.id)
                .in("trivia_question_id", qIds);

              const ansIds = new Set((ansList || []).map(a => a.trivia_question_id));
              const answeredCount = (questions || []).filter(q => ansIds.has(q.id)).length;
              resumeIndex = answeredCount;
            }
          }
        } else {
          // No attempt yet: insert an In-Progress attempt so they are locked-in !
          const { error: insErr } = await supabase.from("daily_trivia_attempts").insert({
            user_id: req.profile?.id,
            ebook_id: dbId,
            score: 0,
            total_questions: totalQuestionsCount,
            completed: false,
            won: false,
            attempt_date: new Date().toISOString().split("T")[0],
          });
          if (insErr) {
            console.error("[Trivia Play Index] Failed to initialize daily attempt tracker:", insErr);
          }
        }

        // 5. Query winner & compensation tracker statistics for payouts
        let queryPrev = supabase
          .from("daily_trivia_attempts")
          .select("id, score, total_questions");
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
          const rate = attempt.score / (attempt.total_questions || 5);
          if (rate >= 0.989) {
            trueWinnersCount++;
          } else if (rate >= 0.8) {
            compensatedCount++;
          }
        }

        res.json({
          questions: questions || [],
          book_title: isGeneral ? "General Knowledge Trivia" : (book ? book.title : "Trivia Challenge"),
          reward_points: triviaSession?.reward_points ?? 100,
          duration_seconds: triviaSession?.duration_seconds ?? 0, // default 00s per question
          description:
            triviaSession?.description ??
            (isGeneral
              ? "Mixed topic challenge for everyone."
              : `Test your master knowledge of ${book ? book.title : 'the book'}.`),
          true_winners_count: trueWinnersCount,
          compensated_winners_count: compensatedCount,
          payout_pool_exhausted: trueWinnersCount >= 1 && compensatedCount >= 4,
          is_resume: isResume,
          resume_index: resumeIndex,
          resume_score: resumeScore,
        });
      } catch (err: any) {
        console.error("[Trivia Load] Error:", err);
        res.status(500).json({ error: "Failed to load trivia session." });
      }
    },
  );

  // Incremental on-the-fly Answer Logger
  app.post(
    "/api/trivias/ebook/:ebookId/answer",
    authenticateUser,
    async (req: any, res: any) => {
      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const { question_id, selected_answer, is_correct } = req.body;
        const supabase = getSupabase();

        // Check active in-progress session
        let queryAttempt = supabase
          .from("daily_trivia_attempts")
          .select("id, completed, score")
          .eq("user_id", req.profile?.id);
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

        // Detect if this specific question has already been answered
        const { data: existingAns } = await supabase
          .from("user_trivia_attempts")
          .select("id")
          .eq("user_id", req.profile?.id)
          .eq("trivia_question_id", question_id)
          .maybeSingle();

        if (existingAns) {
          return res.json({ success: true, message: "Response already recorded previously." });
        }

        // Save progress details
        const { error: insErr } = await supabase.from("user_trivia_attempts").insert({
          user_id: req.profile?.id,
          trivia_question_id: question_id,
          is_correct: !!is_correct,
        });
        if (insErr) throw insErr;

        // If choice is correct, update on-the-fly in-progress score
        if (is_correct) {
          const newScore = (attempt.score || 0) + 1;
          await supabase
            .from("daily_trivia_attempts")
            .update({ score: newScore })
            .eq("id", attempt.id);
        }

        res.json({ success: true });
      } catch (err: any) {
        console.error("[Trivia Answer API] Error:", err);
        res.status(500).json({ error: "Failed to log granular answer." });
      }
    }
  );

  // Submit Trivia Answers
  // Submit Trivia Answers
  app.post(
    "/api/trivias/ebook/:ebookId/complete",
    authenticateUser,
    async (req: any, res: any) => {
      console.log(
        `[Trivia Submit] Attempt by ${req.user.email} for book ${req.params.ebookId}`,
      );
      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const { results } = req.body; // Array of { question_id, selected_answer, is_correct }
        const supabase = getSupabase();

        if (req.profile?.is_admin) {
          return res
            .status(403)
            .json({
              error:
                "Admins/CEO cannot participate in trivia for rewards to maintain ecosystem integrity.",
            });
        }

        if (!results || !Array.isArray(results)) {
          return res.status(400).json({ error: "Invalid submission data" });
        }

        // 1. SECURITY AUDIT - VERIFY BOOK ACCESS (Reader-Reward Only)
        if (!isGeneral) {
          let triviaType = "marketing";
          try {
            const { data: tSession } = await supabase
              .from("trivias")
              .select("type")
              .eq("book_id", ebookId)
              .maybeSingle();
            if (tSession?.type) triviaType = tSession.type;
          } catch (_) {}

          if (triviaType === "reader_reward") {
            const { data: book } = await supabase
              .from("books")
              .select("id, title, price, status, admin_note")
              .eq("id", ebookId)
              .neq("status", -1)
              .not("status", "eq", "-1")
              .not("admin_note", "ilike", "%[DELETED]%")
              .single();
            if (!book) return res.status(404).json({ error: "Book not found" });

            let hasPurchase = false;
            try {
              const { data: purchase, error: pError } = await supabase
                .from("ebook_purchases")
                .select("id")
                .eq("ebook_id", ebookId)
                .eq("user_id", req.profile?.id)
                .maybeSingle();
              if (!pError && purchase) hasPurchase = true;
            } catch (dbErr) {
              console.log("[Trivias Play API] Using transactions table fallback.");
            }

            if (!hasPurchase) {
              try {
                const { data: tx } = await supabase
                  .from("transactions")
                  .select("id")
                  .eq("book_id", ebookId)
                  .eq("user_id", req.profile?.id)
                  .eq("status", "successful")
                  .eq("type", "purchase")
                  .maybeSingle();
                if (tx) hasPurchase = true;
              } catch (txErr) {
                console.error("[Trivias Play API] Fallback transactions check failed:", txErr);
              }
            }

            const isFree = !book.price || book.price === 0;
            if (!isFree && !hasPurchase) {
              return res
                .status(403)
                .json({ error: "You must own this eBook to submit answers for Reader-Reward trivia." });
            }
          }
        }

        // 2. SECURITY AUDIT - SERVER-SIDE SCORE & ANSWERS VERIFICATION
        const qQuery = isGeneral
          ? supabase.from("trivia_questions").select("id, correct_answer").is("ebook_id", null).eq("is_active", true)
          : supabase.from("trivia_questions").select("id, correct_answer").eq("ebook_id", dbId).eq("is_active", true);

        const { data: dbQuestions, error: qErr } = await qQuery;
        if (qErr) {
          console.error("[Trivia Validation] Failed to fetch key answers:", qErr);
          throw qErr;
        }

        const answersMap = new Map();
        if (dbQuestions) {
          dbQuestions.forEach((q) => {
            answersMap.set(q.id, q.correct_answer);
          });
        }

        // Incremental save of any remaining provided answers before final check
        const providedAnswers = results || [];
        for (const ans of providedAnswers) {
          const { data: existingAns } = await supabase
            .from("user_trivia_attempts")
            .select("id")
            .eq("user_id", req.profile?.id)
            .eq("trivia_question_id", ans.question_id)
            .maybeSingle();

          if (!existingAns) {
            const dbCorrectAnswer = answersMap.get(ans.question_id);
            let evaluatedIsCorrect = false;

            if (ans.selected_answer !== undefined) {
              evaluatedIsCorrect = ans.selected_answer === dbCorrectAnswer;
            } else {
              evaluatedIsCorrect = !!ans.is_correct;
            }

            await supabase.from("user_trivia_attempts").insert({
              user_id: req.profile?.id,
              trivia_question_id: ans.question_id,
              is_correct: evaluatedIsCorrect,
            });
          }
        }

        // Retrieve ALL saved question answers for this user & trivia set from user_trivia_attempts
        const dbQuestionIds = (dbQuestions || []).map(q => q.id);
        const { data: finalAttempts } = await supabase
          .from("user_trivia_attempts")
          .select("trivia_question_id, is_correct")
          .eq("user_id", req.profile?.id)
          .in("trivia_question_id", dbQuestionIds);

        const verifiedResults = (finalAttempts || []).map((fa) => ({
          question_id: fa.trivia_question_id,
          is_correct: !!fa.is_correct
        }));

        const score = (finalAttempts || []).filter(fa => fa.is_correct).length;
        const totalQuestions = dbQuestionIds.length;
        const winThreshold = 0.7;
        const scoreRate = totalQuestions > 0 ? (score / totalQuestions) : 0;
        const won = scoreRate >= winThreshold;

        // 0. Check for existing attempt (Fraud Prevention)
        let queryAttempt = supabase
          .from("daily_trivia_attempts")
          .select("id")
          .eq("user_id", req.profile?.id);
        if (dbId) {
          queryAttempt = queryAttempt.eq("ebook_id", dbId);
        } else {
          queryAttempt = queryAttempt.is("ebook_id", null);
        }

        const { data: existingAttempt } = await queryAttempt.maybeSingle();
        if (existingAttempt && existingAttempt.completed === true) {
          return res
            .status(403)
            .json({
              error:
                "Attempt already recorded. You can only participate in this trivia once.",
            });
        }

        // 0.1 Check quota counts before awarding
        let queryPrev = supabase
          .from("daily_trivia_attempts")
          .select("id, score, total_questions, created_at, user_id")
          .order("created_at", { ascending: true });
        
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
          const rate = (attempt.total_questions || 5) > 0 ? (attempt.score / (attempt.total_questions || 5)) : 0;
          if (rate >= 0.989) {
            trueWinnersCount++;
          } else if (rate >= 0.8) {
            compensatedCount++;
          }
        }

        // Determine reward tier (One true winner + consolation)
        let rewardStatus: "grand_winner" | "consolation_winner" | "none" = "none";
        let cashEarned = 0;

        if (scoreRate >= 0.989) {
          if (trueWinnersCount < 1) {
            rewardStatus = "grand_winner";
            cashEarned = 5000; // ₦5,000 + 2GB data
          } else if (compensatedCount < 4) {
            rewardStatus = "consolation_winner";
            cashEarned = 1000; // ₦1,000 + 300MB data
          }
        } else if (scoreRate >= 0.8) {
          if (compensatedCount < 4) {
            rewardStatus = "consolation_winner";
            cashEarned = 1000; // ₦1,000 + 300MB data
          }
        }

        // 1. Record Attempt in daily tracker (update the pre-inserted row to completed)
        let dailyError;
        if (existingAttempt) {
          const { error: updErr } = await supabase
            .from("daily_trivia_attempts")
            .update({
              score,
              total_questions: totalQuestions,
              completed: true,
              won: won || rewardStatus !== "none",
              attempt_date: new Date().toISOString().split("T")[0],
            })
            .eq("id", existingAttempt.id);
          dailyError = updErr;
        } else {
          const { error: insErr } = await supabase
            .from("daily_trivia_attempts")
            .insert({
              user_id: req.profile?.id,
              ebook_id: dbId,
              score,
              total_questions: totalQuestions,
              completed: true,
              won: won || rewardStatus !== "none",
              attempt_date: new Date().toISOString().split("T")[0],
            });
          dailyError = insErr;
        }

        if (dailyError) throw dailyError;

        // 2. Record Detailed Attempts - delete existing draft logs to avoid duplicate rows
        const questionIdsForDeletion = verifiedResults.map((vr) => vr.question_id);
        if (questionIdsForDeletion.length > 0) {
          await supabase
            .from("user_trivia_attempts")
            .delete()
            .eq("user_id", req.profile?.id)
            .in("trivia_question_id", questionIdsForDeletion);
        }

        const detailedAttempts = verifiedResults.map((r) => ({
          user_id: req.profile?.id,
          trivia_question_id: r.question_id,
          is_correct: r.is_correct,
        }));

        const { error: detailedError } = await supabase
          .from("user_trivia_attempts")
          .insert(detailedAttempts);

        if (detailedError)
          console.error(
            "[Trivia] Failed to record detailed attempts:",
            detailedError,
          );

        // 3. Reward standard Points (70% threshold required)
        let pointsEarned = 0;
        if (won || rewardStatus !== "none") {
          pointsEarned = verifiedResults.reduce(
            (acc, r) => acc + (r.is_correct ? 10 : 0),
            0,
          );
        }

        if (pointsEarned > 0) {
          // Perform an atomic balance update
          const { error: rpcErr } = await supabase.rpc("increment_user_balance", {
            p_user_id: req.profile?.id,
            p_points_delta: pointsEarned
          });

          if (rpcErr) {
            console.warn("[Trivia Win] RPC balance update failed, falling back to read-then-write:", rpcErr);
            const { data: userProfile } = await supabase
              .from("users")
              .select("t_points")
              .eq("id", req.profile?.id)
              .single();
            const currentPoints = userProfile?.t_points || 0;
            await supabase
              .from("users")
              .update({ t_points: currentPoints + pointsEarned })
              .eq("id", req.profile?.id);
          }
        }

        // 4. CASH PAYOUT PROCESS & AUTOMATED REQUEST PLACEMENT
        if (rewardStatus !== "none") {
          const rewardLabel = rewardStatus === "grand_winner" ? "Grand Winner (2GB Data)" : "Consolation Winner (300MB Data)";
          console.log(`[Trivia Auto-Payout] Crediting ₦${cashEarned} as ${rewardLabel} to user ${req.user.email}`);

          // Insert a "trivia_win" credit transaction row so that it adds to their lifetime earnings balance correctly
          await supabase
            .from("transactions")
            .insert({
              user_id: req.profile?.id,
              amount: cashEarned,
              type: "trivia_win",
              status: "successful",
              book_id: dbId || null,
            });

          // Insert an automated pending withdrawal request on behalf of the participant for admin review
          const bankName = rewardStatus === "grand_winner" ? "Grand Winner (2GB Data)" : "Consolation Winner (300MB Data)";
          const accountNumber = isGeneral ? "General Trivia" : `Book ID: ${dbId ? dbId.substring(0, 8) : 'unknown'}`;
          const accountName = req.profile?.account_name || req.profile?.full_name || req.user.email?.split('@')[0] || "Trivia Winner";

          const { error: withdrawalErr } = await supabase
            .from("withdrawals")
            .insert({
              user_id: req.profile?.id,
              amount: cashEarned,
              bank_name: bankName,
              account_number: accountNumber,
              account_name: accountName,
              status: "pending",
            });

          if (withdrawalErr) {
            console.error("[Trivia Auto-Withdrawal] Automated withdrawal ticket failed:", withdrawalErr);
          }
        }

        // Delete used vault items (auto-delete upon usage)
        if (questionIdsForDeletion.length > 0) {
          try {
            await supabase
              .from("vault")
              .delete()
              .in("id", questionIdsForDeletion);
            console.log("[Vault Auto-Delete] Auto-deleted used vault items:", questionIdsForDeletion);
          } catch (vaultDelErr) {
            console.error("[Vault Auto-Delete] Error auto-deleting used vault items:", vaultDelErr);
          }
        }

        // Automatically generate a Data Reward request upon user win
        if (won) {
          try {
            const dataRewardAmount = rewardStatus === "grand_winner" ? 2000 : 300;
            const phoneVal = req.profile?.phone || req.profile?.phone_number || "To Be Provided";
            await supabase
              .from("support_requests")
              .insert({
                user_id: req.profile?.id,
                type: "Data Reward",
                subject: `Trivia Win: ${dataRewardAmount}MB Data Reward Claim`,
                message: `Phone: ${phoneVal}\nNetwork: MTN\nAmount: ${dataRewardAmount} MB\n\nNotes: Automatic reward request generated from Trivia Winner.`,
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
      } catch (err: any) {
        console.error("[Trivia Submit] Error:", err);
        res.status(500).json({ error: "Failed to submit trivia result." });
      }
    },
  );

  // Admin: Get all trivia questions grouped by eBook
  app.get(
    "/api/admin/trivias",
    authenticateUser,
    async (req: any, res: any) => {
      if (
        req.profile?.account_tier !== "admin" &&
        req.profile?.account_tier !== "author"
      ) {
        return res.status(403).json({ error: "Access denied." });
      }

      try {
        const supabase = getSupabase();
        const isAdmin = req.profile?.account_tier === "admin";
        const userId = req.profile?.id;

        // Only include active books that aren't deleted (Robustly filter deleted)
        let query = supabase
          .from("books")
          .select("id, title, status, admin_note, user_id")
          .neq("status", -1)
          .not("status", "eq", "-1");

        if (!isAdmin) {
          query = query.eq("user_id", userId);
        }

        const { data: books, error: bErr } = await query;
        if (bErr) throw bErr;

        const { data: questions, error: qErr } = await supabase
          .from("trivia_questions")
          .select("*");

        let triviaSessions: any[] = [];
        try {
          const { data, error } = await supabase
            .from("trivias")
            .select("*")
            .eq("deleted", false)
            .eq("status", "active");
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
              lastUpdated: null,
            })),
          });
        }
        if (qErr) throw qErr;

        const stats = (books || []).map((book) => {
          const bookQuestions = (questions || []).filter(
            (q) => q.ebook_id === book.id,
          );
          const session = (triviaSessions || []).find(
            (s) => s.book_id === book.id,
          );
          return {
            id: book.id,
            title: book.title,
            questionCount: bookQuestions.length,
            lastUpdated:
              bookQuestions.length > 0
                ? new Date(
                    Math.max(
                      ...bookQuestions.map((q) =>
                        new Date(q.created_at).getTime(),
                      ),
                    ),
                  ).toISOString()
                : null,
            status: session?.status || "inactive",
            expiry_at: session?.expiry_at,
            reward_points: session?.reward_points,
            thumbnail_url: session?.thumbnail_url,
            is_owner: book.user_id === userId,
          };
        });

        // Add General Knowledge entry ONLY for admins
        if (isAdmin) {
          const generalQuestions = (questions || []).filter(
            (q) => q.ebook_id === null,
          );
          const generalSession = (triviaSessions || []).find(
            (s) => s.book_id === null,
          );
          if (generalQuestions.length > 0 || generalSession) {
            stats.push({
              id: "general",
              title: "General Knowledge Trivia",
              questionCount: generalQuestions.length,
              lastUpdated:
                generalQuestions.length > 0
                  ? new Date(
                      Math.max(
                        ...generalQuestions.map((q) =>
                          new Date(q.created_at).getTime(),
                        ),
                      ),
                    ).toISOString()
                  : null,
              status: generalSession?.status || "inactive",
              expiry_at: generalSession?.expiry_at,
              reward_points: generalSession?.reward_points,
              thumbnail_url: generalSession?.thumbnail_url,
              is_owner: true,
            });
          }

          // Add orphaned trivia sessions (where referenced book is deleted or missing)
          const existingBookIds = new Set((books || []).map(b => b.id));
          (triviaSessions || []).forEach(s => {
            if (s.book_id !== null && !existingBookIds.has(s.book_id)) {
              const bookQuestions = (questions || []).filter(
                (q) => String(q.ebook_id) === String(s.book_id) || String(q.ebook_id) === String(s.id)
              );
              stats.push({
                id: s.book_id || s.id, // ID used for deletion
                title: s.title || `[Missing/Ghost eBook Trivia] (ID: ${s.book_id})`,
                questionCount: bookQuestions.length,
                lastUpdated: bookQuestions.length > 0 ? new Date().toISOString() : null,
                status: s.status || "expired",
                expiry_at: s.expiry_at || new Date().toISOString(),
                reward_points: s.reward_points || 100,
                thumbnail_url: s.thumbnail_url,
                is_owner: true,
                is_orphaned: true
              });
            }
          });
        }

        res.json({ trivias: stats });
      } catch (err: any) {
        console.error("[Admin Trivia Stats] Error:", err);
        res.status(500).json({ error: "Failed to fetch admin trivia stats" });
      }
    },
  );

  // Admin: Create/Update Questions for an eBook
  app.post(
    "/api/admin/trivias/ebook/:ebookId",
    authenticateUser,
    async (req: any, res: any) => {
      if (
        req.profile?.account_tier !== "admin" &&
        req.profile?.account_tier !== "author"
      ) {
        return res.status(403).json({ error: "Access denied." });
      }

      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const supabase = getSupabase();
        const isAdmin = req.profile?.account_tier === "admin";

        // Ownership check
        if (!isGeneral && !isAdmin) {
          const { data: book } = await supabase
            .from("books")
            .select("user_id")
            .eq("id", dbId)
            .single();
          if (book?.user_id !== req.profile?.id)
            return res.status(403).json({ error: "Permission denied." });
        } else if (isGeneral && !isAdmin) {
          return res
            .status(403)
            .json({ error: "Only the CEO can manage General Trivia." });
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
          promotional_writeup = "",
        } = req.body;

        // SENSITIVE: Only CEO can toggle isActive in this bulk route
        const finalActive = isAdmin ? isActive : undefined;

        // Delete existing for this book first
        if (isGeneral) {
          await supabase.from("trivia_questions").delete().is("ebook_id", null);
        } else {
          await supabase.from("trivia_questions").delete().eq("ebook_id", dbId);
        }

        const prepared = questions.map((q: any, index: number) => ({
          ebook_id: dbId,
          question: q.question,
          options: Array.isArray(q.options)
            ? q.options
            : typeof q.options === "string"
              ? JSON.parse(q.options)
              : q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || "Medium",
          points: q.points || 10,
          order_number: index + 1,
          is_active: isActive,
        }));

        const { error } = await supabase
          .from("trivia_questions")
          .insert(prepared);
        if (error) {
          console.error("[Admin Trivia] Questions Insert Error:", error);
          // Clearer error for schema cache issues
          if (
            error.message.includes("column") &&
            error.message.includes("not found")
          ) {
            return res.status(500).json({
              error: "Database Out of Sync",
              details: error.message,
              hint: "Run 'NOTIFY pgrst, \'reload schema\';' in your Supabase SQL Editor to refresh the API cache.",
            });
          }
          throw error;
        }

        // Also update/create the session as draft in the trivias table
        let bookTitle = title || "General Knowledge Trivia";
        let bookDesc = description || "A challenge across various topics.";
        let bookCover = "";

        if (!isGeneral) {
          const { data: book } = await supabase
            .from("books")
            .select("title, cover_image")
            .eq("id", dbId)
            .single();
          if (book) {
            bookTitle = title || book.title;
            bookDesc = description || `Trivia challenge for ${book.title}.`;
            bookCover = book.cover_image || "";
          }
        }

        // Upsert session
        try {
          if (isGeneral) {
            // Try to find existing general trivia by title if book_id is null
            const { data: existingTrivia } = await supabase
              .from("trivias")
              .select("id")
              .is("book_id", null)
              .maybeSingle();
            await supabase.from("trivias").upsert({
              id: existingTrivia?.id || undefined,
              book_id: null,
              title: bookTitle,
              description: bookDesc,
              status: isActive ? "active" : "draft",
              is_active: !!isActive,
              type: "marketing",
              requires_premium: target_tier === "premium",
              starts_at: new Date().toISOString(),
              reward_points: reward_points !== undefined && reward_points !== null ? reward_points : 100,
              price: price !== undefined && price !== null ? price : 0,
              target_tier: target_tier || "all",
              promotional_writeup: promotional_writeup || null,
              duration_seconds: duration_seconds,
              thumbnail_url: thumbnail_url || bookCover,
              created_at: new Date().toISOString(),
            });
          } else {
            await supabase.from("trivias").upsert(
              {
                book_id: dbId,
                title: bookTitle,
                description: bookDesc,
                status: isActive ? "active" : "draft",
                is_active: !!isActive,
                type: "marketing",
                requires_premium: target_tier === "premium",
                starts_at: new Date().toISOString(),
                reward_points: reward_points !== undefined && reward_points !== null ? reward_points : 100,
                price: price !== undefined && price !== null ? price : 0,
                target_tier: target_tier || "all",
                promotional_writeup: promotional_writeup || null,
                duration_seconds: duration_seconds,
                thumbnail_url: thumbnail_url || bookCover,
                created_at: new Date().toISOString(),
              },
              { onConflict: "book_id" },
            );
          }
        } catch (tErr) {
          console.warn("[Admin Trivia] 'trivias' table upsert skipped:", tErr);
        }

        res.json({ success: true, count: prepared.length });
      } catch (err: any) {
        console.error("[Admin Trivia] Create error details:", {
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint,
        });
        const errMsg =
          err.message || err.error?.message || "Failed to create/update trivia";
        const details = err.details || "";
        const hint = err.hint || "";
        res.status(500).json({
          error: errMsg,
          details: details,
          hint: hint,
        });
      }
    },
  );

  // Admin: Delete all trivia for an eBook
  app.delete(
    ["/api/admin/trivias/ebook/:ebookId", "/api/admin/trivia/delete/:ebookId"],
    authenticateUser,
    async (req: any, res: any) => {
      const isAdmin = req.profile?.account_tier === "admin";
      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Only the CEO can delete trivia games." });
      }

      try {
        const { ebookId } = req.params;
        const isGeneral = ebookId === "general";
        const dbId = isGeneral ? null : ebookId;
        const supabase = getSupabase();
        // Delete both questions, session entries, and all daily attempts
        const qQuery = isGeneral
          ? supabase.from("trivia_questions").delete().is("ebook_id", null)
          : supabase.from("trivia_questions").delete().eq("ebook_id", dbId);

        const tQuery = isGeneral
          ? supabase.from("trivias").update({ deleted: true }).is("book_id", null)
          : supabase.from("trivias").update({ deleted: true }).eq("book_id", dbId);

        const aQuery = isGeneral
          ? supabase.from("daily_trivia_attempts").delete().is("ebook_id", null)
          : supabase.from("daily_trivia_attempts").delete().eq("ebook_id", dbId);

        const [qDel, tDel, aDel] = await Promise.all([qQuery, tQuery, aQuery]);

        if (qDel.error) throw qDel.error;
        if (tDel.error) throw tDel.error;

        res.json({ success: true, message: "Trivia set, questions, and attempts deleted successfully" });
      } catch (err: any) {
        console.error("[Admin Trivia] Delete error:", err);
        res.status(500).json({ error: "Failed to delete trivia set: " + err.message });
      }
    }
  );

  // --- AI ARCHITECT & TRIVIA GENERATION ---

  // FIX 2: Launch Trivia (CEO ONLY)
  app.post(
    "/api/admin/trivia/launch",
    authenticateUser,
    async (req: any, res: any) => {
      const isAdmin = req.profile?.account_tier === "admin";
      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Only the CEO can launch trivia games." });
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
        promotional_writeup = "",
      } = req.body;
      const isGeneral = triviaId === "general";
      const dbId = isGeneral ? null : triviaId;

      try {
        const supabase = getSupabase();
        const isAdmin = req.profile?.account_tier === "admin";

        // Ownership check for authors
        if (!isGeneral && !isAdmin) {
          const { data: book } = await supabase
            .from("books")
            .select("user_id")
            .eq("id", dbId)
            .single();
          if (book?.user_id !== req.profile?.id)
            return res.status(403).json({ error: "Permission denied." });
        } else if (isGeneral && !isAdmin) {
          return res
            .status(403)
            .json({ error: "Only the CEO can launch General Trivia." });
        }

        // 1. Validate questions count (at least 5)
        const qQuery = isGeneral
          ? supabase.from("trivia_questions").select("*").is("ebook_id", null)
          : supabase.from("trivia_questions").select("*").eq("ebook_id", dbId);

        const { data: questions, error: qErr } = await qQuery;

        if (qErr) throw qErr;
        if (!questions || questions.length < 5) {
          return res
            .status(400)
            .json({
              error:
                "Launch blocked: You need at least 5 questions set before launching.",
            });
        }

        // 2. Activate all questions
        const uQuery = isGeneral
          ? supabase
              .from("trivia_questions")
              .update({ is_active: true })
              .is("ebook_id", null)
          : supabase
              .from("trivia_questions")
              .update({ is_active: true })
              .eq("ebook_id", dbId);

        await uQuery;

        // 3. Refresh or Create the session in the 'trivias' table
        let bookTitle = title || "General Knowledge Trivia";
        let bookDesc = description || "Mixed topic challenge for everyone.";
        let bookCover = "";

        if (!isGeneral) {
          const { data: book } = await supabase
            .from("books")
            .select("title, cover_image")
            .eq("id", dbId)
            .single();
          if (book) {
            bookTitle = title || book.title;
            bookDesc =
              description || `Trivia challenge for ${book.title}.`;
            bookCover = book.cover_image || "";
          }
        }

        try {
          const startIso = startDate || new Date().toISOString();
          if (isGeneral) {
            const { data: existingTrivia } = await supabase
              .from("trivias")
              .select("id")
              .is("book_id", null)
              .maybeSingle();
            const { error: tErr } = await supabase.from("trivias").upsert({
              id: existingTrivia?.id || undefined,
              book_id: null,
              title: bookTitle,
              description: bookDesc,
              status: "active",
              is_active: true,
              type: "marketing",
              requires_premium: target_tier === "premium",
              starts_at: startIso,
              expiry_at: endDate,
              reward_points: rewardPoints !== undefined && rewardPoints !== null ? rewardPoints : 100,
              price: price,
              target_tier: target_tier || "all",
              promotional_writeup: promotional_writeup || null,
              thumbnail_url: thumbnail_url || bookCover,
              created_at: startIso,
            });
            if (tErr && tErr.code !== "42P01") throw tErr;
          } else {
            const { error: tErr } = await supabase.from("trivias").upsert(
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
                reward_points: rewardPoints !== undefined && rewardPoints !== null ? rewardPoints : 100,
                price: price,
                target_tier: target_tier || "all",
                promotional_writeup: promotional_writeup || null,
                thumbnail_url: thumbnail_url || bookCover,
                created_at: startIso,
              },
              { onConflict: "book_id" },
            );
            if (tErr && tErr.code !== "42P01") throw tErr;
          }
        } catch (tErr) {
          console.warn("[Admin Launch API] 'trivias' table upsert skipped:", tErr);
        }

        res.json({ success: true, message: "Launched successfully" });
      } catch (err: any) {
        console.error("[Admin Trivia] Launch error details:", {
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint,
        });
        const errMsg =
          err.message ||
          err.error?.message ||
          "Failed to launch trivia session.";
        const details = err.details || "";
        const hint = err.hint || "";
        res.status(500).json({
          error: errMsg,
          details: details,
          hint: hint,
        });
      }
    },
  );

  // Admin: Suspend/Toggle Trivia (CEO ONLY)
  app.post(
    "/api/admin/trivia/status",
    authenticateUser,
    async (req: any, res: any) => {
      const isAdmin = req.profile?.account_tier === "admin";
      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Only the CEO can suspend/resume trivia games." });
      }

      try {
        const { bookId, status } = req.body;
        const isGeneral = bookId === "general" || bookId === null;
        const supabase = getSupabase();
        const isAdmin = req.profile?.account_tier === "admin";

        // Ownership check
        if (!isGeneral && !isAdmin) {
          const { data: book } = await supabase
            .from("books")
            .select("user_id")
            .eq("id", bookId)
            .single();
          if (book?.user_id !== req.profile?.id)
            return res.status(403).json({ error: "Permission denied." });
        } else if (isGeneral && !isAdmin) {
          return res
            .status(403)
            .json({ error: "Only the CEO can change General Trivia status." });
        }

        const qUpdate = isGeneral
          ? supabase.from("trivia_questions").update({ is_active: status === "active" }).is("ebook_id", null)
          : supabase.from("trivia_questions").update({ is_active: status === "active" }).eq("ebook_id", bookId);
        
        await qUpdate;

        try {
          const query = isGeneral
            ? supabase.from("trivias").update({ status }).is("book_id", null)
            : supabase.from("trivias").update({ status }).eq("book_id", bookId);

          const { error } = await query;
          if (error && error.code !== "42P01") throw error;
        } catch (statusErr) {
          console.warn("[Admin Trivia Status] 'trivias' table update skipped:", statusErr);
        }

        logMprAudit({
          admin_id: req.profile?.id || req.user?.id,
          action_type: status === "active" ? "approved_trivia" : (status === "rejected" ? "rejected_trivia" : "updated_trivia_status"),
          target_type: "trivia",
          target_id: String(bookId || "general"),
          details: { status, isGeneral },
          ip_address: req.ip,
        });

        res.json({ success: true });
      } catch (err: any) {
        console.error("[Admin Trivia] Status update error:", err);
        res.status(500).json({ error: "Failed to update trivia status" });
      }
    },
  );

  // Convert T-Points to Naira
  app.post(
    "/api/user/convert-points",
    authenticateUser,
    async (req: any, res: any) => {
      try {
        const supabase = getSupabase();
        const { points } = req.body;
        const currentPoints = req.profile?.t_points || 0;

        if (points > currentPoints) {
          return res.status(400).json({ error: "Insufficient T-Points" });
        }

        const nairaValue = points * 5; // 1 TP = 5 Naira
        if (nairaValue < 5000) {
          return res
            .status(400)
            .json({ error: "Minimum conversion is 5,000 Naira" });
        }

        // Update T-Points and Wallet Balance atomically via RPC
        const { error: rpcErr } = await supabase.rpc("increment_user_balance", {
          p_user_id: req.profile?.id,
          p_points_delta: -points,
          p_wallet_delta: nairaValue
        });

        const newPoints = currentPoints - points;
        const newBalance = (req.profile?.wallet_balance || 0) + nairaValue;

        if (rpcErr) {
          console.warn("[Convert Points] RPC balance update failed, falling back to read-then-write:", rpcErr);
          const { error } = await supabase
            .from("users")
            .update({
              t_points: newPoints,
              wallet_balance: newBalance,
            })
            .eq("id", req.profile?.id);

          if (error) throw error;
        }

        res.json({ success: true, nairaValue, newPoints, newBalance });
      } catch (err: any) {
        console.error("Convert points error:", err);
        res.status(500).json({ error: "Failed to convert points" });
      }
    },
  );

  // Global API Error Handler
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Error [Global Handler]:", err);
    // Determine if requester is admin
    const isAdmin =
      !!req.profile?.is_admin &&
      [
        "samuelchukwuemeke05@gmail.com",
      ].includes((req.profile?.email || req.user?.email || "").toLowerCase());
    const userEmail = req.profile?.email || req.user?.email || "";

    res.status(err.status || 500).json({
      error: maskError(err, isAdmin),
    });
  });

  // Health check for preview stability
  app.get("/api/health-check", (req, res) =>
    res.json({ status: "healthy", timestamp: new Date().toISOString() }),
  );

  // Fallback handler for unmatched /api routes to prevent returning HTML or falling through to SPA index.html
  app.all("/api/*", (req, res) => {
    const acceptsHtml = req.headers.accept && req.headers.accept.includes("text/html");
    if (acceptsHtml && !req.xhr && req.headers["x-requested-with"] !== "XMLHttpRequest") {
      return res.redirect("/login");
    }
    res.status(404).json({ error: "API route not found", path: req.path });
  });

  // CalmReader Android APK Download & Version Check Endpoints
  // Ensures proper Android MIME type and bypasses intermediate caching
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const startTime = Date.now();
    console.log("[Server] Initializing Vite middleware (Standard Mode)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Inject Vite middleware
    app.use(vite.middlewares);

    console.log(
      `[Server] Vite middleware ready in ${Date.now() - startTime}ms`,
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
        },
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
        `[Server] Listening on http://localhost:${PORT} [${process.env.NODE_ENV || "dev"}]`,
      );
      // Background self-healing seed task
      autoSeedTriviasAndVerify().catch((e) => {
        console.error("[Server] Auto-seed background worker error:", e);
      });
    });
  }

  return app;
}

async function autoSeedTriviasAndVerify() {
  const supabase = getSupabase();
  if (supabase.__isDummy) {
    console.log("[AutoSeed] Supabase is unconfigured (dummy). Skipping auto-seed.");
    return;
  }

  // BAN DUMMY: clean up mock and test data from the database on boot
  try {
    const dbAdmin = getSupabaseAdmin();
    if (dbAdmin && !dbAdmin.__isDummy) {
      console.log("[BAN DUMMY] Initiating database self-cleaning routine...");
      
      // 1. Delete rows with buyer_email = 'No Email'
      const { error: err1 } = await dbAdmin
        .from("transactions")
        .delete()
        .eq("buyer_email", "No Email");
      if (err1) console.warn("[BAN DUMMY] Delete buyer_email error:", err1.message);
      
      // 2. Delete rows with user_id is null
      const { error: err2 } = await dbAdmin
        .from("transactions")
        .delete()
        .is("user_id", null);
      if (err2) console.warn("[BAN DUMMY] Delete null user_id error:", err2.message);
      
      // 3. Delete rows where type = 'mock' or 'test'
      const { error: err3 } = await dbAdmin
        .from("transactions")
        .delete()
        .in("type", ["mock", "test"]);
      if (err3) console.warn("[BAN DUMMY] Delete mock/test type error:", err3.message);
      
      // 4. Delete transactions of any type with amount = 100 if they are test transactions
      const { data: txs100, error: err100 } = await dbAdmin
        .from("transactions")
        .select("id, paystack_reference, type")
        .eq("amount", 100);
      
      if (!err100 && txs100 && txs100.length > 0) {
        const idsToDelete = txs100
          .filter((tx: any) => {
            const ref = (tx.paystack_reference || "").toLowerCase();
            return !ref || ref.includes("mock") || ref.includes("test") || ref.includes("free") || ref.startsWith("manual-");
          })
          .map((tx: any) => tx.id);
        
        if (idsToDelete.length > 0) {
          await dbAdmin.from("transactions").delete().in("id", idsToDelete);
          console.log(`[BAN DUMMY] Deleted ${idsToDelete.length} test transactions of amount = 100.`);
        }
      }

      // 5. Delete premium_upgrade transactions with no real payment reference
      const { data: upgrades, error: errUp } = await dbAdmin
        .from("transactions")
        .select("id, paystack_reference")
        .eq("type", "premium_upgrade");
      
      if (!errUp && upgrades && upgrades.length > 0) {
        const upgradesToDelete = upgrades
          .filter((tx: any) => {
            const ref = (tx.paystack_reference || "").toLowerCase();
            return !ref || ref.includes("mock") || ref.includes("test") || ref.includes("free") || ref.startsWith("manual-");
          })
          .map((tx: any) => tx.id);
        
        if (upgradesToDelete.length > 0) {
          await dbAdmin.from("transactions").delete().in("id", upgradesToDelete);
          console.log(`[BAN DUMMY] Deleted ${upgradesToDelete.length} dummy premium upgrade transactions.`);
        }
      }

      // 6. Delete ebook_purchases that don't have a corresponding real transaction
      const { data: purchases, error: errP } = await dbAdmin
        .from("ebook_purchases")
        .select("*");
      
      if (!errP && purchases && purchases.length > 0) {
        const { data: txPurchases, error: errTxP } = await dbAdmin
          .from("transactions")
          .select("user_id, book_id, paystack_reference")
          .eq("type", "purchase");
        
        if (!errTxP && txPurchases) {
          const validSets = new Set(
            txPurchases
              .filter((tx: any) => {
                const ref = (tx.paystack_reference || "").toLowerCase();
                return ref && !ref.includes("mock") && !ref.includes("test");
              })
              .map((tx: any) => `${tx.user_id}:${tx.book_id}`)
          );
          
          const purchasesToDelete = purchases
            .filter((p: any) => {
              const bookId = p.book_id || p.ebook_id;
              const key = `${p.user_id}:${bookId}`;
              return !validSets.has(key);
            })
            .map((p: any) => p.id);
          
          if (purchasesToDelete.length > 0) {
            await dbAdmin.from("ebook_purchases").delete().in("id", purchasesToDelete);
            console.log(`[BAN DUMMY] Deleted ${purchasesToDelete.length} orphan/dummy ebook_purchases.`);
          }
        }
      }
      // 7. Delete old test trivias and duplicate entries to save egress & database space
      const { data: trivias, error: errT } = await dbAdmin
        .from("trivias")
        .select("id, title, created_at");
      
      if (!errT && trivias && trivias.length > 0) {
        const testKeywords = ["test", "mock", "dummy", "sample", "untitled"];
        const triviasToDelete = [];
        const seenTitles = new Set();
        
        // Sort trivias by created_at ascending to keep the oldest (original) ones and delete newer duplicates
        const sortedTrivias = [...trivias].sort((a: any, b: any) => {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });

        for (const t of sortedTrivias) {
          const titleLower = (t.title || "").toLowerCase().trim();
          
          // Check if title is empty/untitled, or has test keywords
          const isTest = !titleLower || testKeywords.some((kw) => titleLower.includes(kw));
          
          // Check if it's a duplicate
          const isDuplicate = seenTitles.has(titleLower);
          
          if (isTest || isDuplicate) {
            triviasToDelete.push(t.id);
          } else {
            seenTitles.add(titleLower);
          }
        }
        
        if (triviasToDelete.length > 0) {
          const { error: delTError } = await dbAdmin
            .from("trivias")
            .delete()
            .in("id", triviasToDelete);
          
          if (!delTError) {
            console.log(`[BAN DUMMY] Successfully cleaned up ${triviasToDelete.length} test or duplicate trivias.`);
          } else {
            console.warn("[BAN DUMMY] Failed to delete test/duplicate trivias:", delTError.message);
          }
        }
      }

      console.log("[BAN DUMMY] Database self-cleaning completed successfully.");
    }
  } catch (cleanErr: any) {
    console.warn("[BAN DUMMY] Database self-cleaning exception:", cleanErr.message || cleanErr);
  }

  // Self-healing insert helper for trivias to handle missing database columns gracefully
  async function safeInsertTrivia(payload: any) {
    let attemptPayload = { ...payload };
    while (true) {
      const { error } = await supabase.from("trivias").insert(attemptPayload);
      if (!error) {
        return { success: true };
      }
      const errorMessage = error.message || "";
      if (
        errorMessage.includes("column") ||
        errorMessage.includes("duration_seconds") ||
        errorMessage.includes("status") ||
        errorMessage.includes("thumbnail_url") ||
        errorMessage.includes("slug") ||
        error.code === "PGRST204"
      ) {
        let removedSomething = false;
        
        if (attemptPayload.duration_seconds !== undefined && (errorMessage.includes("duration_seconds") || errorMessage.includes("find the 'duration_seconds' column"))) {
          delete attemptPayload.duration_seconds;
          removedSomething = true;
        }
        if (attemptPayload.status !== undefined && (errorMessage.includes("status") || errorMessage.includes("find the 'status' column"))) {
          delete attemptPayload.status;
          removedSomething = true;
        }
        if (attemptPayload.thumbnail_url !== undefined && (errorMessage.includes("thumbnail_url") || errorMessage.includes("find the 'thumbnail_url' column"))) {
          delete attemptPayload.thumbnail_url;
          removedSomething = true;
        }
        
        if (!removedSomething) {
          const match = errorMessage.match(/column "(.*?)"/i) || 
                        errorMessage.match(/column '(.*?)'/i) ||
                        errorMessage.match(/'(.*?)' column/i) ||
                        errorMessage.match(/"(.*?)" column/i);
          if (match && match[1] && attemptPayload[match[1]] !== undefined) {
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
