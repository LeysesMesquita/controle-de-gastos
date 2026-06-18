import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DefaultLayout from "@/layout/DefaultLayout"; // Assumindo que você quer a barra lateral

export default async function SaasAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificação de Segurança Global para a rota /saas-admin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Verifica se ele está na tabela de Super Admins
  const { data: saasAdmin } = await supabase
    .from("saas_admins")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!saasAdmin) {
    // Se não for Super Admin, manda pro painel normal
    redirect("/");
  }

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Painel SaaS (Super Admin)
          </h2>
        </div>
        {children}
      </div>
    </DefaultLayout>
  );
}
