"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { PlusIcon } from "@/icons";
import { createUserAction, deleteUserAction } from "@/actions/users";

export const UsersManager = () => {
  const { activeCompanyId, role: currentUserRole } = useCompany();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");

  useEffect(() => {
    if (activeCompanyId) {
      fetchUsers();
    }
  }, [activeCompanyId]);

  const fetchUsers = async () => {
    setLoading(true);
    // Para pegar os emails, normalmente precisaríamos do backend,
    // mas vamos exibir o user_id provisoriamente, ou podemos buscar do Auth via backend.
    // Como RLS não deixa ver emails de outros do auth.users nativamente, 
    // a melhor prática no Supabase é ter uma tabela profiles.
    // Para simplificar, listamos os vínculos.
    const { data, error } = await supabase
      .from("company_users")
      .select("*")
      .eq("company_id", activeCompanyId);

    if (data) setUsers(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;
    
    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      setErrorMsg("Você não tem permissão para adicionar usuários.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const result = await createUserAction(email, password, activeCompanyId, role);

    if (!result.success) {
      setErrorMsg(result.message || "Erro desconhecido");
      setSubmitting(false);
      return;
    }

    setIsModalOpen(false);
    setSubmitting(false);
    setEmail("");
    setPassword("");
    setRole("USER");
    fetchUsers();
  };

  const handleDelete = async (userId: string, userRole: string) => {
    if (userRole === 'OWNER') {
      alert("Não é possível remover o dono da empresa.");
      return;
    }
    
    if (confirm("Tem certeza que deseja remover este usuário?")) {
      const result = await deleteUserAction(userId);
      if (result.success) {
        fetchUsers();
      } else {
        alert("Erro ao remover: " + result.message);
      }
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando equipe...</div>;

  return (
    <div>
      <div className="flex justify-end mb-6">
        {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
          <Button onClick={() => setIsModalOpen(true)} startIcon={<PlusIcon />}>
            Adicionar Usuário
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ID do Usuário</th>
              <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
              <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200 font-mono text-xs">
                  {u.user_id}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${u.role === 'OWNER' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 
                      u.role === 'ADMIN' ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400' : 
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {u.role === 'OWNER' ? 'Proprietário' : u.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && u.role !== 'OWNER' && (
                    <button 
                      onClick={() => handleDelete(u.user_id, u.role)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-500">Nenhum usuário encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white/90 mb-5">Adicionar Membro</h3>
            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">{errorMsg}</div>}
              
              <div>
                <Label>E-mail de Acesso</Label>
                <Input type="email" placeholder="nome@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div>
                <Label>Senha Temporária (Mínimo 6 caracteres)</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <div>
                <Label>Perfil de Permissão</Label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 mt-1">
                  <option value="USER">Funcionário (Básico)</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancelar</button>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Criando..." : "Criar Usuário"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
