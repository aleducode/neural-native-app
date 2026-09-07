// 03 · Agendar — Calendario, Detalle del turno, Reserva confirmada
//
// Derivado del código real:
//   src/screens/CalendarScreen.tsx
//   src/screens/SlotDetailScreen.tsx
//   src/screens/BookingConfirmationScreen.tsx
//   src/components/ui/AppHeader.tsx
//   src/components/calendar/MonthCalendar.tsx
//   src/theme/colors.ts
//
// Contenido de ejemplo: mismo entrenamiento y mismo horario en las tres
// pantallas — "Entrenamiento Funcional", 14 Sep 2026, 06:00 AM – 07:00 AM.
//
// Simplificaciones frente al código (la API de Pencil no soporta posición
// absoluta, rotación ni márgenes negativos):
//  - El hero de "Detalle del turno" no usa una foto con scrim superpuesto:
//    el degradado oscuro ES el fondo del frame (mismo resultado visual).
//  - Las 3 barras de nivel del hero son simples rectángulos en flujo, no
//    superpuestas.
//  - El medidor de ocupación es una barra partida en dos tramos (lleno /
//    rayado) en vez de una superposición; la insignia va dentro del tramo
//    lleno, pegada a su borde derecho.
//  - Los tres chevrons del CTA van pegados (gap 0) en vez de superpuestos
//    con margen negativo.
//  - El trofeo de "Reserva confirmada" no existe como ícono seguro de
//    Material Symbols Rounded, así que se reemplaza por un check_circle
//    grande en verde — mismo mensaje ("confirmado"), ícono garantizado.

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

// Header row: back, título centrado, acción a la derecha. 52 de alto.
function header(parent, title, actionIcon) {
  row = Insert(parent, {
    type: 'frame',
    layout: 'horizontal',
    alignItems: 'center',
    justifyContent: 'space_between',
    width: 'fill_container',
    height: 52,
  });
  ic(row, 'arrow_back', 24, '#111111');
  titleWrap = Insert(row, {
    type: 'frame',
    layout: 'vertical',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'fill_container',
  });
  Insert(titleWrap, {
    type: 'text',
    content: title,
    fontFamily: 'Rethink Sans',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    fill: '#111111',
    textAlign: 'center',
  });
  ic(row, actionIcon, 24, '#111111');
}

// ---------------------------------------------------------------------------
// Pantalla 1 — Agendar (Calendario)
// ---------------------------------------------------------------------------

scr = Insert('s5dSr', {
  type: 'frame',
  name: 'Agendar',
  layout: 'vertical',
  gap: 4,
  padding: [42, 16, 32, 16],
  width: 375,
  height: 1180,
  fill: '#F4F4F4',
  clip: true,
});

header(scr, 'Calendario', 'schedule');

content1 = Insert(scr, {
  type: 'frame',
  layout: 'vertical',
  gap: 24,
  padding: [4, 0, 0, 0],
  width: 'fill_container',
});

// -- Chip de fecha + titular ------------------------------------------------

headBlock = Insert(content1, { type: 'frame', layout: 'vertical', gap: 12, width: 'fill_container' });

chipRow = Insert(headBlock, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 12 });
chipIcon = Insert(chipRow, {
  type: 'frame',
  layout: 'vertical',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  cornerRadius: 20,
  fill: '#FFFFFF',
  stroke: '#DEDEDE',
  strokeWidth: 1,
});
ic(chipIcon, 'calendar_month', 20, '#727272');
txt(chipRow, '14 Sep 2026', 16, '600', '#111111', 'left');

txtWrap(headBlock, '¿Listo para reservar tu próximo entrenamiento?', 36, 'normal', '#111111', 'left', 343, -0.36, 1.19);

// -- Card de calendario (ink, r24) -------------------------------------------

card = Insert(content1, {
  type: 'frame',
  layout: 'vertical',
  width: 'fill_container',
  cornerRadius: 24,
  padding: 16,
  fill: '#111111',
});

