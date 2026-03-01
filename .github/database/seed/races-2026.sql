-- ============================================================
-- F1 2026 SEASON — FULL RACE CALENDAR (24 rounds)
-- Source: https://www.formula1.com/en/racing/2026
--
-- date_start = Practice 1 start (race weekend opens)
-- date_end   = Qualifying start (regular) or Sprint Qualifying start (sprint weekends)
--              This is the prediction submission DEADLINE.
--              Qualifying datetimes sourced from qualifying-datetime.md (Spain/Barcelona → UTC).
-- ============================================================
--
-- If races were previously seeded, clear them first:
DELETE FROM races WHERE season_id = (SELECT id FROM seasons WHERE year = 2026);

INSERT INTO races (meeting_key, race_name, official_name, circuit_short_name, country_name, country_code, location, date_start, date_end, round, has_sprint, season_id) VALUES
  -- Round 1: Australia — Qualifying: 07 Mar 06:00 Spain (UTC+1) = 05:00 UTC
  (1280, 'Australian Grand Prix',
   'FORMULA 1 QATAR AIRWAYS AUSTRALIAN GRAND PRIX 2026',
   'Melbourne', 'Australia', 'AUS', 'Albert Park',
   '2026-03-06T01:30:00+00:00', '2026-03-07T05:00:00+00:00', 1, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 2: China (Sprint) — Sprint Qualifying: 13 Mar 08:30 Spain (UTC+1) = 07:30 UTC
  (1281, 'Chinese Grand Prix',
   'FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2026',
   'Shanghai', 'China', 'CHN', 'Shanghai',
   '2026-03-13T03:30:00+00:00', '2026-03-13T07:30:00+00:00', 2, TRUE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 3: Japan — Qualifying: 28 Mar 07:00 Spain (UTC+1) = 06:00 UTC
  (1282, 'Japanese Grand Prix',
   'FORMULA 1 ARAMCO JAPANESE GRAND PRIX 2026',
   'Suzuka', 'Japan', 'JPN', 'Suzuka',
   '2026-03-27T02:30:00+00:00', '2026-03-28T06:00:00+00:00', 3, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 4: Bahrain — Qualifying: 11 Apr 18:00 Spain (UTC+2) = 16:00 UTC
  (1283, 'Bahrain Grand Prix',
   'FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2026',
   'Sakhir', 'Bahrain', 'BHR', 'Sakhir',
   '2026-04-10T11:30:00+00:00', '2026-04-11T16:00:00+00:00', 4, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 5: Saudi Arabia — Qualifying: 18 Apr 19:00 Spain (UTC+2) = 17:00 UTC
  (1284, 'Saudi Arabian Grand Prix',
   'FORMULA 1 STC SAUDI ARABIAN GRAND PRIX 2026',
   'Jeddah', 'Saudi Arabia', 'SAU', 'Jeddah',
   '2026-04-17T13:30:00+00:00', '2026-04-18T17:00:00+00:00', 5, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 6: Miami (Sprint) — Sprint Qualifying: 01 May 22:30 Spain (UTC+2) = 20:30 UTC
  (1285, 'Miami Grand Prix',
   'FORMULA 1 CRYPTO.COM MIAMI GRAND PRIX 2026',
   'Miami', 'United States', 'USA', 'Miami',
   '2026-05-01T17:30:00+00:00', '2026-05-01T20:30:00+00:00', 6, TRUE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 7: Canada (Sprint) — Sprint Qualifying: 22 May 22:30 Spain (UTC+2) = 20:30 UTC
  (1286, 'Canadian Grand Prix',
   'FORMULA 1 LENOVO GRAND PRIX DU CANADA 2026',
   'Montreal', 'Canada', 'CAN', 'Montreal',
   '2026-05-22T17:30:00+00:00', '2026-05-22T20:30:00+00:00', 7, TRUE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 8: Monaco — Qualifying: 06 Jun 16:00 Spain (UTC+2) = 14:00 UTC
  (1287, 'Monaco Grand Prix',
   'FORMULA 1 LOUIS VUITTON GRAND PRIX DE MONACO 2026',
   'Monaco', 'Monaco', 'MCO', 'Monte Carlo',
   '2026-06-05T11:30:00+00:00', '2026-06-06T14:00:00+00:00', 8, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 9: Barcelona-Catalunya — Qualifying: 13 Jun 16:00 Spain (UTC+2) = 14:00 UTC
  (1288, 'Barcelona-Catalunya Grand Prix',
   'FORMULA 1 MSC CRUISES GRAN PREMIO DE BARCELONA-CATALUNYA 2026',
   'Barcelona', 'Spain', 'ESP', 'Barcelona',
   '2026-06-12T11:30:00+00:00', '2026-06-13T14:00:00+00:00', 9, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 10: Austria — Qualifying: 27 Jun 16:00 Spain (UTC+2) = 14:00 UTC
  (1289, 'Austrian Grand Prix',
   'FORMULA 1 LENOVO AUSTRIAN GRAND PRIX 2026',
   'Spielberg', 'Austria', 'AUT', 'Spielberg',
   '2026-06-26T11:30:00+00:00', '2026-06-27T14:00:00+00:00', 10, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 11: Great Britain (Sprint) — Sprint Qualifying: 03 Jul 17:30 Spain (UTC+2) = 15:30 UTC
  (1290, 'British Grand Prix',
   'FORMULA 1 PIRELLI BRITISH GRAND PRIX 2026',
   'Silverstone', 'Great Britain', 'GBR', 'Silverstone',
   '2026-07-03T12:30:00+00:00', '2026-07-03T15:30:00+00:00', 11, TRUE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 12: Belgium — Qualifying: 18 Jul 16:00 Spain (UTC+2) = 14:00 UTC
  (1291, 'Belgian Grand Prix',
   'FORMULA 1 MOËT & CHANDON BELGIAN GRAND PRIX 2026',
   'Spa', 'Belgium', 'BEL', 'Spa-Francorchamps',
   '2026-07-17T11:30:00+00:00', '2026-07-18T14:00:00+00:00', 12, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 13: Hungary — Qualifying: 25 Jul 16:00 Spain (UTC+2) = 14:00 UTC
  (1292, 'Hungarian Grand Prix',
   'FORMULA 1 AWS HUNGARIAN GRAND PRIX 2026',
   'Budapest', 'Hungary', 'HUN', 'Budapest',
   '2026-07-24T11:30:00+00:00', '2026-07-25T14:00:00+00:00', 13, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 14: Netherlands (Sprint) — Sprint Qualifying: 21 Aug 16:30 Spain (UTC+2) = 14:30 UTC
  (1293, 'Dutch Grand Prix',
   'FORMULA 1 HEINEKEN DUTCH GRAND PRIX 2026',
   'Zandvoort', 'Netherlands', 'NLD', 'Zandvoort',
   '2026-08-21T11:30:00+00:00', '2026-08-21T14:30:00+00:00', 14, TRUE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 15: Italy — Qualifying: 05 Sep 16:00 Spain (UTC+2) = 14:00 UTC
  (1294, 'Italian Grand Prix',
   'FORMULA 1 PIRELLI GRAN PREMIO D''ITALIA 2026',
   'Monza', 'Italy', 'ITA', 'Monza',
   '2026-09-04T11:30:00+00:00', '2026-09-05T14:00:00+00:00', 15, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 16: Spain — Qualifying: 12 Sep 16:00 Spain (UTC+2) = 14:00 UTC
  (1295, 'Spanish Grand Prix',
   'FORMULA 1 TAG HEUER GRAN PREMIO DE ESPAÑA 2026',
   'Madrid', 'Spain', 'ESP', 'Madrid',
   '2026-09-11T11:30:00+00:00', '2026-09-12T14:00:00+00:00', 16, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 17: Azerbaijan — Qualifying: 25 Sep 14:00 Spain (UTC+2) = 12:00 UTC
  (1296, 'Azerbaijan Grand Prix',
   'FORMULA 1 QATAR AIRWAYS AZERBAIJAN GRAND PRIX 2026',
   'Baku', 'Azerbaijan', 'AZE', 'Baku',
   '2026-09-24T09:30:00+00:00', '2026-09-25T12:00:00+00:00', 17, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 18: Singapore (Sprint) — Sprint Qualifying: 09 Oct 14:30 Spain (UTC+2) = 12:30 UTC
  (1297, 'Singapore Grand Prix',
   'FORMULA 1 SINGAPORE AIRLINES SINGAPORE GRAND PRIX 2026',
   'Marina Bay', 'Singapore', 'SGP', 'Marina Bay',
   '2026-10-09T09:30:00+00:00', '2026-10-09T12:30:00+00:00', 18, TRUE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 19: United States — Qualifying: 24 Oct 23:00 Spain (UTC+2) = 21:00 UTC
  (1298, 'United States Grand Prix',
   'FORMULA 1 MSC CRUISES UNITED STATES GRAND PRIX 2026',
   'Austin', 'United States', 'USA', 'Austin',
   '2026-10-23T17:30:00+00:00', '2026-10-24T21:00:00+00:00', 19, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 20: Mexico — Qualifying: 31 Oct 22:00 Spain (UTC+1) = 21:00 UTC
  (1299, 'Mexico City Grand Prix',
   'FORMULA 1 GRAN PREMIO DE LA CIUDAD DE MÉXICO 2026',
   'Mexico City', 'Mexico', 'MEX', 'Mexico City',
   '2026-10-30T18:30:00+00:00', '2026-10-31T21:00:00+00:00', 20, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 21: Brazil — Qualifying: 07 Nov 19:00 Spain (UTC+1) = 18:00 UTC
  (1300, 'São Paulo Grand Prix',
   'FORMULA 1 MSC CRUISES GRANDE PRÊMIO DE SÃO PAULO 2026',
   'Interlagos', 'Brazil', 'BRA', 'São Paulo',
   '2026-11-06T14:30:00+00:00', '2026-11-07T18:00:00+00:00', 21, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 22: Las Vegas — Qualifying: 21 Nov 05:00 Spain (UTC+1) = 04:00 UTC
  (1301, 'Las Vegas Grand Prix',
   'FORMULA 1 HEINEKEN LAS VEGAS GRAND PRIX 2026',
   'Las Vegas', 'United States', 'USA', 'Las Vegas',
   '2026-11-19T22:30:00+00:00', '2026-11-21T04:00:00+00:00', 22, FALSE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 23: Qatar (Sprint) — Sprint Qualifying: 28 Nov 19:00 Spain (UTC+1) = 18:00 UTC
  (1302, 'Qatar Grand Prix',
   'FORMULA 1 QATAR AIRWAYS QATAR GRAND PRIX 2026',
   'Lusail', 'Qatar', 'QAT', 'Lusail',
   '2026-11-27T12:30:00+00:00', '2026-11-28T18:00:00+00:00', 23, TRUE,
   (SELECT id FROM seasons WHERE year = 2026)),

  -- Round 24: Abu Dhabi — Qualifying: 05 Dec 15:00 Spain (UTC+1) = 14:00 UTC
  (1303, 'Abu Dhabi Grand Prix',
   'FORMULA 1 ETIHAD AIRWAYS ABU DHABI GRAND PRIX 2026',
   'Yas Marina', 'United Arab Emirates', 'ARE', 'Abu Dhabi',
   '2026-12-04T09:30:00+00:00', '2026-12-05T14:00:00+00:00', 24, FALSE,
   (SELECT id FROM seasons WHERE year = 2026));
