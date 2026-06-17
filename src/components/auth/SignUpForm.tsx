"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChecked) {
      setErrorMsg("Você precisa aceitar os Termos e Condições.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: `${fname} ${lname}`.trim(),
        }
      }
    });

    if (error) {
      setErrorMsg("Falha ao cadastrar: " + error.message);
      setLoading(false);
    } else {
      setSuccessMsg("Conta criada! Redirecionando...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Voltar para o painel
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Criar Conta
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Controle de Gastos
            </p>
          </div>
          <div>
            <form onSubmit={handleSignUp}>
              <div className="space-y-5">
                {errorMsg && (
                  <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg dark:bg-red-500/10 dark:text-red-400">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 text-sm text-green-500 bg-green-100 rounded-lg dark:bg-green-500/10 dark:text-green-400">
                    {successMsg}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <Label>Nome<span className="text-error-500">*</span></Label>
                    <Input type="text" placeholder="Nome" value={fname} onChange={(e) => setFname(e.target.value)} />
                  </div>
                  <div className="sm:col-span-1">
                    <Label>Sobrenome<span className="text-error-500">*</span></Label>
                    <Input type="text" placeholder="Sobrenome" value={lname} onChange={(e) => setLname(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Email<span className="text-error-500">*</span></Label>
                  <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Senha<span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input placeholder="Sua senha" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                      {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox className="w-5 h-5" checked={isChecked} onChange={setIsChecked} />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    Eu aceito os <span className="text-gray-800 dark:text-white/90">Termos e Condições</span>
                  </p>
                </div>
                <div>
                  <button disabled={loading} className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50">
                    {loading ? "Cadastrando..." : "Cadastrar"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Já tem uma conta? <Link href="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">Entre aqui</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
