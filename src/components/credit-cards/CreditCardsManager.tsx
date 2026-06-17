"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { PlusIcon } from "@/icons";

export const CreditCardsManager = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal de Cartão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Formulário de Cartão
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("1");
  const [dueDay, setDueDay] = useState("10");

  // Modal de Pagar Fatura
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payErrorMsg, setPayErrorMsg] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchData(user.id);
      } else {
        window.location.href = "/signin";
      }
    };
    init();
  }, []);

  const fetchData = async (uid: string) => {
    setLoading(true);
    
    // Buscar Cartões
    const { data: cardsData } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    
    if (cardsData) setCards(cardsData);

    // Buscar Contas para o modal de pagamento
    const { data: accountsData } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", uid);
    
    if (accountsData) {
      setAccounts(accountsData);
      if (accountsData.length > 0) setSelectedAccountId(accountsData[0].id);
    }

    // Buscar Faturas com os Lançamentos agregados
    const { data: invoicesData } = await supabase
      .from("credit_card_invoices")
      .select("*, credit_cards!inner(user_id, name), transactions(amount)")
      .eq("credit_cards.user_id", uid)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (invoicesData) {
      // Calcula o total dinâmico da fatura baseado nos lançamentos
      const computedInvoices = invoicesData.map((inv: any) => {
        const total = inv.transactions.reduce((acc: number, tx: any) => acc + Number(tx.amount), 0);
        return { ...inv, computed_total: total };
      });
      setInvoices(computedInvoices);
    }

    setLoading(false);
  };

  const handleSaveCard = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMsg("Usuário não logado.");
      return;
    }
    
    const numericLimit = parseFloat(limit.replace(",", "."));
    const numClosingDay = parseInt(closingDay, 10);
    const numDueDay = parseInt(dueDay, 10);

    if (isNaN(numericLimit) || numericLimit <= 0) {
      setErrorMsg("Limite inválido.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const { error } = await supabase.from("credit_cards").insert({
      user_id: userId,
      name,
      limit_amount: numericLimit,
      closing_day: numClosingDay,
      due_day: numDueDay,
    });

    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
      return;
    }

    setIsModalOpen(false);
    setSubmitting(false);
    setName("");
    setLimit("");
    setClosingDay("1");
    setDueDay("10");
    
    fetchData(userId);
  };

  const openPayModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPayModalOpen(true);
    setPayErrorMsg("");
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoice || !selectedAccountId || !userId) return;

    setPaySubmitting(true);
    setPayErrorMsg("");

    const account = accounts.find((a) => a.id === selectedAccountId);
    if (!account) {
      setPayErrorMsg("Conta não encontrada.");
      setPaySubmitting(false);
      return;
    }

    try {
      const totalAmount = selectedInvoice.computed_total;
      
      // 1. Atualizar o saldo da conta corrente deduzindo o valor da fatura
      const newBalance = Number(account.initial_balance) - totalAmount;
      const { error: accError } = await supabase.from("accounts").update({ initial_balance: newBalance }).eq("id", selectedAccountId);
      if (accError) throw new Error(accError.message);

      // 2. Atualizar o status da Fatura para PAGA
      const { error: invError } = await supabase.from("credit_card_invoices").update({ status: "PAID", amount_paid: totalAmount }).eq("id", selectedInvoice.id);
      if (invError) throw new Error(invError.message);

      // 3. Inserir um lançamento de "Pagamento de Fatura" na conta corrente para constar no extrato
      const monthStr = selectedInvoice.month.toString().padStart(2, "0");
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        description: `Pagamento Fatura ${selectedInvoice.credit_cards.name} - ${monthStr}/${selectedInvoice.year}`,
        amount: totalAmount,
        date: new Date().toISOString().split("T")[0], // Hoje
        type: "EXPENSE",
        payment_method: "DEBIT",
        account_id: selectedAccountId,
      });
      if (txError) throw new Error(txError.message);

      setIsPayModalOpen(false);
      setPaySubmitting(false);
      fetchData(userId);

    } catch (err: any) {
      setPayErrorMsg("Erro ao processar pagamento: " + err.message);
      setPaySubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Buscando informações...</div>;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setIsModalOpen(true)} startIcon={<PlusIcon />}>
          Novo Cartão
        </Button>
      </div>

      {/* Grid de Cartões */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {cards.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-gray-300 rounded-xl dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">Você ainda não tem cartões cadastrados.</p>
          </div>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white shadow-xl dark:from-brand-600 dark:to-brand-800 transition-transform hover:-translate-y-1">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
              
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-xl font-bold tracking-wider uppercase">{card.name}</h3>
                <svg className="w-8 h-8 opacity-70" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" />
                </svg>
              </div>

              <div className="mb-6">
                <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Limite Total</p>
                <p className="text-2xl font-semibold">R$ {Number(card.limit_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="flex justify-between text-xs text-white/80 border-t border-white/20 pt-4">
                <div>
                  <p className="text-white/50 mb-0.5">Fechamento</p>
                  <p className="font-medium">Dia {card.closing_day}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 mb-0.5">Vencimento</p>
                  <p className="font-medium">Dia {card.due_day}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sessão de Faturas */}
      {cards.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Suas Faturas</h3>
          
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                    <th className="px-5 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Mês/Ano</th>
                    <th className="px-5 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Cartão</th>
                    <th className="px-5 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-5 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total</th>
                    <th className="px-5 py-4 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">
                        Nenhuma fatura gerada ainda. Compre no cartão para ver aqui!
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const isPaid = inv.status === "PAID";
                      const totalFormatted = Number(inv.computed_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                      return (
                        <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                            {String(inv.month).padStart(2, '0')}/{inv.year}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {inv.credit_cards?.name}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${isPaid ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-500' : 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-500'}`}>
                              {isPaid ? "Paga" : "Aberta"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                            R$ {totalFormatted}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {!isPaid && inv.computed_total > 0 && (
                              <button
                                onClick={() => openPayModal(inv)}
                                className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
                              >
                                Pagar Fatura
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Cartão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">Cadastrar Cartão</h3>

            <form className="space-y-4">
              {errorMsg && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{errorMsg}</div>}
              <div><Label>Nome do Cartão</Label><Input placeholder="Ex: Nubank..." value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div><Label>Limite Total (R$)</Label><Input type="number" step={0.01} placeholder="0.00" value={limit} onChange={(e) => setLimit(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Dia de Fechamento</Label><Input type="number" min="1" max="31" step={1} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} required /></div>
                <div><Label>Dia de Vencimento</Label><Input type="number" min="1" max="31" step={1} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required /></div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
                <Button onClick={handleSaveCard} type="button" className="w-full" disabled={submitting}>{submitting ? "Salvando..." : "Salvar Cartão"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagar Fatura */}
      {isPayModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">Pagamento de Fatura</h3>

            <div className="space-y-4">
              {payErrorMsg && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{payErrorMsg}</div>}
              
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg text-center mb-6">
                <p className="text-sm text-gray-500 mb-1">Valor Total da Fatura</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {Number(selectedInvoice.computed_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500 mt-2">Vencimento: Dia {cards.find(c => c.id === selectedInvoice.credit_card_id)?.due_day} do Mês {selectedInvoice.month}</p>
              </div>

              <div>
                <Label>Pagar usando qual Conta?</Label>
                <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 mt-1">
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (Saldo Atual: R$ {Number(acc.initial_balance).toLocaleString('pt-BR')})</option>
                  ))}
                </select>
                {accounts.length === 0 && <p className="text-xs text-red-500 mt-1">Você precisa de uma conta bancária para pagar a fatura.</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
                <Button onClick={handlePayInvoice} type="button" className="w-full" disabled={paySubmitting || accounts.length === 0}>{paySubmitting ? "Processando..." : "Confirmar Pagamento"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
