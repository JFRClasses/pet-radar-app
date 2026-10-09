import { Component, ElementRef, OnDestroy, afterNextRender, effect, input, output, viewChild } from '@angular/core';
import { LostPet } from '../../core/lost-pet.model';
import { createMap, mapboxgl, pinElement } from './map-config';

@Component({
  selector: 'app-pet-map',
  template: `<div #container class="size-full"></div>`,
  host: { class: 'block' }
})
export class PetMap implements OnDestroy {
  readonly pets = input<LostPet[]>([]);
  readonly selectedId = input<number | null>(null);
  readonly selectPet = output<number>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private map?: mapboxgl.Map;
  private resizeObserver?: ResizeObserver;
  private readonly markers = new Map<number, mapboxgl.Marker>();
  private fitted = false;

  constructor() {
    afterNextRender(() => {
      const element = this.container().nativeElement;
      this.map = createMap(element);
      this.resizeObserver = new ResizeObserver(() => this.map?.resize());
      this.resizeObserver.observe(element);
      this.renderMarkers(this.pets());
    });

    effect(() => this.renderMarkers(this.pets()));

    effect(() => {
      const id = this.selectedId();
      this.markers.forEach((marker, petId) => {
        const active = petId === id;
        marker.getElement().classList.toggle('is-active', active);
        const popup = marker.getPopup();
        if (!active && popup?.isOpen()) popup.remove();
      });
      const marker = id !== null ? this.markers.get(id) : undefined;
      if (marker && this.map) {
        this.map.flyTo({ center: marker.getLngLat(), zoom: Math.max(this.map.getZoom(), 15), duration: 700 });
        if (!marker.getPopup()?.isOpen()) marker.togglePopup();
      }
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private renderMarkers(pets: LostPet[]) {
    const map = this.map;
    if (!map) return;
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();

    for (const pet of pets) {
      const [lon, lat] = pet.location?.coordinates ?? [];
      if (typeof lat !== 'number' || typeof lon !== 'number') continue;
      const element = pinElement(pet.id === this.selectedId() ? 'pet-pin is-active' : 'pet-pin');
      element.addEventListener('click', () => this.selectPet.emit(pet.id));
      const popup = new mapboxgl.Popup({ closeButton: false, offset: 14, maxWidth: '260px' }).setDOMContent(this.popup(pet));
      const marker = new mapboxgl.Marker({ element }).setLngLat([lon, lat]).setPopup(popup).addTo(map);
      this.markers.set(pet.id, marker);
    }

    if (!this.fitted && this.markers.size > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      this.markers.forEach((marker) => bounds.extend(marker.getLngLat()));
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
      this.fitted = true;
    }
  }

  private popup(pet: LostPet) {
    const root = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'pet-popup-name';
    name.textContent = pet.name;
    const meta = document.createElement('div');
    meta.className = 'pet-popup-meta';
    meta.textContent = [pet.type, pet.race, pet.color].filter(Boolean).join(' · ');
    const phone = document.createElement('a');
    phone.className = 'pet-popup-phone';
    phone.href = `tel:${pet.phone}`;
    phone.textContent = `${pet.ownerName} — ${pet.phone}`;
    root.append(name, meta, phone);
    return root;
  }
}
