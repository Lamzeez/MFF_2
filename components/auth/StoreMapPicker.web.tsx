import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StoreMapPickerProps } from "./StoreMapPicker";

function buildLeafletMapHtml(initialLat: number, initialLng: number): string {
  const safeLat = Number(initialLat.toFixed(6));
  const safeLng = Number(initialLng.toFixed(6));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    crossorigin=""
  />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-container {
      background: #f1f5f9;
    }
    .mff-pin {
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      background: #ea5410;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      transform: rotate(-45deg);
    }
    #fallback {
      display: none;
      position: absolute;
      inset: 0;
      align-items: center;
      justify-content: center;
      color: #475569;
      font-size: 12px;
      padding: 16px;
      text-align: center;
      background: #f8fafc;
    }
    #toast {
      display: none;
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(220, 38, 38, 0.95);
      color: #ffffff;
      padding: 7px 16px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      pointer-events: none;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="toast"></div>
  <div id="fallback">Unable to load street tiles right now. Use Barangay presets or GPS to set coordinates.</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    (function () {
      if (typeof L === "undefined") {
        document.getElementById("fallback").style.display = "flex";
        return;
      }

      // Mati City Geographic Boundaries (Lawigan to Don Salvador Lopez, Dawan to Mayo)
      var MATI_MIN_LAT = 6.74;
      var MATI_MAX_LAT = 7.08;
      var MATI_MIN_LNG = 126.08;
      var MATI_MAX_LNG = 126.38;

      var matiBounds = L.latLngBounds(
        [MATI_MIN_LAT, MATI_MIN_LNG],
        [MATI_MAX_LAT, MATI_MAX_LNG]
      );

      var map = L.map("map", {
        center: [${safeLat}, ${safeLng}],
        zoom: 15,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: matiBounds,
        maxBoundsViscosity: 1.0,
        zoomControl: true
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(map);

      // Subtle boundary visual indication of Mati City territory
      L.rectangle(matiBounds, {
        color: "#ea5410",
        weight: 1.5,
        fillColor: "#ea5410",
        fillOpacity: 0.02,
        dashArray: "4, 6"
      }).addTo(map);

      var toastTimer = null;
      function showNotice(msg) {
        var toast = document.getElementById("toast");
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = "block";
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
          toast.style.display = "none";
        }, 3200);
      }

      function isInsideMati(lat, lng) {
        return lat >= MATI_MIN_LAT && lat <= MATI_MAX_LAT &&
               lng >= MATI_MIN_LNG && lng <= MATI_MAX_LNG;
      }

      var pinIcon = L.divIcon({
        className: "",
        html: '<div class="mff-pin"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      var marker = L.marker([${safeLat}, ${safeLng}], {
        draggable: true,
        icon: pinIcon
      }).addTo(map);

      function notifyParent(lat, lng) {
        window.parent.postMessage(
          {
            type: "MFF_STORE_PIN_CHANGED",
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6))
          },
          "*"
        );
      }

      map.on("click", function (e) {
        if (!isInsideMati(e.latlng.lat, e.latlng.lng)) {
          showNotice("Please pin your store within Mati City boundaries.");
          return;
        }
        marker.setLatLng(e.latlng);
        notifyParent(e.latlng.lat, e.latlng.lng);
      });

      marker.on("dragend", function () {
        var pos = marker.getLatLng();
        if (!isInsideMati(pos.lat, pos.lng)) {
          var clampedLat = Math.min(Math.max(pos.lat, MATI_MIN_LAT + 0.005), MATI_MAX_LAT - 0.005);
          var clampedLng = Math.min(Math.max(pos.lng, MATI_MIN_LNG + 0.005), MATI_MAX_LNG - 0.005);
          marker.setLatLng([clampedLat, clampedLng]);
          notifyParent(clampedLat, clampedLng);
          showNotice("Pin was kept inside Mati City boundaries.");
          return;
        }
        notifyParent(pos.lat, pos.lng);
      });

      window.addEventListener("message", function (event) {
        var msg = event.data;
        if (!msg || msg.type !== "MFF_SET_PIN") return;
        var nextLat = Number(msg.lat);
        var nextLng = Number(msg.lng);
        if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
        var nextLatLng = L.latLng(nextLat, nextLng);
        marker.setLatLng(nextLatLng);
        map.setView(nextLatLng, Math.max(map.getZoom(), 15), { animate: true });
      });

      setTimeout(function () {
        map.invalidateSize();
      }, 250);
    })();
  </script>