cardHead = Insert(card, {
  type: 'frame',
  layout: 'horizontal',
  alignItems: 'center',
  justifyContent: 'space_between',
  width: 'fill_container',
  padding: [0, 0, 16, 0],
});
txt(cardHead, 'Septiembre 2026', 16, '600', '#FFFFFF', 'left');
steppers = Insert(cardHead, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 27 });
ic(steppers, 'chevron_left', 24, '#8A8A8A');
ic(steppers, 'chevron_right', 24, '#8A8A8A');

daysBlock = Insert(card, { type: 'frame', layout: 'vertical', gap: 12, width: 'fill_container', padding: [16, 0] });

weekdaysRow = Insert(daysBlock, { type: 'frame', layout: 'horizontal', width: 'fill_container' });
weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
for (w of weekdayNames) {
  wCell = Insert(weekdaysRow, {
    type: 'frame',
    layout: 'vertical',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'fill_container',
  });
  Insert(wCell, {
    type: 'text',
    content: w,
    fontFamily: 'Rethink Sans',
    fontSize: 12,
    fill: '#FFFFFF',
    textAlign: 'center',
  });
}

// Septiembre 2026: 1 Sep es martes. Seleccionado: 14. Hoy: 6. Con cupo: ver `ring`.
weeks = [
  [
    { d: 30, ring: false, sel: false, today: false, out: true },
    { d: 31, ring: false, sel: false, today: false, out: true },
    { d: 1, ring: false, sel: false, today: false, out: false },
    { d: 2, ring: false, sel: false, today: false, out: false },
    { d: 3, ring: false, sel: false, today: false, out: false },
    { d: 4, ring: false, sel: false, today: false, out: false },
    { d: 5, ring: false, sel: false, today: false, out: false },
  ],
  [
    { d: 6, ring: false, sel: false, today: true, out: false },
    { d: 7, ring: true, sel: false, today: false, out: false },
    { d: 8, ring: false, sel: false, today: false, out: false },
    { d: 9, ring: true, sel: false, today: false, out: false },
    { d: 10, ring: false, sel: false, today: false, out: false },
    { d: 11, ring: true, sel: false, today: false, out: false },
    { d: 12, ring: false, sel: false, today: false, out: false },
  ],
  [
    { d: 13, ring: false, sel: false, today: false, out: false },
    { d: 14, ring: false, sel: true, today: false, out: false },
    { d: 15, ring: false, sel: false, today: false, out: false },
    { d: 16, ring: true, sel: false, today: false, out: false },
    { d: 17, ring: false, sel: false, today: false, out: false },
    { d: 18, ring: true, sel: false, today: false, out: false },
    { d: 19, ring: false, sel: false, today: false, out: false },
  ],
  [
    { d: 20, ring: false, sel: false, today: false, out: false },
    { d: 21, ring: true, sel: false, today: false, out: false },
    { d: 22, ring: false, sel: false, today: false, out: false },
    { d: 23, ring: true, sel: false, today: false, out: false },
    { d: 24, ring: false, sel: false, today: false, out: false },
    { d: 25, ring: true, sel: false, today: false, out: false },
    { d: 26, ring: false, sel: false, today: false, out: false },
  ],
  [
    { d: 27, ring: false, sel: false, today: false, out: false },
    { d: 28, ring: true, sel: false, today: false, out: false },
    { d: 29, ring: false, sel: false, today: false, out: false },
    { d: 30, ring: true, sel: false, today: false, out: false },
    { d: 1, ring: false, sel: false, today: false, out: true },
    { d: 2, ring: false, sel: false, today: false, out: true },
    { d: 3, ring: false, sel: false, today: false, out: true },
  ],
];

