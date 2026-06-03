import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (stripeSingleton) return stripeSingleton;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  stripeSingleton = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
  return stripeSingleton;
}

