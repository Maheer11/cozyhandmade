import { describe, it, expect } from "vitest";
import { decideDuplicateDeliveryAction, STUCK_PROCESSING_THRESHOLD_MS } from "@/lib/checkout/webhookDedupe";

// Pure logic, no DB/Stripe — runs on every push, not gated behind
// hasLiveTestCredentials.
describe("decideDuplicateDeliveryAction", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("short-circuits as done regardless of how recent updated_at is", () => {
    expect(decideDuplicateDeliveryAction("done", now, now)).toBe("short_circuit_done");
    const longAgo = new Date(now.getTime() - 10 * STUCK_PROCESSING_THRESHOLD_MS);
    expect(decideDuplicateDeliveryAction("done", longAgo, now)).toBe("short_circuit_done");
  });

  it("returns conflict_retry_later for a recent processing row", () => {
    const justNow = new Date(now.getTime() - 1000); // 1s ago
    expect(decideDuplicateDeliveryAction("processing", justNow, now)).toBe("conflict_retry_later");
  });

  it("returns conflict_retry_later right up to (but not including) the stale threshold", () => {
    const almostStale = new Date(now.getTime() - (STUCK_PROCESSING_THRESHOLD_MS - 1));
    expect(decideDuplicateDeliveryAction("processing", almostStale, now)).toBe("conflict_retry_later");
  });

  it("returns takeover exactly at the stale threshold", () => {
    const exactlyStale = new Date(now.getTime() - STUCK_PROCESSING_THRESHOLD_MS);
    expect(decideDuplicateDeliveryAction("processing", exactlyStale, now)).toBe("takeover");
  });

  it("returns takeover for a processing row well past the stale threshold", () => {
    const wayStale = new Date(now.getTime() - 10 * STUCK_PROCESSING_THRESHOLD_MS);
    expect(decideDuplicateDeliveryAction("processing", wayStale, now)).toBe("takeover");
  });

  it("respects a custom staleAfterMs override", () => {
    const oneMinuteAgo = new Date(now.getTime() - 60_000);
    expect(decideDuplicateDeliveryAction("processing", oneMinuteAgo, now, 30_000)).toBe("takeover");
    expect(decideDuplicateDeliveryAction("processing", oneMinuteAgo, now, 120_000)).toBe("conflict_retry_later");
  });
});
