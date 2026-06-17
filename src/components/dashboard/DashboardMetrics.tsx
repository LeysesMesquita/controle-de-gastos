"use client";
import React, { useEffect, useState } from "react";
import Badge from "../ui/badge/Badge";
import { supabase } from "@/lib/supabase";

export const DashboardMetrics = () => {
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca contas bancárias e dinheiro vivo
      const { data: accounts } = await supabase
        .from("accounts")
        .select("initial_balance")
        .eq("user_id", user.id)
        .in("type", ["CHECKING", "CASH"]);
        
      const balance = accounts?.reduce((acc, curr) => acc + Number(curr.initial_balance), 0) || 0;
      setTotalBalance(balance);

      // Busca faturas abertas do mês atual
      const { data: invoices } = await supabase
        .from("credit_card_invoices")
        .select(`
          total_amount,
          amount_paid,
          credit_cards!inner(user_id)
        `)
        .eq("status", "OPEN")
        .eq("credit_cards.user_id", user.id);
      
      const invoicesTotal = invoices?.reduce((acc, curr) => acc + (Number(curr.total_amount) - Number(curr.amount_paid)), 0) || 0;
      setTotalInvoices(invoicesTotal);

      setLoading(false);
    };

    fetchMetrics();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <span className="text-xl">💰</span>
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Saldo Disponível (Contas)</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "..." : formatCurrency(totalBalance)}
            </h4>
          </div>
          <Badge color="success">
            Liquidez
          </Badge>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <span className="text-xl">💳</span>
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Faturas Abertas</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "..." : formatCurrency(totalInvoices)}
            </h4>
          </div>
          <Badge color="error">
            A Pagar
          </Badge>
        </div>
      </div>
    </div>
  );
};
