/**
 * 授权模块 —— Token 验证 / 授权弹窗 / 仓库选择 / 仓库切换
 */
(function () {
    const { state } = App;
    const {
        tokenModal, githubTokenInput, repoSelect, verifyTokenBtn, saveTokenBtn,
        cancelTokenBtn, tokenError, repoError,
        repoSwitchModal, newRepoSelect, saveSwitchBtn, cancelSwitchBtn, newRepoError,
        publishBtn, headerTitle, sidebar, sidebarToggle,
        confirmPublishRepoBtn, publishRepoList,
    } = App.dom;

    // ==================== [J1] 统一仓库获取逻辑 ====================
    App.fetchAndRenderRepos = async function (token, container, { mode = 'select' } = {}) {
        try {
            const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) throw new Error('获取仓库列表失败');

            const repos = await response.json();
            repos.sort((a, b) => a.full_name.localeCompare(b.full_name));

            if (mode === 'select') {
                container.innerHTML = '';
                if (repos.length === 0) {
                    container.innerHTML = '<option value="">没有可用的仓库</option>';
                    return [];
                }
                const fragment = document.createDocumentFragment();
                repos.forEach(repo => {
                    const option = document.createElement('option');
                    option.value = repo.full_name;
                    option.textContent = repo.full_name;
                    fragment.appendChild(option);
                });
                container.appendChild(fragment);
                container.disabled = false;
                if (state.currentRepo) container.value = state.currentRepo;
            } else {
                container.innerHTML = '';
                if (repos.length === 0) {
                    container.innerHTML = '<div class="repo-list-item">没有找到仓库</div>';
                    return [];
                }
                repos.forEach(repo => {
                    const item = document.createElement('div');
                    item.className = 'repo-list-item';
                    item.textContent = repo.full_name;

                    if (repo.full_name === state.currentRepo) {
                        item.classList.add('selected');
                        state.selectedPublishRepo = repo.full_name;
                        confirmPublishRepoBtn.disabled = false;
                    }

                    item.addEventListener('click', () => {
                        container.querySelectorAll('.repo-list-item').forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');
                        state.selectedPublishRepo = repo.full_name;
                        confirmPublishRepoBtn.disabled = false;
                    });

                    container.appendChild(item);
                });
            }

            return repos;
        } catch (error) {
            console.error('获取仓库列表失败:', error);
            if (mode === 'select') {
                container.innerHTML = '<option value="">加载失败</option>';
            } else {
                container.innerHTML = `<div class="repo-list-item">加载失败: ${error.message}</div>`;
                // [Bug #16] 列表模式失败时禁用发布按钮，避免用户点了之后 selectedPublishRepo 为 null 无反馈
                confirmPublishRepoBtn.disabled = true;
                state.selectedPublishRepo = null;
            }
            return [];
        }
    };

    // ==================== GitHub Token ====================
    App.checkAuth = function () {
        const token = localStorage.getItem('githubToken');
        const repo = localStorage.getItem('bjRepo');

        if (!token || !repo) {
            App.showTokenModal();
        } else {
            state.currentRepo = repo;
            headerTitle.textContent = repo;
            App.loadIssues(token, repo);
            publishBtn.disabled = false;
        }

        // [Bug #15] 同步 sidebarToggle 初始 active 状态
        // - 桌面端：根据 localStorage 的 sidebarCollapsed 决定
        // - 移动端：sidebar 默认隐藏（无 visible class），toggle 必须移除 active
        if (window.innerWidth > 768) {
            const collapsed = localStorage.getItem('sidebarCollapsed');
            if (collapsed === 'true') {
                state.sidebarCollapsed = true;
                sidebar.classList.add('collapsed');
                sidebarToggle.classList.remove('active');
            } else {
                state.sidebarCollapsed = false;
                sidebar.classList.remove('collapsed');
                sidebarToggle.classList.add('active');
            }
        } else {
            state.sidebarCollapsed = false;
            sidebar.classList.remove('collapsed', 'visible');
            sidebarToggle.classList.remove('active');
        }
    };

    App.showTokenModal = function () {
        tokenModal.classList.remove('hidden');
        githubTokenInput.focus();
    };

    App.hideTokenModal = function () {
        tokenModal.classList.add('hidden');
        tokenError.textContent = '';
        repoError.textContent = '';
        // [Bug #5] 重置弹窗内部 UI 状态，否则验证通过后取消再重开会卡死
        githubTokenInput.disabled = false;
        githubTokenInput.value = localStorage.getItem('githubToken') || '';
        verifyTokenBtn.style.display = '';
        verifyTokenBtn.disabled = false;
        verifyTokenBtn.textContent = '验证';
        saveTokenBtn.style.display = 'none';
        repoSelect.disabled = true;
        repoSelect.innerHTML = '<option value="">先验证 token</option>';
    };

    async function verifyToken(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `token ${token}` }
            });
            return response.ok;
        } catch (error) {
            console.error('验证 token 失败:', error);
            return false;
        }
    }

    App.initAuthEvents = function () {
        verifyTokenBtn.addEventListener('click', async () => {
            const token = githubTokenInput.value.trim();
            if (!token) {
                tokenError.textContent = '请输入 GitHub token';
                return;
            }

            verifyTokenBtn.disabled = true;
            verifyTokenBtn.textContent = '验证中...';

            const isValid = await verifyToken(token);

            if (isValid) {
                tokenError.textContent = '';
                githubTokenInput.disabled = true;
                verifyTokenBtn.style.display = 'none';
                saveTokenBtn.style.display = 'block';
                repoSelect.disabled = false;

                await App.fetchAndRenderRepos(token, repoSelect, { mode: 'select' });
            } else {
                tokenError.textContent = '无效的 token，请重试';
            }

            verifyTokenBtn.disabled = false;
            verifyTokenBtn.textContent = '验证';
        });

        saveTokenBtn.addEventListener('click', () => {
            const repo = repoSelect.value;
            if (!repo) {
                repoError.textContent = '请选择一个仓库';
                return;
            }

            localStorage.setItem('githubToken', githubTokenInput.value);
            localStorage.setItem('bjRepo', repo);
            state.currentRepo = repo;

            App.hideTokenModal();
            publishBtn.disabled = false;
            App.loadIssues(githubTokenInput.value, repo);
        });

        cancelTokenBtn.addEventListener('click', () => {
            App.hideTokenModal();
            if (!localStorage.getItem('githubToken') || !localStorage.getItem('bjRepo')) {
                App.showTokenModal();
            }
        });
    };

    // ==================== Repo Switch Modal ====================
    App.showRepoSwitchModal = function () {
        const token = localStorage.getItem('githubToken');
        if (!token) {
            // [Bug #6] 无 token 时错误文案写在隐藏弹窗里用户根本看不到
            // 直接弹 token 认证窗，让用户先完成认证
            App.showToast('请先设置 GitHub Token', 'error');
            App.showTokenModal();
            return;
        }
        newRepoError.textContent = '';
        repoSwitchModal.classList.remove('hidden');
        App.fetchAndRenderRepos(token, newRepoSelect, { mode: 'select' });
    };

    App.hideRepoSwitchModal = function () {
        repoSwitchModal.classList.add('hidden');
        newRepoError.textContent = '';
    };

    App.initRepoSwitchEvents = function () {
        saveSwitchBtn.addEventListener('click', () => {
            const repo = newRepoSelect.value;
            if (!repo) {
                newRepoError.textContent = '请选择一个仓库';
                return;
            }

            localStorage.setItem('bjRepo', repo);
            state.currentRepo = repo;

            App.hideRepoSwitchModal();
            App.loadIssues(localStorage.getItem('githubToken'), repo);
        });

        cancelSwitchBtn.addEventListener('click', App.hideRepoSwitchModal);
    };
})();
