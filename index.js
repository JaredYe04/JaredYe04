const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Resvg } = require('@resvg/resvg-js');

// 配置
// GH_STATS_PAT：可选。需含私有仓库读权限（classic: repo；fine-grained: Contents 读）。
// 未设置时仅用 GITHUB_TOKEN + listForUser，只能统计公开仓库；默认 Actions 的 GITHUB_TOKEN 也不能跨私有仓。
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GH_STATS_PAT = process.env.GH_STATS_PAT;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'JaredYe04';
const REPO_OWNER = process.env.GITHUB_REPOSITORY_OWNER || GITHUB_USERNAME;
const REPO_NAME = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'JaredYe04';

const API_AUTH_TOKEN = GH_STATS_PAT || GITHUB_TOKEN;

if (!API_AUTH_TOKEN) {
  console.error('错误: 需要设置 GITHUB_TOKEN 环境变量（或同时设置 GH_STATS_PAT 以统计私有仓库）');
  process.exit(1);
}

const octokit = new Octokit({
  auth: API_AUTH_TOKEN,
});

// 语言名称映射（中文显示）
const languageNames = {
  'C++': 'C++',
  'C': 'C',
  'C#': 'C#',
  'F#': 'F#',
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
  'Scala': 'Scala',
  'Dart': 'Dart',
  'Elixir': 'Elixir',
  'Erlang': 'Erlang',
  'Clojure': 'Clojure',
  'Haskell': 'Haskell',
  'Lua': 'Lua',
  'Perl': 'Perl',
  'R': 'R',
  'Objective-C': 'Objective-C',
  'Zig': 'Zig',
  'Nim': 'Nim',
  'OCaml': 'OCaml',
  'Julia': 'Julia',
  'Solidity': 'Solidity',
  'SQL': 'SQL',
  'HTML': 'HTML',
  'CSS': 'CSS',
  'SCSS': 'SCSS',
  'Less': 'Less',
  'Vue': 'Vue',
  'Svelte': 'Svelte',
  'Markdown': 'Markdown',
  'JSON': 'JSON',
  'YAML': 'YAML',
  'TOML': 'TOML',
  'XML': 'XML',
  'Shell': 'Shell',
  'PowerShell': 'PowerShell',
  'Dockerfile': 'Dockerfile',
  'CMake': 'CMake',
  'Makefile': 'Makefile',
  'Other': 'Other',
};

