export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('Este correo ya está registrado.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}
