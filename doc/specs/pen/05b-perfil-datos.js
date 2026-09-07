// ============================================================================
// 05b-perfil-datos.js
// Pantallas: Editar perfil (dentro de X23ZG) · Peso, Altura,
// Fecha de nacimiento (dentro de T6CMbY).
//
// Archivo autónomo: repite la paleta y los helpers que necesita, para poder
// ejecutarse solo (no depende de 05-perfil.js).
//
// Valores sacados de:
//  - src/screens/EditProfileScreen.tsx
//  - src/screens/WeightInputScreen.tsx
//  - src/screens/HeightInputScreen.tsx
//  - src/screens/BirthdateInputScreen.tsx
//  - src/components/ui/{Screen,AppHeader,PrimaryButton}.tsx
//  - src/components/AuthField.tsx
//  - src/theme/colors.ts
//
// Contenido de ejemplo coherente con la pantalla "Perfil" ya aplicada: mismo
// usuario Alejandro Duque, 29 años, 78 kg, 178 cm, nacido el 14 mar 1997.
//
// Simplificaciones frente al código (la API de Pencil no soporta posición
// absoluta, rotación ni márgenes negativos):
//  - La insignia de cámara sobre la foto (en el código va superpuesta en la
//    esquina inferior derecha con `position:absolute`) se reproduce como una
//    fila propia justo debajo de la foto, alineada a la derecha, en vez de
//    superpuesta sobre la esquina.
//  - El puntero de la regla de Peso/Altura era un rombo (cuadrado rotado
//    45°); al no existir `rotation`, se reemplaza por una elipse con el
//    mismo degradado lima→verde, en flujo justo encima de las rayitas.
//  - La regla no reproduce el rango completo (30–200 kg / 100–250 cm) ni el
//    scroll: se muestran ~33 rayitas centradas en el valor seleccionado.
//  - La banda de selección de Fecha de nacimiento (borde degradado fijo al
//    centro, superpuesta con `position:absolute` detrás de las ruedas) se
//    reproduce sin superposición: la fila central del picker ES la caja con
//    borde degradado.
// ============================================================================

// ---- Paleta real (theme/colors.ts) ----
INK = '#111111'
SURFACE = '#F4F4F4'
WHITE = '#FFFFFF'
GRIS = '#727272'    // colors.gray400, usado en vez de #A5A5A5/#9D9D9D/#939393 sobre claro
LIMA = '#C6FF40'     // colors.accent
VERDE = '#17DD42'    // colors.accentDeep
BORDE = '#DEDEDE'
AMARILLO = '#EDB61D' // tinte del ícono "bolt" en la tarjeta oscura
GRIS_HUESO = '#787878' // pointsHint sobre fondo oscuro

GRAD_LIMA_VERDE = {type:'gradient', gradientType:'linear', enabled:true, rotation:270,
                    size:{height:1}, colors:[{color:LIMA,position:0},{color:VERDE,position:1}]}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spacer(parent, h) {
  Insert(parent, {type:'frame', name:'spacer', layout:'none', width:'fill_container', height:h})
}

function txt(parent, content, size, weight, color, align) {
  Insert(parent, {type:'text', content:content, fontFamily:'Rethink Sans', fontSize:size,
                  fontWeight:weight, fill:color, textAlign:align})
}

function txtWrap(parent, content, size, weight, color, align, width, ls, lh) {
  Insert(parent, {type:'text', content:content, fontFamily:'Rethink Sans', fontSize:size,
                  fontWeight:weight, fill:color, textAlign:align, letterSpacing:ls,
                  lineHeight:lh, textGrowth:'fixed-width', width:width})
}

// Iconos Material Symbols Rounded: van con `icon:` (y `name:` como alias) +
// `width`/`height` — nunca `size`.
function ic(parent, name, size, color) {
  Insert(parent, {type:'icon', name:name, icon:name, width:size, height:size, fill:color})
}

