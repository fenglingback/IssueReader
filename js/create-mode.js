/**
 * 创建模式 —— 编辑器/预览/导入/发布
 */
(function () {
    const { state } = App;
    const {
        createMode, viewMode, titleInput, contentInput, editorPreview,
        previewToggle, editorWrite, editorPreviewPane,
        importDropdown, importLocalBtn, importUrlBtn,
        clearBtn, saveBtn, publishBtn,
        urlModal, urlInput, loadUrlBtn, cancelUrlBtn,
        publishRepoModal, publishRepoList, confirmPublishRepoBtn, cancelPublishRepoBtn,
        editBtn, headerActions,
    } = App.dom;

    function switchEditorTab(tab) {
        state.editorTab = tab;
        if (tab === 'write') {
            editorWrite.classList.add('active');
            editorPreviewPane.classList.remove('active');
            previewToggle.classList.remove('active');
            previewToggle.title = '预览';
        } else {
            editorPreviewPane.classList.add('active');
            editorWrite.classList.remove('active');
            previewToggle.classList.add('active');
            previewToggle.title = '编辑';
            updateEditorPreview();
        }
    }

    function updateEditorPreview() {
        App.renderMarkdown(contentInput.value || '*没有内容可预览*', editorPreview);
    }

    function saveEditorToLocalStorage() {
        const content = {
            title: titleInput.value,
            content: contentInput.value
        };
        localStorage.setItem('mdIssueContent', JSON.stringify(content));
    }

    App.loadEditorFromLocalStorage = function () {
        const savedContent = localStorage.getItem('mdIssueContent');
        if (savedContent) {
            try {
                const content = JSON.parse(savedContent);
                titleInput.value = content.title || '';
                contentInput.value = content.content || '';
                updateEditorPreview();
            } catch (e) {
                console.error('Failed to load saved content:', e);
            }
        }
    };

    App.switchEditorTab = switchEditorTab;

    App.initCreateModeEvents = function () {
        previewToggle.addEventListener('click', () => {
            switchEditorTab(state.editorTab === 'write' ? 'preview' : 'write');
        });

        contentInput.addEventListener('input', () => {
            if (state.editorTab === 'preview') updateEditorPreview();
            App.updatePublishState();
        });
        titleInput.addEventListener('input', () => {
            App.updatePublishState();
        });

        // Import dropdown toggle
        document.getElementById('importBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            importDropdown.classList.toggle('open');
        });

        importLocalBtn.addEventListener('click', () => {
            importDropdown.classList.remove('open');
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.md,text/markdown';

            fileInput.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = event => {
                    // [Bug #14] 原代码 file.name.replace('.md', '') 只替换单个且不要求结尾
                    // 改为只去除结尾的 .md 扩展名
                    titleInput.value = file.name.replace(/\.md$/i, '');
                    contentInput.value = event.target.result;
                    switchEditorTab('write');
                    saveEditorToLocalStorage();
                    // [Bug #2] 导入后刷新发布按钮状态
                    App.updatePublishState();
                };
                reader.readAsText(file);
            };

            fileInput.click();
        });

        importUrlBtn.addEventListener('click', () => {
            importDropdown.classList.remove('open');
            urlModal.classList.remove('hidden');
        });

        cancelUrlBtn.addEventListener('click', () => urlModal.classList.add('hidden'));

        loadUrlBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                App.showToast('请输入 URL', 'error');
                return;
            }

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP 错误: ${response.status}`);

                const mdContent = await response.text();
                contentInput.value = mdContent;
                switchEditorTab('write');
                saveEditorToLocalStorage();
                // [Bug #3] URL 导入后同样需要刷新发布按钮状态
                App.updatePublishState();
                urlModal.classList.add('hidden');
                urlInput.value = '';
                App.showToast('导入成功', 'success');
            } catch (error) {
                App.showToast('加载失败: ' + error.message, 'error');
            }
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('确定要清空编辑器吗？')) {
                titleInput.value = '';
                contentInput.value = '';
                updateEditorPreview();
                saveEditorToLocalStorage();
                publishBtn.disabled = true;
            }
        });

        saveBtn.addEventListener('click', () => {
            saveEditorToLocalStorage();
            if (titleInput.value || contentInput.value) {
                App.showToast('内容已保存', 'success');
            }
        });

        // Publish issue
        publishBtn.addEventListener('click', async () => {
            if (!titleInput.value.trim()) {
                App.showToast('请输入 Issue 标题', 'error');
                return;
            }
            if (!contentInput.value.trim()) {
                App.showToast('请输入 Issue 内容', 'error');
                return;
            }

            const token = localStorage.getItem('githubToken');
            if (!token) {
                App.showToast('请先设置 GitHub Token', 'error');
                App.showTokenModal();
                return;
            }

            publishRepoModal.classList.remove('hidden');
            confirmPublishRepoBtn.disabled = true;
            state.selectedPublishRepo = null;
            publishRepoList.innerHTML = '<div class="repo-list-item">加载中...</div>';

            await App.fetchAndRenderRepos(token, publishRepoList, { mode: 'list' });
        });

        confirmPublishRepoBtn.addEventListener('click', async () => {
            if (!state.selectedPublishRepo) return;

            const token = localStorage.getItem('githubToken');

            try {
                confirmPublishRepoBtn.disabled = true;
                confirmPublishRepoBtn.textContent = '发布中...';

                const response = await fetch(`https://api.github.com/repos/${state.selectedPublishRepo}/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: titleInput.value.trim(),
                        body: contentInput.value.trim()
                    })
                });

                if (!response.ok) throw new Error(`HTTP 错误: ${response.status}`);

                const issue = await response.json();
                publishRepoModal.classList.add('hidden');

                // [Bug #10] 原代码把链接 append 到 editorPreview.innerHTML
                // - 如果用户在 write tab 看不到
                // - innerHTML += 会重建 DOM，丢失 hljs/Viewer 状态
                // - [Bug #4] 修复后编辑器会被清空，链接也会一起丢
                // 改用 toast 展示可点击链接，展示时长 6s
                App.showToast(
                    `Issue 创建成功！ <a href="${issue.html_url}" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:underline;margin-left:6px;">查看 →</a>`,
                    'success',
                    { html: true, duration: 6000 }
                );

                // [Bug #4] 发布成功后清空编辑器 + 本地存储，避免重复发布
                titleInput.value = '';
                contentInput.value = '';
                editorPreview.innerHTML = '';
                localStorage.removeItem('mdIssueContent');
                App.updatePublishState();

                if (state.selectedPublishRepo === state.currentRepo) {
                    App.loadIssues(token, state.currentRepo);
                }
            } catch (error) {
                App.showToast('创建 Issue 失败: ' + error.message, 'error');
                console.error('Failed to create issue:', error);
            } finally {
                confirmPublishRepoBtn.disabled = false;
                confirmPublishRepoBtn.textContent = '发布';
            }
        });

        cancelPublishRepoBtn.addEventListener('click', () => {
            publishRepoModal.classList.add('hidden');
        });
    };
})();
