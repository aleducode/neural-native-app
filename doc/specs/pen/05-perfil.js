// ============================================================================
// 05-perfil.js
// Pantallas: Perfil, Editar perfil (dentro de X23ZG) · Peso, Altura,
// Fecha de nacimiento (dentro de T6CMbY).
//
// Valores sacados de:
//  - src/screens/ProfileScreen.tsx
//  - src/screens/EditProfileScreen.tsx
//  - src/screens/WeightInputScreen.tsx
//  - src/screens/HeightInputScreen.tsx
//  - src/screens/BirthdateInputScreen.tsx
//  - src/components/ui/{Screen,AppHeader,Card,PrimaryButton}.tsx
//  - src/components/AuthField.tsx
//  - src/theme/colors.ts
//
// Contenido de ejemplo en español de Colombia, coherente entre las cinco
// pantallas (mismo usuario "Alejandro Duque", 29 años, 78 kg, 178 cm,
// nacido el 14 mar 1997, mismo plan "Plan Premium Anual").
//
// Simplificaciones frente al código (la API de Pencil no soporta posición
// absoluta, rotación ni márgenes negativos):
//  - Se omiten los blobs decorativos de la tarjeta lima y de la tarjeta de
//    "días restantes" (elipses `position:absolute` translúcidas, puramente
//    de textura) y la insignia de cámara sobre la foto (también absoluta).
//  - El puntero de la regla de Peso/Altura era un rombo (cuadrado rotado
//    45°); al no existir `rotation`, se reemplaza por una elipse con el
//    mismo degradado lima→verde, colocada en flujo justo encima de las
//    rayitas en vez de superpuesta.
//  - La regla no reproduce el rango completo (30–200 kg / 100–250 cm) ni el
//    scroll: se muestran ~33 rayitas centradas en el valor seleccionado,
//    suficientes para leer el patrón normal/media/mayor.
//  - La banda de selección de Fecha de nacimiento (borde degradado fijo al
//    centro, `position:absolute` detrás de las ruedas) se reproduce sin
//    superposición: la fila central del picker ES la caja con borde
//    degradado, en vez de una capa aparte por debajo.
//  - El switch "Aparecer en la tabla" no es un tipo nativo de Pencil: se arma
//    con un frame-pastilla (track) + una elipse (thumb) en estado "on".
//  - El botón "Cerrar sesión" (variant="danger": `backgroundColor:
//    rgba(255,77,77,0.10)`) usa el sólido más cercano sobre blanco (#FFEDED)
//    ya que Pencil no admite alpha en fill.
// ============================================================================

// ---- Paleta real (theme/colors.ts) ----
INK = '#111111'
SURFACE = '#F4F4F4'
WHITE = '#FFFFFF'
GRIS = '#727272'        // colors.gray400, usado en vez de #A5A5A5/#9D9D9D/#939393 sobre claro
GRIS_ICONO = '#A5A5A5'  // colors.iconMuted — permitido SOLO sobre #111111 (statBox)
LIMA = '#C6FF40'         // colors.accent
VERDE = '#17DD42'        // colors.accentDeep
BORDE = '#DEDEDE'
ERROR = '#FF4D4D'
NEGRO = '#000000'        // colors.pureBlack
AMARILLO = '#EDB61D'     // tinte del ícono "bolt" en las tarjetas oscuras
GRIS_HUESO = '#787878'   // pointsHint sobre fondo oscuro
DIVISOR_OSCURO = '#424242' // borde entre filas del statBox (sobre #111111)
DANGER_BG = '#FFEDED'    // aprox. sólida de rgba(255,77,77,0.10), PrimaryButton variant="danger"

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

function ic(parent, name, size, color) {
  Insert(parent, {type:'icon', name:name, icon:name, width:size, height:size, fill:color})
}

function divider(parent, color) {
  Insert(parent, {type:'rectangle', width:'fill_container', height:1, fill:color})
}

// Header con back opcional, título centrado (AppHeader.tsx: alto 52,
// título 20/600/-0.2, control y spacer de 24 a cada lado para centrar).
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

