export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface LostPet {
  id: number;
  type: string;
  name: string;
  location: GeoPoint;
  phone: string;
  race: string;
  age: number;
  color: string;
  ownerName: string;
}

export interface CreateLostPet {
  type: string;
  name: string;
  lat: number;
  lon: number;
  phone: string;
  race: string;
  age: number;
  color: string;
  ownerName: string;
}
