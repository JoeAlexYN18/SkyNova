import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import type { NewUserInput, UpdateUserProfileInput, User } from '@/domain/entities/User';
import type { AuthenticationResult, IUserRepository } from '@/domain/repositories/IUserRepository';
import { EmailAlreadyRegisteredError } from '@/domain/errors/UserErrors';
import { cacheUserProfile, getCachedUserProfile } from '@/infrastructure/data/sqliteDatabase';
import { hasNetworkConnection, isFirebaseNetworkError } from '@/infrastructure/data/firebaseDataSync';
import {
  firebaseStorageConfigured,
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseStorage,
} from '@/infrastructure/data/firebaseServices';

type UserProfile = {
  full_name: string;
  email: string;
  phone_country: string;
  phone_dial_code: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
};

export class FirebaseUserRepository implements IUserRepository {
  private isRegistering = false;
  private isDeletingAccount = false;

  async create(input: NewUserInput): Promise<User> {
    const auth = getFirebaseAuth();
    const firestore = getFirebaseFirestore();
    let credential;
    this.isRegistering = true;
    try {
      credential = await createUserWithEmailAndPassword(auth, input.email.trim().toLowerCase(), input.password);
    } catch (error) {
      this.isRegistering = false;
      if (firebaseErrorCode(error) === 'auth/email-already-in-use') throw new EmailAlreadyRegisteredError();
      throw error;
    }

    const createdAt = new Date().toISOString();
    const user: User = {
      id: credential.user.uid,
      fullName: input.fullName.trim(),
      email: credential.user.email ?? input.email.trim().toLowerCase(),
      phone: { ...input.phone },
      createdAt,
    };
    const userRef = doc(firestore, 'users', user.id);
    try {
      const profile: UserProfile = {
        full_name: user.fullName,
        email: user.email,
        phone_country: user.phone.countryCode,
        phone_dial_code: user.phone.dialCode,
        phone_number: user.phone.number,
        created_at: user.createdAt,
        updated_at: user.createdAt,
      };
      await setDoc(userRef, profile);
      this.isRegistering = false;
      return user;
    } catch (error) {
      try {
        await deleteUser(credential.user);
      } finally {
        this.isRegistering = false;
      }
      throw error;
    }
  }

