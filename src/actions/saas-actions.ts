"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

export async function createEnterpriseAction(formData: FormData) {
  try {
    const companyName = formData.get("companyName") as string;
    const adminEmail = formData.get("adminEmail") as string;
    const adminPassword = formData.get("adminPassword") as string;

    if (!companyName || !adminEmail || !adminPassword) {
      return { error: "Todos os campos são obrigatórios." };
    }

    // 1. Verificar se quem está chamando é de fato um SaaS Admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: "Não autorizado: Usuário não autenticado." };
    }

    const { data: saasAdmin } = await supabaseAdmin
      .from("saas_admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!saasAdmin) {
      return { error: "Não autorizado: Apenas Super Admins podem realizar esta ação." };
    }

    // 2. Criar a conta do cliente via Admin API
    // Isso passa pelos metadados o nome da empresa para a trigger b2b
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Já confirma o e-mail para ele poder logar direto
      user_metadata: {
        company_name: companyName,
      },
    });

    if (createError) {
      return { error: `Erro ao criar usuário: ${createError.message}` };
    }

    return { success: true, message: "Empresa e Administrador criados com sucesso!" };

  } catch (error: any) {
    return { error: error.message || "Erro inesperado ao criar empresa." };
  }
}
