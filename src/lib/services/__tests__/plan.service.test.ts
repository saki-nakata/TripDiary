import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "@/lib/errors";

vi.mock("@/lib/repositories/plan.repository", () => ({
  findPlanAuthorId: vi.fn(),
  findPlansByUserId: vi.fn(),
  findPlanById: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  setPlanCompleted: vi.fn(),
  findExistingPostIds: vi.fn(),
  countActivePlansByUser: vi.fn(),
}));

import {
  findPlanAuthorId,
  findPlansByUserId,
  findPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  setPlanCompleted,
  findExistingPostIds,
  countActivePlansByUser,
} from "@/lib/repositories/plan.repository";
import {
  findPlansByUserIdService,
  countActivePlansByUserService,
  findPlanByIdService,
  createPlanService,
  updatePlanService,
  deletePlanService,
  setPlanCompletedService,
} from "@/lib/services/plan.service";

function makeP2025() {
  return new Prisma.PrismaClientKnownRequestError("No record found", { code: "P2025", clientVersion: "6.19.3" });
}

const USER_ID = "user-1";
const OTHER_USER_ID = "other-user-2";
const PLAN_ID = "plan-1";

describe("findPlansByUserIdService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("repositoryの結果をそのまま返す", async () => {
    const plans = [{ id: PLAN_ID }];
    vi.mocked(findPlansByUserId).mockResolvedValue(plans as never);

    const result = await findPlansByUserIdService(USER_ID);

    expect(findPlansByUserId).toHaveBeenCalledWith(USER_ID);
    expect(result).toBe(plans);
  });
});

describe("countActivePlansByUserService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("repositoryの結果をそのまま返す", async () => {
    vi.mocked(countActivePlansByUser).mockResolvedValue(3);

    const result = await countActivePlansByUserService(USER_ID);

    expect(countActivePlansByUser).toHaveBeenCalledWith(USER_ID);
    expect(result).toBe(3);
  });
});

describe("findPlanByIdService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないプランID_NotFoundError", async () => {
    vi.mocked(findPlanById).mockResolvedValue(null);

    await expect(findPlanByIdService(USER_ID, PLAN_ID)).rejects.toThrow(NotFoundError);
  });

  it("他人のプラン_ForbiddenError", async () => {
    vi.mocked(findPlanById).mockResolvedValue({ id: PLAN_ID, userId: OTHER_USER_ID } as never);

    await expect(findPlanByIdService(USER_ID, PLAN_ID)).rejects.toThrow(ForbiddenError);
  });

  it("本人のプラン_プランを返す", async () => {
    vi.mocked(findPlanById).mockResolvedValue({ id: PLAN_ID, userId: USER_ID } as never);

    const result = await findPlanByIdService(USER_ID, PLAN_ID);

    expect(result).toEqual({ id: PLAN_ID, userId: USER_ID });
  });
});

describe("createPlanService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── budget自動集計 ───
  it("budgetBreakdown複数項目_合計がbudgetとしてrepositoryに渡される", async () => {
    vi.mocked(createPlan).mockResolvedValue({ id: PLAN_ID } as never);

    await createPlanService(USER_ID, {
      title: "旅行",
      budgetBreakdown: [
        { label: "交通費", amount: 20000 },
        { label: "宿泊費", amount: 30000 },
      ],
    });

    expect(createPlan).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ budget: 50000 })
    );
  });

  it("budgetBreakdown空項目（金額0かつラベル空）_除外されbudgetはnull(境界値)", async () => {
    vi.mocked(createPlan).mockResolvedValue({ id: PLAN_ID } as never);

    await createPlanService(USER_ID, {
      title: "旅行",
      budgetBreakdown: [{ label: "", amount: 0 }],
    });

    // withComputedBudgetは常に実際のfiltered配列（空配列を含む）をそのまま渡す（第4ラウンドレビューA-2対応）。
    // 以前はここでundefinedへ変換していたが、update時にPrismaが「未変更」と解釈し予算内訳を
    // 全削除できないバグの原因だったため、undefinedへの変換をやめた
    expect(createPlan).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ budget: null, budgetBreakdown: [] })
    );
  });

  it("budgetBreakdown未指定_budgetはnull", async () => {
    vi.mocked(createPlan).mockResolvedValue({ id: PLAN_ID } as never);

    await createPlanService(USER_ID, { title: "旅行" });

    expect(createPlan).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ budget: null }));
  });

  // ─── spots(post)存在確認 ───
  it("spotsに存在しない投稿IDが含まれる_ValidationErrorかつrepository作成が呼ばれない", async () => {
    vi.mocked(findExistingPostIds).mockResolvedValue(["exists-1"]);

    await expect(
      createPlanService(USER_ID, {
        title: "旅行",
        spots: [{ type: "post", postId: "exists-1" }, { type: "post", postId: "not-exist-2" }],
      })
    ).rejects.toThrow(ValidationError);
    expect(createPlan).not.toHaveBeenCalled();
  });

  it("spotsのpostが全て存在する_正常に作成される", async () => {
    vi.mocked(findExistingPostIds).mockResolvedValue(["exists-1", "exists-2"]);
    vi.mocked(createPlan).mockResolvedValue({ id: PLAN_ID } as never);

    await createPlanService(USER_ID, {
      title: "旅行",
      spots: [{ type: "post", postId: "exists-1" }, { type: "post", postId: "exists-2" }],
    });

    expect(createPlan).toHaveBeenCalled();
  });

  it("spotsがfreeタイプのみ_投稿存在確認をスキップして作成される", async () => {
    vi.mocked(createPlan).mockResolvedValue({ id: PLAN_ID } as never);

    await createPlanService(USER_ID, {
      title: "旅行",
      spots: [{ type: "free", title: "自由入力スポット", location: "東京都" }],
    });

    expect(findExistingPostIds).not.toHaveBeenCalled();
    expect(createPlan).toHaveBeenCalled();
  });

  it("spots未指定_存在確認をスキップして作成される(境界値)", async () => {
    vi.mocked(createPlan).mockResolvedValue({ id: PLAN_ID } as never);

    await createPlanService(USER_ID, { title: "旅行" });

    expect(findExistingPostIds).not.toHaveBeenCalled();
    expect(createPlan).toHaveBeenCalled();
  });
});

