-- 1. Criação das tabelas base de SaaS
CREATE TABLE public.companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.company_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'USER', -- 'OWNER', 'ADMIN', 'USER'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- 2. Habilitar RLS nas novas tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas (Qualquer usuário logado pode ler se estiver na company_users)
CREATE POLICY "Users can view their companies" ON public.companies 
FOR SELECT USING (id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view company users" ON public.company_users 
FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 3. Adicionar company_id nas tabelas operacionais
ALTER TABLE public.accounts ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.credit_cards ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.credit_card_invoices ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.forecasts ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.loans ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.loan_payments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 4. Bloco de Migração: Transformar cada usuário existente em uma Empresa (OWNER)
DO $$
DECLARE 
    rec RECORD;
    new_company_id UUID;
BEGIN
    FOR rec IN SELECT DISTINCT id, email FROM auth.users LOOP
        -- Cria a empresa para o usuário (Usando o email como nome base da empresa)
        INSERT INTO public.companies (name) VALUES (COALESCE(rec.email, 'Empresa de ' || rec.id)) RETURNING id INTO new_company_id;
        
        -- Coloca o usuário como dono da empresa
        INSERT INTO public.company_users (company_id, user_id, role) VALUES (new_company_id, rec.id, 'OWNER');

        -- Migra os dados existentes do usuário para essa nova empresa
        UPDATE public.accounts SET company_id = new_company_id WHERE user_id = rec.id;
        UPDATE public.categories SET company_id = new_company_id WHERE user_id = rec.id;
        UPDATE public.transactions SET company_id = new_company_id WHERE user_id = rec.id;
        UPDATE public.credit_cards SET company_id = new_company_id WHERE user_id = rec.id;
        UPDATE public.forecasts SET company_id = new_company_id WHERE user_id = rec.id;
        UPDATE public.loans SET company_id = new_company_id WHERE user_id = rec.id;
    END LOOP;
END $$;

-- Atualizar sub-tabelas baseadas nas tabelas principais
UPDATE public.credit_card_invoices i SET company_id = (SELECT company_id FROM public.credit_cards c WHERE c.id = i.credit_card_id);
UPDATE public.loan_payments lp SET company_id = (SELECT company_id FROM public.loans l WHERE l.id = lp.loan_id);

-- Tornar company_id NOT NULL agora que todos os dados antigos ganharam ID
ALTER TABLE public.accounts ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.credit_cards ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.credit_card_invoices ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.forecasts ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.loans ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.loan_payments ALTER COLUMN company_id SET NOT NULL;

-- 5. Atualizar RLS Antigas para a Nova Política B2B
-- DROP das antigas e contornar caso elas já tenham sido apagadas
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view their own credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.credit_card_invoices;
DROP POLICY IF EXISTS "Users can view their own forecasts" ON public.forecasts;
DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can view their own loan payments" ON public.loan_payments;

-- CREATE das Novas (ALL significa SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "B2B Company Access accounts" ON public.accounts FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "B2B Company Access categories" ON public.categories FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "B2B Company Access transactions" ON public.transactions FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "B2B Company Access credit_cards" ON public.credit_cards FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "B2B Company Access credit_card_invoices" ON public.credit_card_invoices FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "B2B Company Access forecasts" ON public.forecasts FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "B2B Company Access loans" ON public.loans FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "B2B Company Access loan_payments" ON public.loan_payments FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Trigger Básico: Se alguém se cadastrar sozinho pela tela principal, ele vira uma empresa.
CREATE OR REPLACE FUNCTION public.handle_new_user_b2b()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO public.companies (name) VALUES (NEW.email) RETURNING id INTO new_company_id;
  INSERT INTO public.company_users (company_id, user_id, role) VALUES (new_company_id, NEW.id, 'OWNER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_b2b ON auth.users;
CREATE TRIGGER on_auth_user_created_b2b
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_b2b();
