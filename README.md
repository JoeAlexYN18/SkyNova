# SkyNova

SkyNova es una aplicación móvil para explorar y comprar drones, accesorios y repuestos. Incluye catálogo, carrito, checkout y gestión de pedidos desde el perfil.

## Core de negocio

SkyNova representa una tienda especializada de un solo proveedor. El flujo principal es:

1. Explorar o filtrar productos.
2. Consultar sus detalles y disponibilidad.
3. Añadirlos al carrito y ajustar cantidades.
4. Confirmar un pedido con datos de entrega.
5. Consultar, editar los datos de entrega o cancelar pedidos desde el perfil.

El catálogo permite buscar, filtrar por categoría, tipo, ofertas o destacados, ordenar resultados y ver cuántos productos coinciden. El esquema PostgreSQL está en `database/schema.sql` y sirve como referencia para una integración futura. Por ahora no hay conexión a una base de datos, API ni pasarela de pago: los datos se manejan en memoria y se reinician al cerrar la aplicación.

## Requisitos

- Node.js **22.13 o superior** y npm. Esta versión de Expo SDK requiere Node 22.13.x como mínimo. [Referencia de Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- Para desarrollar o probar en Android con emulador: Android Studio con Android SDK (el proyecto usa compile SDK 37) y un dispositivo virtual configurado. Para compilar la aplicación localmente también se requiere JDK 17.
- Para compilar o ejecutar un simulador iOS localmente: macOS y Xcode 26.4 o superior. También se puede abrir la app en un iPhone con Expo Go, sin compilarla localmente.
- Con Expo Go en un teléfono físico, basta con tener Node/npm en el equipo y Expo Go instalado en el teléfono; Android Studio, JDK y Xcode solo hacen falta para emuladores o compilaciones nativas locales.

La guía oficial de React Native recomienda JDK 17 y explica la configuración de Android Studio y Xcode: [Configurar el entorno](https://reactnative.dev/docs/set-up-your-environment).

## Instalación

Clona o descarga el repositorio y abre una terminal en la carpeta del proyecto (la que contiene `package.json`). Instala las dependencias fijadas en `package-lock.json`:

```bash
npm install
```

No se necesita instalar una CLI global ni una base de datos para ejecutar el flujo local.

## Ejecución

### Opción recomendada: Expo Go

Inicia el servidor de desarrollo:

```bash
npx expo start
```

Escanea el código QR con Expo Go en el teléfono. Para Android se puede abrir también un emulador configurado en Android Studio y pulsar `a` en la terminal de Expo. El equipo y el teléfono deben poder comunicarse por la red local.

En Windows PowerShell, si la política del sistema bloquea `npx` o `npm`, usa `npx.cmd expo start` o `npm.cmd start`.

También están disponibles estos comandos abreviados:

```bash
npm run android
npm run ios
npm run web
```

### Compilación nativa local

El repositorio usa Expo Router y no incluye carpetas nativas `android/` o `ios/`. Por eso, los comandos de React Native CLI `npx react-native run-android` y `npx react-native run-ios` **no aplican directamente** a este proyecto. Para compilar con las herramientas nativas, usa los comandos de Expo:

```bash
npx expo run:android
npx expo run:ios
```

Expo genera automáticamente las carpetas nativas la primera vez que ejecutas `npx expo run:android` o `npx expo run:ios`. Android requiere Android Studio, Android SDK y JDK 17. iOS requiere macOS y Xcode. El comando de iOS no se puede ejecutar localmente desde Windows. Consulta [Desarrollo local con Expo](https://docs.expo.dev/guides/local-app-development/) para más detalles.

## Credenciales de acceso de prueba

La pantalla de Login viene precargada con esta cuenta local:

```text
Usuario: JoeAlexYN18
Contraseña: JosephYNZ2000
```

La aplicación también permite registrar usuarios. Las cuentas de prueba existen solo en memoria y se reinician al cerrar la aplicación.

## Pedidos y CRUD

El CRUD de pedidos se demuestra con operaciones sencillas:

- **Crear:** confirmar el checkout registra los productos, precios y dirección como una copia del pedido. En el flujo actual queda en estado `paid`.
- **Leer:** **Perfil → Mis pedidos** muestra el historial separado en pedidos en curso, entregados y cancelados, con su detalle y estado.
- **Actualizar:** se pueden corregir los datos de entrega mientras el pedido está en `pending` o `paid`.
- **Cancelar:** cambia el estado a `cancelled`; el pedido se conserva en el historial en lugar de borrarse.

El repositorio valida los datos de entrega y los artículos, evita líneas duplicadas y comprueba que el pedido y su dirección pertenezcan al mismo usuario. `pending` está disponible para pedidos aún no confirmados, pero el checkout actual confirma el pedido como `paid`; los cambios a `shipped` y `delivered` todavía no se simulan desde la interfaz.

## Cómo probar el flujo

1. Inicia sesión con la cuenta de prueba precargada.
2. En **Catálogo**, abre un producto y agrégalo al carrito.
3. En **Carrito**, ajusta cantidades o elimina artículos; revisa que el total se actualice.
4. Finaliza la compra completando los datos de entrega. El país determina el prefijo telefónico; escribe solo el número nacional.
5. Abre **Perfil → Mis pedidos** para revisar el pedido, editar la entrega o cancelarlo. Al cancelar, seguirá visible en la sección **Cancelados**.

Los pedidos y sus cambios se mantienen en memoria mientras la aplicación siga abierta. `IOrderRepository` define el contrato y `InMemoryOrderRepository` implementa el almacenamiento actual, listo para sustituirse por una persistencia futura.

## Organización del proyecto

- `src/app/`: rutas de Expo Router.
- `src/domain/`: entidades, contratos y casos de uso.
- `src/infrastructure/`: contextos, repositorios en memoria y composición de dependencias.
- `src/domain/repositories/IOrderRepository.ts`: contrato CRUD de pedidos.
- `src/infrastructure/repositories/InMemoryOrderRepository.ts`: implementación actual en memoria; cancelar conserva el pedido con estado `cancelled`.
- `src/presentation/`: pantallas y componentes de interfaz.
- `src/shared/`: tema, validaciones, mensajes y utilidades comunes.
- `database/schema.sql`: esquema PostgreSQL propuesto para una integración futura.

## Integrantes del grupo

1. Yalico Nicho, Joseph Alexander
2. Gutierrez Chiara, Franklin Alberto