// 文件扩展名 → 编程语言（参考 GitHub Linguist 常见映射）
const FILE_EXTENSION_TO_LANGUAGE = {
  'js': 'JavaScript', 'jsx': 'JavaScript', 'mjs': 'JavaScript', 'cjs': 'JavaScript',
  'ts': 'TypeScript', 'tsx': 'TypeScript', 'mts': 'TypeScript', 'cts': 'TypeScript',
  'py': 'Python', 'pyw': 'Python', 'pyi': 'Python',
  'java': 'Java',
  'kt': 'Kotlin', 'kts': 'Kotlin',
  'scala': 'Scala', 'sc': 'Scala',
  'groovy': 'Groovy', 'gradle': 'Gradle',
  'c': 'C', 'h': 'C',
  'cpp': 'C++', 'cc': 'C++', 'cxx': 'C++', 'c++': 'C++',
  'hpp': 'C++', 'hh': 'C++', 'hxx': 'C++', 'h++': 'C++',
  'cs': 'C#', 'csx': 'C#',
  'fs': 'F#', 'fsi': 'F#', 'fsx': 'F#',
  'go': 'Go',
  'rs': 'Rust',
  'php': 'PHP', 'phtml': 'PHP',
  'rb': 'Ruby', 'erb': 'Ruby', 'rake': 'Ruby',
  'swift': 'Swift',
  'dart': 'Dart',
  'ex': 'Elixir', 'exs': 'Elixir',
  'erl': 'Erlang', 'hrl': 'Erlang',
  'clj': 'Clojure', 'cljs': 'Clojure', 'cljc': 'Clojure', 'edn': 'Clojure',
  'hs': 'Haskell', 'lhs': 'Haskell',
  'lua': 'Lua',
  'pl': 'Perl', 'pm': 'Perl',
  'r': 'R', 'rmd': 'R',
  'm': 'Objective-C', 'mm': 'Objective-C',
  'zig': 'Zig',
  'nim': 'Nim',
  'ml': 'OCaml', 'mli': 'OCaml',
  'jl': 'Julia',
  'sol': 'Solidity',
  'sql': 'SQL', 'psql': 'SQL',
  'html': 'HTML', 'htm': 'HTML', 'xhtml': 'HTML',
  'css': 'CSS',
  'scss': 'SCSS', 'sass': 'SCSS',
  'less': 'Less',
  'vue': 'Vue',
  'svelte': 'Svelte',
  'md': 'Markdown', 'markdown': 'Markdown',
  'json': 'JSON', 'jsonc': 'JSON',
  'yaml': 'YAML', 'yml': 'YAML',
  'toml': 'TOML',
  'xml': 'XML', 'xsl': 'XML', 'xslt': 'XML',
  'sh': 'Shell', 'bash': 'Shell', 'zsh': 'Shell', 'fish': 'Shell',
  'ps1': 'PowerShell', 'psm1': 'PowerShell', 'psd1': 'PowerShell',
  'dockerfile': 'Dockerfile',
  'cmake': 'CMake',
  'makefile': 'Makefile',
  'proto': 'Protocol Buffers', 'graphql': 'GraphQL', 'gql': 'GraphQL',
  'vb': 'Visual Basic', 'vbs': 'Visual Basic',
  'asm': 'Assembly', 's': 'Assembly',
  'pas': 'Pascal', 'd': 'D',
  'cr': 'Crystal', 'v': 'V',
  'tf': 'HCL', 'hcl': 'HCL',
  'cshtml': 'Razor', 'razor': 'Razor',
};

const SPECIAL_FILENAME_TO_LANGUAGE = {
  'dockerfile': 'Dockerfile',
  'makefile': 'Makefile',
  'gnumakefile': 'Makefile',
  'cmakelists.txt': 'CMake',
  'rakefile': 'Ruby',
  'gemfile': 'Ruby',
  'podfile': 'Ruby',
  'vagrantfile': 'Ruby',
  'brewfile': 'Ruby',
  'procfile': 'Procfile',
};

// 非代码文件扩展名，归类为 Other
const NON_CODE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'tif', 'svg',
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv', 'webm',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'tar', 'gz', 'rar', '7z', 'bz2',
  'lock', 'sum',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'exe', 'dll', 'so', 'dylib', 'bin', 'obj', 'o', 'a', 'lib',
  'map', 'min',
  'txt', 'log', 'csv', 'tsv',
  'gitignore', 'gitattributes', 'gitmodules', 'editorconfig', 'dockerignore',
  'pem', 'crt', 'cer', 'key', 'p12', 'pfx',
  'db', 'sqlite', 'sqlite3',
  'env', 'ini', 'cfg', 'conf',
]);

