-- ==========================================
-- SCRIPT DE CRIAÇÃO - CONTROLE DE GASTOS
-- Rode este script no SQL Editor do Supabase
-- ==========================================

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extensão do usuário logado)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ACCOUNTS (Contas Bancárias / Carteira)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CHECKING', 'SAVINGS', 'CASH')),
    initial_balance NUMERIC(10, 2) DEFAULT 0.00,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREDIT CARDS
CREATE TABLE public.credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    limit_amount NUMERIC(10, 2) NOT NULL,
    closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREDIT CARD INVOICES -
CREATE TABLE public.credit_card_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED', 'PARTIALLY_PAID', 'PAID')),
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    amount_paid NUMERIC(10, 2) DEFAULT 0.00,
    payment_date DATE,
    UNIQUE(credit_card_id, month, year)
);

-- 5. CATEGORIES
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    color TEXT,
    icon TEXT,
    monthly_budget NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TAGS (Centros de Custo / Viagens)
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. GOALS (Metas e Cofrinhos)
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(10, 2) NOT NULL,
    current_amount NUMERIC(10, 2) DEFAULT 0.00,
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. FORECASTS (Previsões e Contas a Pagar/Receber)
CREATE TABLE public.forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    expected_amount NUMERIC(10, 2) NOT NULL,
    actual_amount_paid NUMERIC(10, 2),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TRANSACTIONS
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('DEBIT', 'CREDIT', 'CASH', 'PIX', 'BOLETO')),
    
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Vínculos de Pagamentos e Faturas
    forecast_id UUID REFERENCES public.forecasts(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL,
    
    -- Parcelamentos
    installment_number INTEGER,
    total_installments INTEGER,
    parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Atualiza foreign key do forecast para a transação real
ALTER TABLE public.forecasts ADD COLUMN transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 10. TRANSACTION_TAGS
CREATE TABLE public.transaction_tags (
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

-- 11. LOANS
CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('GIVEN', 'RECEIVED')),
    person_name TEXT NOT NULL,
    principal_amount NUMERIC(10, 2) NOT NULL,
    interest_rate_per_month NUMERIC(5, 2) DEFAULT 0.00,
    late_fee_percent NUMERIC(5, 2) DEFAULT 0.00,
    late_interest_rate_per_day NUMERIC(5, 2) DEFAULT 0.00,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAID', 'DEFAULTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. LOAN_PAYMENTS
CREATE TABLE public.loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    principal_paid NUMERIC(10, 2) DEFAULT 0.00,
    interest_and_fees_paid NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. PRODUCTS (Mercado e Historico)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    barcode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. TRANSACTION_ITEMS (Itens de Nota Fiscal)
CREATE TABLE public.transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 3) NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- POLÍTICAS DE SEGURANÇA (Row Level Security)
-- ==========================================
-- Exemplo de RLS para Profiles:
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- NOTA: Como o escopo é família/compartilhado, em produção você deverá configurar as RLS 
-- para permitir acesso baseado na organização ou em um grupo de usuários permitidos.
