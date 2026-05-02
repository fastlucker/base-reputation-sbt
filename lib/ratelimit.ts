import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export const scoreLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
});

export const attestationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
});