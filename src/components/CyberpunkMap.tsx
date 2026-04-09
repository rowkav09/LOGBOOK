"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGameState } from "@/contexts/GameStateProvider";

const DEFAULT_CENTER: [number, number] = [40.73061, -73.935242];
const DEFAULT_ZOOM = 14;
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const PIN_COUNT = 5;
const PIN_RADIUS_M = 2000; // pins spawn within 2km
const CHECKIN_RADIUS_M = 50; // must be within 50m to check in
const PIN_XP = 25;
const PIN_REFRESH_MS = 6 * 60 * 60 * 1000; // refresh pins every 6 hours

interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

const PIN_LABELS = ["DATA NODE", "SIGNAL", "DROP POINT", "RELAY", "CACHE", "BEACON", "UPLINK", "DEAD DROP"];

function generatePins(center: [number, number]): MapPin[] {
  const pins: MapPin[] = [];
  for (let i = 0; i < PIN_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 200 + Math.random() * (PIN_RADIUS_M - 200); // at least 200m away
    const dlat = (dist / 111320) * Math.cos(angle);
    const dlng = (dist / (111320 * Math.cos((center[0] * Math.PI) / 180))) * Math.sin(angle);
    pins.push({
      id: `pin-${Date.now()}-${i}`,
      lat: center[0] + dlat,
      lng: center[1] + dlng,
      label: PIN_LABELS[Math.floor(Math.random() * PIN_LABELS.length)],
    });
  }
  return pins;
}