</body>
</html>`;
}

export default function StoreMapPicker({
  latitude,
  longitude,
  onChange,
  onError,
  onClearError,
}: StoreMapPickerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const initialCoords = useRef({ lat: latitude, lng: longitude });
  const lastBroadcastedRef = useRef({ lat: latitude, lng: longitude });
  const activeRequestIdRef = useRef(0);
  const [locating, setLocating] = useState(false);

  const srcDoc = useMemo(
    () => buildLeafletMapHtml(initialCoords.current.lat, initialCoords.current.lng),
    []
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const payload = event.data;
      if (!payload || payload.type !== "MFF_STORE_PIN_CHANGED") return;
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return;
      }
      activeRequestIdRef.current += 1;
      lastBroadcastedRef.current = { lat, lng };
      onClearError?.();
      onChange(lat, lng);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onChange, onClearError]);

  useEffect(() => {
    const unchangedFromIframe =
      Math.abs(latitude - lastBroadcastedRef.current.lat) < 0.000001 &&
      Math.abs(longitude - lastBroadcastedRef.current.lng) < 0.000001;
    if (unchangedFromIframe) return;

    lastBroadcastedRef.current = { lat: latitude, lng: longitude };
    iframeRef.current?.contentWindow?.postMessage(
      { type: "MFF_SET_PIN", lat: latitude, lng: longitude },
      "*"
    );
  }, [latitude, longitude]);

  const handleUseCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onError?.("Browser geolocation is unavailable. Click directly on the map to place your pin.");
      return;
    }

    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    onClearError?.();
    setLocating(true);

    const applySuccess = (position: GeolocationPosition) => {
      if (activeRequestIdRef.current !== requestId) return;
      const lat = Number(position.coords.latitude.toFixed(6));
      const lng = Number(position.coords.longitude.toFixed(6));
      setLocating(false);
      onClearError?.();
      onChange(lat, lng);
    };

    const reportFailure = (err: GeolocationPositionError) => {
      if (activeRequestIdRef.current !== requestId) return;
      setLocating(false);
      onError?.(
        err.code === 1
          ? "Location permission is blocked in your browser. Click or drag the marker on the map to pinpoint your store."
          : "Could not read your device location automatically. Click or drag the marker on the map to place your pin."
      );
    };

    navigator.geolocation.getCurrentPosition(
      applySuccess,
      (err) => {
        if (activeRequestIdRef.current !== requestId) return;
        if (err.code === 1) {
          reportFailure(err);
          return;
        }
        // Desktop browsers often fail strict hardware GPS checks; fall back cleanly to standard location.
        navigator.geolocation.getCurrentPosition(
          applySuccess,
          reportFailure,
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  return (
    <View className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header Bar */}
      <View className="px-3.5 py-2.5 border-b border-gray-200 flex-row flex-wrap items-center justify-between gap-2 bg-gray-50">
        <View className="flex-row items-center gap-2">
          <View className="w-6 h-6 rounded-md bg-orange-100 items-center justify-center">
            <Ionicons name="location" size={13} color="#EA5410" />
          </View>
          <View>
            <Text className="text-[11px] font-semibold text-gray-900">
              Click or drag pin on Mati City Map
            </Text>
            <Text className="text-[10px] text-gray-500 font-mono">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use my current location"
          onPress={handleUseCurrentLocation}
          disabled={locating}
          className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 flex-row items-center gap-1.5 transition-colors"
        >
          {locating ? (
            <ActivityIndicator size="small" color="#EA5410" />
          ) : (
            <Ionicons name="locate-outline" size={13} color="#EA5410" />
          )}
          <Text className="text-[11px] font-semibold text-gray-700">Use Current Location</Text>
        </Pressable>
      </View>

      {/* Interactive OpenStreetMap Canvas (1:1 Aspect Ratio) */}
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          minHeight: 380,
          maxHeight: 580,
          backgroundColor: "#F1F5F9",
        }}
      >
        <iframe
          ref={iframeRef}
          title="Store location map picker"
          srcDoc={srcDoc}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            backgroundColor: "#F1F5F9",
          }}
        />
      </View>
    </View>
  );
}
