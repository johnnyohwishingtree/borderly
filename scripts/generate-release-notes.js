#!/usr/bin/env node

/**
 * Borderly Release Notes Generator
 * Automatically generates release notes from git commits, pull requests, and issue tracker
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Commit types and their display names
  commitTypes: {
    feat: '✨ New Features',
    fix: '🐛 Bug Fixes',
    perf: '⚡ Performance Improvements',
    refactor: '♻️ Code Refactoring',
    docs: '📚 Documentation',
    test: '🧪 Testing',
    ci: '👷 CI/CD',
    build: '📦 Build System',
    chore: '🔧 Maintenance',
    style: '💄 Styling',
    revert: '⏪ Reverts',
    security: '🔒 Security'
  },
  
  // Section priorities (higher = shown first)
  sectionPriority: {
    'security': 1000,
    'feat': 900,
    'fix': 800,
    'perf': 700,
    'refactor': 600,
    'docs': 500,
    'test': 400,
    'style': 300,
    'ci': 200,
    'build': 100,
    'chore': 50
  },
  
  // Breaking change keywords
  breakingKeywords: ['BREAKING CHANGE', 'BREAKING:', 'breaking change'],
  
  // Default output file
  outputFile: 'CHANGELOG.md'
};

/**
 * Execute shell command and return output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return '';
    }
    throw error;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    fromTag: null,
    toTag: 'HEAD',
    version: null,
    outputFile: CONFIG.outputFile,
    format: 'markdown',
    includeBreaking: true,
    includePRs: true,
    includeIssues: true,
    groupByType: true,
    updateChangelog: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--from':
      case '-f':
        options.fromTag = args[++i];
        break;
      case '--to':
      case '-t':
        options.toTag = args[++i];
        break;
      case '--version':
      case '-v':
        options.version = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputFile = args[++i];
        break;
      case '--format':
        options.format = args[++i];
        break;
      case '--no-breaking':
        options.includeBreaking = false;
        break;
      case '--no-prs':
        options.includePRs = false;
        break;
      case '--no-issues':
        options.includeIssues = false;
        break;
      case '--no-grouping':
        options.groupByType = false;
        break;
      case '--update':
      case '-u':
        options.updateChangelog = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Borderly Release Notes Generator

Usage: node generate-release-notes.js [OPTIONS]

Options:
  -f, --from TAG        Start tag/commit (default: latest tag)
  -t, --to TAG          End tag/commit (default: HEAD)
  -v, --version VER     Release version (e.g., 1.0.0)
  -o, --output FILE     Output file (default: CHANGELOG.md)
  --format FORMAT       Output format: markdown|json|text (default: markdown)
  --no-breaking         Exclude breaking changes section
  --no-prs              Don't include PR information
  --no-issues           Don't include issue references
  --no-grouping         Don't group commits by type
  -u, --update          Update existing changelog
  --verbose             Verbose output
  -h, --help            Show this help message

Examples:
  # Generate release notes since last tag
  node generate-release-notes.js -v 1.2.0

  # Generate notes between specific tags
  node generate-release-notes.js -f v1.0.0 -t v1.1.0 -v 1.1.0

  # Update existing changelog
  node generate-release-notes.js -v 1.2.0 --update

  # Generate JSON format
  node generate-release-notes.js -v 1.2.0 --format json -o release.json
`);
}

/**
 * Get git commit range
 */
function getCommitRange(options) {
  let from = options.fromTag;
  
  if (!from) {
    // Get latest tag
    const latestTag = exec('git describe --tags --abbrev=0', { allowFailure: true });
    from = latestTag || exec('git rev-list --max-parents=0 HEAD');
  }

  return { from, to: options.toTag };
}

/**
 * Parse conventional commit
 */
function parseCommit(commitLine) {
  const [hash, ...messageParts] = commitLine.split(' ');
  const fullMessage = messageParts.join(' ');
  
  // Parse conventional commit format: type(scope): description
  const conventionalMatch = fullMessage.match(/^(\w+)(?:\(([^)]+)\))?: (.+)/);
  
  if (conventionalMatch) {
    const [, type, scope, description] = conventionalMatch;
    return {
      hash: hash.substring(0, 8),
      type,
      scope,
      description,
      fullMessage,
      isConventional: true
    };
  }

  // Fall back to categorizing by keywords
  const lowerMessage = fullMessage.toLowerCase();
  let type = 'chore';
  
  if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
    type = 'fix';
  } else if (lowerMessage.includes('feat') || lowerMessage.includes('add') || lowerMessage.includes('new')) {
    type = 'feat';
  } else if (lowerMessage.includes('update') || lowerMessage.includes('improve')) {
    type = 'refactor';
  } else if (lowerMessage.includes('test')) {
    type = 'test';
  } else if (lowerMessage.includes('doc')) {
    type = 'docs';
  }

  return {
    hash: hash.substring(0, 8),
    type,
    scope: null,
    description: fullMessage,
    fullMessage,
    isConventional: false
  };
}

