import { OTSettings } from './types';

export const DEFAULT_SETTINGS: OTSettings = {
  policy: {
    minThreshold: 1,
    lateArrivalToggle: false,
    official: {
      dailyOTCap: 3,
      maxDailyAmount: 550,
      monthlyDayCap: 12,
    },
    support: {
      dailyOTCap: 6,
      maxDailyAmount: 480,
      hourlyRate: 80,
      holidayRate: 600,
      designations: ['Driver', 'Naib Qasid'],
    },
  },
  appearance: {
    fontSize: 10,
    fontFamily: 'helvetica',
    accentColor: '#ffffff',
    visibleColumns: ['Worked (OT)', 'Adjustment'],
  },
  pdf: {
    tableFontSize: 9,
    cellPadding: 2,
    headerFontSize: 12,
    labelFontSize: 10,
    pageSize: 'a4',
    margin: 15,
  },
};

export const STORAGE_KEYS = {
  POLICY: 'ot_settings_policy',
  APPEARANCE: 'ot_settings_appearance',
  BASIC_PAY: 'ot_basic_pay',
  HOLIDAYS: 'ot_holidays',
  PDF: 'ot_settings_pdf',
};
