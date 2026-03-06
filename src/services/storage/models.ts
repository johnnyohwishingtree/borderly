import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';
import { Accommodation } from '@/types/trip';

export class Trip extends Model {
  static table = 'trips';

  @field('name') name!: string;
  @field('status') status!: 'upcoming' | 'active' | 'completed';
  @date('created_at') @readonly createdAt!: Date;
  @date('updated_at') @readonly updatedAt!: Date;

  // Helper methods
  get createdAtISO(): string {
    return this.createdAt.toISOString();
  }

  get updatedAtISO(): string {
    return this.updatedAt.toISOString();
  }
}

export class TripLeg extends Model {
  static table = 'trip_legs';

  @field('trip_id') tripId!: string;
  @field('destination_country') destinationCountry!: string;
  @date('arrival_date') arrivalDate!: Date;
  @date('departure_date') departureDate?: Date;
  @field('flight_number') flightNumber?: string;
  @field('airline_code') airlineCode?: string;
  @field('arrival_airport') arrivalAirport?: string;
  @field('accommodation') accommodationData!: string; // JSON string
  @field('form_status') formStatus!: 'not_started' | 'in_progress' | 'ready' | 'submitted';
  @field('form_data') formDataString?: string; // JSON string
  @field('order') order!: number;

  // Helper getters for JSON fields
  get accommodation(): Accommodation {
    try {
      return JSON.parse(this.accommodationData);
    } catch {
      return {
        name: '',
        address: {
          line1: '',
          city: '',
          postalCode: '',
          country: '',
        },
      };
    }
  }

  get formData(): Record<string, unknown> | undefined {
    if (!this.formDataString) {return undefined;}
    try {
      return JSON.parse(this.formDataString);
    } catch {
      return undefined;
    }
  }

  // Helper setters for JSON fields
  setAccommodation(accommodation: Accommodation): void {
    this.accommodationData = JSON.stringify(accommodation);
  }

  setFormData(formData: Record<string, unknown> | undefined): void {
    this.formDataString = formData ? JSON.stringify(formData) : null;
  }

  // Helper methods for dates
  get arrivalDateISO(): string {
    return this.arrivalDate.toISOString();
  }

  get departureDateISO(): string | undefined {
    return this.departureDate?.toISOString();
  }
}

export class SavedQRCode extends Model {
  static table = 'saved_qr_codes';

  @field('leg_id') legId!: string;
  @field('type') type!: 'immigration' | 'customs' | 'health' | 'combined';
  @field('image_base64') imageBase64!: string;
  @date('saved_at') @readonly savedAt!: Date;
  @field('label') label!: string;

  // Helper methods
  get savedAtISO(): string {
    return this.savedAt.toISOString();
  }
}
