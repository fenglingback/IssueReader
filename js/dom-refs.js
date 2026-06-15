/**
 * DOM 元素引用缓存 —— 所有 getElementById 集中在此
 */
(function () {
    const $ = id => document.getElementById(id);

    App.dom = {
        // Header
        sidebarToggle: $('sidebarToggle'),
        headerTitle: $('headerTitle'),
        menuDropdown: $('menuDropdown'),
        menuBtn: $('menuBtn'),
        headerActions: $('headerActions'),
        menuView: $('menuView'),
        menuCreate: $('menuCreate'),
        menuSwitchRepo: $('menuSwitchRepo'),

        // View Mode
        viewMode: $('viewMode'),
        sidebar: $('sidebar'),
        issueList: $('issueList'),
        searchInput: $('searchInput'),
        content: $('content'),
        loading: $('loading'),
        markdownContent: $('markdownContent'),

        // Inline Edit Mode
        editBtn: $('editBtn'),
        contentEditToolbar: $('contentEditToolbar'),
        editTitleInput: $('editTitleInput'),
        editPreviewToggle: $('editPreviewToggle'),
        editSaveBtn: $('editSaveBtn'),
        editCancelBtn: $('editCancelBtn'),
        contentEditBody: $('contentEditBody'),
        editContentInput: $('editContentInput'),
        contentEditPreview: $('contentEditPreview'),
        editPreviewContent: $('editPreviewContent'),

        // Create Mode
        createMode: $('createMode'),
        titleInput: $('titleInput'),
        contentInput: $('contentInput'),
        editorPreview: $('editorPreview'),
        previewToggle: $('previewToggle'),
        editorWrite: $('editorWrite'),
        editorPreviewPane: $('editorPreviewPane'),
        importDropdown: $('importDropdown'),
        importLocalBtn: $('importLocalBtn'),
        importUrlBtn: $('importUrlBtn'),
        clearBtn: $('clearBtn'),
        saveBtn: $('saveBtn'),
        publishBtn: $('publishBtn'),

        // Token Modal
        tokenModal: $('tokenModal'),
        githubTokenInput: $('githubToken'),
        repoSelect: $('repoSelect'),
        verifyTokenBtn: $('verifyTokenBtn'),
        saveTokenBtn: $('saveTokenBtn'),
        cancelTokenBtn: $('cancelTokenBtn'),
        tokenError: $('tokenError'),
        repoError: $('repoError'),

        // Repo Switch Modal
        repoSwitchModal: $('repoSwitchModal'),
        newRepoSelect: $('newRepoSelect'),
        saveSwitchBtn: $('saveSwitchBtn'),
        cancelSwitchBtn: $('cancelSwitchBtn'),
        newRepoError: $('newRepoError'),

        // URL Import Modal
        urlModal: $('urlModal'),
        urlInput: $('urlInput'),
        loadUrlBtn: $('loadUrlBtn'),
        cancelUrlBtn: $('cancelUrlBtn'),

        // Publish Repo Modal
        publishRepoModal: $('publishRepoModal'),
        publishRepoList: $('publishRepoList'),
        confirmPublishRepoBtn: $('confirmPublishRepoBtn'),
        cancelPublishRepoBtn: $('cancelPublishRepoBtn'),

        // Toast
        toast: $('toast'),
    };
})();
