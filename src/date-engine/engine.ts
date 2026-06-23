export interface ExactAge {
  years?: number;
  months?: number;
  days: number;
  weeks: number;
  daysInWeek: number;
  totalDays: number;
  totalWeeks: number;
  totalMonths?: number;
  totalHours?: number;
  totalMinutes?: number;
  isYearUnknown: boolean;
}

export interface NextAnniversary {
  date: Date;
  dateStr: string;
  dayOfWeek: string;
  daysRemaining: number;
  monthsRemaining: number;
  daysOnlyRemaining: number;
  anniversaryNumber?: number; // Turns X on next birthday
}

export interface LinkedPersonEventDetails {
  personAgeAtEvent?: ExactAge;
  eventAge: ExactAge;
  timeSinceEventStr: string;
}

// Helper to check if a year is a leap year
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Local date parsing to avoid timezone-shifting issues
export function parseLocalDate(dateStr: string): {
  year: number | null;
  month: number; // 1-indexed
  day: number;
  precision: 'full' | 'month-day' | 'year' | 'approximate';
} {
  const clean = dateStr.trim();

  const isValidMonthDay = (month: number, day: number, year: number | null = null): boolean => {
    if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) {
      return false;
    }

    // Month-day-only dates should allow Feb 29 because a leap year may be supplied later.
    const validationYear = year ?? 2000;
    return day <= new Date(validationYear, month, 0).getDate();
  };

  const safeMonthDay = (month: number, day: number, year: number | null = null) => {
    if (isValidMonthDay(month, day, year)) return { month, day };
    return { month: 1, day: 1 };
  };
  const ymdRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const mdRegex = /^(\d{2})-(\d{2})$/;
  const yRegex = /^(\d{4})$/;

  if (ymdRegex.test(clean)) {
    const [, yStr, mStr, dStr] = clean.match(ymdRegex)!;
    const year = parseInt(yStr, 10);
    const { month, day } = safeMonthDay(parseInt(mStr, 10), parseInt(dStr, 10), year);
    return {
      year,
      month,
      day,
      precision: month === 1 && day === 1 && (mStr !== '01' || dStr !== '01') ? 'approximate' : 'full',
    };
  } else if (mdRegex.test(clean)) {
    const [, mStr, dStr] = clean.match(mdRegex)!;
    const { month, day } = safeMonthDay(parseInt(mStr, 10), parseInt(dStr, 10));
    return {
      year: null,
      month,
      day,
      precision: month === 1 && day === 1 && (mStr !== '01' || dStr !== '01') ? 'approximate' : 'month-day',
    };
  } else if (yRegex.test(clean)) {
    const [, yStr] = clean.match(yRegex)!;
    return {
      year: parseInt(yStr, 10),
      month: 1,
      day: 1,
      precision: 'year',
    };
  }

  // Fallback / Approximate
  const parts = clean.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10) || 2000;
    const { month, day } = safeMonthDay(parseInt(parts[1], 10), parseInt(parts[2], 10), year);
    return {
      year,
      month,
      day,
      precision: 'approximate',
    };
  } else if (parts.length === 2) {
    const { month, day } = safeMonthDay(parseInt(parts[0], 10), parseInt(parts[1], 10));
    return {
      year: null,
      month,
      day,
      precision: month === 1 && day === 1 ? 'approximate' : 'month-day',
    };
  }

  return { year: null, month: 1, day: 1, precision: 'approximate' };
}

// Re-serialize a parsed date back to displayable/standard string
export function formatDateLabel(
  dateStr: string,
  precision: 'full' | 'month-day' | 'year' | 'approximate'
): string {
  const parsed = parseLocalDate(dateStr);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const mName = months[parsed.month - 1] || '';

  if (precision === 'month-day' || parsed.year === null) {
    return `${mName} ${parsed.day}`;
  }
  if (precision === 'year') {
    return `${parsed.year} (Year only)`;
  }
  
  return `${mName} ${parsed.day}, ${parsed.year}`;
}

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export function getOriginalDayOfWeek(dateStr: string): string {
  const parsed = parseLocalDate(dateStr);
  if (parsed.year === null) return 'Unknown';
  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  return DAYS_OF_WEEK[d.getDay()];
}

