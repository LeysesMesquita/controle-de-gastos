"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CompanyContextType = {
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  role: string | null;
  loading: boolean;
  refreshCompany: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Pega a primeira empresa que o usuário está vinculado
    const { data: companyUsers, error } = await supabase
      .from("company_users")
      .select(`
        role,
        company_id,
        companies ( name )
      `)
      .eq("user_id", user.id)
      .limit(1);

    if (companyUsers && companyUsers.length > 0) {
      setActiveCompanyId(companyUsers[0].company_id);
      setRole(companyUsers[0].role);
      // @ts-ignore
      setActiveCompanyName(companyUsers[0].companies?.name || "Minha Empresa");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  return (
    <CompanyContext.Provider value={{ activeCompanyId, activeCompanyName, role, loading, refreshCompany: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany deve ser usado dentro de um CompanyProvider");
  }
  return context;
};
