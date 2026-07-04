# GÖNCÜ MENU PRO - Sprint 4 Notları

## Sprint 4: Arama ve Kategori Filtreleme

Bu sprint mevcut HTML yapısını bozmadan premium arama sistemi ekler.
Ürünler yine `index.html` içindeki mevcut `.menu-item` yapısından okunur.

## Eklenen dosyalar

```text
css/search.css
js/search.js
```

## Özellikler

- Menü üstüne premium glassmorphism arama paneli otomatik eklenir.
- Ürün adı, açıklama, kategori ve fiyat içinde arama yapar.
- Türkçe ve İngilizce metinleri birlikte indeksler.
- Aktif dil değiştiğinde arama paneli TR / EN uyumlu güncellenir.
- Kategori chip filtresi oluşturur.
- Sonuç sayacı gösterir.
- Sonuç bulunamadığında profesyonel boş durum alanı gösterir.
- Filtre temizleme ve arama temizleme butonları içerir.
- Mobilde yatay kaydırmalı kategori filtreleri vardır.
- Vanilla JavaScript kullanır; jQuery yoktur.
- Mevcut ürün kartlarını silmez, sadece görünür/gizli durumunu yönetir.
- Performans için kısa debounce kullanır.
- Diğer sprintlerde kullanılmak üzere `window.GoncuSearch` API'si oluşturur.

## Entegrasyon

`index.html` içinde CSS bağlantısı head bölümünde bulunmalı:

```html
<link rel="stylesheet" href="css/search.css">
```

Önerilen konum:

```html
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/modal.css">
<link rel="stylesheet" href="css/search.css">
```

`index.html` sonunda script sırası şöyle olmalı:

```html
<script src="js/nutrition.js" defer></script>
<script src="js/allergens.js" defer></script>
<script src="js/search.js" defer></script>
<script src="js/modal.js" defer></script>
```

## Test adımları

1. VS Code içinde Live Server ile `index.html` dosyasını aç.
2. Menü üstünde arama alanı görünüyor mu kontrol et.
3. `omlet`, `pizza`, `pesto`, `cola`, `kahve` gibi kelimeler ara.
4. Kategori chiplerine tıkla.
5. Dil butonundan EN / TR değiştir ve arama panelinin güncellendiğini kontrol et.
6. Sonuç bulunmayan bir kelime yaz ve boş durum ekranını kontrol et.
7. Ürün kartına tıklayınca mevcut popup hâlâ açılıyor mu kontrol et.

## Commit mesajı

```text
Sprint 4 search system
```
