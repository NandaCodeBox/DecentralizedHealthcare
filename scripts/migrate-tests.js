#!/usr/bin/env node

// Test Migration Script
// Gradually migrates tests to use new response format and test utilities

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class TestMigrator {
  constructor() {
    this.migratedFiles = 0;
    this.totalReplacements = 0;
  }

  /**
   * Migration patterns for common test assertions
   */
  getMigrationPatterns() {
    return [
      // Response body parsing with error expectations
      {
        pattern: /expect\(JSON\.parse\(result\.body\)\.error\)\.toBe\('([^']+)'\)/g,
        replacement: "TestHelpers.expectError(result, '$1')"
      },
      {
        pattern: /expect\(JSON\.parse\(result\.body\)\)\.toEqual\(\{\s*error:\s*'([^']+)'\s*\}\)/g,
        replacement: "TestHelpers.expectError(result, '$1')"
      },
      
      // Response body parsing with message expectations
      {
        pattern: /expect\(JSON\.parse\(result\.body\)\.message\)\.toBe\('([^']+)'\)/g,
        replacement: "TestHelpers.expectSuccess(result, '$1')"
      },
      
      // Response body parsing for data access
      {
        pattern: /const\s+(\w+)\s*=\s*JSON\.parse\(result\.body\)/g,
        replacement: "const $1 = TestHelpers.getLegacyResponseBody(result)"
      },
      
      // Response body parsing inline
      {
        pattern: /JSON\.parse\(result\.body\)/g,
        replacement: "TestHelpers.getLegacyResponseBody(result)"
      },
      
      // Add TestHelpers import if not present
      {
        pattern: /^(import.*from.*aws-lambda.*;\s*)$/m,
        replacement: "$1\nimport { TestHelpers } from '../../../src/utils/test-helpers';"
      }
    ];
  }

  /**
   * Migrate a single test file
   */
  migrateFile(filePath) {
    console.log(`Migrating: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let fileChanged = false;
    let replacements = 0;

    // Apply migration patterns
    this.getMigrationPatterns().forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        replacements += matches.length;
        fileChanged = true;
      }
    });

    // Add import if TestHelpers is used but not imported
    if (content.includes('TestHelpers.') && !content.includes("from '../../../src/utils/test-helpers'")) {
      const importMatch = content.match(/^(import.*from.*aws-lambda.*;\s*)/m);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          importMatch[0] + "\nimport { TestHelpers } from '../../../src/utils/test-helpers';\n"
        );
        fileChanged = true;
        replacements++;
      }
    }

    if (fileChanged) {
      // Create backup
      fs.writeFileSync(filePath + '.backup', fs.readFileSync(filePath));
      
      // Write migrated content
      fs.writeFileSync(filePath, content);
      
      console.log(`  ✅ Migrated with ${replacements} replacements`);
      this.migratedFiles++;
      this.totalReplacements += replacements;
    } else {
      console.log(`  ⏭️  No changes needed`);
    }
  }

  /**
   * Migrate all test files
   */
  migrateAllTests() {
    console.log('🚀 Starting test migration...\n');

    // Find all test files
    const testFiles = glob.sync('src/**/*.test.ts', { cwd: process.cwd() });
    
    console.log(`Found ${testFiles.length} test files\n`);

    testFiles.forEach(file => {
      try {
        this.migrateFile(file);
      } catch (error) {
        console.error(`❌ Error migrating ${file}:`, error.message);
      }
    });

    console.log(`\n📊 Migration Summary:`);
    console.log(`  Files migrated: ${this.migratedFiles}/${testFiles.length}`);
    console.log(`  Total replacements: ${this.totalReplacements}`);
    console.log(`\n✨ Migration complete!`);
  }

  /**
   * Rollback migrations (restore from backups)
   */
  rollback() {
    console.log('🔄 Rolling back migrations...\n');

    const backupFiles = glob.sync('src/**/*.test.ts.backup', { cwd: process.cwd() });
    
    backupFiles.forEach(backupFile => {
      const originalFile = backupFile.replace('.backup', '');
      fs.copyFileSync(backupFile, originalFile);
      fs.unlinkSync(backupFile);
      console.log(`  ↩️  Restored ${originalFile}`);
    });

    console.log(`\n✅ Rollback complete! Restored ${backupFiles.length} files`);
  }

  /**
   * Clean up backup files
   */
  cleanBackups() {
    console.log('🧹 Cleaning up backup files...\n');

    const backupFiles = glob.sync('src/**/*.test.ts.backup', { cwd: process.cwd() });
    
    backupFiles.forEach(backupFile => {
      fs.unlinkSync(backupFile);
      console.log(`  🗑️  Deleted ${backupFile}`);
    });

    console.log(`\n✅ Cleaned up ${backupFiles.length} backup files`);
  }
}

// CLI interface
const command = process.argv[2];
const migrator = new TestMigrator();

switch (command) {
  case 'migrate':
    migrator.migrateAllTests();
    break;
  case 'rollback':
    migrator.rollback();
    break;
  case 'clean':
    migrator.cleanBackups();
    break;
  default:
    console.log(`
Usage: node scripts/migrate-tests.js <command>

Commands:
  migrate   - Migrate all test files to new response format
  rollback  - Rollback migrations (restore from backups)
  clean     - Clean up backup files

Examples:
  node scripts/migrate-tests.js migrate
  node scripts/migrate-tests.js rollback
  node scripts/migrate-tests.js clean
`);
}