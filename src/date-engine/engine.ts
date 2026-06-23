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
  const ymdRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const mdRegex = /^(\d{2})-(\d{2})$/;
  const yRegex = /^(\d{4})$/;

  if (ymdRegex.test(clean)) {
    const [, yStr, mStr, dStr] = clean.match(ymdRegex)!;
    return {
      year: parseInt(yStr, 10),
      month: parseInt(mStr, 10),
      day: parseInt(dStr, 10),
      precision: 'full',
    };
  } else if (mdRegex.test(clean)) {
    const [, mStr, dStr] = clean.match(mdRegex)!;
    return {
      year: null,
      month: parseInt(mStr, 10),
      day: parseInt(dStr, 10),
      precision: 'month-day',
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
    return {
      year: parseInt(parts[0], 10) || 2000,
      month: parseInt(parts[1], 10) || 1,
      day: parseInt(parts[2], 10) || 1,
      precision: 'approximate',
    };
  } else if (parts.length === 2) {
    return {
      year: null,
      month: parseInt(parts[0], 10) || 1,
      day: parseInt(parts[1], 10) || 1,
      precision: 'month-day',
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
    startDate.setHours(h || 0, m || 0, 0, 0);
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

  const eventIsDone = new Date(eventDateStr).getTime() <= nowLocal.getTime();
  
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