// Fila del menú CUENTA: icono circular 40, título/subtítulo, chevron.
function menuRow(parent, iconName, title, subtitle) {
  row = Insert(parent, {type:'frame', name:'Fila', layout:'horizontal', alignItems:'center', gap:14,
                        padding:[14,16,14,16], width:'fill_container', height:'fit_content'})
  box = Insert(row, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                      width:40, height:40, cornerRadius:20, fill:SURFACE})
  ic(box, iconName, 18, INK)
  col = Insert(row, {type:'frame', layout:'vertical', gap:2, width:'fill_container', height:'fit_content'})
  txt(col, title, 16, '600', INK, 'left')
  txtWrap(col, subtitle, 13, 'normal', GRIS, 'left', 'fill_container', 0, 1.3)
  ic(row, 'chevron_right', 20, GRIS)
}

// Última fila del menú CUENTA: mismo layout, pero termina en switch (on).
function toggleRow(parent, iconName, title, subtitle) {
  row = Insert(parent, {type:'frame', name:'Fila', layout:'horizontal', alignItems:'center', gap:14,
                        padding:[14,16,14,16], width:'fill_container', height:'fit_content'})
  box = Insert(row, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                      width:40, height:40, cornerRadius:20, fill:SURFACE})
  ic(box, iconName, 18, INK)
  col = Insert(row, {type:'frame', layout:'vertical', gap:2, width:'fill_container', height:'fit_content'})
  txt(col, title, 16, '600', INK, 'left')
  txtWrap(col, subtitle, 13, 'normal', GRIS, 'left', 'fill_container', 0, 1.3)
  track = Insert(row, {type:'frame', layout:'horizontal', alignItems:'center', justifyContent:'end',
                        width:36, height:20, cornerRadius:10, padding:2, fill:VERDE})
  Insert(track, {type:'ellipse', width:16, height:16, fill:WHITE})
}

// Fila Edad/Peso/Altura dentro de la caja oscura del Perfil (statBox).
function statRow(parent, label, value, unit, isLast) {
  row = Insert(parent, {type:'frame', layout:'horizontal', justifyContent:'space_between',
                        alignItems:'center', width:'fill_container', height:'fit_content'})
  txt(row, label, 12, 'normal', GRIS_ICONO, 'left')
  vr = Insert(row, {type:'frame', layout:'horizontal', gap:2, alignItems:'end',
                    width:'fit_content', height:'fit_content'})
  txt(vr, value, 16, '600', WHITE, 'left')
  txt(vr, unit, 12, 'normal', GRIS_ICONO, 'left')
  if (!isLast) {
    divider(parent, DIVISOR_OSCURO)
  }
}

// Media tarjeta blanca (Calorías / Racha).
function halfCard(parent, title, value, unit, sub) {
  card = Insert(parent, {type:'frame', layout:'vertical', gap:8, padding:16, cornerRadius:20,
                        fill:WHITE, width:'fill_container', height:'fit_content'})
  txt(card, title, 16, '600', INK, 'left')
  vr = Insert(card, {type:'frame', layout:'horizontal', gap:4, alignItems:'end',
                    width:'fit_content', height:'fit_content'})
  txt(vr, value, 24, '600', INK, 'left')
  txt(vr, unit, 12, 'normal', GRIS, 'left')
  txt(card, sub, 12, 'normal', GRIS, 'left')
}

// Campo de formulario (AuthField.tsx): label + caja con icono + valor.
function authField(parent, label, iconName, value) {
  wrap = Insert(parent, {type:'frame', layout:'vertical', gap:8, width:'fill_container', height:'fit_content'})
  Insert(wrap, {type:'text', content:label, fontFamily:'Rethink Sans', fontSize:13,
                fontWeight:'600', letterSpacing:0.2, fill:INK})
  field = Insert(wrap, {type:'frame', layout:'horizontal', alignItems:'center', gap:12, height:58,
                        padding:[0,16,0,16], cornerRadius:14, stroke:SURFACE, strokeWidth:1.5,
                        fill:SURFACE, width:'fill_container'})
  ic(field, iconName, 20, GRIS)
  txtWrap(field, value, 16, 'normal', INK, 'left', 'fill_container', 0, 1)
}

