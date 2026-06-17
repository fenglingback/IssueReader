/**
 * 工具函数 —— Toast / Markdown 渲染（含 Mermaid 图表） / 发布状态
 */
(function () {
    const { state } = App;
    const { toast, publishBtn, titleInput, contentInput } = App.dom;

    // ==================== Toast ====================
    /**
     * 显示 Toast 通知
     * @param {string} message - 文本或 HTML（需配合 html:true）
     * @param {string} [type] - '' | 'success' | 'error'
     * @param {{html?: boolean, duration?: number}} [opts]
     *      - html: 是否按 HTML 渲染（用于含 <a> 等元素的提示）
     *      - duration: 显示时长（毫秒），默认 3000
     */
    App.showToast = function (message, type = '', { html = false, duration = 3000 } = {}) {
        if (html) {
            toast.innerHTML = message;
        } else {
            toast.textContent = message;
        }
        toast.className = 'toast' + (type ? ` ${type}` : '');
        toast.classList.add('show');
        clearTimeout(App._toastTimer);
        App._toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            // 收起后清空内容，避免含 <a> 的旧提示残留在 DOM 里被误点
            setTimeout(() => {
                if (!toast.classList.contains('show')) {
                    toast.innerHTML = '';
                    toast.textContent = '';
                }
            }, 400);
        }, duration);
    };

    // ==================== [J2+J3+D3] 统一 Markdown 渲染 ====================
    /**
     * 统一 Markdown 渲染：parse → sanitize → 外链处理 → Mermaid 图表渲染
     *
     * Mermaid 集成流程：
     * 1. marked 将 ```mermaid 代码块渲染为 <pre><code class="language-mermaid">
     * 2. DOMPurify 保留这些元素（pre/code/class 均在白名单内）
     * 3. 同步阶段：将 <pre><code class="language-mermaid"> 转换为 <div class="mermaid">
     *    （确保后续的 copy-btn / hljs 不会误处理 mermaid 代码块）
     * 4. 异步阶段：调用 mermaid.run() 将 .mermaid 容器渲染为 SVG 图表
     *
     * @param {string} text - Markdown 原始文本
     * @param {HTMLElement} container - 目标容器
     */
    App.renderMarkdown = function (text, container) {
        const rawHtml = marked.parse(text || '*没有内容*');
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        container.innerHTML = cleanHtml;

        // 统一外链 target=_blank 处理
        container.querySelectorAll('a').forEach(link => {
            if (!link.getAttribute('href')?.startsWith('#')) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

        // ---- Mermaid 图表处理 ----
        // 同步：将 mermaid 代码块转为 mermaid 容器（在 copy-btn / hljs 之前完成）
        const mermaidCodeBlocks = container.querySelectorAll('code.language-mermaid');
        if (mermaidCodeBlocks.length > 0) {
            mermaidCodeBlocks.forEach(codeEl => {
                const pre = codeEl.parentElement;
                if (!pre || pre.tagName !== 'PRE') return;

                const div = document.createElement('div');
                div.className = 'mermaid';
                // textContent 返回已反转义的纯文本，正是 mermaid 需要的原始定义
                div.textContent = codeEl.textContent;
                pre.replaceWith(div);
            });

            // 异步：调用 mermaid.run() 渲染 SVG
            if (typeof mermaid !== 'undefined') {
                const mermaidNodes = container.querySelectorAll('.mermaid');
                mermaid.run({ nodes: mermaidNodes })
                    .catch(err => {
                        console.warn('[Mermaid] 图表渲染失败:', err);
                        // 渲染失败时，在失败的容器上标记错误样式
                        container.querySelectorAll('.mermaid:not([data-processed])').forEach(el => {
                            el.classList.add('mermaid-error');
                        });
                    });
            }
        }
    };

    // ==================== [J4] 统一发布按钮状态 ====================
    App.updatePublishState = function () {
        publishBtn.disabled = !(titleInput.value.trim() && contentInput.value.trim() && localStorage.getItem('githubToken'));
    };
})();
