import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Controle de Gastos | Dashboard",
  description: "Painel Principal Financeiro",
};

export default function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Seu Painel Financeiro</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          A base do seu Controle de Gastos está pronta. Em breve os saldos e gráficos aparecerão aqui.
        </p>
      </div>
    </div>
  );
}
