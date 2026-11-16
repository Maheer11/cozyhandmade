// Hearts on the mobile hero carousel: request validation and the API route,
// with the database layer mocked. Nothing touches Supabase.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { isUuid, likeKey, parseLikeRequest } from "@/lib/likes";

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const DEVICE = "0b1c2d3e-4f50-4a6b-8c7d-8e9f0a1b2c3d";

describe("parseLikeRequest", () => {
  it("accepts a valid like and lower-cases the ids", () => {
    expect(parseLikeRequest({ source: "product", id: ID.toUpperCase(), deviceId: DEVICE, liked: true })).toEqual({
      source: "product",
      id: ID,
      deviceId: DEVICE,
      liked: true,
    });
  });

  it.each([
    ["no body", null],
    ["unknown source", { source: "review", id: ID, deviceId: DEVICE, liked: true }],
    ["bad item id", { source: "product", id: "1; drop table", deviceId: DEVICE, liked: true }],
    ["bad device id", { source: "product", id: ID, deviceId: "abc", liked: true }],
    ["liked not boolean", { source: "product", id: ID, deviceId: DEVICE, liked: "yes" }],
  ])("rejects %s", (_label, body) => {
    expect(parseLikeRequest(body)).toBeNull();
  });

  it("builds one key per item", () => {
    expect(likeKey("featured_piece", ID)).toBe(`featured_piece:${ID}`);
    expect(isUuid(ID)).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});

describe("POST /api/likes", () => {
  const setLike = vi.fn();

  beforeEach(() => {
    vi.resetModules(); // fresh rate limiter per test
    setLike.mockReset();
    vi.doMock("@/lib/likes-server", () => ({ setLike }));
  });

  async function post(body: unknown, ip = "1.2.3.4") {
    const { POST } = await import("@/app/api/likes/route");
    return POST(
      new Request("http://localhost/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify(body),
      }),
    );
  }

  it("saves a like and returns the new total", async () => {
    setLike.mockResolvedValue({ ok: true, count: 7 });
    const res = await post({ source: "product", id: ID, deviceId: DEVICE, liked: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ liked: true, count: 7 });
    expect(setLike).toHaveBeenCalledWith("product", ID, DEVICE, true);
  });

  it("rejects an invalid body without touching the database", async () => {
    const res = await post({ source: "product", id: "nope", deviceId: DEVICE, liked: true });
    expect(res.status).toBe(400);
    expect(setLike).not.toHaveBeenCalled();
  });

  it("returns 404 for an item that doesn't exist", async () => {
    setLike.mockResolvedValue({ ok: false, reason: "not_found" });
    const res = await post({ source: "product", id: ID, deviceId: DEVICE, liked: true });
    expect(res.status).toBe(404);
  });

  it("returns 503 while likes are unavailable (e.g. migration not applied)", async () => {
    setLike.mockResolvedValue({ ok: false, reason: "unavailable" });
    const res = await post({ source: "product", id: ID, deviceId: DEVICE, liked: false });
    expect(res.status).toBe(503);
  });

  it("rate-limits one IP after 30 requests a minute", async () => {
    setLike.mockResolvedValue({ ok: true, count: 1 });
    const { POST } = await import("@/app/api/likes/route");
    const make = () =>
      POST(
        new Request("http://localhost/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
          body: JSON.stringify({ source: "product", id: ID, deviceId: DEVICE, liked: true }),
        }),
      );
    for (let i = 0; i < 30; i++) expect((await make()).status).toBe(200);
    expect((await make()).status).toBe(429);
  });
});
