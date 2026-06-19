import SaasSignInForm from "@/components/auth/SaasSignInForm";
import React from "react";

export const metadata = {
  title: "Acesso Mestre | SaaS Admin",
  description: "Página de acesso restrito aos donos do SaaS.",
};

export default function SaasLogin() {
  return <SaasSignInForm />;
}
