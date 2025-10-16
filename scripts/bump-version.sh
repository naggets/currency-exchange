#!/bin/bash

# ============================================
# Currency Calculator - Version Bump Script
# ============================================
# Usage: ./scripts/bump-version.sh [patch|minor|major]
#
# Examples:
#   ./scripts/bump-version.sh patch  # 1.0.1 -> 1.0.2
#   ./scripts/bump-version.sh minor  # 1.0.2 -> 1.1.0
#   ./scripts/bump-version.sh major  # 1.1.0 -> 2.0.0

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if type is provided
TYPE=$1

if [ -z "$TYPE" ]; then
    echo -e "${RED}Error: Version type not specified${NC}"
    echo "Usage: ./scripts/bump-version.sh [patch|minor|major]"
    echo ""
    echo "Examples:"
    echo "  patch - Bug fixes (1.0.0 -> 1.0.1)"
    echo "  minor - New features (1.0.0 -> 1.1.0)"
    echo "  major - Breaking changes (1.0.0 -> 2.0.0)"
    exit 1
fi

# Check if VERSION file exists
if [ ! -f "VERSION" ]; then
    echo -e "${RED}Error: VERSION file not found${NC}"
    exit 1
fi

# Read current version
CURRENT_VERSION=$(cat VERSION)
echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}"

# Parse version (split by dots)
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Bump version based on type
case $TYPE in
    patch)
        PATCH=$((PATCH + 1))
        echo -e "${GREEN}Bumping PATCH version${NC}"
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        echo -e "${GREEN}Bumping MINOR version${NC}"
        ;;
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        echo -e "${GREEN}Bumping MAJOR version${NC}"
        ;;
    *)
        echo -e "${RED}Error: Invalid type '$TYPE'${NC}"
        echo "Must be: patch, minor, or major"
        exit 1
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo -e "${GREEN}New version: $NEW_VERSION${NC}"
echo ""

# Detect OS for sed compatibility
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    SED_INPLACE="sed -i ''"
else
    # Linux
    SED_INPLACE="sed -i"
fi

# Update VERSION file
echo "$NEW_VERSION" > VERSION
echo "✅ Updated VERSION"

# Update manifest.json
if [ -f "manifest.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" manifest.json
    else
        sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" manifest.json
    fi
    echo "✅ Updated manifest.json"
fi

# Update index.html (footer version)
if [ -f "index.html" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/<p>v[0-9]*\.[0-9]*\.[0-9]*/<p>v$NEW_VERSION/" index.html
    else
        sed -i "s/<p>v[0-9]*\.[0-9]*\.[0-9]*/<p>v$NEW_VERSION/" index.html
    fi
    echo "✅ Updated index.html"
fi

# Update README.md (version badge)
if [ -f "README.md" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/version-[0-9]*\.[0-9]*\.[0-9]*-blue/version-$NEW_VERSION-blue/" README.md
    else
        sed -i "s/version-[0-9]*\.[0-9]*\.[0-9]*-blue/version-$NEW_VERSION-blue/" README.md
    fi
    echo "✅ Updated README.md"
fi

echo ""
echo -e "${GREEN}✅ Version bumped successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update CHANGELOG.md manually:"
echo "   - Add section: ## [$NEW_VERSION] - $(date +%Y-%m-%d)"
echo "   - Document your changes"
echo ""
echo "2. Review changes:"
echo "   git diff"
echo ""
echo "3. Commit changes:"
echo "   git add VERSION manifest.json index.html README.md CHANGELOG.md"
echo "   git commit -m 'chore: bump version to $NEW_VERSION'"
echo ""
echo "4. After merging to main, create tag:"
echo "   git tag -a v$NEW_VERSION -m 'Release v$NEW_VERSION'"
echo "   git push origin v$NEW_VERSION"
