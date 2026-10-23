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
   - Environment: `npm`
3. Optionally, under **Publishing access**, require two-factor authentication and
   disallow tokens, so the workflow is the only way to publish.
4. In this repository's **Settings** > **Environments**, create `npm` and add
   required reviewers. The publish job waits for their approval, so a pushed tag
   alone cannot publish. Also add a tag protection ruleset for `v*` under
   **Settings** > **Rules**, so only maintainers can create release tags.

## Each release

1. Update `version` in `package.json` and add the version to `CHANGELOG.md`.
2. Merge to `main` with `npm run check` passing.
3. Tag the merge commit and push the tag:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. Watch the **Release** workflow. Its `build` job checks that the tag matches
   `package.json`, runs `npm run check` and verifies the packed contents. Its
   `publish` job then waits for an `npm` environment reviewer and publishes the
   packed file. Only the publish job holds a publish credential. A version with a hyphen, such as `1.1.0-rc.1`, is published under
   the `next` tag.
5. Confirm with `npm view @bachs/sdk version`.

## After 1.0.0

Deprecate the placeholder (needs an npm owner, once):

```bash
npm deprecate @bachs/sdk@0.0.1 "Placeholder. Install @bachs/sdk 1.0.0 or later."
```
