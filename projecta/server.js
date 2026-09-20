/* ==========================================================================
   PROJECTA — BACKEND SERVER
   Credentials are stored in .env ONLY — never in any client-facing file.
   Run: node server.js
   ========================================================================== */

require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DEV_USER = process.env.DEV_USER || "";
const DEV_PASS = process.env.DEV_PASS || "";

// --------------------------------------------------------------------------
// Active session tokens
// Map<token, expiryTimestamp>
// --------------------------------------------------------------------------
const activeSessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function pruneExpiredSessions() {
  const now = Date.now();

  for (const [token, expiry] of activeSessions.entries()) {
    if (now > expiry) {
      activeSessions.delete(token);
    }
  }
}

setInterval(pruneExpiredSessions, 60 * 1000);

// --------------------------------------------------------------------------
// Login Rate Limiting
// Maximum 3 failed attempts ? 1 hour lock
// Map<clientIP, { failedAttempts, lockedUntil }>
// --------------------------------------------------------------------------
const loginAttempts = new Map();

const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour

function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "unknown";
}

function getLoginAttemptRecord(ip) {
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, {
      failedAttempts: 0,
      lockedUntil: 0
    });
  }

  return loginAttempts.get(ip);
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

function pruneLoginAttempts() {
  const now = Date.now();

  for (const [ip, record] of loginAttempts.entries()) {
    if (
      record.lockedUntil &&
      now >= record.lockedUntil
    ) {
      loginAttempts.delete(ip);
    }
  }
}

setInterval(pruneLoginAttempts, 60 * 1000);

// --------------------------------------------------------------------------
// MIME Types
// --------------------------------------------------------------------------
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".json": "application/json",
};

// --------------------------------------------------------------------------
// Read JSON Request Body
// --------------------------------------------------------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });

    req.on("error", reject);
  });
}

// --------------------------------------------------------------------------
// Send JSON Response
// --------------------------------------------------------------------------
function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(body);
}

// --------------------------------------------------------------------------
// Static File Server
// --------------------------------------------------------------------------
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {
        "Content-Type": "text/plain"
      });

      res.end("404 Not Found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType
    });

    res.end(data);
  });
}