// MetricTile de Editar perfil (Edad/Peso/Altura con lápiz de edición).
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
// PANTALLA: Perfil  (contenedor X23ZG)
// ProfileScreen.tsx: scroll paddingHorizontal 16 / paddingTop 8 / gap 24
// (gap real entre el bloque "identity" y el bloque "body"); dentro de cada
// bloque, el espaciado sale del marginTop/marginBottom propio de cada tarjeta.
// ============================================================================
scr1 = Insert('X23ZG', {type:'frame', name:'Perfil', layout:'vertical', gap:0,
                         padding:[42,16,32,16], width:375, height:1320,
                         fill:SURFACE, clip:true})

header(scr1, 'Perfil', false)
spacer(scr1, 8) // scroll.paddingTop: 8

// --- Tarjeta lima: foto + caja oscura Edad/Peso/Altura ---
card1 = Insert(scr1, {type:'frame', name:'Tarjeta perfil', layout:'horizontal', gap:16,
                       width:'fill_container', height:200, cornerRadius:20, fill:LIMA, clip:true})
photo1 = Insert(card1, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                         width:162, height:200, fill:INK})
txt(photo1, 'AD', 40, '700', WHITE, 'center')
info1 = Insert(card1, {type:'frame', layout:'vertical', gap:16, justifyContent:'center',
                        width:'fill_container', height:'fit_content', padding:[0,16,0,0]})
txt(info1, 'Alejandro Duque', 20, '600', INK, 'left')
statBox = Insert(info1, {type:'frame', name:'Datos corporales', layout:'vertical', gap:8, padding:12,
                          cornerRadius:16, fill:INK, width:'fill_container', height:'fit_content'})
statRow(statBox, 'Edad', '29', 'años', false)
statRow(statBox, 'Peso', '78', 'Kg', false)
statRow(statBox, 'Altura', '178', 'cm', true)

spacer(scr1, 48) // scroll.gap (24, identity→body) + membershipCard.marginTop (24)

// --- Tarjeta de membresía ---
mem1 = Insert(scr1, {type:'frame', name:'Membresía', layout:'vertical', gap:8, padding:16,
                      cornerRadius:20, fill:WHITE, width:'fill_container', height:'fit_content'})
memTop1 = Insert(mem1, {type:'frame', layout:'horizontal', justifyContent:'space_between',
                        alignItems:'center', width:'fill_container', height:'fit_content'})
txt(memTop1, 'Membresía', 12, '600', NEGRO, 'left')
txt(memTop1, 'Activa', 12, '600', VERDE, 'left')
txt(mem1, 'Plan Premium Anual', 16, '600', INK, 'left')

spacer(scr1, 12) // pointsCard.marginTop: 12

// --- Tarjeta oscura: días restantes ---
pts1 = Insert(scr1, {type:'frame', name:'Días restantes', layout:'vertical', alignItems:'center',
                      justifyContent:'center', gap:8, padding:16, height:118, cornerRadius:20,
                      fill:INK, width:'fill_container', clip:true})
txt(pts1, 'Tu membresía', 16, 'normal', WHITE, 'center')
ptsRow1 = Insert(pts1, {type:'frame', layout:'horizontal', gap:8, alignItems:'center',
                        width:'fit_content', height:'fit_content'})
ic(ptsRow1, 'bolt', 22, AMARILLO)
txt(ptsRow1, '128', 24, '600', WHITE, 'left')
txt(pts1, 'días restantes', 12, 'normal', GRIS_HUESO, 'center')

spacer(scr1, 24) // sectionLabel.marginTop: 24

Insert(scr1, {type:'text', content:'ACTIVIDAD RECIENTE', fontFamily:'Rethink Sans', fontSize:11,
              fontWeight:'700', letterSpacing:1.2, fill:GRIS})

spacer(scr1, 22) // sectionLabel.marginBottom (10) + stepsCard.marginTop (12)

// --- Tarjeta Entrenos ---
steps1 = Insert(scr1, {type:'frame', name:'Entrenos', layout:'vertical', gap:20, padding:16,
                        cornerRadius:20, fill:WHITE, width:'fill_container', height:'fit_content'})
stepsTop1 = Insert(steps1, {type:'frame', layout:'horizontal', justifyContent:'space_between',
                            alignItems:'center', width:'fill_container', height:'fit_content'})
stepsTitleWrap1 = Insert(stepsTop1, {type:'frame', layout:'horizontal', gap:8, alignItems:'center',
                                     width:'fit_content', height:'fit_content'})
