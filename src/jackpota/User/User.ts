// src/user/User.ts
import type { GeolocationResponse, RandomUserResponse } from "./types";

export class User {
  constructor(
    public name: string = "",
    public email: string = "",
    public dob: string = "",
    public location: string = "",
    public password: string = ""
  ) { }

  public async initialize(): Promise<void> {
    const location = await User.fetchLocation();
    const genUser = await User.fetchUser();
    const tempMail = await User.fetchTempMailAddress()
    if (!genUser) throw new Error("No user data returned from API");
    this.name = `${genUser.name.first} ${genUser.name.last}`;
    this.email = tempMail;
    this.dob = genUser.dob.date; // Extract the date string from the dob object
    this.location = location?.region || "NY";
    this.password = "Password123!";
  }

  static async fetchTempMailAddress(): Promise<string> {
    return ""
  }

  static async fetchTempMailCode(): Promise<string> {
    return ""
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

  static async fetchUser(): Promise<RandomUserResponse> {
    const r = await fetch("https://randomuser.me/api/?nat=us&results=10");
    const { results } = (await r.json()) as { results: RandomUserResponse[] };
    const user = results[0];
    if (!user) throw new Error("No user data returned from API");
    return user;
  }
}