grid = Insert(daysBlock, { type: 'frame', layout: 'vertical', gap: 12, width: 'fill_container' });
for (week of weeks) {
  weekRow = Insert(grid, { type: 'frame', layout: 'horizontal', alignItems: 'center', width: 'fill_container' });
  for (cell of week) {
    cellWrap = Insert(weekRow, {
      type: 'frame',
      layout: 'vertical',
      alignItems: 'center',
      justifyContent: 'center',
      width: 'fill_container',
      height: 31,
    });
    dotFill = '#111111';
    // Sin ring ni selección, el borde va del mismo color que la card: invisible
    // sin depender de 'transparent', que la API no garantiza soportar.
    dotStroke = '#111111';
    dayColor = '#FFFFFF';
    if (cell.out) {
      dayColor = '#727272';
    }
    if (cell.today) {
      dayColor = '#C6FF40';
    }
    if (cell.ring) {
      dotStroke = '#17DD42';
    }
    if (cell.sel) {
      dotFill = '#17DD42';
      dotStroke = '#17DD42';
      dayColor = '#111111';
    }
    dot = Insert(cellWrap, {
      type: 'frame',
      layout: 'vertical',
      alignItems: 'center',
      justifyContent: 'center',
      width: 31,
      height: 31,
      cornerRadius: 16,
      fill: dotFill,
      stroke: dotStroke,
      strokeWidth: 1,
    });
    dayWeight = 'normal';
    if (cell.sel) {
      dayWeight = '600';
    }
    Insert(dot, {
      type: 'text',
      content: '' + cell.d,
      fontFamily: 'Rethink Sans',
      fontSize: 16,
      fontWeight: dayWeight,
      fill: dayColor,
      textAlign: 'center',
    });
  }
}

// -- Banner + lista de entrenamientos ----------------------------------------

bodyBlock = Insert(content1, { type: 'frame', layout: 'vertical', gap: 12, width: 'fill_container' });

banner = Insert(bodyBlock, {
  type: 'frame',
  layout: 'horizontal',
  alignItems: 'center',
  gap: 10,
  width: 'fill_container',
  cornerRadius: 16,
  padding: [12, 14],
  fill: '#E8FCEC',
});
ic(banner, 'check_circle', 18, '#111111');
txtWrap(banner, 'Ya tienes un entrenamiento agendado para este día', 13, '600', '#111111', 'left', 287, 0, 1.38);

txt(bodyBlock, 'Entrenamientos disponibles', 20, '600', '#111111', 'left');

slotsList = Insert(bodyBlock, { type: 'frame', layout: 'vertical', gap: 12, width: 'fill_container' });

slots = [
  {
    type: 'Entrenamiento Funcional',
    typeColor: '#109D2F',
    hour: '06:00 AM – 07:00 AM',
    desc: 'Entrenamiento grupal',
    metaIcon: 'group',
    metaText: '4 cupos',
    duration: '60 minutos',
    tileFill: '#E8FCEC',
    tileIconColor: '#17DD42',
  },
  {
    type: 'Spinning',
    typeColor: '#727272',
    hour: '05:00 PM – 06:00 PM',
    desc: 'Entrenamiento grupal',
    metaIcon: 'group',
    metaText: 'Lleno',
    duration: '60 minutos',
    tileFill: '#F4F4F4',
    tileIconColor: '#727272',
  },
];

