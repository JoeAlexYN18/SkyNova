export interface UserPhone {
  countryCode: string;
  dialCode: string;
  /** National digits only; use countryCode to normalize it to E.164 server-side. */
  number: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phone: UserPhone;
  createdAt: string;
}

export type NewUserInput = Omit<User, 'id' | 'createdAt'> & { password: string };
