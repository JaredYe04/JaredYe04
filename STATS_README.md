# GitHub 活动统计系统使用说明

## 📋 功能说明

这个系统会自动统计你的 GitHub 活动数据，包括：

1. **编程语言占比** - 基于本周的 commits 和代码变更
2. **使用电脑时间** - 基于 commit 时间戳推断的活跃时间
3. **代码量统计** - 总代码行数（LOC）和提交次数
4. **活跃仓库数** - 本周有活动的仓库数量

## 🚀 使用方法

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在 GitHub Actions 中，系统会自动使用 `GITHUB_TOKEN`（由 GitHub 自动提供）。

如果要在本地运行，需要设置：

```bash
export GITHUB_TOKEN=your_github_personal_access_token
export GITHUB_USERNAME=JaredYe04  # 可选，默认为仓库所有者
```

### 3. 运行脚本

```bash
npm start
```

### 4. 自动运行

GitHub Actions 会在每天 UTC 00:00（北京时间 08:00）自动运行，更新 README.md 中的统计信息。

你也可以在 GitHub 仓库的 Actions 页面手动触发 `Update GitHub Stats` workflow。

## ⚙️ 工作原理

### 数据获取流程

1. **获取仓库列表** - 通过 GitHub API 获取用户的所有仓库
2. **获取本周 commits** - 筛选本周（从周一开始）的所有 commits
3. **分析代码变更** - 
   - 对于前 50 个 commits，获取详细的文件变更信息
   - 对于其他 commits，使用仓库语言分布进行估算
4. **计算使用时间** - 基于 commit 时间戳推断活跃时间段
5. **生成统计报告** - 格式化为 Markdown 并更新 README.md

### 时间推断逻辑

- 分析每天的首次和最后一次 commit 时间
- 计算时间跨度 + commit 数量 × 5分钟（估算每次 commit 间隔）
- 限制单日最大活跃时间为 12 小时

### 代码量统计

- 优先使用 commit 文件变更中的 `additions` 字段（更准确）
- 如果没有详细变更信息，则基于仓库语言分布和 commit 数量估算
- 估算公式：每行代码约 50 bytes

## 📊 统计示例

```
📊 **本周我的编程活动统计**

```
💬 编程语言: 
JavaScript           5 小时 30 分钟    █████████████████░░░░░░░░   67.66 % 
TypeScript           2 小时 15 分钟    ██████░░░░░░░░░░░░░░░░░░   27.45 % 
Markdown             30 分钟           ██░░░░░░░░░░░░░░░░░░░░░░   04.89 % 

⏱️ 使用电脑时间: 
总计 8 小时 15 分钟

📝 代码统计: 
总代码行数 (LOC)      1,234 行
提交次数              25 次
活跃仓库数            5 个
```

> ⏱️ 活动数据基于 GitHub 事件推断（无需 IDE 插件）

## 🔧 自定义配置

### 修改统计周期

编辑 `index.js` 中的 `getWeekStart()` 函数，可以修改统计周期的开始时间。

### 修改语言显示

编辑 `index.js` 中的 `languageNames` 对象，可以自定义语言的中文显示名称。

### 修改时间估算

编辑 `index.js` 中的 `analyzeComputerUsageTime()` 函数，可以调整时间推断逻辑。

## ⚠️ 注意事项

1. **API Rate Limit** - GitHub API 有速率限制，如果仓库和 commits 很多，可能需要较长时间
2. **统计准确性** - 由于无法获取 IDE 级别的数据，统计结果基于推断，可能与实际有差异
3. **时区设置** - 统计周期基于 UTC+8（北京时间），周一开始计算

## 📝 License

MIT

