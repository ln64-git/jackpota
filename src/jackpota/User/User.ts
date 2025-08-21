// src/user/User.ts
import type { GeolocationResponse, RandomUserResponse } from "./types";

export class User {
  constructor(
    public name: string = "",
    public email: string = "",
    public token: string = "",
    public dob: string = "",
    public location: string = "",
    public password: string = ""
  ) { }

  public async initialize(): Promise<void> {
    const location = await User.fetchLocation();
    const genUser = await User.fetchUser();
    const tempMailData = await User.fetchTempMailAddress();
    if (!genUser) throw new Error("No user data returned from API");
    this.name = `${genUser.name.first} ${genUser.name.last}`;
    this.email = tempMailData.email;
    this.token = tempMailData.token;
    this.dob = genUser.dob.date;
    this.location = location?.region || "NY";
    this.password = "Password123!";
  }

  static async fetchTempMailAddress(): Promise<{ email: string; token: string }> {
    // 1. Fetch domains
    const domainsResp = await fetch("https://api.mail.tm/domains");
    const domainsData: unknown = await domainsResp.json();
    // mail.tm returns {hydra:member: [{domain: string, ...}, ...]}
    const domainList: Array<{ domain: string }> = Array.isArray(
      (domainsData as { ["hydra:member"]?: unknown })["hydra:member"]
    )
      ? ((domainsData as { ["hydra:member"]: Array<{ domain: string }> })["hydra:member"])
      : [];
    const domain = domainList[0]?.domain || "defaultdomain.com";

    // 2. Create account
    const accountResp = await fetch("https://api.mail.tm/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: `user${Date.now()}@${domain}`,
        password: "someStrongPassword"
      })
    });
    const account = await accountResp.json();

    // 3. Get token
    const tokenResp = await fetch("https://api.mail.tm/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: (account as { address: string }).address, password: "someStrongPassword" })
    });
    const tokenData: unknown = await tokenResp.json();
    const token = (tokenData as { token?: string }).token;

    return {
      email: (account as { address: string }).address,
      token: token || ""
    };
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