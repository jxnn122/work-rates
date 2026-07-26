import { RECOVER_ROOM_URL } from "./supabase-config.js";

const requestPanel = document.getElementById("requestPanel");
const sentPanel = document.getElementById("sentPanel");
const redeemingPanel = document.getElementById("redeemingPanel");
const errorPanel = document.getElementById("errorPanel");
const form = document.getElementById("recoveryForm");
const emailInput = document.getElementById("recoveryEmail");
const recoveryButton = document.getElementById("recoveryButton");
const recoveryStatus = document.getElementById("recoveryStatus");
const tryAgainButton = document.getElementById("tryAgainButton");
const errorMessage = document.getElementById("errorMessage");
const recoveryToken = new URLSearchParams(window.location.hash.slice(1)).get("code") || "";

function showPanel(panel) {
  [requestPanel, sentPanel, redeemingPanel, errorPanel].forEach((item) => {
    item.hidden = item !== panel;
  });
  panel?.focus?.();
}

function setStatus(message, isError = false) {
  if (!recoveryStatus) return;
  recoveryStatus.textContent = message;
  recoveryStatus.classList.toggle("error", isError);
}

function setSubmitting(submitting) {
  if (!recoveryButton) return;
  recoveryButton.disabled = submitting;
  recoveryButton.textContent = submitting ? "Sending securely…" : "Send recovery link ↗";
}

async function callRecovery(body) {
  let response;

  try {
    response = await fetch(RECOVER_ROOM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    const error = new Error("Recovery unavailable");
    error.status = 503;
    throw error;
  }

  let result = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    const error = new Error(result.error || "Recovery unavailable");
    error.status = response.status;
    throw error;
  }

  return result;
}

function safeClientRoomUrl(value) {
  try {
    const url = new URL(value);
    const approvedOrigin =
      url.origin === window.location.origin ||
      url.origin === "https://jxnn.store" ||
      url.origin === "https://www.jxnn.store";
    const validPath = url.pathname === "/client.html";
    const validToken = /^#access=[0-9a-f]{64}$/i.test(url.hash);
    return approvedOrigin && validPath && validToken ? url.href : "";
  } catch {
    return "";
  }
}

async function redeemRecoveryToken(token) {
  showPanel(redeemingPanel);
  history.replaceState(null, "", window.location.pathname);

  try {
    const result = await callRecovery({ action: "redeem", token });
    const accessUrl = safeClientRoomUrl(result.access_url);
    if (!accessUrl) throw new Error("Invalid Client Room response");
    window.location.replace(accessUrl);
  } catch (error) {
    if (errorMessage) {
      errorMessage.textContent = error.status === 401
        ? "This recovery link is invalid, expired or has already been used."
        : "The recovery service could not open your room. Please request another link.";
    }
    showPanel(errorPanel);
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const email = String(data.get("email") || "").trim().toLowerCase();
  const website = String(data.get("website") || "").trim();
  const turnstileToken = String(data.get("cf-turnstile-response") || "").trim();

  if (!turnstileToken) {
    setStatus("Please complete the verification check.", true);
    return;
  }

  setSubmitting(true);
  setStatus("Checking securely…");

  try {
    await callRecovery({
      action: "request",
      email,
      website,
      turnstile_token: turnstileToken
    });
    form.reset();
    window.turnstile?.reset();
    showPanel(sentPanel);
  } catch (error) {
    const messages = {
      422: "Verification expired. Please complete the check again.",
      429: "Too many recovery requests were made. Please wait before trying again."
    };
    setStatus(
      messages[error.status] || "The recovery request could not be sent. Please try again.",
      true
    );
    window.turnstile?.reset();
  } finally {
    setSubmitting(false);
  }
});

tryAgainButton?.addEventListener("click", () => {
  showPanel(requestPanel);
  setStatus("");
  emailInput?.focus();
});

if (recoveryToken) {
  if (/^[0-9a-f]{64}$/i.test(recoveryToken)) {
    redeemRecoveryToken(recoveryToken);
  } else {
    history.replaceState(null, "", window.location.pathname);
    showPanel(errorPanel);
  }
} else {
  showPanel(requestPanel);
}