for (slot of slots) {
  slotCard = Insert(slotsList, {
    type: 'frame',
    layout: 'horizontal',
    alignItems: 'center',
    justifyContent: 'space_between',
    width: 'fill_container',
    height: 184,
    padding: [12, 16],
    cornerRadius: 20,
    fill: '#FFFFFF',
  });

  slotInfo = Insert(slotCard, { type: 'frame', layout: 'vertical', justifyContent: 'space_between', height: 'fill_container' });

  slotHead = Insert(slotInfo, { type: 'frame', layout: 'vertical', gap: 12 });
  txt(slotHead, slot.type, 12, 'normal', slot.typeColor, 'left');
  slotDetails = Insert(slotHead, { type: 'frame', layout: 'vertical', gap: 4 });
  txt(slotDetails, slot.hour, 20, '600', '#111111', 'left');
  txt(slotDetails, slot.desc, 12, 'normal', '#727272', 'left');

  slotMetas = Insert(slotInfo, { type: 'frame', layout: 'vertical', gap: 12 });
  meta1 = Insert(slotMetas, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 8 });
  ic(meta1, slot.metaIcon, 16, '#111111');
  txt(meta1, slot.metaText, 12, 'normal', '#727272', 'left');
  meta2 = Insert(slotMetas, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 8 });
  ic(meta2, 'schedule', 16, '#111111');
  txt(meta2, slot.duration, 12, 'normal', '#727272', 'left');

  tile = Insert(slotCard, {
    type: 'frame',
    layout: 'vertical',
    alignItems: 'center',
    justifyContent: 'center',
    width: 113,
    height: 118,
    cornerRadius: 12,
    fill: slot.tileFill,
    clip: true,
  });
  ic(tile, 'bolt', 48, slot.tileIconColor);
}

// ---------------------------------------------------------------------------
// Pantalla 2 — Detalle del turno
// ---------------------------------------------------------------------------

scr2 = Insert('s5dSr', {
  type: 'frame',
  name: 'Detalle del turno',
  layout: 'vertical',
  gap: 0,
  padding: [42, 16, 32, 16],
  width: 375,
  height: 920,
  fill: '#F4F4F4',
  clip: true,
});

header(scr2, 'Detalle del turno', 'more_vert');

scroll2 = Insert(scr2, { type: 'frame', layout: 'vertical', gap: 24, padding: [4, 0, 24, 0], width: 'fill_container' });

// -- Hero: degradado oscuro con nombre + fecha -------------------------------

hero = Insert(scroll2, {
  type: 'frame',
  layout: 'vertical',
  justifyContent: 'end',
  width: 'fill_container',
  height: 268,
  cornerRadius: 20,
  padding: 16,
  clip: true,
  fill: {
    type: 'gradient',
    gradientType: 'linear',
    enabled: true,
    rotation: 180,
    size: { height: 1 },
    colors: [
      { color: '#3A3A3A', position: 0 },
      { color: '#111111', position: 1 },
    ],
  },
});

heroCaption = Insert(hero, { type: 'frame', layout: 'horizontal', alignItems: 'center', justifyContent: 'space_between', width: 'fill_container', gap: 12 });
txt(heroCaption, 'Entrenamiento Funcional', 20, '600', '#FFFFFF', 'left');

heroMeta = Insert(heroCaption, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 8 });
levelBars = Insert(heroMeta, { type: 'frame', layout: 'horizontal', alignItems: 'end', gap: 3 });
Insert(levelBars, { type: 'rectangle', width: 6, height: 9, cornerRadius: 2, fill: '#E2223F' });
Insert(levelBars, { type: 'rectangle', width: 6, height: 6, cornerRadius: 2, fill: '#E2223F' });
Insert(levelBars, { type: 'rectangle', width: 6, height: 3, cornerRadius: 2, fill: '#8A8A8A' });
txt(heroMeta, 'Lun 14 Sep', 12, 'normal', '#FFFFFF', 'left');

// -- Cuerpo -------------------------------------------------------------------

body2 = Insert(scroll2, { type: 'frame', layout: 'vertical', gap: 24, width: 'fill_container' });

statsRow2 = Insert(body2, { type: 'frame', layout: 'horizontal', justifyContent: 'space_between', width: 'fill_container' });

stats2 = [
  { icon: 'bolt', value: '06:00', unit: 'AM', label: 'Horario' },
  { icon: 'schedule', value: '60', unit: 'min', label: 'Duración' },
  { icon: 'group', value: '4', unit: '/12', label: 'Cupos' },
];
for (s of stats2) {
  statItem = Insert(statsRow2, { type: 'frame', layout: 'horizontal', gap: 8 });
  ic(statItem, s.icon, 24, '#111111');
  statCol = Insert(statItem, { type: 'frame', layout: 'vertical', gap: 6 });
  valueRow = Insert(statCol, { type: 'frame', layout: 'horizontal', alignItems: 'end', gap: 2 });
  txt(valueRow, s.value, 16, '600', '#111111', 'left');
  txt(valueRow, s.unit, 12, 'normal', '#727272', 'left');
  txt(statCol, s.label, 12, 'normal', '#727272', 'left');
}

