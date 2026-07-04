# GÖNCÜ MENU PRO - Sprint 3 Notları

## Tamamlananlar

- `js/allergens.js` oluşturuldu.
- Alerjen verisi `data/nutrition.json` içindeki `allergensLegend` ve ürün kayıtlarından okunur.
- Ürün kartlarına mini alerjen ikonları eklendi.
- Popup içinde premium alerjen bilgi alanı yenilendi.
- Alerjen pill tasarımı, özet etiketi ve bilgilendirme notu eklendi.
- Türkçe / İngilizce alerjen isimleri aktif dile göre gösterilir.
- Ana alerjen işaretli değilse güvenli ifade kullanılır: “Kayıtlı ana alerjen yok”.
- Çapraz temas uyarısı eklendi.
- Mevcut HTML yapısı bozulmadı; sistem DOM üzerinden çalışır.

## Script sırası

```html
<script src="js/nutrition.js" defer></script>
<script src="js/allergens.js" defer></script>
<script src="js/modal.js" defer></script>
```

## Test

1. Live Server ile `index.html` aç.
2. Menü kartlarının üzerinde küçük alerjen ikonlarının göründüğünü kontrol et.
3. Bir ürüne tıkla.
4. Popup içindeki “Alerjen Bilgilendirmesi” alanını kontrol et.
5. TR/EN dil değiştirince alerjen isimlerinin güncellendiğini kontrol et.
