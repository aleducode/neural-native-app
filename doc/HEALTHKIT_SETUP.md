# HealthKit Integration Setup

## Implementación Completada

Se ha implementado la integración completa con HealthKit y Apple Watch para la app Neural Consciente.

### Archivos Creados/Modificados

1. **`src/services/healthKit.ts`** - Servicio principal para interactuar con HealthKit
   - Funciones para leer: pasos, distancia, calorías, frecuencia cardíaca, entrenamientos, tiempo de ejercicio
   - Funciones para escribir: peso, altura
   - Manejo de permisos y errores

2. **`src/hooks/useHealthKit.ts`** - Hook React para usar HealthKit fácilmente
   - Estado de autorización
   - Datos de salud del día actual
   - Auto-refresh cada 5 minutos
   - Manejo de errores

3. **`src/screens/ProfileScreen.tsx`** - Integración en la pantalla de perfil
   - Botón para conectar HealthKit (solo iOS)
   - Muestra estado de conexión
   - Permite solicitar permisos

4. **`ios/NeuralConsciente/Info.plist`** - Permisos agregados
   - `NSHealthShareUsageDescription`
   - `NSHealthUpdateUsageDescription`

5. **`app.json`** - Configuración de Expo
   - Permisos agregados en `infoPlist`

## Pasos para Completar la Configuración

### 1. Habilitar HealthKit en Xcode

1. Abre el proyecto en Xcode:
   ```bash
   open ios/NeuralConsciente.xcworkspace
   ```

2. Selecciona el proyecto "NeuralConsciente" en el navegador izquierdo

3. Selecciona el target "NeuralConsciente"

4. Ve a la pestaña "Signing & Capabilities"

5. Haz clic en "+ Capability"

6. Busca y agrega "HealthKit"

7. Asegúrate de que "HealthKit" aparezca en la lista de capabilities

### 2. Instalar Dependencias iOS

```bash
cd ios
pod install
cd ..
```

### 3. Rebuild de la App

Después de agregar HealthKit capability, necesitas hacer un rebuild completo:

```bash
# Limpiar build anterior
cd ios
rm -rf build
cd ..

# Rebuild para iOS
npx expo run:ios --device
```

## Datos Disponibles

La integración permite acceder a:

- **Pasos** - Contador de pasos diarios
- **Distancia** - Distancia caminada/corrida (en metros)
- **Calorías** - Calorías activas quemadas
- **Frecuencia Cardíaca** - Última lectura de frecuencia cardíaca
- **Entrenamientos** - Lista de entrenamientos registrados
- **Tiempo de Ejercicio** - Minutos de ejercicio del día
- **Peso** - Lectura y escritura de peso
- **Altura** - Lectura y escritura de altura

## Uso en la App

### En ProfileScreen

Los usuarios pueden:
1. Ver un botón "Conectar Apple Health" si no está conectado
2. Ver "Apple Health Conectado" si ya está autorizado
3. Al hacer clic, se solicitan permisos o se muestra un resumen de datos

### Usar el Hook en Otros Componentes

```typescript
import { useHealthKit } from '../hooks/useHealthKit';

function MyComponent() {
  const { isAvailable, isAuthorized, healthData, requestPermissions } = useHealthKit();

  if (!isAvailable) {
    return <Text>HealthKit solo disponible en iOS</Text>;
  }

  if (!isAuthorized) {
    return <Button onPress={requestPermissions}>Conectar HealthKit</Button>;
  }

  return (
    <View>
      <Text>Pasos: {healthData?.steps || 0}</Text>
      <Text>Calorías: {healthData?.calories || 0}</Text>
    </View>
  );
}
```

### Usar el Servicio Directamente

```typescript
import healthKitService from '../services/healthKit';

// Solicitar permisos
await healthKitService.requestPermissions();

// Obtener datos del día
const data = await healthKitService.getTodayHealthData();

// Obtener pasos de un rango de fechas
const steps = await healthKitService.getSteps(startDate, endDate);

// Guardar peso
await healthKitService.saveWeight(75.5, new Date());
```

## Notas Importantes

1. **Solo iOS**: HealthKit solo está disponible en dispositivos iOS. En Android, `isAvailable` retornará `false`.

2. **Permisos del Usuario**: El usuario debe otorgar permisos explícitamente. No se puede acceder a datos sin autorización.

3. **Privacidad**: Los datos de salud son sensibles. Asegúrate de cumplir con las políticas de privacidad de Apple y tu app.

4. **Testing**: Necesitas un dispositivo físico iOS para probar HealthKit. El simulador no tiene acceso a datos de salud reales.

5. **Background**: Para recibir actualizaciones en background, necesitas configurar observers adicionales (ver documentación de react-native-health).

## Próximos Pasos Sugeridos

1. Sincronizar datos de HealthKit con el backend
2. Mostrar datos de HealthKit en el dashboard/home screen
3. Agregar gráficos de progreso usando datos de HealthKit
4. Implementar sincronización automática de peso/altura
5. Agregar notificaciones basadas en actividad física

