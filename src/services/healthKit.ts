import { Platform, NativeModules } from 'react-native';

// Import HealthKit - the module needs the native module to be available
let AppleHealthKit: any;

// Check if native module exists FIRST - try all possible names
const nativeModule = NativeModules.AppleHealthKit || NativeModules.RNAppleHealthKit || NativeModules.RCTAppleHealthKit;
console.log('[HealthKit] Native module check:', {
  AppleHealthKit: !!NativeModules.AppleHealthKit,
  RNAppleHealthKit: !!NativeModules.RNAppleHealthKit,
  RCTAppleHealthKit: !!NativeModules.RCTAppleHealthKit,
  nativeModuleExists: !!nativeModule
});

if (!nativeModule) {
  console.error('[HealthKit] ⚠️ Native module NOT found in NativeModules');
  console.error('[HealthKit] Available native modules:', Object.keys(NativeModules).filter(k => 
    k.includes('Health') || k.includes('health') || k.includes('Apple')
  ));
  console.error('[HealthKit] All native modules:', Object.keys(NativeModules).slice(0, 30));
} else {
  console.log('[HealthKit] ✅ Native module found');
  console.log('[HealthKit] Native module keys:', Object.keys(nativeModule));
  console.log('[HealthKit] Native module has getStepCount:', typeof nativeModule.getStepCount);
  console.log('[HealthKit] Native module has getDistanceWalkingRunning:', typeof nativeModule.getDistanceWalkingRunning);
  console.log('[HealthKit] Native module has getActiveEnergyBurned:', typeof nativeModule.getActiveEnergyBurned);
}

try {
  // The module requires the native module to be available
  // According to react-native-health/index.js, it does:
  // const { AppleHealthKit } = require('react-native').NativeModules
  // export const HealthKit = Object.assign({}, AppleHealthKit, { Constants: ... })
  // So the JS module should already have all native methods + Constants
  const HealthKitModule = require('react-native-health');
  
  // Log what we got from the JS module
  console.log('[HealthKit] JS Module loaded:', HealthKitModule ? 'yes' : 'no');
  if (HealthKitModule) {
    console.log('[HealthKit] JS Module keys:', Object.keys(HealthKitModule));
    console.log('[HealthKit] JS Module Constants available:', HealthKitModule.Constants ? 'yes' : 'no');
    console.log('[HealthKit] JS Module initHealthKit:', typeof HealthKitModule.initHealthKit);
    console.log('[HealthKit] JS Module getStepCount:', typeof HealthKitModule.getStepCount);
    console.log('[HealthKit] JS Module getDistanceWalkingRunning:', typeof HealthKitModule.getDistanceWalkingRunning);
    console.log('[HealthKit] JS Module getActiveEnergyBurned:', typeof HealthKitModule.getActiveEnergyBurned);
  }
  
  // Use the JS module directly - it should already have native methods merged
  // The JS module does Object.assign({}, AppleHealthKit, { Constants }) internally
  AppleHealthKit = HealthKitModule;
  
  console.log('[HealthKit] ✅ Using JS module directly');
  console.log('[HealthKit] Final AppleHealthKit keys:', Object.keys(AppleHealthKit));
  console.log('[HealthKit] Final initHealthKit:', typeof AppleHealthKit.initHealthKit);
  console.log('[HealthKit] Final getStepCount:', typeof AppleHealthKit.getStepCount);
  console.log('[HealthKit] Final getDistanceWalkingRunning:', typeof AppleHealthKit.getDistanceWalkingRunning);
  console.log('[HealthKit] Final getActiveEnergyBurned:', typeof AppleHealthKit.getActiveEnergyBurned);
} catch (e) {
  console.error('[HealthKit] Failed to import react-native-health:', e);
}

import type {
  HealthKitPermissions,
  HealthInputOptions,
  HealthValue,
} from 'react-native-health';

/* Permission options - defined as a function to ensure Constants are available */
function getPermissions(): HealthKitPermissions {
  if (!AppleHealthKit || !AppleHealthKit.Constants) {
    throw new Error('HealthKit module not loaded. Make sure HealthKit capability is enabled in Xcode.');
  }
  
  return {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        AppleHealthKit.Constants.Permissions.HeartRate,
        AppleHealthKit.Constants.Permissions.Weight,
        AppleHealthKit.Constants.Permissions.Height,
        AppleHealthKit.Constants.Permissions.WorkoutType,
        AppleHealthKit.Constants.Permissions.AppleExerciseTime,
      ],
      write: [
        AppleHealthKit.Constants.Permissions.Weight,
        AppleHealthKit.Constants.Permissions.Height,
        AppleHealthKit.Constants.Permissions.WorkoutType,
      ],
    },
  };
}