iconBtn1 = Insert(stepsTitleWrap1, {type:'frame', layout:'vertical', alignItems:'center',
                                    justifyContent:'center', width:40, height:40, cornerRadius:32,
                                    fill:SURFACE, stroke:BORDE, strokeWidth:1})
ic(iconBtn1, 'monitor_heart', 24, VERDE)
txt(stepsTitleWrap1, 'Entrenos', 16, '600', INK, 'left')
seeAll1 = Insert(stepsTop1, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                             padding:[8,16,8,16], cornerRadius:32, fill:WHITE,
                             width:'fit_content', height:'fit_content'})
txt(seeAll1, 'Ver todo', 12, 'normal', INK, 'left')
stepsBottom1 = Insert(steps1, {type:'frame', layout:'horizontal', justifyContent:'space_between',
                               alignItems:'end', width:'fill_container', height:'fit_content'})
stepsValueRow1 = Insert(stepsBottom1, {type:'frame', layout:'horizontal', gap:4, alignItems:'end',
                                       width:'fit_content', height:'fit_content'})
txt(stepsValueRow1, '18', 24, '600', INK, 'left')
txt(stepsValueRow1, 'entrenos', 12, 'normal', GRIS, 'left')
stepsSubRow1 = Insert(stepsBottom1, {type:'frame', layout:'horizontal', gap:8, alignItems:'center',
                                     width:'fit_content', height:'fit_content'})
txt(stepsSubRow1, 'este mes', 12, 'normal', GRIS, 'left')
Insert(stepsSubRow1, {type:'ellipse', width:3, height:3, fill:GRIS})
txt(stepsSubRow1, '14 h', 12, 'normal', GRIS, 'left')

spacer(scr1, 8) // halfRow.marginTop: 8

// --- Calorías / Racha ---
halfRow1 = Insert(scr1, {type:'frame', name:'Calorías y racha', layout:'horizontal', gap:8,
                         width:'fill_container', height:'fit_content'})
halfCard(halfRow1, 'Calorías', '6.420', 'kcal', 'este mes · promedio')
halfCard(halfRow1, 'Racha', '6', 'sem', 'seguidas')

spacer(scr1, 24) // sectionLabel.marginTop: 24

Insert(scr1, {type:'text', content:'CUENTA', fontFamily:'Rethink Sans', fontSize:11,
              fontWeight:'700', letterSpacing:1.2, fill:GRIS})

spacer(scr1, 10) // sectionLabel.marginBottom: 10

// --- Menú CUENTA ---
menu1 = Insert(scr1, {type:'frame', name:'Menú cuenta', layout:'vertical', width:'fill_container',
                       height:'fit_content', fill:WHITE, cornerRadius:20, clip:true})
menuRow(menu1, 'person', 'Editar perfil', 'Información personal')
divider(menu1, SURFACE)
menuRow(menu1, 'bar_chart', 'Historial de peso', 'Tu progreso corporal')
divider(menu1, SURFACE)
menuRow(menu1, 'notifications', 'Notificaciones', 'Tus avisos y novedades')
divider(menu1, SURFACE)
toggleRow(menu1, 'group', 'Aparecer en la tabla', 'Compartís tu posición con la comunidad')

spacer(scr1, 24) // logout.marginTop: 24

// --- Cerrar sesión (PrimaryButton variant="danger") ---
logout1 = Insert(scr1, {type:'frame', name:'Cerrar sesión', layout:'horizontal', gap:10,
                        alignItems:'center', justifyContent:'center', height:56, cornerRadius:28,
                        fill:DANGER_BG, width:'fill_container'})
Insert(logout1, {type:'text', content:'Cerrar sesión', fontFamily:'Rethink Sans', fontSize:17,
                 fontWeight:'600', letterSpacing:0.2, fill:ERROR})
ic(logout1, 'logout', 18, ERROR)

// ============================================================================
// PANTALLA: Editar perfil  (contenedor X23ZG)
// EditProfileScreen.tsx: scroll paddingHorizontal 20 / paddingBottom 24 /
// gap 12 real entre tarjetas (a diferencia de Perfil, aquí sí hay un único
// valor de gap consistente entre todas las tarjetas y el botón).
// ============================================================================
scr2 = Insert('X23ZG', {type:'frame', name:'Editar perfil', layout:'vertical', gap:12,
                         padding:[42,16,32,16], width:375, height:1200,
                         fill:SURFACE, clip:true})

