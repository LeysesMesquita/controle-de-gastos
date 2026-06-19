import React from "react";
import SaasBreadcrumb from "@/components/common/SaasBreadcrumb";

export const metadata = {
  title: "Permissões de Acesso | SaaS Mestre",
};

export default function PermissoesPage() {
  return (
    <div>
      <SaasBreadcrumb pageTitle="Permissões de Acesso" />
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-title-md font-semibold text-gray-800 dark:text-white/90 mb-4">Perfis de Acesso (Roles)</h3>
        <p className="text-gray-500 mb-6">Crie e edite o que cada membro da sua equipe pode acessar ou não.</p>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          Em construção 🚧
        </div>
      </div>
    </div>
  );
}
