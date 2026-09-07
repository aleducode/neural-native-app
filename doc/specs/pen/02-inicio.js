// ============================================================================
// 02-inicio.js
// Pantallas: Inicio, Queremos conocerte (dentro de ic1Gu) · Mis entrenos
// (dentro de SXPdw) · Progreso corporal (dentro de hLCcY).
//
// Valores sacados de:
//  - src/screens/HomeScreen.tsx
//  - src/components/WeightCard.tsx
//  - src/components/ProfileSetupSheet.tsx
//  - src/screens/TrainingsScreen.tsx
//  - src/screens/WeightHistoryScreen.tsx
//  - src/components/ui/{Screen,AppHeader,Card}.tsx (compartidos por
//    TrainingsScreen y WeightHistoryScreen)
//  - src/theme/colors.ts
//
// Contenido de ejemplo en español de Colombia, coherente entre pantallas
// (misma usuaria "María González", mismo peso 78 kg, misma racha de 3
// semanas, misma agenda).
// ============================================================================

// ---- Paleta real (theme/colors.ts) ----
INK = '#111111'
SURFACE = '#F4F4F4'
WHITE = '#FFFFFF'
GRIS = '#727272'      // colors.gray400, usado en vez de #A5A5A5/#9D9D9D/#939393
LIMA = '#C6FF40'       // colors.accent
VERDE = '#17DD42'      // colors.accentDeep
VERDE_SUAVE = '#E8FCEC' // colors.accentSoft
VERDE_LEGIBLE = '#109D2F' // usado para "Completado" en Mis entrenos
BORDE = '#DEDEDE'
LINK = '#5E3AE4'       // colors.link, tinte del stat "Entrenos"
ERROR = '#FF4D4D'      // colors.error
HORAS_TINT = '#E2223F' // constante local de HomeScreen.tsx

GRAD_LIMA_VERDE = {type:'gradient', gradientType:'linear', enabled:true, rotation:270,
                    size:{height:1}, colors:[{color:LIMA,position:0},{color:VERDE,position:1}]}

// ---- Helper: separador vertical de alto fijo (no fit_content, no hace falta hijos) ----
function spacer(parent, h) {
  Insert(parent, {type:'frame', name:'spacer', layout:'none', width:'fill_container', height:h})
}

// ============================================================================
// PANTALLA: Inicio  (contenedor ic1Gu)
// HomeScreen.tsx: scroll paddingHorizontal 16, cards fill/16/20/12,12/gap16/mb12
// ============================================================================
scr = Insert('ic1Gu', {type:'frame', name:'Inicio', layout:'vertical', gap:0,
                        padding:[42,16,32,16], width:375, height:'fit_content',
                        fill:SURFACE, clip:true})

spacer(scr, 12) // header.marginTop: 12

// --- Header: avatar 40 + saludo, campana 40 con borde ---
header = Insert(scr, {type:'frame', name:'Header', layout:'horizontal', gap:12,
                       alignItems:'center', justifyContent:'space_between',
                       width:'fill_container', height:'fit_content'})

perfil = Insert(header, {type:'frame', name:'Perfil', layout:'horizontal', gap:12,
                          alignItems:'center', width:'fill_container', height:'fit_content'})

avatar = Insert(perfil, {type:'frame', name:'Avatar', layout:'vertical', alignItems:'center',
                          justifyContent:'center', width:40, height:40, cornerRadius:20, fill:INK})
Insert(avatar, {type:'text', content:'MG', fontFamily:'Rethink Sans', fontSize:15,
                fontWeight:'700', fill:WHITE})

saludo = Insert(perfil, {type:'frame', name:'Saludo', layout:'vertical', gap:3,
                          width:'fill_container', height:'fit_content'})
Insert(saludo, {type:'text', content:'¡BIENVENIDO!', fontFamily:'Rethink Sans', fontSize:12,
                fontWeight:'normal', fill:GRIS})
Insert(saludo, {type:'text', content:'María González', fontFamily:'Rethink Sans', fontSize:16,
                fontWeight:'600', fill:INK})

campana = Insert(header, {type:'frame', name:'Campana', layout:'vertical', alignItems:'center',
                           justifyContent:'center', width:40, height:40, cornerRadius:20,
                           fill:SURFACE, stroke:BORDE, strokeWidth:1})
Insert(campana, {type:'icon', name:'notifications', icon:'notifications', width:24, height:24, fill:INK})

spacer(scr, 24) // header.marginBottom: 24

// --- Hero editorial: próximo entreno ---
hero = Insert(scr, {type:'frame', name:'Hero próximo entreno', layout:'vertical', gap:0,
                     width:'fill_container', height:'fit_content'})
Insert(hero, {type:'text', content:'PRÓXIMO ENTRENAMIENTO', fontFamily:'Rethink Sans',
              fontSize:11, fontWeight:'700', letterSpacing:1.2, fill:GRIS})
