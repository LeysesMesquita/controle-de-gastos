"use client";

import { useState } from "react";
import { createEnterpriseAction } from "@/actions/saas-actions";

export default function CreateEnterpriseForm({ onCancel }: { onCancel?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await createEnterpriseAction(formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result.success) {
      setMessage({ type: "success", text: result.message || "Sucesso!" });
      (event.target as HTMLFormElement).reset(); // Limpa o formulário
    }

    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-5.5">
        {message && (
          <div
            className={`flex w-full border-l-6 px-7 py-3 shadow-md ${
              message.type === "success"
                ? "border-[#34D399] bg-[#34D399] bg-opacity-[15%]"
                : "border-[#F87171] bg-[#F87171] bg-opacity-[15%]"
            }`}
          >
            <div className="w-full">
              <h5
                className={`mb-1 font-semibold ${
                  message.type === "success" ? "text-[#34D399]" : "text-[#B45454]"
                }`}
              >
                {message.type === "success" ? "Sucesso" : "Erro"}
              </h5>
              <p className={message.type === "success" ? "text-base leading-relaxed text-body" : "text-sm text-[#B45454]"}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="mb-2.5 block font-medium text-gray-800 dark:text-white">
            Nome da Empresa <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="companyName"
            placeholder="Ex: Minha Empresa LTDA"
            required
            className="w-full rounded-lg border border-gray-300 bg-transparent px-5 py-3 text-gray-800 outline-none transition focus:border-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500"
          />
        </div>

        <div>
          <label className="mb-2.5 block font-medium text-gray-800 dark:text-white">
            E-mail do Administrador (Owner) <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="adminEmail"
            placeholder="admin@empresa.com"
            required
            className="w-full rounded-lg border border-gray-300 bg-transparent px-5 py-3 text-gray-800 outline-none transition focus:border-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500"
          />
        </div>

        <div>
          <label className="mb-2.5 block font-medium text-gray-800 dark:text-white">
            Senha Inicial <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="adminPassword"
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-5 py-3 text-gray-800 outline-none transition focus:border-brand-500 active:border-brand-500 disabled:cursor-default disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "Criando..." : "Criar Empresa"}
          </button>
        </div>
      </div>
    </form>
  );
}
