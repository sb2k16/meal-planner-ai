-- extract_minutes_from_time parses a free-text duration (as stored in the
-- scraped recipe tables' prep_time / cook_time varchar columns) into total
-- minutes. It is referenced by the recommendation query in
-- app/services/scraped_recipe_service.go.
--
-- Handles: "30 minutes", "30 mins", "30 min", "1 hour", "1 hr 30 min",
-- ISO-8601 durations like "PT1H30M", and bare numbers (treated as minutes).
-- Returns NULL for NULL/empty input.
CREATE OR REPLACE FUNCTION extract_minutes_from_time(time_str text)
RETURNS integer AS $$
DECLARE
    hours integer := 0;
    minutes integer := 0;
    m text[];
BEGIN
    IF time_str IS NULL OR btrim(time_str) = '' THEN
        RETURN NULL;
    END IF;

    -- ISO 8601 duration, e.g. PT1H30M
    m := regexp_match(time_str, 'PT(?:(\d+)H)?(?:(\d+)M)?', 'i');
    IF m IS NOT NULL AND (m[1] IS NOT NULL OR m[2] IS NOT NULL) THEN
        RETURN COALESCE(m[1]::int, 0) * 60 + COALESCE(m[2]::int, 0);
    END IF;

    -- hours: "1 hour", "2 hrs", "1h"
    m := regexp_match(time_str, '(\d+)\s*(?:hours?|hrs?|h)\y', 'i');
    IF m IS NOT NULL THEN
        hours := m[1]::int;
    END IF;

    -- minutes: "30 minutes", "30 mins", "30 min", "30m"
    m := regexp_match(time_str, '(\d+)\s*(?:minutes?|mins?|m)\y', 'i');
    IF m IS NOT NULL THEN
        minutes := m[1]::int;
    END IF;

    -- Fallback: no unit matched, treat the first integer as minutes.
    IF hours = 0 AND minutes = 0 THEN
        m := regexp_match(time_str, '(\d+)');
        IF m IS NOT NULL THEN
            minutes := m[1]::int;
        END IF;
    END IF;

    RETURN hours * 60 + minutes;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
