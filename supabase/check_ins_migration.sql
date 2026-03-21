--  Daily Wellness Check-In feature


CREATE TABLE check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mood INTEGER NOT NULL,
  pain INTEGER NOT NULL,
  energy INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own check-ins" ON check_ins
  FOR ALL USING (auth.uid() = user_id);
