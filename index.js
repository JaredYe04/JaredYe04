const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'JaredYe04';
const REPO_OWNER = process.env.GITHUB_REPOSITORY_OWNER || GITHUB_USERNAME;
const REPO_NAME = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'JaredYe04';

if (!GITHUB_TOKEN) {
  console.error('错误: 需要设置 GITHUB_TOKEN 环境变量');
  process.exit(1);
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

// 语言名称映射（中文显示）
const languageNames = {
  'C++': 'C++',
  'C': 'C',
  'JavaScript': 'JavaScript',
  'TypeScript': 'TypeScript',
  'Python': 'Python',
  'Java': 'Java',
  'Go': 'Go',
  'Rust': 'Rust',
  'PHP': 'PHP',
  'Ruby': 'Ruby',
  'Swift': 'Swift',
  'Kotlin': 'Kotlin',
  'Dart': 'Dart',
  'HTML': 'HTML',
  'CSS': 'CSS',
  'SCSS': 'SCSS',
  'Less': 'Less',
  'Vue': 'Vue',
  'Markdown': 'Markdown',
  'JSON': 'JSON',
  'YAML': 'YAML',
  'Shell': 'Shell',
  'PowerShell': 'PowerShell',
  'Dockerfile': 'Dockerfile',
  'CMake': 'CMake',
  'Makefile': 'Makefile',
  'Other': 'Other',
};

// 获取本周的开始时间（周一 00:00 UTC+8）
function getWeekStart() {
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const day = beijingTime.getDay();
  const diff = day === 0 ? 6 : day - 1; // 周一为 0
  const weekStart = new Date(beijingTime);
  weekStart.setDate(beijingTime.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

// 获取过去N天的开始时间（UTC+8）
function getDaysAgoStart(days) {
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const startDate = new Date(beijingTime);
  startDate.setDate(beijingTime.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  return startDate.toISOString();
}

// 格式化时间
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  }
  return `${minutes} 分钟`;
}

// 格式化时间（简短版）
function formatDurationShort(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  }
  return `${minutes} 分钟`;
}

// 计算时间差（秒）
function getTimeDiff(start, end) {
  return Math.max(0, Math.floor((new Date(end) - new Date(start)) / 1000));
}

// 获取用户的所有仓库
async function getUserRepos() {
  try {
    const repos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data } = await octokit.repos.listForUser({
        username: GITHUB_USERNAME,
        per_page: 100,
        page: page,
        sort: 'updated',
      });

      if (data.length === 0) {
        hasMore = false;
      } else {
        repos.push(...data);
        page++;
        if (data.length < 100) {
          hasMore = false;
        }
      }
    }

    return repos;
  } catch (error) {
    console.error('获取仓库列表失败:', error.message);
    return [];
  }
}

// 获取仓库的语言统计
async function getRepoLanguages(owner, repo) {
  try {
    const { data } = await octokit.repos.listLanguages({
      owner,
      repo,
    });
    return data;
  } catch (error) {
    return {};
  }
}

// 获取指定时间范围内的 commits
async function getCommitsSince(sinceDate, label = 'commits') {
  const commits = [];
  const repos = await getUserRepos();

  console.log(`找到 ${repos.length} 个仓库，开始获取 ${label}...`);

  for (const repo of repos) {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const { data } = await octokit.repos.listCommits({
            owner: repo.owner.login,
            repo: repo.name,
            author: GITHUB_USERNAME,
            since: sinceDate,
            per_page: 100,
            page: page,
          });

          if (data.length === 0) {
            hasMore = false;
          } else {
            commits.push(...data.map(c => ({
              ...c,
              repo: repo.name,
              repoFullName: repo.full_name,
            })));
            page++;
            if (data.length < 100) {
              hasMore = false;
            }
          }
        } catch (error) {
          if (error.status === 409) {
            // 空仓库
            hasMore = false;
          } else {
            console.warn(`获取 ${repo.full_name} 的 commits 失败:`, error.message);
            hasMore = false;
          }
        }
      }
    } catch (error) {
      console.warn(`处理仓库 ${repo.full_name} 时出错:`, error.message);
    }
  }

  return commits;
}

