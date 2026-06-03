# Minecraft 多服务器模组管理器

一款面向 Minecraft 服务器管理员的桌面工具，帮助统一管理多个服务器的模组文件，通过 Modrinth API 检测更新，并通过"公共模板"机制在服务器间同步模组配置。

## 功能特性

- **模组管理** — 扫描服务器 mods 目录、查看版本、启用/禁用、批量操作、右键菜单
- **更新检测** — 通过 Modrinth 官方 API 自动识别模组并比对最新版本
- **模板同步** — 以公共模板为基准，在多服务器间同步模组，确保一致性
- **差异对比** — 基于 SHA256 哈希的精确差异检测，支持预览文件内容
- **忽略管理** — 忽略不需要同步的文件，支持批量操作和取消忽略
- **多服务器** — 同时管理多个 Minecraft 服务器，独立配置、快速切换
- **深色模式** — 支持浅色/深色主题切换，状态自动持久化

## 界面预览

| 仪表盘 | 同步管理 |
|--------|---------|
| 服务器概览、快速同步入口 | 差异树、文件预览、忽略管理 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API) + Element Plus |
| 状态管理 | Pinia |
| 桌面框架 | Electron 42 |
| 构建工具 | Vite 8 + Rolldown |
| 数据存储 | sql.js (SQLite WebAssembly) |
| 更新源 | Modrinth API |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
# 构建安装包 + 便携版
npm run build

# 仅构建便携版
npm run build:portable

# 仅构建解压目录（调试用）
npm run build:dir
```

构建产物位于 `release/` 目录：

- `Minecraft 模组管理器 Setup 1.0.0.exe` — 安装包
- `Minecraft 模组管理器 便携版 1.0.0.exe` — 便携版

## 使用流程

```
配置模板路径 → 添加服务器 → 扫描差异 → 选择同步 → 完成
```

1. **配置模板路径** — 在设置页面选择公共模板目录
2. **添加服务器** — 输入名称，选择服务器根目录（需包含 `mods` 子目录）
3. **扫描差异** — 自动比对模板与服务器的文件差异
4. **选择同步** — 勾选需要同步的文件，执行推送或收集
5. **忽略管理** — 对不需要同步的文件设置忽略

## 项目结构

```
├── electron/               # Electron 主进程
│   ├── main.js             # 主进程入口、IPC 处理
│   ├── preload.js          # 预加载脚本、API 暴露
│   ├── store.js            # SQLite 数据存储
│   ├── file-manager.js     # 文件操作
│   └── sync-engine.js      # 同步引擎
├── src/                    # Vue 前端
│   ├── components/         # 公共组件
│   │   ├── DiffTree.vue    # 差异树（展开/折叠/忽略/预览）
│   │   ├── FileBrowser.vue # 文件浏览器
│   │   ├── ModList.vue     # 模组列表
│   │   ├── SyncWizard.vue  # 同步向导
│   │   └── ThemeToggle.vue # 主题切换
│   ├── views/              # 页面视图
│   │   ├── DashboardView.vue   # 仪表盘
│   │   ├── ServerView.vue      # 服务器概览
│   │   ├── ModManager.vue      # 模组管理
│   │   ├── SyncPanel.vue       # 同步管理
│   │   ├── TemplateView.vue    # 公共模板
│   │   └── SettingsView.vue    # 设置
│   ├── stores/             # Pinia 状态
│   │   ├── app.js          # 应用状态
│   │   └── theme.js        # 主题状态
│   ├── styles/
│   │   └── global.css      # 全局样式
│   └── utils/              # 工具函数
├── index.html
├── vite.config.js
└── package.json
```

## 安全机制

同步引擎内置安全排除列表，自动跳过关键文件：

- **配置文件**：`server.properties`、`eula.txt`、`ops.json`、`whitelist.json`、`bukkit.yml`、`spigot.yml`、`paper.yml` 等
- **系统目录**：`.git`、`libraries`、`versions`、`logs`、`cache`
- **文件读取**：IPC 层面校验路径白名单，仅允许读取模板和服务器目录内的文件

## 数据存储

所有数据存储在本地 SQLite 数据库中，不上传任何服务器：

- Windows：`%APPDATA%/Minecraft 模组管理器/mod-manager.db`
- 备份方式：直接复制 `mod-manager.db` 文件

## 许可证

ISC
