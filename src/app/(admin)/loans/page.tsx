import type { Metadata } from "next";
import React from "react";
import { LoansManager } from "@/components/loans/LoansManager";

export const metadata: Metadata = {
  title: "Controle de Gastos | Empréstimos",
  description: "Gestão de Dinheiro Emprestado",
};

export default function Loans() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-title-sm2 font-bold text-gray-800 dark:text-white/90">
            Dinheiro Emprestado
          </h2>
          <p className="text-sm text-gray-500">
            Acompanhe quem deve a você e a quem você deve.
          </p>
        </div>
      </div>
      <LoansManager />
    </div>
  );
}