spacer(hero, 8) // heroLabel.marginBottom: 8
Insert(hero, {type:'text', content:'Funcional, Martes 6:00 pm.', fontFamily:'Rethink Sans',
              fontSize:30, fontWeight:'700', lineHeight:1.2, letterSpacing:-0.8, fill:INK,
              textGrowth:'fixed-width', width:343})
spacer(hero, 12) // heroCta.marginTop: 12
heroCta = Insert(hero, {type:'frame', name:'Hero CTA', layout:'horizontal', gap:6,
                         alignItems:'center', width:'fit_content', height:'fit_content'})
Insert(heroCta, {type:'text', content:'Ver mi agenda', fontFamily:'Rethink Sans', fontSize:14,
                 fontWeight:'600', fill:INK, textDecoration:'underline'})
Insert(heroCta, {type:'icon', name:'chevron_right', icon:'chevron_right', width:16, height:16, fill:INK})

spacer(scr, 20) // hero.marginBottom: 20

// --- Tira de la semana ---
week = Insert(scr, {type:'frame', name:'Semana', layout:'horizontal', justifyContent:'space_between',
                     width:'fill_container', height:'fit_content'})
dias = [
  {n:'Dom', num:'06', on:true},
  {n:'Lun', num:'07', on:false},
  {n:'Mar', num:'08', on:false},
  {n:'Mié', num:'09', on:false},
  {n:'Jue', num:'10', on:false},
  {n:'Vie', num:'11', on:false},
  {n:'Sáb', num:'12', on:false},
]
for (d of dias) {
  celda = Insert(week, {type:'frame', name:'Día', layout:'vertical', gap:6, alignItems:'center',
                        width:'fit_content', height:'fit_content'})
  Insert(celda, {type:'text', content:d.n, fontFamily:'Rethink Sans', fontSize:11,
                 fontWeight: d.on ? '600' : 'normal', fill: d.on ? INK : GRIS})
  pill = Insert(celda, {type:'frame', name:'Pill', layout:'vertical', alignItems:'center',
                         justifyContent:'center', width:38, height:38, cornerRadius:19,
                         fill: d.on ? INK : WHITE})
  Insert(pill, {type:'text', content:d.num, fontFamily:'Rethink Sans', fontSize:14,
                fontWeight:'600', fill: d.on ? WHITE : INK})
}

spacer(scr, 20) // week.marginBottom: 20

// --- Card: Resumen ---
resumen = Insert(scr, {type:'frame', name:'Resumen', layout:'vertical', gap:16, padding:[12,16],
                        width:'fill_container', height:'fit_content', fill:WHITE, cornerRadius:20})
resumenHead = Insert(resumen, {type:'frame', name:'Head', layout:'vertical', gap:4,
                                width:'fill_container', height:'fit_content'})
Insert(resumenHead, {type:'text', content:'Resumen', fontFamily:'Rethink Sans', fontSize:20,
                      fontWeight:'600', fill:INK})
Insert(resumenHead, {type:'text', content:'Tu semana en Neural', fontFamily:'Rethink Sans',
                      fontSize:12, fontWeight:'normal', fill:GRIS})

statRow = Insert(resumen, {type:'frame', name:'Stat row', layout:'horizontal',
                            justifyContent:'space_between', width:'fill_container', height:'fit_content'})
stats = [
  {icon:'bolt', tint:VERDE, valor:'1840', unidad:'kcal', label:'Calorías'},
  {icon:'monitor_heart', tint:LINK, valor:'12', unidad:'', label:'Entrenos'},
  {icon:'schedule', tint:HORAS_TINT, valor:'9', unidad:'h', label:'Horas'},
]
for (s of stats) {
  stat = Insert(statRow, {type:'frame', name:'Stat', layout:'vertical', gap:8, width:105,
                          height:'fit_content'})
  Insert(stat, {type:'icon', name:s.icon, icon:s.icon, width:24, height:24, fill:s.tint})
  Insert(stat, {type:'text', content:s.label, fontFamily:'Rethink Sans', fontSize:12,
                fontWeight:'normal', fill:GRIS})
  valorRow = Insert(stat, {type:'frame', name:'Valor', layout:'horizontal', gap:2, alignItems:'end',
                            width:'fit_content', height:'fit_content'})
  Insert(valorRow, {type:'text', content:s.valor, fontFamily:'Rethink Sans', fontSize:16,
                    fontWeight:'600', fill:INK})
  if (s.unidad) {
    Insert(valorRow, {type:'text', content:s.unidad, fontFamily:'Rethink Sans', fontSize:12,
                      fontWeight:'normal', fill:GRIS})
  }
}

spacer(scr, 12) // card.marginBottom: 12

// --- Card: Racha ---
racha = Insert(scr, {type:'frame', name:'Racha', layout:'vertical', gap:16, padding:[12,16],
                      width:'fill_container', height:'fit_content', fill:WHITE, cornerRadius:20})
rachaHead = Insert(racha, {type:'frame', name:'Head', layout:'vertical', gap:4,
                            width:'fill_container', height:'fit_content'})
