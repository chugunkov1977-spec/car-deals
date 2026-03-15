import os
import json
import urllib.request
import urllib.error

SCRIPT_LOG = 'scripts/download_images_from_cars_json.log'

with open('data/cars.json', 'r', encoding='utf-8') as f:
    cars = json.load(f)

os.makedirs('images/cars', exist_ok=True)

unique = {}
for car in cars:
    brand = car.get('brand', '').strip()
    model = car.get('model', '').strip()
    if not brand or not model:
        continue
    key = f"{brand}_{model}".replace(' ', '_')
    if key not in unique:
        unique[key] = car.get('image')

results = {'downloaded': [], 'skipped': [], 'failed': []}
with open(SCRIPT_LOG, 'w', encoding='utf-8') as log:
    log.write(f"Found {len(unique)} unique cars\n")
    for key, url in sorted(unique.items()):
        out_file = f'images/cars/{key}.png'
        if url is None:
            results['skipped'].append({'key': key, 'reason': 'no image url'})
            log.write(f"SKIP {key} no image url\n")
            continue
        if os.path.exists(out_file) and os.path.getsize(out_file) > 2000:
            results['skipped'].append({'key': key, 'reason': 'already exists'})
            log.write(f"SKIP {key} exists\n")
            continue
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
            })
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            if len(data) < 1000:
                raise ValueError(f'Image too small {len(data)} bytes')
            with open(out_file, 'wb') as f:
                f.write(data)
            results['downloaded'].append(key)
            log.write(f"OK {key} {len(data)} bytes\n")
        except Exception as e:
            results['failed'].append({'key': key, 'error': str(e)})
            log.write(f"ERR {key} {e}\n")

with open('scripts/download_images_from_cars_json_report.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print('done', len(results['downloaded']), 'downloaded,', len(results['failed']), 'failed,', len(results['skipped']), 'skipped')
