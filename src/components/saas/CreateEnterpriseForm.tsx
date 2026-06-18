"use client";

import { useState } from "react";
import { createEnterpriseAction } from "@/actions/saas-actions";

export default function CreateEnterpriseForm() {
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
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
        <h3 className="font-medium text-black dark:text-white">
          Cadastrar Nova Empresa (Enterprise)
        </h3>
      </div>
      <form onSubmit={onSubmit}>
        <div className="p-6.5">
          {message && (
            <div
              className={`mb-4 flex w-full border-l-6 px-7 py-3 shadow-md ${
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

          <div className="mb-4.5">
            <label className="mb-2.5 block text-black dark:text-white">
              Nome da Empresa <span className="text-meta-1">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              placeholder="Ex: Minha Empresa LTDA"
              required
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
          </div>

          <div className="mb-4.5">
            <label className="mb-2.5 block text-black dark:text-white">
              E-mail do Administrador (Owner) <span className="text-meta-1">*</span>
            </label>
            <input
              type="email"
              name="adminEmail"
              placeholder="admin@empresa.com"
              required
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
          </div>

          <div className="mb-5.5">
            <label className="mb-2.5 block text-black dark:text-white">
              Senha Inicial <span className="text-meta-1">*</span>
            </label>
            <input
              type="password"
              name="adminPassword"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90 disabled:bg-opacity-50"
          >
            {loading ? "Criando Empresa..." : "Criar Empresa e Usuário"}
          </button>
        </div>
      </form>
    </div>
  );
}