header(scr2, 'Editar perfil', true)

// --- Tarjeta lima: foto centrada (sin nombre ni stat box aquí) ---
card2 = Insert(scr2, {type:'frame', name:'Foto', layout:'vertical', alignItems:'center',
                       justifyContent:'center', width:'fill_container', height:200,
                       cornerRadius:20, fill:LIMA, clip:true})
photo2 = Insert(card2, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                         width:200, height:200, fill:INK})
txt(photo2, 'AD', 48, '700', WHITE, 'center')

// --- Tarjeta oscura: Membresía / días restantes ---
pts2 = Insert(scr2, {type:'frame', name:'Membresía', layout:'vertical', alignItems:'center',
                      justifyContent:'center', gap:8, padding:16, height:118, cornerRadius:20,
                      fill:INK, width:'fill_container', clip:true})
txt(pts2, 'Membresía', 16, 'normal', WHITE, 'center')
ptsRow2 = Insert(pts2, {type:'frame', layout:'horizontal', gap:8, alignItems:'center',
                        width:'fit_content', height:'fit_content'})
ic(ptsRow2, 'bolt', 22, AMARILLO)
txt(ptsRow2, '128', 24, '600', WHITE, 'left')
txt(pts2, 'días restantes', 12, 'normal', GRIS_HUESO, 'center')

// --- Tarjeta blanca: Datos personales ---
info2 = Insert(scr2, {type:'frame', name:'Datos personales', layout:'vertical', gap:16, padding:16,
                       cornerRadius:20, fill:WHITE, width:'fill_container', height:'fit_content'})
infoTop2 = Insert(info2, {type:'frame', layout:'horizontal', gap:8, alignItems:'center',
                          width:'fit_content', height:'fit_content'})
iconBtn2 = Insert(infoTop2, {type:'frame', layout:'vertical', alignItems:'center', justifyContent:'center',
                             width:40, height:40, cornerRadius:32, fill:SURFACE, stroke:BORDE, strokeWidth:1})
ic(iconBtn2, 'person', 20, GRIS)
txt(infoTop2, 'Datos personales', 16, '600', INK, 'left')
form2 = Insert(info2, {type:'frame', layout:'vertical', gap:18, width:'fill_container', height:'fit_content'})
authField(form2, 'Nombre', 'person', 'Alejandro')
authField(form2, 'Apellido', 'person', 'Duque')
tiles2 = Insert(info2, {type:'frame', layout:'horizontal', gap:10, width:'fill_container', height:'fit_content'})
tile(tiles2, 'Edad', '29', 'años')
tile(tiles2, 'Peso', '78', 'Kg')
tile(tiles2, 'Altura', '178', 'Cm')

// --- Tarjeta blanca: contacto ---
contact2 = Insert(scr2, {type:'frame', name:'Contacto', layout:'vertical', gap:18, padding:16,
                          cornerRadius:20, fill:WHITE, width:'fill_container', height:'fit_content'})
authField(contact2, 'Correo electrónico', 'mail', 'alejandro.duque@example.com')
authField(contact2, 'Teléfono', 'call', '+57 300 456 7890')
txtWrap(contact2, 'El correo es tu usuario de acceso y lo gestiona Neural. Escríbenos si necesitas cambiarlo.',
        13, 'normal', GRIS, 'left', 'fill_container', 0, 1.38)

// --- Guardar ---
save2 = Insert(scr2, {type:'frame', name:'Guardar', layout:'horizontal', alignItems:'center',
                      justifyContent:'center', height:56, cornerRadius:28, fill:INK, width:'fill_container'})
txt(save2, 'Guardar', 17, '600', WHITE, 'center')

// ============================================================================
// PANTALLA: Peso  (contenedor T6CMbY)
// WeightInputScreen.tsx: MIN_WEIGHT 30, MAX_WEIGHT 200; TICK_WIDTH 10;
// header compartido "Datos corporales" con Altura y Fecha de nacimiento.
// ============================================================================
scr3 = Insert('T6CMbY', {type:'frame', name:'Peso', layout:'vertical', gap:24,
                          padding:[42,16,32,16], width:375, height:600,
                          fill:SURFACE, clip:true})

