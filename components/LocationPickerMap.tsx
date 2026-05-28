"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Coords = { lat: number; lng: number };

// Solid orange dot — no emoji per design rules. The visible pulse ring
// signals "this is draggable" without leaning on a clipart marker.
const PICKER_ICON = L.divIcon({
  html: `
    <div style="position:relative;width:34px;height:34px">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(249,115,22,0.22);animation:fs-pin-pulse 1.6s ease-out infinite"></div>
      <div style="position:absolute;inset:7px;border-radius:50%;background:#F97316;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.28)"></div>
    </div>
    <style>@keyframes fs-pin-pulse{0%{transform:scale(0.6);opacity:0.9}100%{transform:scale(1.4);opacity:0}}</style>
  `,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

type Props = {
  lat: number;
  lng: number;
  onChange: (coords: Coords) => void;
  height?: string;
};

export default function LocationPickerMap({
  lat,
  lng,
  onChange,
  height = "320px",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!rootRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }

    const map = L.map(rootRef.current, {
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      touchZoom: true,
      doubleClickZoom: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng], {
      icon: PICKER_ICON,
      draggable: true,
      autoPan: true,
    }).addTo(map);
    markerRef.current = marker;

    map.setView([lat, lng], 17);
    // Don't fire onChange on mount — parent already knows the initial
    // value (it passed it in). Firing here would mark a "user picked
    // the default" state when really the user hasn't interacted yet,
    // breaking the "ยังไม่ปักหมุด" guard on the merchant signup form.

    marker.on("dragend", () => {
      const next = marker.getLatLng();
      onChangeRef.current({ lat: next.lat, lng: next.lng });
    });

    map.on("click", (event) => {
      marker.setLatLng(event.latlng);
      onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div
      ref={rootRef}
      style={{ height, width: "100%", borderRadius: "14px", overflow: "hidden" }}
    />
  );
}
