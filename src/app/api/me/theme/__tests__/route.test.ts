import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/user.service", () => ({
  syncThemeOnAuthBoundaryService: vi.fn(),
  updateThemePreferenceService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { syncThemeOnAuthBoundaryService, updateThemePreferenceService } from "@/lib/services/user.service";
import { POST, PATCH } from "@/app/api/me/theme/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(method: string, { cookie, body }: { cookie?: string; body?: unknown } = {}) {
  return new NextRequest(
    new Request("http://localhost/api/me/theme", {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        "Content-Type": "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  );
}

describe("POST /api/me/theme", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401、同期処理は呼ばれない", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(makeRequest("POST"));

    expect(res.status).toBe(401);
    expect(syncThemeOnAuthBoundaryService).not.toHaveBeenCalled();
  });

  it("認証済み_Cookie未設定時はsystemとして同期しレスポンスCookieを設定する", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(syncThemeOnAuthBoundaryService).mockResolvedValue("system");

    const res = await POST(makeRequest("POST"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ theme: "system" });
    expect(syncThemeOnAuthBoundaryService).toHaveBeenCalledWith(USER_ID, "system");
    expect(res.cookies.get("theme")?.value).toBe("system");
  });

  it("認証済み_Cookieがdark_検証済み値として渡される", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(syncThemeOnAuthBoundaryService).mockResolvedValue("dark");

    const res = await POST(makeRequest("POST", { cookie: "theme=dark" }));

    expect(res.status).toBe(200);
    expect(syncThemeOnAuthBoundaryService).toHaveBeenCalledWith(USER_ID, "dark");
  });

  it("認証済み_Cookieが不正値_systemとして扱われる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(syncThemeOnAuthBoundaryService).mockResolvedValue("system");

    await POST(makeRequest("POST", { cookie: "theme=invalid" }));

    expect(syncThemeOnAuthBoundaryService).toHaveBeenCalledWith(USER_ID, "system");
  });
});

describe("PATCH /api/me/theme", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401、更新処理は呼ばれない", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", { body: { theme: "dark" } }));

    expect(res.status).toBe(401);
    expect(updateThemePreferenceService).not.toHaveBeenCalled();
  });

  it("不正な値(light/dark/system以外)は400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await PATCH(makeRequest("PATCH", { body: { theme: "blue" } }));

    expect(res.status).toBe(400);
    expect(updateThemePreferenceService).not.toHaveBeenCalled();
  });

  it("themeフィールド欠落は400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await PATCH(makeRequest("PATCH", { body: {} }));

    expect(res.status).toBe(400);
  });

  it("正常なリクエスト_DB更新しレスポンスCookieを設定する", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(updateThemePreferenceService).mockResolvedValue(undefined);

    const res = await PATCH(makeRequest("PATCH", { body: { theme: "dark" } }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ theme: "dark" });
    expect(updateThemePreferenceService).toHaveBeenCalledWith(USER_ID, "dark");
    expect(res.cookies.get("theme")?.value).toBe("dark");
  });
});
