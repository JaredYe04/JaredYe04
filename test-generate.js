#!/usr/bin/env node
/**
 * 测试脚本：用于本地调试和生成 README
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    export GITHUB_TOKEN=your_token
 *    export GITHUB_USERNAME=JaredYe04
 * 
 * 2. 运行脚本：
 *    node test-generate.js
 * 
 * 3. 查看生成的 README.md 和 images/ 目录
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// 从环境变量获取配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'JaredYe04';

if (!GITHUB_TOKEN) {
  console.error('❌ 错误: 请设置 GITHUB_TOKEN 环境变量');
  console.error('   例如: export GITHUB_TOKEN=your_token');
  process.exit(1);
}

console.log('🧪 测试脚本：生成 README');
console.log(`📌 用户: ${GITHUB_USERNAME}`);
console.log(`📌 Token: ${GITHUB_TOKEN.substring(0, 10)}...\n`);

// 初始化 Octokit
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

// 模拟一些测试数据
const mockStats = {
  languageStats: {
    'JavaScript': { bytes: 100000, commits: 10, additions: 5000 },
    'TypeScript': { bytes: 50000, commits: 5, additions: 2000 },
    'Python': { bytes: 30000, commits: 3, additions: 1000 },
    'Vue': { bytes: 20000, commits: 2, additions: 800 },
  },
  totalLOC: 8500,
  commitCount: 20,
  usageTime: {
    totalSeconds: 36000, // 10 小时
    sessions: [
      { date: '2024-01-01', start: '09:00', end: '12:00', duration: 10800 },
      { date: '2024-01-02', start: '14:00', end: '18:00', duration: 14400 },
    ],
  },
  commits: [
    { repoFullName: 'JaredYe04/test-repo', commit: { author: { date: new Date().toISOString() } } },
    { repoFullName: 'JaredYe04/test-repo', commit: { author: { date: new Date().toISOString() } } },
  ],
  commits30Days: Array.from({ length: 30 }, (_, i) => ({
    repoFullName: 'JaredYe04/test-repo',
    commit: {
      author: {
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  })),
};

// 导入主脚本的函数（需要重构 index.js 以支持导出）
async function testGenerate() {
  try {
    console.log('📝 读取模板文件...');
    const templatePath = path.join(__dirname, 'README.template.md');
    if (!fs.existsSync(templatePath)) {
      console.error('❌ 模板文件不存在:', templatePath);
      process.exit(1);
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    console.log('✅ 模板文件读取成功\n');
    
    // 生成模拟的统计内容
    console.log('📊 生成模拟统计内容...');
    const statsMarkdown = generateMockStatsMarkdown(mockStats);
    console.log('✅ 统计内容生成成功\n');
    
    // 替换占位符
    console.log('🔄 替换模板占位符...');
    const readmeContent = templateContent.replace('{{STATS_SECTION}}', statsMarkdown);
    
    // 写入测试文件
    const testReadmePath = path.join(__dirname, 'README.test.md');
    fs.writeFileSync(testReadmePath, readmeContent, 'utf-8');
    console.log(`✅ 测试 README 已生成: ${testReadmePath}\n`);
    
    // 检查中英文分离
    console.log('🔍 检查中英文分离...');
    const zhMatches = readmeContent.match(/<div lang="zh-CN">[\s\S]*?<\/div>/g);
    const enMatches = readmeContent.match(/<div lang="en"[\s\S]*?<\/div>/g);
    console.log(`   中文块数量: ${zhMatches ? zhMatches.length : 0}`);
    console.log(`   英文块数量: ${enMatches ? enMatches.length : 0}`);
    
    // 检查 style 标签
    console.log('\n🔍 检查 style 标签...');
    const styleMatches = readmeContent.match(/<style>[\s\S]*?<\/style>/g);
    if (styleMatches) {
      styleMatches.forEach((style, index) => {
        const hasComment = readmeContent.indexOf('<!--') < readmeContent.indexOf(style) &&
                          readmeContent.indexOf('-->') > readmeContent.indexOf(style);
        console.log(`   Style ${index + 1}: ${hasComment ? '✅ 有注释包裹' : '❌ 裸露显示'}`);
      });
    }
    
    console.log('\n✨ 测试完成！');
    console.log(`📄 查看生成的 README: ${testReadmePath}`);
    console.log('💡 提示: 可以在浏览器中打开 README.test.md 查看效果');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    process.exit(1);
  }
}

// 生成模拟统计 Markdown
function generateMockStatsMarkdown(stats) {
  const { languageStats, totalLOC, commitCount, usageTime, commits, commits30Days } = stats;
  
  // 计算语言占比
  const totalBytes = Object.values(languageStats).reduce((sum, stat) => sum + stat.bytes, 0);
  const languageEntries = Object.entries(languageStats)
    .map(([lang, stat]) => ({
      lang: lang,
      bytes: stat.bytes,
      percentage: totalBytes > 0 ? (stat.bytes / totalBytes) * 100 : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);
  
  // 生成中文语言统计文本
  let languageText = '';
  languageEntries.forEach(({ lang, bytes, percentage }) => {
    const timeRatio = totalBytes > 0 ? bytes / totalBytes : 0;
    const langSeconds = Math.floor(usageTime.totalSeconds * timeRatio);
    const hours = Math.floor(langSeconds / 3600);
    const minutes = Math.floor((langSeconds % 3600) / 60);
    const timeStr = hours > 0 ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`;
    const barLength = Math.floor(percentage / 2);
    const bar = '█'.repeat(barLength) + '░'.repeat(50 - barLength);
    languageText += `${lang.padEnd(15)}\t${timeStr.padEnd(20)}\t${bar}\t${percentage.toFixed(2)} %\n`;
  });
  
  // 生成英文语言统计文本
  let languageTextEn = '';
  languageEntries.forEach(({ lang, bytes, percentage }) => {
    const timeRatio = totalBytes > 0 ? bytes / totalBytes : 0;
    const langSeconds = Math.floor(usageTime.totalSeconds * timeRatio);
    const hours = Math.floor(langSeconds / 3600);
    const minutes = Math.floor((langSeconds % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    const barLength = Math.floor(percentage / 2);
    const bar = '█'.repeat(barLength) + '░'.repeat(50 - barLength);
    languageTextEn += `${lang.padEnd(15)}\t${timeStr.padEnd(20)}\t${bar}\t${percentage.toFixed(2)} %\n`;
  });
  
  // 使用时间
  const usageHours = Math.floor(usageTime.totalSeconds / 3600);
  const usageMinutes = Math.floor((usageTime.totalSeconds % 3600) / 60);
  const usageText = `总计 ${usageHours} 小时 ${usageMinutes} 分钟`;
  const usageTextEn = `Total ${usageHours} hours ${usageMinutes} minutes`;
  
  return `<div lang="zh-CN">

📊 **过去七天我的编程活动统计**

\`\`\`
💬 编程语言: 
${languageText.trim()}

⏱️ 使用电脑时间: 
${usageText}

📝 代码统计: 
总代码行数 (LOC)      ${totalLOC.toLocaleString()} 行
提交次数               ${commitCount} 次
活跃仓库数             ${new Set(commits.map(c => c.repoFullName)).size} 个
\`\`\`


</div>

<div lang="en" style="display: none;">

📊 **My Coding Activity (Past 7 Days)**

\`\`\`
💬 Programming Languages: 
${languageTextEn.trim()}

⏱️ Computer Usage Time: 
${usageTextEn}

📝 Code Statistics: 
Total Lines of Code (LOC)      ${totalLOC.toLocaleString()} lines
Commits                        ${commitCount} times
Active Repositories            ${new Set(commits.map(c => c.repoFullName)).size} repos
\`\`\`

> ⏱️ Activity data inferred from GitHub events (no IDE plugins required)

</div>`;
}

// 运行测试
if (require.main === module) {
  testGenerate();
}

module.exports = { testGenerate };

