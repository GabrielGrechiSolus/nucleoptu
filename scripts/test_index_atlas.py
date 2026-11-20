import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('index_atlas', Path(__file__).with_name('index-atlas.py'))
index = importlib.util.module_from_spec(spec)
spec.loader.exec_module(index)

class IndexAtlasTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def repo(self, name, files, org='solussaude'):
        p = self.root / name
        p.mkdir()
        def git(*args):
            subprocess.run(['git', '-C', str(p), *args], check=True, capture_output=True)
        git('init', '-b', 'develop')
        git('config', 'user.name', 'Atlas Test')
        git('config', 'user.email', 'atlas@example.invalid')
        git('config', 'core.autocrlf', 'false')
        git('config', 'commit.gpgsign', 'false')
        git('config', 'core.hooksPath', str(p / '.no-hooks'))
        git('remote', 'add', 'origin', f'https://github.com/{org}/{name}.git')
        for filename, text in files.items():
            dest = p / filename
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(text, encoding='utf-8')
        git('add', '.')
        git('commit', '-m', 'Fixture')
        return p

    def test_sources_connections_and_exclusions(self):
        self.repo('banco', {'regras.sql': 'create or replace package pkg_exemplo as\n-- aplica_redutor\n'})
        self.repo('ptu', {'fluxo.pas': "pkg_exemplo.calcula();\nif cnpj = '07945024000162' then glosa();\npassword = 'nao-publicar-glosa';\nmask = '99.999.999/9999-99';\n", 'service-account.json': '{"private_key": "nao-publicar"}'})
        self.repo('outro', {'regra.sql': 'glosa();'}, org='outra-org')
        result = index.build(self.root)
        self.assertEqual({'banco', 'ptu'}, {r['id'] for r in result['repos']})
        self.assertTrue(any(c['origem'] == 'ptu' and c['destino'] == 'banco' for c in result['conexoes']))
        findings = result['regras']
        self.assertTrue(any('07945024000162' in r['cnpjs'] for r in findings))
        self.assertFalse(any('99.999.999/9999-99' in r['cnpjs'] for r in findings))
        self.assertFalse(any('nao-publicar' in r['fonte']['trecho'] for r in findings))
        self.assertTrue(all('/blob/' in r['fonte']['url'] and '#L' in r['fonte']['url'] for r in findings))

    def test_local_changes_never_link_to_published_source(self):
        p = self.repo('ptu', {'regra.pas': 'aplica_redutor();\n'})
        (p / 'regra.pas').write_text('glosa();\n', encoding='utf-8')
        result = index.build(self.root)
        self.assertTrue(result['repos'][0]['alterado'])
        self.assertTrue(result['regras'][0]['fonte']['alterado'])
        self.assertEqual('', result['regras'][0]['fonte']['url'])

    def test_client_documents_are_not_lost_to_sampling(self):
        self.repo('ptu', {'regra.pas': '\n'.join(f"if cnpj = '0794502400016{i}' then glosa();" for i in range(7))})
        result = index.build(self.root)
        self.assertEqual(7, len([r for r in result['regras'] if r['categoria'] == 'cliente']))

if __name__ == '__main__':
    unittest.main()