// Header con back, título centrado (AppHeader.tsx: alto 52, título
// 20/600/-0.2, control y spacer de 24 a cada lado para centrar).
function header(parent, title, showBack) {
  row = Insert(parent, {type:'frame', name:'Header', layout:'horizontal', alignItems:'center',
                        gap:12, width:'fill_container', height:52})
  if (showBack) {
    ic(row, 'arrow_back', 24, INK)
  } else {
    Insert(row, {type:'frame', name:'spacer', layout:'none', width:24, height:24})
  }
  titleWrap = Insert(row, {type:'frame', layout:'vertical', alignItems:'center',
                           justifyContent:'center', width:'fill_container', height:'fit_content'})
  Insert(titleWrap, {type:'text', content:title, fontFamily:'Rethink Sans', fontSize:20,
                      fontWeight:'600', letterSpacing:-0.2, fill:INK, textAlign:'center'})
  Insert(row, {type:'frame', name:'spacer', layout:'none', width:24, height:24})
}

// Campo de formulario (AuthField.tsx): label + caja con icono + valor.
// disabled=true reproduce el campo de correo, bloqueado (opacity 0.55 real).
function authField(parent, label, iconName, value, disabled) {
  wrap = Insert(parent, {type:'frame', layout:'vertical', gap:8, width:'fill_container', height:'fit_content'})
  Insert(wrap, {type:'text', content:label, fontFamily:'Rethink Sans', fontSize:13,
                fontWeight:'600', letterSpacing:0.2, fill:INK})
  fieldFill = SURFACE
  iconColor = GRIS
  textColor = INK
  if (disabled) {
    fieldFill = '#E4E4E4' // aprox. de SURFACE con opacity:0.55 (fieldDisabled) sobre fondo blanco
    iconColor = '#9A9A9A'
    textColor = '#5C5C5C'
  }
  field = Insert(wrap, {type:'frame', layout:'horizontal', alignItems:'center', gap:12, height:58,
                        padding:[0,16,0,16], cornerRadius:14, stroke:fieldFill, strokeWidth:1.5,
                        fill:fieldFill, width:'fill_container'})
  ic(field, iconName, 20, iconColor)
  txtWrap(field, value, 16, 'normal', textColor, 'left', 'fill_container', 0, 1)
}

// MetricTile de Editar perfil (Edad/Peso/Altura con lápiz de edición,
// cada uno navega a su propia pantalla de dato).
function tile(parent, label, value, unit) {
  t = Insert(parent, {type:'frame', layout:'vertical', gap:8, width:'fill_container', height:'fit_content'})
  head = Insert(t, {type:'frame', layout:'horizontal', justifyContent:'space_between',
                    alignItems:'center', width:'fill_container', height:'fit_content'})
  txt(head, label, 12, 'normal', GRIS, 'left')
  ic(head, 'edit', 11, GRIS)
  vr = Insert(t, {type:'frame', layout:'horizontal', gap:4, alignItems:'end',
                  width:'fit_content', height:'fit_content'})
  txt(vr, value, 32, '600', INK, 'left')
  txt(vr, unit, 12, 'normal', GRIS, 'left')
}

// Una rayita de la regla de Peso/Altura. kind: 0 normal, 1 media (x5), 2 mayor (x10).
function tick(parent, kind) {
  h = 10
  c = GRIS
  if (kind == 1) {
    h = 13
  }
  if (kind == 2) {
    h = 16
    c = INK
  }
  Insert(parent, {type:'rectangle', width:4, height:h, cornerRadius:2, fill:c})
}

// Regla horizontal de rayitas + puntero (aprox. sin overlay, ver nota arriba).
function ruler(parent, offsets, centerValue) {
  track = Insert(parent, {type:'frame', layout:'vertical', alignItems:'center', gap:4,
                          padding:[4,0,0,0], width:'fill_container', height:60})
  Insert(track, {type:'ellipse', width:20, height:20, fill:GRAD_LIMA_VERDE})
  row = Insert(track, {type:'frame', layout:'horizontal', alignItems:'end', gap:6,
                       width:'fit_content', height:16})
  for (o of offsets) {
    v = centerValue + o
    k = 0
    if (v % 5 == 0) {
      k = 1
    }
    if (v % 10 == 0) {
      k = 2
    }
    tick(row, k)
  }
}

