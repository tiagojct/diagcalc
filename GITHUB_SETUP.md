# GitHub Setup

This repository already has `origin` set to:

- `https://github.com/tiagojct/diagcalc.git`

## Push the current state

If you want to push the local branch to GitHub:

```bash
git add .
git commit -m "prepare web and terminal release"
git push -u origin main
```

## Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to `Settings`.
3. Open `Pages`.
4. Set the source to `GitHub Actions`.
5. Push to `main`.

The workflow in `.github/workflows/deploy-pages.yml` will publish the web app.

## Create a release

After you push the repo:

1. Open `Releases` on GitHub.
2. Click `Draft a new release`.
3. Create a tag such as `v3.2.0`.
4. Add release notes.
5. Publish the release.

## Publish the terminal app to npm

Run:

```bash
npm login
npm publish --access public
```

If you want to test the package locally first:

```bash
npm pack --dry-run
npm link
diag --help
```

## Install after publish

Users will be able to run:

```bash
npm install -g diagcalc
diag --tui
diag --dataset hiv_elisa
```