// 获取本周的 commits
async function getWeeklyCommits() {
  const weekStart = getWeekStart();
  return await getCommitsSince(weekStart, '本周 commits');
}

// 获取 commit 的文件变更信息
async function getCommitFiles(owner, repo, sha) {
  try {
    const { data } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });
    return data.files || [];
  } catch (error) {
    return [];
  }
}

// 根据文件扩展名判断语言
function getLanguageFromFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap = {
    'js': 'JavaScript', 'jsx': 'JavaScript', 'mjs': 'JavaScript', 'cjs': 'JavaScript',
    'ts': 'TypeScript', 'tsx': 'TypeScript',
    'py': 'Python', 'pyw': 'Python',
    'java': 'Java',
    'cpp': 'C++', 'cc': 'C++', 'cxx': 'C++', 'hpp': 'C++', 'h': 'C++',
    'c': 'C',
    'go': 'Go',
    'rs': 'Rust',
    'php': 'PHP',
    'rb': 'Ruby',
    'swift': 'Swift',
    'kt': 'Kotlin', 'kts': 'Kotlin',
    'dart': 'Dart',
    'html': 'HTML', 'htm': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS', 'sass': 'SCSS',
    'less': 'Less',
    'vue': 'Vue',
    'md': 'Markdown',
    'json': 'JSON',
    'yaml': 'YAML', 'yml': 'YAML',
    'sh': 'Shell', 'bash': 'Shell',
    'ps1': 'PowerShell',
    'dockerfile': 'Dockerfile',
    'cmake': 'CMake', 'cmake.txt': 'CMake',
    'makefile': 'Makefile',
  };
  return langMap[ext] || 'Other';
}

// 获取代码量统计
async function getCodeStats(commits) {
  const languageStats = {};
  const repoSet = new Set();
  let totalLOC = 0;
  let processedCommits = 0;

  // 按仓库分组 commits
  const repoCommits = {};
  commits.forEach(commit => {
    if (!repoCommits[commit.repoFullName]) {
      repoCommits[commit.repoFullName] = [];
      repoSet.add(commit.repoFullName);
    }
    repoCommits[commit.repoFullName].push(commit);
  });

  console.log(`分析 ${repoSet.size} 个仓库的语言分布...`);

  // 方法1: 尝试从 commit 文件变更获取（更准确但较慢）
  // 为了效率，只处理前 50 个 commits 的详细信息
  const commitsToAnalyze = commits.slice(0, 50);
  
  for (const commit of commitsToAnalyze) {
    const [owner, repo] = commit.repoFullName.split('/');
    try {
      const files = await getCommitFiles(owner, repo, commit.sha);
      
      files.forEach(file => {
        const lang = getLanguageFromFile(file.filename);
        if (!languageStats[lang]) {
          languageStats[lang] = { bytes: 0, commits: 0, additions: 0, deletions: 0 };
        }
        
        // 统计代码变更
        languageStats[lang].additions += file.additions || 0;
        languageStats[lang].deletions += file.deletions || 0;
        languageStats[lang].commits += 1;
        
        // 估算 bytes（基于变更行数）
        const estimatedBytes = (file.additions || 0) * 50; // 每行约 50 bytes
        languageStats[lang].bytes += estimatedBytes;
      });
      
      processedCommits++;
    } catch (error) {
      // 如果获取失败，继续下一个
    }
  }

  // 方法2: 对于剩余的 commits，使用仓库语言分布估算
  if (commits.length > processedCommits) {
    const remainingCommits = commits.slice(processedCommits);
    const remainingRepoCommits = {};
    remainingCommits.forEach(commit => {
      if (!remainingRepoCommits[commit.repoFullName]) {
        remainingRepoCommits[commit.repoFullName] = [];
      }
      remainingRepoCommits[commit.repoFullName].push(commit);
    });

    for (const [repoFullName, repoCommitsList] of Object.entries(remainingRepoCommits)) {
      const [owner, repo] = repoFullName.split('/');
      try {
        const languages = await getRepoLanguages(owner, repo);
        const commitCount = repoCommitsList.length;
        
        // 按仓库语言分布和 commits 数量估算
        const totalRepoBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
        if (totalRepoBytes > 0) {
          Object.entries(languages).forEach(([lang, bytes]) => {
            if (!languageStats[lang]) {
              languageStats[lang] = { bytes: 0, commits: 0, additions: 0, deletions: 0 };
            }
            // 按语言占比和 commit 数量估算
            const langRatio = bytes / totalRepoBytes;
            const estimatedBytes = Math.floor(totalRepoBytes * langRatio * (commitCount / 100)); // 每个 commit 估算 1% 的代码变更
            languageStats[lang].bytes += estimatedBytes;
            languageStats[lang].commits += commitCount;
          });
        }
      } catch (error) {
        // 忽略错误
      }
    }
  }

  // 计算总代码量（基于 additions）
  Object.values(languageStats).forEach(stat => {
    totalLOC += stat.additions || Math.floor(stat.bytes / 50);
  });

  return { languageStats, totalLOC };
}