/**
 * Get commits in range
 */
function getCommits(from, to, options) {
  const gitLog = exec(`git log ${from}..${to} --oneline --no-merges`);
  
  if (!gitLog) {
    return [];
  }

  const commits = gitLog.split('\n').map(parseCommit);
  
  if (options.verbose) {
    console.log(`Found ${commits.length} commits`);
  }

  return commits;
}

/**
 * Get breaking changes from commit messages
 */
function getBreakingChanges(commits) {
  const breaking = [];
  
  commits.forEach(commit => {
    // Check for breaking change indicators
    CONFIG.breakingKeywords.forEach(keyword => {
      if (commit.fullMessage.toLowerCase().includes(keyword.toLowerCase())) {
        breaking.push({
          ...commit,
          breakingDescription: commit.description
        });
      }
    });
  });

  return breaking;
}

/**
 * Group commits by type
 */
function groupCommitsByType(commits) {
  const groups = {};
  
  commits.forEach(commit => {
    if (!groups[commit.type]) {
      groups[commit.type] = [];
    }
    groups[commit.type].push(commit);
  });

  // Sort groups by priority
  const sortedGroups = Object.entries(groups).sort((a, b) => {
    const priorityA = CONFIG.sectionPriority[a[0]] || 0;
    const priorityB = CONFIG.sectionPriority[b[0]] || 0;
    return priorityB - priorityA;
  });

  return Object.fromEntries(sortedGroups);
}

/**
 * Get PR and issue references from commit messages
 */
