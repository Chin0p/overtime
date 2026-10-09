import { OTSettings } from './types';

export const DEFAULT_POLICY: OTSettings['policy'] = {
  officeTiming: {
    start: '08:00',
    end: '16:00'
  },
  shiftDurationHours: 8,
  minThreshold: 1,
  lateArrivalToggle: false,
  roundingMode: 'round',
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
  },
  designationCategories: {},
  designationRateTypes: {},
  designationCapExempt: {},
  employeeEligibility: {},
  fileHolidaysSeen: [],
  employeeExcludedDays: {},
};

export const DEFAULT_SETTINGS: OTSettings = {
  policy: DEFAULT_POLICY,
  appearance: {
    theme: 'system',
  },
  pdf: {
    tableFontSize: 9,
    cellPadding: 2,
    labelFontSize: 10,
    pageSize: 'a4',
    margin: 15,
    summarySubject: 'overtime of admin branch for the month',
    signatureLeft: 'employee signature',
    signatureRight: 'officer signature',
    sortByDesignation: true,
    pdfExcludedDesignations: [],
  },
};

export const STORAGE_KEYS = {
  POLICY: 'ot_settings_policy',
  APPEARANCE: 'ot_settings_appearance',
  BASIC_PAY: 'ot_basic_pay',
  HOLIDAYS: 'ot_holidays',
  PDF: 'ot_settings_pdf',
};
