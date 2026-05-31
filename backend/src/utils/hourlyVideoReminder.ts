import { publishNtfyMessage } from "./ntfy.js";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

type ReminderInterval = "minute" | "hour";

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function isEnabled(value: string | undefined) {
  return value !== "false" && value !== "0";
}

function getReminderInterval(): ReminderInterval {
  const value = process.env.NTFY_REMINDER_INTERVAL?.trim().toLowerCase();
  return value === "minute" ? "minute" : "hour";
}

function getAuthorizationHeader() {
  const authHeader = process.env.NTFY_AUTH_HEADER?.trim();
  if (authHeader) {
    return authHeader;
  }

  const token = process.env.NTFY_AUTH_TOKEN?.trim();
  if (token) {
    return `Bearer ${token}`;
  }

  return undefined;
}

async function sendReminderOnce() {
  const baseUrl = process.env.NTFY_BASE_URL?.trim() || "https://ntfy.sh";
  const topic = process.env.NTFY_TOPIC?.trim() || "be-for-real-reminders";
  const title = process.env.NTFY_TITLE?.trim() || "Be For Real reminder";
  const message =
    process.env.NTFY_MESSAGE?.trim() ||
    "Time to record a new Be For Real video.";
  const clickUrl =
    process.env.NTFY_CLICK_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:5173/camera";
  const tags = process.env.NTFY_TAGS?.trim() || "camera,video_camera";
  const priority = (process.env.NTFY_PRIORITY?.trim() || "default") as
    | "min"
    | "low"
    | "default"
    | "high"
    | "max";

  await publishNtfyMessage({
    baseUrl: trimTrailingSlashes(baseUrl),
    topic,
    title,
    message,
    clickUrl,
    tags,
    priority,
    authHeader: getAuthorizationHeader(),
  });
}


function startReminderLoop(intervalMs: number, label: string) {
  console.log(`ntfy reminders enabled. Sending every ${label}.`);

  void sendReminderOnce().catch((error) => {
    console.error("Failed to send ntfy reminder:", error);
  });

  setInterval(() => {
    void sendReminderOnce().catch((error) => {
      console.error("Failed to send ntfy reminder:", error);
    });
  }, intervalMs);
}

export function startVideoReminder() {
  if (!isEnabled(process.env.NTFY_HOURLY_REMINDER)) {
    console.log("ntfy reminders are disabled.");
    return;
  }

  const interval = getReminderInterval();

  if (interval === "minute") {
    return startReminderLoop(MINUTE_MS, "minute");
  }

  return startReminderLoop(HOUR_MS, "hour");
}
