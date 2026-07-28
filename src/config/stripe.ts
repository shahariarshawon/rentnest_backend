import Stripe from "stripe";
import { env } from "./env.js";

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25" as unknown as Stripe.LatestApiVersion
    })
  : null;
