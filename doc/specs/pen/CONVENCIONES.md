# Cómo escribir snippets para Pencil

Tu salida es un archivo `.js` con llamadas a la API de Pencil. **No ejecutás nada**:
el snippet lo corre otra persona contra el documento abierto.

## Lenguaje

JS restringido. **No existen** `const`, `let`, `await`, `return`, `console.log`.
Las asignaciones son `x = ...`. `for (a of b) { }` y `function f() {}` sí funcionan.

## API

```js
id = Insert(parentId, { ...props })      // devuelve el id del nodo nuevo
Update(nodeId, { ...props })
Move(nodeId, parentId, index)
Delete(nodeId)
```

**`Insert` ignora el tercer argumento de índice**: siempre agrega al final. Si necesitás
un orden distinto, insertá todo y después reordená con `Move`.

## Propiedades

- `type`: `frame` | `text` | `icon` | `rectangle` | `ellipse` | `path`
- `layout`: `vertical` | `horizontal` | `none` (solo en `frame`)
- `width`/`height`: número, `'fill_container'` o `'fit_content'`. **Nunca porcentajes.**
- `padding`: número, o `[vertical, horizontal]`, o `[top, right, bottom, left]`
- `gap`, `cornerRadius`, `stroke`, `strokeWidth`, `alignItems`, `justifyContent`
- `justifyContent: 'space_between'` (guion bajo, no guion medio)
- `alignItems`: `center` | `start` | `end`. **No uses `baseline` ni `stretch`.**
- Texto: `content`, `fontSize`, `fontWeight` (`'normal'` | `'600'` | `'700'`),
  `letterSpacing`, `lineHeight` (ratio: 1.43 = 143%), `textAlign`, `fill`
- **Todo texto necesita `fill` o es invisible.** Y `fontFamily: 'Rethink Sans'`.
- Texto que envuelve: `textGrowth: 'fixed-width'` + `width` (obligatorio el width).
  Sin eso el texto va en una sola línea.
- Iconos: los nodos nuevos usan **Material Symbols Rounded**, no lucide.
  `arrow_back`, `chevron_right`, `more_vert`, `group`, `bolt`, `chat_bubble`,
  `monitor_heart`, `calendar_month`, `schedule`, `info`, `check_circle`.
  Si dudás de un nombre, elegí uno que exista seguro.
- Gradiente:
  ```js
  fill: {type:'gradient', gradientType:'linear', enabled:true, rotation:270,
         size:{height:1}, colors:[{color:'#C6FF40',position:0},{color:'#17DD42',position:1}]}
  ```
- Imagen: `fill: {type:'image', enabled:true, url:'images/xxx.png', mode:'fill'}` + `clip:true`

## Reglas de armado

- Un frame con `fit_content` y sin hijos colapsa a cero. Dale hijos o tamaño fijo.
- Un padre `fit_content` cuyos hijos son todos `fill_container` colapsa. Rompé el ciclo.
- Pantallas: `width: 375`, `clip: true`, fondo `#F4F4F4` salvo que el código diga otra cosa.
- Padding de pantalla: `[42, 16, 32, 16]`. Header `height: 52`.

## Paleta

`#111111` ink · `#F4F4F4` surface · `#FFFFFF` · `#727272` gris de texto sobre claro ·
`#8A8A8A` gris sobre oscuro · `#C6FF40` lima · `#17DD42` verde · `#E8FCEC` verde suave ·
`#109D2F` verde legible sobre blanco · `#DEDEDE` bordes

**No uses** `#A5A5A5`, `#9D9D9D` ni `#939393` sobre fondo claro: reprueban contraste.
Sobre `#111111` sí sirven.
