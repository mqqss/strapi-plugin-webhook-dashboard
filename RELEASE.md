# Release Process

Use the release script so GitHub and npm stay in sync.

1. Update the package version.

```bash
npm version patch --no-git-tag-version
```

2. Commit the version and code changes.

```bash
git add .
git commit -m "chore: prepare release"
```

3. Log in to npm.

```bash
npm login
```

4. Run the full release.

```bash
npm run release:publish
```

The release script checks that the working tree is clean, verifies that the version does not already exist on npm, runs tests/build/verify, checks the package for sourcemaps, creates the version tag, pushes `main` and the tag to GitHub, then publishes to npm.
