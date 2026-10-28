# SkyNova

Aplicación Expo para el registro de usuarios. La ruta principal `/` muestra el formulario; el login se añadirá después.

## Ejecutar en Expo Go

1. Instala las dependencias con `npm install`.
2. Ejecuta `npx expo start`.
3. Escanea el QR con Expo Go o abre el proyecto en un emulador.

El proyecto usa Expo SDK 58. Las rutas viven en `src/app/`; el layout raíz configura los proveedores globales y el navegador.

## Organización

- `src/domain/`: entidades, reglas de negocio y contrato del repositorio.
- `src/infrastructure/`: adaptadores y composición de dependencias. Hoy usa `InMemoryUserRepository`; al conectar una API se cambia la implementación en `src/infrastructure/container.ts`.
- `src/presentation/`: pantalla, componentes, hooks y estado del formulario.
- `src/shared/`: tema, validadores, mensajes y utilidades compartidas.

`AuthProvider` acepta un repositorio por propiedad para facilitar pruebas aisladas. Los usuarios de la implementación actual solo viven en memoria y se pierden al reiniciar la app.
