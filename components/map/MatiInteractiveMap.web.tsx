/**
 * components/map/MatiInteractiveMap.web.tsx
 *
 * Unified Leaflet / OpenStreetMap interactive mapping component for Web.
 * Renders consistent cartography, custom Mati markers, route polylines,
 * and live courier tracking beacons with zero external Google Maps dependency.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, DimensionValue } from "react-native";
import { GeoCoordinates, MATI_CITY_HALL_COORDS } from "../../lib/geo-serviceability";
import { RouteCoordinate } from "../../lib/mati-routing";

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  type: "store" | "customer" | "rider" | "pin";
  color?: string;
}

export interface MatiInteractiveMapProps {
  initialCenter?: GeoCoordinates;
  zoom?: number;
  markers?: MapMarker[];
  selectedMarkerId?: string;
  focusCoords?: { latitude: number; longitude: number; zoom?: number; key?: number | string };
  fitRouteKey?: number | string;
  fitRouteBounds?: { key: number | string; points: RouteCoordinate[] };
  routePolyline?: RouteCoordinate[];
  liveRider?: {
    latitude: number;
    longitude: number;
    heading?: number;
  };
  showLandmarks?: boolean;
  interactive?: boolean;
  height?: DimensionValue;
  onMapClick?: (coords: GeoCoordinates) => void;
  onMarkerPress?: (id: string) => void;
}

function buildUnifiedLeafletHtml(
  center: GeoCoordinates,
  zoom: number,
  interactive: boolean,
  showLandmarks: boolean,
  initialMarkers: MapMarker[],
  initialPolyline: RouteCoordinate[],
  initialRider?: { latitude: number; longitude: number; heading?: number }
): string {
  const safeCenterLat = Number(center.latitude.toFixed(6));
  const safeCenterLng = Number(center.longitude.toFixed(6));
  const markersJson = JSON.stringify(initialMarkers);
  const polylineJson = JSON.stringify(initialPolyline);
  const riderJson = JSON.stringify(initialRider || null);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    html, body, #map {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-container { background: #F8FAFC; }
    
    /* MFF Pin Styles */
    .mff-pin-badge {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 50%;
      border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      font-size: 16px; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .mff-pin-badge:hover { transform: scale(1.18); }
    .mff-pin-store { background: #EA5410; color: #FFFFFF; }
    .mff-pin-customer { background: #059669; color: #FFFFFF; }
    .mff-pin-user {
      background: #2563EB; color: #FFFFFF;
      box-shadow: 0 0 0 4px rgba(37,99,235,0.35), 0 4px 12px rgba(0,0,0,0.35);
      border: 2.5px solid #FFFFFF;
    }
    .mff-pin-rider {
      background: #2563EB; color: #FFFFFF;
      width: 36px; height: 36px; font-size: 18px;
      box-shadow: 0 4px 14px rgba(37,99,235,0.45);
      border: 2.5px solid #FFFFFF;
    }
    .mff-pin-default { background: #F59E0B; color: #FFFFFF; }

    /* Interactive Pin Pulse & Highlight Animation */
    @keyframes mff-pin-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(234, 84, 16, 0.75);
        transform: scale(1.15);
      }
      50% {
        box-shadow: 0 0 0 14px rgba(234, 84, 16, 0);
        transform: scale(1.28);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(234, 84, 16, 0);
        transform: scale(1.15);
      }
    }
    .mff-pin-selected {
      animation: mff-pin-pulse 1.8s infinite ease-in-out !important;
      border: 3px solid #FFFFFF !important;
      z-index: 9999 !important;
      box-shadow: 0 6px 18px rgba(234, 84, 16, 0.6) !important;
    }

    /* Landmark Pills */
    .mff-landmark-pill {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(4px);
      padding: 3px 8px; border-radius: 12px;
      border: 1px solid rgba(203, 213, 225, 0.9);
      font-size: 10px; font-weight: 800; color: #1E293B;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      white-space: nowrap; pointer-events: none;
    }

    /* Popups */
    .leaflet-popup-content-wrapper {
      border-radius: 12px; padding: 2px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    }
    .leaflet-popup-content { margin: 8px 12px; font-size: 12px; line-height: 1.3; }
    .mff-popup-title { font-weight: 800; color: #0F172A; }
    .mff-popup-sub { color: #64748B; font-size: 10px; margin-top: 2px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    (function() {
      var map = L.map("map", {
        center: [${safeCenterLat}, ${safeCenterLng}],
        zoom: ${zoom},
        zoomControl: ${interactive ? "true" : "false"},
        dragging: ${interactive ? "true" : "false"},
        touchZoom: ${interactive ? "true" : "false"},
        scrollWheelZoom: ${interactive ? "true" : "false"},
        doubleClickZoom: ${interactive ? "true" : "false"}
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(map);

      var markersLayer = L.layerGroup().addTo(map);
      var polylineLayer = L.layerGroup().addTo(map);
      var riderMarker = null;
      var currentMarkers = ${markersJson};
      var currentSelectedId = null;
      var markerInstances = {};

      function createIcon(type, isSelected, markerId) {
        var isUser = markerId === "user-current-location" || type === "user";
        var cls = "mff-pin-badge " + (
          isUser ? "mff-pin-user" :
          type === "store" ? "mff-pin-store" :
          type === "customer" ? "mff-pin-customer" :
          type === "rider" ? "mff-pin-rider" : "mff-pin-default"
        );
        if (isSelected) {
          cls += " mff-pin-selected";
        }
        var emoji = isUser ? "📍" : type === "store" ? "🍽️" : type === "customer" ? "🏡" : type === "rider" ? "🛵" : "📍";
        return L.divIcon({
          className: "",
          html: '<div class="' + cls + '">' + emoji + '</div>',
          iconSize: isSelected ? [38, 38] : isUser ? [34, 34] : [32, 32],
          iconAnchor: isSelected ? [19, 19] : isUser ? [17, 17] : [16, 16]
        });
      }

      function renderMarkers(items, selectedId) {
        markersLayer.clearLayers();
        markerInstances = {};
        var bounds = [];
        items.forEach(function(m) {
          var isSelected = String(m.id) === String(selectedId);
          var icon = createIcon(m.type, isSelected, m.id);
          var marker = L.marker([m.latitude, m.longitude], { icon: icon });
          if (m.title) {
            marker.bindPopup(
              '<div class="mff-popup-title">' + m.title + '</div>' +
              (m.subtitle ? '<div class="mff-popup-sub">' + m.subtitle + '</div>' : '')
            );
          }
          marker.on("click", function() {
            window.parent.postMessage({ type: "MFF_MARKER_CLICK", id: m.id }, "*");
          });
          markersLayer.addLayer(marker);
          markerInstances[m.id] = marker;
          bounds.push([m.latitude, m.longitude]);
        });
        return bounds;
      }

      function renderPolyline(points) {
        polylineLayer.clearLayers();
        if (!points || points.length < 2) return [];
        var latLngs = points.map(function(p) { return [p.latitude, p.longitude]; });

        // Outer glow
        L.polyline(latLngs, {
          color: "#EA5410",
          weight: 7,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(polylineLayer);

        // Solid inner path
        L.polyline(latLngs, {
          color: "#EA5410",
          weight: 4,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(polylineLayer);

        // Auto-fit bounds between user and destination to maximize view space
        if (latLngs.length > 0) {
          map.fitBounds(latLngs, {
            paddingTopLeft: [40, 80],
            paddingBottomRight: [40, 40],
            maxZoom: 17,
            animate: true
          });
        }

        return latLngs;
      }

      function updateRider(r) {
        if (!r || !r.latitude || !r.longitude) {
          if (riderMarker) { map.removeLayer(riderMarker); riderMarker = null; }
          return;
        }
        var icon = L.divIcon({
          className: "",
          html: '<div class="mff-pin-badge mff-pin-rider" style="transform: rotate(' + (r.heading || 0) + 'deg);">🛵</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });
        if (riderMarker) {
          riderMarker.setLatLng([r.latitude, r.longitude]);
          riderMarker.setIcon(icon);
        } else {
          riderMarker = L.marker([r.latitude, r.longitude], { icon: icon, zIndexOffset: 1000 }).addTo(map);
        }
      }

      ${showLandmarks ? `
      // Landmark Badges for Mati Landmarks
      var landmarks = [
        { name: "🏛️ Mati City Hall", lat: 6.9550, lng: 126.2165 },
        { name: "🌊 Pujada Bay", lat: 6.9450, lng: 126.2300 },
        { name: "🏖️ Dahican Beach", lat: 6.9180, lng: 126.2750 }
      ];
      landmarks.forEach(function(lm) {
        var pillIcon = L.divIcon({
          className: "",
          html: '<div class="mff-landmark-pill">' + lm.name + '</div>',
          iconSize: [100, 20],
          iconAnchor: [50, 10]
        });
        L.marker([lm.lat, lm.lng], { icon: pillIcon, interactive: false }).addTo(map);
      });
      ` : ""}

      // Initial Load
      var initialMarkers = ${markersJson};
      var initialPoly = ${polylineJson};
      var initialRider = ${riderJson};

      var mBounds = renderMarkers(initialMarkers);
      var pBounds = renderPolyline(initialPoly);
      updateRider(initialRider);

      var allBounds = mBounds.concat(pBounds);
      if (allBounds.length > 1) {
        map.fitBounds(allBounds, { padding: [35, 35], maxZoom: 16 });
      }

      // Map Click Handler
      map.on("click", function(e) {
        window.parent.postMessage({
          type: "MFF_MAP_CLICK",
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6))
        }, "*");
      });

      // Handle Parent Component Dynamic Messages
      window.addEventListener("message", function(event) {
        var msg = event.data;
        if (!msg) return;

        if (msg.type === "UPDATE_RIDER") {
          updateRider(msg.rider);
        } else if (msg.type === "UPDATE_MARKERS") {
          currentMarkers = msg.markers || [];
          renderMarkers(currentMarkers, currentSelectedId);
        } else if (msg.type === "UPDATE_POLYLINE") {
          renderPolyline(msg.polyline || []);
        } else if (msg.type === "FIT_ROUTE_BOUNDS") {
          var pts = (msg.points && msg.points.length > 0) ? msg.points : [];
          var latLngs = [];
          if (pts.length > 0) {
            latLngs = pts.map(function(p) {
              return Array.isArray(p) ? p : [p.latitude || p.lat, p.longitude || p.lng];
            });
          } else {
            polylineLayer.eachLayer(function(l) {
              if (l.getLatLngs) {
                var lPts = l.getLatLngs();
                latLngs = latLngs.concat(Array.isArray(lPts[0]) ? lPts[0] : lPts);
              }
            });
          }
          if (latLngs.length > 0) {
            map.fitBounds(latLngs, {
              paddingTopLeft: [40, 80],
              paddingBottomRight: [40, 40],
              maxZoom: 17,
              animate: true
            });
          }
        } else if (msg.type === "CENTER_ON") {
          map.flyTo([msg.latitude, msg.longitude], msg.zoom || 16, { duration: 0.8, easeLinearity: 0.25 });
        } else if (msg.type === "SELECT_MARKER") {
          currentSelectedId = msg.id;
          renderMarkers(currentMarkers, currentSelectedId);
          if (msg.id && markerInstances[msg.id]) {
            markerInstances[msg.id].openPopup();
          }
        }
      });
    })();
  </script>
</body>
</html>`;
}

export default function MatiInteractiveMap({
  initialCenter = MATI_CITY_HALL_COORDS,
  zoom = 14,
  markers = [],
  selectedMarkerId,
  focusCoords,
  fitRouteKey,
  fitRouteBounds,
  routePolyline = [],
  liveRider,
  showLandmarks = true,
  interactive = true,
  height = 280,
  onMapClick,
  onMarkerPress,
}: MatiInteractiveMapProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const srcDoc = useMemo(
    () =>
      buildUnifiedLeafletHtml(
        initialCenter,
        zoom,
        interactive,
        showLandmarks,
        markers,
        routePolyline,
        liveRider
      ),
    []
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data) return;

      if (data.type === "MFF_MAP_CLICK" && onMapClick) {
        onMapClick({ latitude: data.latitude, longitude: data.longitude });
      } else if (data.type === "MFF_MARKER_CLICK" && onMarkerPress) {
        onMarkerPress(data.id);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onMapClick, onMarkerPress]);

  // Update live rider position smoothly when rider moves
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !liveRider) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "UPDATE_RIDER", rider: liveRider },
      "*"
    );
  }, [liveRider?.latitude, liveRider?.longitude, liveRider?.heading]);

  // Update markers if changed
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "UPDATE_MARKERS", markers },
      "*"
    );
  }, [markers]);

  // Select marker and pulse ring animation
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !selectedMarkerId) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "SELECT_MARKER", id: selectedMarkerId },
      "*"
    );
  }, [selectedMarkerId]);

  // Smooth camera fly-to on center / focus coords
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !focusCoords) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: "CENTER_ON",
        latitude: focusCoords.latitude,
        longitude: focusCoords.longitude,
        zoom: focusCoords.zoom || 16,
      },
      "*"
    );
  }, [focusCoords?.latitude, focusCoords?.longitude, focusCoords?.zoom, focusCoords?.key]);

  // Update route polyline if changed
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "UPDATE_POLYLINE", polyline: routePolyline },
      "*"
    );
  }, [routePolyline]);

  // Re-fit route bounds on trigger or points update
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || (!fitRouteKey && !fitRouteBounds)) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: "FIT_ROUTE_BOUNDS",
        points: fitRouteBounds?.points || routePolyline,
      },
      "*"
    );
  }, [fitRouteKey, fitRouteBounds?.key, routePolyline]);

  return (
    <View style={[styles.container, { height }]}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        style={{ width: "100%", height: "100%", border: 0 } as any}
        title="Mati FoodFinder In-App Map"
        loading="lazy"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
});
