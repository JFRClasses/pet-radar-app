import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LostPet } from '../../core/lost-pet.model';
import { LostPetsService } from '../../core/lost-pets.service';
import { Coordinates, LocationPicker } from '../location-picker/location-picker';

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
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<string | null>(null);
  protected readonly dragging = signal(false);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly pet = signal<LostPet | null>(null);

  ngOnDestroy() {
    this.revokePreview();
  }

  protected close() {
    if (this.saving()) return;
    this.closed.emit();
  }

  protected submit() {
    this.submitted.set(true);
    const location = this.location();
    const file = this.file();
    if (this.form.invalid || !location || !file) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.lostPets
      .create(
        {
          ...values,
          name: values.name.trim(),
          age: Number(values.age),
          lat: location.lat,
          lon: location.lon
        },
        file
      )
      .subscribe({
        next: (pet) => {
          this.saving.set(false);
          this.pet.set(pet);
          this.created.emit(pet);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(this.describe(err));
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

  protected formatSize(bytes: number) {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  }

  private pickFile(file: File | null) {
    this.fileError.set(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.fileError.set('El archivo debe ser una imagen (JPG, PNG o WebP).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.fileError.set('La imagen pesa más de 5 MB.');
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

  private describe(err: unknown) {
    const fallback = 'No pudimos publicar el reporte. Intenta de nuevo.';
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'Sin conexión con el servidor.';
      if (err.status === 413) return 'La imagen es demasiado grande.';
      return typeof err.error?.message === 'string' ? err.error.message : fallback;
    }
    return err instanceof Error ? err.message : fallback;
  }
}
