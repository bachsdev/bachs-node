# Releasing @bachs/sdk

Releases are published to npm by `.github/workflows/release.yml` when a version
tag is pushed. The workflow uses npm trusted publishing, so no npm token is
stored anywhere, and each version carries a provenance statement linking it to
the commit and workflow run that built it.

## One-time setup (an owner of the `bachshq` npm organization)

1. On npmjs.com, open the `@bachs/sdk` package, then **Settings**.
2. Under **Trusted publishing**, add a GitHub Actions publisher:
   - Organization or user: `bachsdev`
   - Repository: `bachs-node`
   - Workflow filename: `release.yml`
   - Environment: leave empty
3. Optionally, under **Publishing access**, require two-factor authentication and
   disallow tokens, so the workflow is the only way to publish.

## Each release

1. Update `version` in `package.json` and add the version to `CHANGELOG.md`.
2. Merge to `main` with `npm run check` passing.
3. Tag the merge commit and push the tag:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. Watch the **Release** workflow. It checks that the tag matches
   `package.json`, runs `npm run check`, verifies the package contents and
   publishes. A version with a hyphen, such as `1.1.0-rc.1`, is published under
   the `next` tag.
5. Confirm with `npm view @bachs/sdk version`.

## After 1.0.0

Deprecate the placeholder (needs an npm owner, once):

```bash
npm deprecate @bachs/sdk@0.0.1 "Placeholder. Install @bachs/sdk 1.0.0 or later."
```
