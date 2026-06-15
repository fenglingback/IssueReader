/**
 * 工具函数 —— Toast / Markdown 渲染 / 发布状态
 */
(function () {
    const { state } = App;
    const { toast, publishBtn, titleInput, contentInput } = App.dom;

    // ==================== Toast ====================
    App.showToast = function (message, type = '') {
        toast.textContent = message;
        toast.className = 'toast' + (type ? ` ${type}` : '');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    };

    // ==================== [J2+J3+D3] 统一 Markdown 渲染 ====================
    /**
     * 统一 Markdown 渲染：parse → sanitize → 外链处理
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
    };

    // ==================== [J4] 统一发布按钮状态 ====================
    App.updatePublishState = function () {
        publishBtn.disabled = !(titleInput.value.trim() && contentInput.value.trim() && localStorage.getItem('githubToken'));
    };
})();