describe("updatePlanService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないプランID_NotFoundError", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(null);

    await expect(updatePlanService(USER_ID, PLAN_ID, { title: "更新", completed: false, version: 0 })).rejects.toThrow(
      NotFoundError
    );
    expect(updatePlan).not.toHaveBeenCalled();
  });

  it("他人のプラン_ForbiddenErrorかつrepository更新が呼ばれない", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(OTHER_USER_ID);

    await expect(updatePlanService(USER_ID, PLAN_ID, { title: "更新", completed: false, version: 0 })).rejects.toThrow(
      ForbiddenError
    );
    expect(updatePlan).not.toHaveBeenCalled();
  });

  it("本人のプラン_正常に更新される（completed・versionもrepositoryに渡る）", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(USER_ID);
    vi.mocked(updatePlan).mockResolvedValue({ id: PLAN_ID } as never);

    await updatePlanService(USER_ID, PLAN_ID, { title: "更新", completed: true, version: 3 });

    expect(updatePlan).toHaveBeenCalledWith(PLAN_ID, expect.objectContaining({ title: "更新", completed: true }), 3);
  });

  it("他リクエストとの更新競合(P2025)_ConflictError（GATE-05）", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(USER_ID);
    vi.mocked(updatePlan).mockRejectedValue(makeP2025());

    await expect(updatePlanService(USER_ID, PLAN_ID, { title: "更新", completed: false, version: 0 })).rejects.toThrow(
      ConflictError
    );
  });

  it("budgetBreakdownを空配列で更新_undefinedに変換されず空配列のままrepositoryへ渡る（第4ラウンドレビューA-2の回帰防止）", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(USER_ID);
    vi.mocked(updatePlan).mockResolvedValue({ id: PLAN_ID } as never);

    await updatePlanService(USER_ID, PLAN_ID, { title: "更新", completed: false, version: 0, budgetBreakdown: [] });

    // undefinedへ変換されるとRepository層でPrismaが「未変更」と解釈し、DB上の予算内訳が
    // 削除前のまま残ってしまう（A-2）。空配列のまま渡ることでRepository層がPrisma.DbNullへ変換できる
    expect(updatePlan).toHaveBeenCalledWith(
      PLAN_ID,
      expect.objectContaining({ budget: null, budgetBreakdown: [] }),
      0
    );
  });
});

describe("deletePlanService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないプランID_NotFoundError", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(null);

    await expect(deletePlanService(USER_ID, PLAN_ID)).rejects.toThrow(NotFoundError);
    expect(deletePlan).not.toHaveBeenCalled();
  });

  it("他人のプラン_ForbiddenError", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(OTHER_USER_ID);

    await expect(deletePlanService(USER_ID, PLAN_ID)).rejects.toThrow(ForbiddenError);
    expect(deletePlan).not.toHaveBeenCalled();
  });

  it("本人のプラン_repositoryの削除が呼ばれる", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(USER_ID);
    vi.mocked(deletePlan).mockResolvedValue({} as never);

    await deletePlanService(USER_ID, PLAN_ID);

    expect(deletePlan).toHaveBeenCalledWith(PLAN_ID);
  });
});

describe("setPlanCompletedService（目標状態を受け取る冪等なset、DR-01選択肢1）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないプランID_NotFoundError", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(null);

    await expect(setPlanCompletedService(USER_ID, PLAN_ID, true, 0)).rejects.toThrow(NotFoundError);
    expect(setPlanCompleted).not.toHaveBeenCalled();
  });

  it("他人のプラン_ForbiddenError", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(OTHER_USER_ID);

    await expect(setPlanCompletedService(USER_ID, PLAN_ID, true, 0)).rejects.toThrow(ForbiddenError);
    expect(setPlanCompleted).not.toHaveBeenCalled();
  });

  it("目標状態trueを指定_completedがtrueに設定される", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(USER_ID);
    vi.mocked(setPlanCompleted).mockResolvedValue({ id: PLAN_ID, completed: true } as never);

    await setPlanCompletedService(USER_ID, PLAN_ID, true, 5);

    expect(setPlanCompleted).toHaveBeenCalledWith(PLAN_ID, true, 5);
  });

  it("目標状態falseを指定_completedがfalseに設定される", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(USER_ID);
    vi.mocked(setPlanCompleted).mockResolvedValue({ id: PLAN_ID, completed: false } as never);

    await setPlanCompletedService(USER_ID, PLAN_ID, false, 5);

    expect(setPlanCompleted).toHaveBeenCalledWith(PLAN_ID, false, 5);
  });

  it("他リクエストとの更新競合(P2025)_ConflictError", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(USER_ID);
    vi.mocked(setPlanCompleted).mockRejectedValue(makeP2025());

    await expect(setPlanCompletedService(USER_ID, PLAN_ID, true, 0)).rejects.toThrow(ConflictError);
  });
});
