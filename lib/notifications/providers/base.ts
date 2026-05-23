// ── Abstract notification provider ───────────────────────────────

import type { NotificationPayload, SendResult } from "../types";

export abstract class NotificationProvider {
  abstract readonly channel: string;

  abstract send(payload: NotificationPayload): Promise<SendResult>;
}