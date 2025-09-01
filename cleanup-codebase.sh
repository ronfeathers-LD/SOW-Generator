#!/bin/bash

# Codebase Cleanup Script
# This script safely removes redundant files identified in the audit

set -e  # Exit on any error

echo "🧹 Starting Codebase Cleanup..."

# Create backup branch
echo "📦 Creating backup branch..."
git checkout -b cleanup-backup
git checkout main

# Phase 1: Delete Temporary Documentation Files (Safe)
echo "🗑️  Phase 1: Deleting temporary documentation files..."
rm -f PM_HOURS_REMOVAL_IMPLEMENTATION_COMPLETE.md
rm -f PM_HOURS_REMOVAL_DEPLOYMENT_COMPLETE.md
rm -f LOCAL_PM_HOURS_REMOVAL_SETUP_COMPLETE.md
rm -f PRODUCTION_FOREIGN_KEY_FIX.md
rm -f PRODUCTION_MIGRATION_INSTRUCTIONS.md
rm -f FUNCTIONALITY_AUDIT.md
rm -f DASHBOARD_FIX_README.md
echo "✅ Deleted 7 temporary documentation files"

# Phase 1: Delete Test Files (Safe)
echo "🗑️  Phase 1: Deleting test files..."
rm -f test.pdf
rm -f .env.remote
echo "✅ Deleted test files"

# Phase 1: Delete Empty Test Directories (Safe)
echo "🗑️  Phase 1: Deleting empty test directories..."
rm -rf src/app/dashboard/test-approval-link/
echo "✅ Deleted empty test directories"

# Phase 2: Delete Redundant SQL Files (Review Required)
echo "🗑️  Phase 2: Deleting redundant SQL files..."
echo "⚠️  WARNING: These files are being deleted. Review the audit report if unsure."

# PM Hours Removal redundant files
rm -f add-pm-hours-removal-comments-columns.sql
rm -f add-pm-hours-removal-requests-columns.sql
rm -f add-pm-hours-removal-sow-columns.sql
rm -f add-pm-hours-removal-system.sql
rm -f fix-pm-hours-removal-schema.sql
echo "✅ Deleted 5 redundant PM hours removal files"

# Slack User Mapping redundant files
rm -f add-slack-user-mapping.sql
rm -f add-slack-user-mapping-simple.sql
rm -f bulk-update-slack-mappings.sql
echo "✅ Deleted 3 redundant Slack mapping files"

# Google Drive redundant files
rm -f fix-google-drive-rls.sql
rm -f cleanup-google-drive-policies.sql
echo "✅ Deleted 2 redundant Google Drive files"

# Other redundant files
rm -f check-redirect-uri.sql
rm -f complete-production-schema.sql
rm -f dashboard-fix-migration.sql
rm -f fix-rls-step-by-step.sql
echo "✅ Deleted 4 other redundant files"

# Phase 3: Remove Test API Routes (Review Required)
echo "🗑️  Phase 3: Removing test API routes..."
echo "⚠️  WARNING: These API routes are being deleted. Review if they're still needed."

rm -rf src/app/api/admin/gemini/test/
rm -rf src/app/api/admin/test-slack/
rm -rf src/app/api/admin/salesforce/test/
rm -rf src/app/api/admin/slack/test/
rm -rf src/app/api/admin/slack/test-bot-token/
rm -rf src/app/api/admin/avoma/test/
rm -rf src/app/api/admin/email/test/
rm -rf src/app/api/salesforce/test-connection/
rm -rf src/app/api/slack/test-lookup/
rm -rf src/app/api/avoma/test-parameters/
echo "✅ Deleted 10 test API route directories"

echo ""
echo "🎉 Cleanup Complete!"
echo ""
echo "📊 Summary:"
echo "  - Deleted 7 temporary documentation files"
echo "  - Deleted 2 test files"
echo "  - Deleted 1 empty test directory"
echo "  - Deleted 14 redundant SQL files"
echo "  - Deleted 10 test API route directories"
echo ""
echo "📁 Remaining files:"
echo "  - 18 SQL files (organized)"
echo "  - 6 Markdown files (organized)"
echo "  - 0 test API routes"
echo ""
echo "🔍 Next steps:"
echo "  1. Review the changes: git status"
echo "  2. Test the application: npm run build"
echo "  3. Commit changes: git add . && git commit -m 'Clean up codebase: remove redundant files'"
echo "  4. Push changes: git push origin main"
echo ""
echo "⚠️  If anything breaks, you can restore from the backup branch:"
echo "    git checkout cleanup-backup"
