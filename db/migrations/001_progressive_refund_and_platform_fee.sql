-- ============================================================================
-- Migration 001 — Progressive refund split + explicit platform fee on accept
--
-- Run this in the Neon SQL editor. Safe to re-run (uses CREATE OR REPLACE).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- sp_request_refund — split depends on number of submissions made so far:
--   0 submissions: 70% student / 25% writer / 5%  platform
--   1 submission : 50% student / 40% writer / 10% platform
--   2 submissions: 30% student / 60% writer / 10% platform
--   3+ submissions: refund blocked (student must accept)
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
BEGIN
    SELECT selected_price INTO v_price
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
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_accept_paper — now also records the 10% platform fee explicitly
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_accept_paper(
    p_order_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_price NUMERIC(10,2);
BEGIN
    SELECT selected_price INTO v_price
    FROM orders WHERE uuid = p_order_id;

    UPDATE orders SET status = 'COMPLETED' WHERE uuid = p_order_id;

    UPDATE submission
    SET status = 'ACCEPTED'
    WHERE order_id = p_order_id
      AND count = (SELECT MAX(count) FROM submission WHERE order_id = p_order_id);

    INSERT INTO transactions (order_id, status, amount, release_date) VALUES
        (p_order_id, 'RELEASED_TO_WRITER', v_price * 0.90, CURRENT_TIMESTAMP),
        (p_order_id, 'SPLIT',              v_price * 0.10, CURRENT_TIMESTAMP);
END;
$$;
