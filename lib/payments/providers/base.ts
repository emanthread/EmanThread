import {
  type InitiatePaymentRequest,
  type InitiatePaymentResponse,
  type VerifyCallbackResult,
} from "../types";
import { generateHash } from "../utils";

export abstract class BasePaymentProvider {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResponse>;

  abstract verifyCallback(payload: unknown): Promise<VerifyCallbackResult>;

  protected generateHash(data: string, salt: string): string {
    return generateHash(data, salt);
  }

  protected generateTxnRef(): string {
    const ts = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `T${ts}${random}`;
  }
}