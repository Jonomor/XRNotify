#!/bin/bash
# XRNotify Cleanup Script
# Removes duplicate ./src/ directory that conflicts with monorepo structure
# Run from repo root: ./scripts/cleanup-duplicates.sh

set -e

echo "🧹 XRNotify Duplicate Cleanup Script"
echo "======================================"
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    echo "❌ Error: Run this script from the xrnotify repo root"
    exit 1
fi

# Show what will be removed
echo "📋 The following duplicate files in ./src/ will be removed:"
echo ""
if [ -d "src" ]; then
    find src -type f | while read f; do echo "   - $f"; done
    echo ""
    
    # Count files
    FILE_COUNT=$(find src -type f | wc -l | tr -d ' ')
    echo "   Total: $FILE_COUNT files"
    echo ""
else
    echo "   ✅ No ./src/ directory found - already clean!"
fi

# Also check for duplicate root-level configs that should be removed
echo ""
echo "📋 The following duplicate root-level files will be removed (if they exist):"
DUPLICATES_TO_REMOVE=(
    "docker-compose.yml"           # duplicate of ops/docker-compose.yml
    "tsconfig.json"                # duplicate of tsconfig.base.json
    "Dockerfile"                   # use ops/docker/Dockerfile.*
    "migrations"                   # duplicate of apps/platform/src/lib/db/migrations/
    "monitoring"                   # duplicate of ops/monitoring/
)

for f in "${DUPLICATES_TO_REMOVE[@]}"; do
    if [ -e "$f" ]; then
        echo "   - $f"
    fi
done

echo ""
read -p "⚠️  Proceed with cleanup? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "🗑️  Removing duplicates..."

# Remove ./src/ directory
if [ -d "src" ]; then
    rm -rf src
    echo "   ✅ Removed ./src/"
fi

# Remove duplicate root files
for f in "${DUPLICATES_TO_REMOVE[@]}"; do
    if [ -e "$f" ]; then
        rm -rf "$f"
        echo "   ✅ Removed ./$f"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Review changes: git status"
echo "   2. Commit: git add -A && git commit -m 'chore: remove duplicate files, consolidate to monorepo structure'"
echo "   3. Push: git push"
echo ""