Insert(rachaHead, {type:'text', content:'Racha', fontFamily:'Rethink Sans', fontSize:20,
                    fontWeight:'600', fill:INK})
Insert(rachaHead, {type:'text', content:'Llevas 3 semanas seguidas', fontFamily:'Rethink Sans',
                    fontSize:12, fontWeight:'normal', fill:GRIS})

streakRow = Insert(racha, {type:'frame', name:'Streak row', layout:'horizontal', alignItems:'end',
                            justifyContent:'space_between', width:'fill_container', height:'fit_content'})
streakValue = Insert(streakRow, {type:'frame', name:'Valor', layout:'horizontal', gap:6, alignItems:'end',
                                  width:'fit_content', height:'fit_content'})
Insert(streakValue, {type:'text', content:'3', fontFamily:'Rethink Sans', fontSize:24,
                      fontWeight:'600', fill:INK})
Insert(streakValue, {type:'text', content:'semanas', fontFamily:'Rethink Sans', fontSize:12,
                      fontWeight:'normal', fill:GRIS})
streakTarget = Insert(streakRow, {type:'frame', name:'Meta', layout:'vertical', gap:4, alignItems:'end',
                                   width:'fit_content', height:'fit_content'})
Insert(streakTarget, {type:'text', content:'Meta', fontFamily:'Rethink Sans', fontSize:12,
                       fontWeight:'normal', fill:GRIS})
streakTargetRow = Insert(streakTarget, {type:'frame', name:'Meta valor', layout:'horizontal', gap:2,
                                         alignItems:'end', width:'fit_content', height:'fit_content'})
Insert(streakTargetRow, {type:'text', content:'4', fontFamily:'Rethink Sans', fontSize:16,
                          fontWeight:'600', fill:INK})
Insert(streakTargetRow, {type:'text', content:'semanas', fontFamily:'Rethink Sans', fontSize:12,
                          fontWeight:'normal', fill:GRIS})

// track: 16 alto, r8, clip; hatches de fondo + relleno degradado (3/4 = 75%)
track = Insert(racha, {type:'frame', name:'Track', layout:'horizontal', gap:0,
                        width:'fill_container', height:16, cornerRadius:8, clip:true, fill:BORDE})
Insert(track, {type:'rectangle', width:233, height:16, fill:GRAD_LIMA_VERDE})

spacer(scr, 12) // card.marginBottom: 12

// --- Card: Peso (WeightCard.tsx) ---
peso = Insert(scr, {type:'frame', name:'Peso', layout:'vertical', gap:16, padding:[12,16],
                     width:'fill_container', height:'fit_content', fill:WHITE, cornerRadius:20})
pesoHead = Insert(peso, {type:'frame', name:'Head', layout:'horizontal', justifyContent:'space_between',
                          alignItems:'start', width:'fill_container', height:'fit_content'})
pesoHeadTexts = Insert(pesoHead, {type:'frame', name:'Texts', layout:'vertical', gap:0,
                                   width:'fit_content', height:'fit_content'})
Insert(pesoHeadTexts, {type:'text', content:'Tu peso', fontFamily:'Rethink Sans', fontSize:20,
                        fontWeight:'600', letterSpacing:-0.2, fill:INK})
Insert(pesoHeadTexts, {type:'text', content:'8 registros', fontFamily:'Rethink Sans', fontSize:12,
                        fontWeight:'normal', fill:GRIS})
Insert(pesoHead, {type:'icon', name:'chevron_right', icon:'chevron_right', width:20, height:20, fill:GRIS})

pesoValueRow = Insert(peso, {type:'frame', name:'Value row', layout:'horizontal', gap:4,
                              alignItems:'end', width:'fill_container', height:'fit_content'})
Insert(pesoValueRow, {type:'text', content:'78', fontFamily:'Rethink Sans', fontSize:36,
                       fontWeight:'normal', letterSpacing:-0.36, fill:INK})
Insert(pesoValueRow, {type:'text', content:'kg', fontFamily:'Rethink Sans', fontSize:20,
                       fontWeight:'normal', fill:GRIS})
cambio = Insert(pesoValueRow, {type:'frame', name:'Cambio', layout:'horizontal', gap:4,
                                alignItems:'center', width:'fit_content', height:'fit_content'})
Insert(cambio, {type:'icon', name:'arrow_downward', icon:'arrow_downward', width:14, height:14, fill:GRIS})
Insert(cambio, {type:'text', content:'0.8 kg', fontFamily:'Rethink Sans', fontSize:13,
                fontWeight:'normal', fill:GRIS})

pesoChart = Insert(peso, {type:'frame', name:'Chart', layout:'horizontal', gap:6, alignItems:'end',
                           justifyContent:'space_between', width:'fill_container', height:62})
