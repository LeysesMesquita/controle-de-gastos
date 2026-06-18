import CreateEnterpriseForm from "@/components/saas/CreateEnterpriseForm";

export const metadata = {
  title: "SaaS Admin | Criar Empresa",
  description: "Área administrativa para gestão do SaaS e criação de empresas.",
};

export default function SaasAdminPage() {
  return (
    <>
      <div className="grid grid-cols-1 gap-9 sm:grid-cols-2">
        <div className="flex flex-col gap-9">
          {/* O formulário de criar empresa */}
          <CreateEnterpriseForm />
        </div>
        
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Como Funciona?
              </h3>
            </div>
            <div className="p-6.5 text-sm text-body dark:text-bodydark">
              <p className="mb-4">
                Ao cadastrar uma empresa por aqui, o sistema utilizará as <strong>Credenciais de Serviço do Supabase (Service Role)</strong> para contornar a autenticação comum.
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>O e-mail fornecido nascerá como conta confirmada.</li>
                <li>Uma nova "Empresa" será criada com o nome fornecido.</li>
                <li>O e-mail será vinculado a essa Empresa como <strong>OWNER</strong> (Dono).</li>
                <li>A conta de Owner não pode ser excluída por regras de banco de dados.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
