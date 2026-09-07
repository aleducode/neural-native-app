// ============================================================================
// 01-auth.js
// Pantallas: Login (actual), Registro (actual), Recuperar contraseña (actual),
// Código de verificación (actual) — dentro de JLeFU · Membresía — dentro de
// JkDen · Notificaciones — dentro de HBTWH.
//
// Valores sacados de:
//  - src/screens/LoginScreen.tsx
//  - src/screens/RegisterScreen.tsx
//  - src/screens/ForgotPasswordScreen.tsx
//  - src/screens/VerificationCodeScreen.tsx
//  - src/components/AuthField.tsx
//  - src/screens/MembershipScreen.tsx
//  - src/screens/NotificationsScreen.tsx
//  - src/components/ui/{Screen,AppHeader,Card,PrimaryButton}.tsx (compartidos
//    por Membership y Notifications)
//  - src/theme/colors.ts
//
// Las cuatro pantallas de auth reemplazan a las "Login"/"Registro" viejas de
// JLeFU (botones #5A6BFF): por eso llevan "(actual)" en el nombre y van sobre
// fondo BLANCO, no sobre #F4F4F4. Membresía y Notificaciones sí van sobre
// #F4F4F4, como en Screen tone="surface".
//
// Simplificaciones frente al código (la API de Pencil no soporta posición
// absoluta, rotación de capas ni márgenes negativos):
//  - La forma de marca degradada del login/registro/recuperar/verificación
//    (un SVG bleed fuera de la esquina superior derecha) se reemplaza por un
//    frame recortado (clip:true) más grande que su contenedor, alineado a la
//    esquina con justifyContent/alignItems 'end': el mismo efecto de "forma
//    que se asoma", sin position:absolute.
//  - El logo (assets/neural.png) no tiene URL disponible para incrustar como
//    imagen; se deja como un placeholder rectangular 132x34 en ink.
//  - El subtítulo de "Código de verificación" en el código intercala un
//    tramo en negrita con el correo del usuario; aquí se deja como un solo
//    texto en el estado sin correo ("a tu correo"), porque no hay un dato de
//    correo real que mostrar.
//  - Los seis recuadros del código de verificación se muestran vacíos
//    (estado inicial, sin dígitos).
//  - En Membresía, "Qué incluye" y la tarjeta de membresía activa usan datos
//    fijos de MembershipScreen.tsx (BENEFITS) y de ejemplo razonable para los
//    campos que vienen de la API (nombre/precio/duración/días restantes),
//    mostrando también un plan seleccionado para ilustrar el estado "on".
//  - En Notificaciones se muestran 3 filas de ejemplo cubriendo los tres
//    tintes de estado (Entrenos verde, Membresía #FFB638, Logros gris) y los
//    dos estados del punto de la línea de tiempo (leída/no leída).
//  - 'mail', 'lock', 'person', 'call', 'visibility_off' y 'check' no están en
//    la lista de íconos garantizados de la convención, pero son nombres
//    estándar de Material Symbols Rounded amplísimamente disponibles; si
//    Pencil los rechaza, son los primeros a revisar.
// ============================================================================

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function txt(parent, content, size, weight, color, align) {
  Insert(parent, {
    type: 'text',
    content: content,
    fontFamily: 'Rethink Sans',
    fontSize: size,
    fontWeight: weight,
    fill: color,
    textAlign: align,
  });
}

function txtLs(parent, content, size, weight, color, align, ls) {
  Insert(parent, {
    type: 'text',
    content: content,
    fontFamily: 'Rethink Sans',
    fontSize: size,
    fontWeight: weight,
    fill: color,
    textAlign: align,
    letterSpacing: ls,
  });
}

function txtWrap(parent, content, size, weight, color, align, width, ls, lh) {
  Insert(parent, {
    type: 'text',
    content: content,
    fontFamily: 'Rethink Sans',
    fontSize: size,
    fontWeight: weight,
    fill: color,
    textAlign: align,
    letterSpacing: ls,
    lineHeight: lh,
    textGrowth: 'fixed-width',
    width: width,
  });
}

