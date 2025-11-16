import pathlib
import re

repo_root = pathlib.Path(__file__).resolve().parents[1]
root = repo_root / 'loanflow' / 'src'
if not root.exists():
    root = pathlib.Path('loanflow/src')
patterns = [
    r'name="([^"]+)"',
    r"name='([^']+)'",
    r'\[(?:name|icon)\]="([^"]+)"',
    r"\[(?:name|icon)\]='([^']+)'",
    r'icon="([^"]+)"',
    r"icon='([^']+)'",
]
values = set()
for path in root.rglob('*'):
    if path.suffix.lower() not in {'.ts', '.html'}:
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    for pattern in patterns:
        values.update(re.findall(pattern, text))

values = sorted(v for v in values if v and not v.strip().startswith('{'))
print('\n'.join(values))
