# Documentación API v1 - Neural

## Base URL

```
https://app.neural.com.co/api/v1/
```

## Autenticación

- **Tipo:** Token Authentication
- **Header:** `Authorization: Token <token_key>`

---

## AUTH (`/api/v1/auth/`)

### POST `/auth/login/`

**Público** - Iniciar sesión

```json
// Request
{
  "email": "user@example.com",
  "password": "secret"
}

// Response 200
{
  "token": "abc123...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "phone_number": "+573001234567",
    "photo_url": "https://...",
    "is_verified": true,
    "is_client": true
  }
}
```

### POST `/auth/register/`

**Público** - Registrar usuario

```json
// Request
{
  "email": "user@example.com",
  "first_name": "Juan",
  "last_name": "Pérez",
  "phone_number": "+573001234567",
  "password": "secret123",
  "password_confirmation": "secret123"
}

// Response 201
{
  "token": "abc123...",
  "user": {...}
}
```

### GET `/auth/me/`

**Autenticado** - Obtener perfil actual

```json
// Response 200
{
  "id": 1,
  "email": "...",
  "first_name": "...",
  "last_name": "...",
  "phone_number": "...",
  "photo_url": "...",
  "is_verified": true,
  "is_client": true
}
```

### PATCH `/auth/me/`

**Autenticado** - Actualizar perfil

```json
// Request (campos opcionales)
{
  "first_name": "Juan",
  "last_name": "Pérez",
  "photo": <file>
}
```

### POST `/auth/logout/`

**Autenticado** - Cerrar sesión (elimina token)

### POST `/auth/password-reset/`

**Público** - Solicitar reset de contraseña

```json
// Request
{
  "email": "user@example.com"
}
```

---

## DASHBOARD (`/api/v1/dashboard/`)

### GET `/dashboard/`

**Autenticado** - Datos del dashboard

```json
// Response 200
{
  "membership": {
    "id": 1,
    "membership_type": "monthly",
    "plan": {
      "id": 1,
      "name": "Plan Mensual",
      ...
    },
    "is_active": true,
    "init_date": "2025-01-01",
    "expiration_date": "2025-02-01",
    "days_left": 15
  },
  "today_training": {
    "id": 123,
    "slot": {...},
    "training_type": {...},
    "status": "confirmed",
    "is_today": true,
    "can_cancel": true
  },
  "weekly_stats": {
    "total_sessions": 5,
    "total_hours": 7.5,
    "total_calories": 2000
  },
  "strike": {
    "current": 5,
    "best": 12
  }
}
```

---

## TRAINING (`/api/v1/training/`)

### GET `/training/calendar/`

**Autenticado** - Calendario próximos 7 días

```json
// Response 200
[
  { "date": "2025-12-23", "day_name": "Lunes", "has_slots": true },
  { "date": "2025-12-24", "day_name": "Martes", "has_slots": true },
  ...
]
```

### GET `/training/slots/?date=2025-12-23`

**Autenticado** - Slots disponibles para una fecha

Query params:
- `date` (requerido): Fecha en formato YYYY-MM-DD
- `type` (opcional): Filtrar por tipo de entrenamiento (slug_name)

```json
// Response 200
{
  "date": "2025-12-23",
  "day_name": "Lunes",
  "already_scheduled": false,
  "slots": [
    {
      "id": 1,
      "date": "2025-12-23",
      "hour_init": "06:00 AM",
      "hour_end": "07:00 AM",
      "max_places": 10,
      "available_places": 5,
      "training_type": {
        "id": 1,
        "name": "Grupal",
        "slug_name": "grupal",
        "is_group": true
      }
    }
  ]
}

// Response 400 - Sin parámetro date
{ "error": "El parámetro 'date' es requerido" }

// Response 400 - Formato inválido
{ "error": "Formato de fecha inválido. Use YYYY-MM-DD" }
```

**Notas:**
- `already_scheduled`: `true` si el usuario ya tiene un entrenamiento confirmado para esa fecha
- Si es hoy, solo muestra slots con 20+ minutos de anticipación
- `hour_init` y `hour_end` vienen formateados en formato 12h (ej: "06:00 AM")

### GET `/training/slots/<id>/`

**Autenticado** - Detalles de un slot específico