// 分析使用电脑的时间
function analyzeComputerUsageTime(commits) {
  if (commits.length === 0) return { totalSeconds: 0, sessions: [] };

  // 按日期分组
  const commitsByDate = {};
  commits.forEach(commit => {
    const date = new Date(commit.commit.author.date).toISOString().split('T')[0];
    if (!commitsByDate[date]) {
      commitsByDate[date] = [];
    }
    commitsByDate[date].push(commit);
  });

  let totalSeconds = 0;
  const sessions = [];

  // 分析每天的活跃时间
  Object.entries(commitsByDate).forEach(([date, dayCommits]) => {
    // 按时间排序
    dayCommits.sort((a, b) => 
      new Date(a.commit.author.date) - new Date(b.commit.author.date)
    );

    if (dayCommits.length === 0) return;

    // 计算首次和最后一次 commit 的时间差
    const firstCommit = new Date(dayCommits[0].commit.author.date);
    const lastCommit = new Date(dayCommits[dayCommits.length - 1].commit.author.date);
    
    // 估算活跃时间：首次到最后的时间差 + commit 数量 * 5分钟（估算每次 commit 间隔）
    const timeSpan = getTimeDiff(firstCommit, lastCommit);
    // 如果只有一个 commit，至少估算 30 分钟
    const commitTime = dayCommits.length === 1 ? 30 * 60 : dayCommits.length * 5 * 60;
    const estimatedActiveTime = timeSpan + commitTime;
    
    // 限制单日最大活跃时间为 12 小时，最小为 30 分钟
    const dailyActiveTime = Math.max(30 * 60, Math.min(estimatedActiveTime, 12 * 3600));
    
    totalSeconds += dailyActiveTime;
    sessions.push({
      date,
      commits: dayCommits.length,
      duration: dailyActiveTime,
    });
  });

  return { totalSeconds, sessions };
}

