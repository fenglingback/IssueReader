# IssueReader

This tool is able to view GitHub Issues. In fact, I use GitHub Issues to take notes, so I developed this tool using `Claude Sonnet 3.7` to make it easier for myself to review my notes.

Here are the prompt I created and optimized:

```
我想要利用GitHub API做一个在线GitHub issue查看器，满足以下要求：

1. 首次进入需要弹出窗口输入GitHub token，点击验证按钮通过api验证token有效后出现展示所有repo的下拉框，点击保存后分别存放到本地存储中的githubToken和bjRepo，然后关闭窗口。并且之后每次进入网页都需要先检查GitHub token是否存在且有效，否则就弹出这个窗口。
2. 设置成功后，通过api获取所有issue。
3. 获取issue成功后使用它：左边展示所有的issue标题，标题展示区域可以竖直滚动，它的顶部有一个搜索框用于筛选标题，只匹配标题就好，搜索设置防抖500ms，点击标题就会使用marked.js在右边渲染body，初始默认渲染最新的issue，样式引用github css来与GitHub保持一致，不同的地方在于链接在新标签页打开、图片点击后放大查看，可以使用第三方库。
4. 顶部的header：最左边有一个折叠按钮，桌面端的表现为显示/隐藏标题展示区，移动端的表现为标题展示区是否悬浮于渲染区上，并且在本地存储中记录折叠状态；中间显示当前issue的标题；最右边有一个svg按钮用于切换仓库，切换仓库不需要重新验证token。
5. 自动适配深色模式。

请你用html、css、js帮我生成一个这样的页面。
```