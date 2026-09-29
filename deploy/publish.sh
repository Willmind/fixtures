#!/usr/bin/env bash
set -euo pipefail

: "${GH_TOKEN:?需要 GitHub Actions 的临时令牌}"
: "${RUNNER_TEMP:?仅在 GitHub Actions 中运行}"
: "${GITHUB_SHA:?}"
: "${GITHUB_RUN_ID:?}"
: "${GITHUB_RUN_ATTEMPT:?}"
[[ "${GITHUB_REPOSITORY:-}" == 'Willmind/fixtures' ]]
[[ "${GITHUB_REF:-}" == 'refs/heads/main' ]]
[[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]
test -s dist/index.html

remote=https://github.com/Willmind/fixtures.git
branch=codex/site-dist
latest="$(git ls-remote "$remote" refs/heads/main | cut -f1)"
if [[ "$latest" != "$GITHUB_SHA" ]]; then
  echo 'main 已有更新，跳过旧提交的发布。' >> "$GITHUB_STEP_SUMMARY"
  echo 'published=false' >> "$GITHUB_OUTPUT"
  exit 0
fi

python3 - <<'PY'
import json, os
from pathlib import Path
Path('dist/deployment.json').write_text(json.dumps({
    'sha': os.environ['GITHUB_SHA'],
    'id': os.environ['GITHUB_RUN_ID'] + '-' + os.environ['GITHUB_RUN_ATTEMPT'],
    'runUrl': 'https://github.com/Willmind/fixtures/actions/runs/' + os.environ['GITHUB_RUN_ID'],
}) + '\n')
PY

publish_dir="$(mktemp -d "$RUNNER_TEMP/fixtures-publish.XXXXXX")"
trap 'rm -rf -- "$publish_dir"' EXIT
git init --quiet "$publish_dir"
git -C "$publish_dir" remote add origin "$remote"
if [[ -n "$(git ls-remote "$remote" "refs/heads/$branch")" ]]; then
  git -C "$publish_dir" fetch --depth=1 origin "$branch"
  git -C "$publish_dir" checkout --quiet -b "$branch" FETCH_HEAD
  git -C "$publish_dir" rm -r --quiet --ignore-unmatch .
else
  git -C "$publish_dir" checkout --quiet --orphan "$branch"
fi
cp -R dist/. "$publish_dir/"
git -C "$publish_dir" config user.name 'github-actions[bot]'
git -C "$publish_dir" config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git -C "$publish_dir" add --all
git -C "$publish_dir" commit --quiet -m "deploy: 发布 ${GITHUB_SHA:0:7}"
git -C "$publish_dir" -c credential.helper= -c 'credential.helper=!gh auth git-credential' \
  push origin "HEAD:refs/heads/$branch"
echo 'published=true' >> "$GITHUB_OUTPUT"
printf '已发布 %s，服务器将在下一次检查时更新。\n' "$GITHUB_SHA" >> "$GITHUB_STEP_SUMMARY"
