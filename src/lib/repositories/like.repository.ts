import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withDeadlockRetry } from "@/lib/prisma-retry";

async function lockPost(tx: Prisma.TransactionClient, postId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM posts WHERE id = ${postId} FOR UPDATE`);
}

export async function toggleLike(userId: string, postId: string) {
  // Likeの作成はPostへの共有ロックを取るため、先にPost行を排他ロックする。これにより
  // 子行の作成後にカウンタ更新へロック昇格する競合を防ぐ。
  return withDeadlockRetry(() =>
    prisma.$transaction(async (tx) => {
      await lockPost(tx, postId);
      const { count } = await tx.like.deleteMany({ where: { userId, postId } });
      if (count > 0) {
        // deleteMany自体は成功しているため、非正規化カウンタの更新もこのトランザクション内で行い、
        // 万一カウンタ更新が失敗した場合はlikeの削除ごとロールバックしてlikesテーブルとの不整合を防ぐ
        await tx.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
        return { liked: false };
      }

      try {
        await tx.like.create({ data: { userId, postId } });
        await tx.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
        return { liked: true };
      } catch (e) {
        // 同時に別リクエストが先にcreateしていた場合（P2002: 一意制約違反）は、
        // そちらのトランザクションで既にカウンタも加算済みのため、ここでは何もせず成功扱いにする
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          return { liked: true };
        }
        throw e;
      }
    })
  );
}
