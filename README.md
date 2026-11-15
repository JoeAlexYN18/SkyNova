# SkyNova

## 1. Descripción del proyecto

SkyNova es un prototipo móvil de una tienda especializada en drones. Inspirado en el comercio del sector hacia 2026, reúne drones para fotografía, vídeo y vuelo FPV con accesorios y repuestos específicos, como baterías, hélices y filtros. La idea es que cada persona pueda explorar el catálogo, revisar la información disponible y completar una compra desde el teléfono.

El objetivo del proyecto es mostrar ese recorrido de compra y la gestión posterior del pedido. SkyNova no es una app de vuelo, sino una demostración seria de comercio electrónico.

## 2. Core de negocio elegido

El core es el comercio electrónico B2C de un proveedor especializado: conectar un catálogo de equipos y componentes con una experiencia de compra clara, desde la búsqueda del producto hasta la revisión del pedido. No es un marketplace de varios vendedores.

## 3. Requisitos

- **Node.js 22.13 o superior** y npm.
- **Android:** Android Studio, Android SDK y JDK 17 para compilar el APK localmente.
- **iOS:** macOS y Xcode compatible con Expo SDK 58. La compilación local para iOS no está disponible en Windows.
- Para probar en un teléfono físico sin compilar, instala **Expo Go**; en ese caso no necesitas Android Studio ni JDK.

## 4. Instalación

Desde la carpeta del proyecto —donde está `package.json`— instala las dependencias:

```bash
npm install
```

No hace falta instalar React Native CLI globalmente. Sin configuración de Firebase, el prototipo conserva el modo de demostración con datos locales.

## 5. Configuración de Firebase

