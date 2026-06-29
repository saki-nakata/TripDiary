import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { nickname, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "このメールアドレスはすでに使用されています" },
      { status: 409 }
    );
  }

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.create({
    data: { nickname, email, password: hashedPassword },
    select: { id: true, nickname: true, email: true },
  });

  return NextResponse.json(user, { status: 201 });
}
