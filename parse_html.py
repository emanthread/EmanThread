import re
from pathlib import Path

html = Path('male-simple-3-piece-suit-correct-layout.html').read_text(encoding='utf-8')
html = re.sub(r'>(<)', r'>\n\1', html)
html = re.sub(r'(</div>|</span>|</h3>)', r'\1\n', html)
lines = html.split('\n')
for line in lines:
    if any(cls in line for cls in ['<h3', 'class="label"', 'class="subitem"', 'class="pill"', 'class="box"', 'class="mini"']):
        print(line.strip())
