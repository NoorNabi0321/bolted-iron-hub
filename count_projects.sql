-- Count projects for each day of the week (June 18-24, 2026)
-- Using the same filtering logic as DailySchedule.tsx

SELECT 
  '2026-06-18' as date,
  'Wed 18' as day_label,
  COUNT(DISTINCT p.id) as project_count
FROM projects p
WHERE p.status != 'Inspection Passed'
  AND p.startDate IS NOT NULL
  AND (
    -- If both start and end dates exist, show on all days in range
    (p.estimatedEndDate IS NOT NULL AND DATE(p.startDate) <= '2026-06-18' AND DATE(p.estimatedEndDate) >= '2026-06-18')
    OR
    -- If only start date exists
    (p.estimatedEndDate IS NULL AND (
      -- Shop Drawings and Review: show ONLY on start date
      (p.status IN ('Shop Drawings', 'Review') AND DATE(p.startDate) = '2026-06-18')
      OR
      -- Other statuses: show from start date onwards
      (p.status NOT IN ('Shop Drawings', 'Review') AND DATE(p.startDate) <= '2026-06-18')
    ))
  )

UNION ALL

SELECT 
  '2026-06-19' as date,
  'Thu 19' as day_label,
  COUNT(DISTINCT p.id)
FROM projects p
WHERE p.status != 'Inspection Passed'
  AND p.startDate IS NOT NULL
  AND (
    (p.estimatedEndDate IS NOT NULL AND DATE(p.startDate) <= '2026-06-19' AND DATE(p.estimatedEndDate) >= '2026-06-19')
    OR
    (p.estimatedEndDate IS NULL AND (
      (p.status IN ('Shop Drawings', 'Review') AND DATE(p.startDate) = '2026-06-19')
      OR
      (p.status NOT IN ('Shop Drawings', 'Review') AND DATE(p.startDate) <= '2026-06-19')
    ))
  )

UNION ALL

SELECT 
  '2026-06-20' as date,
  'Fri 20' as day_label,
  COUNT(DISTINCT p.id)
FROM projects p
WHERE p.status != 'Inspection Passed'
  AND p.startDate IS NOT NULL
  AND (
    (p.estimatedEndDate IS NOT NULL AND DATE(p.startDate) <= '2026-06-20' AND DATE(p.estimatedEndDate) >= '2026-06-20')
    OR
    (p.estimatedEndDate IS NULL AND (
      (p.status IN ('Shop Drawings', 'Review') AND DATE(p.startDate) = '2026-06-20')
      OR
      (p.status NOT IN ('Shop Drawings', 'Review') AND DATE(p.startDate) <= '2026-06-20')
    ))
  )

UNION ALL

SELECT 
  '2026-06-21' as date,
  'Sat 21' as day_label,
  COUNT(DISTINCT p.id)
FROM projects p
WHERE p.status != 'Inspection Passed'
  AND p.startDate IS NOT NULL
  AND (
    (p.estimatedEndDate IS NOT NULL AND DATE(p.startDate) <= '2026-06-21' AND DATE(p.estimatedEndDate) >= '2026-06-21')
    OR
    (p.estimatedEndDate IS NULL AND (
      (p.status IN ('Shop Drawings', 'Review') AND DATE(p.startDate) = '2026-06-21')
      OR
      (p.status NOT IN ('Shop Drawings', 'Review') AND DATE(p.startDate) <= '2026-06-21')
    ))
  )

UNION ALL

SELECT 
  '2026-06-22' as date,
  'Sun 22' as day_label,
  COUNT(DISTINCT p.id)
FROM projects p
WHERE p.status != 'Inspection Passed'
  AND p.startDate IS NOT NULL
  AND (
    (p.estimatedEndDate IS NOT NULL AND DATE(p.startDate) <= '2026-06-22' AND DATE(p.estimatedEndDate) >= '2026-06-22')
    OR
    (p.estimatedEndDate IS NULL AND (
      (p.status IN ('Shop Drawings', 'Review') AND DATE(p.startDate) = '2026-06-22')
      OR
      (p.status NOT IN ('Shop Drawings', 'Review') AND DATE(p.startDate) <= '2026-06-22')
    ))
  )

UNION ALL

SELECT 
  '2026-06-23' as date,
  'Mon 23' as day_label,
  COUNT(DISTINCT p.id)
FROM projects p
WHERE p.status != 'Inspection Passed'
  AND p.startDate IS NOT NULL
  AND (
    (p.estimatedEndDate IS NOT NULL AND DATE(p.startDate) <= '2026-06-23' AND DATE(p.estimatedEndDate) >= '2026-06-23')
    OR
    (p.estimatedEndDate IS NULL AND (
      (p.status IN ('Shop Drawings', 'Review') AND DATE(p.startDate) = '2026-06-23')
      OR
      (p.status NOT IN ('Shop Drawings', 'Review') AND DATE(p.startDate) <= '2026-06-23')
    ))
  )

UNION ALL

SELECT 
  '2026-06-24' as date,
  'Tue 24' as day_label,
  COUNT(DISTINCT p.id)
FROM projects p
WHERE p.status != 'Inspection Passed'
  AND p.startDate IS NOT NULL
  AND (
    (p.estimatedEndDate IS NOT NULL AND DATE(p.startDate) <= '2026-06-24' AND DATE(p.estimatedEndDate) >= '2026-06-24')
    OR
    (p.estimatedEndDate IS NULL AND (
      (p.status IN ('Shop Drawings', 'Review') AND DATE(p.startDate) = '2026-06-24')
      OR
      (p.status NOT IN ('Shop Drawings', 'Review') AND DATE(p.startDate) <= '2026-06-24')
    ))
  )

ORDER BY date;