// Tira de 5 números con el central resaltado en caja de borde degradado.
function numbersRow(parent, centerValue) {
  row = Insert(parent, {type:'frame', layout:'horizontal', gap:9, alignItems:'center',
                        width:'fit_content', height:74})
  txt(row, '' + (centerValue - 2), 32, 'normal', INK, 'left')
  Insert(row, {type:'text', content:'' + (centerValue - 1), fontFamily:'Rethink Sans', fontSize:48,
                fontWeight:'normal', letterSpacing:-0.48, fill:INK})
  boxWrap = Insert(row, {type:'frame', layout:'vertical', justifyContent:'center',
                        width:'fit_content', height:74})
  box = Insert(boxWrap, {type:'frame', layout:'vertical', width:110, height:74, padding:1,
                        fill:GRAD_LIMA_VERDE})
  inner = Insert(box, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                        width:'fill_container', height:'fill_container', padding:[0,7,0,7], fill:WHITE})
  Insert(inner, {type:'text', content:'' + centerValue, fontFamily:'Rethink Sans', fontSize:64,
                fontWeight:'600', lineHeight:1, letterSpacing:-2.56, fill:INK})
  Insert(row, {type:'text', content:'' + (centerValue + 1), fontFamily:'Rethink Sans', fontSize:48,
                fontWeight:'normal', letterSpacing:-0.48, fill:INK})
  txt(row, '' + (centerValue + 2), 32, 'normal', INK, 'left')
}

// Celda de una rueda de Fecha de nacimiento. state: 0 base, 1 vecina, 2 seleccionada.
// Los valores lejanos son más chicos (15/20/26) — no hay diferencia de
// opacidad ni de color en el código real, solo tamaño y peso.
function wheelCell(parent, content, state, colWidth) {
  size = 15
  weight = 'normal'
  ls = 0
  if (state == 1) {
    size = 20
    ls = -0.2
  }
  if (state == 2) {
    size = 26
    weight = '600'
    ls = -1
  }
  Insert(parent, {type:'text', content:content, fontFamily:'Rethink Sans', fontSize:size,
                  fontWeight:weight, letterSpacing:ls, fill:INK, textAlign:'center',
                  textGrowth:'fixed-width', width:colWidth})
}

// Offsets para las ~33 rayitas visibles de la regla (Peso/Altura).
RULER_OFFSETS = [-16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,
                 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]

// ============================================================================
// PANTALLA: Editar perfil  (contenedor X23ZG)
// EditProfileScreen.tsx: scroll paddingHorizontal 20 / paddingBottom 24 /
// gap 12 real entre tarjetas.
// ============================================================================
scr1 = Insert('X23ZG', {type:'frame', name:'Editar perfil', layout:'vertical', gap:12,
                         padding:[42,16,32,16], width:375, height:1240,
                         fill:SURFACE, clip:true})

header(scr1, 'Editar perfil', true)

// --- Tarjeta lima: foto centrada + insignia de cámara debajo, a la derecha ---
card1 = Insert(scr1, {type:'frame', name:'Foto', layout:'vertical', gap:8, alignItems:'center',
                       justifyContent:'center', width:'fill_container', height:'fit_content',
                       cornerRadius:20, fill:LIMA, clip:true, padding:[0,0,8,0]})
photo1 = Insert(card1, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                         width:200, height:200, fill:INK})
txt(photo1, 'AD', 48, '700', WHITE, 'center')
badgeRow1 = Insert(card1, {type:'frame', layout:'horizontal', justifyContent:'end', width:200, height:'fit_content'})
badge1 = Insert(badgeRow1, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                            width:32, height:32, cornerRadius:16, fill:INK, stroke:LIMA, strokeWidth:3})
ic(badge1, 'photo_camera', 14, WHITE)

