# Releasing @bachs/sdk

Releases are published to npm by `.github/workflows/release.yml` when a version
tag is pushed. The workflow publishes with an npm access token stored as the
`NPM_TOKEN` secret of the `npm` environment, and each version carries a
provenance statement linking it to the commit and workflow run that built it.

## One-time setup

1. In this repository's **Settings** > **Environments**, create `npm`, add
   required reviewers, and add an environment secret named `NPM_TOKEN` holding a
   granular npm access token with publish permission for `@bachs/sdk`. Only the
   publish job can read it, and it waits for a reviewer's approval, so a pushed
   tag alone cannot publish. Also add a tag protection ruleset for `v*` under
   **Settings** > **Rules**, so only maintainers can create release tags.
2. Once someone can log in to npmjs.com again, prefer trusted publishing: under
   the package's **Settings** > **Trusted publishing**, add a GitHub Actions
   publisher for `bachsdev` / `bachs-node` / `release.yml` / environment `npm`,
   then remove `NODE_AUTH_TOKEN` from the publish step and the secret. No token
   needs rotating after that, and tokens can be disallowed under **Publishing
   access**.

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
   packed file. Only the publish job can read the token. A version with a hyphen, such as `1.1.0-rc.1`, is published under
   the `next` tag.
5. Confirm with `npm view @bachs/sdk version`.

## After 1.0.0

Deprecate the placeholder (needs an npm owner, once):

```bash
npm deprecate @bachs/sdk@0.0.1 "Placeholder. Install @bachs/sdk 1.0.0 or later."
```
