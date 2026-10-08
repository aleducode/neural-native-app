# Mis ejercicios — brief de diseño

Sección nueva de videos para la app Neural. El backend ya está en producción;
la app no tiene nada todavía. Esto es lo que hay que dibujar en `doc/neural.pen`.

---

## 1. Qué es

Neural arma **paquetes ordenados de videos** (rutinas) y se los asigna a cada
socio: a uno puntual, a todos los de un plan, o a todos. El socio los ve en la
app, y **la app reporta cuánto vio de cada video**.

Ese reporte es el corazón de la función. Sin él, el gimnasio sabe que asignó un
paquete pero no si alguien lo abrió. Hoy todas las métricas de consumo están en
cero porque la app no reporta nada.

Para el socio, la promesa es: *el track de mis propios ejercicios.*

---

## 2. Dónde va en el `.pen`

Zona `NEURAL — Diseño propio` (id `bnGR0`), al final, como **sección 11**.

Las secciones existentes tienen todas la misma forma, copiala:

- Frame de sección: `layout: vertical`, `gap: 18`
  - Hijo 1 — rótulo: `text`, contenido `11 · Mis ejercicios`,
    `Rethink Sans`, `fontSize 24`, `fontWeight '600'`,
    `letterSpacing -0.48`, `fill '#111111'`
  - Hijo 2 — frame llamado `Screens`, con las pantallas adentro

La zona padre va con `gap: 40` y `padding: 80`.

---

## 3. Paleta y convenciones

**La app es clara, no azul oscura.** En `colors.ts` quedaron tokens viejos
(`primary #5a6bff`, `bgDark #171717`, `cardDark #1E1E1E`) de antes del
rediseño, pero el uso real dice otra cosa:

| token | usos en pantallas y componentes |
|---|---|
| `colors.ink` `#111111` | 244 |
| `colors.accent` `#C6FF40` / `accentDeep #17DD42` | 104 |
| `colors.surface` `#F4F4F4` | 47 |
| `colors.primary` `#5a6bff` (azul legado) | 13 |

Paleta a usar:

```
#111111  tinta
#F4F4F4  fondo de pantalla
#FFFFFF  tarjetas
#727272  gris de texto sobre claro
#8A8A8A  gris sobre oscuro
#C6FF40  lima
#17DD42  verde
#E8FCEC  verde suave (fondos de aviso)
#109D2F  verde legible sobre blanco
#DEDEDE  bordes
#FF4D4D  error
```

No usar `#A5A5A5`, `#9D9D9D` ni `#939393` sobre fondo claro: reprueban
contraste. Sobre `#111111` sí sirven.

**Medidas de pantalla** (iguales al resto): `width 375`, `clip: true`,
fondo `#F4F4F4`, `padding [42, 16, 32, 16]`, header `height 52` con
`arrow_back` de 24 a la izquierda y el título a 20/600.

**Tipografía**: todo `fontFamily: 'Rethink Sans'`. Todo texto necesita `fill`
o es invisible. Texto que envuelve necesita `textGrowth: 'fixed-width'` + `width`.

**Iconos**: Material Symbols Rounded, con `icon:` + `width`/`height`
(no `name:` + `size:`). Útiles acá: `play_arrow`, `play_circle`, `check_circle`,
`schedule`, `arrow_back`, `chevron_right`, `fitness_center`, `info`.

**Referencias de lenguaje** ya construidas en la app:
`src/components/TrainingCard.tsx`, `StatCard.tsx`, `MenuCard.tsx`, y
`src/screens/TrainingsScreen.tsx` para el patrón de lista.

Todo en español, **voseo**, como el resto de la app.

---

## 4. Pantallas

### A. Mis ejercicios (lista de paquetes)

Tarjeta por paquete, sobre `#FFFFFF` con `cornerRadius 20`:

- Nombre del paquete y descripción corta
- Badge de modalidad: **Grupal** o **Individual**
- Progreso: `2 de 3` + barra
- Portada: **diseñá primero el caso sin portada.** El campo `cover` viene
  `null` casi siempre; la portada es la excepción, no la regla.

**Estados, los tres:**

- **Vacío** — *el más importante.* Hoy en producción hay **0 videos y 0
  paquetes**, así que el día 1 lo ve el 100% de los socios. Tiene que leerse
  como "todavía no te asignaron rutinas", no como un error ni como una pantalla
  rota. Sin botón que no lleve a ningún lado.
- **Cargando**
- **Error de red**

### B. Detalle del paquete

- Cabecera: nombre, descripción, modalidad, progreso global
- **Lista ordenada** de videos. El orden es la secuencia que el socio debe
  seguir, no un capricho. Cada fila:
  - número de orden
  - póster (viene siempre, de Cloudflare)
  - nombre y duración
  - estado: sin empezar / en progreso con % / completado
  - **la nota del entrenador**, si la tiene — ej. *"3 series de 12"*.
    Es la indicación del profe y es por video dentro del paquete:
    el mismo video en otro paquete puede llevar otra nota.
- **Dónde retomar.** El socio tiene que ver de un vistazo cuál le toca ahora.
  Esto no estaba en el pedido del backend y es lo que hace la pantalla útil.

### C. Reproductor

- Player con póster mientras carga, y estado de buffering
- Nombre, descripción y la nota del entrenador
- **Reanudar**: si vio 3 de 7 minutos, al volver se le ofrece continuar, no
  empezar de cero
- Marca de completado
- Al terminar: **qué sigue** — el siguiente video del paquete

### D. Entrada desde el resto de la app

Hay que decidir dónde vive. Tres opciones, y conviene dibujar la elegida y
dejar planteada al menos una alternativa:

1. **Pestaña propia** en la barra flotante — hoy son 5 (Home, Calendar,
   Community al centro, Trainings, Profile). Sumar una sexta toca una barra ya
   decidida y obliga a repensar el orden.
2. **Solapa dentro de Entrenamientos** — no toca la barra, y conceptualmente
   los videos son entrenamiento.
3. **Tarjeta en el Home** — la más barata, la menos visible.

---

## 5. Datos duros que condicionan el diseño

Del contrato ya desplegado (`GET /videos/packages/`, `POST /videos/progress/`):

- `duration` viene en **segundos enteros** — hay que formatearla
- Las duraciones son **cortas y variables**; no asumir videos de 10 minutos
- `completed` / `total` son del paquete
- `seconds` y `completed` son **del socio que pregunta**: dos personas en el
  mismo paquete ven números distintos
- Se marca completado al **95%** de la duración, no al 100%
- El progreso **nunca retrocede**: rebobinar no borra lo ya visto
- Tres orígenes de video: Cloudflare Stream (HLS), YouTube (embed), o archivo
  subido. El player tiene que contemplar los tres.

---

## 6. Qué no inventar

Si el diseño necesita algo que el backend no manda hoy — categorías, favoritos,
descargas offline, comentarios, buscador — **no lo dibujes como si existiera**.
Anotalo aparte y se le pide al backend; según ellos es más fácil mover la API
que achicar un buen diseño.

Campos que hoy existen y nada más: `id`, `name`, `description`, `cover`, `kind`,
`completed`, `total`, y por video `id`, `name`, `description`, `notes`, `order`,
`duration`, `poster`, `playback`, `embed`, `source`, `seconds`, `completed`.
