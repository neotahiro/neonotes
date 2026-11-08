import { uid } from "@/lib/utils";

const KEY = "noenotes-device";
let cached: string | null = null;

/** A random id for this browser, stored on this device. Lets the server tell our own earlier writes from another device's. */
export function getDeviceId(): string {
  if (cached) return cached;
  let id: string | null = null;
  try {
    id = localStorage.getItem(KEY);
  } catch {
    /* storage unavailable */
  }
  if (!id) {
    id = uid() + uid();
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* fall back to a per-session id */
    }
  }
  cached = id;
  return id;
}
