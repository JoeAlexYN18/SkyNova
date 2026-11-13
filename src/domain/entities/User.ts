export interface UserPhone {
  countryCode: string;
  dialCode: string;

  number: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: UserPhone;
  createdAt: string;
}

export type NewUserInput = Omit<User, 'id' | 'createdAt'> & { password: string };

export interface UpdateUserProfileInput {
  fullName: string;
  email: string;
  phone: UserPhone;
  currentPassword?: string;
  newPassword?: string;
}
