/**
 * Service Worker - CDN + 本地资源离线缓存
 * 策略：Stale-While-Revalidate（先返回缓存，后台静默更新）
 *
 * 核心思路：
 * - 请求命中缓存 → 立即返回旧版本，同时在后台发起网络请求更新缓存
 * - 请求未命中缓存 → 等待网络响应返回并缓存
 * - 下次刷新时用户自然拿到最新版本
 * - 彻底移除手动版本号，部署新代码后用户自动获取更新
 *
 * 缓存覆盖范围：
 * - CDN 外部库：marked.js / highlight.js / viewer.js / DOMPurify / github-markdown-css / mermaid.js 等
 * - 本地 CSS：variables / base / header / sidebar / content / markdown / create-mode / modal / responsive
 * - 本地 JS：state / dom-refs / utils / auth / view-mode / edit-mode / create-mode / mode-switch / main
 */

// 固定缓存名称 —— 不再包含版本号，永不需要手动递增
const CACHE_NAME = 'cdn-offline';

// 需要预缓存的 CDN 资源 URL 列表
const PRECACHE_URLS = [
    // CDN CSS 资源
    'https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.min.css',
    'https://cdn.jsdelivr.net/npm/viewerjs/dist/viewer.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/monokai-sublime.min.css',
    // CDN JS 资源
    'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
    'https://cdn.jsdelivr.net/npm/viewerjs/dist/viewer.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js',
    // 本地 CSS 资源
    'css/variables.css',
    'css/base.css',
    'css/header.css',
    'css/sidebar.css',
    'css/content.css',
    'css/markdown.css',
    'css/create-mode.css',
    'css/modal.css',
    'css/responsive.css',
    // 本地 JS 资源
    'js/state.js',
    'js/dom-refs.js',
    'js/utils.js',
    'js/auth.js',
    'js/view-mode.js',
    'js/edit-mode.js',
    'js/create-mode.js',
    'js/mode-switch.js',
    'js/main.js',
];

// CDN 域名白名单
const CDN_HOSTS = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
];

// 本地资源路径前缀（同源请求的 pathname 前缀）
const LOCAL_PREFIXES = ['/css/', '/js/'];

/**
 * install 事件 —— Service Worker 安装时预缓存所有资源
 *
 * 与旧版区别：
 * - 预缓存写入固定 CACHE_NAME，不再每次新建缓存
 * - 使用 allSettled 保证单个资源失败不影响整体
 * - skipWaiting 让新 SW 立即激活
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] 预缓存 CDN + 本地资源...');
            return Promise.allSettled(
                PRECACHE_URLS.map((url) =>
                    fetch(url, { mode: 'cors' })
                        .then((response) => {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                            console.warn(`[SW] 预缓存失败 (HTTP ${response.status}): ${url}`);
                        })
                        .catch((err) => {
                            console.warn(`[SW] 预缓存失败: ${url}`, err.message);
                        })
                )
            ).then(() => {
                console.log('[SW] 预缓存完成，立即激活');
                return self.skipWaiting();
            });
        })
    );
});

/**
 * activate 事件 —— 清理旧版本缓存，确保客户端立即受控
 *
 * 兼容迁移：会自动删除旧的 cdn-offline-v1/v2/... 等带版本号的缓存
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log(`[SW] 删除旧缓存: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] 已激活，控制所有客户端');
            return self.clients.claim();
        })
    );
});

/**
 * fetch 事件 —— Stale-While-Revalidate 策略
 *
 * 工作流程：
 * 1. 收到请求 → 查缓存
 * 2. 缓存命中 → 立即返回（用户秒开），同时后台 fetch 更新缓存
 * 3. 缓存未命中 → 等网络响应，写入缓存后返回
 * 4. 网络也失败 → 返回离线兜底响应
 *
 * 效果：
 * - 首次访问：正常网络加载 + 缓存
 * - 二次访问：缓存秒开，后台静默更新
 * - 部署新版本后：用户首次刷新看到旧版，后台拉取新版，再次刷新即用新版
 * - 完全离线：使用最后一次成功缓存的版本
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 仅处理 GET 请求
    if (request.method !== 'GET') return;

    // 判断是否需要缓存：CDN 域名 或 本地 css/js 路径
    const isCdnRequest = CDN_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith('.' + host));
    const isLocalAsset = url.origin === self.location.origin &&
        LOCAL_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

    if (!isCdnRequest && !isLocalAsset) return;

    // Stale-While-Revalidate 策略
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(request).then((cachedResponse) => {
                // 后台静默更新：无论缓存是否命中，都发起网络请求更新缓存
                const fetchPromise = fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse.ok) {
                            // 用响应副本更新缓存，原响应返回给浏览器
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // 网络失败时静默忽略，不影响已返回的缓存响应
                        return null;
                    });

                if (cachedResponse) {
                    // 有缓存 → 立即返回，后台继续更新（用户零等待）
                    return cachedResponse;
                }

                // 无缓存 → 等待网络响应
                return fetchPromise.then((networkResponse) => {
                    if (networkResponse) {
                        return networkResponse;
                    }

                    // 网络也失败了，返回离线兜底
                    if (request.destination === 'style') {
                        return new Response('/* 离线模式：CSS 资源未缓存 */', {
                            headers: { 'Content-Type': 'text/css' },
                        });
                    }
                    if (request.destination === 'script') {
                        return new Response('// 离线模式：JS 资源未缓存', {
                            headers: { 'Content-Type': 'application/javascript' },
                        });
                    }
                    return new Response('', { status: 503, statusText: 'Offline' });
                });
            });
        })
    );
});

/**
 * message 事件 —— 支持从页面手动触发缓存全量更新
 * 用法：navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_CACHE' })
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'UPDATE_CACHE') {
        console.log('[SW] 收到缓存更新请求，重新预缓存...');
        caches.open(CACHE_NAME).then((cache) => {
            Promise.allSettled(
                PRECACHE_URLS.map((url) =>
                    fetch(url, { mode: 'cors' })
                        .then((response) => {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                        })
                        .catch(() => {})
                )
            ).then(() => {
                console.log('[SW] 缓存更新完成');
                // 通知所有客户端缓存已更新
                self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({ type: 'CACHE_UPDATED' });
                    });
                });
            });
        });
    }
});
