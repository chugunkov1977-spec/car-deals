import os, urllib.request, time

in_path = 'scripts/download_candidates2.txt'
out_dir = 'images/cars'
os.makedirs(out_dir, exist_ok=True)

with open(in_path, 'r', encoding='utf-8') as f:
    lines = [l.strip() for l in f if l.strip()]

for line in lines:
    parts = line.split('\t')
    if len(parts) < 4:
        continue
    brand, model, title, url = parts
    if not url:
        print('SKIP missing', brand, model)
        continue
    safe_name = f"{brand}_{model}.png".replace(' ', '_').replace('/', '_').replace('\\', '_')
    out_path = os.path.join(out_dir, safe_name)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        print('skip existing', safe_name)
        continue
    time.sleep(10)
    thumb_url = url
    if '/thumb/' not in url and '/commons/' in url:
        prefix, suffix = url.split('/commons/', 1)
        if '/' in suffix:
            file_path = suffix
            filename = file_path.split('/')[-1]
            thumb_url = prefix + '/commons/thumb/' + file_path + '/1200px-' + filename
    for attempt in range(1, 4):
        try:
            req = urllib.request.Request(thumb_url, headers={'User-Agent': 'CarDealsBot/1.0', 'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'})
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
            with open(out_path, 'wb') as f:
                f.write(data)
            print('downloaded', safe_name, len(data), 'from', thumb_url)
            break
        except Exception as e:
            print('FAIL attempt', attempt, safe_name, e)
            if attempt < 3:
                time.sleep(8)
            else:
                print('FAILED final', safe_name, url)
