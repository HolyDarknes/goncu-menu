# GÖNCÜ MENU PRO - Sprint 2 Notları

## Tamamlananlar

- `data/nutrition.json` oluşturuldu.
- Ürün adı + kategori bazlı otomatik eşleştirme sistemi yazıldı.
- Türkçe karakter destekli slug sistemi eklendi.
- TR/EN ürün adları için alias desteği hazırlandı.
- `js/nutrition.js` ile JSON veri katmanı oluşturuldu.
- Sprint 1 `js/modal.js` dosyası Sprint 2 uyumlu hale getirildi.
- Popup içinde kalori, protein, karbonhidrat, yağ, doymuş yağ, şeker, lif, tuz, porsiyon bilgisi gösterimi aktif edildi.
- Alerjen verileri JSON içinden ikonlu objelere çevrilecek şekilde hazırlandı.

## Önemli

Besin değerleri yaklaşık değerlerdir. Resmi laboratuvar analizi değildir. Ticari QR menüde bilgi notu olarak kullanılabilir; alerjen konusunda mutfak doğrulaması ayrıca yapılmalıdır.

## Entegrasyon

`index.html` içinde `</body>` kapanışından önce script sırası şöyle olmalı:

```html
<script src="js/nutrition.js" defer></script>
<script src="js/modal.js" defer></script>
```

`js/modal.js` dosyasını Sprint 1 versiyonunun üzerine yazın. `css/modal.css` değişmedi ama zip içinde tekrar verildi.

## Kontrol

- Ürüne tıkla.
- Popup açılınca ürün fotoğrafı, ad, fiyat ve açıklama görünmeli.
- JSON yüklendiğinde besin değerleri otomatik görünmeli.
- İnternette/GitHub Pages üzerinde çalıştırmak önerilir. Dosyayı bilgisayarda çift tıklayarak açarsanız bazı tarayıcılar JSON fetch işlemini güvenlik nedeniyle engelleyebilir.

## JSON ürün sayısı

`nutrition.json` içinde 225 ürün kaydı var.
