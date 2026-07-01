# 记账本 (Expense Book) 项目总结

> 作者使用 Claude Code CLI 完成的全栈记账应用，界面中文，面向个人及好友群组的日常开销记录与分账需求。

## 一、我如何用 Claude 完成这个项目

### 1. 项目初始化

在没有从零写代码的情况下，直接告诉 Claude 想做什么：

```
"我想做一个记账本应用"
```

Claude 根据这句话生成了：

- Next.js 14 项目脚手架（`create-next-app`）
- TypeScript + Tailwind CSS 配置
- Supabase 集成方案
- 基础数据库 Schema

**核心原则**：用户只管提需求，Claude 负责生成代码。

---

### 2. 组件驱动开发（Component-by-Component）

项目采用"一个功能一个组件"的开发模式，用户逐个提出需求：

| 阶段    | 我的需求                   | Claude 输出                                           |
| ------- | -------------------------- | ----------------------------------------------------- |
| 第 1 步 | "需要一个日历组件来选日期" | `Calendar.tsx` — 月份切换、日期高亮                   |
| 第 2 步 | "需要一个表单来添加支出"   | `ExpenseForm.tsx` — 金额、类别、备注                  |
| 第 3 步 | "需要显示支出列表"         | `ExpenseList.tsx` — 按日期分组展示                    |
| 第 4 步 | "需要登录注册功能"         | `AuthForm.tsx` — 邮箱 + 密码登录                      |
| 第 5 步 | "需要一个头像选择器"       | `AvatarPicker.tsx` — 预设头像列表                     |
| 第 6 步 | "需要群组分账功能"         | `GroupSelector.tsx` / `MemberSelector.tsx` + 群组页面 |

**协作方式**：每加一个需求，只需描述"做什么"，不解释"怎么做"。Claude 会找到现有项目结构中的合适位置插入代码。

---

### 3. 设计系统的建立

用户描述视觉感受，Claude 转译为 Tailwind + CSS 变量：

```
"想要日式和纸那种温暖的质感"
```

Claude 产出：

- `globals.css` 中的配色变量（暖白、朱红、鼠尾草绿）
- `paper-texture`、`washi-border` 等自定义工具类
- 淡入动画 `fade-in`、`stagger-1` ~ `stagger-6`
- Google Fonts 选型：Noto Serif SC（标题）+ Zen Maru Gothic（正文）

---

### 4. 数据库与后端集成