// 生成过去30天的提交柱状图
function generateCommitChart(commits30Days) {
  // 初始化过去30天的数据
  const daysData = [];
  const now = new Date();
  
  // 创建过去30天的日期数组（使用本地时区）
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];
    daysData.push({
      date: date,
      dateStr: dateStr,
      count: 0,
    });
  }

  // 统计每天的提交数
  commits30Days.forEach(commit => {
    const commitDate = new Date(commit.commit.author.date);
    // 转换为本地时区的日期字符串
    const commitDateStr = commitDate.toISOString().split('T')[0];
    const dayData = daysData.find(d => d.dateStr === commitDateStr);
    if (dayData) {
      dayData.count++;
    }
  });

  // 找到最大值用于缩放
  const maxCount = Math.max(...daysData.map(d => d.count), 1);
  const chartHeight = 8; // 图表高度（行数）

  // 生成柱状图
  let chart = '';
  
  // 从顶部到底部绘制
  for (let row = chartHeight; row >= 0; row--) {
    const threshold = (row / chartHeight) * maxCount;
    let line = '';
    
    daysData.forEach((day, index) => {
      if (day.count >= threshold) {
        line += '█';
      } else {
        line += ' ';
      }
      // 每7天添加一个分隔符
      if (index < daysData.length - 1 && (index + 1) % 7 === 0) {
        line += ' ';
      }
    });
    
    // 添加Y轴标签
    if (row === chartHeight) {
      line += ` ${maxCount}`;
    } else if (row === 0) {
      line += ' 0';
    } else if (row === Math.floor(chartHeight / 2)) {
      const midValue = Math.floor(maxCount / 2);
      line += ` ${midValue}`.padStart(3);
    } else {
      line += '   ';
    }
    
    chart += line + '\n';
  }

  // 添加X轴分隔线
  let separator = '';
  daysData.forEach((day, index) => {
    separator += '-';
    if (index < daysData.length - 1 && (index + 1) % 7 === 0) {
      separator += '+';
    }
  });
  separator += '--';
  chart += separator + '\n';

  // 添加X轴（日期标签）
  let xAxis = '';
  daysData.forEach((day, index) => {
    const dayOfMonth = day.date.getDate();
    const month = day.date.getMonth() + 1;
    // 只在每周的第一天和最后一天显示日期
    if (index % 7 === 0 || index === daysData.length - 1) {
      const label = `${month}/${dayOfMonth}`;
      xAxis += label.padStart(2);
    } else {
      xAxis += '  ';
    }
    if (index < daysData.length - 1 && (index + 1) % 7 === 0) {
      xAxis += ' ';
    }
  });
  chart += xAxis + '\n';

  // 添加统计信息
  const totalCommits = commits30Days.length;
  const avgCommits = (totalCommits / 30).toFixed(1);
  const maxDayCommits = Math.max(...daysData.map(d => d.count));
  const activeDays = daysData.filter(d => d.count > 0).length;

  chart += `\n统计: 总计 ${totalCommits} 次 | 平均 ${avgCommits} 次/天 | 最高 ${maxDayCommits} 次/天 | 活跃 ${activeDays} 天`;

  return chart;
}

// 生成编程语言占比 ECharts 饼图配置
function generateLanguagePieChart(languageStats, usageTime) {
  const totalBytes = Object.values(languageStats).reduce((sum, stat) => sum + stat.bytes, 0);
  const languageEntries = Object.entries(languageStats)
    .map(([lang, stat]) => ({
      lang: languageNames[lang] || lang,
      originalLang: lang,
      bytes: stat.bytes,
      percentage: totalBytes > 0 ? (stat.bytes / totalBytes) * 100 : 0,
    }))
    .filter(item => item.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  const data = languageEntries.map(({ lang, bytes, percentage }) => ({
    value: bytes,
    name: lang,
  }));

  const option = {
    title: {
      text: '编程语言占比',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} bytes ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
    },
    series: [
      {
        name: '编程语言',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        data: data,
      },
    ],
    width: 600,
    height: 450,
  };

  return JSON.stringify(option, null, 2);
}

