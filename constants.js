// constants.js

export const WORK_START_TIME = 830;
export const WORK_END_TIME = 1630;
export const MAX_HOLIDAY_HOURS = 8;
export const MAX_WORKING_DAYS = 12;

export const paragraph = `Late sitting is submitted for above mentioned employee for the duty performed by him/her\nin addition to normal duty hours for the month of`;
export const HEADER = 'National Database and Registration Authority\nMinistry of Interior\nRegional Head Office Islamabad';
export const LEFT_MARGIN = 20;
export const RIGHT_MARGIN = 20;
export const TOP_MARGIN = 20;
export const BOTTOM_MARGIN = 20;


export const labelProps = [
    { label: 'ERP:', prop: 'erp' },
    { label: 'Name:', prop: 'name' },
    { label: 'Designation:', prop: 'designation' },
    { label: 'Basic Pay:', prop: 'basicPay' },
    { label: 'Rate/Day:', prop: 'ratePerHoliday' },
    { label: 'Rate/Hour:', prop: 'ratePerHour' },
    { label: 'Max Rate/Day:', prop: 'maxRatePerWorkingDay' }
];

export const noBasicLabelOverrides = {
    ratePerHour: 'Rate Per Hour:',
    ratePerHoliday: 'Rate Per Holiday:',
    maxRatePerWorkingDay: 'Max Rate Per Day:'
};