// --- Tarjeta oscura: Membresía / días restantes ---
pts1 = Insert(scr1, {type:'frame', name:'Membresía', layout:'vertical', alignItems:'center',
                      justifyContent:'center', gap:8, padding:16, height:118, cornerRadius:20,
                      fill:INK, width:'fill_container', clip:true})
txt(pts1, 'Membresía', 16, 'normal', WHITE, 'center')
ptsRow1 = Insert(pts1, {type:'frame', layout:'horizontal', gap:8, alignItems:'center',
                        width:'fit_content', height:'fit_content'})
ic(ptsRow1, 'bolt', 22, AMARILLO)
txt(ptsRow1, '128', 24, '600', WHITE, 'left')
txt(pts1, 'días restantes', 12, 'normal', GRIS_HUESO, 'center')

// --- Tarjeta blanca: Datos personales ---
info1 = Insert(scr1, {type:'frame', name:'Datos personales', layout:'vertical', gap:16, padding:16,
                       cornerRadius:20, fill:WHITE, width:'fill_container', height:'fit_content'})
infoTop1 = Insert(info1, {type:'frame', layout:'horizontal', gap:8, alignItems:'center',
                          width:'fit_content', height:'fit_content'})
iconBtn1 = Insert(infoTop1, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                             width:40, height:40, cornerRadius:32, fill:SURFACE, stroke:BORDE, strokeWidth:1})
ic(iconBtn1, 'person', 20, GRIS)
txt(infoTop1, 'Datos personales', 16, '600', INK, 'left')
form1 = Insert(info1, {type:'frame', layout:'vertical', gap:18, width:'fill_container', height:'fit_content'})
authField(form1, 'Nombre', 'person', 'Alejandro', false)
authField(form1, 'Apellido', 'person', 'Duque', false)
tiles1 = Insert(info1, {type:'frame', layout:'horizontal', gap:10, width:'fill_container', height:'fit_content'})
tile(tiles1, 'Edad', '29', 'años')   // → BirthdateInput
tile(tiles1, 'Peso', '78', 'Kg')     // → WeightInput
tile(tiles1, 'Altura', '178', 'Cm')  // → HeightInput

// --- Tarjeta blanca: contacto (correo bloqueado, es el usuario de acceso) ---
contact1 = Insert(scr1, {type:'frame', name:'Contacto', layout:'vertical', gap:18, padding:16,
                          cornerRadius:20, fill:WHITE, width:'fill_container', height:'fit_content'})
authField(contact1, 'Correo electrónico', 'mail', 'alejandro.duque@example.com', true)
authField(contact1, 'Teléfono', 'call', '+57 300 456 7890', false)
txtWrap(contact1, 'El correo es tu usuario de acceso y lo gestiona Neural. Escríbenos si necesitas cambiarlo.',
        13, 'normal', GRIS, 'left', 'fill_container', 0, 1.38)

// --- Guardar ---
save1 = Insert(scr1, {type:'frame', name:'Guardar', layout:'horizontal', alignItems:'center',
                      justifyContent:'center', height:56, cornerRadius:28, fill:INK, width:'fill_container'})
txt(save1, 'Guardar', 17, '600', WHITE, 'center')

// ============================================================================
// PANTALLA: Peso  (contenedor T6CMbY)
// WeightInputScreen.tsx: MIN_WEIGHT 30, MAX_WEIGHT 200; TICK_WIDTH 10;
// header compartido "Datos corporales" con Altura y Fecha de nacimiento.
// ============================================================================
scr2 = Insert('T6CMbY', {type:'frame', name:'Peso', layout:'vertical', gap:24,
                          padding:[42,16,32,16], width:375, height:600,
                          fill:SURFACE, clip:true})

header(scr2, 'Datos corporales', true)

head2 = Insert(scr2, {type:'frame', layout:'vertical', gap:8, alignItems:'center',
                       width:'fill_container', height:'fit_content'})
txtWrap(head2, '¿Cuál es\ntu peso?', 36, '600', INK, 'center', 'fill_container', -1.08, 1.19)
txtWrap(head2, 'Ingresa tu peso actual para seguir tu progreso.', 12, 'normal', GRIS, 'center', 260, 0, 1.42)

