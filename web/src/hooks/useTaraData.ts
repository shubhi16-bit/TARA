import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToCityData,
  updateStreetlightStatus,
  updateReportStatus,
  updateRoadInspection,
  scheduleRoadMaintenance,
  updateRoadRepairStatus,
} from '../services/taraDataService';
import type { TaraDataState } from '../services/taraDataService';

export function useTaraData() {
  const { profile, loading: authLoading, profileError } = useAuth();
  const city = profile?.city || '';

  const [dataState, setDataState] = useState<TaraDataState>({
    roads: [],
    crimes: [],
    streetlights: [],
    reports: [],
    riskSnapshots: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!city) {
      setDataState((prev) => ({
        ...prev,
        loading: false,
        error: profileError ? profileError : 'No city assigned to this authority account.',
      }));
      return;
    }

    setDataState((prev) => ({ ...prev, loading: true, error: null }));

    const unsubscribe = subscribeToCityData(city, (newData) => {
      setDataState(newData);
    });

    return () => unsubscribe();
  }, [city, authLoading, profileError]);

  return {
    ...dataState,
    city,
    profile,
    profileError,
    updateStreetlightStatus,
    updateReportStatus,
    updateRoadInspection,
    scheduleRoadMaintenance,
    updateRoadRepairStatus,
  };
}
