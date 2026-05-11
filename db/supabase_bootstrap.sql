-- ============================================================================
-- DbProject — Supabase bootstrap (single-shot script)
--
-- Paste this whole file into the Supabase SQL editor and run it once on a
-- fresh project. Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE everywhere).
--
-- Load order:
--   1. pgcrypto
--   2. tables (users first, FK-safe order, circular orders↔bid fixed at end)
--   3. row-level triggers on our tables
--   4. stored procedures (notifications + progressive refund inlined)
--   5. views (no neon_auth references)
--   6. auth.users bridge trigger (fires on signup, populates public.users)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    uuid        UUID PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    role        VARCHAR(20)  NOT NULL DEFAULT 'student'
                  CHECK (role IN ('student', 'writer', 'admin')),
    point       INTEGER      NOT NULL DEFAULT 0 CHECK (point >= 0),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS writer (
    id             UUID PRIMARY KEY REFERENCES users(uuid) ON DELETE CASCADE,
    qualification  VARCHAR(150) NOT NULL,
    bio            VARCHAR(500) NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING_APPROVAL'
                     CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED'))
);

CREATE TABLE IF NOT EXISTS subject (
    uuid  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS service (
    uuid                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                      VARCHAR(50)   NOT NULL UNIQUE,
    price_of_first_page       NUMERIC(10,2) NOT NULL CHECK (price_of_first_page > 0),
    price_of_additional_page  NUMERIC(10,2) NOT NULL CHECK (price_of_additional_page > 0)
);

CREATE TABLE IF NOT EXISTS writer_subject (
    writer_id   UUID NOT NULL REFERENCES writer(id)    ON DELETE CASCADE,
    subject_id  UUID NOT NULL REFERENCES subject(uuid) ON DELETE CASCADE,
    PRIMARY KEY (writer_id, subject_id)
);

CREATE TABLE IF NOT EXISTS writer_service (
    writer_id   UUID NOT NULL REFERENCES writer(id)    ON DELETE CASCADE,
    service_id  UUID NOT NULL REFERENCES service(uuid) ON DELETE CASCADE,
    PRIMARY KEY (writer_id, service_id)
);

CREATE TABLE IF NOT EXISTS orders (
    uuid              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES users(uuid),
    writer_id         UUID REFERENCES writer(id),
    accepted_bid_id   UUID,
    subject_id        UUID NOT NULL REFERENCES subject(uuid),
    service_id        UUID NOT NULL REFERENCES service(uuid),
    title             VARCHAR(200) NOT NULL,
    additional_info   TEXT,
    file_path         VARCHAR(500),
    pages             INTEGER       NOT NULL CHECK (pages > 0),
    minimum_price     NUMERIC(10,2) NOT NULL CHECK (minimum_price > 0),
    selected_price    NUMERIC(10,2) CHECK (selected_price >= minimum_price),
    deadline_offered  TIMESTAMPTZ   NOT NULL,
    academic_level    VARCHAR(30)   NOT NULL CHECK (academic_level IN ('HIGH_SCHOOL','UNDERGRADUATE','MASTERS','PHD')),
    citation_style    VARCHAR(20)   CHECK (citation_style IN ('APA','MLA','HARVARD','CHICAGO','NONE')),
    status            VARCHAR(30)   NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','BIDDING','ASSIGNED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','REVISION_REQUESTED','COMPLETED','DISPUTED','CANCELLED','REFUNDED')),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bid (
    uuid              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id          UUID NOT NULL REFERENCES orders(uuid) ON DELETE CASCADE,
    writer_id         UUID NOT NULL REFERENCES writer(id),
    offered_price     NUMERIC(10,2) NOT NULL CHECK (offered_price > 0),
    offered_deadline  TIMESTAMPTZ   NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','ACCEPTED','REJECTED','WITHDRAWN')),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, writer_id)
);

-- Circular FK: orders.accepted_bid_id → bid.uuid (added after bid exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_accepted_bid' AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT fk_accepted_bid
            FOREIGN KEY (accepted_bid_id) REFERENCES bid(uuid);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS submission (
    uuid                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id               UUID NOT NULL REFERENCES orders(uuid) ON DELETE CASCADE,
    count                  INTEGER      NOT NULL CHECK (count > 0),
    file_path              VARCHAR(500) NOT NULL,
    watermarked_file_path  VARCHAR(500) NOT NULL,
    status                 VARCHAR(30)  NOT NULL DEFAULT 'PENDING_REVIEW'
                             CHECK (status IN ('PENDING_REVIEW','ACCEPTED','REVISION_REQUESTED')),
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, count)
);

CREATE TABLE IF NOT EXISTS revision (
    uuid           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id  UUID NOT NULL REFERENCES submission(uuid) ON DELETE CASCADE,
    order_id       UUID NOT NULL REFERENCES orders(uuid)     ON DELETE CASCADE,
    changes        TEXT NOT NULL CHECK (LENGTH(changes) >= 50),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    uuid           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES orders(uuid) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL
                     CHECK (status IN ('HELD','RELEASED_TO_WRITER','REFUNDED','SPLIT')),
    amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    received_date  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    release_date   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chat (
    uuid       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES orders(uuid) ON DELETE CASCADE,
    sender_id  UUID NOT NULL REFERENCES users(uuid),
    text       TEXT NOT NULL,
    time       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS review (
    uuid         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL REFERENCES orders(uuid) ON DELETE CASCADE,
    reviewer_id  UUID NOT NULL REFERENCES users(uuid),
    rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text         TEXT,
    time         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS notification (
    uuid        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(uuid)  ON DELETE CASCADE,
    order_id    UUID REFERENCES orders(uuid)          ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    text        TEXT NOT NULL,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Trigger functions on our own tables
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_calc_minimum_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    first_rate NUMERIC(10,2);
    extra_rate NUMERIC(10,2);
BEGIN
    SELECT price_of_first_page, price_of_additional_page
    INTO first_rate, extra_rate
    FROM service WHERE uuid = NEW.service_id;

    NEW.minimum_price := first_rate + (extra_rate * (NEW.pages - 1));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_minimum_price ON orders;
CREATE TRIGGER trg_calc_minimum_price
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION fn_calc_minimum_price();


CREATE OR REPLACE FUNCTION fn_bid_accepted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'ACCEPTED' AND (OLD.status IS DISTINCT FROM 'ACCEPTED') THEN
        UPDATE orders
        SET writer_id       = NEW.writer_id,
            accepted_bid_id = NEW.uuid,
            selected_price  = NEW.offered_price,
            status          = 'ASSIGNED'
        WHERE uuid = NEW.order_id;

        UPDATE bid
        SET status = 'REJECTED'
        WHERE order_id = NEW.order_id AND uuid <> NEW.uuid AND status = 'PENDING';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bid_accepted ON bid;
CREATE TRIGGER trg_bid_accepted
AFTER UPDATE ON bid
FOR EACH ROW EXECUTE FUNCTION fn_bid_accepted();


CREATE OR REPLACE FUNCTION fn_block_review_on_refund()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_status VARCHAR(30);
BEGIN
    SELECT status INTO v_status FROM orders WHERE uuid = NEW.order_id;
    IF v_status = 'REFUNDED' THEN
        RAISE EXCEPTION 'Cannot review a refunded order';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_review_on_refund ON review;
CREATE TRIGGER trg_block_review_on_refund
BEFORE INSERT ON review
FOR EACH ROW EXECUTE FUNCTION fn_block_review_on_refund();


CREATE OR REPLACE FUNCTION fn_review_points()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    target_user UUID;
BEGIN
    SELECT CASE
        WHEN NEW.reviewer_id = o.student_id THEN o.writer_id
        ELSE o.student_id
    END INTO target_user
    FROM orders o WHERE o.uuid = NEW.order_id;

    UPDATE users SET point = point + (NEW.rating * 10)
    WHERE uuid = target_user;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_points ON review;
CREATE TRIGGER trg_review_points
AFTER INSERT ON review
FOR EACH ROW EXECUTE FUNCTION fn_review_points();


-- Notifications helper
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


CREATE OR REPLACE FUNCTION fn_bid_accepted_notify()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_title TEXT;
BEGIN
    IF NEW.status = 'ACCEPTED' AND OLD.status IS DISTINCT FROM 'ACCEPTED' THEN
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
FOR EACH ROW EXECUTE FUNCTION fn_bid_accepted_notify();


CREATE OR REPLACE FUNCTION fn_review_notify()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_student_id UUID;
    v_writer_id  UUID;
    v_title      TEXT;
    v_target     UUID;
BEGIN
    SELECT student_id, writer_id, title INTO v_student_id, v_writer_id, v_title
    FROM orders WHERE uuid = NEW.order_id;

    -- notify the person being reviewed, not the reviewer
    v_target := CASE
        WHEN NEW.reviewer_id = v_student_id THEN v_writer_id
        ELSE v_student_id
    END;

    PERFORM fn_notify(
        v_target, NEW.order_id, 'NEW_REVIEW',
        'You received a ' || NEW.rating || '-star review on "' || v_title || '"'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_notify ON review;
CREATE TRIGGER trg_review_notify
AFTER INSERT ON review
FOR EACH ROW EXECUTE FUNCTION fn_review_notify();


-- ----------------------------------------------------------------------------
-- 3. Stored procedures
-- ----------------------------------------------------------------------------

CREATE OR REPLACE PROCEDURE sp_place_bid(
    p_order_id   UUID,
    p_writer_id  UUID,
    p_price      NUMERIC,
    p_deadline   TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
DECLARE
    v_min_price     NUMERIC(10,2);
    v_order_status  VARCHAR(30);
    v_student_id    UUID;
    v_title         TEXT;
    v_writer_name   TEXT;
BEGIN
    SELECT minimum_price, status, student_id, title
    INTO v_min_price, v_order_status, v_student_id, v_title
    FROM orders WHERE uuid = p_order_id;

    IF v_order_status NOT IN ('OPEN', 'BIDDING') THEN
        RAISE EXCEPTION 'Order is not accepting bids (current status: %)', v_order_status;
    END IF;

    IF p_price < v_min_price THEN
        RAISE EXCEPTION 'Bid price (%) is below minimum price (%)', p_price, v_min_price;
    END IF;

    IF EXISTS (
        SELECT 1 FROM bid WHERE order_id = p_order_id AND writer_id = p_writer_id
    ) THEN
        RAISE EXCEPTION 'You have already placed a bid on this order';
    END IF;

    INSERT INTO bid (order_id, writer_id, offered_price, offered_deadline)
    VALUES (p_order_id, p_writer_id, p_price, p_deadline);

    IF v_order_status = 'OPEN' THEN
        UPDATE orders SET status = 'BIDDING' WHERE uuid = p_order_id;
    END IF;

    SELECT name INTO v_writer_name FROM users WHERE uuid = p_writer_id;

    PERFORM fn_notify(
        v_student_id, p_order_id, 'NEW_BID',
        COALESCE(v_writer_name, 'A writer') || ' placed a bid on your order "' || v_title || '"'
    );
END;
$$;


CREATE OR REPLACE PROCEDURE sp_submit_paper(
    p_order_id          UUID,
    p_file_path         VARCHAR,
    p_watermarked_path  VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
    v_count       INTEGER;
    v_student_id  UUID;
    v_title       TEXT;
BEGIN
    SELECT student_id, title INTO v_student_id, v_title
    FROM orders WHERE uuid = p_order_id;

    SELECT COALESCE(MAX(count), 0) + 1 INTO v_count
    FROM submission WHERE order_id = p_order_id;

    INSERT INTO submission (order_id, count, file_path, watermarked_file_path)
    VALUES (p_order_id, v_count, p_file_path, p_watermarked_path);

    UPDATE orders SET status = 'SUBMITTED' WHERE uuid = p_order_id;

    PERFORM fn_notify(
        v_student_id, p_order_id, 'SUBMISSION_READY',
        'Your writer submitted work on "' || v_title || '" — review it now'
    );
END;
$$;


CREATE OR REPLACE PROCEDURE sp_accept_paper(
    p_order_id UUID
)
LANGUAGE plpgsql AS $$
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


CREATE OR REPLACE PROCEDURE sp_request_revision(
    p_order_id       UUID,
    p_submission_id  UUID,
    p_changes        TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_revision_count INTEGER;
    v_writer_id      UUID;
    v_title          TEXT;
BEGIN
    SELECT writer_id, title INTO v_writer_id, v_title
    FROM orders WHERE uuid = p_order_id;

    SELECT COUNT(*) INTO v_revision_count
    FROM revision WHERE order_id = p_order_id;

    IF v_revision_count >= 3 THEN
        RAISE EXCEPTION 'Maximum 3 revisions reached for this order';
    END IF;

    INSERT INTO revision (submission_id, order_id, changes)
    VALUES (p_submission_id, p_order_id, p_changes);

    UPDATE submission SET status = 'REVISION_REQUESTED'
    WHERE uuid = p_submission_id;

    UPDATE orders SET status = 'REVISION_REQUESTED'
    WHERE uuid = p_order_id;

    PERFORM fn_notify(
        v_writer_id, p_order_id, 'REVISION_REQUESTED',
        'A revision was requested on "' || v_title || '"'
    );
END;
$$;


-- Progressive refund:
--   0 subs: 70% student / 25% writer / 5%  platform
--   1 sub : 50% student / 40% writer / 10% platform
--   2 subs: 30% student / 60% writer / 10% platform
--   3+   : blocked
CREATE OR REPLACE PROCEDURE sp_request_refund(
    p_order_id UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_price        NUMERIC(10,2);
    v_sub_count    INTEGER;
    v_student_pct  NUMERIC(5,2);
    v_writer_pct   NUMERIC(5,2);
    v_platform_pct NUMERIC(5,2);
    v_writer_id    UUID;
    v_title        TEXT;
BEGIN
    SELECT selected_price, writer_id, title INTO v_price, v_writer_id, v_title
    FROM orders WHERE uuid = p_order_id;

    IF v_price IS NULL THEN
        RAISE EXCEPTION 'Cannot refund an order with no selected price';
    END IF;

    SELECT COUNT(*) INTO v_sub_count FROM submission WHERE order_id = p_order_id;

    IF v_sub_count = 0 THEN
        v_student_pct := 0.70; v_writer_pct := 0.25; v_platform_pct := 0.05;
    ELSIF v_sub_count = 1 THEN
        v_student_pct := 0.50; v_writer_pct := 0.40; v_platform_pct := 0.10;
    ELSIF v_sub_count = 2 THEN
        v_student_pct := 0.30; v_writer_pct := 0.60; v_platform_pct := 0.10;
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


-- ----------------------------------------------------------------------------
-- 4. Views (no neon_auth — read name/email/created_at from our users table)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_order_pool AS
SELECT
    o.uuid           AS order_id,
    o.title,
    o.pages,
    o.minimum_price,
    o.deadline_offered,
    o.academic_level,
    o.citation_style,
    o.created_at,
    sub.name         AS subject_name,
    srv.name         AS service_name,
    stu.name         AS student_name,
    (SELECT COUNT(*) FROM bid b WHERE b.order_id = o.uuid) AS bid_count
FROM orders o
JOIN subject sub ON sub.uuid = o.subject_id
JOIN service srv ON srv.uuid = o.service_id
JOIN users   stu ON stu.uuid = o.student_id
WHERE o.status IN ('OPEN', 'BIDDING');


CREATE OR REPLACE VIEW v_writer_leaderboard AS
SELECT
    u.uuid              AS writer_id,
    u.name,
    u.point,
    u.created_at,
    w.status,
    CASE
        WHEN u.point >= 1000 THEN 'Elite'
        WHEN u.point >=  600 THEN 'Platinum'
        WHEN u.point >=  300 THEN 'Gold'
        WHEN u.point >=  100 THEN 'Silver'
        ELSE 'Bronze'
    END AS tier,
    CASE
        WHEN CURRENT_TIMESTAMP - u.created_at >= INTERVAL '365 days' THEN 'Veteran'
        WHEN CURRENT_TIMESTAMP - u.created_at >= INTERVAL '180 days' THEN 'Half Year'
        WHEN CURRENT_TIMESTAMP - u.created_at >=  INTERVAL '90 days' THEN 'Quarterly'
        WHEN CURRENT_TIMESTAMP - u.created_at >=  INTERVAL '30 days' THEN '1 Month'
        ELSE 'New'
    END AS tenure_badge,
    (SELECT COUNT(*) FROM orders WHERE writer_id = u.uuid AND status = 'COMPLETED') AS completed_orders,
    (SELECT AVG(rating)::NUMERIC(3,2) FROM review r
        JOIN orders o ON o.uuid = r.order_id
        WHERE o.writer_id = u.uuid) AS avg_rating
FROM users u
JOIN writer w ON w.id = u.uuid
WHERE u.role = 'writer' AND w.status = 'APPROVED'
ORDER BY u.point DESC;


CREATE OR REPLACE VIEW v_user_orders AS
SELECT
    o.uuid            AS order_id,
    o.title,
    o.status,
    o.selected_price,
    o.created_at,
    o.student_id,
    o.writer_id,
    stu.name          AS student_name,
    wri.name          AS writer_name,
    sub.name          AS subject_name,
    srv.name          AS service_name
FROM orders o
JOIN users  stu ON stu.uuid = o.student_id
LEFT JOIN users wri ON wri.uuid = o.writer_id
JOIN subject sub ON sub.uuid = o.subject_id
JOIN service srv ON srv.uuid = o.service_id;


CREATE OR REPLACE VIEW v_writer_profile AS
SELECT
    u.uuid              AS writer_id,
    u.name,
    u.point,
    w.qualification,
    w.bio,
    (SELECT COUNT(*) FROM orders WHERE writer_id = u.uuid AND status = 'COMPLETED') AS completed_orders,
    (SELECT AVG(rating)::NUMERIC(3,2) FROM review r
        JOIN orders o ON o.uuid = r.order_id
        WHERE o.writer_id = u.uuid) AS avg_rating,
    (SELECT ARRAY_AGG(s.name) FROM writer_subject ws
        JOIN subject s ON s.uuid = ws.subject_id
        WHERE ws.writer_id = u.uuid) AS subjects,
    (SELECT ARRAY_AGG(s.name) FROM writer_service wsv
        JOIN service s ON s.uuid = wsv.service_id
        WHERE wsv.writer_id = u.uuid) AS services
FROM users u
JOIN writer w ON w.id = u.uuid
WHERE u.role = 'writer' AND w.status = 'APPROVED';


-- ----------------------------------------------------------------------------
-- 5. Auth bridge — fires on every Supabase signup, creates public.users row
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (uuid, name, email, created_at, role, point)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.created_at,
        'student',
        0
    )
    ON CONFLICT (uuid) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION fn_auth_user_created();


-- ----------------------------------------------------------------------------
-- 6. RLS — disable on our public tables. The app queries through a service-role
-- pooler connection anyway; we don't want RLS blocking our server actions.
-- ----------------------------------------------------------------------------

ALTER TABLE users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE writer          DISABLE ROW LEVEL SECURITY;
ALTER TABLE subject         DISABLE ROW LEVEL SECURITY;
ALTER TABLE service         DISABLE ROW LEVEL SECURITY;
ALTER TABLE writer_subject  DISABLE ROW LEVEL SECURITY;
ALTER TABLE writer_service  DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders          DISABLE ROW LEVEL SECURITY;
ALTER TABLE bid             DISABLE ROW LEVEL SECURITY;
ALTER TABLE submission      DISABLE ROW LEVEL SECURITY;
ALTER TABLE revision        DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat            DISABLE ROW LEVEL SECURITY;
ALTER TABLE review          DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification    DISABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- 7. Seed data — admin user slot, subjects, services
-- Insert subjects and services. Admin role must be flipped manually in dashboard.
-- ----------------------------------------------------------------------------

INSERT INTO subject (name) VALUES
    ('English Literature'), ('History'), ('Psychology'), ('Sociology'),
    ('Economics'), ('Business'), ('Marketing'), ('Computer Science'),
    ('Mathematics'), ('Biology'), ('Chemistry'), ('Physics'),
    ('Political Science'), ('Philosophy'), ('Law'), ('Nursing')
ON CONFLICT (name) DO NOTHING;

INSERT INTO service (name, price_of_first_page, price_of_additional_page) VALUES
    ('Essay',              15.00, 10.00),
    ('Research Paper',     25.00, 15.00),
    ('Case Study',         20.00, 12.00),
    ('Thesis Chapter',     40.00, 25.00),
    ('Literature Review',  30.00, 18.00),
    ('Report',             18.00, 11.00),
    ('Dissertation',       50.00, 30.00)
ON CONFLICT (name) DO NOTHING;
