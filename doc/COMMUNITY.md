# Community Feature Documentation

## Overview

The Community feature provides a social media-like experience within the Neural app, allowing users to share posts, react to content, and comment on posts. It features a premium, minimalist design with smooth animations and lazy-loading image capabilities.

---

## API Endpoints

All community endpoints require authentication (Token in Authorization header).

Base path: `/api/v1/community/`

### Feed

#### GET `/community/feed/?page={page}`

**Autenticado** - Obtener feed de publicaciones

Query params:
- `page` (opcional, default: 1): Número de página para paginación

```json
// Response 200
{
  "posts": [
    {
      "id": 1,
      "author": {
        "id": 1,
        "name": "Juan Pérez",
        "photo_url": "https://...",
        "initials": "JP"
      },
      "post_type": "text",
      "content": "¡Excelente entrenamiento hoy!",
      "image_url": null,
      "training": null,
      "reactions_count": 5,
      "comments_count": 2,
      "user_reaction": "fire",
      "reactions_summary": {
        "fire": 3,
        "muscle": 1,
        "clap": 1,
        "heart": 0
      },
      "time_ago": "hace 2 horas",
      "created": "2025-12-24T13:00:00Z"
    }
  ],
  "next_page": 2,
  "has_more": true
}
```

---

### Posts

#### POST `/community/posts/`

**Autenticado** - Crear nueva publicación (texto o con entrenamiento)

```json
// Request
{
  "content": "¡Excelente entrenamiento hoy!",
  "training_id": 123  // opcional
}

// Response 201
{
  "id": 1,
  "author": {...},
  "post_type": "text",
  "content": "¡Excelente entrenamiento hoy!",
  ...
}
```

#### POST `/community/posts/` (con imagen)

**Autenticado** - Crear publicación con imagen

**Content-Type:** `multipart/form-data`

Form data:
- `content` (string): Contenido del post
- `image` (file): Archivo de imagen

```json
// Response 201
{
  "id": 2,
  "post_type": "photo",
  "image_url": "https://...",
  ...
}
```

#### GET `/community/posts/{id}/`

**Autenticado** - Obtener detalles de una publicación

```json
// Response 200
{
  "post": {
    "id": 1,
    "author": {...},
    "post_type": "text",
    "content": "...",
    ...
  }
}

// Response 404
{
  "error": "Post no encontrado"
}
```

#### DELETE `/community/posts/{id}/`

**Autenticado** - Eliminar publicación (solo propietario)

```json
// Response 204 No Content
```

---

### Reactions

#### POST `/community/posts/{id}/react/`

**Autenticado** - Agregar reacción a un post

```json
// Request
{
  "reaction_type": "fire"  // "fire", "muscle", "clap", "heart"
}

// Response 200
{
  "success": true,
  "reactions_count": 6,
  "reactions_summary": {
    "fire": 4,
    "muscle": 1,
    "clap": 1,
    "heart": 0
  }
}
```

#### DELETE `/community/posts/{id}/react/`

**Autenticado** - Remover reacción del post

```json
// Response 200
{
  "success": true,
  "reactions_count": 5,
  "reactions_summary": {...}
}
```

**Tipos de reacciones:**
- `fire`: 🔥 Fuego
- `muscle`: 💪 Fuerza
- `clap`: 👏 Aplausos
- `heart`: ❤️ Me encanta

---

### Comments

#### GET `/community/posts/{id}/comments/`

**Autenticado** - Obtener comentarios de un post

```json
// Response 200
{
  "comments": [
    {
      "id": 1,
      "author": {
        "id": 2,
        "name": "María García",
        "photo_url": "https://...",
        "initials": "MG"
      },
      "content": "¡Excelente trabajo!",
      "time_ago": "hace 1 hora",
      "created": "2025-12-24T14:00:00Z",
      "is_mine": false
    }
  ]
}
```

#### POST `/community/posts/{id}/comments/`

**Autenticado** - Agregar comentario

```json
// Request
{
  "content": "¡Excelente trabajo!"
}

// Response 201
{
  "id": 1,
  "author": {...},
  "content": "¡Excelente trabajo!",
  "time_ago": "hace unos segundos",
  "created": "2025-12-24T14:00:00Z",
  "is_mine": true
}
```

#### DELETE `/community/comments/{id}/`

**Autenticado** - Eliminar comentario (solo propietario)

```json
// Response 204 No Content
```

---

## Component Architecture

