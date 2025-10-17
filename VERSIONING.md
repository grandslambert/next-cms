# Versioning Guide

This project follows [Semantic Versioning 2.0.0](https://semver.org/).

## Current Version: 2.1.0

## Version Format

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └─── Bug fixes (backwards compatible)
  │     └───────── New features (backwards compatible)
  └─────────────── Breaking changes (not backwards compatible)
```

## When to Increment

### MAJOR (X.0.0)
Increment when you make incompatible API changes or major database schema changes that require migration.

Examples:
- Complete redesign
- Database schema breaking changes
- Removing features
- Major API changes

### MINOR (0.X.0)
Increment when you add functionality in a backwards-compatible manner.

Examples:
- New content type (e.g., adding "Events")
- New admin feature (e.g., analytics dashboard)
- New API endpoints
- UI improvements
- Non-breaking database additions

### PATCH (0.0.X)
Increment for backwards-compatible bug fixes.

Examples:
- Bug fixes
- Security patches
- Performance improvements
- Documentation updates
- Minor UI tweaks

## How to Release a New Version

### 1. Update Version Number

**package.json:**
```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

Or manually edit:
```json
{
  "version": "1.1.0"
}
```

### 2. Update CHANGELOG.md

Add a new section at the top:

```markdown
## [1.1.0] - 2025-10-20

### Added
- Comments system for posts
- Email notifications

### Changed
- Improved media upload UI

### Fixed
- Bug with category deletion
```

### 3. Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.0"
git tag v1.1.0
git push && git push --tags
```

## Changelog Categories

Use these standard categories:

### Added
For new features.
```markdown
- New analytics dashboard
- User profile pages
```

### Changed
For changes in existing functionality.
```markdown
- Improved media upload performance
- Updated dashboard layout
```

### Deprecated
For soon-to-be removed features.
```markdown
- Old media API endpoints (use v2 instead)
```

### Removed
For removed features.
```markdown
- Removed legacy upload method
```

### Fixed
For bug fixes.
```markdown
- Fixed category image not displaying
- Corrected post date formatting
```

### Security
For security improvements.
```markdown
- Updated bcrypt to version 2.4.4
- Fixed XSS vulnerability in post content
```

## Version Tags

Tag format: `vX.Y.Z`

Examples:
- v1.0.0 (initial release)
- v1.1.0 (minor update)
- v1.0.1 (patch)

## Breaking Changes

When making breaking changes (major version):

1. Document in CHANGELOG under "### BREAKING CHANGES"
2. Provide migration guide
3. Update version to next major (2.0.0)
4. Tag as `vX.0.0-beta.1` for testing first

Example:
```markdown
## [2.0.0] - 2025-11-01

### BREAKING CHANGES

- Database schema changed - run migration script
- API endpoints renamed (see migration guide)
- Minimum Node.js version now 20+

### Migration Guide

1. Backup your database
2. Run: `node scripts/migrate-to-v2.js`
3. Update .env with new variables
4. Restart application
```

## Pre-release Versions

For testing before official release:

```
1.1.0-alpha.1   (early testing)
1.1.0-beta.1    (feature complete, testing)
1.1.0-rc.1      (release candidate)
1.1.0           (official release)
```

## Current Version Status

**Version 1.0.0** includes:
- ✅ Complete CMS functionality
- ✅ All core features implemented
- ✅ Production-ready
- ✅ Fully documented
- ✅ Database migrations complete

## Quick Reference

| Version | Date | Highlights |
|---------|------|------------|
| 1.0.0 | 2025-10-15 | Initial release with full CMS features |

## Tracking Changes

Before making changes:
1. Decide if it's a fix, feature, or breaking change
2. Document what you're changing
3. Update CHANGELOG.md
4. Increment version appropriately
5. Commit with descriptive message

## Commit Message Format

```
type(scope): description

[optional body]
[optional footer]
```

Types:
- `feat`: New feature (minor version)
- `fix`: Bug fix (patch version)
- `docs`: Documentation only
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```bash
git commit -m "feat(media): add automatic image resizing"
git commit -m "fix(auth): resolve login redirect loop"
git commit -m "docs: update installation guide"
```

## Release Checklist

Before releasing a new version:

- [ ] All features tested
- [ ] CHANGELOG.md updated
- [ ] Version number incremented in package.json
- [ ] Documentation updated if needed
- [ ] Database migrations documented
- [ ] Breaking changes clearly noted
- [ ] Git tag created
- [ ] Release notes written

## Links

- Semantic Versioning: https://semver.org/
- Keep a Changelog: https://keepachangelog.com/
- Conventional Commits: https://www.conventionalcommits.org/

