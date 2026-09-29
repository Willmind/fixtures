import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('pull_site', Path(__file__).with_name('pull-site.py'))
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)
SHA = 'a' * 40
REVISION = 'b' * 40
METADATA = {'sha': SHA, 'id': '123-1'}


def archive(extra=None, metadata=METADATA, missing=None):
    files = {
        'index.html': b'<script src="/assets/app.js"></script>',
        'assets/app.js': b'console.log("home")',
        'deployment.json': json.dumps(metadata).encode(),
    }
    if extra:
        files.update(extra)
    if missing:
        del files[missing]
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode='w') as tar:
        for name, value in files.items():
            member = tarfile.TarInfo(name)
            member.size = len(value)
            tar.addfile(member, io.BytesIO(value))
    stream.seek(0)
    return stream


class DeployTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.initial = self.root / 'releases' / 'initial'
        self.initial.mkdir(parents=True)
        (self.initial / 'index.html').write_text('original')
        (self.initial / 'deployment.json').write_text('{"id":"initial"}')
        (self.root / 'current').symlink_to(self.initial)

    def test_valid_build_activates_and_preserves_previous(self):
        self.assertTrue(site.deploy_archive(self.root, REVISION, archive(), lambda m: m == METADATA))
        self.assertEqual((self.root / 'current').resolve().name, REVISION)
        self.assertEqual((self.root / 'previous').resolve(), self.initial)
        self.assertEqual((self.root / 'current' / 'assets/app.js').stat().st_mode & 0o777, 0o644)

    def test_failed_https_restores_previous(self):
        with self.assertRaisesRegex(RuntimeError, 'HTTPS'):
            site.deploy_archive(self.root, REVISION, archive(), lambda m: False)
        self.assertEqual((self.root / 'current').resolve(), self.initial)
        self.assertFalse((self.root / 'releases' / REVISION).exists())

    def test_interrupt_during_health_check_restores_previous(self):
        def interrupted(metadata):
            raise KeyboardInterrupt()
        with self.assertRaises(KeyboardInterrupt):
            site.deploy_archive(self.root, REVISION, archive(), interrupted)
        self.assertEqual((self.root / 'current').resolve(), self.initial)

    def test_incomplete_build_never_switches(self):
        for missing in ('index.html', 'assets/app.js', 'deployment.json'):
            with self.subTest(missing=missing), self.assertRaises((ValueError, FileNotFoundError)):
                site.deploy_archive(self.root, REVISION, archive(missing=missing))
            self.assertEqual((self.root / 'current').resolve(), self.initial)

    def test_missing_referenced_chunk_never_switches(self):
        with self.assertRaisesRegex(ValueError, '资源不存在'):
            site.deploy_archive(self.root, REVISION, archive(extra={'index.html': b'<script src="/assets/missing.js"></script>'}))
        self.assertEqual((self.root / 'current').resolve(), self.initial)

    def test_path_traversal_absolute_and_hidden_paths_are_rejected(self):
        for path in ('../escape', '/tmp/escape', 'assets/../../escape', '.git/config'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                site.deploy_archive(self.root, REVISION, archive(extra={path: b'bad'}))
            self.assertEqual((self.root / 'current').resolve(), self.initial)

    def test_links_are_rejected(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
            stream = io.BytesIO()
            with tarfile.open(fileobj=stream, mode='w') as tar:
                member = tarfile.TarInfo('link')
                member.type, member.linkname = kind, '/etc/passwd'
                tar.addfile(member)
            stream.seek(0)
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                site.deploy_archive(self.root, REVISION, stream)

    def test_invalid_manifest_never_switches(self):
        for metadata in ({'sha': 'bad', 'id': '1-1'}, {'sha': SHA, 'id': '../../bad'}):
            with self.subTest(metadata=metadata), self.assertRaises(ValueError):
                site.deploy_archive(self.root, REVISION, archive(metadata=metadata))

    def test_same_release_is_not_reactivated(self):
        site.deploy_archive(self.root, REVISION, archive(), lambda m: True)
        self.assertFalse(site.deploy_archive(self.root, REVISION, archive(), lambda m: False))
        self.assertEqual((self.root / 'previous').resolve(), self.initial)

    def test_existing_previous_release_is_preserved_on_failed_reactivation(self):
        site.deploy_archive(self.root, REVISION, archive(), lambda m: True)
        second = 'c' * 40
        site.deploy_archive(self.root, second, archive(), lambda m: True)
        with self.assertRaises(RuntimeError):
            site.deploy_archive(self.root, REVISION, archive(), lambda m: False)
        self.assertEqual((self.root / 'current').resolve().name, second)
        self.assertTrue((self.root / 'previous').is_dir())

    def test_manual_rollback_switches_to_previous(self):
        site.deploy_archive(self.root, REVISION, archive(), lambda m: True)
        site.activate(self.root, self.initial, {'id': 'initial'}, lambda m: True)
        self.assertEqual((self.root / 'current').resolve(), self.initial)
        self.assertEqual((self.root / 'previous').resolve().name, REVISION)

    def test_pruning_retains_current_and_previous(self):
        for number in range(7):
            revision = format(number, '040x')
            site.deploy_archive(self.root, revision, archive(), lambda m: True)
        self.assertTrue((self.root / 'previous').is_dir())
        self.assertTrue((self.root / 'current').is_dir())
        self.assertEqual(len(list((self.root / 'releases').iterdir())), 5)


if __name__ == '__main__':
    unittest.main()
