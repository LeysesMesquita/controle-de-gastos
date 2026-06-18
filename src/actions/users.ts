"use server";
import { createClient } from "@supabase/supabase-js";

// Usa a chave mestre para conseguir criar usuários sem deslogar o admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function createUserAction(email: string, password: string, companyId: string, role: string) {
  try {
    // 1. Cria o usuário no auth (núcleo)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Pula a verificação de email
    });

    if (authError) throw new Error(authError.message);

    if (!authData.user) throw new Error("Erro desconhecido ao criar usuário no auth");

    // 2. Vincula o usuário à empresa atual
    const { error: dbError } = await supabaseAdmin.from("company_users").insert({
      company_id: companyId,
      user_id: authData.user.id,
      role: role
    });

    if (dbError) {
      // Se der erro ao vincular, tentamos apagar o usuário para não ficar sujo
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(dbError.message);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteUserAction(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
