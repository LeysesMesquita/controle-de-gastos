import type { Metadata } from "next";
import React from "react";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";

export const metadata: Metadata = {
  title: "Controle de Gastos | Dashboard",
  description: "Painel Principal Financeiro",
};

export default function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-white/90">Seu Painel Financeiro</h2>
        <DashboardMetrics />
      </div>
    </div>
  );
}
