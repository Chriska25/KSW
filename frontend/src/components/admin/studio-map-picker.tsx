'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Crosshair, Loader2, MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEFAULT_STUDIO_MAP, formatCoord, type StudioMapCoords } from '@/lib/studio-map-utils';
import { StudioMapEmbed } from '@/components/common/studio-map-embed';

declare global {
  interface Window {
    L?: {
      map: (el: HTMLElement | string, options?: Record<string, unknown>) => LeafletMap;
      tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
      marker: (
        latlng: [number, number],
        options?: { draggable?: boolean }
      ) => LeafletMarker;
    };
  }
}

interface LeafletMap {
  setView: (latlng: [number, number], zoom: number) => LeafletMap;
  getZoom: () => number;
  invalidateSize: () => void;
  on: (event: string, handler: (e?: { latlng?: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
}

interface LeafletMarker {
  setLatLng: (latlng: [number, number]) => LeafletMarker;
  getLatLng: () => { lat: number; lng: number };
  on: (event: string, handler: () => void) => void;
  addTo: (map: LeafletMap) => LeafletMarker;
}

let leafletAssetsPromise: Promise<void> | null = null;

function loadLeafletAssets(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.L) return Promise.resolve();
  if (leafletAssetsPromise) return leafletAssetsPromise;

  leafletAssetsPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet-css', 'true');
      document.head.appendChild(link);
    }

    const existing = document.querySelector('script[data-leaflet-js]') as HTMLScriptElement | null;
    if (existing) {
      if (window.L) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Leaflet')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.setAttribute('data-leaflet-js', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Leaflet'));
    document.body.appendChild(script);
  });

  return leafletAssetsPromise;
}

export type MapPersistStatus = 'idle' | 'saving' | 'saved' | 'error';

interface StudioMapPickerProps {
  value: StudioMapCoords;
  onChange: (coords: StudioMapCoords) => void;
  onPersist?: (coords: StudioMapCoords) => Promise<void>;
  persistStatus?: MapPersistStatus;
  onGeocodeAddress?: () => Promise<void>;
  geocoding?: boolean;
}

export function StudioMapPicker({
  value,
  onChange,
  onPersist,
  persistStatus = 'idle',
  onGeocodeAddress,
  geocoding,
}: StudioMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const onPersistRef = useRef(onPersist);
  const valueRef = useRef(value);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
    onPersistRef.current = onPersist;
    valueRef.current = value;
  }, [onChange, onPersist, value]);

  const emitCoords = (lat: number, lng: number, zoom?: number) => {
    const coords: StudioMapCoords = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      zoom: zoom ?? valueRef.current.zoom,
    };
    onChangeRef.current(coords);
    schedulePersist(coords);
  };

  const schedulePersist = (coords: StudioMapCoords) => {
    if (!onPersistRef.current) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      void onPersistRef.current?.(coords);
    }, 600);
  };

  const persistNow = () => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    void onPersistRef.current?.(valueRef.current);
  };

  useEffect(() => {
    let cancelled = false;

    loadLeafletAssets()
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.L) return;

        const L = window.L;
        const DefaultIcon = L as unknown as {
          Icon: {
            Default: {
              prototype: { _getIconUrl?: unknown };
              mergeOptions: (options: Record<string, string>) => void;
            };
          };
        };
        delete DefaultIcon.Icon.Default.prototype._getIconUrl;
        DefaultIcon.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        }

        const map = window.L.map(mapContainerRef.current, {
          scrollWheelZoom: true,
        }).setView([value.lat, value.lng], value.zoom);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 20,
        }).addTo(map);

        const marker = window.L
          .marker([value.lat, value.lng], { draggable: true })
          .addTo(map);

        map.on('click', (event) => {
          if (!event?.latlng) return;
          marker.setLatLng([event.latlng.lat, event.latlng.lng]);
          emitCoords(event.latlng.lat, event.latlng.lng);
        });

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          emitCoords(pos.lat, pos.lng);
        });

        map.on('zoomend', () => {
          const pos = marker.getLatLng();
          const zoom = Math.max(10, Math.min(20, map.getZoom()));
          emitCoords(pos.lat, pos.lng, zoom);
        });

        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);

        requestAnimationFrame(() => {
          map.invalidateSize();
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossible de charger la carte interactive.');
      });

    return () => {
      cancelled = true;
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // Init carte une seule fois au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return;
    const current = markerRef.current.getLatLng();
    const samePoint =
      Math.abs(current.lat - value.lat) < 0.000001 && Math.abs(current.lng - value.lng) < 0.000001;
    if (!samePoint) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
    mapRef.current.setView([value.lat, value.lng], value.zoom);
  }, [value.lat, value.lng, value.zoom, ready]);

  const persistLabel =
    persistStatus === 'saving'
      ? 'Enregistrement…'
      : persistStatus === 'saved'
        ? 'Point enregistré'
        : persistStatus === 'error'
          ? 'Échec enregistrement'
          : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <p className="text-[11px] text-zinc-500 max-w-xl">
          Cliquez sur la carte ou déplacez le marqueur — le point est enregistré automatiquement en base de données.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          {persistLabel && (
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                persistStatus === 'saved'
                  ? 'text-emerald-400'
                  : persistStatus === 'error'
                    ? 'text-rose-400'
                    : 'text-amber-400'
              }`}
            >
              {persistStatus === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {persistStatus === 'saved' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {persistLabel}
            </span>
          )}
          {onPersist && (
            <Button type="button" variant="gold" size="sm" disabled={persistStatus === 'saving'} onClick={persistNow}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Enregistrer ce point
            </Button>
          )}
          {onGeocodeAddress && (
            <Button type="button" variant="outline" size="sm" disabled={geocoding} onClick={() => void onGeocodeAddress()}>
              <Crosshair className="h-3.5 w-3.5 mr-1.5" />
              {geocoding ? 'Recherche…' : 'Centrer sur l\'adresse'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-zinc-400 block mb-1 font-semibold text-xs">Latitude</label>
          <Input
            type="number"
            step="0.000001"
            value={value.lat}
            onChange={(e) => emitCoords(Number(e.target.value), value.lng)}
            onBlur={persistNow}
          />
        </div>
        <div>
          <label className="text-zinc-400 block mb-1 font-semibold text-xs">Longitude</label>
          <Input
            type="number"
            step="0.000001"
            value={value.lng}
            onChange={(e) => emitCoords(value.lat, Number(e.target.value))}
            onBlur={persistNow}
          />
        </div>
        <div>
          <label className="text-zinc-400 block mb-1 font-semibold text-xs">Zoom carte</label>
          <Input
            type="number"
            min={10}
            max={20}
            value={value.zoom}
            onChange={(e) => {
              const coords = {
                ...value,
                zoom: Math.max(10, Math.min(20, Number(e.target.value) || DEFAULT_STUDIO_MAP.zoom)),
              };
              onChangeRef.current(coords);
              schedulePersist(coords);
            }}
            onBlur={persistNow}
          />
        </div>
      </div>

      {loadError ? (
        <p className="text-rose-400 text-xs">{loadError}</p>
      ) : (
        <div
          ref={mapContainerRef}
          className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-zinc-800 z-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-zinc-900"
        />
      )}

      <div className="p-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 space-y-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
          <MapPin className="h-3.5 w-3.5 text-amber-400" />
          Aperçu page Contact — {formatCoord(value.lat)}, {formatCoord(value.lng)}
        </div>
        <StudioMapEmbed coords={value} className="h-40 w-full" />
      </div>
    </div>
  );
}
