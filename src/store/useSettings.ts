import { useState, useEffect } from 'react';
import { OTSettings, Holiday } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants';

export function useSettings() {
  const getSafeStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error(`Failed to parse ${key} from storage:`, e);
      return defaultValue;
    }
  };

  const [policy, setPolicy] = useState<OTSettings['policy']>(() => {
    const saved = getSafeStorage(STORAGE_KEYS.POLICY, DEFAULT_SETTINGS.policy);
    return {
      ...DEFAULT_SETTINGS.policy,
      ...saved,
      officeTiming: {
        ...DEFAULT_SETTINGS.policy.officeTiming,
        ...(saved?.officeTiming || {})
      },
      support: {
        ...DEFAULT_SETTINGS.policy.support,
        ...(saved?.support || {})
      },
      official: {
        ...DEFAULT_SETTINGS.policy.official,
        ...(saved?.official || {})
      }
    };
  });

  const [appearance, setAppearance] = useState<OTSettings['appearance']>(() => 
    getSafeStorage(STORAGE_KEYS.APPEARANCE, DEFAULT_SETTINGS.appearance)
  );

  const [pdf, setPdf] = useState<OTSettings['pdf']>(() => 
    getSafeStorage(STORAGE_KEYS.PDF, DEFAULT_SETTINGS.pdf)
  );

  const [basicPay, setBasicPay] = useState<Record<string, number>>(() => 
    getSafeStorage(STORAGE_KEYS.BASIC_PAY, {})
  );

  const [holidays, setHolidays] = useState<Holiday[]>(() => 
    getSafeStorage(STORAGE_KEYS.HOLIDAYS, [])
  );

  const saveSettings = (
    newPolicy: OTSettings['policy'],
    newAppearance: OTSettings['appearance'],
    newPdf: OTSettings['pdf'],
    newBasicPay: Record<string, number>,
    newHolidays: Holiday[]
  ) => {
    setPolicy(newPolicy);
    setAppearance(newAppearance);
    setPdf(newPdf);
    setBasicPay(newBasicPay);
    setHolidays(newHolidays);
    
    localStorage.setItem(STORAGE_KEYS.POLICY, JSON.stringify(newPolicy));
    localStorage.setItem(STORAGE_KEYS.APPEARANCE, JSON.stringify(newAppearance));
    localStorage.setItem(STORAGE_KEYS.PDF, JSON.stringify(newPdf));
    localStorage.setItem(STORAGE_KEYS.BASIC_PAY, JSON.stringify(newBasicPay));
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(newHolidays));
  };

  return {
    policy,
    appearance,
    pdf,
    basicPay,
    holidays,
    saveSettings,
    setAppearance,
    setPdf
  };
}
