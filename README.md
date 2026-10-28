# SkyNova

SkyNova es una aplicación móvil para explorar y comprar drones, accesorios y repuestos. Reúne inicio, catálogo con filtros, detalle de producto, carrito, confirmación de pedidos y perfil en una experiencia sencilla para pilotos y entusiastas.

## Core de negocio

El proyecto representa una tienda especializada de un solo proveedor: SkyNova vende su propio catálogo de drones y productos relacionados. El flujo principal es:

1. Explorar o filtrar productos.
2. Consultar sus detalles y disponibilidad.
3. Añadirlos al carrito y ajustar cantidades.
4. Confirmar un pedido con datos de entrega.
5. Consultar o cancelar pedidos desde el perfil.

El esquema PostgreSQL está en `database/schema.sql` y documenta el modelo futuro de usuarios, productos, carritos y pedidos. **La aplicación todavía no está conectada a PostgreSQL ni a una API**: las cuentas, el catálogo, el carrito y los pedidos usan repositorios y estado en memoria, así que los datos de prueba se pierden al cerrar o reiniciar la aplicación. Tampoco hay un proveedor de pagos integrado.

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
Contraseña: JosephYNZ20000
```

La aplicación también permite registrar usuarios, pero las cuentas solo existen en memoria durante la sesión actual.

## Cómo probar el flujo CRUD

El CRUD principal disponible en la interfaz corresponde al carrito: crear líneas al añadir productos, leer su contenido, actualizar cantidades y eliminar productos.

1. Inicia sesión con la cuenta de prueba indicada arriba.
2. Abre **Catálogo**, elige un producto y entra a sus detalles. Pulsa **Agregar al carrito**. El indicador de Carrito debe actualizarse.
3. En **Carrito**, aumenta o reduce la cantidad. Comprueba que el total cambie, elimina una línea y prueba **Vaciar** para dejar el carrito sin productos.
4. Añade un producto otra vez y continúa con el pedido. Completa nombre, teléfono, dirección, ciudad y código de país de dos letras; confirma el pedido.
5. Ve a **Perfil → Mis pedidos**. El pedido debe aparecer con sus productos, dirección, total y estado. Al abrir Mis pedidos se limpia el indicador de pedido nuevo.
6. Pulsa **Cancelar pedido** y confirma en el diálogo. El pedido cancelado deja de contarse entre los pedidos activos; si era el único, aparece el estado vacío.

Los pedidos se crean localmente y no se realiza un cobro. Cambiar de pestaña conserva el estado mientras la aplicación siga abierta; cerrar o reiniciar la app borra los datos de prueba.

## Organización del proyecto

- `src/app/`: rutas de Expo Router.
- `src/domain/`: entidades, contratos y casos de uso.
- `src/infrastructure/`: contextos, repositorios en memoria y composición de dependencias.
- `src/presentation/`: pantallas y componentes de interfaz.
- `src/shared/`: tema, validaciones, mensajes y utilidades comunes.
- `database/schema.sql`: esquema PostgreSQL propuesto para una integración futura.

## Integrantes del grupo

1. Yalico Nicho, Joseph Alexander
2. Gutierrez Chiara, Franklin Alberto
