// configs/paypal.js
import paypal from "@paypal/checkout-server-sdk";

function environment() {
  return new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
}

export function client() {
  return new paypal.core.PayPalHttpClient(environment());
}
