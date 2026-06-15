/**
 * 内联编辑模式 —— 进入/退出/保存/取消
 */
(function () {
    const { state } = App;
    const {
        content, editBtn, editTitleInput, editContentInput,
        editPreviewToggle, editSaveBtn, editCancelBtn,
        editPreviewContent, headerTitle, issueList,
    } = App.dom;

    App.enterEditMode = function () {
        if (!state.currentIssue) return;
        state.isEditing = true;
        state.editEditTab = 'write';

        state.editOriginalTitle = state.currentIssue.title || '';
        state.editOriginalBody = state.currentIssue.body || '';

        editTitleInput.value = state.editOriginalTitle;
        editContentInput.value = state.editOriginalBody;

        content.classList.add('editing');
        content.classList.remove('preview-active');
        editPreviewToggle.classList.remove('active');
        editPreviewToggle.title = '预览';

        updateEditSaveState();
    };

    App.exitEditMode = function () {
        state.isEditing = false;
        content.classList.remove('editing', 'preview-active');
    };

    App.isEditDirty = function () {
        if (!state.isEditing) return false;
        return editTitleInput.value !== state.editOriginalTitle || editContentInput.value !== state.editOriginalBody;
    };

    function updateEditSaveState() {
        editSaveBtn.disabled = !(editTitleInput.value.trim());
    }

    function updateEditPreview() {
        App.renderMarkdown(editContentInput.value || '*没有内容可预览*', editPreviewContent);
    }

    async function saveEdit() {
        if (!state.currentIssue) return;
        const token = localStorage.getItem('githubToken');
        if (!token) {
            App.showToast('请先设置 GitHub Token', 'error');
            App.showTokenModal();
            return;
        }

        const newTitle = editTitleInput.value.trim();
        const newBody = editContentInput.value.trim();

        if (!newTitle) {
            App.showToast('标题不能为空', 'error');
            return;
        }

        try {
            editSaveBtn.disabled = true;
            editSaveBtn.textContent = '保存中...';

            const response = await fetch(`https://api.github.com/repos/${state.currentRepo}/issues/${state.currentIssue.number}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle,
                    body: newBody
                })
            });

            if (!response.ok) throw new Error(`HTTP 错误: ${response.status}`);

            const updatedIssue = await response.json();

            const idx = state.issues.findIndex(i => i.id === state.currentIssue.id);
            if (idx !== -1) {
                state.issues[idx] = updatedIssue;
                state.currentIssue = updatedIssue;
            }

            const sideItem = issueList.querySelector(`[data-id="${state.currentIssue.id}"]`);
            if (sideItem) {
                sideItem.querySelector('.sidebar-item-title').textContent = updatedIssue.title;
                sideItem.querySelector('.sidebar-item-meta span:last-of-type').textContent = new Date(updatedIssue.updated_at).toLocaleDateString();
            }

            headerTitle.textContent = updatedIssue.title;
            headerTitle.href = updatedIssue.html_url;

            App.exitEditMode();
            App.renderIssue(updatedIssue);

            App.showToast('Issue 已更新', 'success');
        } catch (error) {
            App.showToast('更新失败: ' + error.message, 'error');
            console.error('Failed to update issue:', error);
        } finally {
            editSaveBtn.disabled = false;
            editSaveBtn.textContent = '保存';
        }
    }

    function cancelEdit() {
        if (App.isEditDirty()) {
            if (!confirm('有未保存的修改，确定要放弃吗？')) return;
        }
        App.exitEditMode();
        if (state.currentIssue) {
            App.renderIssue(state.currentIssue);
        }
    }

    App.initEditModeEvents = function () {
        editBtn.addEventListener('click', () => App.enterEditMode());
        editSaveBtn.addEventListener('click', () => saveEdit());
        editCancelBtn.addEventListener('click', () => cancelEdit());

        editPreviewToggle.addEventListener('click', () => {
            if (state.editEditTab === 'write') {
                state.editEditTab = 'preview';
                content.classList.add('preview-active');
                editPreviewToggle.classList.add('active');
                editPreviewToggle.title = '编辑';
                updateEditPreview();
            } else {
                state.editEditTab = 'write';
                content.classList.remove('preview-active');
                editPreviewToggle.classList.remove('active');
                editPreviewToggle.title = '预览';
            }
        });

        editTitleInput.addEventListener('input', () => {
            updateEditSaveState();
            if (state.editEditTab === 'preview') updateEditPreview();
        });

        editContentInput.addEventListener('input', () => {
            if (state.editEditTab === 'preview') updateEditPreview();
        });

        // Keyboard shortcuts: Ctrl+S save, Escape cancel
        document.addEventListener('keydown', (e) => {
            if (!state.isEditing) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveEdit();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    };
})();
