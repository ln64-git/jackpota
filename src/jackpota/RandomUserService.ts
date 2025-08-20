// src/user/RandomUserService.ts

import { ABBR_TO_STATE, normalizeState, randomState, US_STATES } from "./utils/us-states";

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

export class RandomUserService {
  constructor(private readonly opts: { require21Plus?: boolean } = {}) { }

  async buildUser(): Promise<RandomUser> {
    const detectedState = await this.detectState();
    try {
      const apiUser = await this.fetchUserFromApi(detectedState);
      if (apiUser) return apiUser;
      return this.generateManualUser(detectedState);
    } catch {
      return this.generateManualUser(detectedState);
    }
  }

  async detectState(): Promise<string> {
    try {
      const r = await fetch("http://ipapi.co/json/");
      const data = (await r.json()) as GeolocationResponse;
      const full = normalizeState(data.country, data.region);
      if (full) return full;
    } catch { }
    try {
      const r = await fetch("https://ipinfo.io/json");
      const data = (await r.json()) as GeolocationResponse;
      const full = normalizeState(data.country, data.region);
      if (full) return full;
    } catch { }
    return randomState();  // Final fallback: random
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
    const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "James", "Jennifer"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

    const year = this.randInt(1960, 2002);  // >=21
    const month = this.randInt(1, 12);
    const day = this.randInt(1, 28);

    const chosenState = state ?? randomState();

    return {
      name: {
        first: firstNames[Math.floor(Math.random() * firstNames.length)] ?? "John",
        last: lastNames[Math.floor(Math.random() * lastNames.length)] ?? "Smith",
      },
      email: "user@example.com",
      dob: { date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` },
      location: { state: chosenState },
    };
  }

  // ---------- Private utilities ----------

  private is21Plus(birthDate: Date): boolean {
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
    return age >= 21;
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
