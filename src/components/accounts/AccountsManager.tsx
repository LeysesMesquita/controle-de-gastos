"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

type Account = {
  id: string;
  name: string;
  type: string;
  initial_balance: number;
  is_archived: boolean;
};

export default function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("CHECKING");
  const [balance, setBalance] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchAccounts = async (uid: string) => {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", uid)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAccounts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchAccounts(user.id);
      }
    };
    init();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setErrorMsg("");

    const numericBalance = parseFloat(balance.replace(",", "."));
    if (isNaN(numericBalance)) {
      setErrorMsg("Valor inválido.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("accounts").insert({
      user_id: userId,
      name,
      type,
      initial_balance: numericBalance,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setIsModalOpen(false);
      setName("");
      setType("CHECKING");
      setBalance("0");
      fetchAccounts(userId);
    }
    setSubmitting(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const getTypeName = (t: string) => {
    switch (t) {
      case "CHECKING": return "Conta Corrente";
      case "SAVINGS": return "Poupança / Investimento";
      case "CASH": return "Dinheiro Físico";
      default: return t;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 dark:text-white/90">Suas Contas</h3>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>+ Nova Conta</Button>
      </div>

      {/* List */}
      <div className="p-5">
        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : accounts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Você ainda não tem nenhuma conta cadastrada.</p>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              Cadastre sua primeira conta
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Nome da Conta</th>
                  <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                  <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">Saldo Inicial</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-4 text-sm text-gray-800 dark:text-white/90 font-medium">{acc.name}</td>
                    <td className="py-4 text-sm text-gray-500 dark:text-gray-400">{getTypeName(acc.type)}</td>
                    <td className="py-4 text-sm text-gray-800 dark:text-white/90 font-semibold text-right">{formatCurrency(acc.initial_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Conta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90">Cadastrar Nova Conta</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && <div className="text-red-500 text-sm bg-red-100 p-2 rounded">{errorMsg}</div>}
              
              <div>
                <Label>Nome da Instituição/Conta</Label>
                <Input placeholder="Ex: Nubank, Carteira..." value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <Label>Tipo de Conta</Label>
                <select 
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="CHECKING">Conta Corrente</option>
                  <option value="SAVINGS">Poupança / Investimento</option>
                  <option value="CASH">Dinheiro Físico</option>
                </select>
              </div>

              <div>
                <Label>Saldo Inicial Atual (R$)</Label>
                <Input type="number" step={0.01} placeholder="0.00" value={balance} onChange={(e) => setBalance(e.target.value)} />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  Cancelar
                </button>
                <Button className="w-full" disabled={submitting}>{submitting ? "Salvando..." : "Salvar Conta"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
