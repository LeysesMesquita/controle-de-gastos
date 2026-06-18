<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (!isset($_SESSION['usuario_id'])) {
    header('Location: /login');
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/check_permission.php';

// Segurança de Rota: Se alguém tentar forçar o link na barra de endereços
if (!temPermissao($pdo, 'Usuários', 'p_acessar')) {
    header('Location: /dashboard/metas?error=acesso_negado');
    exit;
}

// Mensagens de Sucesso ou Erro
$msg = $_GET['msg'] ?? '';
$error = $_GET['error'] ?? '';

// Busca usuários e o nome de seus perfis
$query = "
    SELECT u.*, p.nome as perfil_nome, s.nome as setor_nome, s.cor as setor_cor
    FROM Usuarios u 
    LEFT JOIN Perfis p ON u.perfil_id = p.id 
    LEFT JOIN Setores s ON u.setor_id = s.id
    ORDER BY u.nome ASC
";
$stmt = $pdo->prepare($query);
$stmt->execute();
$usuarios = $stmt->fetchAll();

// Busca perfis ativos para o select do Modal
$stmtPerfis = $pdo->query("SELECT id, nome FROM Perfis WHERE inativo = 0 ORDER BY nome ASC");
$perfis_lista = $stmtPerfis->fetchAll();

// Busca setores ativos para o select do Modal
$stmtSetores = $pdo->query("SELECT id, nome FROM Setores WHERE inativo = 0 ORDER BY nome ASC");
$setores_lista = $stmtSetores->fetchAll();

require_once __DIR__ . '/../../includes/header.php';
require_once __DIR__ . '/../../includes/sidebar.php';
?>

<div class="main-content">
    <?php require_once __DIR__ . '/../../includes/topbar.php'; ?>
    
    <div class="page-content">

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2>Gestão de Usuários</h2>
            <?php if (temPermissao($pdo, 'Usuários', 'p_editar')): ?>
            <button class="btn btn-primary" onclick="openUserModal()">
                <span class="material-symbols-outlined">add</span> Novo Usuário
            </button>
            <?php endif; ?>
        </div>
        
        <div class="table-container">
            <div class="table-toolbar">
                <div class="table-search">
                    <span class="material-symbols-outlined">search</span>
                    <input type="text" id="searchInput" placeholder="Pesquisar por nome, cpf ou email..." onkeyup="filterTable()">
                </div>
                <div>
                    Mostrar 
                    <select class="form-control" style="width: auto; display: inline-block; padding: 0.2rem;">
                        <option>10</option>
                        <option>25</option>
                        <option>50</option>
                    </select>
                </div>
            </div>

            <table class="custom-table" id="usersTable">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>CPF</th>
                        <th>E-mail</th>
                        <th>Perfil</th>
                        <th>Setor</th>
                        <th style="text-align: center;">Status</th>
                        <th class="col-acoes">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (count($usuarios) > 0): ?>
                        <?php foreach($usuarios as $usr): ?>
                        <tr>
                            <td>
                                <div style="font-weight: 600;"><?= htmlspecialchars($usr['nome']) ?></div>
                                <div style="font-size: 0.8rem; color: var(--sidebar-text);"><?= htmlspecialchars($usr['telefone'] ?? 'Sem telefone') ?></div>
                            </td>
                            <td><?= htmlspecialchars($usr['cpf']) ?></td>
                            <td><?= htmlspecialchars($usr['login']) ?></td>
                            <td><span class="badge badge-primary"><?= htmlspecialchars($usr['perfil_nome'] ?? 'Sem Perfil') ?></span></td>
                            <td>
                                <?php if($usr['setor_id']): ?>
                                <span style="font-size: 0.8rem; font-weight: 500; background-color: <?= htmlspecialchars($usr['setor_cor']) ?>20; color: <?= htmlspecialchars($usr['setor_cor']) ?>; padding: 3px 8px; border-radius: 4px; border: 1px solid <?= htmlspecialchars($usr['setor_cor']) ?>40;">
                                    <?= htmlspecialchars($usr['setor_nome']) ?>
                                </span>
                                <?php else: ?>
                                <span style="font-size: 0.8rem; color: #999;">Sem setor</span>
                                <?php endif; ?>
                            </td>
                            <td style="text-align: center;">
                                <?php if (temPermissao($pdo, 'Usuários', 'p_bloquear')): ?>
                                <label class="switch-label" style="display: inline-flex; margin: 0 auto; flex-direction: row;">
                                    <input type="checkbox" class="switch-input" <?= !$usr['inativo'] ? 'checked' : '' ?> onchange="toggleUserStatus('<?= $usr['id'] ?>', this.checked)">
                                </label>
                                <?php else: ?>
                                <span style="font-size: 0.8rem; font-weight: bold; padding: 2px 8px; border-radius: 4px; background: <?= !$usr['inativo'] ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' ?>; color: <?= !$usr['inativo'] ? 'var(--success-color)' : 'var(--danger-color)' ?>;">
                                    <?= !$usr['inativo'] ? 'Ativo' : 'Inativo' ?>
                                </span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn-history" title="Ver Histórico" onclick="openModalHistory('Usuario', '<?= $usr['id'] ?>', '<?= htmlspecialchars(addslashes($usr['nome'])) ?>')" style="color: var(--sidebar-text); background: var(--bg-color); border: 1px solid var(--border-color); padding: 6px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined">history</span></button>
                                    
                                    <?php if (temPermissao($pdo, 'Usuários', 'p_bloquear')): ?>
                                    <button class="<?= $usr['inativo'] ? 'btn-unblock' : 'btn-block' ?>" onclick="confirmToggle('<?= $usr['id'] ?>', <?= $usr['inativo'] ? 'true' : 'false' ?>)" title="<?= $usr['inativo'] ? 'Desbloquear Usuário' : 'Bloquear Usuário' ?>">
                                        <span class="material-symbols-outlined"><?= $usr['inativo'] ? 'lock_open' : 'block' ?></span>
                                    </button>
                                    <?php endif; ?>

                                    <?php if (temPermissao($pdo, 'Usuários', 'p_ver') || temPermissao($pdo, 'Usuários', 'p_editar')): ?>
                                    <button class="btn-view" title="Visualizar / Editar" onclick="openUserModalEdit('<?= $usr['id'] ?>', '<?= htmlspecialchars(addslashes($usr['nome'])) ?>', '<?= htmlspecialchars($usr['cpf']) ?>', '<?= htmlspecialchars($usr['telefone']) ?>', '<?= htmlspecialchars($usr['login']) ?>', '<?= $usr['perfil_id'] ?>', '<?= $usr['setor_id'] ?>')">
                                        <span class="material-symbols-outlined">visibility</span>
                                    </button>
                                    <?php endif; ?>
                                    
                                    <?php if (temPermissao($pdo, 'Usuários', 'p_excluir')): ?>
                                    <button class="btn-delete" onclick="confirmDelete('<?= $usr['id'] ?>')" title="Excluir Usuário">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 2rem;">Nenhum usuário cadastrado.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
            
            <div class="table-pagination">
                <div>Mostrando 1 a <?= count($usuarios) ?> de <?= count($usuarios) ?> registros</div>
                <div class="pagination-links">
                    <a href="#">Anterior</a>
                    <a href="#" class="active">1</a>
                    <a href="#">Próximo</a>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Usuário -->
<div class="modal-overlay" id="modal-usuario">
    <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
            <h3 id="modal-title">Novo Usuário</h3>
            <button class="modal-close" onclick="closeModal('modal-usuario')">&times;</button>
        </div>
        <div class="modal-body">
            <form id="form-usuario" action="/actions/usuarios_save.php" method="POST">
                <input type="hidden" id="usr_id" name="id" value="">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <!-- Coluna 1 -->
                    <div class="form-group" style="grid-column: span 2;">
                        <label for="usr_nome">Nome Completo *</label>
                        <input type="text" id="usr_nome" name="nome" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="usr_cpf">CPF *</label>
                        <input type="text" id="usr_cpf" name="cpf" class="form-control cpf-mask" required placeholder="000.000.000-00" maxlength="14">
                    </div>
                    
                    <div class="form-group">
                        <label for="usr_telefone">Telefone</label>
                        <input type="text" id="usr_telefone" name="telefone" class="form-control telefone-mask" placeholder="(00) 00000-0000" maxlength="15">
                    </div>

                    <div class="form-group">
                        <label for="usr_perfil">Perfil de Acesso *</label>
                        <select id="usr_perfil" name="perfil_id" class="form-control" required>
                            <option value="">Selecione um Perfil...</option>
                            <?php foreach($perfis_lista as $p): ?>
                                <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="usr_setor">Setor</label>
                        <select id="usr_setor" name="setor_id" class="form-control">
                            <option value="">Sem Setor</option>
                            <?php foreach($setores_lista as $s): ?>
                                <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div style="grid-column: span 2; border-top: 1px solid var(--border-color); margin: 1rem 0;"></div>

                    <div class="form-group">
                        <label for="usr_login">E-mail de Acesso *</label>
                        <input type="email" id="usr_login" name="login" class="form-control" required autocomplete="new-username" placeholder="nome@empresa.com">
                    </div>

                    <div class="form-group">
                        <label for="usr_senha">Senha <span id="senha-hint" style="font-size: 0.75rem; color: var(--sidebar-text); font-weight: normal;">(Preencha apenas para alterar)</span></label>
                        <input type="password" id="usr_senha" name="senha" class="form-control" autocomplete="new-password">
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn" onclick="closeModal('modal-usuario')" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-color);">Cancelar</button>
            <?php if (temPermissao($pdo, 'Usuários', 'p_editar')): ?>
            <button type="submit" form="form-usuario" class="btn btn-primary">Salvar Usuário</button>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Modal Histórico -->
<div class="modal-overlay" id="modal-historico">
    <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
            <h3>Histórico de Ações: <span id="historico_nome"></span></h3>
            <button class="modal-close" onclick="closeModal('modal-historico')">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
            <div id="historico_loading" style="text-align: center; padding: 2rem; color: var(--sidebar-text);">Carregando histórico...</div>
            <div id="historico_list" style="display: none; flex-direction: column; gap: 1rem;">
                <!-- Logs will be inserted here -->
            </div>
            <div id="historico_empty" style="display: none; text-align: center; padding: 2rem; color: var(--sidebar-text);">Nenhum log encontrado para este item.</div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn" onclick="closeModal('modal-historico')" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-color);">Fechar</button>
        </div>
    </div>
</div>

<script>
function openModalHistory(tipo, id, nome) {
    document.getElementById('historico_nome').innerText = nome;
    document.getElementById('historico_loading').style.display = 'block';
    document.getElementById('historico_list').style.display = 'none';
    document.getElementById('historico_empty').style.display = 'none';
    
    document.getElementById('modal-historico').classList.add('active');
    
    fetch(`/actions/get_logs.php?tipo=${tipo}&id=${id}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('historico_loading').style.display = 'none';
            if(data.error || data.length === 0) {
                document.getElementById('historico_empty').style.display = 'block';
                return;
            }
            
            let html = '';
            data.forEach(log => {
                let icon = 'info';
                let color = 'var(--text-color)';
                if(log.acao === 'CRIAR') { icon = 'add_circle'; color = 'var(--success-color)'; }
                if(log.acao === 'EDITAR') { icon = 'edit'; color = 'var(--primary-color)'; }
                if(log.acao === 'BLOQUEAR') { icon = 'block'; color = 'var(--warning-color)'; }
                if(log.acao === 'DESBLOQUEAR') { icon = 'lock_open'; color = 'var(--success-color)'; }
                if(log.acao === 'APAGAR' || log.acao === 'EXCLUIR') { icon = 'delete'; color = 'var(--danger-color)'; }
                
                let dateObj = new Date(log.criado_em.replace(/-/g, '/'));
                let dataFormatada = log.criado_em; 
                if (!isNaN(dateObj)) {
                    dataFormatada = dateObj.toLocaleDateString('pt-BR') + ' às ' + dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                }
                
                html += `
                <div style="display: flex; gap: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                    <div style="color: ${color};"><span class="material-symbols-outlined">${icon}</span></div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-color);">${log.descricao}</div>
                        <div style="font-size: 0.85rem; color: var(--sidebar-text); margin-top: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom;">person</span> 
                            Por: <strong style="color:var(--text-color);">${log.usuario_nome || 'Sistema'}</strong> 
                            <span style="margin: 0 8px;">|</span>
                            <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom;">schedule</span> 
                            Em: ${dataFormatada}
                        </div>
                    </div>
                </div>
                `;
            });
            
            document.getElementById('historico_list').innerHTML = html;
            document.getElementById('historico_list').style.display = 'flex';
        });
}

// Funções do Modal
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function openUserModal() {
    document.getElementById('modal-title').innerText = 'Novo Usuário';
    document.getElementById('usr_id').value = '';
    document.getElementById('usr_nome').value = '';
    document.getElementById('usr_cpf').value = '';
    document.getElementById('usr_telefone').value = '';
    document.getElementById('usr_login').value = '';
    document.getElementById('usr_perfil').value = '';
    document.getElementById('usr_setor').value = '';
    document.getElementById('usr_senha').required = true;
    document.getElementById('senha-hint').style.display = 'none';
    openModal('modal-usuario');
}

function openUserModalEdit(id, nome, cpf, telefone, login, perfil_id, setor_id) {
    document.getElementById('modal-title').innerText = 'Editar Usuário';
    document.getElementById('usr_id').value = id;
    document.getElementById('usr_nome').value = nome;
    document.getElementById('usr_cpf').value = cpf;
    document.getElementById('usr_telefone').value = telefone || '';
    document.getElementById('usr_login').value = login;
    document.getElementById('usr_perfil').value = perfil_id;
    document.getElementById('usr_setor').value = setor_id || '';
    document.getElementById('usr_senha').required = false;
    document.getElementById('usr_senha').value = '';
    document.getElementById('senha-hint').style.display = 'inline';
    openModal('modal-usuario');
}

function confirmToggle(id, isCurrentlyInactive) {
    if(isCurrentlyInactive) {
        showConfirm(
            'Desbloquear Usuário', 
            'Tem certeza que deseja devolver o acesso deste usuário ao sistema?', 
            () => toggleUserStatus(id, true),
            'lock_open',
            'var(--success-color)',
            'btn-primary' // Use primary green for unlocking
        );
    } else {
        showConfirm(
            'Bloquear Usuário', 
            'Tem certeza que deseja bloquear o acesso deste usuário? Ele será desconectado.', 
            () => toggleUserStatus(id, false),
            'block',
            'var(--danger-color)',
            'btn-danger'
        );
    }
}

// Lógica de Ativar/Inativar
function toggleUserStatus(id, isActive) {
    fetch('/actions/usuarios_toggle.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `id=${id}&status=${isActive ? 1 : 0}`
    }).then(res => res.json()).then(data => {
        if(!data.success) {
            alert('Erro ao alterar status: ' + (data.message || 'Desconhecido'));
        }
        window.location.reload(); // Recarrega para atualizar os ícones e switch
    }).catch(err => {
        alert('Erro de conexão ao alterar status.');
        window.location.reload();
    });
}

// Lógica de Exclusão
function confirmDelete(id) {
    showConfirm(
        'Excluir Usuário', 
        'Tem certeza absoluta que deseja excluir este usuário? Esta ação não pode ser desfeita e pode afetar relatórios atrelados a ele.', 
        () => {
            window.location.href = `/actions/usuarios_delete.php?id=${id}`;
        },
        'delete_forever'
    );
}

// Filtro de Busca (Frontend)
function filterTable() {
    let input = removeAccents(document.getElementById("searchInput").value.toLowerCase());
    let rows = document.getElementById("usersTable").getElementsByTagName("tr");
    
    for (let i = 1; i < rows.length; i++) { // pula thead
        let text = removeAccents(rows[i].textContent.toLowerCase());
        if (text.indexOf(input) > -1) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
}

// Máscaras JS Simples
document.addEventListener('input', function (e) {
    if (e.target.classList.contains('cpf-mask')) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})/);
        e.target.value = !x[2] ? x[1] : x[1] + '.' + x[2] + (x[3] ? '.' + x[3] : '') + (x[4] ? '-' + x[4] : '');
    }
    
    if (e.target.classList.contains('telefone-mask')) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    }
});

// Validação Matemática de CPF no Frontend
function jsValidaCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g,'');
    if(cpf == '') return false;
    // Elimina CPFs invalidos conhecidos
    if (cpf.length != 11 || 
        cpf == "00000000000" || cpf == "11111111111" || 
        cpf == "22222222222" || cpf == "33333333333" || 
        cpf == "44444444444" || cpf == "55555555555" || 
        cpf == "66666666666" || cpf == "77777777777" || 
        cpf == "88888888888" || cpf == "99999999999")
            return false;
            
    // Valida 1o digito
    let add = 0;
    for (let i=0; i < 9; i ++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) rev = 0;
    if (rev != parseInt(cpf.charAt(9))) return false;
    
    // Valida 2o digito
    add = 0;
    for (let i = 0; i < 10; i ++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) rev = 0;
    if (rev != parseInt(cpf.charAt(10))) return false;
    
    return true;
}

// Interceptar o submit do form
document.getElementById('form-usuario').addEventListener('submit', function(e) {
    const cpfInput = document.getElementById('usr_cpf').value;
    if (!jsValidaCPF(cpfInput)) {
        e.preventDefault();
        showToast('O CPF digitado é inválido matematicamente.', 'error');
        document.getElementById('usr_cpf').focus();
    }
});
</script>

<?php require_once __DIR__ . '/../../includes/footer.php'; ?>

