import { bucket, buildBatch, track, flush } from "../src/utils/analytics";

describe("analytics", () => {
  it("buckets counts so exact numbers never leave the phone", () => {
    expect([0, 1, 3, 12, 80, 500].map(bucket)).toEqual(["0", "1", "2-5", "6-20", "21-100", "100+"]);
  });

  it("sends personless events without GeoIP, and properties cannot override that", () => {
    const body = buildBatch(
      [{ event: "moment_logged", timestamp: "2026-10-30T10:00:00Z", properties: { type: "call", $process_person_profile: true } }],
      "anon-123"
    );
    const props = body.batch[0].properties;
    expect(props.distinct_id).toBe("anon-123");
    expect(props.$process_person_profile).toBe(false);
    expect(props.$geoip_disable).toBe(true);
    expect(props.type).toBe("call");
  });

  it("does nothing without a key or consent", async () => {
    const fetchMock = jest.fn();
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    track("app_open");
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
