-- ============================================================================
-- GeeGeeJobLa (จีจีจบล่ะ) — Database Seed Data Script
-- ============================================================================
-- Run this script in the Supabase SQL Editor or via supabase db reset / seed
-- to populate realistic test data for evaluation and demonstrations.
--
-- Demo Accounts:
--   1. Free User:    free-demo@geegeejobla.local    / Password: demo1234
--   2. Premium User: premium-demo@geegeejobla.local / Password: demo1234
--   3. Budget Max:   budget-max@geegeejobla.local   / Password: demo1234
-- ============================================================================

DO $$
DECLARE
  v_free_user_id uuid := '11111111-1111-4111-a111-111111111111'::uuid;
  v_premium_user_id uuid := '22222222-2222-4222-a222-222222222222'::uuid;
  v_budget_user_id uuid := '33333333-3333-4333-a333-333333333333'::uuid;
  
  -- Word IDs for free-demo user
  w1 uuid := gen_random_uuid();
  w2 uuid := gen_random_uuid();
  w3 uuid := gen_random_uuid();
  w4 uuid := gen_random_uuid();
  w5 uuid := gen_random_uuid();
  w6 uuid := gen_random_uuid();
  w7 uuid := gen_random_uuid();
  w8 uuid := gen_random_uuid();
  w9 uuid := gen_random_uuid();
  w10 uuid := gen_random_uuid();
  w11 uuid := gen_random_uuid();
  w12 uuid := gen_random_uuid();
  w13 uuid := gen_random_uuid();
  w14 uuid := gen_random_uuid();
  w15 uuid := gen_random_uuid();
  w16 uuid := gen_random_uuid();

  -- Conversation session IDs
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
BEGIN

  -- --------------------------------------------------------------------------
  -- 1. Create Demo Auth Users in auth.users (if not already exist)
  -- --------------------------------------------------------------------------
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, aud, confirmation_token
  ) VALUES
  (
    v_free_user_id,
    '00000000-0000-0000-0000-000000000000',
    'free-demo@geegeejobla.local',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"displayName":"Somchai (Free Tier)","handle":"somchai_free","target_language":"english","ui_language":"th"}',
    now(), now(), 'authenticated', 'authenticated', ''
  ),
  (
    v_premium_user_id,
    '00000000-0000-0000-0000-000000000000',
    'premium-demo@geegeejobla.local',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"displayName":"Apinya (Premium)","handle":"apinya_pro","target_language":"english","ui_language":"th"}',
    now(), now(), 'authenticated', 'authenticated', ''
  ),
  (
    v_budget_user_id,
    '00000000-0000-0000-0000-000000000000',
    'budget-max@geegeejobla.local',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"displayName":"Krit (Budget Max)","handle":"krit_max","target_language":"english","ui_language":"th"}',
    now(), now(), 'authenticated', 'authenticated', ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- --------------------------------------------------------------------------
  -- 2. Upsert Profiles
  -- --------------------------------------------------------------------------
  INSERT INTO public.profiles (
    id, display_name, handle, daily_spend_microbaht, daily_spend_reset_at,
    target_language, ui_language, subscription_status, subscription_current_period_end
  ) VALUES
  (
    v_free_user_id,
    'Somchai (Free Tier)',
    'somchai_free',
    4200,
    CURRENT_DATE,
    'english',
    'th',
    'free',
    NULL
  ),
  (
    v_premium_user_id,
    'Apinya (Premium)',
    'apinya_pro',
    12500,
    CURRENT_DATE,
    'english',
    'th',
    'active',
    now() + INTERVAL '30 days'
  ),
  (
    v_budget_user_id,
    'Krit (Budget Max)',
    'krit_max',
    20000, -- Exhausted daily limit for free tier (20,000 µ฿)
    CURRENT_DATE,
    'english',
    'th',
    'free',
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    subscription_status = EXCLUDED.subscription_status,
    daily_spend_microbaht = EXCLUDED.daily_spend_microbaht;

  -- --------------------------------------------------------------------------
  -- 3. Insert Word Bank for free-demo user (16 words)
  -- --------------------------------------------------------------------------
  INSERT INTO public.words (id, user_id, label, word, english, language, thai, part_of_speech, created_at)
  VALUES
    -- 6 Words due for review today (next_review_at <= now()) -> ready for /refresh games
    (w1, v_free_user_id, 'meticulous', 'meticulous', 'meticulous', 'english', 'พิถีพิถัน ละเอียดรอบคอบ', 'adj', now() - INTERVAL '5 days'),
    (w2, v_free_user_id, 'resilient', 'resilient', 'resilient', 'english', 'ยืดหยุ่น ปรับตัวเก่ง ฟื้นตัวเร็ว', 'adj', now() - INTERVAL '4 days'),
    (w3, v_free_user_id, 'ubiquitous', 'ubiquitous', 'ubiquitous', 'english', 'แพร่หลาย พบเห็นได้ทุกหนแห่ง', 'adj', now() - INTERVAL '3 days'),
    (w4, v_free_user_id, 'pragmatic', 'pragmatic', 'pragmatic', 'english', 'เน้นการปฏิบัติจริง', 'adj', now() - INTERVAL '2 days'),
    (w5, v_free_user_id, 'eloquent', 'eloquent', 'eloquent', 'english', 'พูดจาคมคาย คล่องแคล่ว', 'adj', now() - INTERVAL '2 days'),
    (w6, v_free_user_id, 'benevolent', 'benevolent', 'benevolent', 'english', 'ใจดี มีเมตตากรุณา', 'adj', now() - INTERVAL '1 days'),

    -- Box 1: New words
    (w7, v_free_user_id, 'serendipity', 'serendipity', 'serendipity', 'english', 'ความบังเอิญที่โชคดี', 'noun', now() - INTERVAL '12 hours'),
    (w8, v_free_user_id, 'ephemeral', 'ephemeral', 'ephemeral', 'english', 'ชั่วคราว มีอยู่เพียงประเดี๋ยว', 'adj', now() - INTERVAL '8 hours'),
    (w9, v_free_user_id, 'candid', 'candid', 'candid', 'english', 'ตรงไปตรงมา จริงใจ', 'adj', now() - INTERVAL '4 hours'),

    -- Box 2-3: Learning phase
    (w10, v_free_user_id, 'tenacious', 'tenacious', 'tenacious', 'english', 'เหนียวแน่น มุ่งมั่นไม่ยอมแพ้', 'adj', now() - INTERVAL '10 days'),
    (w11, v_free_user_id, 'lucid', 'lucid', 'lucid', 'english', 'ชัดเจน แจ่มแจ้ง เข้าใจง่าย', 'adj', now() - INTERVAL '8 days'),
    (w12, v_free_user_id, 'versatile', 'versatile', 'versatile', 'english', 'มีความสามารถหลากหลาย', 'adj', now() - INTERVAL '7 days'),

    -- Box 4-5: Mastered words
    (w13, v_free_user_id, 'collaborate', 'collaborate', 'collaborate', 'english', 'ร่วมมือกันทำงาน', 'verb', now() - INTERVAL '20 days'),
    (w14, v_free_user_id, 'innovate', 'innovate', 'innovate', 'english', 'คิดค้นสิ่งใหม่ พัฒนานวัตกรรม', 'verb', now() - INTERVAL '25 days'),
    (w15, v_free_user_id, 'persuade', 'persuade', 'persuade', 'english', 'ชักชวน โน้มน้าวใจ', 'verb', now() - INTERVAL '30 days'),
    (w16, v_free_user_id, 'comprehend', 'comprehend', 'comprehend', 'english', 'เข้าใจอย่างถ่องแท้', 'verb', now() - INTERVAL '35 days')
  ON CONFLICT (id) DO NOTHING;

  -- --------------------------------------------------------------------------
  -- 4. Insert word_progress (SM-2 Spaced Repetition States)
  -- --------------------------------------------------------------------------
  INSERT INTO public.word_progress (
    user_id, word_id, box, interval, ease_factor, repetitions, last_reviewed_at, next_review_at
  ) VALUES
    -- Due for review today (next_review_at in the past) -> Immediately appears in /refresh
    (v_free_user_id, w1, 1, 1, 2.5, 1, now() - INTERVAL '2 days', now() - INTERVAL '2 hours'),
    (v_free_user_id, w2, 2, 2, 2.6, 2, now() - INTERVAL '3 days', now() - INTERVAL '4 hours'),
    (v_free_user_id, w3, 2, 2, 2.4, 2, now() - INTERVAL '3 days', now() - INTERVAL '1 hour'),
    (v_free_user_id, w4, 3, 4, 2.5, 3, now() - INTERVAL '5 days', now() - INTERVAL '30 minutes'),
    (v_free_user_id, w5, 3, 5, 2.5, 3, now() - INTERVAL '6 days', now() - INTERVAL '10 minutes'),
    (v_free_user_id, w6, 1, 1, 2.3, 1, now() - INTERVAL '2 days', now() - INTERVAL '5 minutes'),

    -- Box 1 (New, next review tomorrow)
    (v_free_user_id, w7, 1, 1, 2.5, 0, now() - INTERVAL '12 hours', now() + INTERVAL '12 hours'),
    (v_free_user_id, w8, 1, 1, 2.5, 0, now() - INTERVAL '8 hours', now() + INTERVAL '16 hours'),
    (v_free_user_id, w9, 1, 1, 2.5, 0, now() - INTERVAL '4 hours', now() + INTERVAL '20 hours'),

    -- Box 2-3 (In progress, reviewed recently)
    (v_free_user_id, w10, 2, 6, 2.5, 2, now() - INTERVAL '1 day', now() + INTERVAL '5 days'),
    (v_free_user_id, w11, 3, 12, 2.6, 3, now() - INTERVAL '2 days', now() + INTERVAL '10 days'),
    (v_free_user_id, w12, 3, 14, 2.5, 3, now() - INTERVAL '1 day', now() + INTERVAL '13 days'),

    -- Box 4-5 (Mastered)
    (v_free_user_id, w13, 4, 25, 2.7, 5, now() - INTERVAL '3 days', now() + INTERVAL '22 days'),
    (v_free_user_id, w14, 5, 45, 2.8, 7, now() - INTERVAL '5 days', now() + INTERVAL '40 days'),
    (v_free_user_id, w15, 5, 50, 2.8, 8, now() - INTERVAL '2 days', now() + INTERVAL '48 days'),
    (v_free_user_id, w16, 5, 60, 2.9, 9, now() - INTERVAL '1 day', now() + INTERVAL '59 days')
  ON CONFLICT (user_id, word_id) DO NOTHING;

  -- --------------------------------------------------------------------------
  -- 5. Insert Sample Conversations & Messages
  -- --------------------------------------------------------------------------
  INSERT INTO public.conversations (id, user_id, topic, created_at, completed)
  VALUES
    (c1, v_free_user_id, 'Job Interview Preparation', now() - INTERVAL '1 day', true),
    (c2, v_free_user_id, 'Ordering Coffee at a Cafe', now() - INTERVAL '2 days', true),
    (c3, v_free_user_id, 'Travel Plans to Japan', now() - INTERVAL '3 days', false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.conversation_messages (
    session_id, role, english_text, translation, english, english_phrases, raw_text, created_at
  ) VALUES
    -- Session 1: Job Interview
    (
      c1, 'assistant',
      'Hi there! I hear you are preparing for a job interview. What position are you applying for?',
      'สวัสดีครับ! ได้ยินว่าคุณกำลังเตรียมตัวสัมภาษณ์งาน กำลังสมัครตำแหน่งอะไรอยู่หรือครับ?',
      'Hi there! I hear you are preparing for a job interview. What position are you applying for?',
      NULL, NULL, now() - INTERVAL '1 day' + INTERVAL '1 minute'
    ),
    (
      c1, 'user',
      'I am apply for a software engineer role at a tech startup.',
      NULL,
      'I am applying for a software engineer role at a tech startup.',
      '{"grammarCorrect":false,"grammarNotes":"ใช้ \"I am applying\" แทน \"I am apply\" เพื่อให้เป็นรูป Present Continuous"}',
      'I am apply for a software engineer role at a tech startup.',
      now() - INTERVAL '1 day' + INTERVAL '2 minutes'
    ),
    (
      c1, 'assistant',
      'That sounds exciting! Make sure to highlight your problem-solving skills and teamwork experience. What is your strongest technical skill?',
      'น่าตื่นเต้นมากเลยครับ! อย่าลืมเน้นย้ำทักษะการแก้ปัญหาและประสบการณ์ทำงานเป็นทีมนะครับ คุณคิดว่าทักษะทางเทคนิคที่เด่นที่สุดของคุณคืออะไร?',
      'That sounds exciting! Make sure to highlight your problem-solving skills and teamwork experience. What is your strongest technical skill?',
      NULL, NULL, now() - INTERVAL '1 day' + INTERVAL '3 minutes'
    ),

    -- Session 2: Ordering Coffee
    (
      c2, 'assistant',
      'Good morning! Welcome to the cafe. What can I get started for you today?',
      'อรุณสวัสดิ์ครับ! ยินดีต้อนรับสู่ร้านกาแฟ วันนี้รับอะไรดีครับ?',
      'Good morning! Welcome to the cafe. What can I get started for you today?',
      NULL, NULL, now() - INTERVAL '2 days' + INTERVAL '1 minute'
    ),
    (
      c2, 'user',
      'I would like an iced caramel latte with oat milk, please.',
      NULL,
      'I would like an iced caramel latte with oat milk, please.',
      '{"grammarCorrect":true,"grammarNotes":"ประโยคถูกต้องและสุภาพมากครับ"}',
      'I would like an iced caramel latte with oat milk, please.',
      now() - INTERVAL '2 days' + INTERVAL '2 minutes'
    );

  -- --------------------------------------------------------------------------
  -- 6. Insert Pre-populated AI Word Detail Cache
  -- --------------------------------------------------------------------------
  INSERT INTO public.ai_word_detail_cache (
    cache_key, word, language, english, part_of_speech, model, response_json, created_at
  ) VALUES
  (
    'seed_meticulous_v1', 'meticulous', 'english', 'meticulous', 'adj', 'deepseek-v4-flash',
    '{"thai":"พิถีพิถัน ละเอียดรอบคอบ","definition":"Showing great attention to detail; very careful and precise.","partOfSpeech":"adj","tense":"present","usage":"He was meticulous about keeping his financial records accurate."}',
    now()
  ),
  (
    'seed_resilient_v1', 'resilient', 'english', 'resilient', 'adj', 'deepseek-v4-flash',
    '{"thai":"ยืดหยุ่น ปรับตัวเก่ง ฟื้นตัวเร็ว","definition":"Able to withstand or recover quickly from difficult conditions.","partOfSpeech":"adj","tense":"present","usage":"Babies are generally more resilient than parents expect."}',
    now()
  ),
  (
    'seed_ubiquitous_v1', 'ubiquitous', 'english', 'ubiquitous', 'adj', 'deepseek-v4-flash',
    '{"thai":"แพร่หลาย พบเห็นได้ทุกหนแห่ง","definition":"Present, appearing, or found everywhere.","partOfSpeech":"adj","tense":"present","usage":"Smartphones have become ubiquitous in modern society."}',
    now()
  ),
  (
    'seed_pragmatic_v1', 'pragmatic', 'english', 'pragmatic', 'adj', 'deepseek-v4-flash',
    '{"thai":"เน้นการปฏิบัติจริง จัดการตามสถานการณ์","definition":"Dealing with things sensibly and realistically in a practical way.","partOfSpeech":"adj","tense":"present","usage":"We need to adopt a more pragmatic approach to solve this issue."}',
    now()
  ),
  (
    'seed_serendipity_v1', 'serendipity', 'english', 'serendipity', 'noun', 'deepseek-v4-flash',
    '{"thai":"ความบังเอิญที่โชคดี","definition":"The occurrence of events by chance in a happy or beneficial way.","partOfSpeech":"noun","tense":"present","usage":"Finding this cafe was pure serendipity."}',
    now()
  )
  ON CONFLICT (cache_key) DO NOTHING;

END $$;
