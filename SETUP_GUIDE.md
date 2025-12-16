# 资产管理系统 - 设置指南

这是一个使用 Next.js、Supabase 和 Tailwind CSS 构建的资产管理系统。

## 当前状态

✅ **已完成的设置：**
- Next.js 项目框架
- Tailwind CSS 样式
- TypeScript 配置
- Supabase 客户端集成
- 基础主页界面

## 接下来的步骤

### 第 1 步：设置 Supabase

1. **访问 Supabase 官网**: https://supabase.com/
2. **创建新项目**:
   - 点击 "New Project"
   - 输入项目名称（例如：asset-management）
   - 创建一个强密码
   - 选择地区（推荐选择离你最近的地区）
   
3. **获取 API 密钥**:
   - 进入项目的 "Settings" > "API"
   - 复制 "Project URL"
   - 复制 "anon public" 密钥

4. **更新环境变量**:
   编辑 `.env.local` 文件，替换为你的实际值：
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_actual_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
   ```

### 第 2 步：在 Supabase 中创建数据库表

在 Supabase 的 SQL Editor 中，执行以下 SQL 来创建基础表：

```sql
-- 创建资产类型表
CREATE TABLE asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 创建资产表
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  asset_type_id UUID REFERENCES asset_types(id),
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 启用行级安全性
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;

-- 创建基础策略（允许所有用户读取）
CREATE POLICY "Allow public read" ON assets FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON asset_types FOR SELECT USING (true);
```

### 第 3 步：本地测试

1. **启动开发服务器**:
   ```bash
   npm run dev
   ```

2. **打开浏览器访问**:
   ```
   http://localhost:3000
   ```

### 第 4 步：部署到 Vercel

1. **推送代码到 GitHub**:
   ```bash
   git add .
   git commit -m "Initial setup for asset management system"
   git push -u origin main
   ```

2. **在 Vercel 中导入项目**:
   - 访问 https://vercel.com/dashboard
   - 点击 "New Project"
   - 选择你的 GitHub 仓库
   - 点击 "Import"

3. **配置环境变量**:
   - 在 Vercel 的项目设置中
   - 前往 "Environment Variables"
   - 添加以下变量：
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **部署**:
   - 点击 "Deploy"
   - 等待部署完成

## 项目结构

```
asset-management/
├── app/                 # Next.js 应用文件夹
│   ├── page.tsx        # 主页面
│   ├── layout.tsx      # 根布局
│   └── globals.css     # 全局样式
├── lib/
│   └── supabase.ts     # Supabase 客户端配置
├── public/             # 静态文件
├── .env.local          # 环境变量（本地）
├── tailwind.config.ts  # Tailwind 配置
├── tsconfig.json       # TypeScript 配置
└── package.json        # 依赖配置
```

## 可用的脚本

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 检查 TypeScript 错误
npm run typecheck
```

## 下一步功能开发建议

1. **用户认证** - 使用 Supabase Auth
2. **资产列表页面** - 展示所有资产
3. **添加资产表单** - 创建新资产
4. **资产详情页面** - 查看单个资产
5. **编辑和删除功能** - 管理资产
6. **搜索和筛选** - 查找资产
7. **数据导出** - 导出资产列表为 Excel 或 CSV

## 常见问题

**Q: 我找不到我的 Supabase API 密钥**
A: 登录 Supabase，进入项目 > Settings > API，在那里你会找到所有必要的密钥。

**Q: 开发服务器无法启动**
A: 尝试清除 node_modules 和 .next 文件夹，然后重新运行 npm install 和 npm run dev。

**Q: 部署到 Vercel 后出现错误**
A: 检查环境变量是否正确设置，确保 Supabase 的 CORS 设置正确。

祝你开发愉快！🚀
