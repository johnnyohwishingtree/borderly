/**
 * TripTemplateService
 *
 * Provides CRUD operations for TripTemplate objects, persisted to MMKV.
 * Templates are non-sensitive config data (no passport/PII), making MMKV the
 * correct storage tier per the Borderly three-tier storage model.
 *
 * Storage key: `trip_templates` → JSON-serialised TripTemplate[]
 */

import { TripTemplate, TripTemplateLeg, Trip } from '@/types/trip';
import { mmkvService } from '@/services/storage/mmkv';

const STORAGE_KEY = 'trip_templates';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readTemplates(): TripTemplate[] {
  try {
    const raw = mmkvService.getString(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TripTemplate[];
  } catch {
    return [];
  }
}

function writeTemplates(templates: TripTemplate[]): void {
  mmkvService.setString(STORAGE_KEY, JSON.stringify(templates));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Saves the given Trip as a new TripTemplate.
 * Only copies the trip name, ordered country codes, and typical durations
 * (derived from arrivalDate → departureDate span when available).
 *
 * @param trip   The source Trip to template-ise.
 * @param name   Name for the new template (defaults to the trip name).
 * @returns The newly created TripTemplate.
 */
export function saveTemplateFromTrip(trip: Trip, name?: string): TripTemplate {
  const templateLegs: TripTemplateLeg[] = trip.legs
    .sort((a, b) => a.order - b.order)
    .map(leg => {
      let typicalDurationDays = 1;
      if (leg.arrivalDate && leg.departureDate) {
        const arrival = new Date(leg.arrivalDate);
        const departure = new Date(leg.departureDate);
        const diffMs = departure.getTime() - arrival.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          typicalDurationDays = diffDays;
        }
      }
      return {
        countryCode: leg.destinationCountry,
        typicalDurationDays,
        order: leg.order,
      };
    });

  const template: TripTemplate = {
    id: generateId(),
    name: name ?? trip.name,
    legs: templateLegs,
    createdAt: new Date().toISOString(),
  };

  const existing = readTemplates();
  writeTemplates([...existing, template]);

  return template;
}

/**
 * Returns all saved TripTemplates sorted by createdAt descending
 * (newest first).
 */
export function listTemplates(): TripTemplate[] {
  const templates = readTemplates();
  return [...templates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Returns a single TripTemplate by id, or null when not found.
 */
export function getTemplateById(id: string): TripTemplate | null {
  const templates = readTemplates();
  return templates.find(t => t.id === id) ?? null;
}

/**
 * Renames an existing template.
 *
 * @param id      The template id.
 * @param newName The replacement name (must be non-empty).
 * @returns The updated template, or null when the id was not found.
 */
export function renameTemplate(id: string, newName: string): TripTemplate | null {
  const trimmed = newName.trim();
  if (!trimmed) return null;

  const templates = readTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) return null;

  const updated: TripTemplate = { ...templates[index], name: trimmed };
  templates[index] = updated;
  writeTemplates(templates);
  return updated;
}

/**
 * Deletes a template by id.
 *
 * @param id The template id.
 * @returns true when the template was found and removed, false otherwise.
 */
export function deleteTemplate(id: string): boolean {
  const templates = readTemplates();
  const filtered = templates.filter(t => t.id !== id);
  if (filtered.length === templates.length) return false;
  writeTemplates(filtered);
  return true;
}

// Convenience singleton export mirroring the service facade pattern used elsewhere
export const tripTemplateService = {
  saveFromTrip: saveTemplateFromTrip,
  list: listTemplates,
  getById: getTemplateById,
  rename: renameTemplate,
  delete: deleteTemplate,
} as const;
