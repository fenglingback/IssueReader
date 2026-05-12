# IssueReader

This tool is able to view GitHub Issues. In fact, I use GitHub Issues to take notes, so I developed this tool using `Claude Sonnet 3.7` and `v0` to make it easier for myself to review my notes.

Here are the prompt I created and optimized:

```
我想要利用GitHub API做一个在线GitHub issue查看器，满足以下要求：

1. 首次访问需通过弹窗输入GitHub Token并验证有效性，成功后展示仓库下拉框并将Token与选定仓库分别保存至本地存储githubToken和bjRepo，后续每次访问时都要检测token，Token失效或不存在都自动触发该弹窗流程。
2. 设置成功后，通过api获取所有issue。
3. 获取issue成功后使用它：左边是侧边栏，展示所有的issue标题，标题展示区域可以竖直滚动，它的顶部有一个搜索框用于筛选标题，只匹配标题就好，搜索设置防抖500ms，点击标题就会使用marked.js在右边渲染body，初始默认渲染最新的issue，样式引用github css来与GitHub保持一致，不同的地方在于：链接在新标签页打开、使用viewer.js对图片进一步功能扩展、原生js实现代码块的复制功能，复制按钮不需要hover才显示。
4. 顶部的header：最左边有一个折叠按钮，桌面端的表现为显示/隐藏侧边栏，移动端的表现为侧边栏是否悬浮于渲染区上，并且在本地存储中记录折叠状态；中间显示当前issue的标题，并且在移动端横向滚动展示；最右边有一个svg按钮用于切换仓库，切换仓库不需要重新验证token。
5. 自动适配深色模式，css样式中不要使用hover属性。
6. 尽可能使用html5标签来创建更好的页面结构。

请你用 HTML5 + CSS3 + JavaScript(ES6+) 帮我生成一个这样的页面。
```