1. Crea un proyecto y una aplicación web en [Firebase Console](https://console.firebase.google.com); activa **Authentication → Email/Password** y crea la base de datos **Firestore**.
2. Crea un archivo `.env` en la raíz del proyecto con las credenciales públicas de la app web (nunca incluyas una cuenta de servicio):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

3. Publica las reglas de seguridad: pega `firestore.rules` en Firebase Console (Firestore → Rules) o usa `firebase deploy --only firestore:rules` si tienes Firebase CLI.
4. Reinicia Expo después de cambiar `.env`.

## 6. Cómo ejecutar el proyecto

La aplicación usa **Expo SDK 58**, React Native y Expo Router.

```bash
npx expo start
```

Escanea el QR con Expo Go o abre un emulador/simulador y pulsa `a` (Android) o `i` (iOS) en la terminal. Para desarrollo nativo local:

```bash
npx expo run:android   # Android — requiere Android Studio/JDK
npx expo run:ios       # iOS — requiere macOS con Xcode
```

En Windows no es posible compilar localmente la versión de iOS; usa Expo Go, un simulador en una Mac o EAS Build.

El catálogo de demostración se siembra en SQLite para el primer uso y como respaldo offline. Si Firestore tiene productos cargados desde un entorno administrativo, la app los descarga (`categories`, `products`, `drone_specs`, `product_images`, reseñas) y actualiza la caché; el catálogo no se edita desde el cliente. Las reseñas usan `product_reviews/{productId}_{userId}`; el carrito usa `carts/{userId}`; direcciones y pedidos se guardan en `addresses/{addressId}` y `orders/{orderId}`.

## 7. Cómo probar el login

1. Abre la app y verás la pantalla de **Login**. Si ya tienes cuenta en Firebase Authentication, ingresa correo y contraseña.
2. Para crear una cuenta, ve a **Registro**, completa nombre, correo, país, teléfono y contraseña, y acepta los términos.
3. La recuperación de contraseña está en **¿Olvidaste tu contraseña?**: Firebase envía un correo con el enlace de restablecimiento.
4. Prueba los casos: credenciales incorrectas (error en el campo), correo duplicado al registrarse, y login sin conexión (usa el perfil cacheado en SQLite si ya iniciaste antes).
5. En Firebase Console → **Authentication → Users** verifica que cada registro/login aparezca como usuario.

## 8. Cómo probar el CRUD

El CRUD visible para el usuario es el de **pedidos** (crear, consultar, actualizar, cancelar):

1. En **Catálogo** busca productos, abre uno y agrégalo al **Carrito**.
2. En el carrito ajusta cantidades, completa la dirección de entrega, elige **Yape** o **Visa** (ambos son simulados, sin cobro real) y confirma la compra para **crear** el pedido.
3. En **Perfil → Mis pedidos**, abre el pedido para **consultar** estado, artículos, total y dirección.
4. Edita y guarda la dirección de entrega mientras el pedido esté pendiente o pagado para **actualizarlo**.
5. **Cancela** el pedido desde su detalle: queda marcado como cancelado y sigue en el historial (borrado lógico). El stock se repone en el catálogo.

También puedes **crear/editar/eliminar reseñas** en el detalle de cada producto y gestionarlas en **Perfil → Mis reseñas**; y **editar tu perfil** (nombre, correo, teléfono, contraseña) desde **Ajustes de cuenta**.

## 9. Cómo probar SQLite

SQLite es la persistencia local inmediata; Firebase sincroniza en segundo plano:

1. **Offline-first:** activa el modo avión y repite flujos — agregar al carrito, crear un pedido, publicar o eliminar una reseña. Todo debe completarse localmente con mensajes de "guardado en tu dispositivo".
2. **Persistencia:** cierra y reabre la app (o reinicia el teléfono); el carrito, pedidos, reseñas y perfil cacheado deben seguir ahí.
3. **Sincronización:** quita el modo avión y espera unos segundos; los pedidos/reseñas pendientes se confirman solos y sus badges cambian de "pendiente" a sincronizado.
4. **Sin duplicados:** cada pedido/reseña tiene un ID estable — reintentar la sincronización no crea registros dobles en Firebase.
5. El esquema está documentado en `database/schema.sql`; el código lo crea y migra automáticamente en `src/infrastructure/data/sqliteDatabase.ts`.

## 10. Cómo probar el consumo de API REST

La app soporta un servicio REST opcional para catálogo y pedidos. Incluye un mock de desarrollo:

```bash
npm run mock:api
```

Corre en `http://localhost:8787` (`GET /catalog`, `PUT /orders/{id}`, `GET /health`). Para que la app lo use, agrega en `.env` según el destino:

```env
# Expo Go / web
EXPO_PUBLIC_SKYNOVA_API_URL=http://localhost:8787
# Emulador Android
EXPO_PUBLIC_SKYNOVA_API_URL=http://10.0.2.2:8787
# Teléfono físico en la misma red
EXPO_PUBLIC_SKYNOVA_API_URL=http://<IP-LAN-del-equipo>:8787
```

Reinicia Expo después de cambiar la variable. El mock no tiene autenticación ni garantías de producción — no lo expongas a Internet ni uses datos reales. Sin la variable, la app usa el catálogo local/Firebase y la cola de pedidos sigue funcionando en SQLite.

## 11. Cómo probar Firestore

Firestore es el destino de sincronización (no hay Realtime Database en el proyecto):

- **Auth:** los usuarios aparecen en Authentication → Users; el perfil se guarda en `users/{uid}`.
- **Catálogo:** `categories`, `products`, `drone_specs`, `product_images` son de solo lectura para el cliente.
- **Pedidos:** `orders/{orderId}` con `items` y `shipping_address`; el estado pasa de `pending` a `paid` y luego `cancelled` si se cancela.
- **Reseñas:** `product_reviews/{productId}_{userId}` — una por usuario y producto.
- **Carrito:** `carts/{userId}` con los items y `updated_at`.
- **Direcciones:** `addresses/{addressId}`; la última usada queda como `is_default`.

Para verificar: crea un pedido online, abre Firestore Console → colección `orders` y confirma que el documento existe con sus items. Repite offline y verifica que aparece tras recuperar la conexión. Revisa también que `firestore.rules` esté publicada.

## 12. Cómo generar el binario y ejecutar en dispositivo/emulador

**Android** — el proyecto incluye la carpeta `android/` generada, así que puedes compilar directo con Gradle:

```powershell
cd android
.\gradlew.bat assembleDebug     # APK de desarrollo (~230 MB, necesita Metro)
.\gradlew.bat assembleRelease   # APK release (~ligero, funciona solo)
.\gradlew.bat bundleRelease     # AAB para Google Play (~app-release.aab)
```

Los artefactos quedan en `android/app/build/outputs/apk/debug/app-debug.apk`, `apk/release/app-release.apk` y `bundle/release/app-release.aab`.

**iOS** — requiere macOS con Xcode. Como el proyecto usa Continuous Native Generation, primero genera la carpeta nativa y luego compila:

```bash
npx expo prebuild --platform ios
npx expo run:ios                # compila e instala en el simulador
```

Para un dispositivo físico o TestFlight, genera el proyecto y ábrelo en Xcode (`ios/SkyNova.xcworkspace`), o usa EAS Build en la nube desde cualquier sistema:

```bash
npx eas-cli build --platform ios --profile production
```

- **Binario debug (Android):** al abrirlo necesita `npx expo start` corriendo y `adb reverse tcp:8081 tcp:8081` si usas USB. Sirve para iterar.
- **Binario release (Android):** lleva el JS empaquetado — instálalo y funciona sin PC. Es el que se comparte para pruebas.
- **Emuladores:** Android Studio (Device Manager) para Android; Xcode → simuladores para iOS, o Expo Go en ambos.
- **Dispositivo físico:** copia el APK en Android (permite "instalar apps de orígenes desconocidos"); en iOS instala desde Xcode, TestFlight o Expo Go.

## 13. Arquitectura: Clean Architecture

El código separa las reglas del negocio de la interfaz y del almacenamiento:

- `src/domain/`: entidades, contratos de repositorio y casos de uso; contiene las reglas centrales.
- `src/infrastructure/`: repositorios SQLite, integración Firebase/REST, contextos de estado y composición de dependencias.
- `src/presentation/`: pantallas, componentes y formularios.
- `src/app/`: rutas y navegación con Expo Router.
- `src/shared/`: tema, validaciones y utilidades compartidas.

SQLite es la fuente inmediata (catálogo, carrito, pedidos, reseñas, perfil cacheado); Firebase Authentication gestiona credenciales y Firestore sincroniza datos; el REST opcional replica catálogo y pedidos. Las escrituras son idempotentes (IDs estables y upserts), así que reintentar una sincronización nunca duplica registros.

## 14. Integrantes del grupo

1. Yalico Nicho, Joseph Alexander
2. Gutierrez Chiara, Franklin Alberto