export interface HealthData {
  steps: number;
  distance: number; // in meters
  calories: number; // active energy burned
  heartRate: number | null; // bpm
  workouts: WorkoutData[];
  exerciseTime: number; // minutes
}

export interface WorkoutData {
  type: string;
  startDate: string;
  endDate: string;
  duration: number; // minutes
  calories?: number;
  distance?: number;
}

export interface SaveWorkoutOptions {
  type: number; // Workout type constant from HealthKit ActivityType (e.g., ActivityType.Running)
  startDate: Date;
  endDate: Date;
  energyBurned?: number; // calories
  energyBurnedUnit?: 'calorie' | 'kilocalorie';
  distance?: number; // in meters
  distanceUnit?: 'meter' | 'kilometer' | 'mile';
}

export interface HealthKitService {
  isAvailable: () => boolean;
  requestPermissions: () => Promise<boolean>;
  getSteps: (startDate: Date, endDate: Date) => Promise<number>;
  getDistance: (startDate: Date, endDate: Date) => Promise<number>;
  getCalories: (startDate: Date, endDate: Date) => Promise<number>;
  getHeartRate: () => Promise<number | null>;
  getWorkouts: (startDate: Date, endDate: Date) => Promise<WorkoutData[]>;
  getExerciseTime: (startDate: Date, endDate: Date) => Promise<number>;
  getTodayHealthData: () => Promise<HealthData>;
  saveWeight: (weight: number, date: Date) => Promise<boolean>;
  saveHeight: (height: number, date: Date) => Promise<boolean>;
  saveWorkout: (options: SaveWorkoutOptions) => Promise<string | null>; // Returns workout UUID or null
}

class HealthKitServiceImpl implements HealthKitService {
  private initialized = false;

  isAvailable(): boolean {
    return Platform.OS === 'ios';
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('[HealthKit] Not available on this platform');
      return false;
    }

    console.log('[HealthKit] Checking module availability...');
    console.log('[HealthKit] AppleHealthKit:', typeof AppleHealthKit, AppleHealthKit ? 'exists' : 'null/undefined');
    
    if (!AppleHealthKit) {
      console.error('[HealthKit] AppleHealthKit module is null/undefined');
      console.error('[HealthKit] Make sure:');
      console.error('1. HealthKit capability is enabled in Xcode');
      console.error('2. Pod install was run after adding react-native-health');
      console.error('3. App was rebuilt after enabling HealthKit');
      return false;
    }

    console.log('[HealthKit] AppleHealthKit methods:', Object.keys(AppleHealthKit).slice(0, 20));
    console.log('[HealthKit] Constants:', AppleHealthKit.Constants ? 'exists' : 'missing');
    console.log('[HealthKit] initHealthKit type:', typeof AppleHealthKit.initHealthKit);
    console.log('[HealthKit] Native module available:', !!nativeModule);
    
    if (!AppleHealthKit.Constants) {
      console.error('[HealthKit] Constants not available');
      return false;
    }

    // If initHealthKit is missing, try to get it from native module directly
    if (typeof AppleHealthKit.initHealthKit !== 'function') {
      console.error('[HealthKit] initHealthKit is not a function:', typeof AppleHealthKit.initHealthKit);
      
      if (nativeModule && typeof nativeModule.initHealthKit === 'function') {
        console.log('[HealthKit] ✅ Found initHealthKit in native module, merging...');
        // Merge native module methods with Constants
        AppleHealthKit = Object.assign({}, nativeModule, {
          Constants: AppleHealthKit.Constants
        });
        console.log('[HealthKit] After merge, initHealthKit available:', typeof AppleHealthKit.initHealthKit);
      } else {
        console.error('[HealthKit] ❌ initHealthKit not found in native module either');
        console.error('[HealthKit] Native module keys:', nativeModule ? Object.keys(nativeModule).slice(0, 10) : 'null');
        return false;
      }
    }