// 获取过去7天的开始时间（UTC+8）
function getLast7DaysStart() {
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const startDate = new Date(beijingTime);
  startDate.setDate(beijingTime.getDate() - 7);
  startDate.setHours(0, 0, 0, 0);
  return startDate.toISOString();
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

// 格式化 UTC+8 时间戳
function formatTimestampUTC8() {
  const now = new Date();
  
  // 使用 Intl.DateTimeFormat 获取 UTC+8 时区的各个组件（更可靠）
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hours = parts.find(p => p.type === 'hour').value;
  const minutes = parts.find(p => p.type === 'minute').value;
  const seconds = parts.find(p => p.type === 'second').value;
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds} (UTC+8)`;
}


async function getAuthenticatedLogin() {
  try {
    const { data } = await octokit.users.getAuthenticated();
    return data.login;
  } catch {
    return null;
  }
}

// 获取用户的所有仓库（公开 + 私有：需配置 GH_STATS_PAT 且与 GITHUB_USERNAME 为同一账号）
async function getUserRepos() {
  try {
    const repos = [];
    const authLogin = await getAuthenticatedLogin();
    const sameAccount =
      authLogin &&
      authLogin.toLowerCase() === String(GITHUB_USERNAME).toLowerCase();

    const useAuthenticatedList = Boolean(GH_STATS_PAT) && sameAccount;

    if (GH_STATS_PAT && !sameAccount) {
      console.warn(
        `⚠️ 已设置 GH_STATS_PAT，但当前令牌对应账号为「${authLogin || '未知'}」，与 GITHUB_USERNAME「${GITHUB_USERNAME}」不一致，仍按公开仓库列表统计。`
      );
    } else if (!GH_STATS_PAT) {
      console.log(
        'ℹ️ 未设置 GH_STATS_PAT：仅通过公开接口枚举仓库，私有仓库不会计入统计。要包含私有仓库请在环境中设置 GH_STATS_PAT（需 repo / 对应仓库读权限）。'
      );
    }

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data } = useAuthenticatedList
        ? await octokit.repos.listForAuthenticatedUser({
            per_page: 100,
            page,
            sort: 'updated',
            affiliation: 'owner,collaborator,organization_member',
          })
        : await octokit.repos.listForUser({
            username: GITHUB_USERNAME,
            per_page: 100,
            page,
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

// 获取过去7天的 commits
async function getLast7DaysCommits() {
  const last7DaysStart = getLast7DaysStart();
  return await getCommitsSince(last7DaysStart, '过去7天 commits');
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
  const basename = filename.split('/').pop().split('\\').pop().toLowerCase();

  if (SPECIAL_FILENAME_TO_LANGUAGE[basename]) {
    return SPECIAL_FILENAME_TO_LANGUAGE[basename];
  }

  const dotIndex = basename.lastIndexOf('.');
  if (dotIndex <= 0) {
    return 'Other';
  }

  const ext = basename.slice(dotIndex + 1);
  if (FILE_EXTENSION_TO_LANGUAGE[ext]) {
    return FILE_EXTENSION_TO_LANGUAGE[ext];
  }

  if (NON_CODE_EXTENSIONS.has(ext)) {
    return 'Other';
  }

  // 未知扩展名：保留为独立语言（首字母大写），而非一律归为 Other
  return ext.charAt(0).toUpperCase() + ext.slice(1);
}

// 展示时将排名靠后的少量语言合并为 Other
function consolidateLanguageStats(languageStats, topN = 10) {
  const entries = Object.entries(languageStats)
    .filter(([, stat]) => stat.bytes > 0)
    .sort((a, b) => b[1].bytes - a[1].bytes);

  if (entries.length <= topN) {
    return languageStats;
  }

  const result = {};
  const otherStat = { bytes: 0, commits: 0, additions: 0, deletions: 0 };

  entries.forEach(([lang, stat], index) => {
    if (index < topN - 1) {
      result[lang] = { ...stat };
    } else {
      otherStat.bytes += stat.bytes;
      otherStat.commits += stat.commits;
      otherStat.additions += stat.additions || 0;
      otherStat.deletions += stat.deletions || 0;
    }
  });

  if (otherStat.bytes > 0) {
    result.Other = otherStat;
  }

  return result;
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

// 生成编程语言占比 SVG 饼图
function generateLanguagePieChartSVG(languageStats, usageTime, isDark = false) {
  const consolidatedStats = consolidateLanguageStats(languageStats);
  const totalBytes = Object.values(consolidatedStats).reduce((sum, stat) => sum + stat.bytes, 0);
  const languageEntries = Object.entries(consolidatedStats)
    .map(([lang, stat]) => ({
      lang: languageNames[lang] || lang,
      originalLang: lang,
      bytes: stat.bytes,
      percentage: totalBytes > 0 ? (stat.bytes / totalBytes) * 100 : 0,
    }))
    .filter(item => item.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  // 颜色方案
  const colors = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f'
  ];
  
  const bgColor = isDark ? '#0d1117' : '#fffef0';
  const textColor = isDark ? '#c9d1d9' : '#333';
  const textColorSecondary = isDark ? '#8b949e' : '#555';
  
  // SVG 尺寸（提高分辨率：2倍尺寸）
  const scale = 2; // 2倍分辨率
  const width = 600 * scale;
  const height = 450 * scale;
  const centerX = width / 2 - 50 * scale; // 向左移动，为右侧图例留空间
  const centerY = height / 2 + 20 * scale; // 稍微下移，为标题留空间
  const radius = 120 * scale;
  const innerRadius = 60 * scale;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  // 背景
  svg += `  <rect width="${width}" height="${height}" fill="${bgColor}"/>\n`;
  
  // 标题（按比例放大字体）
  svg += `  <text x="${width / 2}" y="${30 * scale}" text-anchor="middle" font-size="${18 * scale}" font-weight="bold" fill="${textColor}">编程语言占比</text>\n`;
  
  // 计算饼图扇形
  let currentAngle = -90; // 从顶部开始
  const slices = languageEntries.map((entry, index) => {
    const angle = (entry.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    // 计算扇形路径（环形图）
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const outerX1 = centerX + radius * Math.cos(startAngleRad);
    const outerY1 = centerY + radius * Math.sin(startAngleRad);
    const outerX2 = centerX + radius * Math.cos(endAngleRad);
    const outerY2 = centerY + radius * Math.sin(endAngleRad);
    
    const innerX1 = centerX + innerRadius * Math.cos(startAngleRad);
    const innerY1 = centerY + innerRadius * Math.sin(startAngleRad);
    const innerX2 = centerX + innerRadius * Math.cos(endAngleRad);
    const innerY2 = centerY + innerRadius * Math.sin(endAngleRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    // 环形路径
    const path = `M ${outerX1} ${outerY1} A ${radius} ${radius} 0 ${largeArc} 1 ${outerX2} ${outerY2} L ${innerX2} ${innerY2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1} Z`;
    
    // 标签位置（扇形中间）
    const labelAngle = (startAngle + endAngle) / 2;
    const labelAngleRad = (labelAngle * Math.PI) / 180;
    const labelRadius = (radius + innerRadius) / 2;
    const labelX = centerX + labelRadius * Math.cos(labelAngleRad);
    const labelY = centerY + labelRadius * Math.sin(labelAngleRad);
    
    return {
      path,
      color: colors[index % colors.length],
      entry,
      labelX,
      labelY,
    };
  });
  
  // 绘制扇形
  slices.forEach(slice => {
    svg += `  <path d="${slice.path}" fill="${slice.color}" stroke="${bgColor}" stroke-width="2"/>\n`;
    // 标签（如果百分比足够大，按比例放大字体，使用黑色确保清晰可见）
    if (slice.entry.percentage > 5) {
      svg += `  <text x="${slice.labelX}" y="${slice.labelY}" text-anchor="middle" font-size="${11 * scale}" font-weight="bold" fill="#000000">${slice.entry.percentage.toFixed(1)}%</text>\n`;
    }
  });
  
  // 图例（右侧，远离饼图，按比例放大）
  let legendX = 450 * scale; // 向右移动，避免与饼图重叠
  let legendY = 100 * scale;
  slices.forEach((slice, index) => {
    svg += `  <rect x="${legendX}" y="${legendY + index * 30 * scale}" width="${15 * scale}" height="${15 * scale}" fill="${slice.color}"/>\n`;
    const displayName = slice.entry.lang.length > 12 ? slice.entry.lang.substring(0, 12) + '...' : slice.entry.lang;
    svg += `  <text x="${legendX + 20 * scale}" y="${legendY + index * 30 * scale + 12 * scale}" font-size="${11 * scale}" fill="${textColor}">${displayName}</text>\n`;
    svg += `  <text x="${legendX + 20 * scale}" y="${legendY + index * 30 * scale + 24 * scale}" font-size="${10 * scale}" fill="${textColorSecondary}">${slice.entry.percentage.toFixed(1)}%</text>\n`;
  });
  
  svg += `</svg>`;
  
  return svg;
}

// 生成提交趋势 SVG 折线图
function generateCommitTrendSVG(commits30Days, isDark = false) {
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

  // SVG 尺寸（提高分辨率：2倍尺寸）
  const scale = 2; // 2倍分辨率
  const width = 1000 * scale;
  const height = 500 * scale;
  const padding = { top: 60 * scale, right: 200 * scale, bottom: 60 * scale, left: 60 * scale }; // 增加右边距，减少下边距
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

  // 深色模式颜色
  const bgColor = isDark ? '#0d1117' : '#fffef0';
  const textColor = isDark ? '#c9d1d9' : '#333';
  const gridColor = isDark ? '#21262d' : '#e8e6d9';
  const borderColor = isDark ? '#30363d' : '#d0cec0';
  const textColorSecondary = isDark ? '#8b949e' : '#555';
  
  // 生成 SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  // 背景
  svg += `  <rect width="${width}" height="${height}" fill="${bgColor}"/>\n`;
  
  // 标题（按比例放大字体）
  svg += `  <text x="${width / 2}" y="${30 * scale}" text-anchor="middle" font-size="${18 * scale}" font-weight="bold" fill="${textColor}">过去30天提交趋势</text>\n`;
  
  // 网格线（按比例放大）
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    const value = Math.round(maxCount - (maxCount / 5) * i);
    svg += `  <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="${gridColor}" stroke-width="${1 * scale}" stroke-dasharray="${2 * scale},${2 * scale}"/>\n`;
    svg += `  <text x="${padding.left - 10 * scale}" y="${y + 5 * scale}" text-anchor="end" font-size="${12 * scale}" font-weight="bold" fill="${textColorSecondary}">${value}</text>\n`;
  }
  
  // Y轴标签（加粗，按比例放大）
  svg += `  <text x="${20 * scale}" y="${height / 2}" text-anchor="middle" font-size="${14 * scale}" font-weight="bold" fill="${textColorSecondary}" transform="rotate(-90, ${20 * scale}, ${height / 2})">提交次数</text>\n`;
  
  // 总面积填充（总计）
  svg += `  <path d="${generateAreaPath(totalPoints, padding.top + chartHeight)}" fill="rgba(84, 112, 198, 0.1)" stroke="none"/>\n`;
  
  // 各仓库折线（按比例放大）
  repoPoints.forEach(repo => {
    svg += `  <path d="${generatePath(repo.points, true)}" fill="none" stroke="${repo.color}" stroke-width="${2 * scale}" opacity="0.7"/>\n`;
    // 数据点
    repo.points.forEach(point => {
      if (point.count > 0) {
        svg += `  <circle cx="${point.x}" cy="${point.y}" r="${3 * scale}" fill="${repo.color}"/>\n`;
      }
    });
  });
  
  // 总计折线（最上层，粗一点，按比例放大）
  svg += `  <path d="${generatePath(totalPoints, true)}" fill="none" stroke="#5470c6" stroke-width="${3 * scale}"/>\n`;
  
  // 总计数据点（按比例放大）
  totalPoints.forEach(point => {
    svg += `  <circle cx="${point.x}" cy="${point.y}" r="${4 * scale}" fill="#5470c6"/>\n`;
  });
  
  // X轴标签（每5天显示一个，加粗，字体稍小，按比例放大）
  dates.forEach((date, i) => {
    if (i % 5 === 0 || i === dates.length - 1) {
      const x = padding.left + (i / (dates.length - 1)) * chartWidth;
      svg += `  <text x="${x}" y="${height - padding.bottom + 15 * scale}" text-anchor="middle" font-size="${10 * scale}" font-weight="bold" fill="${textColorSecondary}" transform="rotate(-30, ${x}, ${height - padding.bottom + 15 * scale})">${date}</text>\n`;
    }
  });
  
  // 图例（调整位置，避免溢出，按比例放大）
  let legendX = padding.left + chartWidth + 15 * scale;
  let legendY = padding.top + 20 * scale;
  const legendWidth = 180 * scale;
  const legendHeight = (repoPoints.length + 1) * 22 * scale + 10 * scale;
  svg += `  <rect x="${legendX - 10 * scale}" y="${legendY - 15 * scale}" width="${legendWidth}" height="${legendHeight}" fill="${bgColor}" stroke="${borderColor}" stroke-width="${1 * scale}" rx="${5 * scale}"/>\n`;
  
  // 总计图例（按比例放大）
  svg += `  <line x1="${legendX}" y1="${legendY}" x2="${legendX + 20 * scale}" y2="${legendY}" stroke="#5470c6" stroke-width="${3 * scale}"/>\n`;
  svg += `  <text x="${legendX + 25 * scale}" y="${legendY + 5 * scale}" font-size="${11 * scale}" font-weight="bold" fill="${textColor}">总计</text>\n`;
  legendY += 22 * scale;
  
  // 各仓库图例（缩短名称，避免溢出，按比例放大）
  repoPoints.forEach(repo => {
    const displayName = repo.name.length > 12 ? repo.name.substring(0, 12) + '...' : repo.name;
    svg += `  <line x1="${legendX}" y1="${legendY}" x2="${legendX + 20 * scale}" y2="${legendY}" stroke="${repo.color}" stroke-width="${2 * scale}" opacity="0.7"/>\n`;
    svg += `  <text x="${legendX + 25 * scale}" y="${legendY + 5 * scale}" font-size="${10 * scale}" fill="${textColor}">${displayName}</text>\n`;
    legendY += 22 * scale;
  });
  
  svg += `</svg>`;
  
  return svg;
}

// 清理旧的图片文件（保留最新的）
function cleanOldImages() {
  try {
    const imagesDir = path.join(__dirname, 'images');
    if (!fs.existsSync(imagesDir)) {
      return;
    }
    
    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(f => f.endsWith('.png'));
    
    // 按修改时间排序，保留最新的文件
    const filesWithTime = imageFiles.map(file => ({
      name: file,
      path: path.join(imagesDir, file),
      mtime: fs.statSync(path.join(imagesDir, file)).mtime.getTime(),
    })).sort((a, b) => b.mtime - a.mtime);
    
    // 保留最新的 10 个文件，删除其他
    if (filesWithTime.length > 10) {
      const filesToDelete = filesWithTime.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  删除旧图片: ${file.name}`);
      });
      console.log(`✅ 已清理 ${filesToDelete.length} 个旧图片文件`);
    }
  } catch (error) {
    console.warn('清理旧图片失败:', error.message);
  }
}

