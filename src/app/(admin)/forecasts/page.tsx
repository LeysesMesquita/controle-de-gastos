import type { Metadata } from "next";
import React from "react";
import { ForecastsManager } from "@/components/forecasts/ForecastsManager";

export const metadata: Metadata = {
  title: "Controle de Gastos | Previsões",
  description: "Contas a Pagar e Receber",
};

export default function Forecasts() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-title-sm2 font-bold text-gray-800 dark:text-white/90">
            Previsões Mensais
          </h2>
          <p className="text-sm text-gray-500">
            Organize o que você tem a Pagar e a Receber no futuro.
          </p>
        </div>
      </div>
      <ForecastsManager />
    </div>
  );
}
