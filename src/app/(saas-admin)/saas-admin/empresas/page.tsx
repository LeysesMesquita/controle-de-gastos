"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import SaasBreadcrumb from "@/components/common/SaasBreadcrumb";
import { supabase } from "@/lib/supabase";
import { Modal } from "@/components/ui/modal";
import CreateEnterpriseForm from "@/components/saas/CreateEnterpriseForm";

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchCompanies() {
      // Usando uma query para buscar as empresas
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setCompanies(data);
      }
      setLoading(false);
    }
    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <SaasBreadcrumb pageTitle="Empresas" />
      
      <div className="rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center gap-4">
          
          {/* Campo de Busca */}
          <div className="relative w-full max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar empresa por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 font-medium text-white hover:bg-brand-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 4.16666V15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.16699 10H15.8337" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Nova Empresa
          </button>
        </div>

        <div className="p-5">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50 text-left dark:bg-gray-800">
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400">Nome</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400">Data de Criação</th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      Carregando empresas...
                    </td>
                  </tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      Nenhuma empresa encontrada com esse nome.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company, index) => (
                    <tr key={company.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-4 text-gray-800 dark:text-white">
                        <span className="font-medium">{company.name}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/10 dark:text-success-500`}>
                          Ativa
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(company.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-gray-500 hover:text-brand-500">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 10.8333C10.4602 10.8333 10.8333 10.4602 10.8333 10C10.8333 9.53976 10.4602 9.16667 10 9.16667C9.53976 9.16667 9.16667 9.53976 9.16667 10C9.16667 10.4602 9.53976 10.8333 10 10.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 4.16667C10.4602 4.16667 10.8333 3.79357 10.8333 3.33333C10.8333 2.8731 10.4602 2.5 10 2.5C9.53976 2.5 9.16667 2.8731 9.16667 3.33333C9.16667 3.79357 9.53976 4.16667 10 4.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 17.5C10.4602 17.5 10.8333 17.1269 10.8333 16.6667C10.8333 16.2064 10.4602 15.8333 10 15.8333C9.53976 15.8333 9.16667 16.2064 9.16667 16.6667C9.16667 17.1269 9.53976 17.5 10 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Criação */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-2xl p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Cadastrar Nova Empresa
        </h3>
        <CreateEnterpriseForm onCancel={() => setIsModalOpen(false)} />
      </Modal>

    </div>
  );
}
