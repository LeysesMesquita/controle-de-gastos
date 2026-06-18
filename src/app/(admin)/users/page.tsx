import type { Metadata } from "next";
import React from "react";
import { UsersManager } from "@/components/users/UsersManager";

export const metadata: Metadata = {
  title: "Controle de Gastos | Equipe",
  description: "Gestão de Usuários da Empresa",
};

export default function Users() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-title-sm2 font-bold text-gray-800 dark:text-white/90">
            Equipe e Usuários
          </h2>
          <p className="text-sm text-gray-500">
            Gerencie os acessos e permissões da sua empresa.
          </p>
        </div>
      </div>
      <UsersManager />
    </div>
  );
}
