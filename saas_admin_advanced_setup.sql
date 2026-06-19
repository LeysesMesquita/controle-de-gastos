-- 1. Tabela de Permissões (Roles) do SaaS
CREATE TABLE IF NOT EXISTS public.saas_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir roles padrões
INSERT INTO public.saas_roles (name, description) VALUES 
('SUPER_ADMIN', 'Acesso total a todas as funcionalidades do SaaS'),
('SUPPORT', 'Pode visualizar empresas e usuários, mas não pode alterar planos ou deletar contas'),
('SALES', 'Pode criar novas empresas e gerenciar planos, mas não pode gerenciar usuários do SaaS')
ON CONFLICT (name) DO NOTHING;

-- 2. Tabela de Planos de Cobrança
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir planos básicos de exemplo
INSERT INTO public.saas_plans (name, price, billing_cycle) VALUES 
('Básico Mensal', 99.90, 'monthly'),
('Pro Mensal', 199.90, 'monthly'),
('Enterprise Anual', 1999.90, 'annual')
ON CONFLICT DO NOTHING;

-- 3. Modificações nas tabelas existentes

-- Adicionar role_id na tabela saas_admins (referenciando saas_roles)
ALTER TABLE public.saas_admins 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.saas_roles(id);

-- Opcional: Atribuir SUPER_ADMIN para os admins já existentes
UPDATE public.saas_admins 
SET role_id = (SELECT id FROM public.saas_roles WHERE name = 'SUPER_ADMIN')
WHERE role_id IS NULL;

-- Adicionar plan_id e status na tabela companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.saas_plans(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled'));
