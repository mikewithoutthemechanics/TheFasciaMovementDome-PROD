const fs = require('fs');
const path = require('path');

const serverCode = `import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

import { aiService } from "./services/ai";
import { emailService } from "./services/email";
import { emailQueue } from "./services/email-queue";
import { db } from "./services/db-supabase";
import { Feedback } from "./types";
import { toSettingsResponse, toTokenResponse } from "./services/api-dto";
import { payfastService } from "./services/payfast";
import { CREDIT_PACKAGES } from "./constants";
import { errorResponse, ErrorCodes, HttpStatus } from "./utils/error-response";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_STRING_REGEX = /^[\w\s\-.,!?@]+$/;

function isValidUUID(value) { return typeof value === 'string' && UUID_REGEX.test(value); }
function isValidEmail(value) { return typeof value === 'string' && EMAIL_REGEX.test(value); }
function isValidSafeString(value, maxLength = 255) { return typeof value === 'string' && value.length > 0 && value.length <= maxLength && SAFE_STRING_REGEX.test(value); }
function isValidNumber(value) { return typeof value === 'number' && !isNaN(value) && isFinite(value); }

const app = express();
const PORT = process.env.PORT || 3001;
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://xyzcompany.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMjI1MzIwMCwiZXhwIjoxOTM3ODI5MjAwfQ.1234567890abcdefghijklmnopqrstuvwxyz";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], fontSrc: ["'self'", "https://fonts.gstatic.com"], imgSrc: ["'self'", "data:", "https:", "blob:"], connectSrc: ["'self'", "https:", "wss:", "ws:"], frameSrc: ["'self'", "https://www.payfast.co.za"] } } }));

const isProduction = process.env.NODE_ENV === "production";
const basePath = isProduction ? "/var/task" : path.resolve(__dirname);

async function createServer() {
  if (isProduction) {
    app.use(express.static(path.join(basePath, "dist")));
    app.use(express.static(path.join(basePath, "public")));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "custom" });
    app.use(vite.middlewares);
  }

  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: "Too many requests" } });
  app.use("/api/", apiLimiter);

  app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  app.post("/api/auth/callback", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token || !isValidSafeString(token, 500)) return res.status(400).json(errorResponse("Invalid token", ErrorCodes.VALIDATION_ERROR));
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json(errorResponse("Invalid token", ErrorCodes.AUTH_INVALID_TOKEN));
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      res.json({ user, profile, token });
    } catch (error) { res.status(500).json(errorResponse("Authentication failed", ErrorCodes.SERVER_ERROR)); }
  });

  app.post("/api/auth/sync-profile", async (req, res) => {
    try {
      const { userId, email, fullName, role } = req.body;
      if (!userId || !isValidUUID(userId)) return res.status(400).json(errorResponse("Invalid user ID", ErrorCodes.VALIDATION_ERROR));
      if (!email || !isValidEmail(email)) return res.status(400).json(errorResponse("Invalid email", ErrorCodes.VALIDATION_ERROR));
      const updates = { id: userId, email, full_name: fullName || email.split("@")[0], role: role || "client", updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from("profiles").upsert(updates).select().single();
      if (error) throw error;
      res.json({ success: true, profile: data });
    } catch (error) { res.status(500).json(errorResponse("Failed to sync profile", ErrorCodes.DATABASE_ERROR)); }
  });

  app.get("/api/settings", async (req, res) => {
    try { const { data, error } = await supabase.from("settings").select("*").limit(1).single(); if (error) throw error; res.json(toSettingsResponse(data)); }
    catch (error) { res.status(500).json(errorResponse("Failed to fetch settings", ErrorCodes.DATABASE_ERROR)); }
  });

  app.post("/api/settings", async (req, res) => {
    try { const { key, value } = req.body; if (!key || !isValidSafeString(key, 100)) return res.status(400).json(errorResponse("Invalid key", ErrorCodes.VALIDATION_ERROR)); const { data, error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }).select().single(); if (error) throw error; res.json(toSettingsResponse(data)); }
    catch (error) { res.status(500).json(errorResponse("Failed to update setting", ErrorCodes.DATABASE_ERROR)); }
  });

  app.get("/api/bookings", async (req, res) => {
    try { const { userId, status, date } = req.query; let query = supabase.from("bookings").select("*").order("date", { ascending: true }); if (userId && isValidUUID(userId)) query = query.eq("user_id", userId); if (status && isValidSafeString(status, 50)) query = query.eq("status", status); if (date && isValidSafeString(date, 20)) query = query.eq("date", date); const { data, error } = await query; if (error) throw error; res.json(data || []); }
    catch (error) { res.status(500).json(errorResponse("Failed to fetch bookings", ErrorCodes.DATABASE_ERROR)); }
  });

  app.post("/api/bookings", async (req, res) => {
    try { const { userId, domeId, date, time, credits, notes } = req.body; if (!userId || !isValidUUID(userId)) return res.status(400).json(errorResponse("Invalid user ID", ErrorCodes.VALIDATION_ERROR)); if (!domeId || !isValidSafeString(domeId, 50)) return res.status(400).json(errorResponse("Invalid dome ID", ErrorCodes.VALIDATION_ERROR)); if (!date || !isValidSafeString(date, 20)) return res.status(400).json(errorResponse("Invalid date", ErrorCodes.VALIDATION_ERROR)); if (!time || !isValidSafeString(time, 10)) return res.status(400).json(errorResponse("Invalid time", ErrorCodes.VALIDATION_ERROR)); const booking = { user_id: userId, dome_id: domeId, date, time, credits: credits || 1, notes: notes || "", status: "pending", created_at: new Date().toISOString() }; const { data, error } = await supabase.from("bookings").insert(booking).select().single(); if (error) throw error; res.status(201).json(data); }
    catch (error) { res.status(500).json(errorResponse("Failed to create booking", ErrorCodes.DATABASE_ERROR)); }
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    try { const { id } = req.params; if (!id || !isValidUUID(id)) return res.status(400).json(errorResponse("Invalid booking ID", ErrorCodes.VALIDATION_ERROR)); const updates = { ...req.body, updated_at: new Date().toISOString() }; const { data, error } = await supabase.from("bookings").update(updates).eq("id", id).select().single(); if (error) throw error; res.json(data); }
    catch (error) { res.status(500).json(errorResponse("Failed to update booking", ErrorCodes.DATABASE_ERROR)); }
  });

  app.delete("/api/bookings/:id", async (req, re
