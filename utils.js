// utils.js


export const BASIC_PAY = {
    13748: 36500, 15095: 28140, 26269: 24120, 26334: 46120, 26429: 29760, 26930: 26480,
    30557: 35680, 33340: 30870, 33342: 29950, 33344: 34510, 49231: 17548, 70190: 12419,
};

const SPECIAL_HOLIDAYS = [
    '06-Jun-2025',
    '09-Jun-2025',
];

const MONTHS = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

export function parseDate(dateStr) {
    const [day, mon, year] = dateStr.split('-');
    return new Date(year, MONTHS[mon], day);
}

export function isHoliday(d) {
    return SPECIAL_HOLIDAYS.includes(d) || [0, 6].includes(parseDate(d).getDay());
}

export function hhmmToNum(hm) {
    const [h, m] = hm.split(':').map(Number);
    return h * 100 + m;
}

export function numToHHMM(num) {
    const h = Math.floor(num / 100);
    const m = num % 100;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function toMinutes(hhmm) {
    const hours = Math.floor(hhmm / 100);
    const minutes = hhmm % 100;
    return hours * 60 + minutes;
}

export function roundToHours(mins) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return hrs + (rem >= 54 ? 1 : 0);
}

export function toSentenseCase(str) {
    if (typeof str !== 'string' || !str) return;
    return str
        .toLowerCase().split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function getMonthYear(dates) {
    const [day, mon] = dates[0].split('-');
    const year = '2025';

    const dateObj = new Date(`${year}-${mon}-${day}`);
    const fullMonth = dateObj.toLocaleString('en-US', { month: 'long' });
    return `${fullMonth} ${year}`;
}

export function buttonShake(button) {
    button.classList.add('error');
    setTimeout(function () {
        button.classList.remove('error');
    }, 1000);
}