import React from "react";
import SaasBreadcrumb from "@/components/common/SaasBreadcrumb";

export const metadata = {
  title: "Planos de Cobrança | SaaS Mestre",
};

export default function PlanosPage() {
  return (
    <div>
      <SaasBreadcrumb pageTitle="Planos de Cobrança" />
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-title-md font-semibold text-gray-800 dark:text-white/90 mb-4">Gestão de Planos</h3>
        <p className="text-gray-500 mb-6">Aqui você poderá definir os preços (Mensal, Anual, etc) e vincular as empresas cadastradas.</p>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          Em construção 🚧
        </div>
      </div>
    </div>
  );
}
