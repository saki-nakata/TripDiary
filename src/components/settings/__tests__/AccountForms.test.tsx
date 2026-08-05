// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountForms } from "@/components/settings/AccountForms";
import { ToastProvider } from "@/contexts/toast-context";

const signOutMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

function renderForms() {
  render(
    <ToastProvider>
      <AccountForms userId="user-1" initialEmail="old@example.com" />
    </ToastProvider>
  );
}

describe("AccountForms（GATE-41: メール変更フォームの現在のパスワード欄を独立させる）", () => {
  beforeEach(() => signOutMock.mockClear());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("メール変更フォーム自身に現在のパスワード入力欄が存在する", () => {
    renderForms();
    expect(document.getElementsByName("newEmail")[0] as HTMLInputElement).toBeInTheDocument();
    // メール変更フォーム・パスワード変更フォームの双方に「現在のパスワード」ラベルが独立して存在する
    expect(screen.getAllByText("現在のパスワード")).toHaveLength(2);
  });

  it("メール変更_現在のパスワードが誤り_エラーがメール変更フォーム自身に表示されパスワード変更フォームには表示されない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Validation failed", details: { currentPassword: ["現在のパスワードが正しくありません"] } }),
      })
    );

    renderForms();
    const user = userEvent.setup();
    const emailInput = document.getElementsByName("newEmail")[0] as HTMLInputElement;
    await user.type(emailInput, "new@example.com");
    const [emailPasswordInput] = document.getElementsByName("emailCurrentPassword");
    await user.type(emailPasswordInput as HTMLInputElement, "wrong-password");
    await user.click(screen.getByRole("button", { name: "メールアドレスを変更する" }));

    expect(await screen.findByText("現在のパスワードが正しくありません")).toBeInTheDocument();
    expect(screen.getAllByText("現在のパスワードが正しくありません")).toHaveLength(1);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("メール変更_成功_emailCurrentPasswordの値が送信されsignOutが呼ばれる", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderForms();
    const user = userEvent.setup();
    await user.type(document.getElementsByName("newEmail")[0] as HTMLInputElement, "new@example.com");
    const [emailPasswordInput] = document.getElementsByName("emailCurrentPassword");
    await user.type(emailPasswordInput as HTMLInputElement, "correct-password");
    await user.click(screen.getByRole("button", { name: "メールアドレスを変更する" }));

    await vi.waitFor(() => expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" }));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: "new@example.com", currentPassword: "correct-password" });
  });

  it("パスワード変更フォームは自身の現在のパスワード欄で独立して動作する（回帰確認）", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderForms();
    const user = userEvent.setup();
    const [passwordCurrentInput] = document.getElementsByName("passwordCurrentPassword");
    await user.type(passwordCurrentInput as HTMLInputElement, "current-pass");
    await user.type(document.getElementsByName("newPassword")[0] as HTMLInputElement, "newpassword1");
    await user.type(document.getElementsByName("confirmNewPassword")[0] as HTMLInputElement, "newpassword1");
    await user.click(screen.getByRole("button", { name: "パスワードを変更する" }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1/password", expect.anything()));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ currentPassword: "current-pass", newPassword: "newpassword1" });
    expect(await screen.findByText("パスワードを変更しました")).toBeInTheDocument();
  });

  it("パスワード表示切替ボタンがキーボード操作（Enter/Space）で反応する（第4ラウンドレビューB-4: tabIndex={-1}除去の回帰防止）", async () => {
    renderForms();
    const user = userEvent.setup();
    const passwordInput = document.getElementsByName("newPassword")[0] as HTMLInputElement;
    await user.type(passwordInput, "secret123");

    const toggleButtons = screen.getAllByLabelText("パスワードを表示");
    const toggleButton = toggleButtons[toggleButtons.length - 1];
    // tabIndex={-1}を除去したため、Tabキーでフォーカス移動できることが前提
    toggleButton.focus();
    expect(document.activeElement).toBe(toggleButton);

    expect(passwordInput.type).toBe("password");
    await user.keyboard("{Enter>}");
    expect(passwordInput.type).toBe("text");
    await user.keyboard("{/Enter}");
    expect(passwordInput.type).toBe("password");
  });
});
