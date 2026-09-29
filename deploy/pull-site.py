#!/usr/bin/python3 -I
"""定时读取公开产物分支；无需 GitHub 令牌或 SSH 私钥。"""
import fcntl
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import time

ROOT = Path('/var/www/fixtures-home')
STATE = Path('/var/lib/fixtures-home-deploy')
REMOTE = 'https://github.com/Willmind/fixtures.git'
BRANCH = 'refs/heads/codex/site-dist'
MAX_SIZE = 50 * 1024 * 1024


def run(*args, timeout=90):
    return subprocess.check_output(args, timeout=timeout, env={
        **os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GIT_CONFIG_NOSYSTEM': '1',
    }).decode().strip()


def extract_site(stream, target):
    """逐项复制普通文件，禁止归档路径穿越、链接和异常体积。"""
    total = 0
    count = 0
    with tarfile.open(fileobj=stream, mode='r|*') as archive:
        for member in archive:
            count += 1
            path = PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts or any(p.startswith('.') for p in path.parts):
                raise ValueError('产物包含不允许的路径')
            if not (member.isdir() or member.isfile()):
                raise ValueError('产物只能包含普通文件和目录')
            total += member.size
            if count > 2000 or total > MAX_SIZE:
                raise ValueError('产物超过大小限制')
            destination = target.joinpath(*path.parts)
            if member.isdir():
                destination.mkdir(parents=True, exist_ok=True)
                destination.chmod(0o755)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, destination.open('xb') as out:
                    shutil.copyfileobj(source, out)
                destination.chmod(0o644)
    if not (target / 'index.html').is_file() or not (target / 'assets').is_dir():
        raise ValueError('产物缺少网页或 assets 目录')
    metadata = json.loads((target / 'deployment.json').read_text())
    if not re.fullmatch(r'[0-9a-f]{40}', metadata.get('sha', '')):
        raise ValueError('产物缺少有效的源码版本')
    if not re.fullmatch(r'[0-9]+-[0-9]+', metadata.get('id', '')):
        raise ValueError('产物缺少有效的构建编号')
    # 防止只有入口文件、引用的 JS/CSS 未打包的半成品被发布。
    for asset in re.findall(r'(?:src|href)=[\"\'](/assets/[^\"\']+)[\"\']', (target / 'index.html').read_text()):
        if '..' in PurePosixPath(asset).parts or not (target / asset.lstrip('/')).is_file():
            raise ValueError('入口引用的资源不存在')
    return metadata


def point(link, destination):
    temporary = link.with_name('.' + link.name + '-' + str(os.getpid()))
    try:
        temporary.symlink_to(destination)
        os.replace(temporary, link)
    finally:
        temporary.unlink(missing_ok=True)


def healthy(metadata):
    for attempt in range(3):
        try:
            body = run('curl', '--fail', '--silent', '--show-error', '--noproxy', '*',
                       '--max-time', '10', '--resolve', 'home.willmindgg.cn:443:127.0.0.1',
                       'https://home.willmindgg.cn/deployment.json', timeout=15)
            if json.loads(body) == metadata:
                run('curl', '--fail', '--silent', '--show-error', '--noproxy', '*',
                    '--max-time', '10', '--resolve', 'home.willmindgg.cn:443:127.0.0.1',
                    'https://home.willmindgg.cn/', '--output', '/dev/null', timeout=15)
                return True
        except (subprocess.SubprocessError, ValueError):
            pass
        if attempt < 2:
            time.sleep(1)
    return False


def activate(root, release, metadata, check=healthy):
    current = root / 'current'
    previous = current.resolve(strict=True)
    try:
        point(current, release)
        if not check(metadata):
            raise RuntimeError('HTTPS 检查失败，已恢复上一版本')
        point(root / 'previous', previous)
    except BaseException:
        point(current, previous)
        raise


def prune(root, keep=5):
    protected = {(root / name).resolve() for name in ('current', 'previous')}
    releases = sorted((root / 'releases').iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
    for release in releases[keep:]:
        if release not in protected and release.is_dir() and not release.is_symlink():
            shutil.rmtree(release)


def deploy_archive(root, revision, stream, check=healthy):
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('无效的产物版本')
    root = root.resolve()
    releases = root / 'releases'
    release = releases / revision
    if (root / 'current').resolve() == release:
        return False
    with tempfile.TemporaryDirectory(prefix='.incoming-', dir=releases) as temporary:
        staging = Path(temporary)
        metadata = extract_site(stream, staging)
        staging.chmod(0o755)
        created = not release.exists()
        if created:
            staging.rename(release)
        elif json.loads((release / 'deployment.json').read_text()) != metadata:
            raise ValueError('已保存版本的信息不匹配')
        try:
            activate(root, release, metadata, check)
        except BaseException:
            if created:
                shutil.rmtree(release)
            raise
    prune(root)
    print('已上线源码版本 ' + metadata['sha'], flush=True)
    return True


def main():
    os.umask(0o022)
    def interrupted(signum, frame):
        raise InterruptedError('部署被中断')
    signal.signal(signal.SIGTERM, interrupted)
    with (STATE / 'deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if sys.argv[1:] == ['--rollback']:
            release = (ROOT / 'previous').resolve(strict=True)
            activate(ROOT, release, json.loads((release / 'deployment.json').read_text()))
            print('已回退至 ' + release.name, flush=True)
            return
        if sys.argv[1:]:
            raise ValueError('不支持的参数')
        repository = STATE / 'repo.git'
        if not repository.exists():
            run('git', 'init', '--bare', '--quiet', str(repository))
        git = ('git', '--git-dir=' + str(repository))
        run(*git, '-c', 'http.lowSpeedLimit=100', '-c', 'http.lowSpeedTime=30',
            'fetch', '--quiet', '--depth=1', '--no-tags', REMOTE, '+' + BRANCH + ':refs/heads/site')
        revision = run(*git, 'rev-parse', 'refs/heads/site')
        if (ROOT / 'current').resolve().name == revision:
            print('线上版本已是最新', flush=True)
            return
        with tempfile.TemporaryFile() as archive:
            subprocess.run((*git, 'archive', '--format=tar', revision), stdout=archive,
                           check=True, timeout=30)
            if archive.tell() > MAX_SIZE:
                raise ValueError('归档超过大小限制')
            archive.seek(0)
            deploy_archive(ROOT, revision, archive)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('部署未完成：' + str(error), file=sys.stderr, flush=True)
        sys.exit(1)
