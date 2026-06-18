-- =========================================================================================
-- SAAS ADMIN SETUP
-- Execute este script no SQL Editor do Supabase
-- =========================================================================================

-- 1. Criar tabela para os Super Administradores do SaaS
CREATE TABLE IF NOT EXISTS public.saas_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Apenas quem está na tabela pode se ver
ALTER TABLE public.saas_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SaaS Admins can see themselves" ON public.saas_admins FOR SELECT USING (auth.uid() = id);

-- NOTA: Você precisará inserir seu próprio ID manualmente nesta tabela pelo painel do Supabase.

-- 2. Atualizar a Trigger para aceitar Nome da Empresa Customizado
-- Se o raw_user_meta_data contiver 'company_name', usamos ele em vez do email.
CREATE OR REPLACE FUNCTION public.handle_new_user_b2b()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  custom_company_name TEXT;
  final_company_name TEXT;
BEGIN
  -- Extrai o nome da empresa dos metadados, se existir
  custom_company_name := NEW.raw_user_meta_data->>'company_name';
  
  IF custom_company_name IS NOT NULL AND custom_company_name != '' THEN
    final_company_name := custom_company_name;
  ELSE
    final_company_name := NEW.email;
  END IF;

  INSERT INTO public.companies (name) VALUES (final_company_name) RETURNING id INTO new_company_id;
  INSERT INTO public.company_users (company_id, user_id, role) VALUES (new_company_id, NEW.id, 'OWNER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Proteger a role 'OWNER' de ser deletada da company_users
CREATE OR REPLACE FUNCTION public.prevent_owner_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'OWNER' THEN
    RAISE EXCEPTION 'Não é permitido excluir o usuário principal (OWNER) da empresa.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_owner_deletion ON public.company_users;
CREATE TRIGGER trg_prevent_owner_deletion
BEFORE DELETE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_owner_deletion();
