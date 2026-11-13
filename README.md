# SkyNova

## 1. Descripción del proyecto

SkyNova es un prototipo móvil de una tienda especializada en drones. Inspirado en el comercio del sector hacia 2026, reúne drones para fotografía, vídeo y vuelo FPV con accesorios y repuestos específicos, como baterías, hélices y filtros. La idea es que cada persona pueda explorar el catálogo, revisar la información disponible y completar una compra desde el teléfono.

El objetivo del proyecto es mostrar ese recorrido de compra y la gestión posterior del pedido. SkyNova no es una app de vuelo, sino una demostración seria de comercio electrónico.

## 2. Core de negocio elegido

El core es el comercio electrónico B2C de un proveedor especializado: conectar un catálogo de equipos y componentes con una experiencia de compra clara, desde la búsqueda del producto hasta la revisión del pedido. No es un marketplace de varios vendedores.

## 3. Requisitos

- **Node.js 22.13 o superior** y npm.
- **Android:** Android Studio, Android SDK (plataforma 37 para la compilación local) y JDK 17, recomendado para React Native.
- **iOS:** macOS y Xcode compatible con Expo SDK 58. La compilación local para iOS no está disponible en Windows.
- Para probar en un teléfono físico sin compilar localmente, instala **Expo Go**; en ese caso no necesitas Android Studio, JDK ni Xcode.

## 4. Instalación

Desde la carpeta del proyecto —donde está `package.json`— instala las dependencias:

```bash
npm install
```

No hace falta instalar React Native CLI globalmente. Sin configuración de Firebase, el prototipo conserva el modo de demostración y usa SQLite local.

### Conectar Firebase

1. Crea un proyecto y una aplicación web en Firebase; activa **Authentication → Email/Password** y crea Firestore.
2. Crea/habilita el bucket de **Storage** en la consola. La consola puede exigir activar el plan Blaze y asociar facturación; revisa costos y condiciones antes de aceptarlo. El código no cambia tu plan.
3. Copia `.env.skynova` como `.env` y completa la configuración de la aplicación web, incluido `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` con el nombre exacto del bucket. Estas variables `EXPO_PUBLIC_*` son configuración pública del cliente, no claves administrativas. Expo lee `.env`; nunca incluyas una cuenta de servicio en la app.
4. Después de verificar las reglas, publícalas manualmente con `firebase deploy --only firestore:rules,storage` (usa `firebase.json`) o pégalas en Firebase Console. Este repositorio no las despliega automáticamente.
5. Reinicia Expo después de cambiar `.env`. El registro, inicio/cierre de sesión y recuperación de contraseña usan Firebase Authentication; los pedidos se cachean en SQLite y se sincronizan en segundo plano con Firebase al recuperar conexión. Los IDs estables hacen que reintentar un envío no cree otro pedido.

Los comprobantes son opcionales: se guardan primero en el dispositivo y se suben a `receipts/{uid}/{orderId}/` cuando hay conexión, bucket y sesión válidos. Se aceptan imágenes JPG, PNG, WebP o HEIC de hasta 5 MB; `storage.rules` limita acceso al propietario. No se pueden sincronizar hasta habilitar/configurar Storage y publicar las reglas.

### Servicio REST de demostración

Para probar el consumo REST del catálogo y la sincronización idempotente de pedidos, ejecuta en otra terminal:

```bash
npm run mock:api
```

Configura `EXPO_PUBLIC_SKYNOVA_API_URL` en `.env` con `http://localhost:8787` para web, `http://10.0.2.2:8787` para el emulador Android o `http://<IP-LAN-del-equipo>:8787` para un dispositivo físico; reinicia Expo después. El servidor expone `GET /catalog` y `PUT /orders/{id}`. Es solo un mock local de desarrollo, sin autenticación ni garantías de producción; no lo expongas a Internet ni lo uses con datos reales. Sin esa variable, la app usa el catálogo local/Firebase. La cola de pedidos continúa en SQLite aunque el servicio REST no esté disponible.