### File Structure

```
src/
├── screens/
│   ├── CommunityScreen.tsx          # Feed principal
│   ├── PostDetailScreen.tsx         # Detalle de post con comentarios
│   └── CreatePostScreen.tsx         # Crear nueva publicación
├── components/
│   └── community/
│       ├── PostCard.tsx             # Tarjeta de post para feed
│       ├── ReactionBar.tsx          # Barra de reacciones animadas
│       ├── CommentItem.tsx          # Item de comentario
│       ├── CommentInput.tsx         # Input para comentarios
│       ├── TrainingBadge.tsx        # Badge de entrenamiento asociado
│       ├── FullScreenImage.tsx      # Modal de imagen a pantalla completa
│       └── SkeletonImage.tsx        # Componente de carga lazy con skeleton
├── api/
│   └── community.ts                 # Cliente API para endpoints
└── types/
    └── community.ts                 # TypeScript types e interfaces
```

---

## Key Components

### PostCard

**Ubicación:** `src/components/community/PostCard.tsx`

Componente principal para mostrar posts en el feed.

**Props:**
- `post: Post` - Datos del post
- `onPress: () => void` - Navegar a detalle del post
- `onReaction: (type: ReactionType | null) => void` - Manejar reacción
- `onOptionsPress?: () => void` - Menú de opciones (eliminar, reportar)

**Características:**
- Header con avatar y nombre del autor
- Contenido de texto
- Imagen con lazy loading y skeleton
- Training badge si está asociado a un entrenamiento
- Resumen de reacciones
- Barra de acciones (reacciones + comentarios)
- Animaciones suaves en contadores de reacciones

### ReactionBar

**Ubicación:** `src/components/community/ReactionBar.tsx`

Barra de reacciones con animaciones tipo Twitter.

**Props:**
- `userReaction: ReactionType | null` - Reacción actual del usuario
- `onReactionPress: (type: ReactionType) => void` - Callback al presionar
- `showPicker: boolean` - Mostrar picker modal
- `onClosePicker: () => void` - Cerrar picker
- `onMainPress: () => void` - Presionar botón principal
- `onMainLongPress: () => void` - Long press en botón principal

**Características:**
- 4 tipos de reacciones con iconos (no emojis)
- Animaciones bounce al hacer click
- Efecto ripple al presionar
- Transiciones suaves entre estados
- Modal picker para seleccionar reacción
- Animaciones solo en interacción del usuario (no en cambios de estado)

### FullScreenImage

**Ubicación:** `src/components/community/FullScreenImage.tsx`

Modal para ver imágenes en pantalla completa.

**Props:**
- `visible: boolean` - Controlar visibilidad
- `imageUri: string` - URI de la imagen
- `onClose: () => void` - Cerrar modal

**Características:**
- Fondo oscuro (95% opacidad)
- Imagen con `resizeMode="contain"`
- Botón de cerrar en esquina superior derecha
- Animaciones fade-in y scale al abrir
- Status bar styling para experiencia inmersiva

### SkeletonImage

**Ubicación:** `src/components/community/SkeletonImage.tsx`

Componente de imagen con lazy loading y skeleton loader.

**Props:**
- `source: { uri: string } | number` - Fuente de imagen
- `style?: StyleProp<ViewStyle>` - Estilos
- `borderRadius?: number` - Radio de borde
- `...imageProps` - Props adicionales de Image

**Características:**
- Shimmer animation mientras carga
- Fade-in suave cuando la imagen carga
- Skeleton placeholder con animación
- Manejo de errores
- Soporte para diferentes border radius

---

## Design System

### Color Palette

El diseño utiliza una paleta minimalista y premium:

- **Background:** `#171717` (bgDark)
- **Cards:** `#1E1E1E` (cardDark)
- **Borders:** `rgba(255, 255, 255, 0.06)` - Bordes sutiles
- **Primary Accent:** `#5a6bff` - Solo para elementos activos
- **Text Primary:** `rgba(255, 255, 255, 0.9)`
- **Text Secondary:** `#727272` (gray400)

### Typography

- **Font Family:** System fonts (SF Pro en iOS, Roboto en Android)
- **Letter Spacing:** Valores negativos para apariencia más compacta
- **Font Sizes:**
  - Header: 30px (xxxl)
  - Title: 22px (xxl)
  - Body: 16px (md)
  - Small: 15px (sm)

### Spacing

