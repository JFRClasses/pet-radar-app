import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LostPet } from '../../core/lost-pet.model';
import { LostPetsService } from '../../core/lost-pets.service';
import { Coordinates, LocationPicker } from '../location-picker/location-picker';

type Step = 'details' | 'photo' | 'done';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-report-pet',
  imports: [ReactiveFormsModule, LocationPicker],
  templateUrl: './report-pet.html',
  host: { '(document:keydown.escape)': 'close()' }
})
export class ReportPet implements OnDestroy {
  private readonly lostPets = inject(LostPetsService);

  readonly closed = output<void>();
  readonly created = output<LostPet>();

  protected readonly types = ['Perro', 'Gato', 'Otro'];

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    type: ['Perro', Validators.required],
    race: ['', Validators.required],
    color: ['', Validators.required],
    age: [1, [Validators.required, Validators.min(0), Validators.max(40)]],
    ownerName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s()-]{7,20}$/)]]
  });

  protected readonly location = signal<Coordinates | null>(null);
  protected readonly step = signal<Step>('details');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pet = signal<LostPet | null>(null);
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<string | null>(null);
  protected readonly dragging = signal(false);
  protected readonly locationTouched = signal(false);

  ngOnDestroy() {
    this.revokePreview();
  }

  protected close() {
    if (this.saving()) return;
    this.closed.emit();
  }

  protected submitDetails() {
    this.locationTouched.set(true);
    const location = this.location();
    if (this.form.invalid || !location) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.lostPets
      .create({
        ...values,
        name: values.name.trim(),
        age: Number(values.age),
        lat: location.lat,
        lon: location.lon
      })
      .subscribe({
        next: (pet) => {
          this.saving.set(false);
          this.pet.set(pet);
          this.created.emit(pet);
          this.step.set('photo');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(this.describe(err, 'No pudimos guardar el reporte.'));
        }
      });
  }

  protected onFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pickFile(input.files?.[0] ?? null);
    input.value = '';
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    this.pickFile(event.dataTransfer?.files?.[0] ?? null);
  }

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected clearFile() {
    this.revokePreview();
    this.file.set(null);
  }

  protected uploadPhoto() {
    const pet = this.pet();
    const file = this.file();
    if (!pet || !file) return;
    this.saving.set(true);
    this.error.set(null);
    this.lostPets.uploadImage(pet.id, file).subscribe({
      next: () => {
        this.saving.set(false);
        this.step.set('done');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.describe(err, 'No pudimos subir la foto. Intenta con otra imagen.'));
      }
    });
  }

  protected skipPhoto() {
    this.step.set('done');
  }

  protected formatSize(bytes: number) {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  }

  private pickFile(file: File | null) {
    this.error.set(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('El archivo debe ser una imagen (JPG, PNG o WebP).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.error.set('La imagen pesa más de 5 MB.');
      return;
    }
    this.revokePreview();
    this.file.set(file);
    this.preview.set(URL.createObjectURL(file));
  }

  private revokePreview() {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
    this.preview.set(null);
  }

  private describe(err: unknown, fallback: string) {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'Sin conexión con el servidor.';
      return typeof err.error?.message === 'string' ? err.error.message : fallback;
    }
    return err instanceof Error ? err.message : fallback;
  }
}