stage2 = Insert(scr2, {type:'frame', layout:'vertical', gap:32, alignItems:'center',
                        width:'fill_container', height:'fit_content'})
selectBlock2 = Insert(stage2, {type:'frame', layout:'vertical', gap:4, alignItems:'center',
                                width:'fill_container', height:'fit_content'})
ruler(selectBlock2, RULER_OFFSETS, 78)
numbersRow(selectBlock2, 78)
txt(stage2, '+2 kg respecto a tu último registro.', 13, 'normal', GRIS, 'center')

footer2 = Insert(scr2, {type:'frame', layout:'vertical', gap:14, padding:[8,0,0,0],
                         width:'fill_container', height:'fit_content'})
btn2 = Insert(footer2, {type:'frame', layout:'horizontal', alignItems:'center', justifyContent:'center',
                        height:56, cornerRadius:28, fill:INK, width:'fill_container'})
txt(btn2, 'Guardar', 17, '600', WHITE, 'center')

// ============================================================================
// PANTALLA: Altura  (contenedor T6CMbY)
// HeightInputScreen.tsx: MIN_HEIGHT 100, MAX_HEIGHT 250; mismo StyleSheet
// que Peso (regla, caja central, botón).
// ============================================================================
scr3 = Insert('T6CMbY', {type:'frame', name:'Altura', layout:'vertical', gap:24,
                          padding:[42,16,32,16], width:375, height:600,
                          fill:SURFACE, clip:true})

header(scr3, 'Datos corporales', true)

head3 = Insert(scr3, {type:'frame', layout:'vertical', gap:8, alignItems:'center',
                       width:'fill_container', height:'fit_content'})
txtWrap(head3, '¿Cuál es\ntu altura?', 36, '600', INK, 'center', 'fill_container', -1.08, 1.19)
txtWrap(head3, 'Ingresa tu altura para calcular tus métricas.', 12, 'normal', GRIS, 'center', 260, 0, 1.42)

stage3 = Insert(scr3, {type:'frame', layout:'vertical', gap:32, alignItems:'center',
                        width:'fill_container', height:'fit_content'})
selectBlock3 = Insert(stage3, {type:'frame', layout:'vertical', gap:4, alignItems:'center',
                                width:'fill_container', height:'fit_content'})
ruler(selectBlock3, RULER_OFFSETS, 178)
numbersRow(selectBlock3, 178)
txt(stage3, 'Equivale a 1,78 m. Tenías 176 cm registrados.', 13, 'normal', GRIS, 'center')

footer3 = Insert(scr3, {type:'frame', layout:'vertical', gap:14, padding:[8,0,0,0],
                         width:'fill_container', height:'fit_content'})
btn3 = Insert(footer3, {type:'frame', layout:'horizontal', alignItems:'center', justifyContent:'center',
                        height:56, cornerRadius:28, fill:INK, width:'fill_container'})
txt(btn3, 'Guardar', 17, '600', WHITE, 'center')

// ============================================================================
// PANTALLA: Fecha de nacimiento  (contenedor T6CMbY)
// BirthdateInputScreen.tsx: ITEM_HEIGHT 44, VISIBLE_ITEMS 5 → picker 220 alto;
// columnas DÍA 76 / MES 104 / AÑO 104 → banda 284 de ancho.
// ============================================================================
scr4 = Insert('T6CMbY', {type:'frame', name:'Fecha de nacimiento', layout:'vertical', gap:24,
                          padding:[42,16,32,16], width:375, height:700,
                          fill:SURFACE, clip:true})

header(scr4, 'Datos corporales', true)

head4 = Insert(scr4, {type:'frame', layout:'vertical', gap:8, alignItems:'center',
                       width:'fill_container', height:'fit_content'})
txtWrap(head4, '¿Cuál es tu\nfecha de nacimiento?', 36, '600', INK, 'center', 'fill_container', -1.08, 1.19)
txtWrap(head4, 'Cuéntanos tu fecha de nacimiento para personalizar tus entrenamientos.',
        12, 'normal', GRIS, 'center', 260, 0, 1.42)

