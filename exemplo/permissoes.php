<?php
// Proteção de rota
if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (!isset($_SESSION['usuario_id'])) { header('Location: /login'); exit; }

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/check_permission.php';

if (!temPermissao($pdo, 'Permissões', 'p_acessar')) {
    header('Location: /dashboard/metas?error=acesso_negado');
    exit;
}

// Busca os perfis (Roles) e conta quantos usuários estão vinculados
$query = "
    SELECT p.id, p.nome, p.inativo, COUNT(u.id) as qtd_usuarios 
    FROM Perfis p 
    LEFT JOIN Usuarios u ON p.id = u.perfil_id 
    GROUP BY p.id
    ORDER BY p.criado_em DESC
";
$stmt = $pdo->prepare($query);
$stmt->execute();
$perfis = $stmt->fetchAll();

require_once __DIR__ . '/../../includes/header.php';
require_once __DIR__ . '/../../includes/sidebar.php';
?>

<div class="main-content">
    <?php require_once __DIR__ . '/../../includes/topbar.php'; ?>
    
    <div class="page-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2>Perfis de Permissões</h2>
            <?php if (temPermissao($pdo, 'Permissões', 'p_editar')): ?>
            <button class="btn btn-primary" onclick="openModalCreate()">
                <span class="material-symbols-outlined">add</span> Novo Perfil
            </button>
            <?php endif; ?>
        </div>
        
        <div class="table-container">
            <div class="table-toolbar">
                <div class="table-search">
                    <span class="material-symbols-outlined">search</span>
                    <input type="text" placeholder="Pesquisar perfil...">
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

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Nome do Perfil</th>
                        <th>Usuários Vinculados</th>
                        <th class="col-acoes">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($perfis as $perfil): ?>
                    <tr style="<?= $perfil['inativo'] ? 'opacity: 0.6;' : '' ?>">
                        <td>
                            <?= htmlspecialchars($perfil['nome']) ?>
                            <?php if($perfil['inativo']): ?> <span style="font-size: 0.75rem; background: var(--danger-color); color: white; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">Inativo</span> <?php endif; ?>
                        </td>
                        <td><?= $perfil['qtd_usuarios'] ?> usuários</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-history" title="Ver Histórico" onclick="openModalHistory('Perfil', '<?= $perfil['id'] ?>', '<?= htmlspecialchars(addslashes($perfil['nome'])) ?>')" style="color: var(--sidebar-text); background: var(--bg-color); border: 1px solid var(--border-color); padding: 6px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined">history</span></button>
                                <?php if (temPermissao($pdo, 'Permissões', 'p_ver') || temPermissao($pdo, 'Permissões', 'p_editar')): ?>
                                <button class="btn-view" title="Ver/Editar" onclick="openModalEdit('<?= $perfil['id'] ?>', '<?= htmlspecialchars(addslashes($perfil['nome'])) ?>')"><span class="material-symbols-outlined">visibility</span></button>
                                <?php endif; ?>
                                
                                <?php if (temPermissao($pdo, 'Permissões', 'p_bloquear')): ?>
                                <button class="<?= $perfil['inativo'] ? 'btn-unblock' : 'btn-block' ?>" title="<?= $perfil['inativo'] ? 'Ativar' : 'Bloquear' ?>" onclick="confirmToggle('<?= $perfil['id'] ?>', <?= $perfil['inativo'] ? 'true' : 'false' ?>)"><span class="material-symbols-outlined"><?= $perfil['inativo'] ? 'lock_open' : 'block' ?></span></button>
                                <?php endif; ?>
                                
                                <?php if (temPermissao($pdo, 'Permissões', 'p_excluir')): ?>
                                <button class="btn-delete" title="Excluir" onclick="confirmDelete('<?= $perfil['id'] ?>', <?= $perfil['qtd_usuarios'] ?>)"><span class="material-symbols-outlined">delete</span></button>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    
                    <?php if (count($perfis) === 0): ?>
                    <tr>
                        <td colspan="3" style="text-align: center; padding: 2rem;">Nenhum perfil cadastrado.</td>
                    </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <div class="table-pagination">
                <span>Mostrando 1 a <?= count($perfis) ?> de <?= count($perfis) ?> registros</span>
                <div class="pagination-links">
                    <a href="#">&laquo;</a>
                    <a href="#" class="active">1</a>
                    <a href="#">&raquo;</a>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Novo Perfil -->
