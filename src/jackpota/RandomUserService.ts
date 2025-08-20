// src/user/RandomUserService.ts

// ----- Types kept small and focused on user-building -----
export interface RandomUser {
  name: { first: string; last: string };
  email: string;
  dob: { date: string };         // ISO string (YYYY-MM-DD or full ISO)
  location: { state: string };    // Full state name (e.g. "Ohio")
}

interface GeolocationResponse {
  country: string;
  region: string;   // can be "OH" or "Ohio" depending on API
  city?: string;
  lat?: number;
  lon?: number;
}

// ----- Shared constants (exported in case other modules need them) -----
export const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming"
] as const;

const STATE_ABBR: Record<string, string> = {
  Alabama:"AL", Alaska:"AK", Arizona:"AZ", Arkansas:"AR", California:"CA", Colorado:"CO",
  Connecticut:"CT", Delaware:"DE", Florida:"FL", Georgia:"GA", Hawaii:"HI", Idaho:"ID",
  Illinois:"IL", Indiana:"IN", Iowa:"IA", Kansas:"KS", Kentucky:"KY", Louisiana:"LA",
  Maine:"ME", Maryland:"MD", Massachusetts:"MA", Michigan:"MI", Minnesota:"MN",
  Mississippi:"MS", Missouri:"MO", Montana:"MT", Nebraska:"NE", Nevada:"NV",
  "New Hampshire":"NH", "New Jersey":"NJ", "New Mexico":"NM", "New York":"NY",
  "North Carolina":"NC", "North Dakota":"ND", Ohio:"OH", Oklahoma:"OK", Oregon:"OR",
  Pennsylvania:"PA", "Rhode Island":"RI", "South Carolina":"SC", "South Dakota":"SD",
  Tennessee:"TN", Texas:"TX", Utah:"UT", Vermont:"VT", Virginia:"VA", Washington:"WA",
  "West Virginia":"WV", Wisconsin:"WI", Wyoming:"WY"
};

const ABBR_TO_STATE: Record<string, string> =
  Object.fromEntries(Object.entries(STATE_ABBR).map(([name, abbr]) => [abbr, name]));

// ----- Service focused purely on building users -----
export class RandomUserService {
  constructor(private readonly opts: { require21Plus?: boolean } = {}) {}

  /**
   * Build a user:
   * - Detects US state from network (with fallbacks),
   * - Tries randomuser.me (US nat) for someone >=21 (if require21Plus),
   * - Falls back to generated user if needed,
   * - Ensures `location.state` is a full US state name.
   */
  async buildUser(): Promise<RandomUser> {
    const detectedState = await this.detectState();
    try {
      const apiUser = await this.fetchUserFromApi(detectedState);
      if (apiUser) return apiUser;
      // fallback if API returned but no valid user
      return this.generateManualUser(detectedState);
    } catch {
      // fallback if API failed
      return this.generateManualUser(detectedState);
    }
  }

  // ---------- Public helpers (if you want to call individually) ----------
  async detectState(): Promise<string> {
    // Try ipapi.co
    try {
      const r = await fetch("http://ipapi.co/json/");
      const data = (await r.json()) as GeolocationResponse;
      const full = this.normalizeState(data.country, data.region);
      if (full) return full;
    } catch {}

    // Fallback: ipinfo.io
    try {
      const r = await fetch("https://ipinfo.io/json");
      const data = (await r.json()) as GeolocationResponse;
      const full = this.normalizeState(data.country, data.region);
      if (full) return full;
    } catch {}

    // Final fallback: random
    return this.randomState();
  }

  async fetchUserFromApi(stateOverride: string): Promise<RandomUser | null> {
    const r = await fetch("https://randomuser.me/api/?nat=us&results=10");
    const data = (await r.json()) as { results: RandomUser[] };
    const require21 = this.opts.require21Plus !== false; // default true

    for (const user of data.results) {
      const birth = new Date(user.dob.date);
      if (!require21 || this.is21Plus(birth)) {
        // ensure state override is a full name
        user.location.state = stateOverride;
        // keep email from API (or allow your external code to overwrite later)
        return {
          name: user.name,
          email: user.email ?? "user@example.com",
          dob: user.dob,
          location: { state: stateOverride }
        };
      }
    }
    return null;
  }

  generateManualUser(state?: string): RandomUser {
    const firstNames = ["John","Jane","Michael","Sarah","David","Emily","Robert","Lisa","James","Jennifer"];
    const lastNames  = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez"];

    const year = this.randInt(1960, 2002);  // >=21
    const month = this.randInt(1, 12);
    const day = this.randInt(1, 28);

    const chosenState = state ?? this.randomState();

    return {
      name: {
        first: firstNames[Math.floor(Math.random() * firstNames.length)] ?? "John",
        last:  lastNames[Math.floor(Math.random() * lastNames.length)] ?? "Smith",
      },
      email: "user@example.com",
      dob: { date: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}` },
      location: { state: chosenState },
    };
  }

  // ---------- Private utilities ----------
  private normalizeState(country?: string, region?: string): string | null {
    if (country !== "US" || !region) return null;

    // Accept either "OH" or "Ohio"
    const fromAbbr = ABBR_TO_STATE[region];
    const full = fromAbbr ?? region;

    if (US_STATES.includes(full as any)) return full;
    return null;
  }

  private is21Plus(birthDate: Date): boolean {
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
    return age >= 21;
    }

  private randomState(): string {
    return US_STATES[Math.floor(Math.random() * US_STATES.length)]!;
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
