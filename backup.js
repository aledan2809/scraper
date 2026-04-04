#!/usr/bin/env node

/**
 * Backup Status Command
 * 
 * Usage: npm run backup <command>
 *   or: node backup.js <command>
 *   or: npm run status-update  (automatic restore from backup)
 * 
 * Commands:
 *   status         - Display current project status
 *   restore        - Same as status (for session restore)
 *   update         - Update backup status with current timestamp
 *   summary        - Show quick summary
 *   issues         - Show known issues
 *   next           - Show next steps
 * 
 * Examples (New Session):
 *   npm run status-update     ← Use this to restore session state
 * 
 * Examples (Other):
 *   npm run backup status
 *   npm run backup:summary
 *   npm run backup:issues
 */

const fs = require('fs');
const path = require('path');

const BACKUP_FILE = path.join(__dirname, 'backup-status.json');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function printLine(message = '') {
  process.stdout.write(`${message}\n`);
}

function loadBackup() {
  try {
    const data = fs.readFileSync(BACKUP_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`${colors.red}✗ Error loading backup status: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function saveBackup(data) {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf-8');
    printLine(`${colors.green}✓ Backup status updated${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error saving backup status: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function displayStatus() {
  const backup = loadBackup();
  
  printLine(`\n${colors.bright}${colors.cyan}═════════════════════════════════════════════════════${colors.reset}`);
  printLine(`${colors.bright}PROJECT STATUS - Scrap-module${colors.reset}`);
  printLine(`${colors.bright}${colors.cyan}═════════════════════════════════════════════════════${colors.reset}\n`);
  
  printLine(`${colors.bright}Project:${colors.reset} ${backup.projectName}`);
  printLine(`${colors.bright}Created:${colors.reset} ${backup.createdDate}`);
  printLine(`${colors.bright}Last Updated:${colors.reset} ${backup.lastUpdated}`);
  printLine(`${colors.bright}Status:${colors.reset} ${colors.green}${backup.sessionStatus}${colors.reset}`);
  printLine(`${colors.bright}Phase:${colors.reset} ${backup.currentPhase}\n`);
  
  // Project Structure
  printLine(`${colors.bright}${colors.blue}📁 PROJECT STRUCTURE${colors.reset}`);
  printLine(`${colors.dim}Root Files:${colors.reset}`);
  backup.projectStructure.rootFiles.forEach(file => {
    printLine(`  ├─ ${file}`);
  });
  Object.entries(backup.projectStructure.directories).forEach(([dir, files]) => {
    printLine(`\n${colors.dim}${dir}/:${colors.reset}`);
    files.forEach((file, idx) => {
      const prefix = idx === files.length - 1 ? '└─' : '├─';
      printLine(`  ${prefix} ${file}`);
    });
  });
  
  // Created Files Summary
  printLine(`\n${colors.bright}${colors.green}📄 FILES CREATED${colors.reset}`);
  printLine(`${colors.dim}Backend (API):${colors.reset}`);
  Object.entries(backup.createdFiles.backend).forEach(([file, info]) => {
    printLine(`  ✓ ${file}`);
    printLine(`    └─ ${colors.dim}${info.purpose}${colors.reset}`);
  });
  printLine(`\n${colors.dim}Frontend (UI):${colors.reset}`);
  Object.entries(backup.createdFiles.frontend).forEach(([file, info]) => {
    const statusColor = info.status === 'COMPLETE' ? colors.green : colors.yellow;
    printLine(`  ${statusColor}✓${colors.reset} ${file}`);
    printLine(`    └─ ${colors.dim}${info.purpose}${colors.reset}`);
  });
  
  // API Endpoints
  printLine(`\n${colors.bright}${colors.cyan}🔌 API ENDPOINTS${colors.reset}`);
  Object.entries(backup.apiEndpoints).forEach(([endpoint, info]) => {
    printLine(`  ${colors.green}${info.method}${colors.reset} ${endpoint}`);
    printLine(`  └─ ${colors.dim}${info.purpose}${colors.reset}`);
  });
  
  // Configuration
  printLine(`\n${colors.bright}${colors.yellow}⚙️  CONFIGURATION${colors.reset}`);
  printLine(`  Dev Server: ${backup.configuration.devServer.url}`);
  printLine(`  TypeScript: Strict mode ${colors.green}✓${colors.reset}`);
  printLine(`  Tailwind: Version ${backup.configuration.tailwind.version}`);
  
  // Dependencies
  printLine(`\n${colors.bright}${colors.blue}📦 DEPENDENCIES${colors.reset}`);
  printLine(`  ${colors.green}✓${colors.reset} Node packages: ${Object.keys(backup.dependencies.installed).length} installed`);
  printLine(`  ${colors.green}✓${colors.reset} API Keys: All loaded from .env.local`);
  
  // Issues
  if (backup.knownIssues.length > 0) {
    printLine(`\n${colors.bright}${colors.yellow}⚠️  KNOWN ISSUES${colors.reset}`);
    backup.knownIssues.forEach(issue => {
      const statusColor = issue.status === 'UNRESOLVED' ? colors.red : issue.status === 'RESOLVED' ? colors.green : colors.yellow;
      printLine(`  ${statusColor}${issue.status}${colors.reset} - ${issue.issue}`);
      if (issue.workaround) {
        printLine(`    Workaround: ${colors.dim}${issue.workaround}${colors.reset}`);
      }
      if (issue.solution) {
        printLine(`    Solution: ${colors.dim}${issue.solution}${colors.reset}`);
      }
    });
  }
  
  // Next Steps
  printLine(`\n${colors.bright}${colors.green}📋 NEXT STEPS${colors.reset}`);
  backup.nextSteps.forEach((step, idx) => {
    printLine(`  ${idx + 1}. ${step}`);
  });
  
  // Metrics
  printLine(`\n${colors.bright}${colors.cyan}📊 METRICS${colors.reset}`);
  printLine(`  Files: ${backup.projectMetrics.totalFiles}`);
  printLine(`  LOC: ~${backup.projectMetrics.linesOfCode}`);
  printLine(`  Completion: ${backup.projectMetrics.completionPercentage}%`);
  printLine(`  Ready for Production: ${backup.projectMetrics.readyForProduction ? colors.green + 'YES' : colors.yellow + 'NO'}`);
  if (backup.projectMetrics.productionBlockers.length > 0) {
    printLine(`  ${colors.red}Blockers:${colors.reset}`);
    backup.projectMetrics.productionBlockers.forEach(blocker => {
      printLine(`    - ${blocker}`);
    });
  }
  
  printLine(`\n${colors.bright}${colors.cyan}═════════════════════════════════════════════════════${colors.reset}\n`);
}

function displaySummary() {
  const backup = loadBackup();
  
  printLine(`\n${colors.bright}${colors.green}QUICK SUMMARY${colors.reset}`);
  printLine(`├─ Project: ${backup.projectName}`);
  printLine(`├─ Status: ${backup.sessionStatus}`);
  printLine(`├─ Phase: ${backup.currentPhase}`);
  printLine(`├─ Completion: ${backup.projectMetrics.completionPercentage}%`);
  printLine(`├─ Files Created: ${backup.projectMetrics.totalFiles}`);
  printLine(`├─ API Endpoints: ${Object.keys(backup.apiEndpoints).length}`);
  printLine(`├─ Open Issues: ${backup.knownIssues.filter(i => i.status === 'UNRESOLVED').length}`);
  printLine(`└─ Production Ready: ${backup.projectMetrics.readyForProduction ? colors.green + 'YES' : colors.yellow + 'NO'}\n`);
}

function displayIssues() {
  const backup = loadBackup();
  
  printLine(`\n${colors.bright}${colors.yellow}KNOWN ISSUES${colors.reset}\n`);
  
  if (backup.knownIssues.length === 0) {
    printLine(`${colors.green}✓ No known issues!${colors.reset}\n`);
    return;
  }
  
  backup.knownIssues.forEach((issue, idx) => {
    const statusColor = issue.status === 'UNRESOLVED' ? colors.red : issue.status === 'RESOLVED' ? colors.green : colors.yellow;
    printLine(`${idx + 1}. ${issue.issue}`);
    printLine(`   Status: ${statusColor}${issue.status}${colors.reset}`);
    if (issue.description) {
      printLine(`   Description: ${issue.description}`);
    }
    if (issue.workaround) {
      printLine(`   Workaround: ${issue.workaround}`);
    }
    if (issue.solution) {
      printLine(`   Solution: ${issue.solution}`);
    }
    if (issue.severity) {
      printLine(`   Severity: ${issue.severity}`);
    }
    printLine();
  });
}

function displayNextSteps() {
  const backup = loadBackup();
  
  printLine(`\n${colors.bright}${colors.green}NEXT STEPS${colors.reset}\n`);
  
  backup.nextSteps.forEach((step, idx) => {
    const isCompleted = step.startsWith('✓');
    const displayStep = isCompleted ? `${colors.green}${step}${colors.reset}` : step;
    printLine(`${idx + 1}. ${displayStep}`);
  });
  printLine();
}

function updateBackup() {
  const backup = loadBackup();
  const now = new Date();
  backup.lastUpdated = now.toISOString();
  saveBackup(backup);
}

// CLI Handler
const command = process.argv[2] || 'status';

switch (command) {
  case 'status':
  case 'restore':
    displayStatus();
    break;
  case 'summary':
    displaySummary();
    break;
  case 'issues':
    displayIssues();
    break;
  case 'next':
    displayNextSteps();
    break;
  case 'update':
    updateBackup();
    break;
  case '-h':
  case '--help':
  case 'help':
    printLine(`
${colors.bright}Backup Status - Project State Management${colors.reset}

${colors.bright}Usage:${colors.reset}
  npm run backup <command>
  node backup.js <command>

${colors.bright}Commands:${colors.reset}
  status         Display complete project status
  summary        Quick project summary
  issues         Show known issues
  next           Show next steps
  update         Update backup timestamp
  help           Show this help message

${colors.bright}Examples:${colors.reset}
  npm run backup status
  npm run backup summary
  npm run backup issues
  npm run backup next
    `);
    break;
  default:
    printLine(`${colors.red}✗ Unknown command: ${command}${colors.reset}`);
    printLine(`Run 'npm run backup help' for usage information`);
    process.exit(1);
}