barrasPeso = [40, 44, 38, 50, 46, 58, 52, 62]
for (h of barrasPeso) {
  col = Insert(pesoChart, {type:'frame', name:'Col', layout:'vertical', justifyContent:'end',
                            width:34, height:62})
  Insert(col, {type:'rectangle', width:34, height:h, cornerRadius:8, fill:GRAD_LIMA_VERDE})
}

spacer(scr, 12) // card.marginBottom: 12

// --- Card: Agendar entrenamiento ---
agendar = Insert(scr, {type:'frame', name:'Agendar', layout:'vertical', gap:16, padding:[12,16],
                        width:'fill_container', height:'fit_content', fill:WHITE, cornerRadius:20})
agendarHead = Insert(agendar, {type:'frame', name:'Head', layout:'vertical', gap:4,
                                width:'fill_container', height:'fit_content'})
Insert(agendarHead, {type:'text', content:'Agendar entrenamiento', fontFamily:'Rethink Sans',
                      fontSize:20, fontWeight:'600', fill:INK})
Insert(agendarHead, {type:'text', content:'Reserva tu próximo entrenamiento', fontFamily:'Rethink Sans',
                      fontSize:12, fontWeight:'normal', fill:GRIS})
bookCta = Insert(agendar, {type:'frame', name:'CTA', layout:'horizontal', gap:8, alignItems:'center',
                            justifyContent:'center', width:'fill_container', height:44,
                            cornerRadius:32, fill:INK})
Insert(bookCta, {type:'text', content:'Ver horarios', fontFamily:'Rethink Sans', fontSize:14,
                 fontWeight:'600', fill:WHITE})
Insert(bookCta, {type:'icon', name:'arrow_forward', icon:'arrow_forward', width:16, height:16, fill:WHITE})

spacer(scr, 100) // + los 32 de padding inferior = 132: despeje de la tab bar flotante

// ============================================================================
// PANTALLA: Queremos conocerte  (dentro de ic1Gu)
// ProfileSetupSheet.tsx: sheet blanco, paddingHorizontal 24, gap 20, r32 arriba.
// Se arranca con la apertura estándar; el fill se corrige a blanco porque el
// código así lo dice, y el padding lateral real (24) se logra con 8px extra
// dentro del padding de 16 de la apertura.
// ============================================================================
scr2 = Insert('ic1Gu', {type:'frame', name:'Queremos conocerte', layout:'vertical', gap:0,
                         padding:[42,16,32,16], width:375, height:'fit_content',
                         fill:WHITE, clip:true})

sheet = Insert(scr2, {type:'frame', name:'Sheet content', layout:'vertical', gap:0,
                       padding:[0,8], width:'fill_container', height:'fit_content'})

// Grabber (drag handle)
grabArea = Insert(sheet, {type:'frame', name:'Grab area', layout:'vertical', alignItems:'center',
                           width:'fill_container', height:'fit_content', padding:[10,0,6,0]})
Insert(grabArea, {type:'rectangle', width:40, height:5, cornerRadius:3, fill:BORDE})

spacer(sheet, 20) // sheet.gap: 20 tras el grab area

mark = Insert(sheet, {type:'frame', name:'Mark', layout:'vertical', alignItems:'center',
                       justifyContent:'center', width:64, height:64, cornerRadius:32,
                       fill:GRAD_LIMA_VERDE})
Insert(mark, {type:'icon', name:'how_to_reg', icon:'how_to_reg', width:28, height:28, fill:INK})

spacer(sheet, 20)

titles = Insert(sheet, {type:'frame', name:'Titles', layout:'vertical', gap:8,
                         width:'fill_container', height:'fit_content'})
Insert(titles, {type:'text', content:'Queremos conocerte', fontFamily:'Rethink Sans', fontSize:28,
                fontWeight:'700', letterSpacing:-0.6, fill:INK})
Insert(titles, {type:'text', content:'Faltan 2 datos para ajustar tus entrenamientos a tu medida.',
                fontFamily:'Rethink Sans', fontSize:15, fontWeight:'normal', lineHeight:1.4,
                fill:GRIS, textGrowth:'fixed-width', width:327})

spacer(sheet, 20)

rows = Insert(sheet, {type:'frame', name:'Rows', layout:'vertical', gap:10,
                       width:'fill_container', height:'fit_content'})
campos = [
  {icon:'height', label:'Tu altura', hint:'Para calcular tus métricas'},
  {icon:'calendar_month', label:'Tu fecha de nacimiento', hint:'Para adaptar la intensidad'},
]
for (c of campos) {
  row = Insert(rows, {type:'frame', name:'Row', layout:'horizontal', gap:14, alignItems:'center',
                       padding:[14,16], width:'fill_container', height:'fit_content',
                       fill:SURFACE, cornerRadius:18})
  rowIcon = Insert(row, {type:'frame', name:'Row icon', layout:'vertical', alignItems:'center',
                          width:26, height:'fit_content'})
  Insert(rowIcon, {type:'icon', name:c.icon, icon:c.icon, width:22, height:22, fill:INK})
  rowTexts = Insert(row, {type:'frame', name:'Row texts', layout:'vertical', gap:2,
                           width:'fill_container', height:'fit_content'})
  Insert(rowTexts, {type:'text', content:c.label, fontFamily:'Rethink Sans', fontSize:15,
                     fontWeight:'600', fill:INK})
  Insert(rowTexts, {type:'text', content:c.hint, fontFamily:'Rethink Sans', fontSize:12,
                     fontWeight:'normal', fill:GRIS})
  Insert(row, {type:'icon', name:'chevron_right', icon:'chevron_right', width:20, height:20, fill:GRIS})
}