// 将 SVG 转换为 PNG 并保存
function saveSVGAsPNG(svgString, filename, isDark = false) {
  try {
    const imagesDir = path.join(__dirname, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // 规范化 SVG，注入中文字体支持
    let svg = svgString;
    const hasChineseFont = /Microsoft YaHei|SimSun|SimHei|Noto|WenQuanYi|Noto Sans CJK/i.test(svg);
    
    if (!hasChineseFont) {
      if (/<style[^>]*>/i.test(svg)) {
        svg = svg.replace(
          /(<style[^>]*>)([\s\S]*?)(<\/style>)/i,
          (match, openTag, content, closeTag) => {
            if (!/font-family/i.test(content)) {
              return `${openTag}${content}\nsvg, text, tspan { font-family: Arial, "Microsoft YaHei", "SimSun", "SimHei", "Noto Sans CJK SC", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei", "Segoe UI", Verdana, sans-serif; }${closeTag}`;
            }
            return match;
          }
        );
      } else {
        svg = svg.replace(
          /(<svg[^>]*>)/i,
          `$1<style>svg, text, tspan { font-family: Arial, "Microsoft YaHei", "SimSun", "SimHei", "Noto Sans CJK SC", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei", "Segoe UI", Verdana, sans-serif; }</style>`
        );
      }
    }

    // 收集系统字体文件
    const candidateFontFiles = [];
    if (process.platform === 'win32') {
      const windowsFonts = [
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/arialuni.ttf',
        'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/simsun.ttc',
        'C:/Windows/Fonts/segoeui.ttf',
      ];
      candidateFontFiles.push(...windowsFonts.filter(f => fs.existsSync(f)));
    } else {
      const linuxFonts = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otf',
      ];
      candidateFontFiles.push(...linuxFonts.filter(f => fs.existsSync(f)));
    }

    // 将 SVG 转换为 PNG（提高分辨率：SVG 已按 2 倍尺寸生成）
    const bgColor = isDark ? '#0d1117' : '#fffef0';
    const resvgOptions = {
      background: bgColor,
      // SVG 尺寸已增加 2 倍，PNG 会自动按 SVG 尺寸渲染，获得更高分辨率
    };

    if (candidateFontFiles.length > 0) {
      resvgOptions.font = {
        loadSystemFonts: true,
        fontFiles: candidateFontFiles,
        defaultFontFamily: 'Arial',
      };
    }

    const resvg = new Resvg(svg, resvgOptions);
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // 保存 PNG 文件
    const imagePath = path.join(imagesDir, filename);
    fs.writeFileSync(imagePath, pngBuffer);
    
    console.log(`✅ SVG 已转换为 PNG: ${filename} (${(pngBuffer.length / 1024).toFixed(2)} KB)`);
    return `images/${filename}`;
  } catch (error) {
    console.error('❌ SVG 转 PNG 失败:', error.message);
    return null;
  }
}

