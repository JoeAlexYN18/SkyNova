export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('Este correo ya está registrado.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class UsernameTakenError extends Error {
  constructor() {
    super('Este nombre de usuario ya está en uso.');
    this.name = 'UsernameTakenError';
  }
}
