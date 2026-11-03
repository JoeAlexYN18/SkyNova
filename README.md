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

No hace falta instalar React Native CLI globalmente ni configurar una base de datos para probar el prototipo.

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
2. En **Catálogo**, busca o filtra un dron, accesorio o repuesto; abre su ficha y añádelo al carrito.
3. En **Carrito**, cambia cantidades o elimina artículos. Luego completa los datos de entrega y confirma la compra para **crear** el pedido. El formulario pide teléfono nacional, sin anteponer el código del país.
4. En **Perfil → Mis pedidos**, abre el pedido para **consultar** su estado, artículos, total y dirección.
5. Edita y guarda la dirección de entrega mientras el pedido esté pendiente o pagado para **actualizarlo**.
6. **Cancela** el pedido desde su detalle: queda marcado como cancelado y sigue disponible en el historial (borrado lógico, no eliminación definitiva).

Al confirmar el checkout se crea un pedido de demostración en estado `paid`; de esa forma, la funcionalidad se ve directamente, sin preocuparnos por detalles secundarios aún. El flujo permite crear, consultar, actualizar y cancelar pedidos, pero no simula su envío ni entrega.

## 7. Arquitectura: Clean Architecture

El código separa las reglas del negocio de la interfaz y del almacenamiento:

- `src/domain/`: entidades, contratos de repositorio y casos de uso; contiene las reglas centrales.
- `src/infrastructure/`: repositorios en memoria, contextos de estado y composición de dependencias.
- `src/presentation/`: pantallas, componentes y formularios.
- `src/app/`: rutas y navegación con Expo Router.
- `src/shared/`: tema, validaciones y utilidades compartidas.

La capa de dominio define contratos que la infraestructura implementa, lo que permite cambiar el almacenamiento sin acoplar las reglas de negocio a una base de datos. En esta versión, los datos se guardan solo en memoria y se pierden al cerrar la app; `database/schema.sql` es una referencia para una posible persistencia futura, no una base conectada.

## 8. Integrantes del grupo

1. Yalico Nicho, Joseph Alexander
2. Gutierrez Chiara, Franklin Alberto
