/**
 * nlpParser.ts
 * Natural Language Parser for reminder creation
 * Extracts title, date/time, category, priority from voice commands
 */

import { formatDateTime, parseDateTime, ParsedDateTime } from './dateTimeParser';

export type ReminderCategory = 'personal' | 'work' | 'health' | 'finance' | 'shopping' | 'other';
export type ReminderPriority = 'low' | 'medium' | 'high';

export interface ParsedReminder {
  title: string;
  datetime?: Date;
  category?: ReminderCategory;
  priority?: ReminderPriority;
  description?: string;
  confidence: number; // 0-1, overall confidence in the parsing
  rawText: string; // Original text for debugging
}

/**
 * Main parser function
 * Extracts reminder details from natural language text
 */
export function parseReminderFromSpeech(text: string): ParsedReminder | null {
  const normalizedText = text.toLowerCase().trim();
  
  console.log('🔍 NLP Parser: Processing:', text);
  
  // Remove common trigger phrases to get the core content
  let cleanedText = removeReminderTriggers(normalizedText);
  
  // Extract priority
  const priority = extractPriority(cleanedText);
  if (priority.priority) {
    cleanedText = priority.cleanedText;
  }
  
  // Extract category
  const category = extractCategory(cleanedText);
  if (category.category) {
    cleanedText = category.cleanedText;
  }
  
  // Extract date/time
  const dateTimeResult = parseDateTime(cleanedText);
  if (dateTimeResult) {
    // Remove the matched date/time phrase from text to get the title
    cleanedText = cleanedText.replace(dateTimeResult.matched, '').trim();
  }
  
  // What's left should be the title/task
  const title = extractTitle(cleanedText);
  
  if (!title) {
    console.log('❌ NLP Parser: Could not extract title from:', text);
    return null;
  }
  
  // Calculate overall confidence
  const confidenceScore = calculateConfidence(title, dateTimeResult, priority.priority, category.category);
  
  const result: ParsedReminder = {
    title: title,
    datetime: dateTimeResult?.date,
    category: category.category,
    priority: priority.priority,
    confidence: confidenceScore,
    rawText: text
  };
  
  console.log('✅ NLP Parser: Extracted:', result);
  
  return result;
}

/**
 * Remove common reminder trigger phrases
 */
function removeReminderTriggers(text: string): string {
  const triggers = [
    /^set\s+(?:a\s+)?reminder\s+(?:for|to)\s+/i,
    /^create\s+(?:a\s+)?reminder\s+(?:for|to)\s+/i,
    /^add\s+(?:a\s+)?reminder\s+(?:for|to)\s+/i,
    /^remind\s+me\s+to\s+/i,
    /^reminder\s+(?:for|to)\s+/i,
    /^set\s+reminder\s+/i,
    /^make\s+(?:a\s+)?reminder\s+/i,
  ];
  
  let cleaned = text;
  for (const trigger of triggers) {
    cleaned = cleaned.replace(trigger, '');
  }
  
  return cleaned.trim();
}

/**
 * Extract priority from text
 */
function extractPriority(text: string): { priority?: ReminderPriority; cleanedText: string } {
  const priorityPatterns = [
    { pattern: /\b(?:urgent|important|critical|high\s+priority)\b/i, priority: 'high' as ReminderPriority },
    { pattern: /\b(?:medium\s+priority|normal)\b/i, priority: 'medium' as ReminderPriority },
    { pattern: /\b(?:low\s+priority|not\s+urgent)\b/i, priority: 'low' as ReminderPriority },
  ];
  
  for (const { pattern, priority } of priorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const cleanedText = text.replace(pattern, '').trim();
      return { priority, cleanedText };
    }
  }
  
  return { cleanedText: text };
}

/**
 * Extract category from text
 */
