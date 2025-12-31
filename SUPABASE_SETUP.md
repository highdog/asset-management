# Supabase 数据库设置指南

## 第一步：访问 Supabase 控制台

1. 打开浏览器，访问：https://app.supabase.com
2. 登录你的 Supabase 账户
3. 选择你的项目：`ctyrwaaxfyvugmbmbnht`

## 第二步：创建 etf_list 表

1. 在左侧菜单点击 **SQL Editor**
2. 点击 **New Query** 按钮
3. 复制并粘贴下面的 SQL：

```sql
CREATE TABLE IF NOT EXISTS public.etf_list (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etf_list_code ON public.etf_list(code);
```

4. 点击 **Run** 按钮执行

## 第三步：创建 etf_kline 表

1. 在同一个 SQL Editor 中创建新 Query
2. 复制并粘贴下面的 SQL：

```sql
CREATE TABLE IF NOT EXISTS public.etf_kline (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    open FLOAT,
    close FLOAT,
    high FLOAT,
    low FLOAT,
    volume BIGINT,
    amount FLOAT,
    amplitude FLOAT,
    change_pct FLOAT,
    change_amount FLOAT,
    turnover_rate FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_kline_symbol ON public.etf_kline(symbol);
CREATE INDEX IF NOT EXISTS idx_kline_date ON public.etf_kline(date);
```

3. 点击 **Run** 按钮执行

## 第四步：设置表权限（可选但推荐）

为了使 API 可以访问这些表，需要设置 RLS (Row Level Security) 权限。

1. 在左侧菜单点击 **Authentication** → **Policies**
2. 对于 `etf_list` 表，添加以下策略：
   - **SELECT**: Enable for all users (读取公开数据)
   - **INSERT/UPDATE/DELETE**: Enable for authenticated users (仅认证用户可修改)

3. 对于 `etf_kline` 表，添加相同的策略

## 第五步：验证表创建成功

1. 在左侧菜单点击 **Table Editor**
2. 你应该能看到两个新表：
   - `etf_list`
   - `etf_kline`

## 第六步：运行数据导入脚本

表创建完成后，运行以下命令导入 ETF 列表和 K线数据：

```bash
# 激活虚拟环境
source venv/bin/activate

# 导出环境变量
export $(cat .env.local | xargs)

# 运行导入脚本
python3 scripts/setup_supabase_tables.py
```

然后运行完整的数据获取和导入脚本：

```bash
python3 scripts/import_to_supabase.py
```

## 常见问题

### Q: 如何查看表中的数据？
A: 在 Supabase 控制台，点击 **Table Editor**，然后选择相应的表即可查看数据。

### Q: 如何更新 RLS 策略？
A: 点击 **Authentication** → **Policies**，选择相应的表和策略，进行编辑。

### Q: 如何删除表？
A: 在 **SQL Editor** 中执行：
```sql
DROP TABLE IF EXISTS public.etf_kline;
DROP TABLE IF EXISTS public.etf_list;
```

### Q: 导入数据时出现 "UNIQUE constraint failed" 错误？
A: 这表示该日期的数据已经存在，脚本会自动跳过重复数据。

## API 集成

创建表后，你可以通过 Next.js API 接口访问这些数据：

- `GET /api/etf/list?category=stock` - 获取 ETF 列表
- `GET /api/etf/kline?symbol=159919&days=30` - 获取 K线数据

这些 API 接口已经在项目中创建，直接调用即可。
