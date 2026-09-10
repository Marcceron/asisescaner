# Asis Escáner

Aplicación web responsive para navegador que permite capturar una ventana, delimitarla, estimar sus medidas mediante calibración, configurar sus piezas y descargar una cotización PDF. No instala una PWA ni registra un service worker.

La interfaz utiliza **Inter Tight** con los dos pesos definidos en Figma: Regular (400) y SemiBold (600). Los archivos WOFF2 se sirven desde la propia aplicación.

## Inicio rápido

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. Para probar sin cámara, selecciona **Usar imagen de demostración**.

La cámara requiere `localhost` durante desarrollo o HTTPS en producción. El navegador siempre solicita permiso antes de abrirla.

Cuando el track publica la capacidad `zoom`, el diálogo muestra un slider y la acción **Alejar al máximo**. Una cámara de iPhone conectada como fuente de video no expone su LiDAR a Safari; la interfaz detecta esta limitación y mantiene la ruta visual/calibrada.

## Comandos

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Flujo implementado

1. Abrir la cámara, cargar una fotografía o utilizar la muestra incluida.
2. En **Modo Medición**, ajustar las cuatro esquinas detectadas con nodos circulares (también admiten flechas; Shift aumenta el paso).
3. Elegir si la medida conocida corresponde al ancho o al alto e introducir su valor real. La otra dimensión y la diagonal se calculan automáticamente.
4. Corregir manualmente ancho y alto si es necesario.
5. En **Modo Edición**, elegir cortina, cortinero y accesorios sobre la perspectiva detectada. Los cortineros dummy se renderizan en Three.js y ofrecen gizmos para mover, rotar y escalar.
6. Previsualizar la composición, consultar el total y descargar el PDF.

## Privacidad

Las capturas se procesan localmente. La aplicación no contiene un servicio de subida. Al borrar el proyecto se eliminan de la sesión los datos de la fotografía y la configuración. Los tracks de cámara se detienen al capturar, cerrar el diálogo o desmontar el componente.

## Limitaciones del MVP

- Una sola fotografía no contiene escala física absoluta. Sin una referencia real la app no muestra centímetros inventados.
- La homografía estima una rectificación métrica suponiendo píxeles cuadrados, punto principal centrado y una cámara pinhole. Si esos supuestos no producen una solución estable, se usa una proporción simétrica de lados opuestos.
- `AssistedWindowDetector` usa bordes y ajuste de líneas en el navegador. `OnnxWindowDetector` mantiene el contrato para integrar posteriormente un modelo entrenado.
- Las cortinas actuales son previews perspectivadas y los cortineros son geometría 3D procedural. El catálogo admite `modelUrl` para conectar los GLB/glTF optimizados definitivos.
- El catálogo es local y demostrativo.
- La persistencia utiliza almacenamiento local del navegador; una versión con cuentas deberá migrarla a un repositorio remoto consentido.
- WebXR y sensores de profundidad no forman parte del camino crítico por su compatibilidad desigual.

## Próxima fase

- Entrenar o adaptar un modelo de segmentación de ventanas y exportarlo a ONNX.
- Ejecutar inferencia en un Web Worker con WebGPU cuando esté disponible y WASM como fallback.
- Añadir calibración por marcador impreso y cargar los GLB/glTF definitivos con un renderer WebGL.
- Implementar proyectos con múltiples habitaciones/ventanas, catálogo remoto y cotizaciones persistentes.