// -- Card de ocupación ---------------------------------------------------------

occupancy = Insert(body2, { type: 'frame', layout: 'vertical', gap: 20, width: 'fill_container', cornerRadius: 20, padding: 16, fill: '#FFFFFF' });

occTop = Insert(occupancy, { type: 'frame', layout: 'horizontal', alignItems: 'start', justifyContent: 'space_between', width: 'fill_container' });
occCol = Insert(occTop, { type: 'frame', layout: 'vertical', gap: 8 });
txt(occCol, 'Cupos ocupados', 12, 'normal', '#727272', 'left');
occValueRow = Insert(occCol, { type: 'frame', layout: 'horizontal', alignItems: 'end', gap: 2 });
txt(occValueRow, '8', 36, 'normal', '#111111', 'left');
txt(occValueRow, '/12', 20, 'normal', '#727272', 'left');

rosterPill = Insert(occTop, {
  type: 'frame',
  layout: 'vertical',
  alignItems: 'center',
  justifyContent: 'center',
  width: 105,
  height: 32,
  padding: [0, 12],
  cornerRadius: 32,
  fill: '#FFFFFF',
  stroke: '#DEDEDE',
  strokeWidth: 1,
});
txt(rosterPill, 'Ocultar', 12, 'normal', '#111111', 'center');

// Medidor: tramo lleno (66.7%, degradado) + tramo rayado (resto).
meter = Insert(occupancy, { type: 'frame', layout: 'horizontal', width: 'fill_container', height: 50, cornerRadius: 16, clip: true });

meterFill = Insert(meter, {
  type: 'frame',
  layout: 'horizontal',
  alignItems: 'center',
  justifyContent: 'end',
  width: 207,
  height: 50,
  padding: [0, 8, 0, 0],
  fill: {
    type: 'gradient',
    gradientType: 'linear',
    enabled: true,
    rotation: 0,
    size: { height: 1 },
    colors: [
      { color: '#FF4040', position: 0 },
      { color: '#C6FF40', position: 0.5 },
      { color: '#17DD42', position: 1 },
    ],
  },
});
badge = Insert(meterFill, { type: 'frame', layout: 'vertical', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, cornerRadius: 15, fill: '#FFFFFF' });
ic(badge, 'bolt', 14, '#111111');

meterEmpty = Insert(meter, {
  type: 'frame',
  layout: 'horizontal',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  width: 104,
  height: 50,
  padding: [0, 8],
  fill: '#F4F4F4',
});
hatchSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
for (h of hatchSlots) {
  Insert(meterEmpty, { type: 'rectangle', width: 2, height: 30, fill: '#DEDEDE' });
}

// -- Lista de asistentes: filas planas, sin tarjeta ni avatar ------------------

roster = Insert(body2, { type: 'frame', layout: 'vertical', gap: 20, width: 'fill_container', padding: [0, 4] });

attendees = ['Camila Restrepo', 'Andrés Gómez', 'Valentina Ríos'];
for (name of attendees) {
  row = Insert(roster, { type: 'frame', layout: 'horizontal', alignItems: 'center', gap: 12, width: 'fill_container' });
  texts = Insert(row, { type: 'frame', layout: 'vertical', gap: 4, width: 'fill_container' });
  txt(texts, name, 16, '600', '#111111', 'left');
  txt(texts, 'Confirmada', 12, 'normal', '#727272', 'left');
  ic(row, 'check_circle', 22, '#17DD42');
}

// -- CTA: blanco, texto ink, tres chevrons, borde DEDEDE -----------------------

