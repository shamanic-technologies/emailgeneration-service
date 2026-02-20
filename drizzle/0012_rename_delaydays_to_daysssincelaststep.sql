-- Migrate existing sequence jsonb data: delayDays (absolute) → daysSinceLastStep (relative).
-- Example: [0, 3, 10] → [0, 3, 7]

WITH expanded AS (
  SELECT
    eg.id,
    ordinality,
    elem,
    (elem->>'delayDays')::int AS delay,
    LAG((elem->>'delayDays')::int, 1, 0) OVER (PARTITION BY eg.id ORDER BY ordinality) AS prev_delay
  FROM "email_generations" eg,
  jsonb_array_elements(eg."sequence") WITH ORDINALITY AS arr(elem, ordinality)
  WHERE eg."sequence" IS NOT NULL
    AND eg."sequence" != 'null'::jsonb
    AND jsonb_array_length(eg."sequence") > 0
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(eg."sequence") AS e WHERE e ? 'delayDays'
    )
),
new_sequences AS (
  SELECT
    id,
    jsonb_agg(
      (elem - 'delayDays') || jsonb_build_object('daysSinceLastStep', delay - prev_delay)
      ORDER BY ordinality
    ) AS new_sequence
  FROM expanded
  GROUP BY id
)
UPDATE "email_generations" eg
SET "sequence" = ns.new_sequence
FROM new_sequences ns
WHERE eg.id = ns.id;
