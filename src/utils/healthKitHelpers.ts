import healthKitService from '../services/healthKit';
import { Training } from '../types';

/**
 * Gets HealthKit workout type constant from training type name
 * Returns the ActivityType constant from HealthKit
 */
function getWorkoutTypeConstant(trainingTypeName: string): number {
  // Import HealthKit module to access Constants
  let AppleHealthKit: any;
  try {
    AppleHealthKit = require('react-native-health');
  } catch (e) {
    console.error('[HealthKit] Failed to import react-native-health:', e);
    return 13; // Default: TraditionalStrengthTraining
  }

  if (!AppleHealthKit?.Constants?.ActivityType) {
    console.warn('[HealthKit] ActivityType constants not available, using default');
    return 13; // Default: TraditionalStrengthTraining
  }

  const ActivityType = AppleHealthKit.Constants.ActivityType;
  
  // Map training types to HealthKit ActivityType constants
  const typeMap: Record<string, number> = {
    'Grupal': ActivityType.TraditionalStrengthTraining,
    'Individual': ActivityType.TraditionalStrengthTraining,
    'Funcional': ActivityType.CrossTraining,
    'Cardio': ActivityType.Running,
    'Yoga': ActivityType.Yoga,
    'Pilates': ActivityType.Pilates,
    'Spinning': ActivityType.Cycling,
    'Crossfit': ActivityType.CrossTraining,
    'HIIT': ActivityType.HighIntensityIntervalTraining,
    'Boxing': ActivityType.Boxing,
    'Natación': ActivityType.Swimming,
    'Running': ActivityType.Running,
    'Ciclismo': ActivityType.Cycling,
  };

  return typeMap[trainingTypeName] || ActivityType.TraditionalStrengthTraining;
}

/**
 * Estimates calories burned based on training type and duration
 * These are rough estimates - ideally should come from backend or user input
 */
function estimateCalories(trainingType: string, durationMinutes: number): number {
  const caloriesPerMinute: Record<string, number> = {
    'Grupal': 8, // ~480 cal/hour
    'Individual': 10, // ~600 cal/hour
    'Funcional': 9, // ~540 cal/hour
    'Cardio': 12, // ~720 cal/hour
    'Yoga': 3, // ~180 cal/hour
    'Pilates': 4, // ~240 cal/hour
    'Spinning': 15, // ~900 cal/hour
    'Crossfit': 12, // ~720 cal/hour
    'HIIT': 14, // ~840 cal/hour
    'Boxing': 13, // ~780 cal/hour
    'Natación': 11, // ~660 cal/hour
    'Running': 12, // ~720 cal/hour
    'Ciclismo': 10, // ~600 cal/hour
  };

  const cpm = caloriesPerMinute[trainingType] || 8; // Default 8 cal/min
  return Math.round(cpm * durationMinutes);
}

/**
 * Parses time string (HH:MM or HH:MM AM/PM) to Date
 */
function parseTime(timeStr: string, date: Date): Date {
  // Remove AM/PM and parse
  const cleanTime = timeStr.replace(/\s*(AM|PM)/i, '').trim();
  const [hours, minutes] = cleanTime.split(':').map(Number);
  
  // Handle 12-hour format
  let hour24 = hours;
  if (timeStr.toUpperCase().includes('PM') && hours !== 12) {
    hour24 = hours + 12;
  } else if (timeStr.toUpperCase().includes('AM') && hours === 12) {
    hour24 = 0;
  }
  
  const result = new Date(date);
  result.setHours(hour24, minutes || 0, 0, 0);
  return result;
}

/**
 * Calculates duration in minutes from start and end times
 */
function calculateDuration(startTime: string, endTime: string, date: Date): number {
  const start = parseTime(startTime, date);
  const end = parseTime(endTime, date);
  
  // If end time is before start time, assume next day
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  return Math.round((end.getTime() - start.getTime()) / 60000); // Convert to minutes
}

/**
 * Saves a completed training to Apple HealthKit
 * 
 * @param training - The training object with slot information
 * @param calories - Optional calories burned (if not provided, will estimate)
 * @returns Promise<string | null> - Returns workout UUID if successful, null otherwise
 */
