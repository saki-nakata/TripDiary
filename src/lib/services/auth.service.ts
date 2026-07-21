import { findUserByEmail, createUser } from "@/lib/repositories/user.repository";
import { ConflictError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";

export async function signupService(data: { nickname: string; email: string; password: string }) {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new ConflictError("このメールアドレスはすでに使用されています");
  }

  const hashedPassword = await hashPassword(data.password);
  return createUser({ nickname: data.nickname, email: data.email, password: hashedPassword });
}
