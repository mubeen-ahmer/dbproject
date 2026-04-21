-- ============================================================================
-- Migration 002 — Notification inserts on key order lifecycle events
--
-- Run in Neon SQL editor. Safe to re-run (CREATE OR REPLACE throughout).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: insert a notification row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_notify(
    p_user_id  UUID,
    p_order_id UUID,
    p_type     VARCHAR(50),
    p_text     TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO notification (uuid, user_id, order_id, type, text)
    VALUES (gen_random_uuid(), p_user_id, p_order_id, p_type, p_text);
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_place_bid — notify the student a new bid arrived
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_place_bid(
    p_order_id  UUID,
    p_writer_id UUID,
    p_price     NUMERIC(10,2),
    p_deadline  TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_student_id UUID;
    v_title      TEXT;
    v_writer_name TEXT;
BEGIN
    SELECT student_id, title INTO v_student_id, v_title
    FROM orders WHERE uuid = p_order_id;

    SELECT au.name INTO v_writer_name
    FROM neon_auth."user" au WHERE au.id = p_writer_id;

    IF NOT EXISTS (
        SELECT 1 FROM orders
        WHERE uuid = p_order_id AND status IN ('OPEN', 'BIDDING')
    ) THEN
        RAISE EXCEPTION 'Order is not open for bidding';
    END IF;

    IF EXISTS (
        SELECT 1 FROM bid
        WHERE order_id = p_order_id AND writer_id = p_writer_id
    ) THEN
        RAISE EXCEPTION 'You have already placed a bid on this order';
    END IF;

    INSERT INTO bid (order_id, writer_id, price, deadline_offered)
    VALUES (p_order_id, p_writer_id, p_price, p_deadline);

    UPDATE orders SET status = 'BIDDING'
    WHERE uuid = p_order_id AND status = 'OPEN';

    PERFORM fn_notify(
        v_student_id, p_order_id, 'NEW_BID',
        v_writer_name || ' placed a bid on your order "' || v_title || '"'
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_submit_paper — notify the student a submission is ready for review
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_submit_paper(
    p_order_id          UUID,
    p_file_path         TEXT,
    p_watermarked_path  TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_count  INTEGER;
    v_student_id  UUID;
    v_title       TEXT;
BEGIN
    SELECT student_id, title INTO v_student_id, v_title
    FROM orders WHERE uuid = p_order_id;

    SELECT COALESCE(MAX(count), 0) + 1 INTO v_next_count
    FROM submission WHERE order_id = p_order_id;

    INSERT INTO submission (order_id, count, file_path, watermarked_path)
    VALUES (p_order_id, v_next_count, p_file_path, p_watermarked_path);

    UPDATE orders SET status = 'SUBMITTED'
    WHERE uuid = p_order_id;

    PERFORM fn_notify(
        v_student_id, p_order_id, 'SUBMISSION_READY',
        'Your writer submitted work on "' || v_title || '" — review it now'
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_accept_paper — notify the writer their work was accepted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_accept_paper(
    p_order_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_price     NUMERIC(10,2);
    v_writer_id UUID;
    v_title     TEXT;
BEGIN
    SELECT selected_price, writer_id, title INTO v_price, v_writer_id, v_title
    FROM orders WHERE uuid = p_order_id;

    UPDATE orders SET status = 'COMPLETED' WHERE uuid = p_order_id;

    UPDATE submission
    SET status = 'ACCEPTED'
    WHERE order_id = p_order_id
      AND count = (SELECT MAX(count) FROM submission WHERE order_id = p_order_id);

    INSERT INTO transactions (order_id, status, amount, release_date) VALUES
        (p_order_id, 'RELEASED_TO_WRITER', v_price * 0.90, CURRENT_TIMESTAMP),
        (p_order_id, 'SPLIT',              v_price * 0.10, CURRENT_TIMESTAMP);

    PERFORM fn_notify(
        v_writer_id, p_order_id, 'PAPER_ACCEPTED',
        'Your submission for "' || v_title || '" was accepted — earnings released'
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_request_revision — notify the writer a revision is needed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_request_revision(
    p_order_id      UUID,
    p_submission_id UUID,
    p_changes       TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_writer_id UUID;
    v_title     TEXT;
BEGIN
    SELECT writer_id, title INTO v_writer_id, v_title
    FROM orders WHERE uuid = p_order_id;

    UPDATE submission SET status = 'REVISION_REQUESTED'
    WHERE uuid = p_submission_id AND order_id = p_order_id;

    INSERT INTO revision (submission_id, requested_changes)
    VALUES (p_submission_id, p_changes);

    UPDATE orders SET status = 'REVISION_REQUESTED'
    WHERE uuid = p_order_id;

    PERFORM fn_notify(
        v_writer_id, p_order_id, 'REVISION_REQUESTED',
        'A revision was requested on "' || v_title || '"'
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_request_refund — progressive split + notify writer
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_request_refund(
    p_order_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_price         NUMERIC(10,2);
    v_sub_count     INTEGER;
    v_student_pct   NUMERIC(5,2);
    v_writer_pct    NUMERIC(5,2);
    v_platform_pct  NUMERIC(5,2);
    v_writer_id     UUID;
    v_title         TEXT;
BEGIN
    SELECT selected_price, writer_id, title INTO v_price, v_writer_id, v_title
    FROM orders WHERE uuid = p_order_id;

    IF v_price IS NULL THEN
        RAISE EXCEPTION 'Cannot refund an order with no selected price';
    END IF;

    SELECT COUNT(*) INTO v_sub_count
    FROM submission WHERE order_id = p_order_id;

    IF v_sub_count = 0 THEN
        v_student_pct  := 0.70;
        v_writer_pct   := 0.25;
        v_platform_pct := 0.05;
    ELSIF v_sub_count = 1 THEN
        v_student_pct  := 0.50;
        v_writer_pct   := 0.40;
        v_platform_pct := 0.10;
    ELSIF v_sub_count = 2 THEN
        v_student_pct  := 0.30;
        v_writer_pct   := 0.60;
        v_platform_pct := 0.10;
    ELSE
        RAISE EXCEPTION 'Cannot refund after 3 submissions — student must accept the order';
    END IF;

    UPDATE orders SET status = 'REFUNDED' WHERE uuid = p_order_id;

    INSERT INTO transactions (order_id, status, amount, release_date) VALUES
        (p_order_id, 'REFUNDED',           v_price * v_student_pct,  CURRENT_TIMESTAMP),
        (p_order_id, 'RELEASED_TO_WRITER', v_price * v_writer_pct,   CURRENT_TIMESTAMP),
        (p_order_id, 'SPLIT',              v_price * v_platform_pct, CURRENT_TIMESTAMP);

    PERFORM fn_notify(
        v_writer_id, p_order_id, 'ORDER_REFUNDED',
        'The student requested a refund on "' || v_title || '"'
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: notify writer when their bid is accepted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_bid_accepted_notify()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_title TEXT;
BEGIN
    IF NEW.status = 'ACCEPTED' AND OLD.status <> 'ACCEPTED' THEN
        SELECT title INTO v_title FROM orders WHERE uuid = NEW.order_id;
        PERFORM fn_notify(
            NEW.writer_id, NEW.order_id, 'BID_ACCEPTED',
            'Your bid was accepted for "' || v_title || '" — get to work!'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bid_accepted_notify ON bid;
CREATE TRIGGER trg_bid_accepted_notify
AFTER UPDATE ON bid
FOR EACH ROW EXECUTE FUNCTION trg_fn_bid_accepted_notify();

-- ---------------------------------------------------------------------------
-- Trigger: notify writer when they receive a review
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_review_notify()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_writer_id UUID;
    v_title     TEXT;
BEGIN
    SELECT writer_id, title INTO v_writer_id, v_title
    FROM orders WHERE uuid = NEW.order_id;

    PERFORM fn_notify(
        v_writer_id, NEW.order_id, 'NEW_REVIEW',
        'You received a ' || NEW.rating || '-star review on "' || v_title || '"'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_notify ON review;
CREATE TRIGGER trg_review_notify
AFTER INSERT ON review
FOR EACH ROW EXECUTE FUNCTION trg_fn_review_notify();
