/**
 * 查看模式 —— 加载/渲染/搜索 Issue 列表
 */
(function () {
    const { state, GH_CDN, DEBOUNCE_DELAY, COPY_ICON, COPIED_ICON } = App;
    const {
        loading, markdownContent, issueList, searchInput, headerTitle,
        sidebar, sidebarToggle, editBtn, tokenError,
    } = App.dom;

    // ==================== View Mode: Issue List ====================
    App.loadIssues = async function (token, repo) {
        loading.style.display = 'flex';
        markdownContent.style.display = 'none';
        markdownContent.innerHTML = '';
        issueList.innerHTML = '';
        headerTitle.textContent = `加载 ${repo} 的 issues...`;

        try {
            state.issues = [];
            let page = 1;
            while (true) {
                const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&sort=updated&per_page=100&page=${page}`, {
                    headers: { 'Authorization': `token ${token}` }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        localStorage.removeItem('githubToken');
                        localStorage.removeItem('bjRepo');
                        App.showTokenModal();
                        tokenError.textContent = 'Token 已失效，请重新输入';
                        return;
                    }
                    throw new Error('获取 issues 失败');
                }

                const data = await response.json();
                state.issues.push(...data);
                if (data.length < 100) break;
                page++;
            }

            if (state.issues.length === 0) {
                issueList.innerHTML = '<li style="padding: 15px; text-align: center;">没有 issues</li>';
                markdownContent.innerHTML = '<p>这个仓库没有 issues。</p>';
                markdownContent.style.display = 'block';
                loading.style.display = 'none';
                headerTitle.textContent = repo;
                return;
            }

            renderIssueList();

            state.currentIssue = state.issues[0];
            const firstItem = issueList.querySelector('.sidebar-item');
            App.renderIssue(state.currentIssue);
            highlightCurrentIssue(firstItem);
            headerTitle.textContent = state.currentIssue.title;
            headerTitle.href = state.currentIssue.html_url;
        } catch (error) {
            console.error('加载 issues 失败:', error);
            issueList.innerHTML = `<li style="padding: 15px; text-align: center; color: var(--danger-color);">加载 issues 失败</li>`;
            loading.style.display = 'none';
            headerTitle.textContent = '加载失败';
        }
    };

    function renderIssueList() {
        searchInput.setAttribute('placeholder', `在 ${state.issues.length} 个 issues 中搜索...`);

        const fragment = document.createDocumentFragment();

        state.issues.forEach(issue => {
            const li = document.createElement('li');
            li.className = 'sidebar-item';
            li.dataset.id = issue.id;

            const titleDiv = document.createElement('div');
            titleDiv.className = 'sidebar-item-title';
            titleDiv.textContent = issue.title;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'sidebar-item-meta';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = issue.labels.map(label => label.name).join(' | ');

            const dateSpan = document.createElement('span');
            dateSpan.textContent = new Date(issue.updated_at).toLocaleDateString();

            metaDiv.appendChild(labelSpan);
            metaDiv.appendChild(dateSpan);
            li.appendChild(titleDiv);
            li.appendChild(metaDiv);
            fragment.appendChild(li);
        });

        const noMatches = document.createElement('li');
        noMatches.id = 'noMatches';
        noMatches.style.display = 'none';
        noMatches.style.padding = '15px';
        noMatches.style.textAlign = 'center';
        noMatches.textContent = '没有匹配的 issues';
        fragment.appendChild(noMatches);

        issueList.appendChild(fragment);
    }

    function replaceGithubImageLinks(md) {
        return md.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
            if (url.startsWith('https://github.com/') && url.endsWith('?raw=true')) {
                url = url.replace('?raw=true', '');
                url = url.replace('/blob/', '/');
                url = url.replace('https://github.com/', `https://${GH_CDN}/https://raw.githubusercontent.com/`);
            } else if (url.startsWith('https://raw.githubusercontent.com/')) {
                url = url.replace('https://raw.githubusercontent.com/', `https://${GH_CDN}/https://raw.githubusercontent.com/`);
            }
            return `![${alt}](${url})`;
        });
    }

    App.renderIssue = function (issue) {
        if (state.isEditing) return;

        loading.style.display = 'flex';
        markdownContent.style.display = 'none';

        editBtn.classList.add('visible');

        let newBody = replaceGithubImageLinks(issue.body || '');
        newBody += `\n<p style="text-align: center; font-size: 12px; font-style: italic; color: #999; margin: 30px 0 0;">Created at ${new Date(issue.created_at).toLocaleDateString()}</p>`;

        App.renderMarkdown(newBody || '*没有内容*', markdownContent);

        if (state.imageViewer) state.imageViewer.destroy();

        const images = markdownContent.querySelectorAll('img');
        images.forEach(img => { img.loading = 'lazy'; });

        if (images.length > 0) {
            const options = {
                navbar: false,
                title: false,
                toolbar: {
                    zoomIn: true, zoomOut: true, oneToOne: true, reset: true,
                    prev: images.length > 1, next: images.length > 1,
                    rotateLeft: true, rotateRight: true,
                    flipHorizontal: true, flipVertical: true,
                },
                backdrop: true,
                transition: true,
            };
            state.imageViewer = new Viewer(markdownContent, options);
        }

        const pres = markdownContent.querySelectorAll('pre');
        pres.forEach(item => {
            const copybtn = document.createElement('span');
            copybtn.innerHTML = COPY_ICON;
            copybtn.className = 'copybtn';
            item.appendChild(copybtn);
        });

        markdownContent.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        loading.style.display = 'none';
        markdownContent.style.display = 'block';
    };

    function highlightCurrentIssue(newItemEl) {
        if (state.activeItemEl) state.activeItemEl.classList.remove('active');
        if (newItemEl) newItemEl.classList.add('active');
        state.activeItemEl = newItemEl;
    }

    function searchIssues(query) {
        const lowerQuery = query.toLowerCase();
        const matchedIds = new Set(
            state.issues.filter(issue => issue.title.toLowerCase().includes(lowerQuery)).map(issue => issue.id)
        );

        const items = issueList.querySelectorAll('.sidebar-item');
        items.forEach(item => {
            const issueId = parseInt(item.dataset.id);
            item.style.display = matchedIds.has(issueId) ? '' : 'none';
        });

        document.getElementById('noMatches').style.display = matchedIds.size === 0 && query ? 'block' : 'none';
    }

    App.initViewModeEvents = function () {
        // Copy button event delegation
        markdownContent.addEventListener('click', (e) => {
            const copybtn = e.target.closest('.copybtn');
            if (!copybtn) return;
            const pre = copybtn.closest('pre');
            if (!pre) return;
            const text = pre.firstElementChild?.innerText?.trim();
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                copybtn.innerHTML = COPIED_ICON;
                setTimeout(() => { copybtn.innerHTML = COPY_ICON; }, 2000);
            });
        });

        // Issue list click (event delegation)
        issueList.addEventListener('click', (e) => {
            const li = e.target.closest('.sidebar-item');
            if (!li) return;

            const issueId = parseInt(li.dataset.id);
            const issue = state.issues.find(i => i.id === issueId);
            if (!issue) return;

            if (state.isEditing) {
                if (App.isEditDirty()) {
                    if (!confirm('有未保存的修改，确定要放弃吗？')) return;
                }
                App.exitEditMode();
            }

            state.currentIssue = issue;
            App.renderIssue(issue);
            highlightCurrentIssue(li);
            headerTitle.textContent = issue.title;
            headerTitle.href = issue.html_url;

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('visible');
                sidebarToggle.classList.remove('active');
            }
        });

        searchInput.addEventListener('input', () => {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => {
                searchIssues(searchInput.value.trim());
            }, DEBOUNCE_DELAY);
        });

        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('visible');
                sidebarToggle.classList.toggle('active');
            } else {
                state.sidebarCollapsed = !state.sidebarCollapsed;
                sidebar.classList.toggle('collapsed');
                sidebarToggle.classList.toggle('active');
                localStorage.setItem('sidebarCollapsed', state.sidebarCollapsed);
            }
        });
    };
})();
