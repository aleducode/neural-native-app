// System fonts nativas - no requieren carga
// Las fuentes del sistema están disponibles inmediatamente en iOS (SF Pro) y Android (Roboto)

export function useFonts() {
  // System fonts están siempre disponibles, no necesitan carga
  return { fontsLoaded: true, fontError: null };
}

export default useFonts;
