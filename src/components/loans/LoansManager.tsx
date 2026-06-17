"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { PlusIcon } from "@/icons";

export const LoansManager = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Novo Empréstimo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [type, setType] = useState("GIVEN"); // GIVEN = Emprestei, RECEIVED = Peguei
  const [personName, setPersonName] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");

  // Modal Amortização (Pagamento)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
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
    
    // Buscar Contas
    const { data: accountsData } = await supabase.from("accounts").select("*").eq("user_id", uid);
    if (accountsData) {
      setAccounts(accountsData);
      if (accountsData.length > 0) setPayAccountId(accountsData[0].id);
    }

    // Buscar Empréstimos com seus pagamentos (Amortizações)
    const { data: loansData } = await supabase
      .from("loans")
      .select("*, loan_payments(amount_paid)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (loansData) {
      // Calcular o quanto já foi pago de cada um
      const computed = loansData.map(l => {
        const totalPaid = l.loan_payments.reduce((acc: number, p: any) => acc + Number(p.amount_paid), 0);
        return { ...l, computed_total_paid: totalPaid };
      });
      setLoans(computed);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const numericAmount = parseFloat(principalAmount.replace(",", "."));
    const numericInterest = parseFloat(interestRate.replace(",", "."));

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg("Valor inválido.");
      return;
    }

    if (!personName || !dueDate) {
      setErrorMsg("Preencha todos os campos.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const { error } = await supabase.from("loans").insert({
      user_id: userId,
      type,
      person_name: personName,
      principal_amount: numericAmount,
      interest_rate_per_month: isNaN(numericInterest) ? 0 : numericInterest,
      start_date: startDate,
      due_date: dueDate,
      status: "ACTIVE"
    });

    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
      return;
    }

    setIsModalOpen(false);
    setSubmitting(false);
    setPersonName("");
    setPrincipalAmount("");
    setInterestRate("0");
    setDueDate("");
    
    fetchData(userId);
  };

  const openPayModal = (loan: any) => {
    setSelectedLoan(loan);
    const remaining = Number(loan.principal_amount) - loan.computed_total_paid;
    setPayAmount(remaining > 0 ? remaining.toString() : "0");
    setIsPayModalOpen(true);
    setPayErrorMsg("");
  };

  const handlePay = async () => {
    if (!selectedLoan || !payAccountId || !userId) return;

    const numericPay = parseFloat(payAmount.replace(",", "."));
    if (isNaN(numericPay) || numericPay <= 0) {
      setPayErrorMsg("Valor inválido.");
      return;
    }

    setPaySubmitting(true);
    setPayErrorMsg("");

    const account = accounts.find((a) => a.id === payAccountId);
    if (!account) {
      setPayErrorMsg("Conta não encontrada.");
      setPaySubmitting(false);
      return;
    }

    try {
      // 1. Inserir a Amortização
      const { error: lpError } = await supabase.from("loan_payments").insert({
        loan_id: selectedLoan.id,
        amount_paid: numericPay,
        payment_date: new Date().toISOString().split("T")[0],
        principal_paid: numericPay,
        interest_and_fees_paid: 0,
      });
      if (lpError) throw new Error(lpError.message);

      // 2. Atualizar Saldo da Conta Corrente
      let newBalance = Number(account.initial_balance);
      // Se eu EMPRESTEI (GIVEN), o cara tá me pagando agora -> Meu saldo AUMENTA.
      // Se eu PEGUEI (RECEIVED), eu tô pagando o cara agora -> Meu saldo DIMINUI.
      let txType = "";
      if (selectedLoan.type === "GIVEN") {
        newBalance += numericPay;
        txType = "INCOME";
      } else {
        newBalance -= numericPay;
        txType = "EXPENSE";
      }

      const { error: accError } = await supabase.from("accounts").update({ initial_balance: newBalance }).eq("id", payAccountId);
      if (accError) throw new Error(accError.message);

      // 3. Criar Transação no Extrato
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        description: `Amortização: ${selectedLoan.person_name}`,
        amount: numericPay,
        date: new Date().toISOString().split("T")[0],
        type: txType,
        payment_method: "PIX",
        account_id: payAccountId,
      });
      if (txError) throw new Error(txError.message);

      // 4. Verificar se Quitou o Empréstimo
      const newTotalPaid = selectedLoan.computed_total_paid + numericPay;
      if (newTotalPaid >= Number(selectedLoan.principal_amount)) {
        const { error: stError } = await supabase.from("loans").update({ status: "PAID" }).eq("id", selectedLoan.id);
        if (stError) throw new Error(stError.message);
      }

      setIsPayModalOpen(false);
      setPaySubmitting(false);
      fetchData(userId);
    } catch (err: any) {
      setPayErrorMsg("Erro ao processar: " + err.message);
      setPaySubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando contratos...</div>;

  const givenLoans = loans.filter(l => l.type === "GIVEN");
  const receivedLoans = loans.filter(l => l.type === "RECEIVED");

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setIsModalOpen(true)} startIcon={<PlusIcon />}>
          Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EMPRESTEI (Tenho a Receber) */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
            Me Devem (Emprestei)
          </h3>
          <div className="space-y-4">
            {givenLoans.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhum contrato ativo.</p>
            ) : (
              givenLoans.map(l => {
                const isPaid = l.status === "PAID";
                const total = Number(l.principal_amount);
                const paid = Number(l.computed_total_paid);
                const progress = Math.min((paid / total) * 100, 100);
                return (
                  <div key={l.id} className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">{l.person_name}</h4>
                        <p className="text-xs text-gray-500">Vencimento: {new Date(l.due_date).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${isPaid ? 'bg-success-100 text-success-700' : 'bg-brand-100 text-brand-700'}`}>
                        {isPaid ? "Quitado" : "Ativo"}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Recebido: R$ {paid.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                      <span className="font-semibold text-gray-800 dark:text-white">Total: R$ {total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mb-4">
                      <div className={`h-2 rounded-full ${isPaid ? 'bg-success-500' : 'bg-brand-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>

                    {!isPaid && (
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => openPayModal(l)}>
                          Registrar Recebimento
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* PEGUEI (Tenho a Pagar) */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
            Eu Devo (Peguei Emprestado)
          </h3>
          <div className="space-y-4">
            {receivedLoans.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhum contrato ativo.</p>
            ) : (
              receivedLoans.map(l => {
                const isPaid = l.status === "PAID";
                const total = Number(l.principal_amount);
                const paid = Number(l.computed_total_paid);
                const progress = Math.min((paid / total) * 100, 100);
                return (
                  <div key={l.id} className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">{l.person_name}</h4>
                        <p className="text-xs text-gray-500">Vencimento: {new Date(l.due_date).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${isPaid ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'}`}>
                        {isPaid ? "Quitado" : "Pendente"}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Pago: R$ {paid.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                      <span className="font-semibold text-gray-800 dark:text-white">Total: R$ {total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mb-4">
                      <div className={`h-2 rounded-full ${isPaid ? 'bg-success-500' : 'bg-error-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>

                    {!isPaid && (
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => openPayModal(l)}>
                          Amortizar Dívida
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Contrato */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">Novo Contrato</h3>
            <form className="space-y-4">
              {errorMsg && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{errorMsg}</div>}
              
              <div>
                <Label>Qual foi a operação?</Label>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="radio" name="type" value="GIVEN" checked={type === "GIVEN"} onChange={(e) => setType(e.target.value)} />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Emprestei dinheiro para alguém (Me Devem)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="radio" name="type" value="RECEIVED" checked={type === "RECEIVED"} onChange={(e) => setType(e.target.value)} />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Peguei emprestado de alguém (Eu Devo)</span>
                  </label>
                </div>
              </div>

              <div><Label>Nome da Pessoa / Banco</Label><Input placeholder="Ex: João, Bradesco..." value={personName} onChange={(e) => setPersonName(e.target.value)} required /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Valor Principal (R$)</Label><Input type="number" step={0.01} placeholder="0.00" value={principalAmount} onChange={(e) => setPrincipalAmount(e.target.value)} required /></div>
                <div><Label>Juros ao Mês (%)</Label><Input type="number" step={0.01} value={interestRate} onChange={(e) => setInterestRate(e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Data Inicial</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
                <div><Label>Vencimento Final</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
                <Button onClick={handleSave} type="button" className="w-full" disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagamento/Amortização */}
      {isPayModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">
              {selectedLoan.type === "GIVEN" ? "Receber Pagamento Parcial" : "Pagar Amortização"}
            </h3>
            <div className="space-y-4">
              {payErrorMsg && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{payErrorMsg}</div>}
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Falta pagar neste contrato:</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  R$ {(Number(selectedLoan.principal_amount) - Number(selectedLoan.computed_total_paid)).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                </p>
              </div>

              <div>
                <Label>Valor a ser amortizado agora (R$)</Label>
                <Input type="number" step={0.01} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
              </div>

              <div>
                <Label>{selectedLoan.type === 'GIVEN' ? 'O dinheiro entrou em qual conta?' : 'O dinheiro saiu de qual conta?'}</Label>
                <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 mt-1">
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (Saldo Atual: R$ {Number(acc.initial_balance).toLocaleString('pt-BR')})</option>
                  ))}
                </select>
                {accounts.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhuma conta cadastrada.</p>}
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