// 生成提交趋势 SVG 折线图
function generateCommitTrendSVG(commits30Days) {
  // 初始化过去30天的数据
  const daysData = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];
    daysData.push({
      date: date,
      dateStr: dateStr,
      count: 0,
      repos: {},
    });
  }

  // 统计每天的提交数和各仓库的提交数
  commits30Days.forEach(commit => {
    const commitDate = new Date(commit.commit.author.date);
    const commitDateStr = commitDate.toISOString().split('T')[0];
    const dayData = daysData.find(d => d.dateStr === commitDateStr);
    if (dayData) {
      dayData.count++;
      const repoName = commit.repoFullName || commit.repo || 'unknown';
      if (!dayData.repos[repoName]) {
        dayData.repos[repoName] = 0;
      }
      dayData.repos[repoName]++;
    }
  });

  // 获取所有仓库名称（按提交数排序，取前8个）
  const repoStats = {};
  daysData.forEach(day => {
    Object.entries(day.repos).forEach(([repo, count]) => {
      if (!repoStats[repo]) {
        repoStats[repo] = 0;
      }
      repoStats[repo] += count;
    });
  });

  const topRepos = Object.entries(repoStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([repo]) => repo);

  // SVG 尺寸
  const width = 1000;
  const height = 500;
  const padding = { top: 60, right: 200, bottom: 60, left: 60 }; // 增加右边距，减少下边距
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 生成日期标签
  const dates = daysData.map(d => {
    const month = d.date.getMonth() + 1;
    const day = d.date.getDate();
    return `${month}/${day}`;
  });

  // 生成总提交数数据
  const totalData = daysData.map(d => d.count);
  const maxCount = Math.max(...totalData, 1);

  // 生成各仓库的提交数据
  const repoData = topRepos.map(repo => ({
    name: repo.split('/').pop(),
    data: daysData.map(day => day.repos[repo] || 0),
  }));

  // 颜色数组
  const colors = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f'
  ];

  // 生成 SVG 路径点
  function generatePath(points, smooth = false) {
    if (points.length === 0) return '';
    
    if (smooth) {
      // 使用贝塞尔曲线生成平滑路径
      let path = `M ${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1] || curr;
        
        const cp1x = prev.x + (curr.x - prev.x) / 3;
        const cp1y = prev.y;
        const cp2x = curr.x - (next.x - curr.x) / 3;
        const cp2y = curr.y;
        
        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
      }
      return path;
    } else {
      return points.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x},${p.y}`).join(' ');
    }
  }

  // 生成面积路径
  function generateAreaPath(points, baseY) {
    if (points.length === 0) return '';
    const path = generatePath(points, true);
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    return `${path} L ${lastPoint.x},${baseY} L ${firstPoint.x},${baseY} Z`;
  }

  // 生成总提交数折线点
  const totalPoints = totalData.map((count, i) => ({
    x: padding.left + (totalData.length > 1 ? (i / (totalData.length - 1)) : 0) * chartWidth,
    y: padding.top + chartHeight - (count / maxCount) * chartHeight,
    count: count,
  }));

  // 生成各仓库折线点
  const repoPoints = repoData.map((repo, repoIdx) => ({
    name: repo.name,
    points: repo.data.map((count, i) => ({
      x: padding.left + (repo.data.length > 1 ? (i / (repo.data.length - 1)) : 0) * chartWidth,
      y: padding.top + chartHeight - (count / maxCount) * chartHeight,
      count: count,
    })),
    color: colors[repoIdx + 1] || colors[repoIdx % colors.length],
  }));

  // 生成 SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  // 背景（黄白色护眼）
  svg += `  <rect width="${width}" height="${height}" fill="#fffef0"/>\n`;
  
  // 标题
  svg += `  <text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">过去30天提交趋势</text>\n`;
  
  // 网格线
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    const value = Math.round(maxCount - (maxCount / 5) * i);
    svg += `  <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e8e6d9" stroke-width="1" stroke-dasharray="2,2"/>\n`;
    svg += `  <text x="${padding.left - 10}" y="${y + 5}" text-anchor="end" font-size="12" font-weight="bold" fill="#555">${value}</text>\n`;
  }
  
  // Y轴标签（加粗）
  svg += `  <text x="20" y="${height / 2}" text-anchor="middle" font-size="14" font-weight="bold" fill="#555" transform="rotate(-90, 20, ${height / 2})">提交次数</text>\n`;
  
  // 总面积填充（总计）
  svg += `  <path d="${generateAreaPath(totalPoints, padding.top + chartHeight)}" fill="rgba(84, 112, 198, 0.1)" stroke="none"/>\n`;
  
  // 各仓库折线
  repoPoints.forEach(repo => {
    svg += `  <path d="${generatePath(repo.points, true)}" fill="none" stroke="${repo.color}" stroke-width="2" opacity="0.7"/>\n`;
    // 数据点
    repo.points.forEach(point => {
      if (point.count > 0) {
        svg += `  <circle cx="${point.x}" cy="${point.y}" r="3" fill="${repo.color}"/>\n`;
      }
    });
  });
  
  // 总计折线（最上层，粗一点）
  svg += `  <path d="${generatePath(totalPoints, true)}" fill="none" stroke="#5470c6" stroke-width="3"/>\n`;
  
  // 总计数据点
  totalPoints.forEach(point => {
    svg += `  <circle cx="${point.x}" cy="${point.y}" r="4" fill="#5470c6"/>\n`;
  });
  
  // X轴标签（每5天显示一个，加粗，字体稍小）
  dates.forEach((date, i) => {
    if (i % 5 === 0 || i === dates.length - 1) {
      const x = padding.left + (i / (dates.length - 1)) * chartWidth;
      svg += `  <text x="${x}" y="${height - padding.bottom + 15}" text-anchor="middle" font-size="10" font-weight="bold" fill="#555" transform="rotate(-30, ${x}, ${height - padding.bottom + 15})">${date}</text>\n`;
    }
  });
  
  // 图例（调整位置，避免溢出）
  let legendX = padding.left + chartWidth + 15;
  let legendY = padding.top + 20;
  const legendWidth = 180;
  const legendHeight = (repoPoints.length + 1) * 22 + 10;
  svg += `  <rect x="${legendX - 10}" y="${legendY - 15}" width="${legendWidth}" height="${legendHeight}" fill="#fffef0" stroke="#d0cec0" stroke-width="1" rx="5"/>\n`;
  
  // 总计图例
  svg += `  <line x1="${legendX}" y1="${legendY}" x2="${legendX + 20}" y2="${legendY}" stroke="#5470c6" stroke-width="3"/>\n`;
  svg += `  <text x="${legendX + 25}" y="${legendY + 5}" font-size="11" font-weight="bold" fill="#333">总计</text>\n`;
  legendY += 22;
  
  // 各仓库图例（缩短名称，避免溢出）
  repoPoints.forEach(repo => {
    const displayName = repo.name.length > 12 ? repo.name.substring(0, 12) + '...' : repo.name;
    svg += `  <line x1="${legendX}" y1="${legendY}" x2="${legendX + 20}" y2="${legendY}" stroke="${repo.color}" stroke-width="2" opacity="0.7"/>\n`;
    svg += `  <text x="${legendX + 25}" y="${legendY + 5}" font-size="10" fill="#333">${displayName}</text>\n`;
    legendY += 22;
  });
  
  svg += `</svg>`;
  
  return svg;
}

