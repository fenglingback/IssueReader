/**
 * 主入口 —— 初始化 marked.js，注册所有事件，启动应用，注册 Service Worker
 */
(function () {
    // 初始化 marked.js
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    // 注册所有模块事件
    App.initAuthEvents();
    App.initRepoSwitchEvents();
    App.initViewModeEvents();
    App.initEditModeEvents();
    App.initCreateModeEvents();
    App.initModeSwitchEvents();

    // ==================== Initialize ====================
    App.loadEditorFromLocalStorage();
    App.checkAuth();
    App.updatePublishState();

    // ==================== Service Worker 注册 ====================
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then((registration) => {
            console.log('[App] Service Worker 注册成功，scope:', registration.scope);

            // 监听 SW 更新：新的 SW 激活后提示用户
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        // 新 SW 已激活，静默刷新缓存
                        console.log('[App] 新版 Service Worker 已激活');
                    }
                });
            });

            // 每小时检查一次 SW 更新（浏览器自身也会在导航时检查，这里加速一下）
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000);
        }).catch((err) => {
            console.warn('[App] Service Worker 注册失败:', err);
        });

        // 监听 SW 发来的缓存更新通知
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'CACHE_UPDATED') {
                console.log('[App] 缓存已更新，下次刷新将使用最新版本');
            }
        });
    }
})();
