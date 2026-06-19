import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Carrega as variáveis do .env.local manualmente para o script
const envLocalPath = path.resolve('.env.local');
const envConfig = fs.readFileSync(envLocalPath, 'utf-8').split('\n');
const envs: Record<string, string> = {};
envConfig.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envs[key.trim()] = value.trim();
  }
});

const supabaseUrl = envs['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = envs['SUPABASE_SERVICE_ROLE_KEY'];

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'leyses.adm@gmail.com';
  const password = 'Controle@contas2026';

  console.log('1. Buscando usuário existente...');
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('Erro ao listar usuários:', listError);
    return;
  }

  const existingUser = usersData.users.find(u => u.email === email);

  if (existingUser) {
    console.log('Usuário corrompido encontrado. Deletando...');
    await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    console.log('Usuário deletado.');
  }

  console.log('2. Criando o usuário corretamente pela API Oficial...');
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      company_name: 'SaaS Admin Master'
    }
  });

  if (createError || !newUser.user) {
    console.error('Erro ao criar usuário:', createError);
    return;
  }

  console.log('Usuário criado com sucesso! ID:', newUser.user.id);

  console.log('3. Inserindo na tabela saas_admins...');
  const { error: insertError } = await supabaseAdmin.from('saas_admins').insert({
    id: newUser.user.id
  });

  if (insertError) {
    console.error('Erro ao inserir em saas_admins (se der erro de duplicidade, tudo bem):', insertError);
  } else {
    console.log('Permissões de Super Admin concedidas com sucesso!');
  }
  
  console.log('Finalizado! Você já pode fazer login.');
}

main();
