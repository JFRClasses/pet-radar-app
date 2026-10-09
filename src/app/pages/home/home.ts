import { Component, computed, inject, signal } from '@angular/core';
import { ReportPet } from '../../components/report-pet/report-pet';
import { PetMap } from '../../components/pet-map/pet-map';
import { AuthService } from '../../core/auth.service';
import { LostPet } from '../../core/lost-pet.model';
import { LostPetsService } from '../../core/lost-pets.service';

@Component({
  selector: 'app-home',
  imports: [PetMap, ReportPet],
  templateUrl: './home.html'
})
export class Home {
  private readonly lostPets = inject(LostPetsService);
  private readonly auth = inject(AuthService);

  protected readonly pets = signal<LostPet[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly query = signal('');
  protected readonly reporting = signal(false);

  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const pets = [...this.pets()].sort((a, b) => b.id - a.id);
    if (!term) return pets;
    return pets.filter((pet) =>
      [pet.name, pet.type, pet.race, pet.color, pet.ownerName].some((value) => value?.toLowerCase().includes(term))
    );
  });

  constructor() {
    this.load();
  }

  protected load() {
    this.loading.set(true);
    this.error.set(null);
    this.lostPets.getAll().subscribe({
      next: (pets) => {
        this.pets.set(pets ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los reportes.');
        this.loading.set(false);
      }
    });
  }

  protected select(id: number) {
    this.selectedId.set(id);
    document.getElementById(`pet-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  protected onCreated(pet: LostPet) {
    this.pets.update((pets) => [...pets, pet]);
    this.selectedId.set(pet.id);
  }

  protected logout() {
    this.auth.logout();
  }

  protected code(id: number) {
    return `#${String(id).padStart(3, '0')}`;
  }

  protected age(years: number) {
    return years === 1 ? '1 año' : `${years} años`;
  }
}
