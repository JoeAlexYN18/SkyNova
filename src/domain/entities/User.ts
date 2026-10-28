export interface UserPhone {
  countryCode: string;
  dialCode: string;

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
