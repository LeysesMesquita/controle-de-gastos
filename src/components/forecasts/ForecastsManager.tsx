"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { PlusIcon } from "@/icons";

export const ForecastsManager = () => {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Navegação de Meses
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal Novo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("EXPENSE");

  // Modal Pagar (Dar Baixa)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<any>(null);
  const [payAccountId, setPayAccountId] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payErrorMsg, setPayErrorMsg] = useState("");

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchData(user.id, currentMonth, currentYear);
      } else {
        window.location.href = "/signin";
      }
    };
    init();
  }, [currentMonth, currentYear]);

  const fetchData = async (uid: string, m: number, y: number) => {
    setLoading(true);
    
    const { data: accountsData } = await supabase.from("accounts").select("*").eq("user_id", uid);
    if (accountsData) {
      setAccounts(accountsData);
      if (accountsData.length > 0) setPayAccountId(accountsData[0].id);
    }

    const { data: forecastsData } = await supabase
      .from("forecasts")
      .select("*")
      .eq("user_id", uid)
      .eq("month", m)
      .eq("year", y)
      .order("created_at", { ascending: false });

    if (forecastsData) setForecasts(forecastsData);
    setLoading(false);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth, 1));
  };

  const handleSave = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    const numericAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg("Valor inválido.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const { error } = await supabase.from("forecasts").insert({
      user_id: userId,
      description, // Requer a migração no DB!
      type,
      expected_amount: numericAmount,
      month: currentMonth,
      year: currentYear,
      status: "PENDING",
    });

    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
      return;
    }

    setIsModalOpen(false);
    setSubmitting(false);
    setDescription("");
    setAmount("");
    
    fetchData(userId, currentMonth, currentYear);
  };

  const openPayModal = (forecast: any) => {
    setSelectedForecast(forecast);
    setIsPayModalOpen(true);
    setPayErrorMsg("");
  };

  const handlePay = async () => {
    if (!selectedForecast || !payAccountId || !userId) return;

    setPaySubmitting(true);
    setPayErrorMsg("");

    const account = accounts.find((a) => a.id === payAccountId);
    if (!account) {
      setPayErrorMsg("Conta não encontrada.");
      setPaySubmitting(false);
      return;
    }

    try {
      const amount = selectedForecast.expected_amount;
      
      // 1. Lança a transação
      const { data: newTx, error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        description: selectedForecast.description,
        amount: amount,
        date: new Date().toISOString().split("T")[0],
        type: selectedForecast.type,
        payment_method: "DEBIT", // Simplificado para conta
        account_id: payAccountId,
        forecast_id: selectedForecast.id,
      }).select("id").single();
      
      if (txError) throw new Error(txError.message);

      // 2. Atualiza saldo da conta
      let newBalance = Number(account.initial_balance);
      if (selectedForecast.type === "INCOME") newBalance += Number(amount);
      if (selectedForecast.type === "EXPENSE") newBalance -= Number(amount);
      const { error: accError } = await supabase.from("accounts").update({ initial_balance: newBalance }).eq("id", payAccountId);
      if (accError) throw new Error(accError.message);

      // 3. Atualiza Forecast para PAGO
      const { error: fcError } = await supabase.from("forecasts").update({ 
        status: "PAID", 
        actual_amount_paid: amount,
        transaction_id: newTx.id 
      }).eq("id", selectedForecast.id);
      if (fcError) throw new Error(fcError.message);

      setIsPayModalOpen(false);
      setPaySubmitting(false);
      fetchData(userId, currentMonth, currentYear);
    } catch (err: any) {
      setPayErrorMsg("Erro ao baixar: " + err.message);
      setPaySubmitting(false);
    }
  };

  const incomeForecasts = forecasts.filter(f => f.type === "INCOME");
  const expenseForecasts = forecasts.filter(f => f.type === "EXPENSE");

  const totalIncome = incomeForecasts.reduce((acc, f) => acc + Number(f.expected_amount), 0);
  const totalExpense = expenseForecasts.reduce((acc, f) => acc + Number(f.expected_amount), 0);
  const balance = totalIncome - totalExpense;

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  if (loading && forecasts.length === 0) return <div className="p-6 text-center text-gray-500">Buscando previsões...</div>;

  return (
    <div>
      {/* Navegação de Mês */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
        <button onClick={handlePrevMonth} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          &larr; Anterior
        </button>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wide">
          {monthNames[currentMonth - 1]} {currentYear}
        </h3>
        <button onClick={handleNextMonth} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          Próximo &rarr;
        </button>
      </div>

      {/* Resumo do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 p-4 rounded-xl">
          <p className="text-sm text-success-600 dark:text-success-400 font-medium">A Receber</p>
          <p className="text-2xl font-bold text-success-700 dark:text-success-500">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 p-4 rounded-xl">
          <p className="text-sm text-error-600 dark:text-error-400 font-medium">A Pagar</p>
          <p className="text-2xl font-bold text-error-700 dark:text-error-500">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Balanço Previsto</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-gray-800 dark:text-white' : 'text-error-600 dark:text-error-400'}`}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <Button onClick={() => setIsModalOpen(true)} startIcon={<PlusIcon />}>
          Nova Previsão
        </Button>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* A Receber */}
        <div>
          <h4 className="text-md font-semibold text-success-600 dark:text-success-500 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success-500"></span> A Receber
          </h4>
          <div className="space-y-3">
            {incomeForecasts.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nada a receber previsto.</p>
            ) : (
              incomeForecasts.map(f => (
                <div key={f.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white/90">{f.description}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'PAID' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                      {f.status === 'PAID' ? 'Recebido' : 'Pendente'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success-600">R$ {Number(f.expected_amount).toLocaleString('pt-BR')}</p>
                    {f.status === 'PENDING' && (
                      <button onClick={() => openPayModal(f)} className="text-xs text-brand-500 hover:underline mt-1">Dar Baixa</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* A Pagar */}
        <div>
          <h4 className="text-md font-semibold text-error-600 dark:text-error-500 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-error-500"></span> A Pagar
          </h4>
          <div className="space-y-3">
            {expenseForecasts.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma conta prevista.</p>
            ) : (
              expenseForecasts.map(f => (
                <div key={f.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white/90">{f.description}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'PAID' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                      {f.status === 'PAID' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-error-600">R$ {Number(f.expected_amount).toLocaleString('pt-BR')}</p>
                    {f.status === 'PENDING' && (
                      <button onClick={() => openPayModal(f)} className="text-xs text-brand-500 hover:underline mt-1">Dar Baixa</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Nova Previsão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">Nova Previsão</h3>
            <form className="space-y-4">
              {errorMsg && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{errorMsg}</div>}
              
              <div>
                <Label>Tipo</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" value="EXPENSE" checked={type === "EXPENSE"} onChange={(e) => setType(e.target.value)} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Despesa (A Pagar)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" value="INCOME" checked={type === "INCOME"} onChange={(e) => setType(e.target.value)} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Receita (A Receber)</span>
                  </label>
                </div>
              </div>

              <div><Label>Descrição</Label><Input placeholder="Ex: Aluguel..." value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
              <div><Label>Valor Previsto (R$)</Label><Input type="number" step={0.01} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
                <Button onClick={handleSave} type="button" className="w-full" disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagar */}
      {isPayModalOpen && selectedForecast && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">Confirmar {selectedForecast.type === 'INCOME' ? 'Recebimento' : 'Pagamento'}</h3>
            <div className="space-y-4">
              {payErrorMsg && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{payErrorMsg}</div>}
              
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Você está dando baixa em <strong>{selectedForecast.description}</strong> no valor de R$ {Number(selectedForecast.expected_amount).toLocaleString('pt-BR')}.
              </p>

              <div>
                <Label>{selectedForecast.type === 'INCOME' ? 'Receber em qual Conta?' : 'Pagar usando qual Conta?'}</Label>
                <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 mt-1">
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (Saldo Atual: R$ {Number(acc.initial_balance).toLocaleString('pt-BR')})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
                <Button onClick={handlePay} type="button" className="w-full" disabled={paySubmitting || accounts.length === 0}>{paySubmitting ? "Processando..." : "Confirmar"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
