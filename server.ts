import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_STRING_REGEX = /^[\w\s\-.,!?@]+$/;

function isValidUUID(value: unknown) { return typeof value === 'string' && UUID_REGEX.test(value); }
function isValidEmail(value: unknown) { return typeof value === 'string' && EMAIL_REGEX.test(value); }
function isValidSafeString(value: unknown, maxLength = 255) { return typeof value === 'string' && value.length > 0 && value.length <= maxLength && SAFE_STRING_REGEX.test(value); }

const app = express();
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://xyzcompany.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({ contentSecurityPolicy: false }));

const isProduction = process.env.NODE_ENV === "production";
const basePath = isProduction ? "/var/task" : path.resolve(__dirname);

// Serve static files in production
if (isProduction) {
  app.use(express.static(path.join(basePath, "dist")));
  app.use(express.static(path.join(basePath, "public")));
}

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: "Too many requests" } });
app.use("/api/", apiLimiter);

app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.post("/api/auth/callback", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !isValidSafeString(token, 500)) return res.status(400).json({ error: "Invalid token" });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid token" });
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    res.json({ user, profile, token });
  } catch (error) { res.status(500).json({ error: "Authentication failed" }); }
});

app.post("/api/auth/sync-profile", async (req, res) => {
  try {
    const { userId, email, fullName, role } = req.body;
    if (!userId || !isValidUUID(userId)) return res.status(400).json({ error: "Invalid user ID" });
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
    const updates = { id: userId, email, full_name: fullName || email.split("@")[0], role: role || "client", updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("profiles").upsert(updates).select().single();
    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (error) { res.status(500).json({ error: "Failed to sync profile" }); }
});

app.get("/api/settings", async (_req, res) => {
  try { const { data, error } = await supabase.from("settings").select("*").limit(1).single(); if (error) throw error; res.json(data || {}); }
  catch (error) { res.status(500).json({ error: "Failed to fetch settings" }); }
});

app.get("/api/bookings", async (req, res) => {
  try { 
    const { userId, status, date } = req.query; 
    let query = supabase.from("bookings").select("*").order("date", { ascending: true }); 
    if (userId && isValidUUID(userId)) query = query.eq("user_id", userId); 
    if (status && isValidSafeString(status, 50)) query = query.eq("status", status); 
    if (date && isValidSafeString(date, 20)) query = query.eq("date", date); 
    const { data, error } = await query; 
    if (error) throw error; 
    res.json(data || []); 
  }
  catch (error) { res.status(500).json({ error: "Failed to fetch bookings" }); }
});

app.post("/api/bookings", async (req, res) => {
  try { 
    const { userId, domeId, date, time, credits, notes } = req.body; 
    if (!userId || !isValidUUID(userId)) return res.status(400).json({ error: "Invalid user ID" }); 
    if (!domeId || !isValidSafeString(domeId, 50)) return res.status(400).json({ error: "Invalid dome ID" }); 
    if (!date || !isValidSafeString(date, 20)) return res.status(400).json({ error: "Invalid date" }); 
    if (!time || !isValidSafeString(time, 10)) return res.status(400).json({ error: "Invalid time" }); 
    const booking = { user_id: userId, dome_id: domeId, date, time, credits: credits || 1, notes: notes || "", status: "pending", created_at: new Date().toISOString() }; 
    const { data, error } = await supabase.from("bookings").insert(booking).select().single(); 
    if (error) throw error; 
    res.status(201).json(data); 
  }
  catch (error) { res.status(500).json({ error: "Failed to create booking" }); }
});

app.get("/api/user/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Invalid token" });
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    res.json({ user, profile });
  } catch (error) { res.status(500).json({ error: "Failed to get user" }); }
});

app.post("/api/user/sync", async (req, res) => {
  try {
    const { user } = req.body;
    if (!user?.id) return res.status(400).json({ error: "Invalid user" });
    const updates = { 
      id: user.id, 
      email: user.email, 
      full_name: user.name || user.email?.split("@")[0], 
      role: user.isAdmin ? "admin" : user.isTeacher ? "teacher" : "client",
      updated_at: new Date().toISOString() 
    };
    const { data, error } = await supabase.from("profiles").upsert(updates).select().single();
    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (error) { res.status(500).json({ error: "Failed to sync user" }); }
});

// Catch-all: serve index.html for SPA routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(basePath, "dist", "index.html"));
});

export default app;
