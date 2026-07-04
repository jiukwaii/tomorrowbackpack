# GitHub Pages 发布说明

## 先说明一个关键点

把项目 `commit` 到 GitHub 仓库，不等于网页已经上线。

你在 GitHub 仓库里点开 `index.html`，大多数时候看到的是源码页面，不是可以直接操作的网页。

如果你想要一个真正可点击、可分享的链接，还需要启用 `GitHub Pages`。

## 这个项目适合 GitHub Pages 吗

适合。

因为这个项目目前是纯静态网页，只包含：

- `index.html`
- `style.css`
- `app.js`

不需要后端，不需要数据库，也不需要额外打包。

## 正确的发布方式

### 情况 1：网页文件就在仓库根目录

如果你的仓库最外层直接就是：

- `index.html`
- `style.css`
- `app.js`

那你可以：

1. 打开 GitHub 仓库
2. 点击 `Settings`
3. 点击左侧 `Pages`
4. 在 `Build and deployment` 里设定：
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
5. 点击保存

等 1 到 3 分钟后，GitHub 会给你一个链接，格式通常像这样：

`https://你的用户名.github.io/仓库名/`

### 情况 2：网页文件在子资料夹里

如果你的仓库结构像这样：

```text
repo/
  tomorrowbackpack/
    index.html
    style.css
    app.js
```

那 GitHub Pages 不能直接把 `tomorrowbackpack/` 当网页根目录。

最简单的做法是二选一：

1. 把 `index.html`、`style.css`、`app.js` 移到仓库根目录
2. 单独为这个项目开一个新的仓库

## 这次我顺手加了什么

- `.nojekyll`

这个文件可以让 GitHub Pages 更直接地把你的静态文件原样发布，对这种纯前端小项目通常是有帮助的。

## 如果你现在打不开网页，最可能的原因

最常见不是 HTML 坏掉，而是下面其中一个原因：

1. 你只是把文件上传到 GitHub，但还没有开启 GitHub Pages
2. 你的 `index.html` 不在仓库根目录
3. GitHub Pages 刚开启，还在等待发布
4. 你打开的是 GitHub 上的源码页面，不是 Pages 链接
