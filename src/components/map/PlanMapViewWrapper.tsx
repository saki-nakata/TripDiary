"use client";

import dynamic from "next/dynamic";
import type { PlanMapSpot } from "@/components/map/PlanMapView";

const PlanMapViewDynamic = dynamic(
  () => import("@/components/map/PlanMapView").then((m) => m.PlanMapView),
  { ssr: false, loading: () => <div className="h-80 w-full rounded-xl bg-zinc-100 animate-pulse" /> }
);

type Props = {
  spots: PlanMapSpot[];
  className?: string;
};

export function PlanMapViewWrapper(props: Props) {
  return <PlanMapViewDynamic {...props} />;
}