spacer(sheet, 20)

cta = Insert(sheet, {type:'frame', name:'CTA', layout:'horizontal', gap:10, alignItems:'center',
                      justifyContent:'center', width:'fill_container', height:56, cornerRadius:28,
                      fill:INK})
Insert(cta, {type:'text', content:'Empezar', fontFamily:'Rethink Sans', fontSize:16,
             fontWeight:'600', fill:WHITE})
Insert(cta, {type:'icon', name:'arrow_forward', icon:'arrow_forward', width:19, height:19, fill:WHITE})

spacer(sheet, 20)

later = Insert(sheet, {type:'frame', name:'Later', layout:'vertical', alignItems:'center',
                        width:'fill_container', height:'fit_content', padding:[4,0]})
Insert(later, {type:'text', content:'Más tarde', fontFamily:'Rethink Sans', fontSize:14,
               fontWeight:'normal', fill:GRIS})

// ============================================================================
// PANTALLA: Mis entrenos  (contenedor SXPdw)
// TrainingsScreen.tsx + ui/Screen, ui/AppHeader compartidos.
// ============================================================================
scr3 = Insert('SXPdw', {type:'frame', name:'Mis entrenos', layout:'vertical', gap:0,
                         padding:[42,16,32,16], width:375, height:'fit_content',
                         fill:SURFACE, clip:true})

// AppHeader: fila de 52, sin back (es raíz de tab), acción "+" a la derecha
appHeader = Insert(scr3, {type:'frame', name:'App header', layout:'horizontal', gap:12,
                           alignItems:'center', justifyContent:'space_between',
                           width:'fill_container', height:52})
Insert(appHeader, {type:'frame', name:'Spacer', layout:'vertical', width:24, height:24})
headerTitles = Insert(appHeader, {type:'frame', name:'Titles', layout:'vertical', alignItems:'center',
                                   gap:2, width:'fill_container', height:'fit_content'})
Insert(headerTitles, {type:'text', content:'Mis entrenos', fontFamily:'Rethink Sans', fontSize:20,
                       fontWeight:'600', letterSpacing:-0.2, fill:INK})
Insert(appHeader, {type:'icon', name:'add', icon:'add', width:24, height:24, fill:INK})

spacer(scr3, 8) // head.marginTop: 8

head3 = Insert(scr3, {type:'frame', name:'Head', layout:'vertical', gap:4,
                       width:'fill_container', height:'fit_content'})
Insert(head3, {type:'text', content:'Tu agenda', fontFamily:'Rethink Sans', fontSize:32,
               fontWeight:'700', lineHeight:1.19, letterSpacing:-1, fill:INK})
Insert(head3, {type:'text', content:'6 sesiones en tu historial', fontFamily:'Rethink Sans',
               fontSize:14, fontWeight:'normal', fill:GRIS})

spacer(scr3, 28) // head.marginBottom(8) + dateHeader.marginTop(20)

