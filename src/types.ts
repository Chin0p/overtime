export interface OfficeTiming {
  start: string;
  end: string;
  durationHours: number;
}

export interface AttendanceCell {
  timeIn: string;
  timeOut: string;
}

export interface EmployeeRow {
  erp: string;
  name: string;
  designation: string;
  attendance: Record<string, AttendanceCell>;
}

export interface ParsedCSV {
  dates: string[];
  employees: EmployeeRow[];
}

export interface Holiday {
  date: string; // dd-mm-yyyy
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
      designations?: string[]; // Deprecated, keep for backwards compatibility if needed
    };
    designationCategories: Record<string, EmployeeCategory>;
    designationRateTypes?: Record<string, 'fixed' | 'dynamic'>;
    roundingMode?: "floor" | "round";
  };
  appearance: {
    fontSize: number;
    fontFamily: string;
    accentColor: string;
    theme?: 'system' | 'light' | 'dark';
  };
  pdf: {
    tableFontSize: number;
    cellPadding: number;
    headerFontSize: number;
    labelFontSize: number;
    pageSize: string;
    margin: number;
    headerTitle?: string;
    branchName?: string;
    summarySubject?: string;
    signatureLeft?: string;
    signatureRight?: string;
    sortByDesignation?: boolean;
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
  otHours: number;
  adjustment: number;
  amount: number;
  remarks: string;
  isHoliday: boolean;
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
}
