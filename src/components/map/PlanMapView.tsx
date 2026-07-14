"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

export type PlanMapSpot = {
  lat: number;
  lng: number;
  label: string;
  order: number;
};

type Props = {
  spots: PlanMapSpot[];
  className?: string;
};

export function PlanMapView({ spots, className }: Props) {
  if (spots.length === 0) return null;

  const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng]));
  const center = bounds.getCenter();

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      bounds={spots.length > 1 ? bounds : undefined}
      boundsOptions={{ padding: [32, 32] }}
      zoom={14}
      className={className ?? "h-80 w-full rounded-xl border border-sky-200 z-0"}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {spots.map((spot, i) => (
        <Marker key={i} position={[spot.lat, spot.lng]} icon={defaultIcon}>
          <Popup>
            {spot.order}. {spot.label}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
