"use client";

import dynamic from "next/dynamic";

const LocationPickerDynamic = dynamic(
  () => import("@/components/map/LocationPicker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="h-64 w-full rounded-xl bg-zinc-100 animate-pulse" /> }
);

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  label?: string;
};

export function LocationPickerWrapper(props: Props) {
  return <LocationPickerDynamic {...props} />;
}