function getStoredPins(): { pins: MapPin[]; checkedIn: string[]; generatedAt: number } | null {
  try {
    const raw = localStorage.getItem("logbook_map_pins");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storePins(pins: MapPin[], checkedIn: string[], generatedAt: number) {
  localStorage.setItem("logbook_map_pins", JSON.stringify({ pins, checkedIn, generatedAt }));
}

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CyberpunkMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pinMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const homePosRef = useRef<[number, number] | null>(null);
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [checkedIn, setCheckedIn] = useState<string[]>([]);
  const [nearbyPin, setNearbyPin] = useState<MapPin | null>(null);
  const [xpFlash, setXpFlash] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const { addBonusXp } = useGameState();

  function safeGetMap(): L.Map | null {
    try {
      const m = mapRef.current;
      if (!m) return null;
      m.getCenter();
      return m;
    } catch {
      return null;
    }
  }

  // Initialize or load pins when we get user position
  const initPins = useCallback((center: [number, number]) => {
    const stored = getStoredPins();
    const now = Date.now();
    if (stored && now - stored.generatedAt < PIN_REFRESH_MS && stored.pins.length > 0) {
      setPins(stored.pins);
      setCheckedIn(stored.checkedIn);
    } else {
      const newPins = generatePins(center);
      setPins(newPins);
      setCheckedIn([]);
      storePins(newPins, [], now);
    }
  }, []);

  // Add pin markers to map
  useEffect(() => {
    const m = safeGetMap();
    if (!m || pins.length === 0) return;

    // Clear old pin markers
    pinMarkersRef.current.forEach((marker) => marker.remove());
    pinMarkersRef.current.clear();

    const pinIcon = L.divIcon({
      className: "",
      html: '<div class="xp-pin"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const checkedIcon = L.divIcon({
      className: "",
      html: '<div class="xp-pin xp-pin-checked"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    for (const pin of pins) {
      const isChecked = checkedIn.includes(pin.id);
      const marker = L.marker([pin.lat, pin.lng], {
        icon: isChecked ? checkedIcon : pinIcon,
      }).addTo(m);
      marker.bindTooltip(
        `<span style="font-family:monospace;font-size:10px;color:${isChecked ? "#666" : "#00ffff"}">${pin.label}${isChecked ? " [DONE]" : ` +${PIN_XP}XP`}</span>`,
        { className: "pin-tooltip", direction: "top", offset: [0, -10] }
      );
      pinMarkersRef.current.set(pin.id, marker);
    }
  }, [pins, checkedIn]);

  // Check proximity to pins
  useEffect(() => {
    if (!userPos || pins.length === 0) {
      setNearbyPin(null);
      return;
    }
    let closest: MapPin | null = null;
    let closestDist = Infinity;
    for (const pin of pins) {
      if (checkedIn.includes(pin.id)) continue;
      const d = distanceM(userPos[0], userPos[1], pin.lat, pin.lng);
      if (d < CHECKIN_RADIUS_M && d < closestDist) {
        closest = pin;
        closestDist = d;
      }
    }
    setNearbyPin(closest);
  }, [userPos, pins, checkedIn]);

  function handleCheckIn() {
    if (!nearbyPin) return;
    const newCheckedIn = [...checkedIn, nearbyPin.id];
    setCheckedIn(newCheckedIn);
    storePins(pins, newCheckedIn, getStoredPins()?.generatedAt || Date.now());
    addBonusXp(PIN_XP);
    setNearbyPin(null);
    setXpFlash(true);
    setTimeout(() => setXpFlash(false), 2000);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const m = safeGetMap();
    if (!search.trim() || !m) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search.trim())}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        m.flyTo([lat, lng], 15, { duration: 1.5 });
        setCoords({ lat: lat.toFixed(4), lng: lng.toFixed(4) });
      }
    } catch {
      // Search failed silently
    }
    setSearching(false);
  }

  function handleRecenter() {
    const m = safeGetMap();
    if (!m || !homePosRef.current) return;
    m.flyTo(homePosRef.current, 15, { duration: 1.5 });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
      minZoom: 10,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 19,
      detectRetina: true,
    }).addTo(map);

    mapRef.current = map;

    const playerIcon = L.divIcon({
      className: "",
      html: '<div class="player-marker"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    if (navigator.geolocation) {
      // Watch position for continuous updates
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const m = safeGetMap();
          if (!m) return;
          const { latitude, longitude } = pos.coords;
          const latlng: [number, number] = [latitude, longitude];

          if (!homePosRef.current) {
            // First fix — center map and spawn pins
            homePosRef.current = latlng;
            m.setView(latlng, 15);
            markerRef.current = L.marker(latlng, { icon: playerIcon }).addTo(m);
            initPins(latlng);
          } else if (markerRef.current) {
            // Update player marker position
            markerRef.current.setLatLng(latlng);
          }

          setUserPos(latlng);
          setCoords({ lat: latitude.toFixed(4), lng: longitude.toFixed(4) });
        },
        () => {},
        { enableHighAccuracy: true }
      );

      const currentPinMarkers = pinMarkersRef.current;
      return () => {
        navigator.geolocation.clearWatch(watchId);
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
        currentPinMarkers.clear();
      };
    }

    map.on("moveend", () => {
      const m = safeGetMap();
      if (!m) return;
      const center = m.getCenter();
      setCoords({ lat: center.lat.toFixed(4), lng: center.lng.toFixed(4) });
    });

    const currentPinMarkers = pinMarkersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      currentPinMarkers.clear();
    };
  }, [initPins]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050505]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="scanlines pointer-events-none absolute inset-0 z-10" />
      <div className="neon-grid pointer-events-none absolute inset-0 z-10" />

      {/* HUD: top banner */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none flex justify-center py-1">
        <span className="font-mono text-[9px] tracking-widest text-cyan-400/50 uppercase">
          Visit checkpoints to collect XP
        </span>
      </div>

      {/* HUD: top-left search */}
      <div className="absolute top-3 left-3 z-20">
        <div className="hud-bracket p-2 mb-1 pointer-events-none">
          <span className="font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
            Location
          </span>
        </div>
        <form onSubmit={handleSearch} className="hud-bracket flex items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address..."
            className="bg-transparent font-mono text-[10px] text-cyan-400 placeholder:text-cyan-400/30 px-2 py-1.5 w-36 focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="font-mono text-[10px] text-[#c8f135] px-2 py-1.5 border-l border-cyan-400/15 hover:bg-cyan-400/5 transition-colors disabled:opacity-30"
          >
            {searching ? "..." : "GO"}
          </button>
        </form>
      </div>

      {/* HUD: bottom-left coords */}
      {coords && (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <div className="hud-bracket p-2 flex flex-col gap-0.5">
            <span className="font-mono text-[10px] text-cyan-400">
              LAT {coords.lat}
            </span>
            <span className="font-mono text-[10px] text-cyan-400">
              LNG {coords.lng}
            </span>
          </div>
        </div>
      )}

      {/* HUD: top-right status + recenter */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
        <div className="hud-bracket p-2 flex items-center gap-2 pointer-events-none">
          <span className="w-1.5 h-1.5 bg-[#c8f135] animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-[#c8f135] uppercase">
            Online
          </span>
        </div>
        <button
          onClick={handleRecenter}
          className="hud-bracket p-2 font-mono text-[10px] tracking-widest text-cyan-400 uppercase hover:bg-cyan-400/5 transition-colors"
        >
          Recenter
        </button>
      </div>

      {/* Check-in button — only shows when near a pin */}
      {nearbyPin && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleCheckIn}
            className="hud-bracket px-4 py-3 flex flex-col items-center gap-1 animate-pulse hover:animate-none"
          >
            <span className="font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
              {nearbyPin.label}
            </span>
            <span className="font-mono text-sm font-bold text-[#c8f135]">
              CHECK IN +{PIN_XP}XP
            </span>
          </button>
        </div>
      )}

      {/* XP flash */}
      {xpFlash && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <span className="font-mono text-2xl font-bold text-[#c8f135] animate-bounce">
            +{PIN_XP} XP
          </span>
        </div>
      )}

      <style jsx>{`
        .scanlines::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 255, 0.015) 2px,
            rgba(0, 255, 255, 0.015) 4px
          );
          animation: scanline-scroll 8s linear infinite;
        }

        .scanlines::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(0, 255, 255, 0.03) 50%,
            transparent 100%
          );
          height: 40%;
          animation: scanline-sweep 4s ease-in-out infinite;
        }

        @keyframes scanline-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }

        @keyframes scanline-sweep {
          0%, 100% { transform: translateY(-20%); }
          50% { transform: translateY(200%); }
        }

        .neon-grid {
          background-image:
            linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .hud-bracket {
          position: relative;
          border: 1px solid rgba(0, 255, 255, 0.15);
          background: rgba(5, 5, 5, 0.7);
        }

        .hud-bracket::before,
        .hud-bracket::after {
          content: "";
          position: absolute;
          width: 6px;
          height: 6px;
          border-color: rgba(0, 255, 255, 0.6);
          border-style: solid;
        }

        .hud-bracket::before {
          top: -1px;
          left: -1px;
          border-width: 1px 0 0 1px;
        }

        .hud-bracket::after {
          bottom: -1px;
          right: -1px;
          border-width: 0 1px 1px 0;
        }

        :global(.player-marker) {
          width: 12px;
          height: 12px;
          background: #c8f135;
          border: 2px solid rgba(200, 241, 53, 0.4);
          box-shadow: 0 0 12px rgba(200, 241, 53, 0.6), 0 0 24px rgba(200, 241, 53, 0.3);
          transform: rotate(45deg);
        }

        :global(.player-marker::after) {
          content: "";
          position: absolute;
          inset: -4px;
          border: 1px solid rgba(200, 241, 53, 0.3);
          animation: marker-pulse 2s ease-in-out infinite;
        }

        :global(.xp-pin) {
          width: 10px;
          height: 10px;
          background: #00ffff;
          border: 1px solid rgba(0, 255, 255, 0.4);
          box-shadow: 0 0 8px rgba(0, 255, 255, 0.6), 0 0 16px rgba(0, 255, 255, 0.2);
          border-radius: 50%;
          animation: pin-glow 2s ease-in-out infinite;
        }

        :global(.xp-pin-checked) {
          background: #333;
          border-color: #333;
          box-shadow: none;
          animation: none;
        }

        :global(.pin-tooltip) {
          background: rgba(5, 5, 5, 0.85) !important;
          border: 1px solid rgba(0, 255, 255, 0.2) !important;
          border-radius: 0 !important;
          padding: 4px 8px !important;
          box-shadow: none !important;
        }

        :global(.pin-tooltip::before) {
          border-top-color: rgba(0, 255, 255, 0.2) !important;
        }

        @keyframes pin-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 255, 0.6), 0 0 16px rgba(0, 255, 255, 0.2); }
          50% { box-shadow: 0 0 12px rgba(0, 255, 255, 0.8), 0 0 24px rgba(0, 255, 255, 0.4); }
        }

        @keyframes marker-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
