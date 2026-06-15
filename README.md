# 2026 World Cup Predictor · 2026 世界杯预测器

> **Forked from [gmliangjz/WorldCup2026-Predictor](https://github.com/gmliangjz/WorldCup2026-Predictor)** by [jizhengliang](https://github.com/gmliangjz).
>
> This fork adds a lightweight **Node.js + MySQL** backend for cross-device prediction sync and a **Stadium Scoreboard** visual redesign. Runs on the cheapest cloud servers.

---

## English

### What This Is

Predict the 2026 FIFA World Cup. 48 teams, 528 real players, group stage through final. Fill in scores yourself or let the engine randomize. At the end you get a champagne-gold share poster with a scannable QR code.

Works as a single HTML file with no dependencies. Optionally connect a MySQL backend and your predictions follow you across devices.

### Deploy to a Lightweight Cloud Server

You just got a fresh Linux server. You have an SSH port for login and a free domain. No public IP. Cloud providers do this because IPv4 addresses ran out long ago. The good news: you can map that free domain to any port on your server, and your provider handles the rest.

This guide walks you through setting up the app and mapping the domain. It was tested on a server with Ubuntu 22.04, 4 GB RAM, 20 GB disk, and a free domain mapped to port 8848. Takes about 15 minutes.

#### Step 1 — SSH into your server

```bash
ssh -p <your-ssh-port> root@<your-server-ip>
```

#### Step 2 — Check what's already installed

```bash
cat /etc/os-release | head -3     # confirm it's Ubuntu/Debian
which node && node -v || echo "no Node.js"
which mysql && mysql --version || echo "no MySQL"
```

Fresh servers show "no Node.js" and "no MySQL". We'll install both.

#### Step 3 — Install Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install nodejs -y
node -v    # should print v20.x.x
```

#### Step 4 — Install MySQL 8.0

```bash
apt update -qq
apt install mysql-server -y
systemctl is-active mysql    # should print "active"
mysql --version              # should print 8.0.x
```

#### Step 5 — Create the database and user

```bash
mysql -e "
  CREATE DATABASE IF NOT EXISTS wc26_predictor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'wc26'@'localhost' IDENTIFIED BY 'wc26pass';
  GRANT ALL PRIVILEGES ON wc26_predictor.* TO 'wc26'@'localhost';
  FLUSH PRIVILEGES;
"
```

> Change `wc26pass` to your own password if you like. If you do, remember to update the env var in Step 8.

#### Step 6 — Clone the project and create the table

```bash
git clone https://github.com/FrRay/WorldCup2026-Predictor.git /home/WorldCup2026-Predictor
cd /home/WorldCup2026-Predictor
mysql wc26_predictor < server/init.sql
mysql wc26_predictor -e "DESCRIBE predictions;"   # verify the table exists
```

#### Step 7 — Install Node.js dependencies

```bash
cd /home/WorldCup2026-Predictor/server
npm install
```

If `npm install` hangs or fails with `ECONNREFUSED` on a proxy port, there may be a stale npm proxy config. Check and clear it:

```bash
npm config list | grep proxy    # see if proxy is set
npm config delete proxy         # remove it if so
npm config delete https-proxy
npm install                     # try again
```

#### Step 8 — Find your port

Many lightweight cloud servers do **not** have a dedicated public IP address. Instead, the provider assigns you:
- A **random SSH port** so you can log in (you already used this in Step 1 — it's the `-p` number in your `ssh` command)
- A **free domain** as compensation (something like `xxx.d6o1d2.top`)

**Here's how it works:** you pick any available port number on your server — say **8848**. Then in your provider's console, you tell it: "map my free domain to port 8848." From that moment on, visiting `http://your-free-domain` is the same as visiting `http://localhost:8848` on your server. The provider handles the tunnel for you.

So the question is just: which port should you tell the app to listen on? Pick any unused port (8848 is a good default; so is 3000). The app reads it from the `PORT` environment variable — you never need to edit any code:

```bash
# Pick whatever port you like, then tell the provider to map your domain to it.
# In this guide we'll use 8848.
export PORT=8848
```

Then go to your provider's console, find the "domain mapping" or "HTTP tunnel" setting, and point your free domain to port **8848** on your server.

> If you *do* have a server with a public IP and no domain tunnel, just use `PORT=3000` (or `PORT=80`) and access it via `http://<your-ip>:<port>`.

#### Step 9 — Start the server

Set the port as an environment variable (the app reads `PORT` from the environment — no code to edit):

```bash
export PORT=8848    # or 3000, or 80, or whatever your provider gave you
export DB_HOST=localhost DB_USER=wc26 DB_PASSWORD=wc26pass DB_NAME=wc26_predictor
cd /home/WorldCup2026-Predictor/server
node server.js
```

You should see: `World Cup Predictor server on http://localhost:8848`

#### Step 10 — Verify it works

Open another terminal and test locally on the server:

```bash
curl http://localhost:8848/api/health
# → {"status":"ok","db":"connected"}
```

Then test from your browser — use the domain your cloud provider gave you. You should see the predictor with a **green dot** in the top-right corner. Make a few predictions — they're now saved in MySQL.

> If the green dot does **not** appear, the frontend may not be detecting the backend. This happens when the domain isn't `localhost` but the frontend isn't being served by the same origin. Check that you're accessing the app through the Node server (not opening `index.html` directly). The fix is already in the code — if your hostname doesn't contain `github.io`, the app defaults to `/api` (same-origin).

#### Step 11 — Check the database

```bash
mysql wc26_predictor -e "SELECT id, champion, updated_at FROM predictions;"
```

If you've made predictions in the app, you should see rows here.

#### Step 12 — Make it survive reboots (systemd)

Stop the manually-run server (`Ctrl+C`), then create a systemd service:

```bash
cat > /etc/systemd/system/wc26-predictor.service << 'EOF'
[Unit]
Description=World Cup 2026 Predictor
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
WorkingDirectory=/home/WorldCup2026-Predictor/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

Environment=DB_HOST=localhost
Environment=DB_USER=wc26
Environment=DB_PASSWORD=wc26pass
Environment=DB_NAME=wc26_predictor
Environment=PORT=8848

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable wc26-predictor
systemctl start wc26-predictor
systemctl status wc26-predictor   # should show "active (running)"
```

Now reboot your server and verify it comes back on its own:

```bash
reboot
# ... wait for it to come back, SSH in again ...
curl http://localhost:8848/api/health
# → {"status":"ok","db":"connected"}
```

#### Step 13 — Share it

Your predictor is live at your domain. When someone finishes a prediction, the share modal shows a **12-character prediction ID**. Send that ID to someone else: they open `http://<your-domain>/?load=<ID>` and see the same prediction on any device.

### (Optional) Static File Mode

Open `index.html` in your browser. Predictions stay in localStorage. No server, no network needed. You lose cross-device sync, but everything else runs.

### Features

- **All 48 teams under the FIFA 2026 format**: 12 groups × 4 + 8 best-third advancement, H2H-first tie-breaker
- **528 real players**: 48 teams × 11, classified into 8 positions (ST / W / AM / CM / DM / FB / CB / GK)
- **Strength-tier engine + upset cap**: 5 tiers with auto-weighted scoring; prevents unrealistic blowouts
- **Position-weighted goals**: strikers score, attacking mids assist — matches real on-pitch roles
- **Manual / semi-auto / full random**: type scores, randomize one match, or randomize everything
- **Top scorers + assists**: auto-tallied, top 20 with Wikipedia headshots
- **Champion path reveal**: R32 → Final lights up progressively in gold + confetti
- **Champagne-gold share poster**: 1080×1620 PNG with 5-tier original tagline
- **Real QR code on every poster**: encodes a `?load=<prediction-id>` URL
- **MySQL-backed persistence**: predictions survive across browsers and devices
- **localStorage fallback**: works fully offline when the backend is unreachable
- **Stadium Scoreboard design**: dark default with Orbitron LED-display typography, stadium-red score inputs
- **Bilingual i18n**: one-tap Chinese/English toggle covering UI, team names, player names, taglines
- **Live scoring**: pulls real results from ESPN's public API and grades your bracket
- **Responsive**: mobile / desktop breakpoints

### Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Single-file HTML / CSS / Vanilla JS |
| Backend | Node.js + Express (~130 lines, 3 API endpoints) |
| Database | MySQL 8.0 (JSON columns) |
| Font | [Orbitron](https://fonts.google.com/specimen/Orbitron) |
| Poster | [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 |
| QR code | [qrcodejs](https://github.com/davidshimjs/qrcodejs) |
| Celebration | [canvas-confetti](https://github.com/catdad/canvas-confetti) |
| Flags | [FlagCDN](https://flagcdn.com/) |
| Player photos | Wikipedia REST API |

### Algorithm & Scoring

See the [original project's README](https://github.com/gmliangjz/WorldCup2026-Predictor) for the full algorithm documentation — strength tiers, score sampling, upset caps, group ranking under FIFA 2026 rules, and the live-scoring point system.

### Credits

[jizhengliang](https://github.com/gmliangjz) built the original predictor: the simulation engine, 528-player roster, bilingual i18n, poster design, and commentary taglines.

This fork adds:
- Node.js/Express + MySQL backend persistence
- Stadium Scoreboard visual redesign (Orbitron typography, dark default)
- qrcodejs library for real QR codes (replacing the hand-rolled v3 QR matrix)
- systemd service file for production deployment
- Cloud server deployment guide

### License

MIT — see [LICENSE](LICENSE).

---

## 中文

### 这是什么

预测 2026 FIFA 世界杯。48 队、528 名真实球员，从小组赛打到决赛。自己填比分，或者让引擎随机生成。最后导出一张带可扫描二维码的香槟金分享海报。

可以直接双击 `index.html` 用，纯前端 localStorage。接入 MySQL 后端后，换设备打开也能接着预测。

### 部署到轻量云服务器

你刚拿到一台 Linux 服务器。厂商给了你一个 SSH 登录端口和一个免费域名。没有公网 IP。IPv4 地址早分完了，这是轻量服务器的常态。好消息是：你可以把免费域名映射到服务器上的任意端口，厂商帮你做隧道转发。

这份指南带你走完部署应用和映射域名这两步。测试环境：Ubuntu 22.04，4 GB 内存，20 GB 磁盘，免费域名映射到 8848 端口。全程大约 15 分钟。

#### 第 1 步 — SSH 登录服务器

```bash
ssh -p <你的SSH端口> root@<你的服务器IP>
```

#### 第 2 步 — 检查当前环境

```bash
cat /etc/os-release | head -3     # 确认是 Ubuntu/Debian
which node && node -v || echo "未安装 Node.js"
which mysql && mysql --version || echo "未安装 MySQL"
```

大多数新开的服务器会显示"未安装"。没关系，接下来就装。

#### 第 3 步 — 安装 Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install nodejs -y
node -v    # 应该输出 v20.x.x
```

#### 第 4 步 — 安装 MySQL 8.0

```bash
apt update -qq
apt install mysql-server -y
systemctl is-active mysql    # 应该输出 "active"
mysql --version              # 应该输出 8.0.x
```

#### 第 5 步 — 创建数据库和用户

```bash
mysql -e "
  CREATE DATABASE IF NOT EXISTS wc26_predictor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'wc26'@'localhost' IDENTIFIED BY 'wc26pass';
  GRANT ALL PRIVILEGES ON wc26_predictor.* TO 'wc26'@'localhost';
  FLUSH PRIVILEGES;
"
```

> 可以把 `wc26pass` 换成你自己的密码。如果换了，记得后面第 8 步的环境变量也要同步改。

#### 第 6 步 — clone 项目并建表

```bash
git clone https://github.com/FrRay/WorldCup2026-Predictor.git /home/WorldCup2026-Predictor
cd /home/WorldCup2026-Predictor
mysql wc26_predictor < server/init.sql
mysql wc26_predictor -e "DESCRIBE predictions;"   # 验证表已创建
```

#### 第 7 步 — 安装 Node.js 依赖

```bash
cd /home/WorldCup2026-Predictor/server
npm install
```

如果 `npm install` 卡住或报 `ECONNREFUSED` 连到某个代理端口，说明之前配过 npm 代理但现在代理不在运行。检查并清除：

```bash
npm config list | grep proxy    # 看看有没有配代理
npm config delete proxy         # 有就删掉
npm config delete https-proxy
npm install                     # 重试
```

#### 第 8 步 — 确定你用的端口

很多轻量云服务器**没有独立的公网 IP**。厂商会给你分配：
- 一个**随机的 SSH 端口**用来登录（就是第 1 步 `ssh` 命令里 `-p` 后面的那个数字，不能改）
- 一个**免费域名**作为补偿（类似 `xxx.d6o1d2.top`）

**原理是这样的**：你可以在服务器上任意选一个空闲端口——比如 **8848**。然后去厂商控制台告诉它："把我的免费域名映射到 8848 端口"。之后访问 `http://你的免费域名` 就等于访问 `http://localhost:8848`。厂商帮你做了隧道转发。

所以问题就变成：你让应用监听哪个端口？随便选一个没被占用的端口就行（8848 是个好选择，3000 也行）。应用从 `PORT` 环境变量读取端口——完全不需要改代码：

```bash
# 选一个你喜欢的端口，然后去厂商控制台把域名映射到这个端口。
# 本文档以 8848 为例。
export PORT=8848
```

然后去厂商控制台，找到"域名映射"或"HTTP 隧道"设置，把你的免费域名指向服务器的 **8848** 端口。

> 如果你的服务器**有**公网 IP、没有域名隧道，直接用 `PORT=3000`（或 `PORT=80`），然后通过 `http://<你的IP>:<端口>` 访问就行。

#### 第 9 步 — 启动服务

把端口设为环境变量（代码自动读取，不需要改任何文件）：

```bash
export PORT=8848    # 替换成云厂商给你的端口，或者 3000
export DB_HOST=localhost DB_USER=wc26 DB_PASSWORD=wc26pass DB_NAME=wc26_predictor
cd /home/WorldCup2026-Predictor/server
node server.js
```

看到 `World Cup Predictor server on http://localhost:8848` 就说明跑起来了。

#### 第 10 步 — 验证

另开一个终端，在服务器本地测试：

```bash
curl http://localhost:8848/api/health
# → {"status":"ok","db":"connected"}
```

然后用浏览器访问你的服务器域名。应该能看到预测器页面，右上角有一个**绿色小圆点**——说明后端已连接。随便预测几场，数据就写入了 MySQL。

> 如果绿色圆点**没有出现**，说明前端没检测到后端。常见原因是你直接双击打开了下载的 index.html 而不是通过服务器域名访问。代码里已做了处理：只要域名不含 `github.io`，就默认走后端 `/api`（同源请求）。

#### 第 11 步 — 查看数据库

```bash
mysql wc26_predictor -e "SELECT id, champion, updated_at FROM predictions;"
```

如果你在页面上做了预测，这里应该能看到数据。

#### 第 12 步 — 设置开机自启（systemd）

先停掉手动跑的进程（`Ctrl+C`），然后创建 systemd 服务：

```bash
cat > /etc/systemd/system/wc26-predictor.service << 'EOF'
[Unit]
Description=World Cup 2026 Predictor
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
WorkingDirectory=/home/WorldCup2026-Predictor/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

Environment=DB_HOST=localhost
Environment=DB_USER=wc26
Environment=DB_PASSWORD=wc26pass
Environment=DB_NAME=wc26_predictor
Environment=PORT=8848

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable wc26-predictor
systemctl start wc26-predictor
systemctl status wc26-predictor   # 应该显示 "active (running)"
```

重启服务器验证：

```bash
reboot
# ... 等服务器起来，重新 SSH 上去 ...
curl http://localhost:8848/api/health
# → {"status":"ok","db":"connected"}
```

#### 第 13 步 — 分享出去

预测器跑在你的域名上了。有人做完预测后，分享弹窗会显示一个**12 位预测 ID**。把 ID 发给别人，对方打开 `http://<你的域名>/?load=<ID>` 就能在任何设备上看到同样的预测。

### （可选）纯静态文件模式

直接在浏览器里打开 `index.html`。预测保存在 localStorage。不需要服务器，不需要网络。但不能跨设备同步，清缓存就没了。

### 功能特性

- **48 队完整 FIFA 2026 新赛制**：12 组 × 4 队 + 8 个三档晋级，H2H 优先 tie-breaker
- **528 名球员真实花名册**：48 队 × 11 人，8 档位置分类
- **强度档位 + 冷门上限算法**：5 档球队强度，防止不真实的大比分爆冷
- **位置加权进球分布**：中锋多进球、攻中多助攻——按真实足球场上分工
- **手动 / 半自动 / 全随机**：手填、随机一场、一键随机全部
- **射手榜 + 助攻榜**：自动统计，前 20 名带球员头像
- **冠军路径动画**：从 32 强到决赛逐轮金色高亮 + 五彩纸屑
- **香槟金分享海报**：1080×1620 PNG，五档对应五段原创解说词
- **海报内置真实二维码**：编码 `?load=<预测ID>` 链接
- **MySQL 数据持久化**：跨浏览器、跨设备同步预测
- **localStorage 降级**：后端不可用时自动切到纯离线模式
- **球场记分牌视觉风格**：默认深色 + Orbitron LED 数字字体 + 红色比分输入框
- **中英双语切换**：UI / 球队名 / 球员名 / 解说词全覆盖
- **真实赛果实时计分**：ESPN 公开接口，自动对比打分
- **响应式**：手机 / 桌面自适应

### 技术栈

| 层 | 工具 |
|---|---|
| 前端 | 单文件 HTML / CSS / Vanilla JS |
| 后端 | Node.js + Express（~130 行，3 个接口） |
| 数据库 | MySQL 8.0（JSON 列存储预测数据） |
| 字体 | [Orbitron](https://fonts.google.com/specimen/Orbitron) |
| 海报 | [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 |
| 二维码 | [qrcodejs](https://github.com/davidshimjs/qrcodejs) |
| 礼花 | [canvas-confetti](https://github.com/catdad/canvas-confetti) |
| 国旗 | [FlagCDN](https://flagcdn.com/) |
| 球员头像 | Wikipedia REST API |

### 算法与计分

算法详情（强度档位、比分采样、冷门上限、FIFA 2026 小组排名、实时计分）见[原项目 README](https://github.com/gmliangjz/WorldCup2026-Predictor)。

### 致谢

[jizhengliang](https://github.com/gmliangjz) 开发了原始预测器：模拟引擎、528 人花名册、双语 i18n、海报设计、解说词。

本 fork 在此基础上增加：
- Node.js/Express + MySQL 后端持久化
- 球场记分牌风格视觉重设计（Orbitron 字体，深色默认）
- qrcodejs 库生成真实二维码（替换手写 v3 QR matrix）
- systemd 生产部署服务文件
- 云服务器部署教程

### License

MIT — 详见 [LICENSE](LICENSE)。
