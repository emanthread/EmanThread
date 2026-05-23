import { BasePaymentProvider } from "./providers/base";
import { JazzCashProvider } from "./providers/jazzcash";
import { EasypaisaProvider } from "./providers/easypaisa";
import { CardGatewayProvider } from "./providers/card-gateway";
import { SafepayProvider } from "./providers/safepay";
import type { PaymentProviderName } from "./types";

export function getProvider(name: PaymentProviderName): BasePaymentProvider {
  switch (name) {
    case "jazzcash":
      return new JazzCashProvider();
    case "easypaisa":
      return new EasypaisaProvider();
    case "card":
      return new CardGatewayProvider();
    case "safepay":
      return new SafepayProvider();
    default:
      throw new Error(`Unknown payment provider: ${name}`);
  }
}

export * from "./types";
export * from "./config";
export * from "./schemas";
export * from "./utils";