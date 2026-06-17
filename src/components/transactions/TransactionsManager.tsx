"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { PlusIcon } from "@/icons";

export const TransactionsManager = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("EXPENSE");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [accountId, setAccountId] = useState("");
  
  // Novos campos de Cartão de Crédito
  const [creditCardId, setCreditCardId] = useState("");
  const [installments, setInstallments] = useState("1");

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
    
    // Buscar Contas
    const { data: accountsData } = await supabase.from("accounts").select("*").eq("user_id", uid);
    if (accountsData) {
      setAccounts(accountsData);
      if (accountsData.length > 0) setAccountId(accountsData[0].id);
    }

    // Buscar Cartões de Crédito
    const { data: cardsData } = await supabase.from("credit_cards").select("*").eq("user_id", uid);
    if (cardsData) {
      setCreditCards(cardsData);
      if (cardsData.length > 0) setCreditCardId(cardsData[0].id);
    }

    // Buscar Lançamentos
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select("*, accounts(name), credit_cards(name)")
      .eq("user_id", uid)
      .order("date", { ascending: false });

    if (transactionsData) setTransactions(transactionsData);
    setLoading(false);
  };

  // Função auxiliar para buscar ou criar Fatura (Invoice)
  const getOrCreateInvoice = async (cardId: string, month: number, year: number) => {
    // Busca se a fatura já existe
    const { data: existingInvoice } = await supabase
      .from("credit_card_invoices")
      .select("id")
      .eq("credit_card_id", cardId)
      .eq("month", month)
      .eq("year", year)
      .single();

    if (existingInvoice) return existingInvoice.id;

    // Se não existir, cria uma fatura nova aberta
    const { data: newInvoice, error } = await supabase
      .from("credit_card_invoices")
      .insert({
        credit_card_id: cardId,
        month,
        year,
        status: "OPEN",
        total_amount: 0,
      })
      .select("id")
      .single();

    if (error) throw new Error("Erro ao gerar a fatura: " + error.message);
    return newInvoice.id;
  };

  const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMsg("Sessão expirada. Recarregue a página.");
      return;
    }
    
    if (!description || !amount) {
      setErrorMsg("Preencha a descrição e o valor.");
      return;
    }

    if (paymentMethod === "CREDIT" && !creditCardId) {
      setErrorMsg("Selecione um cartão de crédito.");
      return;
    } else if (paymentMethod !== "CREDIT" && !accountId) {
      setErrorMsg("Selecione uma conta bancária.");
      return;
    }

    const numericAmount = parseFloat(amount.replace(",", "."));
    const numInstallments = parseInt(installments, 10);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg("Valor inválido.");
      return;
    }

    if (paymentMethod === "CREDIT" && (isNaN(numInstallments) || numInstallments < 1)) {
      setErrorMsg("Número de parcelas inválido.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (paymentMethod !== "CREDIT") {
        // COMPRA À VISTA (Conta Bancária)
        const { error: txError } = await supabase.from("transactions").insert({
          user_id: userId,
          description,
          amount: numericAmount,
          date,
          type,
          payment_method: paymentMethod,
          account_id: accountId,
        });
        if (txError) throw new Error(txError.message);

        // Atualiza Saldo da Conta
        const selectedAccount = accounts.find((a) => a.id === accountId);
        if (selectedAccount) {
          let newBalance = Number(selectedAccount.initial_balance);
          if (type === "INCOME") newBalance += numericAmount;
          if (type === "EXPENSE") newBalance -= numericAmount;
          await supabase.from("accounts").update({ initial_balance: newBalance }).eq("id", accountId);
        }
      } else {
        // COMPRA NO CARTÃO DE CRÉDITO (Parcelado ou não)
        const card = creditCards.find((c) => c.id === creditCardId);
        if (!card) throw new Error("Cartão não encontrado.");

        const txDate = new Date(date);
        let baseInvoiceMonth = txDate.getUTCMonth() + 1; // 1 a 12
        let baseInvoiceYear = txDate.getUTCFullYear();

        // Se a compra foi feita no dia ou depois do fechamento, cai na próxima fatura
        if (txDate.getUTCDate() >= card.closing_day) {
          baseInvoiceMonth += 1;
          if (baseInvoiceMonth > 12) {
            baseInvoiceMonth = 1;
            baseInvoiceYear += 1;
          }
        }

        const installmentValue = numericAmount / numInstallments;

        for (let i = 0; i < numInstallments; i++) {
          let currentMonth = baseInvoiceMonth + i;
          let currentYear = baseInvoiceYear;
          
          while (currentMonth > 12) {
            currentMonth -= 12;
            currentYear += 1;
          }

          // Busca ou cria a fatura daquele mês/ano
          const invoiceId = await getOrCreateInvoice(card.id, currentMonth, currentYear);

          // Ajusta a descrição se for parcelado (ex: "Compra (1/3)")
          const descStr = numInstallments > 1 ? `${description} (${i + 1}/${numInstallments})` : description;

          const { error: txError } = await supabase.from("transactions").insert({
            user_id: userId,
            description: descStr,
            amount: installmentValue,
            date,
            type: "EXPENSE", // Cartão sempre gera despesa
            payment_method: "CREDIT",
            credit_card_id: card.id,
            invoice_id: invoiceId,
            installment_number: i + 1,
            total_installments: numInstallments,
          });

          if (txError) throw new Error(txError.message);
        }
      }

      // Sucesso! Limpa o modal.
      setSubmitting(false);
      setIsModalOpen(false);
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setInstallments("1");
      
      fetchData(userId);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido ao salvar.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando lançamentos...</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsModalOpen(true)} startIcon={<PlusIcon />}>
          Novo Lançamento
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <th className="px-5 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Data</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Descrição</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Origem</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                      {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{tx.description}</p>
                      <p className="text-xs text-gray-500">{tx.payment_method}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {tx.payment_method === "CREDIT" ? tx.credit_cards?.name : tx.accounts?.name || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium">
                      <span className={tx.type === "INCOME" ? "text-success-500" : "text-error-500"}>
                        {tx.type === "INCOME" ? "+" : "-"} R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">Novo Lançamento</h3>

            <form className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{errorMsg}</div>
              )}

              <div>
                <Label>Forma de Pagamento</Label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 mt-1">
                  <option value="PIX">PIX</option>
                  <option value="DEBIT">Cartão de Débito</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CREDIT">Cartão de Crédito</option>
                </select>
              </div>

              {paymentMethod !== "CREDIT" && (
                <div>
                  <Label>Tipo de Lançamento</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="type" value="EXPENSE" checked={type === "EXPENSE"} onChange={(e) => setType(e.target.value)} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Despesa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="type" value="INCOME" checked={type === "INCOME"} onChange={(e) => setType(e.target.value)} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Receita</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <Label>Descrição</Label>
                <Input placeholder="Ex: Conta de Luz, Salário..." value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{paymentMethod === "CREDIT" ? "Valor Total (R$)" : "Valor (R$)"}</Label>
                  <Input type="number" step={0.01} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
              </div>

              {paymentMethod === "CREDIT" ? (
                <>
                  <div>
                    <Label>Cartão de Crédito</Label>
                    <select value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 mt-1">
                      {creditCards.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {creditCards.length === 0 && <p className="text-xs text-red-500 mt-1">Você precisa cadastrar um cartão primeiro.</p>}
                  </div>
                  <div>
                    <Label>Parcelas</Label>
                    <Input type="number" min="1" max="48" step={1} value={installments} onChange={(e) => setInstallments(e.target.value)} required />
                  </div>
                </>
              ) : (
                <div>
                  <Label>Conta Bancária / Carteira</Label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 mt-1">
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} (Saldo: R$ {Number(acc.initial_balance).toLocaleString('pt-BR')})</option>
                    ))}
                  </select>
                  {accounts.length === 0 && <p className="text-xs text-red-500 mt-1">Você precisa cadastrar uma conta primeiro.</p>}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  Cancelar
                </button>
                <Button onClick={handleSave} type="button" className="w-full" disabled={submitting || (paymentMethod === "CREDIT" ? creditCards.length === 0 : accounts.length === 0)}>
                  {submitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