function ic(parent, name, size, color) {
  Insert(parent, { type: 'icon', name: name, icon: name, width: size, height: size, fill: color });
}

function spacer(parent, h) {
  Insert(parent, { type: 'frame', layout: 'none', width: 'fill_container', height: h });
}

// AppHeader.tsx: fila de 52, back circular implícito (ícono suelto, sin
// disco), título centrado + subtítulo opcional, acción a la derecha o un
// espaciador de 24 si no hay acción.
function appHeader(parent, title, subtitle, actionIcon) {
  row = Insert(parent, {
    type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 12,
    justifyContent: 'space_between', width: 'fill_container', height: 52,
  });
  ic(row, 'arrow_back', 24, '#111111');
  titles = Insert(row, {
    type: 'frame', layout: 'vertical', alignItems: 'center', gap: 2,
    justifyContent: 'center', width: 'fill_container',
  });
  txtLs(titles, title, 20, '600', '#111111', 'center', -0.2);
  if (subtitle) {
    txt(titles, subtitle, 12, 'normal', '#727272', 'center');
  }
  if (actionIcon) {
    ic(row, actionIcon, 24, '#111111');
  } else {
    Insert(row, { type: 'frame', layout: 'none', width: 24, height: 24 });
  }
}

// Bloque editorial de las pantallas de auth: título 40/700/lh1.1/ls-1 +
// subtítulo 15/normal/lh1.4, ambos gray400 sobre blanco.
function authHeader(parent, title, subtitle) {
  txtWrap(parent, title, 40, '700', '#111111', 'left', 343, -1, 1.1);
  spacer(parent, 12);
  txtWrap(parent, subtitle, 15, 'normal', '#727272', 'left', 343, 0, 1.4);
}

// Botón circular "volver": 44, r22, fondo surface, ícono ink 20.
function backBtn(parent) {
  btn = Insert(parent, {
    type: 'frame', layout: 'vertical', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, cornerRadius: 22, fill: '#F4F4F4',
  });
  ic(btn, 'arrow_back', 20, '#111111');
}

// Forma de marca degradada asomando por la esquina superior derecha (ver nota
// de simplificaciones arriba).
function brandBlob(parent) {
  box = Insert(parent, {
    type: 'frame', layout: 'horizontal', justifyContent: 'end', alignItems: 'end',
    width: 343, height: 120, clip: true,
  });
  Insert(box, {
    type: 'ellipse', width: 280, height: 280,
    fill: {
      type: 'gradient', gradientType: 'linear', enabled: true, rotation: 270,
      size: { height: 1 },
      colors: [{ color: '#C6FF40', position: 0 }, { color: '#17DD42', position: 1 }],
    },
  });
}

// AuthField.tsx: label 13/600/ls0.2 + caja 58/r14/borde1.5, ícono líder,
// placeholder (o un relleno invisible si el campo no tiene uno, como Nombre y
// Apellido) y un ícono final opcional (el "ojo" de los campos de contraseña).
function authField(parent, label, iconName, placeholder, trailingIcon) {
  wrap = Insert(parent, { type: 'frame', layout: 'vertical', gap: 8, width: 'fill_container' });
  txtLs(wrap, label, 13, '600', '#111111', 'left', 0.2);
  box = Insert(wrap, {
    type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 12,
    padding: [0, 16], width: 'fill_container', height: 58, cornerRadius: 14,
    stroke: '#F4F4F4', strokeWidth: 1.5, fill: '#F4F4F4',
  });
  ic(box, iconName, 20, '#727272');
  if (placeholder) {
    Insert(box, {
      type: 'text', content: placeholder, fontFamily: 'Rethink Sans', fontSize: 16,
      fontWeight: 'normal', fill: '#727272', width: 'fill_container', textGrowth: 'fixed-width',
    });
  } else {
    Insert(box, { type: 'frame', layout: 'none', width: 'fill_container', height: 1 });
  }
  if (trailingIcon) {
    ic(box, trailingIcon, 20, '#727272');
  }
}