// 生成统计 Markdown
function generateStatsMarkdown(stats) {
  const { languageStats, totalLOC, commitCount, usageTime, commits, commits30Days } = stats;

  // 计算语言占比
  const totalBytes = Object.values(languageStats).reduce((sum, stat) => sum + stat.bytes, 0);
  const languageEntries = Object.entries(languageStats)
    .map(([lang, stat]) => ({
      lang: languageNames[lang] || lang,
      originalLang: lang,
      bytes: stat.bytes,
      commits: stat.commits,
      additions: stat.additions || 0,
      percentage: totalBytes > 0 ? (stat.bytes / totalBytes) * 100 : 0,
    }))
    .sort((a, b) => {
      // 按使用时间降序排列
      const totalBytes = Object.values(languageStats).reduce((sum, stat) => sum + stat.bytes, 0);
      const aTimeRatio = totalBytes > 0 ? a.bytes / totalBytes : 0;
      const bTimeRatio = totalBytes > 0 ? b.bytes / totalBytes : 0;
      const aSeconds = Math.floor(usageTime.totalSeconds * aTimeRatio);
      const bSeconds = Math.floor(usageTime.totalSeconds * bTimeRatio);
      return bSeconds - aSeconds; // 降序
    })
    .slice(0, 10); // 只显示前 10 种语言

  // 生成语言统计文本
  let languageText = '';
  if (languageEntries.length === 0) {
    languageText = '（本周暂无代码活动）\n';
  } else {
    // 计算最大宽度以便对齐
    const maxLangWidth = Math.max(...languageEntries.map(e => e.lang.length), 15);
    const maxTimeWidth = 20; // 时间字符串最大宽度
    
    languageEntries.forEach(({ lang, bytes, commits: langCommits, additions, percentage }) => {
      // 基于使用时间和语言占比计算时间
      const timeRatio = totalBytes > 0 ? bytes / totalBytes : 0;
      const langSeconds = Math.floor(usageTime.totalSeconds * timeRatio);
      const hours = Math.floor(langSeconds / 3600);
      const minutes = Math.floor((langSeconds % 3600) / 60);
      const timeStr = hours > 0 ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`;
      const barLength = Math.floor(percentage / 2); // 50 个字符为 100%
      const bar = '█'.repeat(barLength) + '░'.repeat(50 - barLength);
      // 使用制表符对齐
      languageText += `${lang.padEnd(maxLangWidth)}\t${timeStr.padEnd(maxTimeWidth)}\t${bar}\t${percentage.toFixed(2)} %\n`;
    });
  }

  // 生成使用时间统计
  const usageHours = Math.floor(usageTime.totalSeconds / 3600);
  const usageMinutes = Math.floor((usageTime.totalSeconds % 3600) / 60);
  const usageText = `总计 ${usageHours} 小时 ${usageMinutes} 分钟`;

  // 生成 ECharts 图表代码块
  let echartsCharts = '';
  
  // 编程语言占比饼图
  if (Object.keys(languageStats).length > 0 && totalBytes > 0) {
    try {
      const pieChart = generateLanguagePieChart(languageStats, usageTime);
      echartsCharts += `
📊 **编程语言占比**

\`\`\`echarts
${pieChart}
\`\`\`

`;
    } catch (error) {
      console.warn('生成语言占比图表失败:', error.message);
    }
  }

  // 提交趋势图（使用 SVG）
  if (commits30Days && commits30Days.length > 0) {
    try {
      const trendChart = generateCommitTrendSVG(commits30Days);
      echartsCharts += `
📈 **过去30天提交趋势**

${trendChart}

`;
    } catch (error) {
      console.warn('生成提交趋势图表失败:', error.message);
    }
  }

  return `📊 **本周我的编程活动统计**

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

${echartsCharts}
> ⏱️ 活动数据基于 GitHub 事件推断（无需 IDE 插件）`;
}

// 更新 README
async function updateREADME(statsMarkdown) {
  const readmePath = path.join(__dirname, 'README.md');
  let readmeContent = fs.readFileSync(readmePath, 'utf-8');

  // 查找并替换统计部分
  const statsStartMarker = '📊 **本周我的编程活动统计**';
  const statsEndMarker = '> ⏱️ 活动数据基于 GitHub 事件推断（无需 IDE 插件）';

  const startIndex = readmeContent.indexOf(statsStartMarker);
  const endIndex = readmeContent.indexOf(statsEndMarker);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    // 替换现有统计（包括结束标记后的换行）
    const before = readmeContent.substring(0, startIndex);
    // 找到结束标记后的第一个换行
    let afterStart = endIndex + statsEndMarker.length;
    // 跳过可能的换行和空行
    while (afterStart < readmeContent.length && 
           (readmeContent[afterStart] === '\n' || readmeContent[afterStart] === '\r')) {
      afterStart++;
    }
    const after = readmeContent.substring(afterStart);
    readmeContent = before + statsMarkdown + '\n\n' + after;
  } else {
    // 如果找不到标记，在 "Wakatime Stats" 后面插入
    const wakatimeIndex = readmeContent.indexOf('Wakatime Stats');
    if (wakatimeIndex !== -1) {
      const insertIndex = readmeContent.indexOf('\n', wakatimeIndex) + 1;
      readmeContent = 
        readmeContent.substring(0, insertIndex) + 
        '\n' + statsMarkdown + '\n\n' + 
        readmeContent.substring(insertIndex);
    } else {
      // 如果都找不到，在第一个表格后面插入
      const tableEndIndex = readmeContent.indexOf('|', readmeContent.indexOf('|') + 1);
      if (tableEndIndex !== -1) {
        const insertIndex = readmeContent.indexOf('\n', tableEndIndex) + 1;
        readmeContent = 
          readmeContent.substring(0, insertIndex) + 
          '\n' + statsMarkdown + '\n\n' + 
          readmeContent.substring(insertIndex);
      } else {
        // 最后的选择：追加到文件末尾
        readmeContent += '\n\n' + statsMarkdown;
      }
    }
  }

  fs.writeFileSync(readmePath, readmeContent, 'utf-8');
  console.log('✅ README.md 已更新');
}

