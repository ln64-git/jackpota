// src/user/User.ts
import type { GeolocationResponse, RandomUserResponse } from "./types";

export class User {
  constructor(
    public name: string = "",
    public email: string = "",
    public token: string = "",
    public dob: string = "",
    public location: string = "",
    public password: string = "",
    public inbox: Array<{ id: string; subject: string; from: string; text: string }> = []
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

  public async fetchInboxMessages(): Promise<void> {
    if (!this.token) {
      console.log("No token available to fetch inbox messages");
      return;
    }

    try {
      // Fetch messages from the temp mail account
      const messagesResp = await fetch("https://api.mail.tm/messages", {
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        }
      });

      if (!messagesResp.ok) {
        throw new Error(`Failed to fetch messages: ${messagesResp.status}`);
      }

      const messagesData = await messagesResp.json();

      // mail.tm returns messages in hydra:member format
      const messages = Array.isArray(
        (messagesData as { ["hydra:member"]?: unknown })["hydra:member"]
      )
        ? ((messagesData as { ["hydra:member"]: Array<{ id: string; subject: string; from: { address: string } }> })["hydra:member"])
        : [];

      // Fetch full content for each message
      console.log(`Fetching content for ${messages.length} messages...`);
      const fullMessages = await Promise.all(
        messages.map(async (msg) => {
          try {
            const messageResp = await fetch(`https://api.mail.tm/messages/${msg.id}`, {
              headers: {
                "Authorization": `Bearer ${this.token}`,
                "Content-Type": "application/json"
              }
            });

            if (messageResp.ok) {
              const messageData = await messageResp.json() as { text?: string; html?: string };
              return {
                id: msg.id,
                subject: msg.subject,
                from: msg.from.address,
                text: messageData.text || messageData.html || "No content available"
              };
            } else {
              return {
                id: msg.id,
                subject: msg.subject,
                from: msg.from.address,
                text: "Failed to fetch content"
              };
            }
          } catch (error) {
            return {
              id: msg.id,
              subject: msg.subject,
              from: msg.from.address,
              text: "Error fetching content"
            };
          }
        })
      );

      this.inbox = fullMessages;

    } catch (error) {
      console.error("Error fetching inbox messages:", error);
      this.inbox = [];
    }
  }

  public async waitForMessage(subjectContains?: string, maxWaitTime: number = 30000): Promise<{ id: string; subject: string; from: string; text: string } | null> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      await this.fetchInboxMessages();

      // Look for a message that contains the specified subject
      if (subjectContains) {
        const matchingMessage = this.inbox.find(msg =>
          msg.subject.toLowerCase().includes(subjectContains.toLowerCase())
        );
        if (matchingMessage) {
          return matchingMessage;
        }
      } else if (this.inbox.length > 0) {
        // Return the most recent message if no subject filter
        const lastMessage = this.inbox[this.inbox.length - 1];
        if (lastMessage) {
          return lastMessage;
        }
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.log(`No message found within ${maxWaitTime}ms`);
    return null;
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