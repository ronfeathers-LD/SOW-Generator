-- '999' was a read-mapper sentinel that got persisted by saves; it was never
-- a legitimate value (validation caps these fields at < 99).
UPDATE sows SET salesforce_tenants = '' WHERE salesforce_tenants = '999';
UPDATE sows SET timeline_weeks = ''    WHERE timeline_weeks = '999';
UPDATE sows SET regions = ''           WHERE regions = '999';
