"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useToast } from "@/contexts/toast-context";
import { emailChangeSchema, passwordChangeSchema } from "@/lib/validations/user";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  userId: string;
  initialEmail: string;
};

function PasswordInput({
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  disabled,
  dimmed,
}: {
  name?: string;
  value: string;
  onChange?: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  /** 編集は可能だが、非活性フィールドと同じ配色（背景・文字色）に見せる */
  dimmed?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full border rounded-lg px-3 py-2 pr-11 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30 ${disabled || dimmed ? "bg-zinc-50 text-zinc-400" : ""} ${error ? "border-red-400" : "border-zinc-200"}`}
      />
      {hasValue && (
        <button
          type="button"
          onMouseDown={() => setVisible(true)}
          onMouseUp={() => setVisible(false)}
          onMouseLeave={() => setVisible(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 select-none"
          tabIndex={-1}
          aria-label={visible ? "パスワードを隠す" : "パスワードを表示"}
        >
          {visible ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

export function AccountForms({ userId, initialEmail }: Props) {
  const { showToast } = useToast();

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailErrors({});

    const parsed = emailChangeSchema.safeParse({ email: newEmail, currentPassword });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setEmailErrors({
        email: fieldErrors.email?.[0] ?? "",
        currentPassword: fieldErrors.currentPassword?.[0] ?? "",
      });
      return;
    }

    setIsEmailSubmitting(true);
    try {
      const res = await fetch(`/api/users/${userId}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 400 && err.error?.currentPassword) {
          setEmailErrors({ currentPassword: err.error.currentPassword[0] });
          return;
        }
        if (res.status === 409) {
          setEmailErrors({ email: "このメールアドレスはすでに使用されています" });
          return;
        }
        throw new Error();
      }

      showToast("メールアドレスを変更しました。再度ログインしてください。", "success");
      await signOut({ callbackUrl: "/login" });
    } catch {
      showToast("エラーが発生しました", "error");
    } finally {
      setIsEmailSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordErrors({});

    const parsed = passwordChangeSchema.safeParse({ currentPassword, newPassword, confirmNewPassword });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setPasswordErrors({
        currentPassword: fieldErrors.currentPassword?.[0] ?? "",
        newPassword: fieldErrors.newPassword?.[0] ?? "",
        confirmNewPassword: fieldErrors.confirmNewPassword?.[0] ?? "",
      });
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 400 && err.error?.currentPassword) {
          setPasswordErrors({ currentPassword: err.error.currentPassword[0] });
          return;
        }
        throw new Error();
      }

      showToast("パスワードを変更しました", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      showToast("エラーが発生しました", "error");
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  return (
    <div className="space-y-16">
      {/* メールアドレス変更 */}
      <form onSubmit={handleEmailSubmit} className="space-y-6 max-w-xl mx-auto">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
          <TwemojiIcon codepoint="1f4e9" className="h-5 w-5" /> メールアドレス変更
        </h2>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">現在のメールアドレス</label>
          <input
            type="email"
            value={initialEmail}
            disabled
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-zinc-50 text-zinc-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            変更したいメールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            name="newEmail"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30 ${emailErrors.email ? "border-red-400" : "border-zinc-200"}`}
          />
          {emailErrors.email && <p className="text-xs text-red-500 mt-1">{emailErrors.email}</p>}
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isEmailSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50"
          >
            メールアドレスを変更する
          </button>
        </div>
      </form>

      {/* パスワード変更 */}
      <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-xl mx-auto">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
          🔑 パスワード変更
        </h2>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            現在のパスワード <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            name="currentPassword"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            placeholder="パスワードを入力してください"
            error={emailErrors.currentPassword || passwordErrors.currentPassword}
          />
          {(emailErrors.currentPassword || passwordErrors.currentPassword) && (
            <p className="text-xs text-red-500 mt-1">{emailErrors.currentPassword || passwordErrors.currentPassword}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            新しいパスワード <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            name="newPassword"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            placeholder="8文字以上で入力してください"
            error={passwordErrors.newPassword}
          />
          {passwordErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            新しいパスワード（確認） <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            name="confirmNewPassword"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            autoComplete="new-password"
            placeholder="もう一度入力してください"
            error={passwordErrors.confirmNewPassword}
          />
          {passwordErrors.confirmNewPassword && (
            <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmNewPassword}</p>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isPasswordSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50"
          >
            パスワードを変更する
          </button>
        </div>
      </form>
    </div>
  );
}
