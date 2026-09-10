# Arquitectura

## Límites del sistema

- `camera`: obtiene el `MediaStream`, captura una imagen reducida y libera los tracks.
- `vision`: define `WindowDetector`; la implementación local busca bordes, ajusta cuatro líneas e intersecta sus esquinas.
- `measurement`: rectificación proyectiva, geometría normalizada y calibración explícita por ancho o alto conocido.
- `configurator`: catálogo tipado, selección por categoría y precios expresados en centavos.
- `visualization`: fotografía, polígono y capas de assets ligadas a la perspectiva en el cliente.
- `quotation`: documento A4 creado localmente y descargado por el usuario.
- `persistence`: estado serializado mediante Zustand; no existe transmisión remota.

## Contratos de extensión

`WindowDetector` recibe un elemento de imagen o canvas y devuelve detecciones normalizadas con polígono, bounding box, confianza, origen y dimensiones de la imagen. La interfaz permite sustituir el heurístico local por ONNX Runtime Web o por un servicio remoto autorizado.

`Product.modelUrl` reserva el origen de cada GLB/glTF. `estimatePerspective` traduce el cuadrilátero a una pose reutilizable. El dummy `Rod3DEditor` usa Three.js y `TransformControls`; los GLB definitivos podrán sustituir la geometría procedural sin cambiar el modelo de datos.

La cámara consulta `MediaTrackCapabilities.zoom` y solo presenta controles cuando el hardware y el navegador los exponen. `depth-capabilities` distingue WebXR AR, iOS sin acceso web a LiDAR y equipos sin profundidad. Para medidas LiDAR reales en iPhone sería necesaria una integración nativa ARKit, no disponible desde `getUserMedia`.

El cálculo físico permanece separado del detector. `perspective-corrector` obtiene una relación ancho/alto mediante homografía bajo un modelo pinhole aproximado y cae a media geométrica de bordes cuando la solución métrica es inestable. `geometry` asocia una referencia real a `width` o `height`, calcula la dimensión restante y la diagonal. Sin referencia devuelve cero centímetros.

## Estado

El store conserva imagen, tamaño original, polígono normalizado, medición, categoría y productos. Las coordenadas normalizadas permiten adaptar el lienzo al viewport sin recalcular el modelo de dominio.

## Decisiones visuales

La estructura sigue el Figma: el escenario cubre el viewport y queda detrás del panel lateral y el resumen, ambos con blur de 32 px. En móvil, el configurador se transforma en un bottom sheet translúcido. El plano centra el polígono detectado en el área útil y conserva las mismas coordenadas para foto, nodos y assets.