// 主函数
async function main() {
  console.log('🚀 开始统计 GitHub 活动数据...');
  console.log(`📌 用户: ${GITHUB_USERNAME}`);
  const weekStart = getWeekStart();
  console.log(`📅 统计周期: 本周（从 ${weekStart} 开始）\n`);

  try {
    // 获取过去30天的 commits（用于图表）
    console.log('📦 获取过去30天的 commits（用于图表）...');
    const days30Start = getDaysAgoStart(30);
    const commits30Days = await getCommitsSince(days30Start, '过去30天 commits');
    console.log(`✅ 找到 ${commits30Days.length} 个 commits（30天）\n`);

    // 获取本周 commits
    console.log('📦 获取本周 commits...');
    const commits = await getWeeklyCommits();
    console.log(`✅ 找到 ${commits.length} 个 commits（本周）\n`);

    if (commits.length === 0) {
      console.log('⚠️ 本周暂无 commits，使用空数据');
      const emptyStats = {
        languageStats: {},
        totalLOC: 0,
        commitCount: 0,
        usageTime: { totalSeconds: 0, sessions: [] },
        commits: [],
        commits30Days: commits30Days,
      };
      const statsMarkdown = generateStatsMarkdown(emptyStats);
      await updateREADME(statsMarkdown);
      console.log('\n✨ 统计完成（空数据）！');
      return;
    }

    // 分析使用时间
    console.log('⏱️ 分析使用电脑时间...');
    const usageTime = analyzeComputerUsageTime(commits);
    console.log(`✅ 估算使用时间: ${formatDuration(usageTime.totalSeconds)}`);
    console.log(`   活跃天数: ${usageTime.sessions.length} 天\n`);

    // 获取代码统计
    console.log('📊 分析代码统计...');
    const { languageStats, totalLOC } = await getCodeStats(commits);
    console.log(`✅ 估算代码行数: ${totalLOC.toLocaleString()} LOC`);
    console.log(`   检测到 ${Object.keys(languageStats).length} 种编程语言\n`);

    // 生成统计
    const stats = {
      languageStats,
      totalLOC,
      commitCount: commits.length,
      usageTime,
      commits,
      commits30Days,
    };

    console.log('📝 生成统计报告...');
    const statsMarkdown = generateStatsMarkdown(stats);
    await updateREADME(statsMarkdown);

    console.log('\n✨ 统计完成！');
    console.log(`   - 提交次数（本周）: ${commits.length}`);
    console.log(`   - 提交次数（30天）: ${commits30Days.length}`);
    console.log(`   - 代码行数: ${totalLOC.toLocaleString()} LOC`);
    console.log(`   - 使用时间: ${formatDuration(usageTime.totalSeconds)}`);
    console.log(`   - 活跃仓库: ${new Set(commits.map(c => c.repoFullName)).size} 个`);
  } catch (error) {
    console.error('❌ 发生错误:', error);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    process.exit(1);
  }
}

main();

