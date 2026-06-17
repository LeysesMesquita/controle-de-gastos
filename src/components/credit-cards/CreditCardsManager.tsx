"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { PlusIcon } from "@/icons";

export const CreditCardsManager = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Formulário
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("1");
  const [dueDay, setDueDay] = useState("10");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchCards(user.id);
      } else {
        window.location.href = "/signin";
      }
    };
    init();
  }, []);

  const fetchCards = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    
    if (data) setCards(data);
    setLoading(false);
  };

  const handleSave = async (e: React.MouseEvent | React.FormEvent) => {
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

    // Fechar modal e resetar
    setIsModalOpen(false);
    setSubmitting(false);
    setName("");
    setLimit("");
    setClosingDay("1");
    setDueDay("10");
    
    fetchCards(userId);
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Buscando cartões...</div>;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setIsModalOpen(true)} startIcon={<PlusIcon />}>
          Novo Cartão
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-gray-300 rounded-xl dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">Você ainda não tem cartões cadastrados.</p>
          </div>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white shadow-xl dark:from-brand-600 dark:to-brand-800 transition-transform hover:-translate-y-1">
              {/* Chip / Decorative elements */}
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

      {/* Modal Novo Cartão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">Cadastrar Cartão</h3>

            <form className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{errorMsg}</div>
              )}

              <div>
                <Label>Nome do Cartão</Label>
                <Input placeholder="Ex: Nubank, Black..." value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div>
                <Label>Limite Total (R$)</Label>
                <Input type="number" step={0.01} placeholder="0.00" value={limit} onChange={(e) => setLimit(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dia de Fechamento</Label>
                  <Input type="number" min="1" max="31" step={1} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} required />
                </div>
                <div>
                  <Label>Dia de Vencimento</Label>
                  <Input type="number" min="1" max="31" step={1} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  Cancelar
                </button>
                <Button onClick={handleSave} type="button" className="w-full" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar Cartão"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
