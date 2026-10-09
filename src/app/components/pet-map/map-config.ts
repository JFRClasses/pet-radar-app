import mapboxgl from 'mapbox-gl/dist/mapbox-gl-csp.js';
import { environment } from '../../../environments/environment';

mapboxgl.workerUrl = 'mapbox-gl-csp-worker.js';

export { mapboxgl };

export const DEFAULT_CENTER: [number, number] = [-103.3496, 20.6597];
export const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

export function createMap(container: HTMLElement, options: Partial<mapboxgl.MapOptions> = {}) {
  mapboxgl.accessToken = environment.mapboxToken;
  const map = new mapboxgl.Map({
    container,
    style: MAP_STYLE,
    center: DEFAULT_CENTER,
    zoom: 11,
    ...options
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
  return map;
}

export function pinElement(className: string) {
  const element = document.createElement('div');
  element.className = className;
  const pin = document.createElement('span');
  pin.className = 'pin';
  element.append(pin);
  return element;
}