// CTA píldora ink: 17/600/ls0.2 blanco + flecha opcional (Verificar no lleva
// ícono, a diferencia de las otras — así en el código).
function ctaBtn(parent, label, arrowIcon, h, r) {
  btn = Insert(parent, {
    type: 'frame', layout: 'horizontal', alignItems: 'center', justifyContent: 'center',
    gap: 10, width: 'fill_container', height: h, cornerRadius: r, fill: '#111111',
  });
  txtLs(btn, label, 17, '600', '#FFFFFF', 'center', 0.2);
  if (arrowIcon) {
    ic(btn, arrowIcon, 19, '#FFFFFF');
  }
}

// ============================================================================
// PANTALLA: Login (actual)  (contenedor JLeFU)
// LoginScreen.tsx: scroll padH24 padT8 padB24, header mt52 mb40, form gap20,
// cta h58 r29, footer paddingTop40.
// ============================================================================
scrLogin = Insert('JLeFU', {
  type: 'frame', name: 'Login (actual)', layout: 'vertical', gap: 0,
  padding: [42, 16, 32, 16], width: 375, height: 'fit_content', fill: '#FFFFFF', clip: true,
});

headerLogin = Insert(scrLogin, { type: 'frame', layout: 'vertical', gap: 0, width: 'fill_container' });
brandBlob(headerLogin);
Insert(headerLogin, { type: 'frame', layout: 'none', width: 132, height: 34, cornerRadius: 6, fill: '#111111' }); // logo placeholder (assets/neural.png, sin url)
spacer(headerLogin, 36); // logo.marginBottom: 36
authHeader(headerLogin, 'Hola de\nnuevo', 'Entra para reservar tu próximo entrenamiento.');

spacer(scrLogin, 40); // header.marginBottom: 40

formLogin = Insert(scrLogin, { type: 'frame', layout: 'vertical', gap: 20, width: 'fill_container' });
authField(formLogin, 'Correo electrónico', 'mail', 'tu@correo.com', null);
authField(formLogin, 'Contraseña', 'lock', '••••••••', 'visibility_off');

rowLogin = Insert(formLogin, {
  type: 'frame', layout: 'horizontal', justifyContent: 'space_between', alignItems: 'center', width: 'fill_container',
});
rememberGroup = Insert(rowLogin, { type: 'frame', layout: 'horizontal', gap: 10, alignItems: 'center' });
Insert(rememberGroup, { type: 'frame', layout: 'none', width: 20, height: 20, cornerRadius: 6, fill: '#111111' }); // checkbox: remember=true por defecto
txt(rememberGroup, 'Mantener sesión', 14, 'normal', '#111111', 'left');
Insert(rowLogin, {
  type: 'text', content: '¿Olvidaste tu contraseña?', fontFamily: 'Rethink Sans', fontSize: 14,
  fontWeight: '600', fill: '#111111', textDecoration: 'underline',
});

ctaBtn(formLogin, 'Ingresar', 'arrow_forward', 58, 29);

spacer(scrLogin, 40); // footer.paddingTop: 40

footerLogin = Insert(scrLogin, {
  type: 'frame', layout: 'horizontal', justifyContent: 'center', alignItems: 'center', gap: 6, width: 'fill_container',
});
txt(footerLogin, '¿Todavía no tienes cuenta?', 14, 'normal', '#727272', 'left');
txt(footerLogin, 'Regístrate', 14, '700', '#111111', 'left');

// ============================================================================
// PANTALLA: Registro (actual)  (contenedor JLeFU)
// RegisterScreen.tsx: header mt40 mb32, form gap18, nameRow gap12, footer pt36.
// ============================================================================
scrRegister = Insert('JLeFU', {
  type: 'frame', name: 'Registro (actual)', layout: 'vertical', gap: 0,
  padding: [42, 16, 32, 16], width: 375, height: 'fit_content', fill: '#FFFFFF', clip: true,
});