header(scr3, 'Datos corporales', true)

head3 = Insert(scr3, {type:'frame', layout:'vertical', gap:8, alignItems:'center',
                       width:'fill_container', height:'fit_content'})
txtWrap(head3, '¿Cuál es\ntu peso?', 36, '600', INK, 'center', 'fill_container', -1.08, 1.19)
txtWrap(head3, 'Ingresa tu peso actual para seguir tu progreso.', 12, 'normal', GRIS, 'center', 260, 0, 1.42)

stage3 = Insert(scr3, {type:'frame', layout:'vertical', gap:32, alignItems:'center',
                        width:'fill_container', height:'fit_content'})
selectBlock3 = Insert(stage3, {type:'frame', layout:'vertical', gap:4, alignItems:'center',
                                width:'fill_container', height:'fit_content'})
ruler(selectBlock3, RULER_OFFSETS, 78)
numbersRow(selectBlock3, 78)
txt(stage3, '+2 kg respecto a tu último registro.', 13, 'normal', GRIS, 'center')

footer3 = Insert(scr3, {type:'frame', layout:'vertical', gap:14, padding:[8,0,0,0],
                         width:'fill_container', height:'fit_content'})
btn3 = Insert(footer3, {type:'frame', layout:'horizontal', alignItems:'center', justifyContent:'center',
                        height:56, cornerRadius:28, fill:INK, width:'fill_container'})
txt(btn3, 'Guardar', 17, '600', WHITE, 'center')

// ============================================================================
// PANTALLA: Altura  (contenedor T6CMbY)
// HeightInputScreen.tsx: MIN_HEIGHT 100, MAX_HEIGHT 250; mismo StyleSheet
// que Peso (regla, caja central, botón).
// ============================================================================
scr4 = Insert('T6CMbY', {type:'frame', name:'Altura', layout:'vertical', gap:24,
                          padding:[42,16,32,16], width:375, height:600,
                          fill:SURFACE, clip:true})

header(scr4, 'Datos corporales', true)

head4 = Insert(scr4, {type:'frame', layout:'vertical', gap:8, alignItems:'center',
                       width:'fill_container', height:'fit_content'})
txtWrap(head4, '¿Cuál es\ntu altura?', 36, '600', INK, 'center', 'fill_container', -1.08, 1.19)
txtWrap(head4, 'Ingresa tu altura para calcular tus métricas.', 12, 'normal', GRIS, 'center', 260, 0, 1.42)

stage4 = Insert(scr4, {type:'frame', layout:'vertical', gap:32, alignItems:'center',
                        width:'fill_container', height:'fit_content'})
selectBlock4 = Insert(stage4, {type:'frame', layout:'vertical', gap:4, alignItems:'center',
                                width:'fill_container', height:'fit_content'})
ruler(selectBlock4, RULER_OFFSETS, 178)
numbersRow(selectBlock4, 178)
txt(stage4, 'Equivale a 1,78 m. Tenías 176 cm registrados.', 13, 'normal', GRIS, 'center')

footer4 = Insert(scr4, {type:'frame', layout:'vertical', gap:14, padding:[8,0,0,0],
                         width:'fill_container', height:'fit_content'})
btn4 = Insert(footer4, {type:'frame', layout:'horizontal', alignItems:'center', justifyContent:'center',
                        height:56, cornerRadius:28, fill:INK, width:'fill_container'})
txt(btn4, 'Guardar', 17, '600', WHITE, 'center')

// ============================================================================
// PANTALLA: Fecha de nacimiento  (contenedor T6CMbY)
// BirthdateInputScreen.tsx: ITEM_HEIGHT 44, VISIBLE_ITEMS 5 → picker 220 alto;
// columnas DÍA 76 / MES 104 / AÑO 104 → banda 284 de ancho.
// ============================================================================
scr5 = Insert('T6CMbY', {type:'frame', name:'Fecha de nacimiento', layout:'vertical', gap:24,
                          padding:[42,16,32,16], width:375, height:700,
                          fill:SURFACE, clip:true})

header(scr5, 'Datos corporales', true)

head5 = Insert(scr5, {type:'frame', layout:'vertical', gap:8, alignItems:'center',
                       width:'fill_container', height:'fit_content'})
