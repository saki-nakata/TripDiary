// env未設定でも常にimportできる（05-mobile-guest.demo.spec.tsからもimportされるため、
// requiredEnvをトップレベルで呼ぶ定数はここに置かない。DEMO_USER・アップロード画像パス等は
// demoAuth.ts / uploadConstants.ts を参照）。

export const DEMO_NICKNAME = "TripDiary公式デモ";