```json
// Response 200
{
  "slot": {
    "id": 1,
    "date": "2025-12-29",
    "hour_init": "06:00 AM",
    "hour_end": "07:00 AM",
    "max_places": 10,
    "available_places": 5,
    "training_type": {
      "id": 1,
      "name": "Grupal",
      "slug_name": "grupal",
      "is_group": true
    }
  },
  "confirmed_users": [
    { "id": 1, "name": "Juan Pérez" },
    { "id": 2, "name": "María García" }
  ],
  "confirmed_count": 2,
  "user_has_booked": false,
  "already_scheduled_today": false
}

// Response 404
{ "error": "Slot no encontrado" }
```

**Notas:**
- `user_has_booked`: `true` si el usuario ya reservó este slot específico
- `already_scheduled_today`: `true` si el usuario tiene cualquier reserva para la misma fecha

### POST `/training/book/`

**Autenticado** - Reservar entrenamiento

```json
// Request
{ "slot_id": 1 }

// Response 201
{
  "message": "Reserva exitosa",
  "training": {...}
}
```

**Validaciones:**
- Usuario debe estar verificado
- No puede tener otro entrenamiento ese día
- Slot debe tener disponibilidad
- Si es hoy: mínimo 20 min de anticipación

### POST `/training/cancel/`

**Autenticado** - Cancelar reserva

```json
// Request
{ "training_id": 123 }

// Response 200
{ "message": "Reserva cancelada exitosamente" }
```

### GET `/training/my-trainings/`

**Autenticado** - Mis entrenamientos

```json
// Response 200
[
  {
    "id": 123,
    "slot": {
      "date": "2025-12-23",
      "hour_init": "06:00",
      ...
    },
    "training_type": {...},
    "status": "confirmed",
    "is_today": true,
    "can_cancel": true
  }
]
```

### GET `/training/types/`

**Autenticado** - Tipos de entrenamiento

```json
// Response 200
[
  { "id": 1, "name": "Grupal", "slug_name": "grupal", "is_group": true },
  { "id": 2, "name": "Individual", "slug_name": "individual", "is_group": false }
]
```

---

## MEMBERSHIP (`/api/v1/membership/`)

### GET `/membership/`

**Autenticado** - Membresía actual y planes disponibles

```json
// Response 200
{
  "current_membership": {
    "id": 1,
    "membership_type": "monthly",
    "plan": {...},
    "is_active": true,
    "days_left": 15,
    ...
  },
  "available_plans": [
    {
      "id": 1,
      "name": "Plan Mensual",
      "slug_name": "mensual",
      "description": "...",
      "price": 150000,
      "duration": 30
    }
  ]
}
```

### POST `/membership/create-payment/`

**Autenticado** - Crear referencia de pago (BOLD)

```json
// Request
{ "plan_id": 1 }

// Response 200
{
  "payment_url": "https://bold.co/...",
  "order_id": "ORD-123"
}
```

### POST `/membership/verify-payment/`

**Autenticado** - Verificar pago

```json
// Request
{
  "order_id": "ORD-123",
  "tx_status": "approved"
}

// Response 200
{
  "status": "success",
  "membership": {...}
}
```

### POST/GET `/membership/webhook/`

**Público** - Webhook de BOLD (no usar desde app)

---

## YEAR REVIEW (`/api/v1/year-review/`)

### GET `/year-review/` o `/year-review/<year>/`

**Autenticado** - Estadísticas anuales

```json
// Response 200
{
  "year": 2025,
  "total_sessions": 150,
  "total_hours": 225,
  "total_calories": 60000,
  "ranking_position": 5,
  "best_month": "Marzo",
  ...
}
```

---

## DEVICES (`/api/v1/devices/`)

### POST `/devices/register/`

**Autenticado** - Registrar dispositivo para push notifications

```json
// Request
{
  "token": "fcm_token_123...",
  "platform": "ios"
}

// Response 201
{ "message": "Dispositivo registrado" }
```

### DELETE `/devices/unregister/`

**Autenticado** - Desregistrar dispositivo

```json
// Request
{ "token": "fcm_token_123..." }

// Response 204
```

---

## Notas Importantes

| Item                   | Detalle                                                              |
|------------------------|----------------------------------------------------------------------|
| Zona horaria           | America/Bogota                                                       |
| Idioma                 | es-CO (respuestas en español)                                        |
| Pasarela de pago       | BOLD                                                                 |
| Push notifications     | FCM tokens                                                           |
| Verificación requerida | Para reservar entrenamientos el usuario debe tener `is_verified: true` |