stage4 = Insert(scr4, {type:'frame', layout:'vertical', gap:32, alignItems:'center',
                        width:'fill_container', height:'fit_content'})
wheels4 = Insert(stage4, {type:'frame', layout:'vertical', gap:8, alignItems:'center',
                          width:'fit_content', height:'fit_content'})

labels4 = Insert(wheels4, {type:'frame', layout:'horizontal', width:'fit_content', height:'fit_content'})
Insert(labels4, {type:'text', content:'DÍA', fontFamily:'Rethink Sans', fontSize:10, fontWeight:'700',
                 letterSpacing:1.2, fill:GRIS, width:76, textAlign:'center', textGrowth:'fixed-width'})
Insert(labels4, {type:'text', content:'MES', fontFamily:'Rethink Sans', fontSize:10, fontWeight:'700',
                 letterSpacing:1.2, fill:GRIS, width:104, textAlign:'center', textGrowth:'fixed-width'})
Insert(labels4, {type:'text', content:'AÑO', fontFamily:'Rethink Sans', fontSize:10, fontWeight:'700',
                 letterSpacing:1.2, fill:GRIS, width:104, textAlign:'center', textGrowth:'fixed-width'})

// Ejemplo: 14 mar 1997 (29 años el 06-sep-2026), seleccionado en la fila central.
// Los valores lejanos (fila 0 y 4) son más chicos: jerarquía por tamaño/peso,
// no por opacidad — así es en el código real.
grid4 = Insert(wheels4, {type:'frame', layout:'vertical', width:284, height:220})

row0 = Insert(grid4, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container', height:44})
wheelCell(row0, '12', 0, 76)
wheelCell(row0, 'Ene', 0, 104)
wheelCell(row0, '1995', 0, 104)

row1 = Insert(grid4, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container', height:44})
wheelCell(row1, '13', 1, 76)
wheelCell(row1, 'Feb', 1, 104)
wheelCell(row1, '1996', 1, 104)

// Fila seleccionada: la banda de selección ES la caja con borde degradado.
band4 = Insert(grid4, {type:'frame', width:284, height:44, cornerRadius:14, padding:1, fill:GRAD_LIMA_VERDE})
bandInner4 = Insert(band4, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container',
                            height:'fill_container', cornerRadius:13, fill:SURFACE})
wheelCell(bandInner4, '14', 2, 76)
wheelCell(bandInner4, 'Mar', 2, 104)
wheelCell(bandInner4, '1997', 2, 104)

row3 = Insert(grid4, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container', height:44})
wheelCell(row3, '15', 1, 76)
wheelCell(row3, 'Abr', 1, 104)
wheelCell(row3, '1998', 1, 104)

row4 = Insert(grid4, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container', height:44})
wheelCell(row4, '16', 0, 76)
wheelCell(row4, 'May', 0, 104)
wheelCell(row4, '1999', 0, 104)

txt(stage4, '29 años', 13, 'normal', GRIS, 'center')

footer4 = Insert(scr4, {type:'frame', layout:'vertical', gap:14, padding:[8,0,0,0],
                         width:'fill_container', height:'fit_content'})
btn4 = Insert(footer4, {type:'frame', layout:'horizontal', alignItems:'center', justifyContent:'center',
                        height:56, cornerRadius:28, fill:INK, width:'fill_container'})
txt(btn4, 'Guardar', 17, '600', WHITE, 'center')

// ============================================================================
// RESUMEN — pantallas creadas y alto (calculado a mano sumando padding +
// gaps + contenido, con margen de seguridad; Pencil puede necesitar un
// ajuste fino una vez mida el texto real):
//
//  1) Editar perfil        → contenedor X23ZG    · 375 x 1240
//  2) Peso                 → contenedor T6CMbY   · 375 x 600
//  3) Altura               → contenedor T6CMbY   · 375 x 600
//  4) Fecha de nacimiento  → contenedor T6CMbY   · 375 x 700
// ============================================================================
