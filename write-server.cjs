const fs = require('fs');

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
const EMAIL_REGEX = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const SAFE_STRING_REGEX = /^[\\w\\s\\-.,!?@]+$/;

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

  app.delete("/api/bookings/:id", async (req, res) => {
    try { const { id } = req.params; if (!id || !isValidUUID(id)) return res.status(400).json(errorResponse("Invalid booking ID", ErrorCodes.VALIDATION_ERROR)); const { error } = await supabase.from("bookings").delete().eq("id", id); if (error) throw error; res.json({ success: true }); }
    catch (error) { res.status(500).json(errorResponse("Failed to delete booking", ErrorCodes.DATABASE_ERROR)); }
  });

  app.get("/api/domes", async (req, res) => {
    try { const { data, error } = await supabase.from("domes").select("*").eq("active", true).order("name"); if (error) throw error; res.json(data || []); }
    catch (error) { res.status(500).json(errorResponse("Failed to fetch domes", ErrorCodes.DATABASE_ERROR)); }
  });

  app.get("/api/slots", async (req, res) => {
    try { const { domeId, date } = req.query; if (!domeId || !isValidSafeString(domeId, 50)) return res.status(400).json(errorResponse("Invalid dome ID", ErrorCodes.VALIDATION_ERROR)); if (!date || !isValidSafeString(date, 20)) return res.status(400).json(errorResponse("Invalid date", ErrorCodes.VALIDATION_ERROR)); const allSlots = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]; const { data: bookings } = await supabase.from("bookings").select("time").eq("dome_id", domeId).eq("date", date).neq("status", "cancelled"); const bookedTimes = new Set(bookings?.map(b => b.time) || []); const availableSlots = allSlots.filter(slot => !bookedTimes.has(slot)).map(time => ({ time, available: true })); res.json(availableSlots); }
    catch (error) { res.status(500).json(errorResponse("Failed to fetch slots", ErrorCodes.DATABASE_ERROR)); }
  });

  app.post("/api/credits/purchase", async (req, res) => {
    try { const { userId, packageId, paymentMethod } = req.body; if (!userId || !isValidUUID(userId)) return res.status(400).json(errorResponse("Invalid user ID", ErrorCodes.VALIDATION_ERROR)); const creditPackage = CREDIT_PACKAGES.find(p => p.id === packageId); if (!creditPackage) return res.status(400).json(errorResponse("Invalid package", ErrorCodes.VALIDATION_ERROR)); if (paymentMethod === "payfast") { const paymentData = await payfastService.createPaymentLink({ amount: creditPackage.price, itemName: creditPackage.name, userId, email: "", creditPackageId: creditPackage.id }); return res.json({ paymentUrl: paymentData }); } const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).single(); const newCredits = (profile?.credits || 0) + creditPackage.credits; await supabase.from("profiles").update({ credits: newCredits }).eq("id", userId); await supabase.from("credit_purchases").insert({ user_id: userId, package_id: packageId, credits: creditPackage.credits, amount: creditPackage.price, payment_method: "free", status: "completed" }); res.json({ success: true, credits: newCredits }); }
    catch (error) { res.status(500).json(errorResponse("Failed to purchase credits", ErrorCodes.PAYMENT_ERROR)); }
  });

  app.post("/api/credits/use", async (req, res) => {
    try { const { userId, amount } = req.body; if (!userId || !isValidUUID(userId)) return res.status(400).json(errorResponse("Invalid user ID", ErrorCodes.VALIDATION_ERROR)); if (!amount || !isValidNumber(amount) || amount < 1) return res.status(400).json(errorResponse("Invalid amount", ErrorCodes.VALIDATION_ERROR)); const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).single(); if (!profile || profile.credits < amount) return res.status(400).json(errorResponse("Insufficient credits", ErrorCodes.INSUFFICIENT_CREDITS)); await supabase.from("profiles").update({ credits: profile.credits - amount }).eq("id", userId); res.json({ success: true, remainingCredits: profile.credits - amount }); }
    catch (error) { res.status(500).json(errorResponse("Failed to use credits", ErrorCodes.DATABASE_ERROR)); }
  });

  app.get("/api/credits/balance", async (req, res) => {
    try { const { userId } = req.query; if (!userId || !isValidUUID(userId)) return res.status(400).json(errorResponse("Invalid user ID", ErrorCodes.VALIDATION_ERROR)); const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).single(); res.json({ credits: profile?.credits || 0 }); }
    catch (error) { res.status(500).json(errorResponse("Failed to get balance", ErrorCodes.DATABASE_ERROR)); }
  });

  app.post("/api/feedback", async (req, res) => {
    try { const { bookingId, rating, comment, type } = req.body; if (!bookingId || !isValidUUID(bookingId)) return res.status(400).json(errorResponse("Invalid booking ID", ErrorCodes.VALIDATION_ERROR)); if (!rating || !isValidNumber(rating) || rating < 1 || rating > 5) return res.status(400).json(errorResponse("Invalid rating", ErrorCodes.VALIDATION_ERROR)); const feedback = { booking_id: bookingId, rating, comment: isValidSafeString(comment, 1000) ? comment : "", type: isValidSafeString(type, 20) ? type : "general", created_at: new Date().toISOString() }; const { data, error } = await supabase.from("feedback").insert(feedback).select().single(); if (error) throw error; res.status(201).json(data); }
    catch (error) { res.status(500).json(errorResponse("Failed to submit feedback", ErrorCodes.FEEDBACK_ERROR)); }
  });

  app.post("/api/email/send", async (req, res) => {
    try { const { to, subject, template, data } = req.body; if (!to || !isValidEmail(to)) return res.status(400).json(errorResponse("Invalid email", ErrorCodes.VALIDATION_ERROR)); if (!subject || !isValidSafeString(subject, 200)) return res.status(400).json(errorResponse("Invalid subject", ErrorCodes.VALIDATION_ERROR)); await emailService.sendEmail(to, subject, template || "", data); res.json({ success: true }); }
    catch (error) { res.status(500).json(errorResponse("Failed to send email", ErrorCodes.EMAIL_ERROR)); }
  });

  app.post("/api/email/queue", async (req, res) => {
    try { const { to, subject, template, data, scheduledFor } = req.body; if (!to || !isValidEmail(to)) return res.status(400).json(errorResponse("Invalid email", ErrorCodes.VALIDATION_ERROR)); const job = await emailQueue.enqueue({ to, subject, template, data, scheduledFor }); res.json({ jobId: job.id, success: true }); }
    catch (error) { res.status(500).json(errorResponse("Failed to queue email", ErrorCodes.EMAIL_ERROR)); }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try { const { message, context } = req.body; if (!message || !isValidSafeString(message, 2000)) return res.status(400).json(errorResponse("Invalid message", ErrorCodes.VALIDATION_ERROR)); const response = await aiService.chat(message, context); res.json({ response }); }
    catch (error) { res.status(500).json(errorResponse("AI service unavailable", ErrorCodes.AI_ERROR)); }
  });

  app.get("/api/payfast/credit-packages", (req, res) => res.json(CREDIT_PACKAGES));

  app.post("/api/payfast/notify", async (req, res) => {
    try { const { payment_status, m_payment_id, amount_gross } = req.body; if (payment_status === "COMPLETE") { const parts = m_payment_id.split("-"); const packageId = parts[3]; const creditPackage = CREDIT_PACKAGES.find(p => p.id === packageId); if (creditPackage) { const userId = parts[0]; const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).single(); const newCredits = (profile?.credits || 0) + creditPackage.credits; await supabase.from("profiles").update({ credits: newCredits }).eq("id", userId); await supabase.from("credit_purchases").insert({ user_id: userId, package_id: packageId, credits: creditPackage.credits, amount: parseFloat(amount_gross), payment_method: "payfast", status: "completed" }); } } res.status(200).send("OK"); }
    catch (error) { res.status(500).send("ERROR"); }
  });

  app.get("*", async (req, res) => {
    if (isProduction) res.sendFile(path.join(basePath, "dist", "index.html"));
    else { const html = "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'/><meta name='viewport' content='width=device-width, initial-scale=1.0'/><title>The Fascia Movement Dome</title></head><body><div id='root'></div><script type='module' src='/index.tsx'></script></body></html>"; res.setHeader("Content-Type", "text/html"); res.end(html); }
  });

  app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
}

createServer().catch(console.error);
`;

fs.writeFileSync('C:/TFMD-ROOT/server.ts', serverCode);
console.log('Done');
