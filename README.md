# StreamNest Web · 纯静态前端

一个**零构建、零数据库、零后端依赖**的 HLS 视频库前端：列表页直接
`fetch /media/manifest.json` 渲染，播放页用 hls.js（Safari/iOS 走原生 HLS）。

这个目录是**纯代码**，不含任何视频、切片、封面或密钥。服务器上前端放在
`/srv/streamnest/site/`，视频数据放在独立的 `/srv/streamnest/media/`，
Nginx 把 `/media/` 用 `alias` 指过去 —— 两边物理分离，互不干扰，
因此本目录可以安全地单独上传到 GitHub。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 列表页：卡片、搜索、视频计数 |
| `player.html` | 播放页：按 `?v=<base>` 从清单取条目，hls.js 本地副本 → 公共 CDN 两级回退 |
| `app.js` | 读取清单、渲染、搜索；所有外部文本用 `textContent` 写入，防 XSS |
| `style.css` | 样式（深色、响应式） |
| `sample.manifest.json` | 本地预览用的示例清单，不是运行时数据 |

`hls.min.js` 由部署脚本下载到站点目录，按 `.gitignore` 排除，不属于本仓库源码。

## 数据契约

唯一的数据来源是 `/media/manifest.json` —— 由转码器 `publish.append_manifest()`
在每完成一个视频后写入的 JSON 数组。每条记录：

| 字段 | 说明 |
|---|---|
| `base` | 视频唯一标识（文件名清洗后的 slug），播放页靠它定位 |
| `title` / `description` | 标题与简介 |
| `duration` | 秒，列表页显示时长 |
| `video_url` / `master` | m3u8 播放地址，如 `/media/<base>/index.m3u8` |
| `poster` / `thumbnail` | 封面图地址 |
| `vtt` | 雪碧图时间轴（可选） |
| `source_file` | 原始文件名，仅作展示 |
| `converted_at` | ISO 时间，列表按它倒序 |

清单缺失或为空数组都属正常（还没转过视频），页面会显示空状态。

## 本地预览

```bash
cd site
mkdir -p media
cp sample.manifest.json media/manifest.json
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000/
```

示例条目没有真实视频和封面，列表能正常渲染、点击会进播放页并提示播放失败，
用于验证页面与样式。把 `media/` 换成真实转码产物即可完整播放。

## 部署到服务器

本仓库根目录的 `deploy/install.sh` 会把本目录的 4 个文件复制到
`/srv/streamnest/site/`，并配好 Nginx（`/media/` → `/srv/streamnest/media/`）。
完整部署步骤见 `deploy/README.md`。

前端更新有两种方式：

```bash
# A. 服务器上直接拉取本仓库（推荐长期维护）
cd /srv/streamnest/site && sudo -u streamnest git pull

# B. 重新跑部署脚本（会覆盖 4 个前端文件，不动媒体目录）
cd ~/StreamNest/deploy && sudo ./install.sh
```

## 上传 GitHub

本目录不含任何媒体文件、IP、密钥或本地配置，可以直接公开。

**方式一：整个 StreamNest 主仓库一起推**（`site/` 自然包含在内）

```bash
cd StreamNest
git remote add origin https://github.com/<you>/StreamNest.git   # 已配则跳过
git push -u origin main
```

**方式二：只把前端源码做成独立仓库**

`site/` 在主仓库里是普通目录，直接在这里 `git init` 会产生嵌套仓库，
所以先复制出去再初始化：

```bash
cp -r StreamNest/site ~/streamnest-web
cd ~/streamnest-web
git init -b main
git add .
git commit -m "feat: StreamNest 纯静态前端"
gh repo create streamnest-web --public --source=. --push
# 私有仓库把 --public 换成 --private
```

之后在本目录改完代码 `git push` 即可；服务器侧 `git pull` 同步。
