import { Component, ElementRef, OnDestroy, afterNextRender, model, signal, viewChild } from '@angular/core';
import { createMap, mapboxgl, pinElement } from '../pet-map/map-config';

export interface Coordinates {
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-location-picker',
  templateUrl: './location-picker.html'
})
export class LocationPicker implements OnDestroy {
  readonly value = model<Coordinates | null>(null);

  protected readonly locating = signal(false);
  protected readonly geoError = signal<string | null>(null);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private map?: mapboxgl.Map;
  private marker?: mapboxgl.Marker;

  constructor() {
    afterNextRender(() => {
      const current = this.value();
      this.map = createMap(
        this.container().nativeElement,
        current ? { center: [current.lon, current.lat], zoom: 16 } : {}
      );
      this.map.getCanvas().style.cursor = 'crosshair';
      this.map.on('click', (event) => this.place(event.lngLat.lat, event.lngLat.lng));
      if (current) this.place(current.lat, current.lon);
      setTimeout(() => this.map?.resize(), 250);
    });
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  protected useMyLocation() {
    if (!navigator.geolocation) {
      this.geoError.set('Tu navegador no permite obtener la ubicación.');
      return;
    }
    this.locating.set(true);
    this.geoError.set(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.locating.set(false);
        this.place(coords.latitude, coords.longitude);
        this.map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 16, duration: 700 });
      },
      () => {
        this.locating.set(false);
        this.geoError.set('No pudimos obtener tu ubicación. Marca el punto en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  private place(lat: number, lon: number) {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLngLat([lon, lat]);
    } else {
      this.marker = new mapboxgl.Marker({ element: pinElement('pick-pin'), anchor: 'bottom', draggable: true })
        .setLngLat([lon, lat])
        .addTo(this.map);
      this.marker.on('dragend', () => {
        const position = this.marker!.getLngLat();
        this.value.set({ lat: position.lat, lon: position.lng });
      });
    }
    this.value.set({ lat, lon });
  }
}
