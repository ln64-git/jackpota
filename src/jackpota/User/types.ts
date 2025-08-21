// export interface User {
//   name: { first: string; last: string };
//   email: string;
//   dob: string;
//   location: string;
// }

export interface GeolocationResponse {
  country: string;
  region: string;   // can be "OH" or "Ohio" depending on API
  city?: string;
  lat?: number;
  lon?: number;
}

export interface RandomUserResponse {
  name: { first: string; last: string };
  email: string;
  dob: { date: string; age: number };
}