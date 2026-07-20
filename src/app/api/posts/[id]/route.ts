import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findPostByIdService, updatePostService, deletePostService } from "@/lib/services/post.service";
import { postSchema } from "@/lib/validations/post";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

async function handleGET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    const post = await findPostByIdService(id, session?.user?.id);
    return NextResponse.json(post);
  } catch (e) {
    return handleApiError(e);
  }
}

async function handlePUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const updated = await updatePostService(session.user.id, id, parsed.data);
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

async function handleDELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    await deletePostService(session.user.id, id);
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
export const PUT = withRequestLogging(handlePUT);
export const DELETE = withRequestLogging(handleDELETE);
