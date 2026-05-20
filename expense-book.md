# 记账本 - 朋友小组记账功能

## Context

为记账本添加两个新功能：
1. **多人注册使用** - 已有基础（Supabase Auth）
2. **朋友小组记账** - 新功能：建立朋友小组，共享记账费用

## 新功能设计

### 场景示例
- 小明、小红、小刚、小丽组成"旅行小组"
- 小明付了 ¥100 午餐，默认四人分担
- 每人应付 ¥25，记录到各自的账单
- 如果小丽取消选择，则三人分担，小明付 ¥100，小红和小刚各 ¥33.33，小丽 ¥0

### 数据模型

```sql
-- 小组表
create table groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- 组成员表
create table group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references auth.users(id),
  nickname text,
  created_at timestamp with time zone default now(),
  unique(group_id, user_id)
);

-- 支出记录表（修改）
alter table expenses add column group_id uuid references groups(id);
alter table expenses add column payer_id uuid references auth.users(id);

-- 分摊记录表
create table expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references auth.users(id),
  amount numeric not null,
  created_at timestamp with time zone default now()
);
```

### 页面功能

**1. 我的小组页面**
- 创建小组（输入名称）
- 查看已加入的小组
- 管理小组成员（添加/移除）

**2. 记账页面改进**
- 选择小组（如果选了小组，显示成员头像）
- 默认全选成员，可取消选择
- 显示分摊金额预览
- 提交后为每个成员创建各自的 expense_split

### 文件变更

```
src/
├── app/
│   ├── page.tsx              # 主页面（添加小组选择）
│   ├── groups/page.tsx       # 小组管理页面
│   └── components/
│       ├── GroupSelector.tsx # 小组选择组件
│       ├── MemberSelector.tsx# 成员选择组件
│       ├── Calendar.tsx      # 更新
│       ├── ExpenseForm.tsx   # 更新（添加分摊逻辑）
│       └── ExpenseList.tsx   # 更新
├── types/
│   └── expense.ts            # 更新类型定义
└── utils/
    └── supabase.ts           # 更新（添加小组相关查询）
```

## 实施步骤

1. **数据库**
   - 创建 groups、group_members、expense_splits 表
   - 修改 expenses 表添加 group_id、payer_id
   - 配置 RLS 策略

2. **后端工具**
   - 更新 supabase.ts 客户端
   - 添加小组 CRUD 函数

3. **组件**
   - 创建 GroupSelector 小组选择组件
   - 创建 MemberSelector 成员选择组件
   - 更新 ExpenseForm 添加分摊逻辑

4. **页面**
   - 创建 /groups 小组管理页面
   - 更新主页面布局添加小组入口

5. **类型定义**
   - 更新 Expense 类型
   - 添加 Group、GroupMember、ExpenseSplit 类型

## 验证

1. 运行 `npm run build` 确认无错误
2. 启动 `npm run dev`
3. 测试流程：
   - 用户A 创建小组"旅行"
   - 用户A 邀请用户B、C、D
   - 用户A 记账 ¥100 选择小组"旅行"，成员全选
   - 验证：用户A、B、C、D 各自的账单都有 ¥25 支出