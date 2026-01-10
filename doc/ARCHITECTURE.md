# Neural Mobile - Arquitectura y Funcionalidades

## Resumen del Proyecto Original

El proyecto original (`neural-mobile`) es una aplicación híbrida construida con:
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Build Tool:** Vite 5.4.0
- **Mobile Framework:** Capacitor.js 6.0.0
- **Backend API:** Django REST Framework (Token authentication)
- **UI:** Bootstrap 5.3.3 (CSS only)

---

## Pantallas y Funcionalidades

### 1. Login (`/login`)
- Autenticación email/password
- Toggle de visibilidad de contraseña
- Botones de login social (Google/Apple - solo UI)
- Manejo de errores
- Gestión de sesión con tokens

### 2. Register (`/register`)
- Campos: nombre completo, email, teléfono, contraseña
- Toggle de visibilidad de contraseña
- División de nombre en first_name/last_name para backend
- Validación (contraseñas 8+ caracteres)
- Redirección a login después de registro exitoso

### 3. Pending Verification (`/pending`)
- Muestra estado de verificación pendiente
- Botón de contacto WhatsApp
- Opción de logout

### 4. Dashboard (`/dashboard`)
- Saludo al usuario con avatar
- Mensaje de bienvenida con nombre
- Selector de semana (7 días con hoy destacado)
- Estadísticas en grid 2x2:
  - Distancia (km)
  - Pasos
  - Calorías (cal)
  - Ritmo cardíaco (bpm)
- Sección de última actividad
- Indicador de estado de membresía
- Próximo entrenamiento (día + hora)
- Contador de racha (días consecutivos)

### 5. Calendar (`/calendar`)
- Selección de días de entrenamiento disponibles
- Muestra nombres y fechas de días
- Indicador visual para días con slots disponibles
- Estado deshabilitado para días llenos
- Header "Agendar Entrenamiento"

### 6. Slots (`/slots/:date`)
- Ruta dinámica con parámetro de fecha
- Muestra slots disponibles para el día seleccionado
- Nombre del tipo de entrenamiento por slot
- Contador de lugares disponibles
- Advertencia si ya está agendado
- Botón de reserva (deshabilitado si lleno o ya reservado)
- Opción de cancelar si está disponible
- Formato AM/PM

### 7. My Trainings (`/my-trainings`)
- Lista de entrenamientos agendados
- Muestra fecha, tipo de entrenamiento, rango de hora
- Fechas relativas ("Hoy", "Mañana")
- Opción de cancelar entrenamiento (con confirmación)
- Estado vacío cuando no hay entrenamientos
- Link rápido para agendar nuevo entrenamiento

### 8. Profile (`/profile`)
- Avatar del usuario (o icono fallback)
- Nombre completo y email
- Modal de editar perfil (nombre/apellido)
- Links a Membresía y Mis Entrenamientos
- Funcionalidad de logout
- Cache de datos del perfil

### 9. Membership (`/membership`)
- Estado de membresía activa actual
- Barra de progreso de días restantes
- Planes de membresía disponibles
- Nombre del plan, duración, precio (COP)
- Integración de compra con pasarela BOLD
- Construcción de URL de pago para procesador externo
- Manejo de redirecciones de pago

---

## Estructura de Navegación

### Rutas

| Ruta | Auth Requerida | Muestra Nav | Descripción |
|------|----------------|-------------|-------------|
| `/login` | No (solo guest) | No | Formulario de login |
| `/register` | No (solo guest) | No | Formulario de registro |
| `/pending` | Sí | No | Pantalla de verificación pendiente |
| `/dashboard` | Sí | Sí | Home con stats y actividad |
| `/calendar` | Sí | Sí | Seleccionar día de entrenamiento |
| `/slots/:date` | Sí | Sí | Ver y reservar slots |
| `/my-trainings` | Sí | Sí | Lista de entrenamientos agendados |
| `/profile` | Sí | Sí | Perfil y configuración |
| `/membership` | Sí | Sí | Planes y compra de membresía |

### Bottom Navigation Bar
- Dashboard (icono home)
- Calendar (icono calendario)
- My Trainings (icono dumbbell)
- Profile (avatar o icono persona)

---

## Flujo de Autenticación

```
Login Page → Email/Password → POST /auth/login/
  → Token + User almacenados (AsyncStorage)
  → Redirect a /dashboard o /pending (si no verificado)
```

### Gestión de Sesión
- Token almacenado en AsyncStorage
- Datos de usuario cacheados
- Verificación de auth en cambios de ruta
- Redirect automático a login en 401
- Logout limpia token y datos de usuario

---

## Sistema de Diseño

### Tema
- **Dark theme** (primary: #171717)
- **Accent:** Verde brillante (#45ffb7)
- Paleta premium con bordes sutiles

### Tipografía
- Font primaria: Mona Sans, Inter
- Weights: 400, 500, 600, 700, 800, 900

### Componentes UI
- Form inputs (redondeados, con iconos)
- Botones (primary, secondary, social)
- Cards (con sombras, esquinas redondeadas)
- Badges (varios colores para estados)
- Stat cards (grid de 4)
- Listas (training cards, slot cards)
- Modals (editar perfil)

---

## Migración a React Native Expo

### Mapeo de Tecnologías

| Original | React Native Expo |
|----------|-------------------|
| Hash Router | React Navigation (native stack) |
| localStorage | AsyncStorage / SecureStore |
| Fetch API | Fetch / Axios |
| Bootstrap CSS | React Native StyleSheet |
| Bootstrap Icons | @expo/vector-icons |
| Template literals | React Components (JSX) |
| Capacitor Preferences | Expo SecureStore |
| Capacitor Push | expo-notifications |

### Estructura Recomendada

```
src/
├── api/
│   └── client.ts          # API client con token auth
├── components/
│   ├── common/            # Botones, inputs, cards
│   └── ui/                # Toast, modals, loaders
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── PendingScreen.tsx
│   ├── dashboard/
│   │   └── DashboardScreen.tsx
│   ├── training/
│   │   ├── CalendarScreen.tsx
│   │   ├── SlotsScreen.tsx
│   │   └── MyTrainingsScreen.tsx
│   ├── profile/
│   │   └── ProfileScreen.tsx
│   └── membership/
│       └── MembershipScreen.tsx
├── navigation/
│   ├── AppNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── MainNavigator.tsx
├── hooks/
│   └── useAuth.ts
├── context/
│   └── AuthContext.tsx
├── utils/
│   ├── storage.ts
│   └── formatters.ts
├── constants/
│   └── config.ts
└── types/
    └── index.ts
```

---