    return new Promise((resolve) => {
      try {
        console.log('[HealthKit] Getting permissions...');
        const permissions = getPermissions();
        console.log('[HealthKit] Permissions object:', JSON.stringify(permissions, null, 2));
        console.log('[HealthKit] Calling initHealthKit...');
        
        AppleHealthKit.initHealthKit(permissions, (error: string, result: any) => {
          console.log('[HealthKit] initHealthKit callback called');
          console.log('[HealthKit] Error:', error);
          console.log('[HealthKit] Result:', result);
          
          if (error) {
            console.log('[HealthKit] Error initializing:', error);
            resolve(false);
            return;
          }
          this.initialized = true;
          console.log('[HealthKit] Initialized successfully');
          resolve(true);
        });
      } catch (err) {
        console.error('[HealthKit] Exception in initHealthKit:', err);
        console.error('[HealthKit] Stack:', err instanceof Error ? err.stack : 'No stack');
        resolve(false);
      }
    });
  }

  async getSteps(startDate: Date, endDate: Date): Promise<number> {
    if (!this.initialized) return 0;

    // Verify method exists before calling
    if (typeof AppleHealthKit.getStepCount !== 'function') {
      console.error('[HealthKit] getStepCount is not a function');
      console.error('[HealthKit] Available methods:', Object.keys(AppleHealthKit).filter(k => typeof AppleHealthKit[k] === 'function').slice(0, 20));
      return 0;
    }

    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getStepCount(options, (err: string, results: HealthValue) => {
        if (err) {
          console.log('[HealthKit] Error getting steps:', err);
          resolve(0);
          return;
        }
        resolve(results.value || 0);
      });
    });
  }

  async getDistance(startDate: Date, endDate: Date): Promise<number> {
    if (!this.initialized) return 0;

    if (typeof AppleHealthKit.getDistanceWalkingRunning !== 'function') {
      console.error('[HealthKit] getDistanceWalkingRunning is not a function');
      return 0;
    }

    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        unit: 'meter',
      };

      AppleHealthKit.getDistanceWalkingRunning(options, (err: string, results: HealthValue) => {
        if (err) {
          console.log('[HealthKit] Error getting distance:', err);
          resolve(0);
          return;
        }
        resolve(results.value || 0);
      });
    });
  }

  async getCalories(startDate: Date, endDate: Date): Promise<number> {
    if (!this.initialized) return 0;

    if (typeof AppleHealthKit.getActiveEnergyBurned !== 'function') {
      console.error('[HealthKit] getActiveEnergyBurned is not a function');
      return 0;
    }

    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getActiveEnergyBurned(options, (err: string, results: Array<HealthValue>) => {
        if (err) {
          console.log('[HealthKit] Error getting calories:', err);
          resolve(0);
          return;
        }
        // Sum all calorie values for the time period
        const total = results.reduce((sum, sample) => sum + (sample.value || 0), 0);
        resolve(Math.round(total));
      });
    });
  }

  async getHeartRate(): Promise<number | null> {
    if (!this.initialized) return null;

    if (typeof AppleHealthKit.getHeartRateSamples !== 'function') {
      console.error('[HealthKit] getHeartRateSamples is not a function');
      return null;
    }

    return new Promise((resolve) => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const options: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getHeartRateSamples(options, (err: string, results: Array<HealthValue>) => {
        if (err || !results || results.length === 0) {
          resolve(null);
          return;
        }
        // Get the most recent heart rate
        const latest = results[results.length - 1];
        resolve(Math.round(latest.value || 0));
      });
    });
  }

  async getWorkouts(startDate: Date, endDate: Date): Promise<WorkoutData[]> {
    if (!this.initialized) return [];

    if (typeof AppleHealthKit.getAnchoredWorkouts !== 'function') {
      console.error('[HealthKit] getAnchoredWorkouts is not a function');
      return [];
    }

    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      // Use getAnchoredWorkouts to get workout data
      AppleHealthKit.getAnchoredWorkouts(options, (err: any, results: any) => {
        if (err || !results || !results.data) {
          console.log('[HealthKit] Error getting workouts:', err);
          resolve([]);
          return;
        }

        const workouts: WorkoutData[] = results.data.map((workout: any) => {
          const startDateObj = new Date(workout.startDate);
          const endDateObj = new Date(workout.endDate);
          const durationMinutes = Math.round((endDateObj.getTime() - startDateObj.getTime()) / 60000);

          return {
            type: workout.activityType || 'Unknown',
            startDate: workout.startDate,
            endDate: workout.endDate,
            duration: durationMinutes,
            calories: workout.totalEnergyBurned?.value || 0,
            distance: workout.totalDistance?.value || 0,
          };
        });

        resolve(workouts);
      });
    });
  }

  async getExerciseTime(startDate: Date, endDate: Date): Promise<number> {
    if (!this.initialized) return 0;

    if (typeof AppleHealthKit.getAppleExerciseTime !== 'function') {
      console.error('[HealthKit] getAppleExerciseTime is not a function');
      return 0;
    }

    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getAppleExerciseTime(options, (err: string, results: Array<HealthValue>) => {
        if (err) {
          console.log('[HealthKit] Error getting exercise time:', err);
          resolve(0);
          return;
        }
        // Sum all exercise time values and convert seconds to minutes
        const totalSeconds = results.reduce((sum, sample) => sum + (sample.value || 0), 0);
        resolve(Math.round(totalSeconds / 60));
      });
    });
  }

  async getTodayHealthData(): Promise<HealthData> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now);

    const [steps, distance, calories, heartRate, workouts, exerciseTime] = await Promise.all([
      this.getSteps(startOfDay, endOfDay),
      this.getDistance(startOfDay, endOfDay),
      this.getCalories(startOfDay, endOfDay),
      this.getHeartRate(),
      this.getWorkouts(startOfDay, endOfDay),
      this.getExerciseTime(startOfDay, endOfDay),
    ]);

    return {
      steps: Math.round(steps),
      distance: Math.round(distance),
      calories: Math.round(calories),
      heartRate,
      workouts,
      exerciseTime,
    };
  }

  async saveWeight(weight: number, date: Date): Promise<boolean> {
    if (!this.initialized) return false;

    if (typeof AppleHealthKit.saveWeight !== 'function') {
      console.error('[HealthKit] saveWeight is not a function');
      return false;
    }

    return new Promise((resolve) => {
      const options = {
        value: weight,
        unit: 'kilogram',
        date: date.toISOString(),
      };

      AppleHealthKit.saveWeight(options, (err: string) => {
        if (err) {
          console.log('[HealthKit] Error saving weight:', err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  async saveHeight(height: number, date: Date): Promise<boolean> {
    if (!this.initialized) return false;

    if (typeof AppleHealthKit.saveHeight !== 'function') {
      console.error('[HealthKit] saveHeight is not a function');
      return false;
    }

    return new Promise((resolve) => {
      const options = {
        value: height,
        unit: 'meter',
        date: date.toISOString(),
      };

      AppleHealthKit.saveHeight(options, (err: string) => {
        if (err) {
          console.log('[HealthKit] Error saving height:', err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  async saveWorkout(options: SaveWorkoutOptions): Promise<string | null> {
    console.log('[HealthKit] saveWorkout called, initialized:', this.initialized);
    console.log('[HealthKit] Options received:', {
      type: options.type,
      startDate: options.startDate.toISOString(),
      endDate: options.endDate.toISOString(),
      energyBurned: options.energyBurned,
    });
    
    if (!this.initialized) {
      console.error('[HealthKit] ❌ Not initialized, cannot save workout');
      return null;
    }

    // Check for saveWorkout method - try different possible names
    const saveMethod = AppleHealthKit.saveWorkout || 
                      AppleHealthKit.saveWorkoutSample ||
                      AppleHealthKit.saveWorkoutData;
    
    if (!saveMethod || typeof saveMethod !== 'function') {
      console.error('[HealthKit] ❌ saveWorkout method not found');
      console.error('[HealthKit] Available methods:', Object.keys(AppleHealthKit).filter(k => typeof AppleHealthKit[k] === 'function').slice(0, 30));
      console.error('[HealthKit] Looking for methods with "workout" in name:', 
        Object.keys(AppleHealthKit).filter(k => k.toLowerCase().includes('workout')));
      return null;
    }

    console.log('[HealthKit] ✅ Found saveWorkout method');

    return new Promise((resolve) => {
      // Format dates as ISO strings
      const startDateISO = options.startDate.toISOString();
      const endDateISO = options.endDate.toISOString();
      
      const workoutOptions: any = {
        type: options.type,
        startDate: startDateISO,
        endDate: endDateISO,
      };

      // Add optional energy burned
      if (options.energyBurned !== undefined && options.energyBurned > 0) {
        workoutOptions.energyBurned = options.energyBurned;
        workoutOptions.energyBurnedUnit = options.energyBurnedUnit || 'calorie';
      }

      // Add optional distance
      if (options.distance !== undefined && options.distance > 0) {
        workoutOptions.distance = options.distance;
        workoutOptions.distanceUnit = options.distanceUnit || 'meter';
      }

      console.log('[HealthKit] Calling native saveWorkout with options:', JSON.stringify(workoutOptions, null, 2));
      console.log('[HealthKit] Workout type value:', workoutOptions.type, 'type:', typeof workoutOptions.type);

      try {
        saveMethod(workoutOptions, (err: string, result: any) => {
          console.log('[HealthKit] saveWorkout callback called');
          console.log('[HealthKit] Error:', err);
          console.log('[HealthKit] Result:', result);
          console.log('[HealthKit] Result type:', typeof result);
          
          if (err) {
            console.error('[HealthKit] ❌ Error saving workout:', err);
            console.error('[HealthKit] Error details:', JSON.stringify(err, null, 2));
            resolve(null);
            return;
          }
          
          // Result can be the workout UUID string or an object with UUID
          const workoutUUID = typeof result === 'string' ? result : (result?.uuid || result?.id || result);
          console.log('[HealthKit] ✅ Workout saved successfully, UUID:', workoutUUID);
          resolve(workoutUUID || null);
        });
      } catch (error) {
        console.error('[HealthKit] ❌ Exception calling saveWorkout:', error);
        if (error instanceof Error) {
          console.error('[HealthKit] Exception message:', error.message);
          console.error('[HealthKit] Exception stack:', error.stack);
        }
        resolve(null);
      }
    });
  }
}

const healthKitService = new HealthKitServiceImpl();
export default healthKitService;