headerRegister = Insert(scrRegister, { type: 'frame', layout: 'vertical', gap: 0, width: 'fill_container' });
brandBlob(headerRegister);
Insert(headerRegister, { type: 'frame', layout: 'none', width: 132, height: 34, cornerRadius: 6, fill: '#111111' });
spacer(headerRegister, 28); // logo.marginBottom: 28
authHeader(headerRegister, 'Crea tu\ncuenta', 'Unos datos y ya puedes reservar tu primer entrenamiento.');

spacer(scrRegister, 32); // header.marginBottom: 32

formRegister = Insert(scrRegister, { type: 'frame', layout: 'vertical', gap: 18, width: 'fill_container' });
nameRow = Insert(formRegister, { type: 'frame', layout: 'horizontal', gap: 12, alignItems: 'start', width: 'fill_container' });
authField(nameRow, 'Nombre', 'person', '', null);
authField(nameRow, 'Apellido', 'person', '', null);
authField(formRegister, 'Correo electrónico', 'mail', 'tu@correo.com', null);
authField(formRegister, 'Teléfono', 'call', '+57 300 000 0000', null);
authField(formRegister, 'Contraseña', 'lock', '••••••••', 'visibility_off');
authField(formRegister, 'Confirmar contraseña', 'lock', '••••••••', 'visibility_off');
ctaBtn(formRegister, 'Crear cuenta', 'arrow_forward', 58, 29);

spacer(scrRegister, 36); // footer.paddingTop: 36

footerRegister = Insert(scrRegister, {
  type: 'frame', layout: 'horizontal', justifyContent: 'center', alignItems: 'center', gap: 6, width: 'fill_container',
});
txt(footerRegister, '¿Ya tienes cuenta?', 14, 'normal', '#727272', 'left');
txt(footerRegister, 'Inicia sesión', 14, '700', '#111111', 'left');

// ============================================================================
// PANTALLA: Recuperar contraseña (actual)  (contenedor JLeFU)
// ForgotPasswordScreen.tsx, estado inicial (formulario, sin enviar todavía):
// back mt8, header mt40 mb40, form gap20.
// ============================================================================
scrForgot = Insert('JLeFU', {
  type: 'frame', name: 'Recuperar contraseña (actual)', layout: 'vertical', gap: 0,
  padding: [42, 16, 32, 16], width: 375, height: 'fit_content', fill: '#FFFFFF', clip: true,
});

spacer(scrForgot, 8); // back.marginTop: 8
backBtn(scrForgot);
spacer(scrForgot, 40); // header.marginTop: 40
headerForgot = Insert(scrForgot, { type: 'frame', layout: 'vertical', gap: 0, width: 'fill_container' });
authHeader(headerForgot, 'Recupera tu\ncontraseña', 'Ingresa tu correo y te enviamos un enlace para restablecerla.');

spacer(scrForgot, 40); // header.marginBottom: 40

formForgot = Insert(scrForgot, { type: 'frame', layout: 'vertical', gap: 20, width: 'fill_container' });
authField(formForgot, 'Correo electrónico', 'mail', 'tu@correo.com', null);
ctaBtn(formForgot, 'Enviar enlace', 'arrow_forward', 58, 29);

// ============================================================================
// PANTALLA: Código de verificación (actual)  (contenedor JLeFU)
// VerificationCodeScreen.tsx: back mt8, header mt36 mb40, form gap20, seis
// casillas 62/r16/borde1.5, footer paddingTop40 con el contador inicial
// (secondsLeft = RESEND_SECONDS = 60).
// ============================================================================
scrVerify = Insert('JLeFU', {
  type: 'frame', name: 'Código de verificación (actual)', layout: 'vertical', gap: 0,
  padding: [42, 16, 32, 16], width: 375, height: 'fit_content', fill: '#FFFFFF', clip: true,
});

spacer(scrVerify, 8); // back.marginTop: 8
backBtn(scrVerify);
spacer(scrVerify, 36); // header.marginTop: 36
headerVerify = Insert(scrVerify, { type: 'frame', layout: 'vertical', gap: 0, width: 'fill_container' });
authHeader(headerVerify, 'Ingresa el\ncódigo', 'Enviamos un código de 6 dígitos a tu correo.');