// --------------------------------------------------------------------------
// HTTP Server
// --------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {

  const url = new URL(
    req.url,
    "http://localhost:" + PORT
  );

  const method = req.method.toUpperCase();

  // ------------------------------------------------------------------------
  // CORS Preflight
  // ------------------------------------------------------------------------
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    res.end();
    return;
  }

  // ------------------------------------------------------------------------
  // Developer Login API
  // ------------------------------------------------------------------------
  if (
    url.pathname === "/api/login" &&
    method === "POST"
  ) {

    const body = await readBody(req);

    const enteredUser = (body.user || "").trim();
    const enteredPass = (body.pass || "").trim();

    // Get client IP for rate limiting
    const clientIP = getClientIP(req);

    const attemptRecord =
      getLoginAttemptRecord(clientIP);

    const now = Date.now();

    // ----------------------------------------------------------------------
    // Check if IP is currently locked
    // ----------------------------------------------------------------------
    if (
      attemptRecord.lockedUntil &&
      now < attemptRecord.lockedUntil
    ) {

      const remainingMs =
        attemptRecord.lockedUntil - now;

      const remainingMinutes =
        Math.ceil(remainingMs / 60000);

      console.log(
        "[" +
        new Date().toLocaleTimeString() +
        "] Login blocked. IP locked for " +
        remainingMinutes +
        " more minute(s)."
      );

      return sendJSON(res, 429, {
        success: false,
        locked: true,
        message:
          `Too many failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      });
    }

    // ----------------------------------------------------------------------
    // Compare Username & Password
    // ----------------------------------------------------------------------
    let userMatch = false;
    let passMatch = false;

    try {

      userMatch =
        enteredUser.length === DEV_USER.length &&
        crypto.timingSafeEqual(
          Buffer.from(enteredUser),
          Buffer.from(DEV_USER)
        );

      passMatch =
        enteredPass.length === DEV_PASS.length &&
        crypto.timingSafeEqual(
          Buffer.from(enteredPass),
          Buffer.from(DEV_PASS)
        );

    } catch (e) {

      userMatch = false;
      passMatch = false;

    }

    // ----------------------------------------------------------------------
    // Successful Login
    // ----------------------------------------------------------------------
    if (userMatch && passMatch) {

      // Reset failed attempts after successful login
      clearLoginAttempts(clientIP);

      const token = generateToken();

      activeSessions.set(
        token,
        Date.now() + SESSION_TTL_MS
      );

      console.log(
        "[" +
        new Date().toLocaleTimeString() +
        "] Login successful. Token issued."
      );

      return sendJSON(res, 200, {
        success: true,
        token
      });
    }

    // ----------------------------------------------------------------------
    // Failed Login Attempt
    // ----------------------------------------------------------------------
    attemptRecord.failedAttempts++;

    console.log(
      "[" +
      new Date().toLocaleTimeString() +
      "] Failed login attempt #" +
      attemptRecord.failedAttempts +
      "."
    );

    // ----------------------------------------------------------------------
    // Lock After 3 Failed Attempts
    // ----------------------------------------------------------------------
    if (
      attemptRecord.failedAttempts >=
      MAX_LOGIN_ATTEMPTS
    ) {

      attemptRecord.lockedUntil =
        now + LOGIN_LOCKOUT_MS;

      console.log(
        "[" +
        new Date().toLocaleTimeString() +
        "] IP locked for 1 hour."
      );

      return sendJSON(res, 429, {
        success: false,
        locked: true,
        message:
          "Too many failed login attempts. Developer Login is locked for 1 hour."
      });
    }

    // ----------------------------------------------------------------------
    // Failed Login — Attempts Still Available
    // ----------------------------------------------------------------------
    const attemptsRemaining =
      MAX_LOGIN_ATTEMPTS -
      attemptRecord.failedAttempts;

    setTimeout(() => {

      sendJSON(res, 401, {
        success: false,
        message:
          `Invalid username or password. ${attemptsRemaining} attempt(s) remaining.`
      });

    }, 500);

    return;
  }

  // ------------------------------------------------------------------------
  // Verify Developer Session
  // ------------------------------------------------------------------------
  if (
    url.pathname === "/api/verify" &&
    method === "POST"
  ) {

    const body = await readBody(req);

    const token =
      (body.token || "").trim();

    const session =
      activeSessions.get(token);

    if (
      session &&
      Date.now() < session
    ) {

      return sendJSON(res, 200, {
        valid: true
      });

    }

    return sendJSON(res, 401, {
      valid: false
    });
  }

  // ------------------------------------------------------------------------
  // Serve Static Files
  // ------------------------------------------------------------------------
  let filePath = path.join(
    __dirname,
    url.pathname === "/"
      ? "index.html"
      : url.pathname
  );

  if (!filePath.startsWith(__dirname)) {

    res.writeHead(403, {
      "Content-Type": "text/plain"
    });

    res.end("403 Forbidden");
    return;
  }

  serveFile(res, filePath);
});

// --------------------------------------------------------------------------
// Start Server
// --------------------------------------------------------------------------
server.listen(PORT, () => {

  console.log(
    "\n ProjectA Backend Server Running"
  );

  console.log(
    " http://localhost:" + PORT
  );

  console.log(
    " Dev Portal: http://localhost:" +
    PORT +
    "/developer.html\n"
  );

  console.log(
    "Credentials loaded from .env (server-side only)."
  );

  console.log(
    "Login protection: 3 failed attempts ? 1 hour lock."
  );

  console.log(
    "Press Ctrl+C to stop.\n"
  );
});