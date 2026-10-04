# 腾讯云自动部署

线上地址：https://home.willmindgg.cn/

推送 `main` 后，GitHub Actions 先运行模型测试、部署测试和生产构建；成功后使用该次任务的临时 `GITHUB_TOKEN`，把 `dist/` 提交到 `codex/site-dist` 产物分支。PR 只检查，不发布。过时的 main 提交不会发布。

服务器通过 systemd 每次任务结束后 60 秒检查一次公开产物分支。先从 GitHub REST API 读取产物提交 SHA，版本变化时才从官方 `codeload.github.com` 下载该 SHA 的归档；不再维护服务器端 Git 缓存，避免网络超时后残留 `shallow.lock` 阻塞后续更新。只运行本站部署程序，不执行产物中的脚本。无需上传服务器私钥、密码或个人 GitHub Token。当前仓库和构建产物均公开，原始图纸、身份证件和其他私人文件不应放入 `public/` 或 `dist/`。

## 首次安装

先等待 GitHub 的「检查并部署」完成、产物分支创建成功，再将本目录上传到服务器，在目录中运行：

```sh
sudo bash setup-server.sh
```

也可下载并解压仓库的指定提交归档，然后执行其中的 `deploy/setup-server.sh`。需要 Ubuntu、Nginx、systemd、Python 3、curl；服务器必须能够通过 HTTPS 读取 `api.github.com` 和 `codeload.github.com`。安装程序按本站现有配置准备：

- 域名：`home.willmindgg.cn`
- Nginx 配置：`/etc/nginx/conf.d/fixtures-home.conf`
- 原目录：`/var/www/fixtures-home-56eba5a`

脚本创建不能 SSH 登录、没有 sudo 权限的 `fixtures-deploy` 系统账号；备份并将本站 Nginx 的 `root` 改到 `/var/www/fixtures-home/current`，保留已有 HTTPS 配置。其他域名的配置不修改。首次执行部署成功后才启用定时检查。

初始化完成后，将仓库 Actions Variable `DEPLOY_ENABLED` 设为 `true`。这会开启工作流最后的线上版本验证；它不是服务器定时器开关。

## 日常使用

正常提交并推送 `main` 即可。构建完成后，通常再等约一分钟更新；GitHub 网络不可达时保留当前网站，下次检查自动重试。GitHub 工作流会对比线上 `deployment.json` 和本次构建信息。

版本查询最多 20 秒，归档下载最多 120 秒；临时文件在失败后清理。归档必须匹配指定 SHA 的顶层目录，并继续执行路径、链接、解压大小、入口资源和版本信息检查。GitHub API 拒绝访问或限流时同样保留当前网站，下次定时重试。

每个完整版本放到 `/var/www/fixtures-home/releases/`，通过原子切换 `current` 软链接上线，常规更新无需重启或重载 Nginx。切换后从服务器本机验证实际 HTTPS 站点返回的构建信息；失败立即恢复前一版。保留最近 5 份版本以及当前/上一版引用。该检查验证静态文件和版本信息，不替代浏览器功能验收。

查看状态或手动立即更新：

```sh
sudo systemctl list-timers fixtures-home-deploy.timer
sudo journalctl -u fixtures-home-deploy.service -n 50 --no-pager
sudo systemctl start fixtures-home-deploy.service
```

暂停自动更新并回退上一版：

```sh
sudo systemctl stop fixtures-home-deploy.timer fixtures-home-deploy.service
sudo -u fixtures-deploy /usr/local/libexec/fixtures-home-deploy --rollback
```

回退前先停止定时器，防止它再次部署产物分支上的版本。修复后恢复：

```sh
sudo systemctl start fixtures-home-deploy.timer
```

服务器端部署程序和 systemd 配置由 root 管理，网页更新不会自动替换它们。修改这些文件时，重新上传 `deploy/` 并执行安装脚本。源码仍在 `main`，请勿把 `codex/site-dist` 合并回 `main`。

从旧 Git 拉取方式升级时，也可先停止本站定时器和服务，备份并替换 `/usr/local/libexec/fixtures-home-deploy` 与对应 `.service` 文件，执行 `systemctl daemon-reload`，手动启动服务验证成功后再恢复定时器。旧 `/var/lib/fixtures-home-deploy/repo.git` 缓存不再被读取，可暂时保留，里面的锁文件不会影响新流程。
