"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SaasSignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Falha ao entrar: " + error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMsg("Falha ao entrar: Erro desconhecido.");
      setLoading(false);
      return;
    }

    // Verificação estrita se o usuário é um SaaS Admin
    const { data: saasAdmin } = await supabase
      .from("saas_admins")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (!saasAdmin) {
      // É um cliente Enterprise tentando entrar por aqui
      await supabase.auth.signOut();
      setErrorMsg("Acesso Negado: Área restrita a Super Administradores do sistema.");
      setLoading(false);
      return;
    }

    // Sucesso, redireciona para a área administrativa master
    router.push("/saas-admin");
    router.refresh();
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8 text-center sm:text-left">
            <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-white bg-red-500 rounded-full">
              SaaS Admin Mode
            </span>
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Controle Mestre
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerenciamento das Enterprises (Clientes)
            </p>
          </div>
          <div>
            <form onSubmit={handleSignIn}>
              <div className="space-y-6">
                {errorMsg && (
                  <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg dark:bg-red-500/10 dark:text-red-400">
                    {errorMsg}
                  </div>
                )}
                <div>
                  <Label>
                    E-mail Master <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input 
                    placeholder="admin@seusaas.com" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>
                    Senha Master <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha super secreta"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Manter Conectado
                    </span>
                  </div>
                </div>
                <div>
                  <Button onClick={handleSignIn} type="submit" className="w-full bg-red-600 hover:bg-red-700 border-red-600 text-white" size="sm" disabled={loading}>
                    {loading ? "Verificando Credenciais..." : "Acessar Sistema Mestre"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