spacer(scrVerify, 40); // header.marginBottom: 40

formVerify = Insert(scrVerify, { type: 'frame', layout: 'vertical', gap: 20, width: 'fill_container' });
boxesRow = Insert(formVerify, {
  type: 'frame', layout: 'horizontal', justifyContent: 'space_between', gap: 10, width: 'fill_container', height: 62,
});
for (i of [0, 1, 2, 3, 4, 5]) {
  Insert(boxesRow, {
    type: 'frame', layout: 'none', width: 'fill_container', height: 62, cornerRadius: 16,
    stroke: '#F4F4F4', strokeWidth: 1.5, fill: '#FFFFFF',
  });
}
ctaBtn(formVerify, 'Verificar', null, 58, 29);

spacer(scrVerify, 40); // footer.paddingTop: 40

footerVerify = Insert(scrVerify, {
  type: 'frame', layout: 'horizontal', justifyContent: 'center', alignItems: 'center', width: 'fill_container',
});
txt(footerVerify, 'Reenviar en 00:60', 14, 'normal', '#727272', 'center');

// ============================================================================
// PANTALLA: Membresía  (contenedor JkDen)
// MembershipScreen.tsx sobre Screen tone="surface": header 52, hero mt8 mb24
// gap8, body gap12, Card padding16/gap16/r20, plan row padding[12,16]/r20,
// footer padding[12,16,24,16] sobre surface.
// ============================================================================
scrMembership = Insert('JkDen', {
  type: 'frame', name: 'Membresía', layout: 'vertical', gap: 0,
  padding: [42, 16, 32, 16], width: 375, height: 'fit_content', fill: '#F4F4F4', clip: true,
});

appHeader(scrMembership, 'Membresía', null, null);

spacer(scrMembership, 8); // hero.marginTop: 8

heroMembership = Insert(scrMembership, { type: 'frame', layout: 'vertical', gap: 8, width: 'fill_container' });
txtLs(heroMembership, 'TU PLAN', 11, '700', '#727272', 'left', 1.2);
txtWrap(heroMembership, 'Elige tu plan.', 34, '700', '#111111', 'left', 343, -1, 1.18);
txtWrap(heroMembership, 'Accede a entrenos personalizados y seguimiento de tu progreso.', 14, 'normal', '#727272', 'left', 343, 0, 1.43);

spacer(scrMembership, 24); // hero.marginBottom: 24

bodyMembership = Insert(scrMembership, { type: 'frame', layout: 'vertical', gap: 12, width: 'fill_container' });

// -- Card: Qué incluye (BENEFITS de MembershipScreen.tsx) -------------------
cardIncluye = Insert(bodyMembership, {
  type: 'frame', layout: 'vertical', gap: 16, padding: 16, cornerRadius: 20, fill: '#FFFFFF', width: 'fill_container',
});
headIncluye = Insert(cardIncluye, { type: 'frame', layout: 'vertical', gap: 4, width: 'fill_container' });
txt(headIncluye, 'Qué incluye', 20, '600', '#111111', 'left');
txt(headIncluye, 'Tu membresía Neural', 12, 'normal', '#727272', 'left');
benefitsList = Insert(cardIncluye, { type: 'frame', layout: 'vertical', gap: 12, width: 'fill_container' });
benefits = [
  'Entrenos funcionales adaptados a tu progreso.',
  'Seguimiento de tu rendimiento y estadísticas.',
  'Acceso a todas las clases y horarios disponibles.',
  'Planes que se ajustan a tus objetivos.',
];
for (b of benefits) {
  rowB = Insert(benefitsList, { type: 'frame', layout: 'horizontal', alignItems: 'start', gap: 10, width: 'fill_container' });
  ic(rowB, 'check_circle', 18, '#17DD42');
  txtWrap(rowB, b, 14, 'normal', '#111111', 'left', 269, 0, 1.43);
}

