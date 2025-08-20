// src/user/User.ts
import type { GeolocationResponse, User } from "./types";

export class JackpotaUser implements User {
  constructor(
    public name: { first: string; last: string } = { first: "", last: "" },
    public email: string = "",
    public dob: string = "",
    public location: string = ""
  ) { }

  static async create(seed?: Partial<JackpotaUser>): Promise<JackpotaUser> {
    const location = await JackpotaUser.fetchLocation();
    const user = await JackpotaUser.fetchUser();
    if (!user) throw new Error("No user data returned from API");
    const dob = new Date(user.dob);
    dob.setFullYear(dob.getFullYear() + 21);
    return new JackpotaUser(
      user.name,
      user.email ?? "user@example.com",
      user.dob,
      location?.region || "NY"
    );
  }

  static async fetchLocation(): Promise<GeolocationResponse | null> {
    try {
      const r = await fetch("https://ipapi.co/json/");
      const data = (await r.json()) as GeolocationResponse;
      return data;
    } catch {
      return null;
    }
  }

  static async fetchUser(): Promise<User> {
    const r = await fetch("https://randomuser.me/api/?nat=us&results=10");
    const { results } = (await r.json()) as { results: any[] };
    const user = results[0];
    if (!user) throw new Error("No user data returned from API");
    return user;
  }

}
