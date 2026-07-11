"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

// Fix default marker icons in webpack/Next.js
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
  lat: number;
  lng: number;
  label?: string;
  heading?: string;
  className?: string;
};

export function MapView({ lat, lng, label, heading, className }: Props) {
  const [expanded, setExpanded] = useState(false);

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

  return (
    <>
      <div className="flex items-end justify-between">
        {heading ? <p className="text-base font-semibold text-zinc-700">{heading}</p> : <span />}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="relative z-10 -mb-3 bg-sky-50 text-xs font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-100 border border-sky-200 rounded-full px-2.5 py-1 transition-colors"
        >
          🗺️地図拡大表示🔍
        </button>
      </div>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        className={className ?? "h-64 w-full rounded-xl border border-sky-200"}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={defaultIcon}>
          {label && <Popup>{label}</Popup>}
        </Marker>
      </MapContainer>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div className="relative w-full max-w-4xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:opacity-70 transition-opacity"
              aria-label="閉じる"
            >
              <TwemojiIcon codepoint="2716" alt="閉じる" className="h-4 w-4" />
            </button>
            <MapContainer center={[lat, lng]} zoom={14} className="h-full w-full rounded-xl" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[lat, lng]} icon={defaultIcon}>
                {label && <Popup>{label}</Popup>}
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
    </>
  );
}
