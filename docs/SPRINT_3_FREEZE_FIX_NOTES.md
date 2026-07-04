# Sprint 3 Freeze Fix

Bu paket, modal açıldığında "Besin değerleri yükleniyor..." ekranında kalıp tarayıcıyı donduran hatayı giderir.

## Sorunun nedeni

`data/nutrition.json` herhangi bir nedenle yüklenemediğinde `GoncuNutrition.isReady()` false kalıyordu. Modal her yeniden render olduğunda aynı hazır promise'e tekrar bağlanıyor ve promise zaten tamamlandığı için hızlı bir render döngüsü oluşabiliyordu.

## Yapılan düzeltme

- `js/nutrition.js` güvenli hata durumuna geçirildi.
- JSON yükleme için 4.5 saniyelik timeout eklendi.
- JSON yüklenemezse sonsuz "yükleniyor" döngüsü durduruldu.
- Modal artık hatayı kullanıcıya açık şekilde gösterir.
- `modal.js` içinde data refresh sadece bir kez planlanır.
- `nutrition.json` geçerli JSON olarak pakete tekrar dahil edildi.

## Script sırası

index.html içinde `</body>` öncesi sıra kesinlikle şöyle olmalıdır:

```html
<script src="js/nutrition.js" defer></script>
<script src="js/allergens.js" defer></script>
<script src="js/modal.js" defer></script>
```

## Test

VS Code Live Server veya GitHub Pages ile test edin. Dosyayı doğrudan çift tıklayıp `file://` olarak açmayın.