Sistema de espaciado consistente:
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px
- `xxl`: 24px
- `xxxl`: 32px

### Animations

#### Reaction Animations

- **Bounce on Press:** Escala de 0.75x → 1.1x → 1.0x
- **Icon Scale:** 1.6x → 0.9x → 1.0x
- **Ripple Effect:** Escala de 0 → 2.5x con fade out
- **Timing:** Spring animations con damping 5-10, stiffness 150-400

#### Image Loading

- **Shimmer:** Animación continua horizontal
- **Fade-in:** 300ms cuando la imagen carga
- **Scale:** 0.9 → 1.0 en full-screen modal

---

## User Flows

### Ver Feed

```
CommunityScreen
  → Fetch posts (paginated)
  → Render PostCard para cada post
  → Pull to refresh
  → Infinite scroll (paginación)
```

### Crear Post

```
CommunityScreen
  → Tap FAB
  → CreatePostScreen
  → Seleccionar imagen (opcional)
  → Escribir contenido
  → Submit
  → Refresh feed
```

### Reaccionar a Post

```
PostCard / PostDetailScreen
  → Tap reaction button
  → Animation bounce + ripple
  → API call (optimistic update)
  → Update UI
```

### Ver Detalle de Post

```
PostCard
  → Tap post
  → PostDetailScreen
  → Load post detail
  → Load comments
  → Render full post + comments list
```

### Comentar en Post

```
PostDetailScreen
  → Escribir en CommentInput
  → Submit
  → API call
  → Add comment to list
  → Update comment count
```

### Ver Imagen Full Screen

```
PostCard / PostDetailScreen
  → Tap image
  → FullScreenImage modal
  → Fade in animation
  → Tap close button
  → Fade out
```

---

## Features

### 1. Feed con Paginación

- Scroll infinito
- Pull to refresh
- Loading states
- Empty state con call-to-action

### 2. Reacciones Animadas

- 4 tipos de reacciones (fire, muscle, clap, heart)
- Animaciones tipo Twitter
- Actualización optimista
- Iconos en lugar de emojis

### 3. Sistema de Comentarios

- Lista de comentarios
- Agregar comentario
- Eliminar comentario propio
- Contador de comentarios

### 4. Imágenes

- Lazy loading con skeleton
- Full-screen viewer
- Shimmer animation mientras carga
- Soporte para diferentes tamaños

### 5. Training Badge

- Badge cuando un post está asociado a un entrenamiento
- Muestra tipo, fecha y duración
- Estilo premium con iconos

---

## TypeScript Types

### ReactionType

```typescript
type ReactionType = 'fire' | 'muscle' | 'clap' | 'heart';
```

### Post

```typescript
interface Post {
  id: number;
  author: PostAuthor;
  post_type: 'text' | 'photo' | 'training';
  content: string;
  image_url: string | null;
  training: PostTraining | null;
  reactions_count: number;
  comments_count: number;
  user_reaction: ReactionType | null;
  reactions_summary: ReactionsSummary;
  time_ago: string;
  created: string;
}
```

### Comment

```typescript
interface Comment {
  id: number;
  author: PostAuthor;
  content: string;
  time_ago: string;
  created: string;
  is_mine: boolean;
}
```

---

## Performance Optimizations

1. **Lazy Loading de Imágenes:** Skeleton loaders mientras las imágenes cargan
2. **Optimistic Updates:** Actualización inmediata de UI antes de respuesta del servidor
3. **Paginación:** Carga incremental de posts
4. **Image Caching:** React Native maneja cache automáticamente
5. **Reanimated:** Animaciones nativas de 60fps usando worklets

---

## Best Practices

1. **Siempre usar tipos TypeScript** para posts, comentarios y reacciones
2. **Optimistic updates** para mejor UX en interacciones
3. **Manejo de errores** en todas las llamadas API
4. **Loading states** para feedback visual
5. **Empty states** informativos con call-to-action
6. **Animaciones sutiles** que no distraigan
7. **Consistencia visual** con el resto de la app

---

## Future Enhancements

Posibles mejoras futuras:

- [ ] Notificaciones push para reacciones y comentarios
- [ ] Mención de usuarios en comentarios (@username)
- [ ] Hashtags en posts
- [ ] Compartir posts
- [ ] Reportar contenido
- [ ] Editar posts propios
- [ ] Filtros de feed (solo entrenamientos, solo imágenes, etc.)
- [ ] Búsqueda de posts
- [ ] Posts destacados

