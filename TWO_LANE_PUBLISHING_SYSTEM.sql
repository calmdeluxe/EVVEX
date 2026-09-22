-- ============================================================================
-- CALMREADER: TWO-LANE PUBLISHING ECONOMY & RIGHTS ARCHITECTURE MIGRATION
-- ============================================================================
-- Architecture Overview:
--
-- LANE A: CALMREADER ENTERTAINMENT CONTENT (< 30,000 words)
--  - Short stories, episodic reads, articles, interactive pieces, and trivia reads.
--  - Author retains 100% legal copyright ownership.
--  - CalmReader granted non-exclusive digital distribution license + trivia adaptation rights.
--  - Author is free to distribute/publish elsewhere concurrently.
--  - Net Revenue Split (after Paystack gateway fee deduction):
--      * 30% Author Net
--      * 20% Marketing Partner (MPR) Net (curation, marketing, engagement)
--      * 50% Platform Net (absorbs gateway fee and payment risk)
--
-- LANE B: INDEPENDENT PUBLISHING (30,000+ words)
--  - Full-length literary novels, non-fiction, poetry collections, major manuscripts.
--  - Creator retains 100% legal copyright ownership.
--  - CalmReader granted exclusive 12-month digital distribution license.
--  - Net Revenue Split (after Paystack gateway fee deduction):
--      * 70% Author Net
--      * 30% Platform Net (distribution & hosting fee)
--      * MPR optional (5% referral bonus from platform share if referred, author always gets 70%)
--
-- REVENUE RULES & COST DEDUCTIONS:
--  - Gross vs Net: Percentages apply strictly to NET REVENUE.
--  - Payment Gateway Fee (Paystack: 1.5% + ₦100, waived under ₦2,500, capped at ₦2,000)
--    is deducted first from gross sales before calculating author, MPR, and platform shares.
--  - Platform bears transaction processing fees and customer refunds first.
--
-- MPR BOUNDARY RULES:
--  - MPR does NOT own the author.
--  - MPR earns from verified marketing campaigns, content curation, and real engagement.
--  - Authors can switch their assigned MPR after 6 months (180 days).
-- ============================================================================

-- 1. ADD TWO-LANE COLUMNS TO BOOKS TABLE
DO $$
BEGIN
    -- Publishing Lane & Content Type ('lane_a' = Entertainment, 'lane_b' = Independent)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'content_type') THEN
        ALTER TABLE books ADD COLUMN content_type VARCHAR(50) DEFAULT 'lane_a';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'publishing_lane') THEN
        ALTER TABLE books ADD COLUMN publishing_lane VARCHAR(50) DEFAULT 'lane_a';
    END IF;

    -- Dynamic Word Count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'word_count') THEN
        ALTER TABLE books ADD COLUMN word_count INTEGER DEFAULT 0;
    END IF;

    -- Legal & Rights Declarations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'rights_declared') THEN
        ALTER TABLE books ADD COLUMN rights_declared BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'exclusivity_declared') THEN
        ALTER TABLE books ADD COLUMN exclusivity_declared BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'trivia_rights_granted') THEN
        ALTER TABLE books ADD COLUMN trivia_rights_granted BOOLEAN DEFAULT true;
    END IF;

    -- Exclusivity Timestamps (Lane B 12-Month Exclusivity)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'exclusivity_start_date') THEN
        ALTER TABLE books ADD COLUMN exclusivity_start_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'exclusivity_end_date') THEN
        ALTER TABLE books ADD COLUMN exclusivity_end_date TIMESTAMPTZ;
    END IF;

    -- Revenue Shares (Net Percentages)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'author_share') THEN
        ALTER TABLE books ADD COLUMN author_share INTEGER DEFAULT 30;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'platform_share') THEN
        ALTER TABLE books ADD COLUMN platform_share INTEGER DEFAULT 50;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'mpr_share') THEN
        ALTER TABLE books ADD COLUMN mpr_share INTEGER DEFAULT 20;
    END IF;

    -- Referral & Conversion Tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'mpr_referral_code') THEN
        ALTER TABLE books ADD COLUMN mpr_referral_code VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'ipc_conversion_status') THEN
        ALTER TABLE books ADD COLUMN ipc_conversion_status VARCHAR(50) DEFAULT 'none';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'ipc_applied_at') THEN
        ALTER TABLE books ADD COLUMN ipc_applied_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'ipc_approved_at') THEN
        ALTER TABLE books ADD COLUMN ipc_approved_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. ADD MPR BOUNDARY & 6-MONTH SWITCH COLUMNS TO USERS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by_mpr') THEN
        ALTER TABLE users ADD COLUMN referred_by_mpr UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mpr_assigned_at') THEN
        ALTER TABLE users ADD COLUMN mpr_assigned_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mpr_referral_locked') THEN
        ALTER TABLE users ADD COLUMN mpr_referral_locked BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mpr_last_switch_at') THEN
        ALTER TABLE users ADD COLUMN mpr_last_switch_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. CREATE MPR ASSIGNMENTS LOG (Tracks 6-Month Switch History)
