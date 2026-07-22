// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Betriebsdaten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    zeitstempel?: string; // Format: YYYY-MM-DD oder ISO String
    bereich?: LookupValue;
    messgroesse?: string;
    wert?: number;
    einheit?: string;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  BETRIEBSDATEN: '6a60e68007044c0b94964877',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'betriebsdaten': {
    bereich: [{ key: "fermenter", label: "Fermenter" }, { key: "nachgaerer", label: "Nachgärer" }, { key: "gasspeicher", label: "Gasspeicher" }, { key: "bhkw", label: "BHKW" }, { key: "substratannahme", label: "Substratannahme" }, { key: "gaerrestlager", label: "Gärrestlager" }, { key: "aufbereitung", label: "Aufbereitung" }, { key: "sonstiges", label: "Sonstiges" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'betriebsdaten': {
    'zeitstempel': 'date/datetimeminute',
    'bereich': 'lookup/select',
    'messgroesse': 'string/text',
    'wert': 'number',
    'einheit': 'string/text',
    'bemerkung': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBetriebsdaten = StripLookup<Betriebsdaten['fields']>;