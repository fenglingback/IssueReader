/**
 * 共享状态 —— 所有模块通过 window.App.state 读写
 */
window.App = window.App || {};

window.App.state = {
    issues: [],
    currentRepo: '',
    currentIssue: null,
    debounceTimer: null,
    sidebarCollapsed: false,
    imageViewer: null,
    activeItemEl: null,
    selectedPublishRepo: null,
    currentMode: 'view', // 'view' | 'create'

    // Inline edit state
    isEditing: false,
    editEditTab: 'write', // 'write' | 'preview'
    editOriginalTitle: '',
    editOriginalBody: '',

    // Create mode state
    editorTab: 'write',
};

window.App.GH_CDN = 'gh-proxy.com';
window.App.DEBOUNCE_DELAY = 300;

window.App.COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path fill="none" d="M0 0h24v24H0z"></path><path d="M7 4V2H17V4H20.0066C20.5552 4 21 4.44495 21 4.9934V21.0066C21 21.5552 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5551 3 21.0066V4.9934C3 4.44476 3.44495 4 3.9934 4H7ZM7 6H5V20H19V6H17V8H7V6ZM9 4V6H15V4H9Z"></path></svg>`;
window.App.COPIED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path fill="none" d="M0 0h24v24H0z"></path><path d="M6 4V8H18V4H20.0066C20.5552 4 21 4.44495 21 4.9934V21.0066C21 21.5552 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5551 3 21.0066V4.9934C3 4.44476 3.44495 4 3.9934 4H6ZM8 2H16V6H8V2Z"></path></svg>`;
