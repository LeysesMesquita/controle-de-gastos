"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SaasAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const { data: saasAdmin } = await supabase
        .from("saas_admins")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!saasAdmin) {
        router.push("/");
        return;
      }

      setAuthorized(true);
    }
    checkAuth();
  }, [router]);

  if (!authorized) {
    return <div className="min-h-screen flex items-center justify-center">Verificando permissões...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Painel SaaS (Super Admin)
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}
