-- Migration 030: enforce one active approval stage per SOW (#61)
--
-- ApprovalWorkflowService.initiateWorkflow() prevents duplicate workflows with
-- a SELECT-then-INSERT (check-then-act), and has a duplicate-key fallback that
-- catches Postgres error 23505. But no unique constraint ever existed on
-- sow_approvals (001 created the table, 005 added only plain indexes), so the
-- INSERT could never raise 23505 — the fallback was dead code and two
-- concurrent submissions could each insert a full set of stages.
--
-- Fix: add a PARTIAL unique index on (sow_id, stage_id) for non-rejected rows.
-- This matches the app's dedup semantics exactly: rejectStage keeps the
-- 'rejected' row for audit history (and the same stage can be rejected across
-- multiple resubmit cycles), so rejected rows must stay unconstrained, while at
-- most one active (pending/approved/skipped/etc.) row is allowed per stage.
-- With the index in place the concurrent-insert race now raises 23505 and the
-- existing fallback correctly reports "already exists".

-- 1. Remove any pre-existing duplicate ACTIVE rows so the index can be built.
--    Keep the most meaningful row per (sow_id, stage_id): prefer an approved
--    row over a pending one, then the earliest created.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY sow_id, stage_id
      ORDER BY (status = 'approved') DESC, created_at ASC, id ASC
    ) AS rn
  FROM sow_approvals
  WHERE status <> 'rejected'
)
DELETE FROM sow_approvals
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Enforce uniqueness going forward.
CREATE UNIQUE INDEX IF NOT EXISTS unique_sow_stage_active
  ON sow_approvals (sow_id, stage_id)
  WHERE status <> 'rejected';