- 用户提出需求："支出要存到数据库，支持多用户"
- Claude 设计 Supabase Schema（`expenses`、`profiles`、`groups` 等表）
- 通过 `@supabase/supabase-js` 客户端对接，RLS（行级安全）策略由 Claude 辅助编写
- `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 由用户从 Supabase Dashboard 复制粘贴

---

### 5. 分组功能与长期规划

`expense-book.md` 是项目规划文档，记录"好友群组费用分摊"功能的完整设计：

- 目的：多人共享账单、分账结算
- 数据库：新增 `groups`、`group_members`、`expense_splits` 三张表
- UI：GroupSelector、MemberSelector 已部分实现

这个文档是用户和 Claude 共同维护的项目路线图，随时可以继续推进。

---

### 6. 开发与部署流程

| 步骤     | 我做了什么                                                                        |
| -------- | --------------------------------------------------------------------------------- |
| 本地开发 | `npm run dev` → Claude 实时生成代码，浏览器热重载验证                             |
| 生产构建 | `npm run build` → Next.js 编译检查，Claude 辅助修复 TS 类型错误                   |
| 代码规范 | `npm run lint` → ESLint 检查，Claude 修复不符合 `next/core-web-vitals` 规则的地方 |
| 部署     | 独立的 Node.js 服务（`output: "standalone"`），只需设置环境变量即可               |

---

## 二、技术栈

### 框架与语言

| 类别     | 技术                        | 说明                       |
| -------- | --------------------------- | -------------------------- |
| 前端框架 | **Next.js 14** (App Router) | 页面路由、SSR/CSR 混合渲染 |
| 语言     | **TypeScript**              | 静态类型检查               |
| UI 库    | **React 18**                | 组件化视图层               |

### 样式

| 类别       | 技术                                               | 说明                         |
| ---------- | -------------------------------------------------- | ---------------------------- |
| CSS 框架   | **Tailwind CSS 3**                                 | 原子化工具类                 |
| 自定义样式 | **CSS 变量 + 关键帧动画**                          | 暖色和纸风格                 |
| 字体       | **Google Fonts** (Noto Serif SC + Zen Maru Gothic) | 通过 `next/font/google` 加载 |

### 后端与数据

| 类别 | 技术                              | 说明                                |
| ---- | --------------------------------- | ----------------------------------- |
| BaaS | **Supabase**                      | 托管 PostgreSQL + REST/Realtime API |
| 认证 | **Supabase Auth**                 | 邮箱密码登录                        |
| SDK  | **@supabase/supabase-js**         | 浏览器端数据库交互                  |
| RLS  | **PostgreSQL Row Level Security** | 数据行级访问控制                    |

### 构建与部署

| 类别     | 技术                                 | 说明                                          |
| -------- | ------------------------------------ | --------------------------------------------- |
| 构建工具 | **Next.js 内置** (Turbopack/Webpack) | `npm run build`                               |
| 输出模式 | **standalone**                       | `.next/standalone/` 可独立部署为 Node.js 服务 |
| 代码检查 | **ESLint** (`next/core-web-vitals`)  | `npm run lint`                                |
| 环境变量 | **`.env.local`**                     | Supabase 凭证（公开变量）                     |

---

## 三、项目结构

```
expense-book/
├── package.json              # 依赖与 npm 脚本
├── tsconfig.json             # TypeScript 配置，@/* 别名指向 src/*
├── next.config.js            # Next.js 配置，standalone 输出
├── tailwind.config.ts       # Tailwind 内容扫描路径
├── postcss.config.js        # PostCSS：tailwindcss + autoprefixer
├── .env.local                # Supabase URL + anon key
└── src/
    ├── app/
    │   ├── page.tsx          # 主页面（入口）
    │   ├── layout.tsx        # 根布局
    │   ├── globals.css       # 全局样式 + CSS 变量
    │   ├── groups/
    │   │   └── page.tsx     # 群组管理页面
    │   └── components/       # 功能组件
    ├── types/
    │   └── expense.ts        # 类型定义（Expense, Profile, Group...）
    └── utils/
        ├── supabase.ts       # Supabase 客户端单例
        └── date.ts           # 日期工具函数
```

---

## 四、技术架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 应用服务器                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  前端页面    │  │  API Routes │  │     Drizzle ORM         │  │
│  │  (React)    │──│  (后端接口)  │──│  (数据库抽象层)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite 数据库                              │
│                    (data/expense-book.db)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ expenses │  │  users   │  │ profiles │  │    groups       │  │
│  │ (支出表) │  │ (用户表) │  │ (资料表) │  │   (群组表)     │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 请求处理流程

```
用户点击"添加支出"
       │
       ▼
前端调用 API: POST /api/expenses
       │
       ▼
API Route 处理: src/app/api/expenses/route.ts
       │
       ▼
Drizzle ORM 执行: db.insert(expenses).values(...)
       │
       ▼
数据存入 SQLite
```

### 关键概念说明

| 概念            | 说明                                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| **API Routes**  | 前后端数据交互的桥梁，定义在 `src/app/api/` 目录下                                 |
| **Drizzle ORM** | 数据库抽象层，让你用 JavaScript 代码操作数据库，不用写 SQL                         |
| **Schema 文件** | 数据库表结构定义，位于 `src/db/schema.ts`                                          |
| **本地代理**    | Claude Code 通过本地代理（127.0.0.1:15721）连接 AI 服务，比直连官方 API 更快更便宜 |
