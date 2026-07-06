-- ============================================================
-- F1 PREDICTION APP — SEED DATA (2026 Season)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SEASON
-- ────────────────────────────────────────────────────────────
INSERT INTO seasons (year, is_current) VALUES (2026, TRUE);

-- ────────────────────────────────────────────────────────────
-- TEAMS (ordered by 2025 WCC standings + new entry)
-- ────────────────────────────────────────────────────────────
INSERT INTO teams (name, color, season_id) VALUES
  ('McLaren',         'FF8000', (SELECT id FROM seasons WHERE year = 2026)),
  ('Mercedes',        '27F4D2', (SELECT id FROM seasons WHERE year = 2026)),
  ('Red Bull Racing', '3671C6', (SELECT id FROM seasons WHERE year = 2026)),
  ('Ferrari',         'E8002D', (SELECT id FROM seasons WHERE year = 2026)),
  ('Williams',        '1868DB', (SELECT id FROM seasons WHERE year = 2026)),
  ('Racing Bulls',    '6692FF', (SELECT id FROM seasons WHERE year = 2026)),
  ('Aston Martin',    '229971', (SELECT id FROM seasons WHERE year = 2026)),
  ('Haas',            'B6BABD', (SELECT id FROM seasons WHERE year = 2026)),
  ('Audi',            'E0002B', (SELECT id FROM seasons WHERE year = 2026)),
  ('Alpine',          '0093CC', (SELECT id FROM seasons WHERE year = 2026)),
  ('Cadillac',        '1E1E1E', (SELECT id FROM seasons WHERE year = 2026));