// 生成统计 Markdown
function generateStatsMarkdown(stats) {
  const { languageStats, totalLOC, commitCount, usageTime, commits, commits30Days } = stats;

  // 计算语言占比（合并少量语言为 Other 后再展示）
  const consolidatedStats = consolidateLanguageStats(languageStats);
  const totalBytes = Object.values(consolidatedStats).reduce((sum, stat) => sum + stat.bytes, 0);
  const languageEntries = Object.entries(consolidatedStats)
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
      const aTimeRatio = totalBytes > 0 ? a.bytes / totalBytes : 0;
      const bTimeRatio = totalBytes > 0 ? b.bytes / totalBytes : 0;
      const aSeconds = Math.floor(usageTime.totalSeconds * aTimeRatio);
      const bSeconds = Math.floor(usageTime.totalSeconds * bTimeRatio);
      return bSeconds - aSeconds; // 降序
    });

  // 生成语言统计文本
  let languageText = '';
  if (languageEntries.length === 0) {
    languageText = '（过去七天暂无代码活动）\n';
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
  
  // 编程语言占比饼图（使用 SVG，生成浅色和深色两个版本）
  if (Object.keys(languageStats).length > 0 && totalBytes > 0) {
    try {
      const pieSVGLight = generateLanguagePieChartSVG(languageStats, usageTime, false);
      const pieSVGDark = generateLanguagePieChartSVG(languageStats, usageTime, true);
      
      // 生成文件名（基于内容哈希）
      const hashLight = crypto.createHash('sha256').update(pieSVGLight).digest('hex').slice(0, 12);
      const hashDark = crypto.createHash('sha256').update(pieSVGDark).digest('hex').slice(0, 12);
      const imageFilenameLight = `language-pie-light-${hashLight}.png`;
      const imageFilenameDark = `language-pie-dark-${hashDark}.png`;
      
      const imagePathLight = saveSVGAsPNG(pieSVGLight, imageFilenameLight, false);
      const imagePathDark = saveSVGAsPNG(pieSVGDark, imageFilenameDark, true);
      
      if (imagePathLight && imagePathDark) {
        echartsCharts += `###  📊 **编程语言占比**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${imagePathDark}">
  <img src="${imagePathLight}" alt="编程语言占比" width="600">
</picture>

`;
      } else {
        console.warn('编程语言占比图 PNG 保存失败，跳过');
      }
    } catch (error) {
      console.warn('生成语言占比图表失败:', error.message);
    }
  }

  echartsCharts += `###  📊 **主页浏览量**

  ![Profile Views](https://komarev.com/ghpvc/?username=JaredYe04&style=flat&color=blue)


  `;

  // 提交趋势图（使用 SVG 转 PNG，生成浅色和深色两个版本）
  if (commits30Days && commits30Days.length > 0) {
    try {
      const trendSVGLight = generateCommitTrendSVG(commits30Days, false);
      const trendSVGDark = generateCommitTrendSVG(commits30Days, true);
      
      // 生成文件名（基于内容哈希）
      const hashLight = crypto.createHash('sha256').update(trendSVGLight).digest('hex').slice(0, 12);
      const hashDark = crypto.createHash('sha256').update(trendSVGDark).digest('hex').slice(0, 12);
      const imageFilenameLight = `commit-trend-light-${hashLight}.png`;
      const imageFilenameDark = `commit-trend-dark-${hashDark}.png`;
      
      const imagePathLight = saveSVGAsPNG(trendSVGLight, imageFilenameLight, false);
      const imagePathDark = saveSVGAsPNG(trendSVGDark, imageFilenameDark, true);
      
      if (imagePathLight && imagePathDark) {
        echartsCharts += `📈 **过去30天提交趋势**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${imagePathDark}">
  <img src="${imagePathLight}" alt="提交趋势图" width="1000">
</picture>

`;
      } else {
        console.warn('提交趋势图 PNG 保存失败，跳过');
      }
    } catch (error) {
      console.warn('生成提交趋势图表失败:', error.message);
    }
  }

  // 访问统计（通过 visitor-badge 徽章显示，不在这里显示）
  // GitHub API 不提供个人资料主页访问统计，且仓库流量数据需要特殊权限
  // 访问统计已在模板中通过 visitor-badge 徽章显示

  return `###  📊 **过去七天我的编程活动统计**

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

${echartsCharts}`;
}

