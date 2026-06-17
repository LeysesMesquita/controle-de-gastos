import type { Metadata } from "next";
import React from "react";
import { TransactionsManager } from "@/components/transactions/TransactionsManager";

export const metadata: Metadata = {
  title: "Controle de Gastos | Lançamentos",
  description: "Gestão de Receitas e Despesas",
};

export default function Transactions() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-title-sm2 font-bold text-gray-800 dark:text-white/90">
            Extrato de Lançamentos
          </h2>
          <p className="text-sm text-gray-500">
            Acompanhe para onde seu dinheiro está indo.
          </p>
        </div>
      </div>
      <TransactionsManager />
    </div>
  );
}
