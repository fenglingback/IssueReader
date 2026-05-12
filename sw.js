/**
 * Service Worker - CDN 资源离线缓存
 * 策略：Cache First（缓存优先），二次加载零网络延迟
 *
 * 需要缓存的 CDN 资源列表：
 * - marked.js      : Markdown 解析
 * - highlight.js   : 代码高亮
 * - viewer.js      : 图片查看器
 * - DOMPurify      : XSS 防护
 * - github-markdown-css : Markdown 样式
 * - viewer.min.css      : 图片查看器样式
 * - monokai-sublime.min.css : 代码高亮主题
 */

// 缓存版本号 —— 更新资源时递增此版本号即可强制刷新缓存
const CACHE_VERSION = 'v1';

// 缓存名称
const CACHE_NAME = `cdn-offline-${CACHE_VERSION}`;

// 需要预缓存的 CDN 资源 URL 列表
const PRECACHE_URLS = [
    // CSS 资源
    'https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.min.css',
    'https://cdn.jsdelivr.net/npm/viewerjs/dist/viewer.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/monokai-sublime.min.css',
    // JS 资源
    'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
    'https://cdn.jsdelivr.net/npm/viewerjs/dist/viewer.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
];

// CDN 域名白名单 —— 仅对来自这些域名的请求启用缓存优先策略
const CDN_HOSTS = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
];

/**
 * install 事件 —— Service Worker 安装时预缓存所有 CDN 资源
 * 使用 waitUntil 确保安装阶段完成所有缓存写入后才激活
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] 预缓存 CDN 资源...');
            // 使用 allSettled 避免单个资源失败导致全部回滚
            // 某些 CDN 可能因 CORS 限制无法缓存，不应阻塞安装
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
                // 立即激活新的 Service Worker，不等待旧页面关闭
                return self.skipWaiting();
            });
        })
    );
});

/**
 * activate 事件 —— 清理旧版本缓存，确保客户端立即受控
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
            // 立即接管所有页面，无需刷新
            return self.clients.claim();
        })
    );
});

/**
 * fetch 事件 —— 拦截请求，对 CDN 资源实施缓存优先策略
 *
 * 策略说明：
 * 1. CDN 资源（CDN_HOSTS 匹配）→ Cache First
 *    - 缓存命中 → 直接返回（零延迟）
 *    - 缓存未命中 → 网络请求 → 缓存后返回
 *
 * 2. 非 CDN 资源 → 不拦截，走浏览器默认行为
 *    （GitHub API 等动态请求不应被缓存）
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 仅处理 GET 请求（CDN 资源都是 GET）
    if (request.method !== 'GET') return;

    // 仅处理 CDN 域名的请求
    const isCdnRequest = CDN_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith('.' + host));
    if (!isCdnRequest) return;

    // Cache First 策略
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // 缓存命中：直接返回，零网络延迟
                return cachedResponse;
            }

            // 缓存未命中：从网络获取
            return fetch(request).then((networkResponse) => {
                // 仅缓存成功的响应
                if (networkResponse.ok) {
                    // 克隆响应后存入缓存（响应只能消费一次）
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch((err) => {
                // 网络不可用且缓存也没有 → 返回离线提示
                console.warn(`[SW] 资源不可用: ${request.url}`, err.message);

                // 对 CSS 请求返回空样式，避免页面布局崩溃
                if (request.destination === 'style') {
                    return new Response('/* 离线模式：CSS 资源未缓存 */', {
                        headers: { 'Content-Type': 'text/css' },
                    });
                }

                // 对 JS 请求返回空脚本，避免 JS 错误阻塞
                if (request.destination === 'script') {
                    return new Response('// 离线模式：JS 资源未缓存', {
                        headers: { 'Content-Type': 'application/javascript' },
                    });
                }

                return new Response('', { status: 503, statusText: 'Offline' });
            });
        })
    );
});

/**
 * message 事件 —— 支持从页面手动触发缓存更新
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
            });
        });
    }
});