<div class="modal-overlay" id="modal-novo-perfil">
    <div class="modal-content" style="max-width: 1200px; width: 95%;">
        <div class="modal-header">
            <h3>Criar Perfil de Permissão</h3>
            <button class="modal-close" onclick="closeModal('modal-novo-perfil')">&times;</button>
        </div>
        <div class="modal-body">
            <form id="form-perfil" action="/actions/permissoes_save.php" method="POST">
                <input type="hidden" id="perfil_id" name="id" value="">
                
                <div class="form-group">
                    <label for="nome_perfil">Nome do Perfil *</label>
                    <input type="text" id="nome_perfil" name="nome" class="form-control" maxlength="50" required placeholder="Ex: Financeiro">
                </div>
                
                <h4 style="margin-top: 1.5rem; margin-bottom: 1rem;">Permissões por Módulo</h4>
                <p style="font-size: 0.85rem; color: var(--sidebar-text); margin-bottom: 1rem;">Configure os níveis de acesso para este perfil utilizando os interruptores.</p>
                
                <?php 
                $modulos = [
                    'Dashboard > Metas' => ['acessar'],
                    'Dashboard > Administrativo' => ['acessar'],
                    'Permissões' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Usuários' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Metas' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Vendas' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir', 'confirmar'],
                    'Comprovantes' => ['acessar', 'confirmar'],
                    'Alunos' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Tarefas' => ['acessar', 'bloquear', 'ver', 'editar', 'excluir', 'confirmar', 'especial_1', 'especial_2', 'especial_3', 'especial_4'],
                    'Cursos' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Professores' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Turmas' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Certificados' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Programas' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Captadores' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Fornecedores' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Categorias' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Documentação' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Canais' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Unidades' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'Setores' => ['acessar', 'ver', 'editar', 'bloquear', 'excluir'],
                    'API Mercado Pago' => ['acessar', 'ver', 'editar', 'excluir'],
                    'Logs' => ['acessar']
                ];
                $i = 0;
                ?>
                
                <div style="padding-right: 10px;">
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <?php foreach($modulos as $nome => $chaves): ?>
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: var(--card-bg); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
                            <strong style="min-width: 220px; font-size: 0.9rem; color: var(--primary-color);"><?= htmlspecialchars($nome) ?></strong>
                            <?php if ($nome === 'Tarefas'): ?>
                            <div style="display: grid; grid-template-columns: repeat(5, auto); gap: 1rem; flex: 1; justify-content: end; justify-items: center;">
                            <?php else: ?>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap; flex: 1; justify-content: flex-end;">
                            <?php endif; ?>
                                <?php if ($nome === 'Tarefas'): ?>
                                    <?php if(in_array('acessar', $chaves)): ?>
                                    <label class="switch-label" title="Tarefas do Usuário (Aparece no menu)"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][acessar]" value="1"> Acessar</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('bloquear', $chaves)): ?>
                                    <label class="switch-label" title="Ver tarefas do setor inteiro"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][bloquear]" value="1"> Tarefas do Setor</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('ver', $chaves)): ?>
                                    <label class="switch-label" title="Ver todas as tarefas do sistema globalmente"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][ver]" value="1"> Tarefas Gerais</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('editar', $chaves)): ?>
                                    <label class="switch-label" title="Pode alterar título, descrição, e responsável da tarefa"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][editar]" value="1"> Editar Tarefa</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('excluir', $chaves)): ?>
                                    <label class="switch-label" title="Pode apagar itens do checklist/atividades da tarefa"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][excluir]" value="1"> Excluir Checklist</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('confirmar', $chaves)): ?>
                                    <label class="switch-label" title="Pode apagar a tarefa inteira permanentemente"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][confirmar]" value="1"> Excluir Tarefa</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('especial_1', $chaves)): ?>
                                    <label class="switch-label" title="Pode escrever comentários"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][especial_1]" value="1"> Comentar</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('especial_2', $chaves)): ?>
                                    <label class="switch-label" title="Pode apagar comentários"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][especial_2]" value="1"> Apagar Comentário</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('especial_3', $chaves)): ?>
                                    <label class="switch-label" title="Pode criar tarefas e se colocar como responsável"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][especial_3]" value="1"> Criar p/ Si</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('especial_4', $chaves)): ?>
                                    <label class="switch-label" title="Pode criar tarefas e delegar a outros usuários (do seu setor ou global, a depender da visualização)"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][especial_4]" value="1"> Criar p/ Setor/Outros</label>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <?php if(in_array('acessar', $chaves)): ?>
                                    <label class="switch-label" title="Aparece no menu lateral e permite acesso"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][acessar]" value="1"> Acessar</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('ver', $chaves)): ?>
                                    <label class="switch-label" title="Pode ver perfis ou dados detalhados"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][ver]" value="1"> Ver</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('editar', $chaves)): ?>
                                    <label class="switch-label" title="Permite criar novos registros e editar informações"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][editar]" value="1"> Editar/Criar</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('bloquear', $chaves)): ?>
                                    <label class="switch-label" title="Permite bloquear/desativar registros"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][bloquear]" value="1"> Bloquear</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('excluir', $chaves)): ?>
                                    <label class="switch-label" title="Permite excluir registros permanentemente"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][excluir]" value="1"> Excluir</label>
                                    <?php endif; ?>
                                    
                                    <?php if(in_array('confirmar', $chaves)): ?>
                                    <label class="switch-label" title="Permite confirmar ações especiais (ex: aprovar pagamentos)"><input type="checkbox" class="switch-input" name="permissoes[<?= $i ?>][confirmar]" value="1"> Confirmar</label>
                                    <?php endif; ?>
                                <?php endif; ?>
                                
                                <input type="hidden" name="permissoes[<?= $i ?>][modulo]" value="<?= htmlspecialchars($nome) ?>">
                            </div>
                        </div>
                        <?php $i++; endforeach; ?>
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn" onclick="closeModal('modal-novo-perfil')" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-color);">Cancelar</button>
            <?php if (temPermissao($pdo, 'Permissões', 'p_editar')): ?>
            <button type="submit" form="form-perfil" class="btn btn-primary">Salvar Perfil</button>
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