CREATE TABLE IF NOT EXISTS mpr_assignments_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    mpr_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'assigned', 'switched', 'unlinked', 'locked_by_sale'
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE CAMPAIGN CONTRACTS TABLE (₦2,000 - ₦50,000 Escrow with 7-Day Holdback)
CREATE TABLE IF NOT EXISTS campaign_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    mpr_id UUID REFERENCES users(id) ON DELETE SET NULL,
    book_id BIGINT REFERENCES books(id) ON DELETE CASCADE NOT NULL,
    campaign_fee NUMERIC NOT NULL CHECK (campaign_fee >= 2000 AND campaign_fee <= 50000),
    platform_fee NUMERIC NOT NULL,
    mpr_payout NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'funded', 'active', 'completed', 'disputed', 'settled', 'cancelled'
    payment_reference VARCHAR(255),
    success_metrics JSONB DEFAULT '{"target_clicks": 500, "target_reads": 100, "target_sales": 20, "current_clicks": 0, "current_reads": 0, "current_sales": 0}'::jsonb,
    deliverables TEXT,
    author_signature BOOLEAN DEFAULT true,
    mpr_signature BOOLEAN DEFAULT false,
    dispute_reason TEXT,
    dispute_opened_at TIMESTAMPTZ,
    payout_release_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE INDEXES FOR OPTIMAL QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_books_publishing_lane ON books(publishing_lane);
CREATE INDEX IF NOT EXISTS idx_books_content_type ON books(content_type);
CREATE INDEX IF NOT EXISTS idx_books_word_count ON books(word_count);
CREATE INDEX IF NOT EXISTS idx_books_ipc_status ON books(ipc_conversion_status);
CREATE INDEX IF NOT EXISTS idx_users_referred_by_mpr ON users(referred_by_mpr);
CREATE INDEX IF NOT EXISTS idx_campaigns_author ON campaign_contracts(author_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_mpr ON campaign_contracts(mpr_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_book ON campaign_contracts(book_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaign_contracts(status);

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE campaign_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpr_assignments_log ENABLE ROW LEVEL SECURITY;

-- Campaign Contracts Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaign_contracts;
    CREATE POLICY "Users can view their own campaigns"
    ON campaign_contracts FOR SELECT
    USING (
        auth.uid() = author_id 
        OR auth.uid() = mpr_id 
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_admin = true OR is_admin = 1))
    );

    DROP POLICY IF EXISTS "Authors can create campaigns" ON campaign_contracts;
    CREATE POLICY "Authors can create campaigns"
    ON campaign_contracts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

    DROP POLICY IF EXISTS "Parties can update their contracts" ON campaign_contracts;
    CREATE POLICY "Parties can update their contracts"
    ON campaign_contracts FOR UPDATE
    USING (
        auth.uid() = author_id 
        OR auth.uid() = mpr_id 
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_admin = true OR is_admin = 1))
    );
END $$;

-- 7. SQL FUNCTION: CALCULATE NET REVENUE & PROCESSING FEE
CREATE OR REPLACE FUNCTION calculate_paystack_fee(gross_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    fee NUMERIC;
BEGIN
    IF gross_amount IS NULL OR gross_amount <= 0 THEN
        RETURN 0;
    END IF;
    
    fee := gross_amount * 0.015;
    IF gross_amount >= 2500 THEN
        fee := fee + 100;
    END IF;
    
    -- Cap fee at ₦2,000 maximum
    IF fee > 2000 THEN
        fee := 2000;
    END IF;
    
    RETURN ROUND(fee);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. SQL FUNCTION: VERIFY MPR 6-MONTH SWITCH ELIGIBILITY
CREATE OR REPLACE FUNCTION can_author_switch_mpr(p_author_id UUID)
RETURNS TABLE (
    can_switch BOOLEAN,
    days_assigned INTEGER,
    days_remaining INTEGER,
    current_mpr_id UUID
) AS $$
DECLARE
    v_assigned_at TIMESTAMPTZ;
    v_last_switch_at TIMESTAMPTZ;
    v_base_date TIMESTAMPTZ;
    v_days INTEGER;
    v_mpr UUID;
BEGIN
    SELECT referred_by_mpr, mpr_assigned_at, mpr_last_switch_at
    INTO v_mpr, v_assigned_at, v_last_switch_at
    FROM users
    WHERE id = p_author_id;

    IF v_mpr IS NULL THEN
        RETURN QUERY SELECT true, 0, 0, NULL::UUID;
        RETURN;
    END IF;

    v_base_date := COALESCE(v_last_switch_at, v_assigned_at, NOW() - INTERVAL '181 days');
    v_days := EXTRACT(DAY FROM (NOW() - v_base_date))::INTEGER;

    IF v_days >= 180 THEN
        RETURN QUERY SELECT true, v_days, 0, v_mpr;
    ELSE
        RETURN QUERY SELECT false, v_days, (180 - v_days), v_mpr;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;
