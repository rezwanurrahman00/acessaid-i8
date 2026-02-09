/**
 * dateTimeParser.ts
 * Converts natural language date/time phrases into Date objects
 * Supports: "5 pm", "tomorrow at 9 am", "next Monday", "in 2 hours", etc.
 */

export interface ParsedDateTime {
  date: Date;
  confidence: number; // 0-1, how confident we are in the parsing
  matched: string; // What part of the text was matched
}

/**
 * Main function to parse date/time from natural language text
 */
export function parseDateTime(text: string, referenceDate: Date = new Date()): ParsedDateTime | null {
  const normalizedText = text.toLowerCase().trim();
  
  // Try different parsing strategies in order of specificity
  const parsers = [
    parseSpecificDateTime,      // "tomorrow at 9 am", "next Monday at 3 pm"
    parseRelativeTime,          // "in 2 hours", "in 30 minutes"
    parseTimeOnly,              // "at 5 pm", "5:30 pm"
    parseDateOnly,              // "tomorrow", "next Monday", "next week"
  ];

  for (const parser of parsers) {
    const result = parser(normalizedText, referenceDate);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Parse specific date + time combinations
 * Examples: "tomorrow at 9 am", "next Monday at 3 pm", "Feb 8 at 2:30 pm", "day after tomorrow at 5 pm"
 */
function parseSpecificDateTime(text: string, referenceDate: Date): ParsedDateTime | null {
  // Pattern: [date phrase] at [time]
  const patterns = [
    /(?:tomorrow|tmrw)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
    /(?:day after tomorrow|overmorrow)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
    /(?:today)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
    /(?:next\s+)?(?:monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
    /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Extract date part
      const dateResult = parseDateOnly(text, referenceDate);
      if (!dateResult) continue;

      // For month-day patterns, extract time from different positions
      let hour, minute, isPM;
      if (match[0].match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
        // Month-day pattern: match groups are [fullMatch, month, day, hour, minute?, ampm]
        hour = parseInt(match[3]);
        minute = match[4] ? parseInt(match[4]) : 0;
        isPM = match[5]?.toLowerCase() === 'pm';
      } else {
        // Other patterns: match groups are [fullMatch, hour, minute?, ampm]
        hour = parseInt(match[1]);
        minute = match[2] ? parseInt(match[2]) : 0;
        isPM = match[3]?.toLowerCase() === 'pm';
      }
      
      const finalHour = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
      
      const resultDate = new Date(dateResult.date);
      resultDate.setHours(finalHour, minute, 0, 0);
      
      return {
        date: resultDate,
        confidence: 0.95,
        matched: match[0]
      };
    }
  }

  return null;
}

/**
 * Parse relative time phrases
 * Examples: "in 2 hours", "in 30 minutes", "in 1 hour"
 */
function parseRelativeTime(text: string, referenceDate: Date): ParsedDateTime | null {
  const patterns = [
    { regex: /in\s+(\d+)\s+hours?/i, unit: 'hours' },
    { regex: /in\s+(\d+)\s+minutes?/i, unit: 'minutes' },
    { regex: /in\s+(\d+)\s+days?/i, unit: 'days' },
  ];

  for (const { regex, unit } of patterns) {
    const match = text.match(regex);
    if (match) {
      const amount = parseInt(match[1]);
      const resultDate = new Date(referenceDate);
      
      switch (unit) {
        case 'hours':
          resultDate.setHours(resultDate.getHours() + amount);
          break;
        case 'minutes':
          resultDate.setMinutes(resultDate.getMinutes() + amount);
          break;
        case 'days':
          resultDate.setDate(resultDate.getDate() + amount);
          break;
      }
      
      return {
        date: resultDate,
        confidence: 0.9,
        matched: match[0]
      };
    }
  }

  return null;
}

/**
 * Parse time-only phrases (assumes today)
 * Examples: "at 5 pm", "5:30 pm", "at 9 am"
 */
function parseTimeOnly(text: string, referenceDate: Date): ParsedDateTime | null {
  // Pattern: [at] HH[:MM] am/pm
  const pattern = /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
  const match = text.match(pattern);
  
  if (match) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    const isPM = match[3].toLowerCase() === 'pm';
    
    const finalHour = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
    
    const resultDate = new Date(referenceDate);
    resultDate.setHours(finalHour, minute, 0, 0);
    
    // If the time has already passed today, assume tomorrow
    if (resultDate <= referenceDate) {
      resultDate.setDate(resultDate.getDate() + 1);
    }
    
    return {
      date: resultDate,
      confidence: 0.85,
      matched: match[0]
    };
  }

  return null;
}

/**
 * Parse date-only phrases (assumes 9 AM default time)
 * Examples: "tomorrow", "next Monday", "next week", "day after tomorrow", "Feb 8", "February 29"
 */
function parseDateOnly(text: string, referenceDate: Date): ParsedDateTime | null {
  const resultDate = new Date(referenceDate);
  resultDate.setHours(9, 0, 0, 0); // Default to 9 AM
  
  // Today
  if (/\btoday\b/i.test(text)) {
    return {
      date: resultDate,
      confidence: 0.8,
      matched: 'today'
    };
  }
  
  // Tomorrow
  if (/\b(?:tomorrow|tmrw)\b/i.test(text)) {
    resultDate.setDate(resultDate.getDate() + 1);
    return {
      date: resultDate,
      confidence: 0.9,
      matched: 'tomorrow'
    };
  }

  // Day after tomorrow
  if (/\b(?:day after tomorrow|overmorrow)\b/i.test(text)) {
    resultDate.setDate(resultDate.getDate() + 2);
    return {
      date: resultDate,
      confidence: 0.9,
      matched: 'day after tomorrow'
    };
  }
  
  // Next week
  if (/\bnext\s+week\b/i.test(text)) {
    resultDate.setDate(resultDate.getDate() + 7);
    return {
      date: resultDate,
      confidence: 0.75,
      matched: 'next week'
    };
  }

  // Specific month and day (e.g., "Feb 8", "February 29", "March 15")
  const monthDayMatch = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i);
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2]);
    const month = getMonthNumber(monthName);
    
    if (month !== -1 && day >= 1 && day <= 31) {
      const targetDate = new Date(referenceDate);
      targetDate.setMonth(month);
      targetDate.setDate(day);
      targetDate.setHours(9, 0, 0, 0);
      
      // If the date has already passed this year, set it for next year
      if (targetDate < referenceDate) {
        targetDate.setFullYear(targetDate.getFullYear() + 1);
      }
      
      return {
        date: targetDate,
        confidence: 0.9,
        matched: monthDayMatch[0]
      };
    }
  }
  
  // Day of week
  const dayMatch = text.match(/\b(?:next\s+)?(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\b/i);
  if (dayMatch) {
    const dayName = dayMatch[1].toLowerCase();
    const targetDay = getDayOfWeekNumber(dayName);
    const currentDay = referenceDate.getDay();
    
    let daysToAdd = targetDay - currentDay;
    
    // If "next" is specified or the day has passed this week, go to next week
    if (text.includes('next') || daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    resultDate.setDate(resultDate.getDate() + daysToAdd);
    
    return {
      date: resultDate,
      confidence: 0.85,
      matched: dayMatch[0]
    };
  }
  
  return null;
}

/**
 * Convert month name to number (0-11)
 */
function getMonthNumber(monthName: string): number {
  const months: { [key: string]: number } = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11,
  };
  
  return months[monthName.toLowerCase()] ?? -1;
}

/**
 * Convert day name to number (0 = Sunday, 6 = Saturday)
 */
function getDayOfWeekNumber(dayName: string): number {
  const days: { [key: string]: number } = {
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
  };
  
  return days[dayName.toLowerCase()] ?? 1; // Default to Monday
}

/**
 * Format a date for display
 */
export function formatDateTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  if (isToday) {
    return `today at ${timeStr}`;
  } else if (isTomorrow) {
    return `tomorrow at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric' 
    });
    return `${dateStr} at ${timeStr}`;
  }
}

/**
 * Helper to validate if parsed date is reasonable (not in past, not too far future)
 */
export function isReasonableDate(date: Date, referenceDate: Date = new Date()): boolean {
  const oneYearFromNow = new Date(referenceDate);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  
  // Allow dates within 1 year from now
  return date >= referenceDate && date <= oneYearFromNow;
}