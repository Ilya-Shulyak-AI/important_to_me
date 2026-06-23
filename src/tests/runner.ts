import { calculateExactAge, calculateNextAnniversary, parseLocalDate, isLeapYear } from '../date-engine/engine';
import { db } from '../database/db';
import type { Person, Event } from '../models/types';

export interface TestResult {
  title: string;
  status: 'passed' | 'failed';
  message: string;
}

export async function runAllDiagnostics(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Helper assertions
  const assert = (title: string, condition: boolean, message: string = '') => {
    results.push({
      title,
      status: condition ? 'passed' : 'failed',
      message: condition ? 'Assertion passed.' : `Failed: ${message}`
    });
  };

  try {
    // 1. Exact age calculations
    const birthDate = '1995-10-15';
    const testDate = new Date(2026, 9, 15); // Oct 15, 2026 is exactly 31 years old
    const age = calculateExactAge(birthDate, testDate);
    assert('Exact age calculation - 1', age.years === 31, `Expected 31 years, got ${age.years}`);
    assert('Exact age calculation - 2', age.months === 0, `Expected 0 months, got ${age.months}`);
    assert('Exact age calculation - 3', age.days === 0, `Expected 0 days, got ${age.days}`);

    // Mid-month
    const testDateMid = new Date(2026, 11, 25); // Dec 25, 2026
    const ageMid = calculateExactAge(birthDate, testDateMid);
    // 1995-10-15 to 2026-12-25 -> 31 years, 2 months, 10 days
    assert('Exact age calculation - mid month - years', ageMid.years === 31, `Expected 31, got ${ageMid.years}`);
    assert('Exact age calculation - mid month - months', ageMid.months === 2, `Expected 2, got ${ageMid.months}`);
    assert('Exact age calculation - mid month - days', ageMid.days === 10, `Expected 10, got ${ageMid.days}`);

    // 2. Month boundary calculations
    const boundaryBirth = '2020-01-31';
    const boundaryCheck = new Date(2020, 1, 29); // Feb 29, 2020
    const ageBoundary = calculateExactAge(boundaryBirth, boundaryCheck);
    // Jan 31, 2020 to Feb 29, 2020 should be exactly 0 years, 0 months, 29 days
    assert('Month boundary calculation', ageBoundary.days === 29 && ageBoundary.months === 0, `Expected 29 days, got ${ageBoundary.months}mo ${ageBoundary.days}d`);

    // 3. Leap years
    assert('Leap Year detection - 2000', isLeapYear(2000) === true, '2000 is a leap year');
    assert('Leap Year detection - 2100', isLeapYear(2100) === false, '2100 is NOT a leap year');
    assert('Leap Year detection - 2024', isLeapYear(2024) === true, '2024 is a leap year');

    // 4. February 29 behavior
    const leapBirth = '2024-02-29';
    // Match non-leap year target 2025
    const annivFeb28 = calculateNextAnniversary(leapBirth, new Date(2025, 0, 1), 'feb28');
    assert('Feb 29 next anniversary (Preference: Feb 28)', annivFeb28.date.getMonth() === 1 && annivFeb28.date.getDate() === 28, `Expected Feb 28, got ${annivFeb28.dateStr}`);
    const annivMar1 = calculateNextAnniversary(leapBirth, new Date(2025, 0, 1), 'mar1');
    assert('Feb 29 next anniversary (Preference: March 1)', annivMar1.date.getMonth() === 2 && annivMar1.date.getDate() === 1, `Expected March 1, got ${annivMar1.dateStr}`);

    // 5. Birthdays today
    const bDayTodayStr = '1990-06-22';
    const refToday = new Date(2026, 5, 22); // June 22, 2026
    const annivToday = calculateNextAnniversary(bDayTodayStr, refToday);
    assert('Birthday today (June 22) next recurrence check', annivToday.daysOnlyRemaining === 0, `Expected 0 days remaining, got ${annivToday.daysOnlyRemaining}`);

    // 6. Events tomorrow
    const bDayTomorrowStr = '1990-06-23';
    const annivTomorrow = calculateNextAnniversary(bDayTomorrowStr, refToday);
    assert('Event tomorrow countdown check', annivTomorrow.daysOnlyRemaining === 1, `Expected 1 day remaining, got ${annivTomorrow.daysOnlyRemaining}`);

    // 7. Events in the past
    // Let's verify event-age calculation for an event that happened before 1970
    const pastEventStr = '1955-03-12';
    const pastAge = calculateExactAge(pastEventStr, new Date(2026, 5, 22));
    assert('Event in the past (before 1970) duration check', (pastAge.years || 0) > 70, `Expected years > 70, got ${pastAge.years}`);

    // 8. Future events
    const futureEventStr = '2028-12-25';
    const futureAge = calculateExactAge(futureEventStr, new Date(2026, 5, 22));
    assert('Future event age calculation is safe', futureAge.totalDays === 0, 'Future event total days elapsed is zero');

    // 9. Missing times
    const ageNoTime = calculateExactAge('1990-06-22', refToday);
    assert('Missing times - fallback parameters', ageNoTime.totalHours === undefined, 'No hour is computed when time is omitted');

    const ageWithTime = calculateExactAge('1990-06-22', new Date(2026, 5, 22, 12, 0), '10:00');
    assert('Specified times - parameter parsed', ageWithTime.totalHours !== undefined && ageWithTime.totalHours > 0, 'Hours are calculated when time is specified');

    // 10. Partial dates
    const partialDateStr = '08-15'; // MM-DD without year
    const partialParsed = parseLocalDate(partialDateStr);
    assert('Partial Date parsing - null year', partialParsed.year === null, 'Year is null');
    assert('Partial Date parsing - month', partialParsed.month === 8, 'Month is 8');
    assert('Partial Date parsing - day', partialParsed.day === 15, 'Day is 15');

    const invalidFullDate = parseLocalDate('2023-02-29');
    assert(
      'Invalid full date parsing is normalized',
      invalidFullDate.precision === 'approximate' && invalidFullDate.month === 1 && invalidFullDate.day === 1,
      `Expected invalid 2023-02-29 to normalize to approximate Jan 1, got ${invalidFullDate.month}-${invalidFullDate.day}`
    );

    const invalidMonthDay = parseLocalDate('13-45');
    assert(
      'Invalid partial date parsing is normalized',
      invalidMonthDay.precision === 'approximate' && invalidMonthDay.month === 1 && invalidMonthDay.day === 1,
      `Expected invalid 13-45 to normalize to approximate Jan 1, got ${invalidMonthDay.month}-${invalidMonthDay.day}`
    );

    const futureEventStrWithUnits = '2028-12-25';
    const futureAgeWithUnits = calculateExactAge(futureEventStrWithUnits, new Date(2026, 5, 22));
    assert(
      'Future event age calendar units are safe',
      futureAgeWithUnits.years === 0 && futureAgeWithUnits.months === 0 && futureAgeWithUnits.days === 0,
      `Expected future event calendar units to be zero, got ${futureAgeWithUnits.years}y ${futureAgeWithUnits.months}m ${futureAgeWithUnits.days}d`
    );

    // 11. Database integration check (creating person, event, and querying)
    const testPersonId = 'test-diagnostic-person';
    const testPerson: Person = {
      id: testPersonId,
      firstName: 'Testy',
      lastName: 'McTest',
      displayName: 'Diagnostic Test Box',
      dob: '2015-05-15',
      dobPrecision: 'full',
      isFavorite: true,
      groups: ['test-group'],
      tags: ['alert'],
      customFields: [{ id: 'f1', label: 'T-Shirt Size', value: 'M' }],
      createdDate: Date.now(),
      lastUpdatedDate: Date.now(),
    };

    await db.people.put(testPerson);
    const retrieved = await db.people.get(testPersonId);
    assert('Database Write & Read', retrieved !== undefined && retrieved.firstName === 'Testy', 'Person written and retrieved successfully');

    await db.people.delete(testPersonId);
    const emptyRetrieved = await db.people.get(testPersonId);
    assert('Database Delete', emptyRetrieved === undefined, 'Person correctly deleted from store');

  } catch (error: any) {
    results.push({
      title: 'Global Diagnostic Runner Status',
      status: 'failed',
      message: `System crashed with error: ${error.message}`
    });
  }

  return results;
}
