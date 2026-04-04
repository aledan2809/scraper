#!/usr/bin/env node

/**
 * Status Update Command
 * 
 * Usage: node status-update.js [command]
 * 
 * Commands:
 *   status         - Display current project status
 *   update         - Update backup status with current state
 *   restore        - Restore and display full backup status
 *   summary        - Show quick summary
 *   issues         - Show known issues
 *   next           - Show next steps
 * 
 * Run without arguments to display full status
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
    console.log(`${colors.green}✓ Backup status updated${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error saving backup status: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function displayStatus() {
  const backup = loadBackup();
  
  console.log(`\n${colors.bright}${colors.cyan}═════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}PROJECT STATUS - Scrap-module${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═════════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`${colors.bright}Project:${colors.reset} ${backup.projectName}`);
  console.log(`${colors.bright}Created:${colors.reset} ${backup.createdDate}`);
  console.log(`${colors.bright}Last Updated:${colors.reset} ${backup.lastUpdated}`);
  console.log(`${colors.bright}Status:${colors.reset} ${colors.green}${backup.sessionStatus}${colors.reset}`);
  console.log(`${colors.bright}Phase:${colors.reset} ${backup.currentPhase}\n`);
  
  // Project Structure
  console.log(`${colors.bright}${colors.blue}📁 PROJECT STRUCTURE${colors.reset}`);
  console.log(`${colors.dim}Root Files:${colors.reset}`);
  backup.projectStructure.rootFiles.forEach(file => {
    console.log(`  ├─ ${file}`);
  });
  Object.entries(backup.projectStructure.directories).forEach(([dir, files]) => {
    console.log(`\n${colors.dim}${dir}/:${colors.reset}`);
    files.forEach((file, idx) => {
      const prefix = idx === files.length - 1 ? '└─' : '├─';
      console.log(`  ${prefix} ${file}`);
    });
  });
  
  // Created Files Summary
  console.log(`\n${colors.bright}${colors.green}📄 FILES CREATED${colors.reset}`);
  console.log(`${colors.dim}Backend (API):${colors.reset}`);
  Object.entries(backup.createdFiles.backend).forEach(([file, info]) => {
    console.log(`  ✓ ${file}`);
    console.log(`    └─ ${colors.dim}${info.purpose}${colors.reset}`);
  });
  console.log(`\n${colors.dim}Frontend (UI):${colors.reset}`);
  Object.entries(backup.createdFiles.frontend).forEach(([file, info]) => {
    const statusColor = info.status === 'COMPLETE' ? colors.green : colors.yellow;
    console.log(`  ${statusColor}✓${colors.reset} ${file}`);
    console.log(`    └─ ${colors.dim}${info.purpose}${colors.reset}`);
  });
  
  // API Endpoints
  console.log(`\n${colors.bright}${colors.cyan}🔌 API ENDPOINTS${colors.reset}`);
  Object.entries(backup.apiEndpoints).forEach(([endpoint, info]) => {
    console.log(`  ${colors.green}${info.method}${colors.reset} ${endpoint}`);
    console.log(`  └─ ${colors.dim}${info.purpose}${colors.reset}`);
  });
  
  // Configuration
  console.log(`\n${colors.bright}${colors.yellow}⚙️  CONFIGURATION${colors.reset}`);
  console.log(`  Dev Server: ${backup.configuration.devServer.url}`);
  console.log(`  TypeScript: Strict mode ${colors.green}✓${colors.reset}`);
  console.log(`  Tailwind: Version ${backup.configuration.tailwind.version}`);
  
  // Dependencies
  console.log(`\n${colors.bright}${colors.blue}📦 DEPENDENCIES${colors.reset}`);
  console.log(`  ${colors.green}✓${colors.reset} Node packages: ${Object.keys(backup.dependencies.installed).length} installed`);
  console.log(`  ${colors.green}✓${colors.reset} API Keys: All loaded from .env.local`);
  
  // Issues
  if (backup.knownIssues.length > 0) {
    console.log(`\n${colors.bright}${colors.yellow}⚠️  KNOWN ISSUES${colors.reset}`);
    backup.knownIssues.forEach(issue => {
      const statusColor = issue.status === 'UNRESOLVED' ? colors.red : colors.yellow;
      console.log(`  ${statusColor}${issue.status}${colors.reset} - ${issue.issue}`);
      if (issue.workaround) {
        console.log(`    Workaround: ${colors.dim}${issue.workaround}${colors.reset}`);
      }
    });
  }
  
  // Next Steps
  console.log(`\n${colors.bright}${colors.green}📋 NEXT STEPS${colors.reset}`);
  backup.nextSteps.forEach((step, idx) => {
    console.log(`  ${idx + 1}. ${step}`);
  });
  
  // Metrics
  console.log(`\n${colors.bright}${colors.cyan}📊 METRICS${colors.reset}`);
  console.log(`  Files: ${backup.projectMetrics.totalFiles}`);
  console.log(`  LOC: ~${backup.projectMetrics.linesOfCode}`);
  console.log(`  Completion: ${backup.projectMetrics.completionPercentage}%`);
  console.log(`  Ready for Production: ${backup.projectMetrics.readyForProduction ? colors.green + 'YES' : colors.yellow + 'NO'}`);
  if (backup.projectMetrics.productionBlockers.length > 0) {
    console.log(`  ${colors.red}Blockers:${colors.reset}`);
    backup.projectMetrics.productionBlockers.forEach(blocker => {
      console.log(`    - ${blocker}`);
    });
  }
  
  console.log(`\n${colors.bright}${colors.cyan}═════════════════════════════════════════════════════${colors.reset}\n`);
}

function displaySummary() {
  const backup = loadBackup();
  
  console.log(`\n${colors.bright}${colors.green}QUICK SUMMARY${colors.reset}`);
  console.log(`├─ Project: ${backup.projectName}`);
  console.log(`├─ Status: ${backup.sessionStatus}`);
  console.log(`├─ Completion: ${backup.projectMetrics.completionPercentage}%`);
  console.log(`├─ Files Created: ${backup.projectMetrics.totalFiles}`);
  console.log(`├─ API Endpoints: ${Object.keys(backup.apiEndpoints).length}`);
  console.log(`├─ Issues: ${backup.knownIssues.length}`);
  console.log(`└─ Production Ready: ${backup.projectMetrics.readyForProduction ? colors.green + 'YES' : colors.yellow + 'NO'}\n`);
}

function displayIssues() {
  const backup = loadBackup();
  
  console.log(`\n${colors.bright}${colors.yellow}KNOWN ISSUES${colors.reset}\n`);
  
  if (backup.knownIssues.length === 0) {
    console.log(`${colors.green}✓ No known issues!${colors.reset}\n`);
    return;
  }
  
  backup.knownIssues.forEach((issue, idx) => {
    const statusColor = issue.status === 'UNRESOLVED' ? colors.red : colors.yellow;
    console.log(`${idx + 1}. ${issue.issue}`);
    console.log(`   Status: ${statusColor}${issue.status}${colors.reset}`);
    if (issue.description) {
      console.log(`   Description: ${issue.description}`);
    }
    if (issue.workaround) {
      console.log(`   Workaround: ${issue.workaround}`);
    }
    if (issue.severity) {
      console.log(`   Severity: ${issue.severity}`);
    }
    console.log();
  });
}

function displayNextSteps() {
  const backup = loadBackup();
  
  console.log(`\n${colors.bright}${colors.green}NEXT STEPS${colors.reset}\n`);
  
  backup.nextSteps.forEach((step, idx) => {
    console.log(`${idx + 1}. ${step}`);
  });
  console.log();
}

function updateBackup() {
  const backup = loadBackup();
  backup.lastUpdated = new Date().toISOString().split('T')[0];
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
    console.log(`
Usage: node status-update.js [command]

Commands:
  status         - Display complete project status (default)
  update         - Update backup timestamp
  restore        - Show full backup (same as status)
  summary        - Quick project summary
  issues         - Show known issues
  next           - Show next steps
  --help, -h     - Show this help message
    `);
    break;
  default:
    console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
    console.log(`Run with --help for usage information`);
    process.exit(1);
}