// --- helper de item de entreno ---
function trainingItem(parent, item) {
  row = Insert(parent, {type:'frame', name:'Item', layout:'horizontal', gap:16,
                        width:'fill_container', height:'fit_content'})

  timeCol = Insert(row, {type:'frame', name:'Time col', layout:'vertical', gap:8, alignItems:'center',
                          width:46, height:'fit_content'})
  times = Insert(timeCol, {type:'frame', name:'Times', layout:'vertical', gap:4, alignItems:'center',
                            width:'fit_content', height:'fit_content'})
  Insert(times, {type:'text', content:item.horaIni, fontFamily:'Rethink Sans', fontSize:12,
                 fontWeight:'600', fill:INK})
  Insert(times, {type:'text', content:item.horaFin, fontFamily:'Rethink Sans', fontSize:12,
                 fontWeight:'600', fill:GRIS})
  rail = Insert(timeCol, {type:'frame', name:'Rail', layout:'vertical', gap:0, alignItems:'center',
                           width:6, height:'fit_content'})
  Insert(rail, {type:'ellipse', width:6, height:6,
                fill: item.pasado ? GRIS : VERDE})
  Insert(rail, {type:'rectangle', width:2, height:48, fill:BORDE})
  Insert(rail, {type:'ellipse', width:6, height:6,
                fill: item.pasado ? GRIS : VERDE})

  card3 = Insert(row, {type:'frame', name:'Card', layout:'vertical', gap:16, padding:[8,12],
                        width:'fill_container', height:'fit_content', fill:WHITE, cornerRadius:16})
  titleRow = Insert(card3, {type:'frame', name:'Title row', layout:'horizontal', gap:8,
                             alignItems:'center', justifyContent:'space_between',
                             width:'fill_container', height:'fit_content'})
  Insert(titleRow, {type:'text', content:item.tipo, fontFamily:'Rethink Sans', fontSize:16,
                     fontWeight:'600', fill: item.pasado ? GRIS : INK})
  if (item.cancelable) {
    Insert(titleRow, {type:'icon', name:'more_vert', icon:'more_vert', width:16, height:16, fill:INK})
  }

  statusRow = Insert(card3, {type:'frame', name:'Status row', layout:'horizontal', gap:12,
                              alignItems:'center', width:'fill_container', height:'fit_content'})
  Insert(statusRow, {type:'text', content:item.estado, fontFamily:'Rethink Sans', fontSize:12,
                      fontWeight: item.estadoBold ? '600' : 'normal', fill:item.estadoColor})
  hatch = Insert(statusRow, {type:'frame', name:'Hatch', layout:'horizontal', gap:0, width:195,
                              height:6, cornerRadius:32, clip:true, fill:BORDE})
  if (item.progreso > 0) {
    Insert(hatch, {type:'rectangle', width: 195 * item.progreso, height:6, fill:GRAD_LIMA_VERDE})
  }

  metrics = Insert(card3, {type:'frame', name:'Metrics', layout:'horizontal', gap:16,
                            padding:[4,0], width:'fill_container', height:'fit_content'})
  duracion = Insert(metrics, {type:'frame', name:'Duración', layout:'vertical', gap:4,
                               width:'fill_container', height:'fit_content'})
  duracionRow = Insert(duracion, {type:'frame', name:'Row', layout:'horizontal', gap:4, alignItems:'end',
                                   width:'fit_content', height:'fit_content'})
  Insert(duracionRow, {type:'text', content:item.duracion, fontFamily:'Rethink Sans', fontSize:16,
                        fontWeight:'600', fill:INK})
  Insert(duracionRow, {type:'text', content:'min', fontFamily:'Rethink Sans', fontSize:12,
                        fontWeight:'normal', fill:GRIS})
  Insert(duracion, {type:'text', content:'Duración', fontFamily:'Rethink Sans', fontSize:12,
                     fontWeight:'normal', fill:GRIS})

  cupos = Insert(metrics, {type:'frame', name:'Cupos', layout:'vertical', gap:4,
                            width:'fill_container', height:'fit_content'})
  cuposRow = Insert(cupos, {type:'frame', name:'Row', layout:'horizontal', gap:4, alignItems:'end',
                             width:'fit_content', height:'fit_content'})
  Insert(cuposRow, {type:'text', content:item.tomados, fontFamily:'Rethink Sans', fontSize:16,
                     fontWeight:'600', fill:INK})
  Insert(cuposRow, {type:'text', content:'/' + item.cupoMax, fontFamily:'Rethink Sans', fontSize:12,
                     fontWeight:'normal', fill:GRIS})
  Insert(cupos, {type:'text', content:'Cupos', fontFamily:'Rethink Sans', fontSize:12,
                 fontWeight:'normal', fill:GRIS})
}

// --- Grupo 1: hoy ---
Insert(scr3, {type:'text', content:'MARTES 8 SEP', fontFamily:'Rethink Sans', fontSize:11,
              fontWeight:'700', letterSpacing:1.2, fill:GRIS})
spacer(scr3, 10) // dateHeader.marginBottom: 10
trainingItem(scr3, {horaIni:'08:00', horaFin:'09:00', pasado:false, tipo:'Funcional',
                     cancelable:true, estado:'Hoy', estadoBold:true, estadoColor:INK,
                     progreso:0.4, duracion:'60', tomados:'14', cupoMax:'20'})

spacer(scr3, 24) // item.marginBottom(4) + dateHeader.marginTop(20)

// --- Grupo 2: próximo ---
Insert(scr3, {type:'text', content:'JUEVES 10 SEP', fontFamily:'Rethink Sans', fontSize:11,
              fontWeight:'700', letterSpacing:1.2, fill:GRIS})
spacer(scr3, 10)
trainingItem(scr3, {horaIni:'18:00', horaFin:'19:00', pasado:false, tipo:'Ciclismo indoor',
                     cancelable:true, estado:'Próximo', estadoBold:false, estadoColor:GRIS,
                     progreso:0, duracion:'60', tomados:'9', cupoMax:'20'})

spacer(scr3, 24)

// --- Grupo 3: completado ---
Insert(scr3, {type:'text', content:'LUNES 31 AGO', fontFamily:'Rethink Sans', fontSize:11,
              fontWeight:'700', letterSpacing:1.2, fill:GRIS})
spacer(scr3, 10)
trainingItem(scr3, {horaIni:'07:00', horaFin:'08:00', pasado:true, tipo:'Fuerza',
                     cancelable:false, estado:'Completado', estadoBold:false, estadoColor:VERDE_LEGIBLE,
                     progreso:1, duracion:'45', tomados:'20', cupoMax:'20'})

