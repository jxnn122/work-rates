import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://jxnn.store",
  "https://www.jxnn.store",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(
  origin: string,
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength + 1)
    : "";
}

function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    };

    return replacements[character];
  });
}

function clientRoomUrl(origin: string, token: string) {
  const base =
    origin.includes("localhost") || origin.includes("127.0.0.1")
      ? origin
      : "https://jxnn.store";

  return `${base}/client.html#access=${token}`;
}

function recoveryUrl(token: string) {
  return `https://jxnn.store/recover.html#code=${token}`;
}

function genericRequestResponse(origin: string) {
  return json(origin, {
    ok: true,
    message:
      "If an active Client Room exists, a recovery link has been sent.",
  });
}

async function verifyTurnstile(
  token: string,
  visitorIp: string,
  secret: string,
) {
  const verificationForm = new FormData();

  verificationForm.set("secret", secret);
  verificationForm.set("response", token);

  if (visitorIp !== "unknown") {
    verificationForm.set("remoteip", visitorIp);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: verificationForm,
        signal: AbortSignal.timeout(7000),
      },
    );

    const result = await response.json();

    const validHostname =
      result.hostname === "jxnn.store" ||
      result.hostname === "www.jxnn.store";

    return (
      result.success === true &&
      validHostname &&
      result.action === "room_recovery"
    );
  } catch {
    return false;
  }
}

function emailHtml(projectTitle: string, link: string) {
  const safeProjectTitle = escapeHtml(projectTitle);
  const safeLink = escapeHtml(link);

  return `
    <div style="
      margin:0;
      padding:42px 20px;
      background:#070709;
      color:#f4f2eb;
      font-family:Arial,sans-serif;
    ">
      <div style="
        max-width:600px;
        margin:0 auto;
        padding:38px;
        border:1px solid #29292f;
        border-radius:24px;
        background:#101014;
      ">
        <p style="
          margin:0 0 24px;
          color:#c8ff32;
          font-size:12px;
          font-weight:700;
          letter-spacing:2px;
        ">
          JXNN STORE / CLIENT ROOM
        </p>

        <h1 style="
          margin:0;
          color:#f4f2eb;
          font-size:34px;
          line-height:1.05;
        ">
          Your private room is ready.
        </h1>

        <p style="
          margin:22px 0 0;
          color:#aaa9b2;
          font-size:16px;
          line-height:1.7;
        ">
          A recovery link was requested for
          <strong style="color:#f4f2eb;">${safeProjectTitle}</strong>.
        </p>

        <a
          href="${safeLink}"
          style="
            display:block;
            margin-top:30px;
            padding:16px 20px;
            border-radius:13px;
            background:#c8ff32;
            color:#070709;
            font-size:15px;
            font-weight:800;
            text-align:center;
            text-decoration:none;
          "
        >
          Open my Client Room
        </a>

        <p style="
          margin:24px 0 0;
          color:#777781;
          font-size:13px;
          line-height:1.65;
        ">
          This private link expires after 15 minutes and works once.
          If you did not request it, you can ignore this email.
        </p>
      </div>
    </div>
  `;
}

