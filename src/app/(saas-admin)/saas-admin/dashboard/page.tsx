import React from "react";
import SaasBreadcrumb from "@/components/common/SaasBreadcrumb";

export const metadata = {
  title: "Dashboard | SaaS Mestre",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <SaasBreadcrumb pageTitle="Visão Geral" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {/* Cards de Exemplo */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <h4 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90">
            Total de Empresas
          </h4>
          <span className="text-3xl font-bold text-brand-500">1</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <h4 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90">
            MRR Estimado
          </h4>
          <span className="text-3xl font-bold text-success-500">R$ 0,00</span>
        </div>
      </div>
      
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-title-md font-semibold text-gray-800 dark:text-white/90 mb-4">Métricas Recentes</h3>
        <p className="text-gray-500">Gráficos serão implementados aqui futuramente.</p>
      </div>
    </div>
  );
}
