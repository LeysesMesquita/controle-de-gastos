import type { Metadata } from "next";
import React from "react";
import AccountsManager from "@/components/accounts/AccountsManager";

export const metadata: Metadata = {
  title: "Contas e Carteira | Controle de Gastos",
  description: "Gerencie suas contas bancárias e carteira física",
};

export default function AccountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Contas e Carteira</h2>
      </div>
      <AccountsManager />
    </div>
  );
}