async function sendRecoveryEmail(
  apiKey: string,
  fromEmail: string,
  email: string,
  projectTitle: string,
  link: string,
  idempotencyKey: string,
) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Recover your JXNN Client Room",
        html: emailHtml(projectTitle, link),
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";

  if (!allowedOrigins.has(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (request.method !== "POST") {
    return json(origin, { error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return json(origin, { error: "Invalid request" }, 400);
  }

  const action = cleanText(body.action, 30);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateLimitSalt = Deno.env.get("RATE_LIMIT_SALT");

  if (!supabaseUrl || !serviceRoleKey || !rateLimitSalt) {
    console.error("Recovery database credentials are unavailable");

    return json(origin, {
      error: "Recovery service unavailable",
    }, 503);
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  if (action === "redeem") {
    const recoveryToken = cleanText(body.token, 128);

    if (!/^[0-9a-f]{64}$/i.test(recoveryToken)) {
      return json(origin, {
        error: "Invalid or expired recovery link",
      }, 401);
    }

    const recoveryTokenHash = await sha256(
      `${rateLimitSalt}:room-recovery:${recoveryToken}`,
    );

    const newRoomToken = createToken();
    const newRoomTokenHash = await sha256(
      `${rateLimitSalt}:client-room:${newRoomToken}`,
    );

    const { data: redeemed, error: redeemError } = await supabase.rpc(
      "redeem_room_recovery_token",
      {
        p_recovery_token_hash: recoveryTokenHash,
        p_room_token_hash: newRoomTokenHash,
      },
    );

    if (redeemError) {
      console.error("Unable to redeem Client Room recovery token");
      return json(origin, {
        error: "Unable to recover Client Room",
      }, 500);
    }

    if (!redeemed) {
      return json(origin, {
        error: "Invalid or expired recovery link",
      }, 401);
    }

    return json(origin, {
      ok: true,
      access_url: clientRoomUrl(origin, newRoomToken),
    });
  }

  if (action !== "request") {
    return json(origin, { error: "Unknown action" }, 400);
  }

  // Silently accept honeypot submissions.
  if (cleanText(body.website, 200)) {
    return genericRequestResponse(origin);
  }

  const email = cleanText(body.email, 254).toLowerCase();
  const turnstileToken = cleanText(body.turnstile_token, 2048);

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !turnstileToken
  ) {
    return json(origin, { error: "Invalid recovery request" }, 400);
  }

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const recoveryFromEmail = Deno.env.get("RECOVERY_FROM_EMAIL");

  if (!turnstileSecret || !resendApiKey || !recoveryFromEmail) {
    console.error("Recovery email credentials are unavailable");

    return json(origin, {
      error: "Recovery service unavailable",
    }, 503);
  }

  const visitorIp =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() || "unknown";

  const verified = await verifyTurnstile(
    turnstileToken,
    visitorIp,
    turnstileSecret,
  );

  if (!verified) {
    return json(origin, {
      error: "Verification failed",
    }, 422);
  }

  const [ipKey, emailKey] = await Promise.all([
    sha256(`${rateLimitSalt}:recovery-ip:${visitorIp}`),
    sha256(`${rateLimitSalt}:recovery-email:${email}`),
  ]);

  const [ipLimit, emailLimit] = await Promise.all([
    supabase.rpc("check_request_rate_limit", {
      p_key_hash: ipKey,
      p_max_requests: 5,
      p_window_seconds: 3600,
    }),

    supabase.rpc("check_request_rate_limit", {
      p_key_hash: emailKey,
      p_max_requests: 3,
      p_window_seconds: 3600,
    }),
  ]);

  if (ipLimit.error || emailLimit.error) {
    console.error("Recovery rate limiting unavailable");

    return json(origin, {
      error: "Recovery service unavailable",
    }, 503);
  }

  if (!ipLimit.data || !emailLimit.data) {
    return json(origin, {
      error: "Too many recovery requests",
    }, 429);
  }

  const { data: enquiries, error: enquiryError } = await supabase
    .from("enquiries")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(20);

  if (enquiryError || !enquiries?.length) {
    return genericRequestResponse(origin);
  }

  const enquiryIds = enquiries.map((enquiry) => enquiry.id);

  const { data: rooms, error: roomError } = await supabase
    .from("client_rooms")
    .select("id, project_title")
    .in("enquiry_id", enquiryIds)
    .eq("archived", false)
    .order("last_activity_at", { ascending: false })
    .limit(1);

  if (roomError || !rooms?.length) {
    return genericRequestResponse(origin);
  }

  const room = rooms[0];
  const recoveryToken = createToken();

  const recoveryTokenHash = await sha256(
    `${rateLimitSalt}:room-recovery:${recoveryToken}`,
  );

  const expiresAt = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();

  // Clear expired and previously issued links.
  await supabase
    .from("room_recovery_tokens")
    .delete()
    .lt("expires_at", new Date().toISOString());

  await supabase
    .from("room_recovery_tokens")
    .delete()
    .eq("room_id", room.id);

  const { error: tokenError } = await supabase
    .from("room_recovery_tokens")
    .insert({
      token_hash: recoveryTokenHash,
      room_id: room.id,
      expires_at: expiresAt,
    });

  if (tokenError) {
    console.error("Unable to create recovery link");

    return genericRequestResponse(origin);
  }

  const delivered = await sendRecoveryEmail(
    resendApiKey,
    recoveryFromEmail,
    email,
    room.project_title,
    recoveryUrl(recoveryToken),
    recoveryTokenHash,
  );

  if (!delivered) {
    await supabase
      .from("room_recovery_tokens")
      .delete()
      .eq("token_hash", recoveryTokenHash);

    console.error("Recovery email delivery failed");
  }

  return genericRequestResponse(origin);
});
