import os
import json
import urllib.request

with open('data/cars.json', 'r', encoding='utf-8') as f:
    cars = json.load(f)

os.makedirs('images/cars', exist_ok=True)
keys = {}
for car in cars:
    brand = str(car.get('brand', '')).strip()
    model = str(car.get('model', '')).strip()
    if not brand or not model:
        continue
    key = f"{brand}_{model}".replace(' ', '_')
    if key in keys:
        continue
    url = car.get('image')
    if not url:
        continue
    keys[key] = url

report = {'downloaded': [], 'failed': [], 'skipped': []}
for key, url in sorted(keys.items()):
    out = f'images/cars/{key}.png'
    if os.path.exists(out) and os.path.getsize(out) > 1024:
        report['skipped'].append({'key': key, 'reason': 'already exists'})
        continue
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        })
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        if len(data) < 1024:
            raise ValueError(f'image too small from {url}')
        with open(out, 'wb') as f:
            f.write(data)
        report['downloaded'].append(key)
    except Exception as e:
        report['failed'].append({'key': key, 'error': str(e)})

with open('scripts/download_report_from_data.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print('done', len(report['downloaded']), 'downloaded,', len(report['failed']), 'failed,', len(report['skipped']), 'skipped')