footer2 = Insert(scr2, { type: 'frame', layout: 'vertical', gap: 10, padding: [0, 0, 8, 0], width: 'fill_container' });
cta = Insert(footer2, {
  type: 'frame',
  layout: 'horizontal',
  alignItems: 'center',
  justifyContent: 'space_between',
  width: 'fill_container',
  height: 54,
  cornerRadius: 32,
  padding: [0, 16, 0, 24],
  fill: '#FFFFFF',
  stroke: '#DEDEDE',
  strokeWidth: 1,
});
txt(cta, 'Confirmar reserva', 16, 'normal', '#111111', 'left');
ctaArrows = Insert(cta, { type: 'frame', layout: 'horizontal', alignItems: 'center' });
ic(ctaArrows, 'chevron_right', 24, '#111111');
ic(ctaArrows, 'chevron_right', 24, '#111111');
ic(ctaArrows, 'chevron_right', 24, '#111111');

// ---------------------------------------------------------------------------
// Pantalla 3 — Reserva confirmada
// ---------------------------------------------------------------------------

scr3 = Insert('s5dSr', {
  type: 'frame',
  name: 'Reserva confirmada',
  layout: 'vertical',
  alignItems: 'center',
  gap: 56,
  padding: [42, 16, 32, 16],
  width: 375,
  height: 640,
  fill: '#F4F4F4',
  clip: true,
});

heroBlock = Insert(scr3, { type: 'frame', layout: 'vertical', alignItems: 'center', gap: 32, width: 248 });
ic(heroBlock, 'check_circle', 120, '#17DD42');
titles = Insert(heroBlock, { type: 'frame', layout: 'vertical', alignItems: 'center', gap: 8, width: 'fill_container' });
txtWrap(titles, '¡Ya te agendamos!', 24, '700', '#111111', 'center', 248, 0, 1.2);
txtWrap(titles, 'Prepárate para dar lo mejor de ti.', 16, 'normal', '#727272', 'center', 248, 0, 1.3);

statsRow3 = Insert(scr3, { type: 'frame', layout: 'horizontal', gap: 24 });
stats3 = [
  { icon: 'calendar_month', label: 'Fecha', value: 'Lun 14' },
  { icon: 'schedule', label: 'Hora', value: '06:00 AM' },
  { icon: 'bolt', label: 'Duración', value: '60 min' },
];
for (s of stats3) {
  col = Insert(statsRow3, { type: 'frame', layout: 'vertical', alignItems: 'center', gap: 8, width: 98 });
  ic(col, s.icon, 24, '#111111');
  txt(col, s.label, 16, 'normal', '#727272', 'center');
  txt(col, s.value, 24, 'normal', '#111111', 'center');
}

footer3 = Insert(scr3, { type: 'frame', layout: 'horizontal', gap: 8, width: 'fill_container' });
primaryBtn = Insert(footer3, {
  type: 'frame',
  layout: 'vertical',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'fill_container',
  height: 46,
  cornerRadius: 32,
  fill: '#17DD42',
  stroke: '#111111',
  strokeWidth: 1,
});
// Verde #17DD42 con texto blanco da 2:1 — texto ink, como manda la convención.
txt(primaryBtn, 'Volver al inicio', 16, '600', '#111111', 'center');

secondaryBtn = Insert(footer3, {
  type: 'frame',
  layout: 'vertical',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'fill_container',
  height: 46,
  cornerRadius: 32,
  fill: '#FFFFFF',
  stroke: '#111111',
  strokeWidth: 1,
});
txt(secondaryBtn, 'Ver mi agenda', 16, 'normal', '#111111', 'center');

txt(scr3, 'Entrenamiento Funcional', 13, 'normal', '#727272', 'center');

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
// 1. Agendar               — 375 x 1180
// 2. Detalle del turno     — 375 x 920
// 3. Reserva confirmada    — 375 x 640
// Las tres insertadas dentro de 's5dSr' (frame "Screens" de "03 · Agendar").