// 更新 README（基于模板）
async function updateREADME(statsMarkdown) {
  const templatePath = path.join(__dirname, 'README.template.md');
  const readmePath = path.join(__dirname, 'README.md');
  
  // 读取模板文件
  if (!fs.existsSync(templatePath)) {
    console.error('❌ 错误: 找不到 README.template.md 模板文件');
    process.exit(1);
  }
  
  let templateContent = fs.readFileSync(templatePath, 'utf-8');
  
  // 替换占位符
  templateContent = templateContent.replace('{{STATS_SECTION}}', statsMarkdown);
  
  // 生成并替换时间戳
  const timestamp = formatTimestampUTC8();
  templateContent = templateContent.replace('{{UPDATE_TIMESTAMP}}', timestamp);
  
  // 写入 README.md
  fs.writeFileSync(readmePath, templateContent, 'utf-8');
  console.log('✅ README.md 已根据模板更新');
}

// 主函数
async function main() {
  console.log('🚀 开始统计 GitHub 活动数据...');
  console.log(`📌 用户: ${GITHUB_USERNAME}`);
  const last7DaysStart = getLast7DaysStart();
  console.log(`📅 统计周期: 过去七天（从 ${last7DaysStart} 开始）\n`);

  try {
    // 获取过去30天的 commits（用于图表）
    console.log('📦 获取过去30天的 commits（用于图表）...');
    const days30Start = getDaysAgoStart(30);
    const commits30Days = await getCommitsSince(days30Start, '过去30天 commits');
    console.log(`✅ 找到 ${commits30Days.length} 个 commits（30天）\n`);

    // 获取过去7天的 commits
    console.log('📦 获取过去7天的 commits...');
    const commits = await getLast7DaysCommits();
    console.log(`✅ 找到 ${commits.length} 个 commits（过去7天）\n`);


    if (commits.length === 0) {
      console.log('⚠️ 过去七天暂无 commits，使用空数据');
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
    
    // 清理旧的图片文件
    console.log('\n🗑️  清理旧的图片文件...');
    cleanOldImages();

    console.log('\n✨ 统计完成！');
    console.log(`   - 提交次数（过去7天）: ${commits.length}`);
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

