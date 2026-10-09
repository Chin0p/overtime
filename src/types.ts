export interface AttendanceCell {
  timeIn: string;
  timeOut: string;
}

export interface EmployeeDetails {
  erp: string;
  name: string;
  designation: string;
  dates: Record<string, AttendanceCell>;
  attendance: Record<string, AttendanceCell>;
  category?: EmployeeCategory;
  isSupport?: boolean;
  basicPay?: number;
  totalOTHours?: number;
  totalAmount?: number;
  precalculatedRecords?: ProcessedRecord[];
  holidayDates?: string[];
}

export type EmployeeRow = EmployeeDetails & {
  [key: string]: any;
};

export interface AttendanceData extends Array<EmployeeRow> {
  dates: string[];
  employees: EmployeeRow[];
  holidays?: Holiday[];
  sourceType?: 'json';
  /** Non-fatal issues L1 accumulated during parse (skipped rows, etc.). */
  warnings?: string[];
}

export interface Holiday {
  date: string; // canonical format: dd-MMM-yyyy
  name: string;
}

export type ColumnId = 'Worked (OT)' | 'Adjustment' | 'Office Timing' | 'Total Hours Worked';

export type EmployeeCategory = 'official' | 'support' | 'exempt';

export interface OTSettings {
  policy: {
    officeTiming: {
      start: string;
      end: string;
    };
    shiftDurationHours: number;
    minThreshold: number;
    lateArrivalToggle: boolean;
    official: {
      dailyOTCap: number;
      maxDailyAmount: number;
      monthlyDayCap: number;
    };
    support: {
      dailyOTCap: number;
      maxDailyAmount: number;
      hourlyRate: number;
      holidayRate: number;
    };
    designationCategories: Record<string, EmployeeCategory>;
    designationRateTypes?: Record<string, 'fixed' | 'dynamic'>;
    /** Per-designation monthly-cap exemption. Only meaningful for fixed-rate designations. */
    designationCapExempt?: Record<string, boolean>;
    /**
     * Per-person overtime eligibility, keyed by ERP. Wins over the designation's category:
     *   'exempt'   → this person gets no overtime even if the designation is paid
     *   'included' → this person is paid even if the designation is exempt
     * A missing key means "follow the designation".
     */
    employeeEligibility?: Record<string, 'exempt' | 'included'>;
    /**
     * Holiday dates (dd-MMM-yyyy) already offered from an uploaded file. A file's own holiday
     * flags are copied into Settings once; after that Settings is the only source of truth, so a
     * holiday you remove stays removed when the same file is uploaded again.
     */
    fileHolidaysSeen?: string[];
    /**
     * Days left out of one person's pay, keyed by ERP (dates as dd-MMM-yyyy). The day still shows on
     * the dashboard (greyed, remark "Excluded") but counts toward no total and never reaches the PDF.
     */
    employeeExcludedDays?: Record<string, string[]>;
    roundingMode?: "floor" | "round";
  };
  appearance: {
    theme?: 'system' | 'light' | 'dark';
  };
  pdf: {
    tableFontSize: number;
    cellPadding: number;
    labelFontSize: number;
    pageSize: string;
    margin: number;
    summarySubject?: string;
    signatureLeft?: string;
    signatureRight?: string;
    sortByDesignation?: boolean;
    pdfExcludedDesignations?: string[];
  };
}

export interface ProcessedRecord {
  date: string;
  dayName: string;
  timeIn: string;
  timeOut: string;
  totalWorkedHours: number;
  workedHours: number;
  officeHours: number;
  officeTiming?: string;
  officeStart?: string;  // HH:MM, per-day override from source data
  officeEnd?: string;    // HH:MM, per-day override from source data
  otHours: number;
  adjustment: number;
  amount: number;
  remarks: string;
  isHoliday: boolean;
  /** Set true when this row was zeroed out by the monthly day cap. Used to filter from PDF. */
  exceededMonthlyCap?: boolean;
  /** This day was excluded for this employee in Settings: shown greyed, never counted or exported. */
  excluded?: boolean;
}

export interface ProcessedEmployee {
  erp: string;
  name: string;
  designation: string;
  category: EmployeeCategory;
  basicPay: number;
  records: ProcessedRecord[];
  totalOTHours: number;
  totalAmount: number;
  isSupport: boolean;
  rateType: 'fixed' | 'dynamic';
  hourlyRate?: number;
  dayRate?: number;
}