// -- Card: membresía activa (check-circle verde + fecha de vencimiento) -----
cardActiva = Insert(bodyMembership, {
  type: 'frame', layout: 'vertical', gap: 16, padding: 16, cornerRadius: 20, fill: '#FFFFFF', width: 'fill_container',
});
daysRow = Insert(cardActiva, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 6, width: 'fill_container' });
ic(daysRow, 'check_circle', 16, '#17DD42');
txt(daysRow, '18 días restantes', 12, 'normal', '#111111', 'left');
detailRow = Insert(cardActiva, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 4, width: 'fill_container' });
ic(detailRow, 'calendar_month', 16, '#727272');
txt(detailRow, 'Vence: 24 de octubre de 2026', 14, 'normal', '#727272', 'left');

// -- Tarjetas de plan (radiogroup) -------------------------------------------
plansList = Insert(bodyMembership, { type: 'frame', layout: 'vertical', gap: 8, width: 'fill_container' });

function planCard(parent, name, desc, price, days, selected) {
  strokeColor = selected ? '#111111' : '#FFFFFF';
  card = Insert(parent, {
    type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 16, padding: [12, 16],
    cornerRadius: 20, fill: '#FFFFFF', stroke: strokeColor, strokeWidth: 2, width: 'fill_container',
  });
  textCol = Insert(card, { type: 'frame', layout: 'vertical', gap: 4, width: 'fill_container' });
  txt(textCol, name, 20, '600', '#111111', 'left');
  txt(textCol, desc, 12, 'normal', '#727272', 'left');
  txt(textCol, price, 16, '600', '#111111', 'left');
  txt(textCol, days + ' días', 12, 'normal', '#727272', 'left');
  tickFill = selected ? '#111111' : '#F4F4F4';
  tick = Insert(card, {
    type: 'frame', layout: 'vertical', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, cornerRadius: 13, fill: tickFill, stroke: tickFill, strokeWidth: 2,
  });
  if (selected) {
    ic(tick, 'check', 16, '#FFFFFF');
  }
}

planCard(plansList, 'Plan Mensual', 'Acceso completo a clases y seguimiento.', '$120.000', 31, true);
planCard(plansList, 'Plan Trimestral', 'Ahorra entrenando 3 meses seguidos.', '$320.000', 92, false);
planCard(plansList, 'Plan Semestral', 'El mejor precio por mes de entrenamiento.', '$580.000', 183, false);

spacer(scrMembership, 12);

footerMembership = Insert(scrMembership, {
  type: 'frame', layout: 'vertical', gap: 10, padding: [12, 16, 24, 16], fill: '#F4F4F4', width: 'fill_container',
});
ctaBtn(footerMembership, 'Suscribirse', null, 56, 28);

// ============================================================================
// PANTALLA: Notificaciones  (contenedor HBTWH)
// NotificationsScreen.tsx sobre Screen tone="surface": header 52 con acción
// "check_circle" (marcar todas leídas), listHeader gap12, fila timeCol(46) +
// punto-línea-punto(6x92) + tarjeta blanca r16 padding[8,12]. Sin fila de
// calorías/ritmo/duración — no existe en este componente.
// ============================================================================
scrNotif = Insert('HBTWH', {
  type: 'frame', name: 'Notificaciones', layout: 'vertical', gap: 0,
  padding: [42, 16, 32, 16], width: 375, height: 'fit_content', fill: '#F4F4F4', clip: true,
});

appHeader(scrNotif, 'Notificaciones', '3 sin leer', 'check_circle');

spacer(scrNotif, 8); // listContent.paddingTop: 8

listNotif = Insert(scrNotif, { type: 'frame', layout: 'vertical', gap: 12, width: 'fill_container' });
labelsRow = Insert(listNotif, { type: 'frame', layout: 'horizontal', gap: 16, width: 'fill_container' });
txt(labelsRow, 'Hora', 12, 'normal', '#111111', 'left');
txt(labelsRow, 'Notificación', 12, 'normal', '#111111', 'left');