// Main age calculator function
export function calculateExactAge(
  dateStr: string,
  nowLocal: Date = new Date(),
  birthTime?: string, // e.g. "14:30"
  leapYearPreference: 'feb28' | 'mar1' = 'mar1'
): ExactAge {
  const parsed = parseLocalDate(dateStr);
  const isYearUnknown = parsed.year === null;

  // Let's create current date components local to browser
  const currentYear = nowLocal.getFullYear();
  const currentMonth = nowLocal.getMonth() + 1; // 1-indexed
  const currentDay = nowLocal.getDate();

  // If year is unknown, choose a dummy year (like current year) just for week/total days calculations,
  // but flag isYearUnknown as true.
  const startYear = isYearUnknown ? currentYear - 1 : parsed.year!;
  
  const startDate = new Date(startYear, parsed.month - 1, parsed.day);
  if (birthTime) {
    const [h, m] = birthTime.split(':').map(Number);
    const hours = Number.isInteger(h) && h >= 0 && h <= 23 ? h : 0;
    const minutes = Number.isInteger(m) && m >= 0 && m <= 59 ? m : 0;
    startDate.setHours(hours, minutes, 0, 0);
  } else {
    startDate.setHours(0, 0, 0, 0);
  }

  // Calculate total seconds and absolute times
  const totalMs = nowLocal.getTime() - startDate.getTime();
  const totalDays = Math.max(0, Math.floor(totalMs / (1000 * 60 * 60 * 24)));
  const totalWeeks = Math.floor(totalDays / 7);
  const daysInWeek = totalDays % 7;
  
  let totalHours: number | undefined;
  let totalMinutes: number | undefined;
  if (birthTime) {
    totalHours = Math.max(0, Math.floor(totalMs / (1000 * 60 * 60)));
    totalMinutes = Math.max(0, Math.floor(totalMs / (1000 * 60)));
  }

  if (isYearUnknown) {
    return {
      days: totalDays % 30, // rough representation
      weeks: totalWeeks,
      daysInWeek,
      totalDays,
      totalWeeks,
      isYearUnknown: true,
    };
  }

  if (totalMs <= 0) {
    return {
      years: 0,
      months: 0,
      days: 0,
      weeks: 0,
      daysInWeek: 0,
      totalDays: 0,
      totalWeeks: 0,
      totalMonths: 0,
      totalHours,
      totalMinutes,
      isYearUnknown: false,
    };
  }

  // Multi-unit calendar precise calculation
  let years = currentYear - startYear;
  let months = currentMonth - parsed.month;
  let days = currentDay - parsed.day;

  if (days < 0) {
    // Borrow days from previous month
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 0);
    days += prevMonthDate.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  // Calculate total months
  const totalMonths = Math.max(0, years * 12 + months);

  return {
    years,
    months,
    days,
    weeks: totalWeeks,
    daysInWeek,
    totalDays,
    totalWeeks,
    totalMonths,
    totalHours,
    totalMinutes,
    isYearUnknown: false,
  };
}

// Next Anniversary / Countdown calculation
export function calculateNextAnniversary(
  dateStr: string,
  nowLocal: Date = new Date(),
  leapYearPreference: 'feb28' | 'mar1' = 'mar1'
): NextAnniversary {
  const parsed = parseLocalDate(dateStr);
  const currentYear = nowLocal.getFullYear();
  
  // Create current date at midnight for direct comparison
  const todayMidnight = new Date(currentYear, nowLocal.getMonth(), nowLocal.getDate());
  
  // Decide next anniversary year
  let targetYear = currentYear;
  
  // Handle Leap Day (Feb 29)
  let targetMonth = parsed.month - 1;
  let targetDay = parsed.day;

  function adjustLeapDay(year: number) {
    if (parsed.month === 2 && parsed.day === 29) {
      if (!isLeapYear(year)) {
        if (leapYearPreference === 'feb28') {
          targetMonth = 1; // February
          targetDay = 28;
        } else {
          targetMonth = 2; // March
          targetDay = 1;
        }
      } else {
        targetMonth = 1;
        targetDay = 29;
      }
    } else {
      targetMonth = parsed.month - 1;
      targetDay = parsed.day;
    }
  }

  adjustLeapDay(targetYear);
  let anniversaryDate = new Date(targetYear, targetMonth, targetDay);

  // If anniversary has already occurred today or earlier this year, push to next year
  if (anniversaryDate.getTime() < todayMidnight.getTime()) {
    targetYear++;
    adjustLeapDay(targetYear);
    anniversaryDate = new Date(targetYear, targetMonth, targetDay);
  }

  // Total days until target anniversary
  const diffMs = anniversaryDate.getTime() - todayMidnight.getTime();
  const daysOnlyRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Months and days remaining calculation
  let monthsRemaining = anniversaryDate.getMonth() - nowLocal.getMonth();
  let daysRemaining = anniversaryDate.getDate() - nowLocal.getDate();

  if (daysRemaining < 0) {
    const prevMonthDate = new Date(anniversaryDate.getFullYear(), anniversaryDate.getMonth(), 0);
    daysRemaining += prevMonthDate.getDate();
    monthsRemaining--;
  }
  if (monthsRemaining < 0) {
    monthsRemaining += 12;
  }

  // Calculate anniversary index/count (e.g. will turn 6)
  let anniversaryNumber: number | undefined;
  if (parsed.year !== null) {
    anniversaryNumber = targetYear - parsed.year;
  }

  const dateStrFormatted = `${anniversaryDate.getFullYear()}-${String(anniversaryDate.getMonth() + 1).padStart(2, '0')}-${String(anniversaryDate.getDate()).padStart(2, '0')}`;
  const dayOfWeek = DAYS_OF_WEEK[anniversaryDate.getDay()];

  return {
    date: anniversaryDate,
    dateStr: dateStrFormatted,
    dayOfWeek,
    daysRemaining,
    monthsRemaining,
    daysOnlyRemaining,
    anniversaryNumber,
  };
}

// Calculate details for an event linked to a person
export function calculateLinkedPersonEvent(
  personDobStr: string,
  eventDateStr: string,
  nowLocal: Date = new Date()
): LinkedPersonEventDetails {
  const parsedPerson = parseLocalDate(personDobStr);
  const parsedEvent = parseLocalDate(eventDateStr);

  let personAgeAtEvent: ExactAge | undefined;
  if (parsedPerson.year !== null && parsedEvent.year !== null) {
    // Generate the exact date of the event local midnight
    const eventDate = new Date(parsedEvent.year, parsedEvent.month - 1, parsedEvent.day);
    personAgeAtEvent = calculateExactAge(personDobStr, eventDate);
  }

  const eventAge = calculateExactAge(eventDateStr, nowLocal);

  let timeSinceEventStr = '';
  if (eventAge.isYearUnknown) {
    timeSinceEventStr = `${eventAge.totalDays} days ago`;
  } else {
    timeSinceEventStr = `${eventAge.years} years, ${eventAge.months} months, ${eventAge.days} days ago`;
  }

  return {
    personAgeAtEvent,
    eventAge,
    timeSinceEventStr,
  };
}
