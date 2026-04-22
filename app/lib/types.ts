// Shared domain types. These mirror the Postgres schema and are hand-written
// rather than generated so the build never depends on `supabase gen types`
// having been run recently.

export type ThemeTokens = {
  ink: string;
  ink2: string;
  cream: string;
  accent1: string; // primary brand colour
  accent2: string; // secondary
  accent3: string; // tertiary
  headingFont: string; // "display", "serif", "sans"
  tone: string; // "caribbean" | "latin" | "african" | "minimal" | custom
};

export type ContactJson = {
  landline?: string;
  mobile?: string;
  email?: string;
  twitter?: string;
  facebookUrl?: string;
  instagramUrl?: string;
};

export type DonateJson = {
  url?: string;
  label?: string;
  pitch?: string;
};

export type ChatJson = {
  tawkPropertyId?: string;
  tawkWidgetId?: string;
};

export type StationDay =
  | "Sun"
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Daily";

export type Station = {
  id: string;
  owner_user_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  origin: string | null;
  timezone: string; // IANA, e.g. "America/Toronto"
  stream_url: string;
  status_url: string | null;
  copyright_since: number | null;
  theme_tokens: ThemeTokens | null;
  logo_url: string | null;
  favicon_url: string | null;
  contact: ContactJson;
  donate: DonateJson;
  chat: ChatJson;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Show = {
  id: string;
  station_id: string;
  day: StationDay;
  start_min: number; // minutes since midnight 0-1439
  end_min: number;
  title: string;
  host: string | null;
  description: string | null;
  crosses_midnight: boolean;
  display_order: number;
};

export type Sponsor = {
  id: string;
  station_id: string;
  name: string;
  category: string | null;
  location: string | null;
  link: string | null;
  accent: "green" | "gold" | "red" | "sun";
  display_order: number;
};

export type CustomDomain = {
  id: string;
  station_id: string;
  domain: string;
  verified_at: string | null;
  vercel_domain_id: string | null;
  created_at: string;
};

// Default theme for Riddim WSM — keep in sync with the original demo colours
// so the migration produces an identical-looking result.
export const DEFAULT_THEME: ThemeTokens = {
  ink: "#0b0f0b",
  ink2: "#141b15",
  cream: "#f6efe1",
  accent1: "#009b3a",
  accent2: "#fed100",
  accent3: "#e1403b",
  headingFont: "display",
  tone: "caribbean",
};