// Fila: timeCol(46, punto-línea-punto) + tarjeta blanca. El punto superior es
// #17DD42 si no está leída, #DEDEDE si sí (dot.tsx / dotUnread en el código).
function notifRow(parent, timeStart, timeAgo, title, statusLabel, statusColor, unread) {
  row = Insert(parent, { type: 'frame', layout: 'horizontal', gap: 16, alignItems: 'start', width: 'fill_container' });

  timeCol = Insert(row, { type: 'frame', layout: 'vertical', alignItems: 'center', gap: 8, width: 46 });
  times = Insert(timeCol, { type: 'frame', layout: 'vertical', alignItems: 'center', gap: 4, width: 'fill_container' });
  txt(times, timeStart, 12, '600', '#111111', 'center');
  txt(times, timeAgo, 12, '600', '#727272', 'center');
  timeline = Insert(timeCol, { type: 'frame', layout: 'vertical', alignItems: 'center', gap: 4, width: 6, height: 92 });
  dotColor = unread ? '#17DD42' : '#DEDEDE';
  Insert(timeline, { type: 'ellipse', width: 6, height: 6, fill: dotColor });
  Insert(timeline, { type: 'rectangle', width: 2, height: 72, fill: '#DEDEDE' });
  Insert(timeline, { type: 'ellipse', width: 6, height: 6, fill: '#DEDEDE' });

  card = Insert(row, {
    type: 'frame', layout: 'vertical', gap: 16, padding: [8, 12], cornerRadius: 16, fill: '#FFFFFF', width: 'fill_container',
  });
  titleRow = Insert(card, {
    type: 'frame', layout: 'horizontal', justifyContent: 'space_between', alignItems: 'center', gap: 8, width: 'fill_container',
  });
  txt(titleRow, title, 16, '600', '#111111', 'left');
  ic(titleRow, 'more_vert', 16, '#111111');
  statusRow = Insert(card, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 12, width: 'fill_container' });
  Insert(statusRow, { type: 'ellipse', width: 8, height: 8, fill: statusColor });
  txt(statusRow, statusLabel, 12, 'normal', '#111111', 'left');
  hatchTrack = Insert(statusRow, { type: 'frame', layout: 'none', width: 'fill_container', height: 6, cornerRadius: 32, fill: '#DEDEDE', clip: true });
  Insert(hatchTrack, {
    type: 'frame', layout: 'none', width: 90, height: 6, cornerRadius: 32,
    fill: {
      type: 'gradient', gradientType: 'linear', enabled: true, rotation: 270,
      size: { height: 1 },
      colors: [{ color: '#C6FF40', position: 0 }, { color: '#17DD42', position: 1 }],
    },
  });
}

notifRow(listNotif, '08:14', 'Hace 2 h', 'Recordatorio de entreno', 'Entrenos', '#17DD42', true);
notifRow(listNotif, '07:02', 'Ayer', 'Tu membresía vence pronto', 'Membresía', '#FFB638', false);
notifRow(listNotif, 'Lun', '3 días', 'Nuevo logro desbloqueado', 'Logros', '#727272', false);

// ============================================================================
// RESUMEN — pantallas creadas y alto aproximado (height:'fit_content' real;
// cifras de referencia calculadas a mano sumando padding+gaps+contenido):
//
//  1) Login (actual)                    → contenedor JLeFU  · alto aprox. ~820 px
//  2) Registro (actual)                 → contenedor JLeFU  · alto aprox. ~1060 px
//  3) Recuperar contraseña (actual)     → contenedor JLeFU  · alto aprox. ~505 px
//  4) Código de verificación (actual)   → contenedor JLeFU  · alto aprox. ~538 px
//  5) Membresía                         → contenedor JkDen  · alto aprox. ~1090 px
//  6) Notificaciones                    → contenedor HBTWH  · alto aprox. ~575 px
//
// Las "Login"/"Registro" viejas en JLeFU (botones #5A6BFF) quedan intactas —
// bórralas manualmente una vez verifiques las nuevas.
// ============================================================================
