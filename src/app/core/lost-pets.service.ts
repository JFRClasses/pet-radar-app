import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { API_URL, ApiResponse, unwrap } from './api';
import { CreateLostPet, LostPet } from './lost-pet.model';

@Injectable({ providedIn: 'root' })
export class LostPetsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/lost-pets`;

  getAll() {
    return this.http.get<ApiResponse<LostPet[]>>(this.url).pipe(map(unwrap));
  }

  create(pet: CreateLostPet, image: File) {
    const body = new FormData();
    Object.entries(pet).forEach(([key, value]) => body.append(key, String(value)));
    body.append('image', image);
    return this.http.post<ApiResponse<LostPet>>(this.url, body).pipe(map(unwrap));
  }
}
