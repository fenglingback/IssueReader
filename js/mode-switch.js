/**
 * 模式切换 + 菜单下拉
 */
(function () {
    const { state } = App;
    const {
        viewMode, createMode, menuView, menuCreate, menuSwitchRepo,
        menuBtn, menuDropdown, importDropdown,
        sidebarToggle, headerTitle, editBtn, headerActions,
    } = App.dom;

    App.switchMode = function (mode) {
        if (state.isEditing && mode !== 'view') {
            if (App.isEditDirty()) {
                if (!confirm('有未保存的修改，确定要放弃吗？')) return;
            }
            App.exitEditMode();
        }

        state.currentMode = mode;
        if (mode === 'view') {
            viewMode.classList.remove('hidden');
            createMode.classList.add('hidden');
            menuView.classList.add('active');
            menuCreate.classList.remove('active');
            sidebarToggle.style.display = '';
            headerTitle.style.display = '';
            // [Bug #8] 原代码无条件重置为仓库名，丢失了当前 issue 标题
            // - 有 currentIssue 时优先显示 issue 标题 + 链接
            // - 否则显示仓库名
            if (state.currentIssue) {
                headerTitle.textContent = state.currentIssue.title;
                headerTitle.href = state.currentIssue.html_url;
            } else {
                headerTitle.textContent = state.currentRepo || 'GitHub Issue 管理器';
                headerTitle.href = '';
            }
            headerActions.classList.remove('visible');
            if (state.currentIssue) editBtn.classList.add('visible');
        } else {
            viewMode.classList.add('hidden');
            createMode.classList.remove('hidden');
            menuView.classList.remove('active');
            menuCreate.classList.add('active');
            sidebarToggle.style.display = 'none';
            headerTitle.style.display = 'none';
            headerActions.classList.add('visible');
            editBtn.classList.remove('visible');
            App.switchEditorTab('write');
        }
        menuDropdown.classList.remove('open');
    };

    App.initModeSwitchEvents = function () {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('open');
        });

        // [J5+J6] 合并全局点击：关闭所有下拉菜单
        document.addEventListener('click', () => {
            menuDropdown.classList.remove('open');
            importDropdown.classList.remove('open');
        });

        menuDropdown.addEventListener('click', (e) => e.stopPropagation());
        importDropdown.addEventListener('click', (e) => e.stopPropagation());

        menuView.addEventListener('click', () => App.switchMode('view'));
        menuCreate.addEventListener('click', () => App.switchMode('create'));
        menuSwitchRepo.addEventListener('click', () => {
            menuDropdown.classList.remove('open');
            App.showRepoSwitchModal();
        });
    };
})();
