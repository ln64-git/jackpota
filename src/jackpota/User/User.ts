// src/user/User.ts
import type { GeolocationResponse, } from "./types";

export class User {
  constructor(
    public name: string = "",
    public email: string = "",
    public dob: string = "",
    public location: string = "",
    public password: string = ""
  ) {
    this.initializer();
  }
  private async initializer(): Promise<void> {
    const location = await User.fetchLocation();
    const genUser = await User.fetchUser();
    if (!genUser) throw new Error("No user data returned from API");
    this.name = genUser.name;
    this.email = genUser.email ?? "user@example.com";
    this.dob = genUser.dob;
    this.location = location?.region || "NY";
    this.password = "Password123!";
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
