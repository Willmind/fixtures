#!/usr/bin/env bash
set -euo pipefail

fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$EUID" -eq 0 ]] || fail '请使用 sudo bash setup-server.sh。'
bundle="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
site_config=/etc/nginx/conf.d/fixtures-home.conf
old_root=/var/www/fixtures-home-56eba5a
site_root=/var/www/fixtures-home
state_dir=/var/lib/fixtures-home-deploy
deploy_user=fixtures-deploy

for command in python3 curl nginx systemctl useradd runuser; do
  command -v "$command" >/dev/null || fail "缺少 $command，请先安装后再执行。"
done
for file in pull-site.py fixtures-home-deploy.service fixtures-home-deploy.timer; do
  [[ -f "$bundle/$file" ]] || fail "安装包缺少 $file。"
done
[[ -f "$site_config" && ! -L "$site_config" ]] || fail '未找到预期的本站 Nginx 配置。'
nginx -t
systemctl is-active --quiet nginx || fail 'Nginx 未运行。'
# 在改动系统前确认公开产物分支可访问。
python3 - "$bundle/pull-site.py" <<'PY' \
  || fail '暂时无法读取 GitHub 的构建产物，请稍后重试。'
import importlib.util, sys
spec = importlib.util.spec_from_file_location('fixtures_preflight', sys.argv[1])
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)
deploy.published_revision()
PY

python3 - "$site_config" <<'PY'
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text()
names = re.findall(r'^\s*server_name\s+([^;]+);', text, re.M)
roots = re.findall(r'^\s*root\s+([^;]+);', text, re.M)
allowed = {'/var/www/fixtures-home-56eba5a', '/var/www/fixtures-home/current'}
if not names or any(name.strip() != 'home.willmindgg.cn' for name in names):
    sys.exit('该配置包含其他域名，停止自动修改。')
if not roots or any(root.strip() not in allowed for root in roots):
    sys.exit('网站目录与预期不一致，停止自动修改。')
PY

if id "$deploy_user" >/dev/null 2>&1; then
  [[ "$(getent passwd "$deploy_user" | cut -d: -f6)" == "$state_dir" ]] \
    || fail '已存在同名用户，但不是本站的部署账号。'
  [[ "$(getent passwd "$deploy_user" | cut -d: -f7)" == /usr/sbin/nologin ]] \
    || fail '已存在同名账号，但登录方式与预期不符。'
else
  [[ ! -e "$site_root" && ! -e "$state_dir" ]] || fail '部署目录已存在，请先确认用途。'
  useradd --system --user-group --home-dir "$state_dir" --shell /usr/sbin/nologin "$deploy_user"
fi
install -d -m 0755 -o "$deploy_user" -g "$deploy_user" "$site_root" "$site_root/releases"
install -d -m 0750 -o "$deploy_user" -g "$deploy_user" "$state_dir"

if [[ ! -L "$site_root/current" ]]; then
  [[ ! -e "$site_root/current" ]] || fail 'current 已存在但不是软链接。'
  [[ -f "$old_root/index.html" ]] || fail '原网站目录不存在。'
  [[ ! -e "$site_root/releases/initial" ]] || fail '首次安装目录已存在，请检查上次安装输出。'
  install -d -m 0755 "$site_root/releases/initial"
  cp -R "$old_root/." "$site_root/releases/initial/"
  printf '{"sha":"manual-before-automation","id":"initial"}\n' > "$site_root/releases/initial/deployment.json"
  chown -R "$deploy_user:$deploy_user" "$site_root/releases/initial"
  runuser -u "$deploy_user" -- ln -s "$site_root/releases/initial" "$site_root/current"
fi

install -d -m 0755 /usr/local/libexec
install -m 0755 "$bundle/pull-site.py" /usr/local/libexec/fixtures-home-deploy
install -m 0644 "$bundle/fixtures-home-deploy.service" /etc/systemd/system/fixtures-home-deploy.service
install -m 0644 "$bundle/fixtures-home-deploy.timer" /etc/systemd/system/fixtures-home-deploy.timer

backup="$(mktemp "$site_config.before-auto-deploy.XXXXXX")"
cp -p "$site_config" "$backup"
restore_config() {
  result=$?
  trap - ERR
  cp -p "$backup" "$site_config"
  nginx -t && systemctl reload nginx
  printf '设置失败，已恢复原 Nginx 配置。备份：%s\n' "$backup" >&2
  exit "$result"
}
trap restore_config ERR
python3 - "$site_config" <<'PY'
from pathlib import Path
import re, sys
path = Path(sys.argv[1])
path.write_text(re.sub(r'(^\s*root\s+)/var/www/fixtures-home-56eba5a(?=\s*;)',
                       r'\1/var/www/fixtures-home/current', path.read_text(), flags=re.M))
PY
nginx -t
systemctl reload nginx
trap - ERR

systemctl daemon-reload
if ! systemctl start fixtures-home-deploy.service; then
  journalctl -u fixtures-home-deploy.service -n 30 --no-pager
  fail '首次拉取失败，原网页仍保留。修复网络或日志中的问题后可重新执行本脚本。'
fi
systemctl enable --now fixtures-home-deploy.timer
printf '\n%s\n' '自动部署安装成功：https://home.willmindgg.cn/'
printf '%s\n' '以后推送 main，通过测试后，服务器约一分钟内自动更新。'
printf 'Nginx 原配置备份：%s\n' "$backup"
systemctl list-timers fixtures-home-deploy.timer --no-pager