-- ────────────────────────────────────────────────────────────
-- DRIVERS (ordered by 2025 WDC standings)
-- ────────────────────────────────────────────────────────────
INSERT INTO drivers (first_name, last_name, name_acronym, driver_number, team_id, season_id) VALUES
  ('Lando',     'Norris',     'NOR',  1, (SELECT id FROM teams WHERE name = 'McLaren'         AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Max',       'Verstappen', 'VER',  3, (SELECT id FROM teams WHERE name = 'Red Bull Racing' AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Oscar',     'Piastri',    'PIA', 81, (SELECT id FROM teams WHERE name = 'McLaren'         AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('George',    'Russell',    'RUS', 63, (SELECT id FROM teams WHERE name = 'Mercedes'        AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Charles',   'Leclerc',    'LEC', 16, (SELECT id FROM teams WHERE name = 'Ferrari'         AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Lewis',     'Hamilton',   'HAM', 44, (SELECT id FROM teams WHERE name = 'Ferrari'         AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Kimi',      'Antonelli',  'ANT', 12, (SELECT id FROM teams WHERE name = 'Mercedes'        AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Alexander', 'Albon',      'ALB', 23, (SELECT id FROM teams WHERE name = 'Williams'        AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Carlos',    'Sainz',      'SAI', 55, (SELECT id FROM teams WHERE name = 'Williams'        AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Fernando',  'Alonso',     'ALO', 14, (SELECT id FROM teams WHERE name = 'Aston Martin'    AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Nico',      'Hulkenberg', 'HUL', 27, (SELECT id FROM teams WHERE name = 'Audi'            AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Isack',     'Hadjar',     'HAD',  6, (SELECT id FROM teams WHERE name = 'Red Bull Racing' AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Oliver',    'Bearman',    'BEA', 87, (SELECT id FROM teams WHERE name = 'Haas'            AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Liam',      'Lawson',     'LAW', 30, (SELECT id FROM teams WHERE name = 'Racing Bulls'    AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Esteban',   'Ocon',       'OCO', 31, (SELECT id FROM teams WHERE name = 'Haas'            AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Lance',     'Stroll',     'STR', 18, (SELECT id FROM teams WHERE name = 'Aston Martin'    AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Pierre',    'Gasly',      'GAS', 10, (SELECT id FROM teams WHERE name = 'Alpine'          AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Gabriel',   'Bortoleto',  'BOR',  5, (SELECT id FROM teams WHERE name = 'Audi'            AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Franco',    'Colapinto',  'COL', 43, (SELECT id FROM teams WHERE name = 'Alpine'          AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Sergio',    'Perez',      'PER', 11, (SELECT id FROM teams WHERE name = 'Cadillac'        AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Valtteri',  'Bottas',     'BOT', 77, (SELECT id FROM teams WHERE name = 'Cadillac'        AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026)),
  ('Arvid',     'Lindblad',   'LIN', 41, (SELECT id FROM teams WHERE name = 'Racing Bulls'    AND season_id = (SELECT id FROM seasons WHERE year = 2026)), (SELECT id FROM seasons WHERE year = 2026));

-- ────────────────────────────────────────────────────────────
-- RACES (2026 calendar — first 5 rounds)
-- ────────────────────────────────────────────────────────────
INSERT INTO races (meeting_key, race_name, official_name, circuit_short_name, country_name, country_code, location, date_start, date_end, round, has_sprint, season_id) VALUES
  (1280, 'Australian Grand Prix',     'FORMULA 1 ROLEX AUSTRALIAN GRAND PRIX 2026',       'Melbourne', 'Australia',     'AUS', 'Albert Park', '2026-02-07T03:30:00+00:00', '2026-02-09T06:00:00+00:00',  1, FALSE, (SELECT id FROM seasons WHERE year = 2026)),
  (1281, 'Chinese Grand Prix',        'FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2026',       'Shanghai',  'China',         'CHN', 'Shanghai',    '2026-02-14T04:30:00+00:00', '2026-02-16T07:00:00+00:00',  2, TRUE,  (SELECT id FROM seasons WHERE year = 2026)),
  (1282, 'Japanese Grand Prix',       'FORMULA 1 LENOVO JAPANESE GRAND PRIX 2026',        'Suzuka',    'Japan',         'JPN', 'Suzuka',      '2026-02-20T03:30:00+00:00', '2026-02-22T06:00:00+00:00',  3, FALSE, (SELECT id FROM seasons WHERE year = 2026)),
  (1283, 'Bahrain Grand Prix',        'FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2026',       'Sakhir',    'Bahrain',       'BHR', 'Sakhir',      '2026-03-06T12:30:00+00:00', '2026-03-08T15:00:00+00:00',  4, FALSE, (SELECT id FROM seasons WHERE year = 2026)),
  (1284, 'Saudi Arabian Grand Prix',  'FORMULA 1 STC SAUDI ARABIAN GRAND PRIX 2026',      'Jeddah',    'Saudi Arabia',  'SAU', 'Jeddah',      '2026-03-13T14:30:00+00:00', '2026-03-15T17:00:00+00:00',  5, FALSE, (SELECT id FROM seasons WHERE year = 2026));

-- ────────────────────────────────────────────────────────────
-- ACHIEVEMENTS CATALOG
-- ────────────────────────────────────────────────────────────
INSERT INTO achievements (slug, name, description, category, threshold) VALUES
  -- Predictions milestones
  ('first_prediction',      'Rookie',               'Make your first prediction',                   'predictions', 1),
  ('10_predictions',        'Regular',              'Make 10 predictions',                          'predictions', 10),
  ('20_predictions',        'Committed',            'Make 20 predictions',                          'predictions', 20),
  ('all_2026_predictions',  'Completionist',        'Make all 2026 race predictions',               'predictions', NULL),

  -- Accuracy milestones
  ('1_correct',             'On the Board',         'Get a prediction correct',                     'accuracy', 1),
  ('10_correct',            'Sharp Eye',            'Get 10 predictions correct',                   'accuracy', 10),
  ('50_correct',            'Oracle',               'Get 50 predictions correct',                   'accuracy', 50),
  ('100_correct',           'Mystic',               'Get 100 predictions correct',                  'accuracy', 100),

  -- Special predictions
  ('predict_race_winner',   'Winner Picker',        'Predict a race winner correctly',              'special', NULL),
  ('predict_pole',          'Pole Sitter',          'Predict the pole position correctly',          'special', NULL),
  ('predict_fastest_lap',   'Speed Demon',          'Predict the fastest lap correctly',            'special', NULL),
  ('predict_fastest_pit',   'Pit Crew',             'Predict the fastest pit stop correctly',       'special', NULL),
  ('perfect_podium',        'Podium Master',        'Predict the perfect podium (exact order)',     'special', NULL),
  ('perfect_top_10',        'Clairvoyant',          'Predict the perfect top 10 (exact order)',     'special', NULL),
  ('sprint_winner',         'Sprint Star',          'Predict the sprint race winner',               'special', NULL),
  ('sprint_pole',           'Sprint Qualifier',     'Predict the sprint pole position',             'special', NULL),
  ('sprint_fastest_lap',    'Sprint Speedster',     'Predict the sprint fastest lap',               'special', NULL),
  ('sprint_podium',         'Sprint Podium',        'Predict the sprint podium (exact order)',      'special', NULL),
  ('perfect_top_8',         'Sprint Clairvoyant',   'Predict the perfect sprint top 8',             'special', NULL),
  ('hat_trick',             'Hat Trick',            'Predict pole, fastest lap and race winner',    'special', NULL),
  ('predict_wdc',           'Champion Whisperer',   'Predict the WDC winner correctly',             'special', NULL),
  ('predict_wcc',           'Constructor Guru',     'Predict the WCC winner correctly',             'special', NULL),

  -- Points milestones
  ('100_points',            'Century',              'Earn 100 total points',                        'milestones', 100),
  ('200_points',            'Double Century',       'Earn 200 total points',                        'milestones', 200),
  ('300_points',            'Triple Century',       'Earn 300 total points',                        'milestones', 300);
