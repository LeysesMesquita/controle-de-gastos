import React from "react";
import SaasBreadcrumb from "@/components/common/SaasBreadcrumb";

export const metadata = {
  title: "Equipe do SaaS | SaaS Mestre",
};

export default function UsuariosSaasPage() {
  return (
    <div>
      <SaasBreadcrumb pageTitle="Usuários do SaaS" />
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-title-md font-semibold text-gray-800 dark:text-white/90 mb-4">Sua Equipe</h3>
        <p className="text-gray-500 mb-6">Adicione pessoas da sua empresa para te ajudarem a gerenciar as contas dos clientes.</p>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          Em construção 🚧
        </div>
      </div>
    </div>
  );
}
