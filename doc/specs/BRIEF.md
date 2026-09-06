# Brief común — migración de pantallas al diseño propio

## Cómo leer el diseño (obligatorio antes de tocar código)

El diseño vive en `doc/neural.pen`. Es un archivo cifrado: **NO uses Read ni Grep sobre él**.
Se lee con el MCP `pencil`, herramienta `execute`, parámetro `input`.

El lenguaje del `execute` es JS restringido: **no hay `const`, `let`, `await`, `return`,
`console.log` ni `Log`**. Las asignaciones son `x = ...`. `for (a of b) { }` sí funciona.

`Get(...)` no imprime su resultado. La única forma de ver lo que leíste es lanzar el texto
como error:

```js
out = []
keys = ['type','name','layout','gap','padding','width','height','fill','cornerRadius','content','fontSize','fontWeight','lineHeight','letterSpacing','icon','stroke','strokeWidth','alignItems','justifyContent','textGrowth','textAlign']
function dump(x, d) {
  s = '  '.repeat(d) + x.id + ' '
  for (k of keys) { if (x[k] !== undefined && x[k] !== null) { s = s + k + '=' + JSON.stringify(x[k]) + ' ' } }
  out.push(s)
  for (c of (x.children || [])) { dump(c, d + 1) }
}
dump(Get('TU_NODE_ID', {depth: 12, resolveVariables: true}), 0)
throw new Error(out.join('\n'))
```

El error que devuelve **es** el volcado. Si sale truncado, baja el `depth` o pide subnodos
por separado. `resolveVariables: true` es obligatorio: sin él los colores vienen como
referencias a variables y no como hex.

Para ver la pantalla renderizada: `TakeScreenshot(['NODE_ID'])` (array, no string).

**NO edites el `.pen`.** Solo lectura.

## Reglas de implementación

1. **La lógica no se toca.** Llamadas a `src/api/*`, `AuthContext`, Sentry
   (`captureException`, `addBreadcrumb`), push notifications, biometría y storage se
   preservan literalmente. Esto es una app en producción, en prueba cerrada de Google Play.
   Si movés código, contá las llamadas antes y después y verificá que coinciden.

2. **Contraste.** El kit usa `#A5A5A5` (2.5:1) y `#9D9D9D` (2.7:1) para texto sobre blanco.
   Ambos reprueban WCAG AA. Sustituilos por `colors.gray400` (5.3:1), que mantiene el rol
   de "apagado". **Sobre fondo `#111111` los grises del diseño sí pasan** — ahí se respetan
   tal cual. `#109D2F` sobre blanco da 4.9:1 y se usa como viene.

3. **Componentes compartidos** — usalos, no los reinventes:
   - `src/components/ui/Screen.tsx` — fondo, status bar oscuro, wash de marca
   - `src/components/ui/AppHeader.tsx` — back con guarda `canGoBack`, título, acción opcional
   - `src/components/ui/Card.tsx` — tarjeta blanca r20 p16
   - `src/components/ui/PrimaryButton.tsx`
   - `src/theme/colors.ts` — `ink #111111`, `surface #F4F4F4`, `accent #C6FF40`,
     `accentDeep #17DD42`, `accentSoft #E8FCEC`, `muted #9D9D9D`, `gray400 #727272`
   - `src/theme/trainingImages.ts` — `trainingImage(trainingType)` devuelve el recorte que
     corresponde al tipo de entrenamiento
   - Las pantallas con tab bar flotante necesitan `paddingBottom: 132` al final del scroll.

4. **`typography.fontFamily` es un string.** `typography.fontFamily.semibold` no existe y
   resuelve a `undefined`. El peso va en `fontWeight: typography.fontWeight.semiBold`.

5. **Dónde el diseño se equivoca, corregilo y dejá el comentario diciendo por qué.**
   El kit tiene restos de plantilla (toggles donde no van, iconos copiados de otra pantalla,
   números de calendario que no corresponden a ningún mes real, fotos de stock repetidas).
   Replicar un bug no es fidelidad. Pero **no inventes**: si el diseño pide algo y el dato no
   existe en la API, decilo en el reporte en vez de rellenar con mock.

6. **Nada de `Alert` para errores de carga.** Error inline, al lado del bloque que falló.

7. Verificá con `npx tsc --noEmit` antes de terminar. La línea base actual es **0 errores**.
   Si tu número no es 0, no terminaste.

## Reporte final

Decí: qué nodo del `.pen` leíste, qué valores aplicaste, en qué te apartaste del diseño y
por qué, qué datos pedía el diseño que la API no tiene, y el conteo de `tsc`.
