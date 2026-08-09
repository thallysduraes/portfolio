import re, sys

def minify_css(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    src = re.sub(r'\s+', ' ', src)
    src = re.sub(r'\s*([{}:;,>])\s*', r'\1', src)
    src = re.sub(r';}', '}', src)
    return src.strip()

def minify_js(src):
    # strip /* */ comments
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    lines = []
    for line in src.split('\n'):
        stripped = line.strip()
        if stripped.startswith('//'):
            continue
        if stripped == '':
            continue
        lines.append(stripped)
    return '\n'.join(lines)

base = r'C:\Users\thall\Documents\Portfolio'
with open(base + r'\styles.css', encoding='utf-8') as f:
    css = f.read()
with open(base + r'\styles.min.css', 'w', encoding='utf-8') as f:
    f.write(minify_css(css))

with open(base + r'\script.js', encoding='utf-8') as f:
    js = f.read()
with open(base + r'\script.min.js', 'w', encoding='utf-8') as f:
    f.write(minify_js(js))

import os
print('styles.css', os.path.getsize(base + r'\styles.css'), '->', os.path.getsize(base + r'\styles.min.css'))
print('script.js', os.path.getsize(base + r'\script.js'), '->', os.path.getsize(base + r'\script.min.js'))
