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
  officeTimings: Record<string, OfficeTiming>;
  employees: EmployeeRow[];
}

export interface Holiday {
  date: string; // dd-mm-yyyy
  name: string;
}

export type ColumnId = 'Worked (OT)' | 'Adjustment' | 'Office Timing' | 'Total Hours Worked';

export interface OTSettings {
  policy: {
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
      designations: string[];
    };
  };
  appearance: {
    fontSize: number;
    fontFamily: string;
    accentColor: string;
    visibleColumns: ColumnId[];
  };
  pdf: {
    tableFontSize: number;
    cellPadding: number;
    headerFontSize: number;
    labelFontSize: number;
    pageSize: string;
    margin: number;
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
  basicPay: number;
  records: ProcessedRecord[];
  totalOTHours: number;
  totalAmount: number;
  isSupport: boolean;
}