function extractCategory(text: string): { category?: ReminderCategory; cleanedText: string } {
  const categoryPatterns = [
    { pattern: /\b(?:work|office|meeting|project)\b/i, category: 'work' as ReminderCategory },
    { pattern: /\b(?:health|doctor|appointment|medicine|pill|medication|exercise|workout)\b/i, category: 'health' as ReminderCategory },
    { pattern: /\b(?:finance|financial|bill|payment|pay|bank)\b/i, category: 'finance' as ReminderCategory },
    { pattern: /\b(?:shopping|buy|purchase|grocery|groceries|store)\b/i, category: 'shopping' as ReminderCategory },
    { pattern: /\b(?:personal|home|family)\b/i, category: 'personal' as ReminderCategory },
  ];
  
  for (const { pattern, category } of categoryPatterns) {
    if (pattern.test(text)) {
      // Don't remove the matched text as it might be part of the title
      // e.g., "buy milk" - "buy" is both category indicator AND part of title
      return { category, cleanedText: text };
    }
  }
  
  return { cleanedText: text };
}

/**
 * Extract the title/task from cleaned text
 */
function extractTitle(text: string): string {
  // Remove common prepositions and connectors
  let title = text
    .replace(/\b(?:to|for|about|at|on|in)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Capitalize first letter
  if (title) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  // Limit length
  if (title.length > 100) {
    title = title.substring(0, 100).trim();
  }
  
  return title;
}

/**
 * Calculate overall confidence score
 */
function calculateConfidence(
  title: string, 
  dateTime?: ParsedDateTime | null, 
  priority?: ReminderPriority,
  category?: ReminderCategory
): number {
  let score = 0;
  
  // Title is required
  if (title && title.length >= 2) {
    score += 0.5;
  }
  
  // DateTime adds confidence
  if (dateTime) {
    score += dateTime.confidence * 0.3;
  } else {
    // No datetime is okay, we'll use default (1 hour from now)
    score += 0.2;
  }
  
  // Category adds small confidence
  if (category) {
    score += 0.1;
  }
  
  // Priority adds small confidence
  if (priority) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Generate a human-readable description of what was parsed
 */
export function describeReminder(parsed: ParsedReminder): string {
  const parts: string[] = [];
  
  parts.push(`"${parsed.title}"`);
  
  if (parsed.datetime) {
    parts.push(`at ${formatDateTime(parsed.datetime)}`);
  }
  
  if (parsed.priority && parsed.priority !== 'medium') {
    parts.push(`(${parsed.priority} priority)`);
  }
  
  if (parsed.category) {
    parts.push(`[${parsed.category}]`);
  }
  
  return parts.join(' ');
}

/**
 * Validate if the parsed reminder is complete enough to create
 */
export function isValidParsedReminder(parsed: ParsedReminder): boolean {
  // Must have a title
  if (!parsed.title || parsed.title.length < 2) {
    return false;
  }
  
  // Confidence must be above threshold
  if (parsed.confidence < 0.5) {
    return false;
  }
  
  // If datetime is provided, it should be in the future
  if (parsed.datetime && parsed.datetime <= new Date()) {
    return false;
  }
  
  return true;
}

/**
 * Common examples for user guidance
 */
export const REMINDER_EXAMPLES = [
  "Set reminder for food at 5 pm",
  "Remind me to buy milk tomorrow at 9 am",
  "Create reminder call mom next Monday",
  "Add urgent reminder meeting in 2 hours",
  "Set work reminder project deadline Friday at 3 pm",
  "Remind me to take medicine at 8 pm",
  "Create shopping reminder groceries tomorrow",
];

/**
 * Get help text for voice commands
 */
export function getReminderHelpText(): string {
  return `You can say things like:
  
• "Set reminder for [task] at [time]"
• "Remind me to [task] [when]"
• "Create [priority] reminder [task] [when]"

Examples:
• "Set reminder for food at 5 pm"
• "Remind me to buy milk tomorrow"
• "Create urgent reminder meeting in 2 hours"`;
}