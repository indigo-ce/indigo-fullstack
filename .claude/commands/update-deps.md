# Update Dependencies

Updates all pnpm dependencies to their latest non-breaking versions, then shows available breaking updates.

## What it does

1. Updates all dependencies to latest compatible versions (respecting semver ranges)
2. Shows a list of packages that have breaking changes available
3. Provides a summary of what was updated

## Implementation

```bash
#!/bin/bash
set -e

echo "🔄 Updating dependencies to latest compatible versions..."
pnpm update

echo ""
echo "📦 Checking for packages with breaking changes available..."
echo "The following packages have major version updates available:"
echo ""

pnpm outdated --format table || echo "✅ All dependencies are up to date!"

echo ""
echo "✅ Non-breaking dependency updates completed!"
echo ""
echo "💡 To update packages with breaking changes, run:"
echo "   pnpm add <package>@latest"
```
