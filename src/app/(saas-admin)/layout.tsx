"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SaasSidebar from "@/layout/SaasSidebar";
import SaasHeader from "@/layout/SaasHeader";
import Backdrop from "@/layout/Backdrop";
import { useSidebar } from "@/context/SidebarContext";

export default function SaasAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [errorDetails, setErrorDetails] = useState("");
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!user) {
        console.error("Nenhum usuário logado encontrado.", userError);
        router.push("/saas-login");
        return;
      }

      const { data: saasAdmin, error: saasError } = await supabase
        .from("saas_admins")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!saasAdmin) {
        console.error("Usuário logado não está na tabela saas_admins.", saasError);
        setErrorDetails("Você está logado, mas seu ID não foi encontrado na tabela saas_admins. Vá no Supabase e insira este ID: " + user.id);
        return;
      }

      setAuthorized(true);
    }
    checkAuth();
  }, [router]);

  if (errorDetails) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-red-500 p-10 font-bold text-center">{errorDetails}</div>;
  }

  if (!authorized) {
    return <div className="min-h-screen flex items-center justify-center">Verificando permissões...</div>;
  }

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <SaasSidebar />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin} bg-gray-50 dark:bg-gray-900`}>
        <SaasHeader />
        <div className="p-4 md:p-6 2xl:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