spacer(scr3, 100) // + los 32 de padding inferior = 132: despeje de la tab bar flotante

// ============================================================================
// PANTALLA: Progreso corporal  (contenedor hLCcY)
// WeightHistoryScreen.tsx + ui/Screen, ui/AppHeader, ui/Card compartidos.
// ============================================================================
scr4 = Insert('hLCcY', {type:'frame', name:'Progreso corporal', layout:'vertical', gap:0,
                         padding:[42,16,32,16], width:375, height:'fit_content',
                         fill:SURFACE, clip:true})

// AppHeader: con back, acción "+" (Registrar peso)
appHeader4 = Insert(scr4, {type:'frame', name:'App header', layout:'horizontal', gap:12,
                            alignItems:'center', justifyContent:'space_between',
                            width:'fill_container', height:52})
Insert(appHeader4, {type:'icon', name:'arrow_back', icon:'arrow_back', width:24, height:24, fill:INK})
headerTitles4 = Insert(appHeader4, {type:'frame', name:'Titles', layout:'vertical', alignItems:'center',
                                     gap:2, width:'fill_container', height:'fit_content'})
Insert(headerTitles4, {type:'text', content:'Tu progreso', fontFamily:'Rethink Sans', fontSize:20,
                        fontWeight:'600', letterSpacing:-0.2, fill:INK})
Insert(appHeader4, {type:'icon', name:'add', icon:'add', width:24, height:24, fill:INK})

spacer(scr4, 8) // hero.marginTop: 8

hero4 = Insert(scr4, {type:'frame', name:'Hero', layout:'vertical', gap:0,
                       width:'fill_container', height:'fit_content'})
Insert(hero4, {type:'text', content:'PESO ACTUAL', fontFamily:'Rethink Sans', fontSize:11,
               fontWeight:'700', letterSpacing:1.2, fill:GRIS})
spacer(hero4, 6) // heroLabel.marginBottom: 6
heroValueRow = Insert(hero4, {type:'frame', name:'Value row', layout:'horizontal', gap:8,
                               alignItems:'end', width:'fit_content', height:'fit_content'})
Insert(heroValueRow, {type:'text', content:'78', fontFamily:'Rethink Sans', fontSize:64,
                       fontWeight:'700', letterSpacing:-0.64, fill:INK})
Insert(heroValueRow, {type:'text', content:'kg', fontFamily:'Rethink Sans', fontSize:20,
                       fontWeight:'600', fill:GRIS})
spacer(hero4, 6) // heroCaption.marginTop: 6
Insert(hero4, {type:'text', content:'12 registros en tu historial', fontFamily:'Rethink Sans',
               fontSize:12, fontWeight:'normal', fill:GRIS})

spacer(scr4, 24) // hero.marginBottom: 24

// --- Card: Resumen ---
resumen4 = Insert(scr4, {type:'frame', name:'Resumen', layout:'vertical', gap:16, padding:16,
                          width:'fill_container', height:'fit_content', fill:WHITE, cornerRadius:20})
resumen4Head = Insert(resumen4, {type:'frame', name:'Head', layout:'vertical', gap:4,
                                  width:'fill_container', height:'fit_content'})
Insert(resumen4Head, {type:'text', content:'Resumen', fontFamily:'Rethink Sans', fontSize:20,
                       fontWeight:'600', fill:INK})
Insert(resumen4Head, {type:'text', content:'Mínimo, máximo y cambio acumulado', fontFamily:'Rethink Sans',
                       fontSize:12, fontWeight:'normal', fill:GRIS})
statRow4 = Insert(resumen4, {type:'frame', name:'Stat row', layout:'horizontal',
                              justifyContent:'space_between', width:'fill_container', height:'fit_content'})
stats4 = [
  {icon:'arrow_downward', tint:GRIS, valor:'74.5 kg', label:'Mínimo'},
  {icon:'arrow_upward', tint:GRIS, valor:'81.2 kg', label:'Máximo'},
  {icon:'arrow_downward', tint:VERDE, valor:'-2.3 kg', label:'Cambio'},
]
for (s of stats4) {
  stat4 = Insert(statRow4, {type:'frame', name:'Stat', layout:'vertical', gap:6, width:105,
                            height:'fit_content'})
  Insert(stat4, {type:'icon', name:s.icon, icon:s.icon, width:16, height:16, fill:GRIS})
  Insert(stat4, {type:'text', content:s.valor, fontFamily:'Rethink Sans', fontSize:24,
                fontWeight:'700', fill: s.label == 'Cambio' ? s.tint : INK})
  Insert(stat4, {type:'text', content:s.label, fontFamily:'Rethink Sans', fontSize:12,
                fontWeight:'normal', fill:GRIS})
}

spacer(scr4, 12) // card.marginBottom: 12

