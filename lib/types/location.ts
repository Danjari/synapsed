/**
 * Location service types
 */

/**
 * Nominatim search options
 */
export interface NominatimSearchOptions {
  endpoint?: string;
  limit?: number;
  searchOptions?: Record<string, string | number | boolean | unknown>;
  [key: string]: unknown;
}

/**
 * Nominatim API response item
 */
export interface NominatimResponseItem {
  place_id: string | number;
  lat: string;
  lon: string;
  display_name: string;
  importance?: string | number;
  boundingbox?: [string, string, string, string]; // [minlat, maxlat, minlon, maxlon]
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Leaflet map instance (from window.L)
 */
export interface LeafletMap {
  setView: (center: [number, number], zoom: number) => void;
  getZoom: () => number;
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
  removeLayer: (layer: LeafletMarker) => void;
  [key: string]: unknown;
}

/**
 * Leaflet tile layer
 */
export interface LeafletTileLayer {
  addTo: (map: LeafletMap) => void;
  [key: string]: unknown;
}

/**
 * Leaflet marker
 */
export interface LeafletMarker {
  setLatLng: (latlng: [number, number]) => void;
  addTo: (map: LeafletMap) => void;
  remove: () => void;
  [key: string]: unknown;
}

/**
 * Leaflet layer (base type for all layers)
 */
export interface LeafletLayer {
  [key: string]: unknown;
}

/**
 * Leaflet map with eachLayer method
 */
export interface LeafletMapWithLayers extends LeafletMap {
  eachLayer: (callback: (layer: LeafletLayer) => void) => void;
}

/**
 * Window with Leaflet
 */
export interface WindowWithLeaflet extends Window {
  L?: {
    map: (container: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
    tileLayer: (url: string, options?: Record<string, unknown>) => LeafletTileLayer;
    marker: (latlng: [number, number], options?: Record<string, unknown>) => LeafletMarker;
    divIcon: (options: { className: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] }) => unknown;
    [key: string]: unknown;
  };
}

