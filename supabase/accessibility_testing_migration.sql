-- ============================================================
-- AccessAid: User Testing & Accessibility Feedback Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. accessibility_feedback: General feedback from user testing sessions
CREATE TABLE IF NOT EXISTS accessibility_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Who is testing
  disability_category TEXT NOT NULL CHECK (disability_category IN (
    'visual_impairment', 'mobility_impairment', 'hearing_impairment',
    'cognitive_disability', 'elderly', 'multiple_disabilities', 'no_disability', 'prefer_not_to_say'
  )),
  -- What feature was tested
  feature_tested TEXT NOT NULL CHECK (feature_tested IN (
    'reminders', 'voice_commands', 'ocr_camera', 'ai_assistant',
    'community', 'check_in', 'accessible_places', 'medication_tracker',
    'emergency_card', 'profile_settings', 'onboarding', 'general'
  )),
  -- Feedback content
  what_worked TEXT,
  what_didnt_work TEXT,
  suggestions TEXT,
  -- Ratings (1-5)
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  ease_of_use INTEGER CHECK (ease_of_use BETWEEN 1 AND 5),
  accessibility_rating INTEGER CHECK (accessibility_rating BETWEEN 1 AND 5),
  -- Testing context
  testing_method TEXT CHECK (testing_method IN ('remote', 'in_person', 'self_testing')),
  device_type TEXT,
  assistive_tech_used TEXT, -- screen reader, switch control, etc.
  -- Voice feedback (base64 or URL)
  voice_feedback_url TEXT,
  -- Metadata
  session_id TEXT, -- groups feedback from same session
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. accessibility_issues: "Report Issue" submissions
CREATE TABLE IF NOT EXISTS accessibility_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'screen_reader_incompatible', 'too_small_touch_target', 'low_contrast',
    'missing_label', 'voice_command_failed', 'tts_not_working',
    'navigation_blocked', 'content_unreadable', 'crash_or_error', 'other'
  )),
  screen_name TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  wcag_criterion TEXT, -- e.g. "1.4.3 Contrast", "4.1.2 Name, Role, Value"
  screenshot_url TEXT,
  device_info TEXT,
  app_version TEXT,
  status TEXT CHECK (status IN ('open', 'in_review', 'resolved', 'wont_fix')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. usability_ratings: Quick per-task ratings
CREATE TABLE IF NOT EXISTS usability_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,        -- e.g. "Create reminder by voice"
  screen_name TEXT NOT NULL,
  success BOOLEAN NOT NULL,       -- did the user complete the task?
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5), -- 1=very easy, 5=very hard
  time_seconds INTEGER,           -- how long it took
  error_count INTEGER DEFAULT 0,  -- errors/retries during task
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE accessibility_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessibility_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE usability_ratings ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert feedback" ON accessibility_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_anonymous = true);

CREATE POLICY "Users can view own feedback" ON accessibility_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert issues" ON accessibility_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own issues" ON accessibility_issues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert ratings" ON usability_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ratings" ON usability_ratings
  FOR SELECT USING (auth.uid() = user_id);

-- ── Indexes for analytics queries ──────────────────────────

CREATE INDEX IF NOT EXISTS idx_feedback_user ON accessibility_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_feature ON accessibility_feedback(feature_tested);
CREATE INDEX IF NOT EXISTS idx_feedback_disability ON accessibility_feedback(disability_category);
CREATE INDEX IF NOT EXISTS idx_issues_status ON accessibility_issues(status);
CREATE INDEX IF NOT EXISTS idx_ratings_task ON usability_ratings(task_name);