El catálogo de demostración se siembra en SQLite para el primer uso y como respaldo offline. Si Firestore tiene productos cargados desde un entorno administrativo, la app descarga `categories`, `products`, `drone_specs`, `product_images` y reseñas, y actualiza la caché SQLite; no se permite editar el catálogo desde el cliente. Las reseñas usan `product_reviews/{productId}_{userId}`; el carrito usa `carts/{userId}`; direcciones y pedidos se guardan en `addresses/{addressId}` y `orders/{orderId}`. No guardes contraseñas en Firestore/SQLite ni incluyas una cuenta de servicio en la app.

## 5. Ejecución

La aplicación usa **Expo SDK 58**, React Native y Expo Router. Para iniciar el servidor de desarrollo:

```bash
npx expo start
```

Escanea el QR con Expo Go o abre un emulador Android y pulsa `a` en la terminal. También puedes iniciar directamente en Android con `npx expo start --android`; en macOS, usa `npx expo start --ios` para el simulador.

Para compilar e instalar una aplicación nativa localmente:

```bash
npx expo run:android
npx expo run:ios
```

Estos comandos requieren Android Studio/JDK o Xcode, según la plataforma. Este repositorio no incluye las carpetas nativas `android/` ni `ios/`, así que `npx react-native run-android` y `npx react-native run-ios` no son los comandos adecuados para iniciarlo. En Windows no es posible compilar localmente la versión de iOS.

## 6. Cómo probar el flujo CRUD de pedidos

1. Inicia la app e ingresa con la cuenta de demostración que ya aparece en **Login**, o crea una cuenta desde **Registro**.
2. En **Catálogo**, escribe para ver sugerencias de productos, marcas y categorías; confirma la búsqueda con el botón o la tecla **Buscar** para actualizar los resultados. También puedes abrir una sugerencia directamente.
3. En **Carrito**, cambia cantidades o elimina artículos. Luego completa los datos de entrega y confirma la compra para **crear** el pedido. El formulario pide teléfono nacional, sin anteponer el código del país.
4. En **Perfil → Mis pedidos**, abre el pedido para **consultar** su estado, artículos, total y dirección.
5. Edita y guarda la dirección de entrega mientras el pedido esté pendiente o pagado para **actualizarlo**.
6. **Cancela** el pedido desde su detalle: queda marcado como cancelado y sigue disponible en el historial (borrado lógico, no eliminación definitiva).

En el checkout de demostración se puede elegir Yape o Visa; la preferencia queda guardada en SQLite y Firestore y se muestra en el detalle. Al confirmar, el flujo marca el pedido como `paid` para demostrar el recorrido de compra. No hay integración con una pasarela ni se realiza un cobro real; nunca se solicitan credenciales ni datos de tarjeta. El flujo permite consultar, actualizar y cancelar pedidos.

## 7. Arquitectura: Clean Architecture

El código separa las reglas del negocio de la interfaz y del almacenamiento:

- `src/domain/`: entidades, contratos de repositorio y casos de uso; contiene las reglas centrales.
- `src/infrastructure/`: repositorios SQLite, integración Firebase, contextos de estado y composición de dependencias.
- `src/presentation/`: pantallas, componentes y formularios.
- `src/app/`: rutas y navegación con Expo Router.
- `src/shared/`: tema, validaciones y utilidades compartidas.

La capa de dominio define contratos que la infraestructura implementa. SQLite proporciona persistencia local del catálogo, carrito y pedidos; Firebase Authentication gestiona credenciales y Firestore sincroniza perfiles y datos de usuario cuando se configura el proyecto. `database/schema.sql` documenta el modelo relacional; SQLite lo adapta a tipos y restricciones compatibles con el dispositivo.

## 8. Integrantes del grupo

1. Yalico Nicho, Joseph Alexander
2. Gutierrez Chiara, Franklin Alberto
