import json, urllib.request, urllib.parse, urllib.error, sys, time

UA = 'CarDealsBot/1.0 (compatible; +https://example.com)'

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def get_search_titles(query):
    q = urllib.parse.quote(query)
    url = f'https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch={q}&srlimit=5&srprop='
    try:
        data = fetch_json(url)
    except Exception:
        return []
    return [item['title'] for item in data.get('query', {}).get('search', [])]


def get_pageimage(title):
    q = urllib.parse.quote(title)
    url = f'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles={q}&piprop=original'
    try:
        data = fetch_json(url)
    except Exception:
        return None
    for p in data.get('query', {}).get('pages', {}).values():
        o = p.get('original')
        if o and o.get('source') and 'upload.wikimedia.org' in o['source']:
            u = o['source']
            if u.lower().endswith(('.jpg','.jpeg','.png')):
                return u
    return None


def get_image_from_page(title):
    q = urllib.parse.quote(title)
    url = f'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=images&titles={q}&imlimit=max'
    try:
        data = fetch_json(url)
    except Exception:
        return None
    filetitles = []
    for p in data.get('query', {}).get('pages', {}).values():
        for i in p.get('images', []):
            t = i.get('title','')
            if t.lower().endswith(('.jpg', '.jpeg', '.png')):
                filetitles.append(t)
    for t in filetitles:
        q2 = urllib.parse.quote(t)
        url2 = f'https://en.wikipedia.org/w/api.php?action=query&format=json&titles={q2}&prop=imageinfo&iiprop=url'
        try:
            data2 = fetch_json(url2)
        except Exception:
            continue
        for p2 in data2.get('query', {}).get('pages', {}).values():
            for ii in p2.get('imageinfo', []):
                u = ii.get('url')
                if u and 'upload.wikimedia.org' in u and u.lower().endswith(('.jpg','.jpeg','.png')):
                    return u
    return None


def find_image(brand, model):
    for q in [f'{brand} {model} car', f'{brand} {model}', f'{model} {brand}']:
        titles = get_search_titles(q)
        for t in titles:
            img = get_pageimage(t)
            if img:
                return t, img
            img = get_image_from_page(t)
            if img:
                return t, img
            time.sleep(0.3)
    return None, None


if __name__ == '__main__':
    with open('data/cars.json', 'r', encoding='utf-8') as f:
        cars = json.load(f)
    unique=[]
    seen=set()
    for c in cars:
        k=(c.get('brand','').strip(), c.get('model','').strip())
        if k not in seen:
            seen.add(k)
            unique.append(k)
    out=[]
    for brand, model in unique:
        print(f'Searching {brand} {model}')
        t, u = find_image(brand, model)
        print('=>', t, u)
        out.append((brand, model, t or '', u or ''))
        time.sleep(0.4)
    with open('scripts/download_candidates2.txt', 'w', encoding='utf-8') as f:
        for brand, model, t, u in out:
            f.write(f'{brand}\t{model}\t{t}\t{u}\n')