txtWrap(head5, '¿Cuál es tu\nfecha de nacimiento?', 36, '600', INK, 'center', 'fill_container', -1.08, 1.19)
txtWrap(head5, 'Cuéntanos tu fecha de nacimiento para personalizar tus entrenamientos.',
        12, 'normal', GRIS, 'center', 260, 0, 1.42)

stage5 = Insert(scr5, {type:'frame', layout:'vertical', gap:32, alignItems:'center',
                        width:'fill_container', height:'fit_content'})
wheels5 = Insert(stage5, {type:'frame', layout:'vertical', gap:8, alignItems:'center',
                          width:'fit_content', height:'fit_content'})

labels5 = Insert(wheels5, {type:'frame', layout:'horizontal', width:'fit_content', height:'fit_content'})
Insert(labels5, {type:'text', content:'DÍA', fontFamily:'Rethink Sans', fontSize:10, fontWeight:'700',
                 letterSpacing:1.2, fill:GRIS, width:76, textAlign:'center', textGrowth:'fixed-width'})
Insert(labels5, {type:'text', content:'MES', fontFamily:'Rethink Sans', fontSize:10, fontWeight:'700',
                 letterSpacing:1.2, fill:GRIS, width:104, textAlign:'center', textGrowth:'fixed-width'})
Insert(labels5, {type:'text', content:'AÑO', fontFamily:'Rethink Sans', fontSize:10, fontWeight:'700',
                 letterSpacing:1.2, fill:GRIS, width:104, textAlign:'center', textGrowth:'fixed-width'})

// Ejemplo: 14 mar 1997 (29 años el 06-sep-2026), seleccionado en la fila central.
grid5 = Insert(wheels5, {type:'frame', layout:'vertical', width:284, height:220})

row0 = Insert(grid5, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container', height:44})
wheelCell(row0, '12', 0, 76)
wheelCell(row0, 'Ene', 0, 104)
wheelCell(row0, '1995', 0, 104)

row1 = Insert(grid5, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container', height:44})
wheelCell(row1, '13', 1, 76)
wheelCell(row1, 'Feb', 1, 104)
wheelCell(row1, '1996', 1, 104)

// Fila seleccionada: la banda de selección ES la caja con borde degradado.
band5 = Insert(grid5, {type:'frame', width:284, height:44, cornerRadius:14, padding:1, fill:GRAD_LIMA_VERDE})
bandInner5 = Insert(band5, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container',
                            height:'fill_container', cornerRadius:13, fill:SURFACE})
wheelCell(bandInner5, '14', 2, 76)
wheelCell(bandInner5, 'Mar', 2, 104)
wheelCell(bandInner5, '1997', 2, 104)

row3 = Insert(grid5, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container', height:44})
wheelCell(row3, '15', 1, 76)
wheelCell(row3, 'Abr', 1, 104)
wheelCell(row3, '1998', 1, 104)

row4 = Insert(grid5, {type:'frame', layout:'horizontal', alignItems:'center', width:'fill_container', height:44})
wheelCell(row4, '16', 0, 76)
wheelCell(row4, 'May', 0, 104)
wheelCell(row4, '1999', 0, 104)

txt(stage5, '29 años', 13, 'normal', GRIS, 'center')

footer5 = Insert(scr5, {type:'frame', layout:'vertical', gap:14, padding:[8,0,0,0],
                         width:'fill_container', height:'fit_content'})
btn5 = Insert(footer5, {type:'frame', layout:'horizontal', alignItems:'center', justifyContent:'center',
                        height:56, cornerRadius:28, fill:INK, width:'fill_container'})
txt(btn5, 'Guardar', 17, '600', WHITE, 'center')

// ============================================================================
// RESUMEN — pantallas creadas y alto (calculado a mano sumando padding +
// gaps/spacers + contenido, con margen de seguridad; Pencil puede necesitar
// un ajuste fino una vez mida el texto real):
//
//  1) Perfil                  → contenedor X23ZG    · 375 x 1320
//  2) Editar perfil           → contenedor X23ZG    · 375 x 1200
//  3) Peso                    → contenedor T6CMbY   · 375 x 600
//  4) Altura                  → contenedor T6CMbY   · 375 x 600
//  5) Fecha de nacimiento     → contenedor T6CMbY   · 375 x 700
// ============================================================================