export async function saveTrainingToHealthKit(
  training: Training,
  calories?: number
): Promise<string | null> {
  // Check if HealthKit is available
  if (!healthKitService.isAvailable()) {
    console.log('[HealthKit] Not available on this platform');
    return null;
  }

  // Ensure HealthKit is initialized
  const initialized = await healthKitService.requestPermissions();
  if (!initialized) {
    console.log('[HealthKit] Failed to initialize HealthKit');
    return null;
  }

  try {
    console.log('[HealthKit] Starting to save training:', {
      trainingId: training.id,
      date: training.slot.date,
      hourInit: training.slot.hour_init,
      hourEnd: training.slot.hour_end,
      calories: calories,
    });

    // Parse training date
    const [year, month, day] = training.slot.date.split('-').map(Number);
    const trainingDate = new Date(year, month - 1, day);
    console.log('[HealthKit] Parsed training date:', trainingDate.toISOString());

    // Parse start and end times
    const startDate = parseTime(training.slot.hour_init, trainingDate);
    const endDate = parseTime(training.slot.hour_end, trainingDate);
    console.log('[HealthKit] Parsed times:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
    
    // If end time is before start time, assume next day
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
      console.log('[HealthKit] End time adjusted to next day:', endDate.toISOString());
    }

    // Calculate duration
    const durationMinutes = calculateDuration(
      training.slot.hour_init,
      training.slot.hour_end,
      trainingDate
    );
    console.log('[HealthKit] Duration:', durationMinutes, 'minutes');

    // Get workout type - handle both training_type and slot.training_type
    const trainingTypeName = training.training_type?.name || training.slot.training_type?.name || 'Grupal';
    console.log('[HealthKit] Training type name:', trainingTypeName);
    
    const workoutType = getWorkoutTypeConstant(trainingTypeName);
    console.log('[HealthKit] Mapped workout type constant:', workoutType);

    // Calculate or use provided calories
    const caloriesBurned = calories || estimateCalories(trainingTypeName, durationMinutes);
    console.log('[HealthKit] Calories to save:', caloriesBurned);

    // Save workout to HealthKit
    console.log('[HealthKit] Calling saveWorkout with options:', {
      type: workoutType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      energyBurned: caloriesBurned,
      energyBurnedUnit: 'calorie',
    });

    const workoutUUID = await healthKitService.saveWorkout({
      type: workoutType,
      startDate: startDate,
      endDate: endDate,
      energyBurned: caloriesBurned,
      energyBurnedUnit: 'calorie',
    });

    console.log('[HealthKit] saveWorkout returned:', workoutUUID);

    if (workoutUUID) {
      console.log(`[HealthKit] ✅ Successfully saved ${trainingTypeName} workout to HealthKit:`, workoutUUID);
    } else {
      console.log(`[HealthKit] ❌ Failed to save ${trainingTypeName} workout to HealthKit - returned null/undefined`);
    }

    return workoutUUID;
  } catch (error) {
    console.error('[HealthKit] ❌ Exception saving training to HealthKit:', error);
    if (error instanceof Error) {
      console.error('[HealthKit] Error message:', error.message);
      console.error('[HealthKit] Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Saves weight to Apple HealthKit
 * 
 * @param weight - Weight in kilograms
 * @param date - Optional date (defaults to now)
 * @returns Promise<boolean> - Returns true if successful
 */
export async function saveWeightToHealthKit(
  weight: number,
  date?: Date
): Promise<boolean> {
  if (!healthKitService.isAvailable()) {
    return false;
  }

  const initialized = await healthKitService.requestPermissions();
  if (!initialized) {
    return false;
  }

  return await healthKitService.saveWeight(weight, date || new Date());
}

/**
 * Saves height to Apple HealthKit
 * 
 * @param height - Height in meters
 * @param date - Optional date (defaults to now)
 * @returns Promise<boolean> - Returns true if successful
 */
export async function saveHeightToHealthKit(
  height: number,
  date?: Date
): Promise<boolean> {
  if (!healthKitService.isAvailable()) {
    return false;
  }

  const initialized = await healthKitService.requestPermissions();
  if (!initialized) {
    return false;
  }

  return await healthKitService.saveHeight(height, date || new Date());
}

