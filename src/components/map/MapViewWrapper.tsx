"use client";

import dynamic from "next/dynamic";

const MapViewDynamic = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="h-64 w-full rounded-xl bg-zinc-100 animate-pulse" /> }
);

type Props = {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
};

export function MapViewWrapper(props: Props) {
  return <MapViewDynamic {...props} />;
}
