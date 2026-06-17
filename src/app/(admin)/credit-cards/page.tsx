import type { Metadata } from "next";
import React from "react";
import { CreditCardsManager } from "@/components/credit-cards/CreditCardsManager";

export const metadata: Metadata = {
  title: "Controle de Gastos | Cartões de Crédito",
  description: "Gestão de Cartões de Crédito e Faturas",
};

export default function CreditCards() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-title-sm2 font-bold text-gray-800 dark:text-white/90">
            Cartões de Crédito
          </h2>
          <p className="text-sm text-gray-500">
            Gerencie seus cartões, limites e faturas.
          </p>
        </div>
      </div>
      <CreditCardsManager />
    </div>
  );
}
