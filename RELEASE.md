# Release Process

Publishing is handled by GitHub Actions with npm Trusted Publishing. No npm token is required in GitHub secrets.

## One-time npm setup

In the npm package settings, configure Trusted Publisher with:

- Provider: GitHub Actions
- Organization or user: `mqqss`
- Repository: `strapi-plugin-webhook-dashboard`
- Workflow filename: `publish.yml`
- Environment name: leave empty

After confirming Trusted Publishing works, npm recommends setting package publishing access to require 2FA and disallow tokens.

## Release

1. Update the package version.

```bash
npm version patch --no-git-tag-version
```

2. Commit the version and code changes.

```bash
git add .
git commit -m "chore: prepare release"
```

3. Run the full release.

```bash
npm run release:publish
```

The release script checks that the working tree is clean, verifies that the version does not already exist on npm, runs tests/build/verify, checks the package for sourcemaps, creates the version tag, then pushes `main` and the tag to GitHub.

The pushed tag triggers `.github/workflows/publish.yml`, which publishes to npm using OIDC Trusted Publishing.