  async updateProfile(userId: string, input: UpdateUserProfileInput): Promise<User> {
    const authUser = getFirebaseAuth().currentUser;
    if (!authUser || authUser.uid !== userId || !authUser.email) {
      throw new Error('No se pudo verificar la sesión para actualizar el perfil.');
    }

    const previousUser = await this.getProfile(userId);
    const nextUser: User = {
      ...previousUser,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: { ...input.phone },
    };
    const emailChanged = nextUser.email !== previousUser.email.toLowerCase();
    const newPassword = input.newPassword;
    const passwordChanged = Boolean(newPassword);
    const credentialsChanged = emailChanged || passwordChanged;

    if (credentialsChanged) {
      if (!input.currentPassword) {
        throw new Error('Confirma tu contraseña actual para cambiar el correo o la contraseña.');
      }
      await reauthenticateWithCredential(
        authUser,
        EmailAuthProvider.credential(authUser.email, input.currentPassword),
      );
    }

    const firestore = getFirebaseFirestore();
    await writeProfileChange(firestore, previousUser, nextUser);
    let emailUpdated = false;
    let passwordUpdated = false;
    try {
      if (passwordChanged) {
        if (!newPassword) throw new Error('Ingresa una nueva contraseña para continuar.');
        await updatePassword(authUser, newPassword);
        passwordUpdated = true;
      }
      if (emailChanged) {
        await updateEmail(authUser, nextUser.email);
        emailUpdated = true;
      }
      await updateAuthProfile(authUser, { displayName: nextUser.fullName });
      return nextUser;
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      if (emailUpdated) {
        try {
          await updateEmail(authUser, previousUser.email);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (passwordUpdated && input.currentPassword) {
        try {
          await updatePassword(authUser, input.currentPassword);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      try {
        await writeProfileChange(firestore, nextUser, previousUser);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      if (rollbackErrors.length) {
        throw new Error('No se pudo completar el cambio ni revertir todos los datos. Inicia sesión de nuevo y contacta a soporte.');
      }
      if (firebaseErrorCode(error) === 'auth/email-already-in-use') throw new EmailAlreadyRegisteredError();
      throw error;
    }
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const authUser = getFirebaseAuth().currentUser;
    if (!authUser || authUser.uid !== userId || !authUser.email) {
      throw new Error('No se pudo verificar la sesión para eliminar la cuenta.');
    }

    this.isDeletingAccount = true;
    try {
      try {
        await reauthenticateWithCredential(
          authUser,
          EmailAuthProvider.credential(authUser.email, password),
        );
      } catch (error) {
        if (firebaseErrorCode(error) === 'auth/invalid-credential'
          || firebaseErrorCode(error) === 'auth/wrong-password') {
          throw new Error('La contraseña no es correcta.');
        }
        throw error;
      }

      const firestore = getFirebaseFirestore();
      const userRef = doc(firestore, 'users', userId);
      const userSnapshot = await getDoc(userRef);
      if (!userSnapshot.exists()) throw new Error('No se encontró el perfil de esta cuenta en Firebase.');

      const [addressSnapshots, orderSnapshots, reviewSnapshots, cartSnapshot] = await Promise.all([
        getDocs(query(collection(firestore, 'addresses'), where('user_id', '==', userId))),
        getDocs(query(collection(firestore, 'orders'), where('user_id', '==', userId))),
        getDocs(query(collection(firestore, 'product_reviews'), where('user_id', '==', userId))),
        getDoc(doc(firestore, 'carts', userId)),
      ]);
      await deleteUserReceipts(userId, orderSnapshots.docs);

      const ownedDocuments = [
        ...addressSnapshots.docs,
        ...orderSnapshots.docs,
        ...reviewSnapshots.docs,
        ...(cartSnapshot.exists() ? [cartSnapshot] : []),
      ];
      for (let offset = 0; offset < ownedDocuments.length; offset += 450) {
        const batch = writeBatch(firestore);
        ownedDocuments.slice(offset, offset + 450).forEach((snapshot) => batch.delete(snapshot.ref));
        await batch.commit();
      }
      await deleteDoc(userRef);

      try {
        await deleteUser(authUser);
      } catch (error) {
        try {
          await setDoc(userRef, {
            full_name: requiredString(userSnapshot.get('full_name'), 'nombre'),
            email: authUser.email,
            phone_country: requiredString(userSnapshot.get('phone_country'), 'país'),
            phone_dial_code: requiredString(userSnapshot.get('phone_dial_code'), 'código telefónico'),
            phone_number: requiredString(userSnapshot.get('phone_number'), 'teléfono'),
            created_at: requiredString(userSnapshot.get('created_at'), 'fecha de creación'),
            updated_at: new Date().toISOString(),
          });
        } catch {
          throw new Error('Firebase no pudo eliminar la cuenta y tampoco se pudo restaurar el perfil. Contacta a soporte.');
        }
        if (firebaseErrorCode(error) === 'auth/requires-recent-login') {
          throw new Error('Por seguridad, vuelve a iniciar sesión y repite la eliminación de tu cuenta.');
        }
        throw error;
      }
    } finally {
      this.isDeletingAccount = false;
    }
  }

  async authenticate(identifier: string, password: string): Promise<AuthenticationResult> {
    const email = identifier.trim().toLowerCase();
    if (!email.includes('@')) return { status: 'identifier_not_found' };
    try {
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const user = await this.getProfile(credential.user.uid);
      return { status: 'success', user };
    } catch (error) {
      const code = firebaseErrorCode(error);
      if (
        code === 'auth/user-not-found'
        || code === 'auth/invalid-email'
        || code === 'auth/wrong-password'
        || code === 'auth/invalid-credential'
      ) {
        return { status: 'invalid_credentials' };
      }
      throw error;
    }
  }

  async resetPassword(_identifier: string, _newPassword: string): Promise<boolean> {
    throw new Error('La recuperación de Firebase se realiza mediante un enlace enviado por correo.');
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
  }

  async signOut() {
    await signOut(getFirebaseAuth());
  }

  subscribe(onChange: (user: User | null) => void, onError: (error: unknown) => void) {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
        if (this.isRegistering || this.isDeletingAccount) return;
        if (!firebaseUser) {
          onChange(null);
          return;
        }
        void (async () => {
          try {
            if (!(await hasNetworkConnection())) {
              const cached = await getCachedUserProfile(firebaseUser.uid);
              if (cached) {
                onChange(cached);
                return;
              }
            }
            const user = await this.getProfile(firebaseUser.uid);
            onChange(user);
            void cacheUserProfile(user).catch(onError);
          } catch (error) {
            if (isFirebaseNetworkError(error)) {
              const cached = await getCachedUserProfile(firebaseUser.uid).catch(() => null);
              if (cached) {
                onChange(cached);
                return;
              }
            }
            onError(error);
          }
        })();
      }, onError);
    } catch (error) {
      onError(error);
      return () => {};
    }
  }

  private async getProfile(uid: string): Promise<User> {
    const snapshot = await getDoc(doc(getFirebaseFirestore(), 'users', uid));
    if (!snapshot.exists()) throw new Error('No se encontró el perfil de esta cuenta en Firebase.');
    const data = snapshot.data();
    const profile = {
      full_name: requiredString(data.full_name, 'nombre'),
      email: requiredString(data.email, 'correo'),
      phone_country: requiredString(data.phone_country, 'país'),
      phone_dial_code: requiredString(data.phone_dial_code, 'código telefónico'),
      phone_number: requiredString(data.phone_number, 'teléfono'),
      created_at: requiredString(data.created_at, 'fecha de creación'),
      updated_at: requiredString(data.updated_at, 'fecha de actualización'),
    } satisfies UserProfile;
    return {
      id: uid,
      fullName: profile.full_name,
      email: profile.email,
      phone: {
        countryCode: profile.phone_country,
        dialCode: profile.phone_dial_code,
        number: profile.phone_number,
      },
      createdAt: profile.created_at,
    };
  }
}

async function deleteUserReceipts(
  userId: string,
  orderDocuments: { get(field: string): unknown }[],
) {
  if (!firebaseStorageConfigured) return;
  const storage = getFirebaseStorage();
  const receiptPaths = new Set(
    orderDocuments
      .map((order) => order.get('receipt_storage_path'))
      .filter((path): path is string => typeof path === 'string' && path.startsWith(`receipts/${userId}/`)),
  );
  await Promise.all([...receiptPaths].map(async (path) => {
    try {
      await deleteObject(ref(storage, path));
    } catch {
      // La limpieza de comprobantes es de mejor esfuerzo; no debe impedir eliminar la cuenta.
    }
  }));
}

async function writeProfileChange(
  firestore: ReturnType<typeof getFirestore>,
  previousUser: User,
  nextUser: User,
) {
  const userRef = doc(firestore, 'users', nextUser.id);
  const now = new Date().toISOString();

  await runTransaction(firestore, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) throw new Error('No se encontró el perfil de esta cuenta en Firebase.');
    transaction.set(userRef, {
      full_name: nextUser.fullName,
      email: nextUser.email,
      phone_country: nextUser.phone.countryCode,
      phone_dial_code: nextUser.phone.dialCode,
      phone_number: nextUser.phone.number,
      created_at: previousUser.createdAt,
      updated_at: now,
    });
  });
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value) {
    throw new Error(`El perfil de Firebase no contiene un ${field} válido.`);
  }
  return value;
}

function firebaseErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';
}
