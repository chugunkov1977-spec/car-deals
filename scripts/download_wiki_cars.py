import sys, json, os, requests, urllib.parse
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def get_wikipedia_image_url(title):
    session = requests.Session()
    session.headers.update({'User-Agent': 'CarDealsBot/1.0 (contact: none)'})
    # Try pageimage original first
    params = {
        'action': 'query',
        'format': 'json',
        'prop': 'pageimages',
        'titles': title,
        'piprop': 'original'
    }
    try:
        r = session.get('https://en.wikipedia.org/w/api.php', params=params, timeout=30)
        r.raise_for_status()
    except Exception:
        return None
    data = r.json()
    pages = data.get('query', {}).get('pages', {})
    for page in pages.values():
        if 'original' in page:
            url = page['original'].get('source')
            if url and 'upload.wikimedia.org' in url and url.lower().endswith(('.png', '.jpg', '.jpeg')):
                return url
    # Fallback: find images on page and pick first jpg/png
    params = {
        'action': 'query',
        'format': 'json',
        'prop': 'images',
        'titles': title,
        'imlimit': 'max'
    }
    try:
        r = session.get('https://en.wikipedia.org/w/api.php', params=params, timeout=30)
        r.raise_for_status()
    except Exception:
        return None
    data = r.json()
    pages = data.get('query', {}).get('pages', {})
    image_titles = []
    for page in pages.values():
        for im in page.get('images', []):
            fn = im.get('title', '')
            if fn.lower().endswith(('.png', '.jpg', '.jpeg')):
                image_titles.append(fn)
    for fn in image_titles:
        params2 = {
            'action': 'query',
            'titles': fn,
            'prop': 'imageinfo',
            'iiprop': 'url',
            'format': 'json'
        }
        try:
            r = session.get('https://en.wikipedia.org/w/api.php', params=params2, timeout=30)
            r.raise_for_status()
        except Exception:
            continue
        data2 = r.json()
        for p in data2.get('query', {}).get('pages', {}).values():
            for ii in p.get('imageinfo', []):
                url = ii.get('url')
                if url and 'upload.wikimedia.org' in url and url.lower().endswith(('.png', '.jpg', '.jpeg')):
                    return url
    return None


def find_best_image_for_query(query):
    session = requests.Session()
    session.headers.update({'User-Agent': 'CarDealsBot/1.0 (contact: none)'})
    params = {
        'action': 'query',
        'format': 'json',
        'list': 'search',
        'srsearch': query,
        'srlimit': 5,
        'srprop': ''
    }
    try:
        r = session.get('https://en.wikipedia.org/w/api.php', params=params, timeout=30)
        r.raise_for_status()
    except Exception:
        return None, None
    data = r.json()
    search = data.get('query', {}).get('search', [])
    for s in search:
        title = s.get('title')
        url = get_wikipedia_image_url(title)
        if url:
            return title, url
    return None, None


if __name__ == '__main__':
    with open('data/cars.json', 'r', encoding='utf-8') as f:
        cars = json.load(f)
    unique = []
    seen = set()
    for c in cars:
        key = (c.get('brand','').strip(), c.get('model','').strip())
        if key not in seen:
            seen.add(key)
            unique.append(key)
    print(f'Unique models: {len(unique)}')

    candidates = []
    for brand, model in unique:
        query = f'{brand} {model} car'
        print('\nSearching:', query)
        title, url = find_best_image_for_query(query)
        if not url:
            # fallback with just brand model
            print('Fallback search:', f'{brand} {model}')
            title, url = find_best_image_for_query(f'{brand} {model}')
        print('Result:', title, url)
        candidates.append((brand, model, title, url))

    with open('scripts/download_candidates.txt', 'w', encoding='utf-8') as f:
        for brand, model, title, url in candidates:
            f.write(f'{brand}\t{model}\t{title}\t{url}\n')
    print('\nSaved candidates to scripts/download_candidates.txt')