function openModalCreate() {
    document.getElementById('perfil_id').value = '';
    document.getElementById('nome_perfil').value = '';
    
    document.querySelectorAll('#form-perfil .switch-input').forEach(input => input.checked = false);
    
    document.getElementById('modal-novo-perfil').querySelector('h3').innerText = 'Criar Perfil de Permissão';
    document.getElementById('modal-novo-perfil').classList.add('active');
}

function openModalEdit(id, nome) {
    document.getElementById('perfil_id').value = id;
    document.getElementById('nome_perfil').value = nome;
    
    document.querySelectorAll('#form-perfil .switch-input').forEach(input => input.checked = false);
    
    document.getElementById('modal-novo-perfil').querySelector('h3').innerText = 'Editar Perfil de Permissão';
    document.getElementById('modal-novo-perfil').classList.add('active');
    
    fetch('/actions/permissoes_get.php?id=' + id)
        .then(res => res.json())
        .then(data => {
            if(data.error) return;
            
            data.forEach(perm => {
                const moduloInputs = document.querySelectorAll(`input[name$="[modulo]"][value="${perm.modulo}"]`);
                if(moduloInputs.length > 0) {
                    const index = moduloInputs[0].name.match(/\[(\d+)\]/)[1];
                    if(perm.p_acessar == 1) { const el = document.querySelector(`input[name="permissoes[${index}][acessar]"]`); if(el) el.checked = true; }
                    if(perm.p_ver == 1) { const el = document.querySelector(`input[name="permissoes[${index}][ver]"]`); if(el) el.checked = true; }
                    if(perm.p_editar == 1) { const el = document.querySelector(`input[name="permissoes[${index}][editar]"]`); if(el) el.checked = true; }
                    if(perm.p_bloquear == 1) { const el = document.querySelector(`input[name="permissoes[${index}][bloquear]"]`); if(el) el.checked = true; }
                    if(perm.p_excluir == 1) { const el = document.querySelector(`input[name="permissoes[${index}][excluir]"]`); if(el) el.checked = true; }
                    if(perm.p_confirmar == 1) { const el = document.querySelector(`input[name="permissoes[${index}][confirmar]"]`); if(el) el.checked = true; }
                    if(perm.p_especial_1 == 1) { const el = document.querySelector(`input[name="permissoes[${index}][especial_1]"]`); if(el) el.checked = true; }
                    if(perm.p_especial_2 == 1) { const el = document.querySelector(`input[name="permissoes[${index}][especial_2]"]`); if(el) el.checked = true; }
                    if(perm.p_especial_3 == 1) { const el = document.querySelector(`input[name="permissoes[${index}][especial_3]"]`); if(el) el.checked = true; }
                    if(perm.p_especial_4 == 1) { const el = document.querySelector(`input[name="permissoes[${index}][especial_4]"]`); if(el) el.checked = true; }
                }
            });
        });
}

function confirmToggle(id, isCurrentlyInactive) {
    if(isCurrentlyInactive) {
        showConfirm(
            'Desbloquear Perfil', 
            'Tem certeza que deseja desbloquear este perfil?', 
            () => {
                fetch('/actions/permissoes_toggle.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded'}, body: `id=${id}&status=0` })
                .then(res => res.json()).then(data => { window.location.reload(); });
            },
            'lock_open', 'var(--success-color)', 'btn-primary'
        );
    } else {
        showConfirm(
            'Bloquear Perfil', 
            'Tem certeza que deseja inativar este perfil? Todos os usuários com este perfil perderão acesso às ações!', 
            () => {
                fetch('/actions/permissoes_toggle.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded'}, body: `id=${id}&status=1` })
                .then(res => res.json()).then(data => { window.location.reload(); });
            },
            'block', 'var(--danger-color)', 'btn-danger'
        );
    }
}

function confirmDelete(id, count) {
    if (count > 0) {
        showToast('Não é possível excluir um perfil que está em uso por usuários.', 'error');
        return;
    }
    
    showConfirm(
        'Excluir Perfil', 
        'Tem certeza que deseja excluir este perfil do sistema? Esta ação NÃO pode ser desfeita.', 
        () => { window.location.href = `/actions/permissoes_delete.php?id=${id}`; },
        'delete_forever'
    );
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}
</script>

<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