// --- Card: Evolución ---
evolucion = Insert(scr4, {type:'frame', name:'Evolución', layout:'vertical', gap:16, padding:16,
                           width:'fill_container', height:'fit_content', fill:WHITE, cornerRadius:20})
evolucionHead = Insert(evolucion, {type:'frame', name:'Head', layout:'vertical', gap:4,
                                    width:'fill_container', height:'fit_content'})
Insert(evolucionHead, {type:'text', content:'Evolución', fontFamily:'Rethink Sans', fontSize:20,
                        fontWeight:'600', fill:INK})
Insert(evolucionHead, {type:'text', content:'Tus últimos 10 registros', fontFamily:'Rethink Sans',
                        fontSize:12, fontWeight:'normal', fill:GRIS})
chartRow = Insert(evolucion, {type:'frame', name:'Chart row', layout:'horizontal', gap:8,
                               alignItems:'end', width:'fill_container', height:'fit_content'})
puntos = [
  {v:'80.2', h:140, f:'28/8'},
  {v:'79.5', h:104, f:'30/8'},
  {v:'78.8', h:69, f:'1/9'},
  {v:'79.2', h:89, f:'3/9'},
  {v:'78.5', h:53, f:'4/9'},
  {v:'78.0', h:28, f:'6/9'},
]
for (p of puntos) {
  col4 = Insert(chartRow, {type:'frame', name:'Col', layout:'vertical', gap:6, alignItems:'center',
                           width:45, height:'fit_content'})
  Insert(col4, {type:'text', content:p.v, fontFamily:'Rethink Sans', fontSize:12,
                fontWeight:'600', fill:INK})
  track4 = Insert(col4, {type:'frame', name:'Track', layout:'vertical', justifyContent:'end',
                          width:45, height:140, cornerRadius:8, clip:true, fill:SURFACE})
  Insert(track4, {type:'rectangle', width:45, height:p.h, cornerRadius:8, fill:GRAD_LIMA_VERDE})
  Insert(col4, {type:'text', content:p.f, fontFamily:'Rethink Sans', fontSize:11,
                fontWeight:'normal', fill:GRIS})
}

spacer(scr4, 12) // card.marginBottom: 12

// --- Card: Registros ---
registros = Insert(scr4, {type:'frame', name:'Registros', layout:'vertical', gap:16, padding:16,
                           width:'fill_container', height:'fit_content', fill:WHITE, cornerRadius:20})
Insert(registros, {type:'text', content:'Registros', fontFamily:'Rethink Sans', fontSize:20,
                    fontWeight:'600', fill:INK})
historial = Insert(registros, {type:'frame', name:'Historial', layout:'vertical', gap:0,
                                width:'fill_container', height:'fit_content'})
filas = [
  {fecha:'6 sep 2026', peso:'78 kg', primero:true},
  {fecha:'4 sep 2026', peso:'78.5 kg', primero:false},
  {fecha:'3 sep 2026', peso:'79.2 kg', primero:false},
  {fecha:'1 sep 2026', peso:'78.8 kg', primero:false},
  {fecha:'30 ago 2026', peso:'79.5 kg', primero:false},
  {fecha:'28 ago 2026', peso:'80.2 kg', primero:false},
]
for (f of filas) {
  if (!f.primero) {
    Insert(historial, {type:'rectangle', width:'fill_container', height:1, fill:SURFACE})
  }
  fila = Insert(historial, {type:'frame', name:'Fila', layout:'horizontal', justifyContent:'space_between',
                             alignItems:'center', padding:[14,0], width:'fill_container', height:'fit_content'})
  left = Insert(fila, {type:'frame', name:'Left', layout:'horizontal', gap:10, alignItems:'center',
                        width:'fit_content', height:'fit_content'})
  if (f.primero) {
    Insert(left, {type:'ellipse', width:8, height:8, fill:VERDE})
  } else {
    Insert(left, {type:'ellipse', width:8, height:8, fill:SURFACE, stroke:GRIS, strokeWidth:1.5})
  }
  Insert(left, {type:'text', content:f.fecha, fontFamily:'Rethink Sans', fontSize:14,
                fontWeight:'normal', fill:GRIS})
  Insert(fila, {type:'text', content:f.peso, fontFamily:'Rethink Sans', fontSize:16,
                fontWeight:'600', fill:INK})
}

spacer(scr4, 100) // + los 32 de padding inferior = 132: despeje de la tab bar flotante

// ============================================================================
// RESUMEN — pantallas creadas y alto aproximado (height:'fit_content' real;
// cifras de referencia calculadas a mano sumando padding+gaps+contenido):
//
//  1) Inicio                → contenedor ic1Gu   · alto aprox. ~1030 px
//  2) Queremos conocerte    → contenedor ic1Gu   · alto aprox. ~525 px
//  3) Mis entrenos          → contenedor SXPdw   · alto aprox. ~785 px
//  4) Progreso corporal     → contenedor hLCcY   · alto aprox. ~1140 px
// ============================================================================