function extractReferences(commits) {
  const prs = new Set();
  const issues = new Set();
  
  commits.forEach(commit => {
    // Extract PR references (#123)
    const prMatches = commit.fullMessage.match(/#(\d+)/g);
    if (prMatches) {
      prMatches.forEach(match => {
        const num = match.substring(1);
        if (commit.fullMessage.toLowerCase().includes('pull request') || 
            commit.fullMessage.toLowerCase().includes('merge')) {
          prs.add(num);
        } else {
          issues.add(num);
        }
      });
    }
    
    // Extract "Closes #123" references
    const closesMatches = commit.fullMessage.match(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi);
    if (closesMatches) {
      closesMatches.forEach(match => {
        const num = match.match(/\d+/)[0];
        issues.add(num);
      });
    }
  });

  return {
    prs: Array.from(prs),
    issues: Array.from(issues)
  };
}

/**
 * Generate markdown release notes
 */
function generateMarkdown(data, options) {
  let markdown = '';
  
  // Header
  if (options.version) {
    markdown += `## [${options.version}]`;
    markdown += ` - ${new Date().toISOString().split('T')[0]}\n\n`;
  } else {
    markdown += `## Release Notes\n\n`;
  }

  // Breaking changes (if any)
  if (options.includeBreaking && data.breaking.length > 0) {
    markdown += `### 💥 BREAKING CHANGES\n\n`;
    data.breaking.forEach(change => {
      markdown += `- ${change.breakingDescription} (${change.hash})\n`;
    });
    markdown += '\n';
  }

  // Grouped changes
  if (options.groupByType) {
    Object.entries(data.groupedCommits).forEach(([type, commits]) => {
      const sectionTitle = CONFIG.commitTypes[type] || `📝 ${type}`;
      markdown += `### ${sectionTitle}\n\n`;
      
      commits.forEach(commit => {
        let line = `- ${commit.description}`;
        if (commit.scope) {
          line = `- **${commit.scope}**: ${commit.description}`;
        }
        line += ` (${commit.hash})`;
        markdown += `${line}\n`;
      });
      markdown += '\n';
    });
  } else {
    // Simple list
    markdown += `### Changes\n\n`;
    data.commits.forEach(commit => {
      markdown += `- ${commit.description} (${commit.hash})\n`;
    });
    markdown += '\n';
  }

  // References
  if (options.includePRs && data.references.prs.length > 0) {
    markdown += `### Pull Requests\n\n`;
    data.references.prs.forEach(pr => {
      markdown += `- #${pr}\n`;
    });
    markdown += '\n';
  }

  if (options.includeIssues && data.references.issues.length > 0) {
    markdown += `### Closed Issues\n\n`;
    data.references.issues.forEach(issue => {
      markdown += `- #${issue}\n`;
    });
    markdown += '\n';
  }

  // Stats
  markdown += `### Statistics\n\n`;
  markdown += `- **Total commits**: ${data.commits.length}\n`;
  markdown += `- **Contributors**: ${data.stats.contributors}\n`;
  if (data.breaking.length > 0) {
    markdown += `- **Breaking changes**: ${data.breaking.length}\n`;
  }
  markdown += '\n';

  return markdown;
}

/**
 * Generate JSON release notes
 */
function generateJSON(data, options) {
  return JSON.stringify({
    version: options.version,
    date: new Date().toISOString(),
    summary: {
      totalCommits: data.commits.length,
      contributors: data.stats.contributors,
      breakingChanges: data.breaking.length
    },
    sections: {
      breaking: data.breaking,
      commits: options.groupByType ? data.groupedCommits : data.commits,
      references: data.references
    }
  }, null, 2);
}

/**
 * Generate text release notes
 */
function generateText(data, options) {
  let text = '';
  
  if (options.version) {
    text += `Release ${options.version}\n`;
    text += `${new Date().toISOString().split('T')[0]}\n\n`;
  }

  text += `Summary: ${data.commits.length} commits`;
  if (data.breaking.length > 0) {
    text += `, ${data.breaking.length} breaking changes`;
  }
  text += '\n\n';

  // Changes
  data.commits.forEach((commit, index) => {
    text += `${index + 1}. ${commit.description} (${commit.hash})\n`;
  });

  return text;
}

/**
 * Get contributor stats
 */
function getStats(from, to) {
  const contributors = exec(`git log ${from}..${to} --format='%ae' | sort | uniq | wc -l`).trim();
  
  return {
    contributors: parseInt(contributors) || 0
  };
}

/**
 * Update existing changelog
 */
function updateChangelog(newContent, outputFile) {
  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, newContent);
    return;
  }

  const existingContent = fs.readFileSync(outputFile, 'utf8');
  
  // Insert new content after the first line (usually # Changelog)
  const lines = existingContent.split('\n');
  const headerEnd = Math.max(0, lines.findIndex(line => line.startsWith('#') || line.startsWith('##')) + 1);
  
  const updatedContent = [
    ...lines.slice(0, headerEnd),
    '',
    newContent,
    ...lines.slice(headerEnd)
  ].join('\n');

  fs.writeFileSync(outputFile, updatedContent);
}

/**
 * Main function
 */
function main() {
  const options = parseArgs();
  
  try {
    if (options.verbose) {
      console.log('Generating release notes...');
      console.log('Options:', JSON.stringify(options, null, 2));
    }

    // Get commit range
    const { from, to } = getCommitRange(options);
    
    if (options.verbose) {
      console.log(`Analyzing commits from ${from} to ${to}`);
    }

    // Get commits and process them
    const commits = getCommits(from, to, options);
    const breaking = getBreakingChanges(commits);
    const groupedCommits = groupCommitsByType(commits);
    const references = extractReferences(commits);
    const stats = getStats(from, to);

    const data = {
      commits,
      breaking,
      groupedCommits,
      references,
      stats
    };

    // Generate output
    let output;
    switch (options.format) {
      case 'json':
        output = generateJSON(data, options);
        break;
      case 'text':
        output = generateText(data, options);
        break;
      default:
        output = generateMarkdown(data, options);
    }

    // Write or update file
    if (options.updateChangelog && options.format === 'markdown') {
      updateChangelog(output, options.outputFile);
      console.log(`Updated ${options.outputFile}`);
    } else {
      fs.writeFileSync(options.outputFile, output);
      console.log(`Generated ${options.outputFile}`);
    }

    if (options.verbose) {
      console.log(`\nSummary:`);
      console.log(`- ${commits.length} commits processed`);
      console.log(`- ${stats.contributors} contributors`);
      console.log(`- ${breaking.length} breaking changes`);
      console.log(`- ${references.prs.length} PRs, ${references.issues.length} issues referenced`);
    }

  } catch (error) {
    console.error('Error generating release notes:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateMarkdown,
  generateJSON,
  generateText,
  parseCommit,
  getCommits,
  getBreakingChanges,
  groupCommitsByType
};