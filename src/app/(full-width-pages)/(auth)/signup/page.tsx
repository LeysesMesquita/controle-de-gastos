import { redirect } from "next/navigation";

export const metadata = {
  title: "Acesso Restrito",
};

export default function SignUp() {
  redirect("/signin");
}
