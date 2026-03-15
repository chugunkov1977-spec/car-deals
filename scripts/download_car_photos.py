import os, json, urllib.request

with open('data/cars.json','r',encoding='utf-8') as f:
    cars = json.load(f)
keys = sorted({(car['brand'] + '_' + car['model']).replace(' ', '_') for car in cars})

photos = {
    'Toyota_Camry': 'https://www.pngplay.com/wp-content/uploads/13/Toyota-Camry-Transparent-Images.png',
    'Toyota_RAV4': 'https://www.pngplay.com/wp-content/uploads/13/Toyota-RAV4-PNG-Photos.png',
    'Toyota_Corolla': 'https://www.pngplay.com/wp-content/uploads/13/Toyota-Corolla-Transparent-File.png',
    'Toyota_Land_Cruiser_Prado': 'https://www.pngplay.com/wp-content/uploads/13/Toyota-Land-Cruiser-Prado-PNG-HD-Quality.png',
    'Kia_K5': 'https://www.pngplay.com/wp-content/uploads/13/Kia-K5-PNG-Clipart-Background.png',
    'Kia_Rio': 'https://www.pngplay.com/wp-content/uploads/13/Kia-Rio-PNG-Image-HD.png',
    'Kia_Sportage': 'https://www.pngplay.com/wp-content/uploads/13/Kia-Sportage-Transparent-File.png',
    'Kia_Ceed': 'https://www.pngplay.com/wp-content/uploads/13/Kia-Ceed-PNG-Free-File-Download.png',
    'Hyundai_Tucson': 'https://www.pngplay.com/wp-content/uploads/13/Hyundai-Tucson-PNG-File-HD.png',
    'Hyundai_Solaris': 'https://www.pngplay.com/wp-content/uploads/13/Hyundai-Accent-PNG-Pic.png',
    'Hyundai_Creta': 'https://www.pngplay.com/wp-content/uploads/13/Hyundai-Creta-Free-PNG.png',
    'Hyundai_Santa_Fe': 'https://www.pngplay.com/wp-content/uploads/13/Hyundai-Santa-Fe-PNG-Image-File.png',
    'Volkswagen_Polo': 'https://www.pngplay.com/wp-content/uploads/13/Volkswagen-Polo-PNG-HD-Quality.png',
    'Volkswagen_Tiguan': 'https://www.pngplay.com/wp-content/uploads/13/Volkswagen-Tiguan-Free-PNG.png',
    'BMW_3_Series': 'https://www.pngplay.com/wp-content/uploads/13/BMW-3-Series-PNG-Photos.png',
    'BMW_X3': 'https://www.pngplay.com/wp-content/uploads/13/BMW-X3-Free-PNG.png',
    'Mercedes-Benz_C-Class': 'https://www.pngplay.com/wp-content/uploads/13/Mercedes-Benz-C-Class-PNG-Image-File.png',
    'Mercedes-Benz_GLC': 'https://www.pngplay.com/wp-content/uploads/13/Mercedes-Benz-GLC-PNG-Pic.png',
    'Skoda_Octavia': 'https://www.pngplay.com/wp-content/uploads/13/Skoda-Octavia-PNG-Image-HD.png',
    'Skoda_Kodiaq': 'https://www.pngplay.com/wp-content/uploads/13/Skoda-Kodiaq-Free-PNG.png',
    'Audi_A4': 'https://www.pngplay.com/wp-content/uploads/13/Audi-A4-PNG-Image-File.png',
    'Mazda_CX-5': 'https://www.pngplay.com/wp-content/uploads/13/Mazda-CX-5-PNG-Clipart-Background.png',
    'Nissan_Qashqai': 'https://www.pngplay.com/wp-content/uploads/13/Nissan-Qashqai-Background-PNG-Image.png',
    'Renault_Duster': 'https://www.pngplay.com/wp-content/uploads/13/Renault-Duster-PNG-Clipart-Background.png',
    'Lada_Vesta': 'https://avatars.mds.yandex.net/get-verba/1540742/2a00000170068523bb0f3e29a68c1604b24d/cattouchret',
    'Lada_Granta': 'https://avatars.mds.yandex.net/get-verba/997355/2a0000016e2fd86c4ea9afe02ad4fd6a97a1/cattouchret',
    'Lada_Vesta_SW_Cross': 'https://avatars.mds.yandex.net/get-verba/1540742/2a00000170068523bb0f3e29a68c1604b24d/cattouchret',
    'Chery_Tiggo_7_Pro': 'https://avatars.mds.yandex.net/get-verba/1030388/2a00000181ce9ede7b12c84f8e478a8c8b98/cattouchret',
    'Chery_Tiggo_8_Pro': 'https://avatars.mds.yandex.net/get-verba/1030388/2a00000181ce9ede7b12c84f8e478a8c8b98/cattouchret',
    'Haval_Jolion': 'https://avatars.mds.yandex.net/get-verba/1540742/2a0000017e0bae...