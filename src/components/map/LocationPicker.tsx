"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  label?: string;
};

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function PinMap({
  center,
  zoom,
  lat,
  lng,
  onClick,
  className,
}: {
  center: [number, number];
  zoom: number;
  lat: number | null;
  lng: number | null;
  onClick: (lat: number, lng: number) => void;
  className: string;
}) {
  return (
    <MapContainer center={center} zoom={zoom} className={className} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onClick} />
      {lat != null && lng != null && <Marker position={[lat, lng]} icon={defaultIcon} />}
    </MapContainer>
  );
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`
  );
  if (!res.ok) throw new Error();
  const data = await res.json();
  return data.display_name ?? `${lat}, ${lng}`;
}

export function LocationPicker({ lat, lng, onChange, label }: Props) {
  const [expanded, setExpanded] = useState(false);

  const {
    data: address,
    isFetching: loadingAddress,
    isError,
  } = useQuery({
    queryKey: ["reverse-geocode", lat, lng],
    queryFn: () => reverseGeocode(lat!, lng!),
    enabled: lat != null && lng != null,
    retry: false,
  });
  const fallbackAddress = lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : null;
  const displayAddress = isError ? fallbackAddress : address;

  function handleMapClick(clickedLat: number, clickedLng: number) {
    onChange(clickedLat, clickedLng);
  }

  function handleReset() {
    onChange(null, null);
  }

  useEffect(() => {
    if (!expanded) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const center: [number, number] = lat != null && lng != null ? [lat, lng] : [35.681236, 139.767125];
  const zoom = lat != null ? 14 : 5;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        {label ? <label className="block text-base font-bold text-zinc-700">{label}</label> : <span />}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="relative z-10 -mb-3 bg-sky-50 text-xs font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-100 border border-sky-200 rounded-full px-2.5 py-1 transition-colors"
        >
          🗺️地図拡大表示🔍
        </button>
      </div>
      <PinMap
        center={center}
        zoom={zoom}
        lat={lat}
        lng={lng}
        onClick={handleMapClick}
        className="h-64 w-full rounded-xl border border-sky-200 z-0"
      />

      {lat != null && lng != null && (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <span>📍 {loadingAddress ? "取得中…" : displayAddress}</span>
          <button
            type="button"
            onClick={handleReset}
            className="text-zinc-400 hover:text-zinc-600"
            aria-label="位置情報をリセット"
          >
            ×
          </button>
        </div>
      )}

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div className="relative w-full max-w-4xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute -top-10 right-0 text-white text-3xl leading-none hover:opacity-70 transition-opacity"
              aria-label="閉じる"
            >
              ✕
            </button>
            <PinMap
              center={center}
              zoom={zoom}
              lat={lat}
              lng={lng}
              onClick={handleMapClick}
              className="h-full w-full rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
