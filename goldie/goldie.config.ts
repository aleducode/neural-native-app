/**
 * Store assets for Neural Consciente.
 *
 * The captures run against a demo backend that exists only for this (see the
 * session scratchpad's `shotapi.py`), not against production: a real account
 * has empty module covers, no trainer name and whatever agenda happens to be
 * there today, none of which makes a good store page — and nobody's real
 * information should end up on the App Store either.
 */
const APP_ROOT = '/Users/ducode/Desktop/projects/neural-native';
const BUILD =
  '/private/tmp/claude-501/-Users-ducode-Desktop-projects-neural-native/e567e4b5-0be1-4427-8c1d-09eea4379b65/scratchpad/ddshot/Build/Products/Release-iphonesimulator/NeuralConsciente.app';

const config = {
  appRoot: APP_ROOT,
  appPath: BUILD,
  bundleId: 'com.ducode.neural',

  devices: ['iphone-6.9', 'pixel-10-pro'],

  // El mismo juego de escenas para Google Play: los flujos de argent se
  // reproducen igual en el emulador cuando los selectores coinciden.
  android: {
    appPath: `${APP_ROOT}/android/app/build/outputs/apk/release/app-release.apk`,
    applicationId: 'com.ducode.neural',
  },
  locales: ['es-CO'],
  appearance: 'light',

  frame: { variant: { 'iphone-6.9': '17-pro-blue' } },

  theme: {
    // The app's own lime over near-black, the pairing the product already uses
    // for its dark surfaces, so the strip reads as the same product.
    background: 'linear-gradient(165deg, #10180C 0%, #1B2714 45%, #0E1308 100%)',
    headlineColor: '#FFFFFF',
    subheadColor: '#C9D6BC',
    fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    copyHeightRatio: 0.26,
    deviceWidthRatio: 0.82,
    template: 'editorial',
  },

  store: {
    name: 'Neural Consciente',
    subtitle: { 'es-CO': 'Entrená con propósito' },
    developer: 'Neural Centro de Entrenamiento',
    category: 'Salud y forma física',
    rating: 4.9,
    ratingCount: '38 calificaciones',
    ageRating: '4+',
    price: 'Gratis',
    description: {
      'es-CO':
        'Neural Consciente es la app de los socios de Neural. Reservá tu entreno, seguí tu progreso y llevá las rutinas que te arma tu entrenador a donde vayas.\n\nTus ejercicios en video, en el orden que los pensó tu entrenador y con su nota en cada uno. Retomás donde quedaste y tu avance se guarda solo.',
    },
  },

  scenes: [
    {
      kind: 'screenshot',
      id: 'inicio',
      flow: 'store-01-inicio',
      headline: { 'es-CO': 'Tu entreno, siempre a mano' },
      subhead: { 'es-CO': 'Lo que sigue hoy, apenas abrís la app.' },
    },
    {
      kind: 'screenshot',
      id: 'ejercicios',
      flow: 'store-02-ejercicios',
      headline: { 'es-CO': 'Las rutinas que te armó tu entrenador' },
      subhead: { 'es-CO': 'En video, en el orden que las pensó para vos.' },
    },
    {
      kind: 'screenshot',
      id: 'reproductor',
      flow: 'store-04-reproductor',
      headline: { 'es-CO': 'Mirá el ejercicio completo' },
      subhead: { 'es-CO': 'A pantalla llena. Retomás donde quedaste.' },
    },
    {
      kind: 'screenshot',
      id: 'agenda',
      flow: 'store-05-agenda',
      headline: { 'es-CO': 'Tus entrenos, ordenados' },
      subhead: { 'es-CO': 'Reservá tu lugar y mirá lo que viene, sin llamar a nadie.' },
    },
    {
      kind: 'screenshot',
      id: 'comunidad',
      flow: 'store-06-comunidad',
      headline: { 'es-CO': 'No entrenás solo' },
      subhead: { 'es-CO': 'Lo que logra tu gente en Neural, y lo tuyo también.' },
    },
    {
      kind: 'preview',
      id: 'preview',
      segments: [
        { id: 'inicio', flow: 'store-preview-01-inicio' },
        { id: 'lista', flow: 'store-preview-02-lista' },
        { id: 'reproduce', flow: 'store-preview-03-reproduce', holdSeconds: 2 },
      ],
    },
  ],
};

export default config;
