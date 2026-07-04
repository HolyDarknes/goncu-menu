# Sprint 3 Hotfix - Alerjen / Besin Alanı Görünmüyor

Bu hotfix, popup içinde besin ve alerjen alanlarının sessizce gizlenmesi yerine
entegrasyon hatasını görünür hale getirir.

## Neden gerekli oldu?

Popup açılıyor ama besin ve alerjen alanı görünmüyorsa genellikle sebep şudur:

1. `nutrition.js` index.html içinde bağlı değildir.
2. `allergens.js` index.html içinde bağlı değildir.
3. Script sırası yanlıştır.
4. `data/nutrition.json` dosyası doğru konumda değildir.
5. Proje `file://` ile açılmıştır; JSON fetch engellenmiştir. VS Code Live Server kullanılmalıdır.

## Doğru script sırası

`index.html` dosyasında `</body>` kapanışından hemen önce:

```html
<script src="js/nutrition.js" defer></script>
<script src="js/allergens.js" defer></script>
<script src="js/modal.js" defer></script>
```

## Beklenen sonuç

Pesto Fettuccine ürününde şu alerjenler görünmelidir:

- 🌾 Gluten
- 🥛 Süt
- 🌰 Kuruyemiş

Ayrıca besin değerleri de popup içinde görünmelidir.
