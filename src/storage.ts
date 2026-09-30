import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_APP_DATA, type AppData } from './types';

const STORAGE_KEY = '@cold_call_classroom/app_data_v1';

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_APP_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (parsed.version !== 1 || !Array.isArray(parsed.classes) || !Array.isArray(parsed.history)) {
      return EMPTY_APP_DATA;
    }
    return {
      ...EMPTY_APP_DATA,
      ...parsed,
      settings: { ...EMPTY_APP_DATA.settings, ...parsed.settings },
      roundStates: parsed.roundStates ?? {},
    };
  } catch {
    return EMPTY_APP_DATA;
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function clearAppData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
