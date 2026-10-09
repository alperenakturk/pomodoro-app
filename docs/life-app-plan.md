# Life App: Değerlendirme ve Birleşik Yol Haritası

> **Durum:** Taslak / karar bekliyor. Bu doküman bir plan; kod, schema ya da config değişikliği içermiyor.
> **Tarih:** 2026-10-07
> **Hazırlayan:** sanal ürün ekibi. Lider sentezi ve 8 uzman ajan raporu: pazar, mühendislik, kullanıcı, yatırımcı, UX, güvenlik/hukuk, red team, mobil platform.
> **Kısaltmalar:** "Gerçek" = kaynakla doğrulanmış bilgi. "Tahmin" = gerekçeli kestirim. "Görüş" = yargı. Doğrulanamayan şeyler açıkça işaretlendi.

---

## 1. Yönetici özeti ve öneri

### Öneri: **GO SMALLER**: daha küçük başla, kapılarla büyü

Tam vizyon şu modüllerden oluşuyor: görev, harcama, iki yönlü Google Takvim, otomatik adım, istatistik, Pomodoro ve export, hepsi tek uygulamada ve mağazada. Haftada 5–10 saatle bu kapsam 12 ayda "gerçek ürün" seviyesine ulaşmaz.

- Tam plan için tahmin **300–700 saat**. Bu, pazarlama hariç **0,6–2,7 yıl** demek.
- Bu tahmin red team ile mühendisin aralıklarının birleşimi. Güven: yüksek.

Ama fikri tamamen bırakmak da gerekmiyor. Bir sebep: fikrin ön koşulları zaten canlı Pomodoro'nun ihtiyacı olan düzeltmeler. Diğer sebep: daha dar bir versiyonun gerçek bir açığı var.

**Önerilen yol, beş adım:**

1. **Önce temel (v0.1).** Canlı Pomodoro'daki veri doğruluğu ve güvenlik açıklarını kapat. Bunlar Life hiç yapılmasa da yapılmalı (bkz. §5.1).
2. **Kodlamadan önce 14 günlük ucuz deney.** Google Form ve Sheet ile "gün kapanışı" alışkanlığını kendinde test et. Paralelde bir landing page ile Play'in zorunlu tuttuğu 12 test kullanıcısını topla. Toplam yaklaşık 10 saat.
3. **Deney geçerse dar bir "Day" MVP'si yap.** Aynı uygulamanın içinde, web/PWA olarak:
   - tarihli görevler ve devretme, tarihsiz "Later" listesi;
   - hızlı harcama girişi (tek para birimi);
   - gün sonu özeti.

   Bunu 8 hafta kendin kullan.
4. **Android (Capacitor 8) ve kapalı test.** Ardından adım sayısı ve takvim, ölçülebilir kapılar (gate) geçilirse eklenir.
5. **İki ayrı uygulama yok.** Tek kullanıcı arayüzü olacak. Canlı Pomodoro web linki (CV linki) olduğu gibi yaşamaya devam edecek.

**Konumlandırma:** "Life hub" değil, **"Gününü planla, odaklan, günü kapat"**. Hedef kitle öğrenciler. Farkı yaratan şey 60 saniyelik gün kapanışı ritüeli.

### Bu öneriyi değiştirecek şeyler
- 14 günlük deney net geçerse **ve** 12+ yabancı test kullanıcısı gelirse, kapsam daha hızlı genişletilebilir.
- Deney başarısız olursa yalnızca "tarihli görev + devretme + gün özeti" Pomodoro'ya eklenir, Life rafa kalkar.

### En büyük 3 risk
1. **Veri katmanı finans verisine hazır değil.** Yazmalar sessizce kayboluyor, bir sütun eksikse tüm satır reddediliyor (PGRST204), sorgularda 1000 satır sınırı var. Sessizce kaybolan tek bir harcama, finans özelliğine olan güveni kalıcı olarak öldürür.
2. **Kapsam ve tempo.** Repo geçmişinde 62 commit'in 59'u 17 günde atılmış (3–19 Temmuz), son commit 20 Ağustos'ta, yani 48 gündür commit yok. 5 ürünlük plan, bu ritimle bitmez.
3. **Dağıtım ve rakipler.** TickTick (görev, takvim, Pomodoro, alışkanlık, istatistik; $49,99/yıl) ve Brite (görev, takvim, bütçe, Pomodoro) bu paketi zaten satıyor. Bundle'ın kendisi bir fark yaratmıyor. Ayrıca Play'in "12 test kullanıcısı × 14 gün" kapısı var.

### Araştırma sırasında bulunan canlı hatalar
Bunlar Life'tan bağımsız; hemen ele alınmalı.

| # | Bulgu | Kanıt | Güven |
|---|---|---|---|
| L1 | **Tick'ler sessizce 1000 satırda kesiliyor olabilir.** Streak, başarımlar ve ısı haritası yanlış hesaplanabilir. | Supabase varsayılanı 1000 satır ve kesme sessiz oluyor ([docs](https://supabase.com/docs/reference/javascript/v1/select), [PostgREST #2776](https://github.com/PostgREST/postgrest/issues/2776)). `fetchArrayTable` sorgusunda `order` ve `range` yok. | Mekanizma: yüksek. Senin hesabın etkilenmiş mi: **SQL ile doğrulanmalı** (§9, Adım 0) |
| L2 | **Mobil tarayıcıda Pomodoro bitince uygulama çökebilir.** `alert.js` `notify()` içinde `new Notification()` kullanıyor; bu çağrı mobil tarayıcıların çoğunda TypeError fırlatıyor. ErrorBoundary yok. | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification), koddan doğrulandı (`src/lib/alert.js:332-337`) | Orta (cihazda denenmedi) |
| L3 | **"Gün" kavramı UTC.** 9 yerde `toISOString().slice(0,10)` var. Türkiye'de bu, farkında olunmadan saat 03:00'te başlayan bir gün demek; başka saat dilimlerinde düpedüz hata. `reportsMath.datesInWindow` yerel ve UTC'yi karıştırıyor. | Koddan doğrulandı | Yüksek |
| L4 | **Hesap silme, arka plan görseli yüklemiş kullanıcıda başarısız olabilir.** Ya da görsel sahipsiz (orphan) kalır. `handleDeleteAccount` yalnızca `delete_user()` çağırıyor, Storage nesnesini silmiyor. | Koddan doğrulandı (`SettingsModal.jsx:99`). Supabase: "You cannot delete a user if they are the owner of any objects in Storage" ([docs](https://supabase.com/docs/guides/auth/managing-user-data)) | Orta-yüksek (gerçek projede test edilmeli) |
| L5 | **Kullanılan anon key 2026 sonunda kullanımdan kalkıyor.** Yaklaşık 3 ay kaldı. | [Supabase API keys](https://supabase.com/docs/guides/api/api-keys) | Yüksek |
| L6 | **Gizlilik politikası yok**, ama hesap açma (e-posta ve Google) canlıda. GDPR/KVKK yükümlülükleri bugünden geçerli. | Repo taraması | Yüksek |
| L7 | **"anon hiçbir yetki almaz" varsayımı doğrulanmamış.** Supabase dokümanı yeni tablolara otomatik grant verildiğinden söz ediyor. | [RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) | Belirsiz. SQL ile kontrol edilmeli |

---

## 2. Karar kaydı (Decision log)

Her satırda bir öneri var. Son karar senin.

| # | Karar | Seçenekler | Öneri | Gerekçe | Senin kararın |
|---|---|---|---|---|---|
| D1 | Tek uygulama mı, iki uygulama mı? | A ayrı repo/uygulama · B tek uygulama, modüller · C tek repo, iki build · iki uygulama + bulut bağlantısı | **B + mevcut Pomodoro web deploy'u olduğu gibi kalsın.** İki uygulamalı bulut bağlantısı **reddedildi.** | Bulut bağlantısı yaklaşık 70–140 saat ek iş ve kalıcı 1,5–2× release yükü getirir. İki mağaza listesi ve iki ayrı 12×14 kapalı test gerekir. Tüm satırı birden yazan upsert, Pomodoro'nun `realized` sayısını sessizce ezer. 8 ajanın hepsi aynı fikirde. | ✅ Kabul (2026-10-09) |
| D2 | Pomodoro'nun ayrı build hedefi | `VITE_APP_TARGET` bayrağı (C) · sadece B | **Hafif bayrak.** Varsayılan hedef `pomodoro` olsun, bugünkü CI ve GitHub Pages değişmez. Life modülleri bayrak arkasında olur. Monorepo/workspaces **yapma.** | Canlı CV linki korunur. Mobil ajanın notu: ileride ayrı bir Pomodoro Android build'i Play'de `USE_EXACT_ALARM` iznine temiz şekilde uyar, Life uyamayabilir. | ✅ Kabul (2026-10-09) |
| D3 | Teknoloji yığını | Capacitor 8 · React Native/Expo · PWA/TWA | **Capacitor 8** | Yaklaşık %95 kod yeniden kullanılır. RN yeniden yazımı tahminen 150–300 saat. TWA, Health Connect'i ve ekran kapalıyken çalan alarmı karşılayamaz. Ajanlar oybirliğiyle aynı görüşte. | ✅ Kabul (2026-10-09). Şart: ileride Android ve iOS'a çıkış engellenmesin; arayüz güzel görünsün ve iyi çalışsın. Capacitor ikisini de destekler; iOS için Mac + Apple Developer ($99/yıl) gerekir, plan iOS'u v1 sonrasına bırakıyor. |
| D4 | Google Takvim | API ile iki yönlü · API ile salt okuma (Edge Function) · Android `CalendarContract` · sadece uygulama içi | **Life MVP'sinde yok.** Android fazında önce **`CalendarContract` spike'ı** (1 saat). Senkronu işletim sistemi yapar; OAuth doğrulaması ve backend gerekmez. Web için salt okunur API importu G2 kapısından sonra. **İki yönlü API senkronu yapma.** | İki yönlü senkron kendi başına bir ürün: 100–300+ saat, token deposu, `syncToken` ve 410 hatası, webhook yenileme, doğrulama, doğrulamaya kadar ömür boyu 100 kullanıcı sınırı. | ✅ Kabul (2026-10-09). Alperen: ilk sürümde sorun çıkaracaksa olmasın, ileride eklenebilsin yeter. |
| D5 | Adım sayısı | Otomatik Health Connect · elle giriş · yok | **Health Connect, Android fazından sonra.** Önce yalnızca cihazda göster; buluta senkron **açık ve ayrı onayla** olsun. MVP'de elle `daily_metrics` girişi yeterli. | Play Health politikası ve GDPR Art. 9 riski var. `READ_STEPS` başka bir uygulamada "aşırı" bulunup reddedilmiş ([örnek](https://github.com/simonoppowa/OpenNutriTracker/issues/1127)). | ☐ |
| D6 | Harcama kapsamı | 1Money seviyesi · MVP | **MVP:** tutar tamsayı alt birimde, tek para birimi, gelir için bir anahtar, kategori, not, gün/ay toplamı, CSV. Hesaplar, transfer, çoklu para birimi ve tekrarlayan harcama **v1'den sonra.** | 1Money seviyesi tek başına 120–220 saat ek iş. | ✅ Kabul (2026-10-09). Basit başla; detaylar sonra, mevcut sistemin üzerine eklenir. |
| D7 | Misafir modunda finans | Yerel + uyarı · hesap zorunlu · hiç bulut yok | **Yerel + net uyarı + export hatırlatması + `navigator.storage.persist()`.** Native tarafta WebView localStorage değil SQLite/Preferences. | AGENTS.md'nin "misafir modu her zaman çalışır" kuralıyla uyumlu. "Veri sadece cihazında" bir pazarlama artısı da olur. | ✅ Kabul (2026-10-09), bir not ile: misafir verisi yerelde durur (1Money gibi). Alperen ayrıca hesapla giriş yapınca yerel verinin buluta aktarılmasını istiyor. DİKKAT: Pomodoro'da otomatik yerel→bulut birleştirme daha önce gerçek hatalar yüzünden kaldırıldı (bkz. AGENTS.md / remoteProvider.js yorumları). Harcama modülü için bunu açık onaylı, tek seferlik bir 'Verilerini hesabına aktar?' adımı olarak v0.3'te tasarla; sessiz otomatik birleştirme yapma. |
| D8 | Simple/Full yerine ne olacak? | Modül aç/kapa + modül başına derinlik · ikisi birden | **Modül aç/kapa + her modülde 1–2 "gelişmiş" anahtarı.** Misafir tüm yerel modülleri kullanır; yalnızca bulut senkronu ve Google hesap ister. Simple/Full, Pomodoro web hedefinde kalabilir. | İki ayrı ayar ekseni kullanıcının kafasını karıştırır (UX ve kullanıcı ajanları). | ☐ |
| D9 | Vizyon çatışması (RPG/AI/hikaye vs sade veri) | Life yeni vizyon · birleşik · ayrı | **Life (sade, veri zengini) ana vizyon olsun.** RPG, sosyal, AI ve masaüstü işleri `progress.md`'de **"Parked: koşullu"** bölümüne taşınsın. Mevcut streak ve başarımlar kalsın. | İki açık vizyon aynı 5–10 saat için yarışıyor. Red team'in uyarısı: "üçü de yarım kalır". Sosyal ve leaderboard ayrıca sunucu tarafında doğrulama gerektiriyor (§8). | ✅ Kabul (2026-10-09). Alperen'in tarifi: mantıklı adımlarla ilerleyen, arada ekleme/çıkarma yapılabilen, yaşamın birçok alanındaki veriyi tutan ve bizi ileri taşıyacak, sınırları belli bir uygulama. Sınırlar kapılar (G-1…G3) ve modül kuralları ile korunur. |
| D10 | Marka ve isim | Life ana marka · iki marka | **Tek ürün markası; isim henüz yok** ("Life", mağaza aramasında çok genel). Pomodoro, uygulamanın "Focus" modülü olur. Canlı Pomodoro web'i kendi adıyla kalır. | Tek mağaza listesi, tek kapalı test. İsim kararı v0.5'ten (mağaza listelemesi) önce alınmalı; maskot kararı da onunla birlikte. | ☐ |
| D11 | Staging Supabase projesi | Aç · açma | **Aç.** Ücretsiz katmanda 2 aktif proje hakkı var. Dev Mode ve branch'ler staging'e gider. | Tek proje hem main'e hem branch'e hizmet ediyor; Dev Mode gerçek hesaba yazabiliyor. Bir haftalık hareketsizlikte uykuya geçmesi staging için sorun değil. | ☐ |
| D12 | Para kazanma | Ücretsiz · freemium · tek seferlik | **G2 kapısına kadar para alma.** Sonrası için eğilim: freemium yıllık ~$20–30. Export her zaman ücretsiz. Lifetime konusunda ajanlar ayrışıyor (§12). | Play'de kişisel hesapla para kazanınca **ev adresin herkese açık gösteriliyor** ([kaynak](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)). | ☐ |
| D13 | Supabase planı | Free · Pro | **Gerçek kullanıcı ve finans verisi gelene kadar Free.** Public beta'da Pro ($25/ay), çünkü Free'de yedek yok ve proje uykuya geçebiliyor. | Bütçen ($25–30) bunu karşılıyor. | ☐ |
| D14 | Modül registry ve klasör sınırları | Tam registry şimdi · kural-üç (registry'yi ancak üçüncü modül eklenirken kur) | **Sınırlar şimdi, soyutlama sonra.** `src/modules/<id>` klasörleri, path alias'ları ve bir oxlint `no-restricted-imports` kuralı şimdi. Tam registry objesi 3. modül eklenirken. | Mühendis ile red team arasında orta yol (§12). | ☐ |
| D15 | Mevcut Capacitor prompt'u | Şimdi çalıştır · birleştir | **Şimdi çalıştırma.** v0.1–v0.4 bitince Life Android fazında (v0.5), bu dokümandaki eklentilerle birleştirerek güncelle. | L2 (`notify`), Google login'in WebView'de engellenmesi (`disallowed_useragent`), çevrimdışı okuma cache'i ve yazma kuyruğu önce çözülmeli. | ☐ |

---

## 3. Pazar bulguları

### 3.1 Senin iddiaların: doğrulama sonucu

| İddia | Sonuç | Kaynak |
|---|---|---|
| TickTick: görev + takvim + alışkanlık + Pomodoro | **Doğru.** $4,99/ay veya $49,99/yıl. iOS'ta 4,9★, 46 bin puan. Play'de 10M+ indirme (arama özeti). | [App Store](https://apps.apple.com/us/app/ticktick-to-do-list-calendar/id626144601), [fiyat](https://ticktick.com/about/upgrade) |
| Focus To-Do: Pomodoro + görev | **Doğru.** iOS'ta 4,8★, 15 bin puan. Yakın tarihli bir yorumda yaz saati değişikliği (DST) hatası sonrası veri kaybı anlatılıyor. | [App Store](https://apps.apple.com/us/app/focus-to-do-focus-timer-tasks/id966057213) |
| Sunsama ~$16/ay | **Eski bilgi.** Şimdi aylık $22 ya da yıllık ödemede $17/ay, ücretsiz katman yok. | [sunsama.com/pricing](https://www.sunsama.com/pricing) |
| Habitica'da Pomodoro yalnızca harici entegrasyonla | **Doğru.** Android Tasker entegrasyonu Temmuz 2025'te bozuldu. | [wiki](https://habitica.fandom.com/wiki/Pomodoro) |
| 1Money: hızlı harcama kaydı | **Doğru.** 5M+ indirme, 4,1★. Fiyatı **doğrulanamadı.** | [Play](https://play.google.com/store/apps/details?id=org.pixelrush.moneyiq&hl=en_US) |
| "Görev + bütçe + takvim + Pomodoro'yu birleştiren yaygın bir uygulama yok" | **Yanlış.** Böyle uygulamalar var ama küçük kalıyorlar (aşağıda). | |

### 3.2 Bu paket zaten var: uyarı işareti

| Uygulama | Modüller | Fiyat | Çekiş |
|---|---|---|---|
| **Brite** | Görev, Google/Apple takvim senkronu, alışkanlık, ruh hali, **bütçe**, **Pomodoro** | $29,99–39,99/yıl, $109,99 ömür boyu | iOS'ta 4,6★, **3,7 bin puan** ([App Store](https://apps.apple.com/us/app/daily-planner-schedule-brite/id1519999420)) |
| **Life Planner** | Görev, takvim, **para yönetimi**, alışkanlık, günlük | belirsiz | Play'de 100K+ indirme, 2,59 bin yorum (arama özeti) ([site](https://www.thelifeplanner.co/)) |
| **Lunatask** | Görev, alışkanlık, ruh hali, günlük, zamanlayıcı | $6–8/ay, $300 ömür boyu | iOS'ta 102 puan ([fiyat](https://lunatask.app/pricing)) |
| Compact, Done! | Hepsi bir arada | | 14 ve 375 iOS puanı ([Compact](https://apps.apple.com/us/app/id6502299932), [Done!](https://apps.apple.com/us/app/done-happy-productivity/id1058049013)) |

**Karşılaştırma için tek amaçlı liderler:**
- Structured: 167 bin iOS puanı.
- Money Manager (Realbyte): 466 bin Play yorumu.
- TickTick: 165 bin Play yorumu.

Hepsi bir arada uygulamalar bunların **10–100 kat gerisinde** (pazar ajanının tahmini; yorum sayısı yalnızca kaba bir gösterge).

**Brite'tan doğrudan ders:** Kötü yorumların ana teması "her görevin tarihi olmak zorunda" ve "tarih düzenleyince görev siliniyor ya da kopyalanıyor". Bu, senin "her kayda tarih sütunu" modelinin riskiyle birebir aynı. Çözüm: başından **tarihsiz "Later" görevleri** desteklemek.

### 3.3 Quantified-self bir niş
- **Exist.io:** resmi istatistik sayfasına göre **938 ödeme yapan kullanıcı**, son 4 haftada $6.674. Kurucular iki maaşı "zar zor" karşılamanın yaklaşık 4 yıl sürdüğünü söylüyor ([stats](https://hellocode.co/stats/), [blog](https://exist.io/blog/the-way-we-run-exist/)).
- **r/QuantifiedSelf:** yaklaşık 28 bin üye.
- **Daylio:** iki dokunuşla günlük kayıt. Üçüncü taraf tahminine göre iOS'ta ayda ~$100 bin. "Küçük günlük ritüel" satabiliyor.

Sonuç: "veri merkezi" söylemini manşete koyma; elde tutmayı (retention) artıran bir özellik olarak kullan.

### 3.4 Kullanıcı şikâyetleri
- **TickTick:** karmaşa, takvimin ~15 dakikada bir senkron olması, zorunlu giriş ([efficient.app](https://efficient.app/apps/ticktick), [Capterra](https://www.capterra.com/p/170641/TickTick/reviews/)).
- **Finans uygulamaları:** ücretli ve güvenilmez banka senkronu, reklam, abonelik dayatması. Kaynaklar rakip içerik, bağımsızlık düşük.
- **Kapanmalar ve veri kilidi:**
  - Mint 2024'te kapandı ([alternativeto](https://alternativeto.net/news/2023/11/intuit-to-discontinue-mint-app-in-2024-merging-features-into-credit-karma/)).
  - Rise Calendar 2025'te kapandı.
  - Amie takvim ürününü ikinci plana attı.
  - Bu yüzden **CSV export bir güven özelliği**; pazarlamada öne çıkar.

### 3.5 Türkiye
- **Finans:** DEFTER (Excel export'u var) ve GiderimVar. Spendee ve Wallet Türk bankalarını destekliyor ([webtekno](https://www.webtekno.com/hesap-kurdu-finans-uygulamalari-andorid-ios-h86545.html)).
- **Çalışma ve odak:** YKS/KPSS öğrencileri Forest ve Study Bunny kullanıyor. Odakoo sosyal Pomodoro platformu olarak konumlanıyor ([odakoo](https://odakoo.com/home)).
- **Kayda değer bir Türk "life hub" uygulaması bulunamadı.**

### 3.6 Konumlandırma seçenekleri
| # | Konum | Artı | Eksi |
|---|---|---|---|
| A | "Life hub", tüm modüller | Senin vizyonun | Brite/Life Planner/TickTick ile kafa kafaya; ASO anahtar kelimeleri belirsiz; 5 modülün hepsini cilalamak gerekir |
| **B** | **Odak kaması:** Pomodoro + devreden günlük görevler | Mevcut varlığı kullanır; "pomodoro / study timer" çok aranıyor | Kalabalık bir alan |
| **C** | **"Gün kapanışı":** 60 saniyelik akşam özeti (yapılan/devreden, bugün harcanan, odak dakikası, adım) | Gerçek bir fark; tarih merkezli modeli kullanır | Yeni bir alışkanlık öğretmek gerekir |
| D | Türkçe öğrenci nişi | ASO rekabeti az; test kullanıcısı bulmak kolay | Alım gücü düşük; "global" hedefinle çelişir |

**Öneri (pazar ajanı + lider): B'yi giriş noktası yap, C'yi fark yaratan unsur olarak kullan.** Slogan: *"Gününü planla, odaklan, günü kapat."*

---

## 4. Kullanıcılar ve ihtiyaçlar

> Not: Reddit erişimi engelliydi. Kullanıcı sesleri Hacker News, App Store yorumları ve anketlerden alındı.

| Persona | İhtiyaç (1–5) | Olmazsa olmaz | Geçiş tetikleyicisi | 1. haftada bırakma sebebi | Ödeme |
|---|---|---|---|---|---|
| **(a) Alperen** (öğrenci geliştirici, **yanlı**) | 5 | Hepsi | Kendi aracı | Yok (kurucu yanlılığı) | — |
| **(b) Tam acemi** | 2 | Bugün listesi + devretme | 30 saniyede değer görmek | Modül seçicisi, kayıt duvarı, boş istatistik ekranı | $0 |
| **(c) Öğrenci** (ders, yarı zamanlı iş, dar bütçe) | 3 | Görev + devretme, hızlı harcama, gece özeti, Pomodoro. Takvim salt okunur olsa yeter. | Tek yerde "bugün" | Her gün 3 ayrı şey girme yorgunluğu | Yinelenen $0 (YNAB öğrencilere 1 yıl, Notion Education ücretsiz). Tek seferlik $5–15 destek ödemesi (tahmin). |
| **(d) Profesyonel / freelancer** (TickTick/Notion kullanıcısı) | 2 | Tekrarlayan görev, import, web, iki yönlü senkron | TickTick'in sahip olmadığı bir şey | Eksik özellik | $30–50/yıl, ama 1. yılda değil |

**Kanıtlar:**
- CampusWell anketinde öğrencilerin %54'ü "çok meşgul oldukları için" bütçe tutmuyor ([campuswell](https://www.campuswell.com/free-budgeting-apps/)).
- PYMNTS'e göre tüketicilerin yalnızca %14'ü günlük bütçe hatırlatmasını açıyor ([pymnts](https://www.pymnts.com/financial-apps/2025/daily-budget-app-adoption-stalls-at-14-percent/)).
- How-To Geek'ten bir alıntı: "üretken olmaktan çok sistemi kurmaya zaman harcıyorsun" ([link](https://www.howtogeek.com/i-stopped-using-notion-for-everything-and-my-notes-are-better-because-of-it/)).

**Kafa karıştıracak noktalar:**
- Simple/Full ile modül anahtarlarının aynı anda var olması.
- Misafirken finans verisinin kaybolma riski.
- "Bugün" gece 01:00'de ne demek? Gün sınırı ayarı gerekiyor.

**Sonuç:**
- **Önce öğrenci personası (c) için tasarla.** Sen de öğrencisin, yani kendi kullanımın geçerli bir test. Akranlarına ulaşabilirsin.
- **Acemi personası (b) onboarding testi olsun:** ilk 30 saniyede değer görmeli.
- **Tüm "Life" paketine kurucudan başka kimse ihtiyaç duymuyor.** Dar versiyonun (bugün listesi + ≤3 dokunuşla harcama + tek bir gün sonu kartı) makul bir öğrenci kitlesi var.
- **Kayıp çarpanı (illüstrasyon, ölçüm değil):** Görevler kullanıcıların yarısını, harcama da yarısını tutsa, ikisini birden kullanan yaklaşık dörtte bir kalır. Günlük kayıt gerektiren her modül kaybı katlar.

---

## 5. Teknik fizibilite ve mimari

### 5.1 Önce ödenecek teknik borç (Life olmasa da Pomodoro'ya yarar)

| Sıra | İş | Tahmin (saat) | Not |
|---|---|---|---|
| 1 | Tick truncation kontrolü + sayfalanmış yükleme (`.order('created_at').order('id').range()` döngüsü) | 6–12 | Testte 1000 satırda kesen sahte bir client kullanılır |
| 2 | `notify()` düzeltmesi: try/catch + `serviceWorker.ready` → `showNotification()` + üst düzey ErrorBoundary | 3–6 | L2 |
| 3 | `supabase/migrations/` klasörü (`0001_baseline.sql` = bugünkü schema.sql dondurulur) + `columns.json` drift testi + **bilinmeyen sütunu reddeden** sahte client | 10–18 | PGRST204 sınıfı hataları test aşamasında yakalar |
| 4 | Staging Supabase projesi + `.env` ayrımı | 3–6 | Dev Mode artık prod'a dokunmaz |
| 5 | Yerel gün + yapılandırılabilir sınır: `dayKey(now, dayStartHour)`, varsayılan 04:00, `useToday()` ve gün dönümü, TZ test matrisi | 8–15 | L3 |
| 6 | Yazma hatalarını görünür yap: banner + "senkron bekliyor/başarısız" göstergesi | 5–8 | Kuyruktan önceki ilk adım |
| 7 | Hesap silme: önce Storage nesnesini sil (L4); publishable key'e geçiş (L5); grants denetimi (L7) | 4–8 | Güvenlik |
| 8 | Klasör sınırları + path alias + oxlint kuralı + import graph testi | 12–20 | Hafif sürüm (D14) |
| 9 | App.jsx'i böl: shell + panel bileşenleri. "Tüm paneller mounted, sadece gizli" kuralı korunur. | 20–40 | 1227 satır |

1–7 arası toplam yaklaşık **40–75 saat**; 8–9 ile yaklaşık **70–135 saat** (tahmin).

### 5.2 Modül başına efor (tahmin; Capacitor varsayımıyla)

Tek kişinin kendi tahminleri genelde 1,5–2 kat aşılır.

| Modül | Saat | Hafta (10 sa → 5 sa/hafta) |
|---|---|---|
| Tarihli görev + devretme + "Later" | 25–45 | 3–9 |
| Harcama MVP | 35–60 | 4–12 |
| Harcamayı 1Money seviyesine çıkarma (MVP'nin üstüne) | 120–220 | 12–44 |
| Uygulama içi basit takvim (+ tekrarlayan etkinlik RRULE için 30–60) | 30–50 | 3–10 |
| Google Takvim salt okuma (API, Edge Function) | 40–70 + doğrulama süresi | 4–14 |
| Google Takvim iki yönlü (API) | +100–180 (mobil ajan: toplam 150–300+) | 10–36+ |
| Android `CalendarContract` ile okuma/yazma (red team) | 15–40 | 2–8 |
| Gün sonu incelemesi (modüller arası) | 20–35 | 2–7 |
| `daily_metrics` + elle adım girişi | 12–20 | 1–4 |
| Health Connect adımları | 15–40 + Play beyanı | 2–8 |
| CSV export (tüm modüller) + Capacitor Filesystem/Share | 16–30 | 2–6 |
| Çevrimdışı yazma kuyruğu | 30–50 | 3–10 |
| Kalıcı okuma cache'i (giriş yapmış kullanıcı çevrimdışı açınca) | 15–25 | 2–5 |
| Capacitor Android kabuğu (native Google login, local notification, deep link) | 25–45 | 3–9 |

**Toplamlar:**
- **Kesilmiş MVP** (temel + görev + harcama + gün özeti): **110–180 saat**, haftada 7,5 saatle yaklaşık **3–6 ay**.
- **Geniş MVP:** 200–330 saat, yaklaşık 5–11 ay.
- **Mağazaya hazır Android v1:** başlangıçtan itibaren **12–24 ay**.

### 5.3 Mimari karşılaştırma

| | A: ayrı uygulamalar | **B: tek uygulama, modüller** | C: tek repo, iki build (monorepo) | İki uygulama + bulut bağlantısı |
|---|---|---|---|---|
| Kod paylaşımı | Kopyala-yapıştır, zamanla ayrışır | Tam | Tam | Tam (ama ayrı ayrı yayınlanır) |
| Mağaza yükü | 2 listeleme, 2 kapalı test | 1 | 1 | 2 listeleme, 2 kapalı test |
| Modüller arası veri | Bulut üzerinden | Sözleşmeyle doğrudan | Sözleşmeyle doğrudan | Handoff tablosu, realtime/polling, çakışmalar |
| Pomodoro bağımsız kalır mı? | Evet | Yutulma riski | Evet | Evet |
| Ek maliyet | Yüksek | Düşük | B + 20–40 saat araç kurulumu | **+70–140 saat + kalıcı 1,5–2× release yükü** |
| **Karar** | ✗ | **✓ (hafif bayrakla)** | Monorepo ✗ / bayrak ✓ | **✗** |

### 5.4 Modül sınır kuralları (uygulanabilir sürüm)
1. **Klasör yapısı:** `src/core/{storage,auth,i18n,time,ui}` ve `src/modules/<id>/{components,hooks,lib,storage.js,contract.js}`.
2. **Bağımlılık kuralı:** Bir modül yalnızca `@core/*` ve başka modüllerin `contract.js` dosyasını import edebilir, iç dosyalarını asla. Örnek: Focus, görevlere `tasks/contract.js` üzerinden erişir; `daySummary(date)` gibi sözleşmeler orada tanımlanır.
3. **Zorlama:**
   - oxlint `overrides` + `no-restricted-imports` (desen eşleşmesi import metnine yapıldığı için **alias zorunlu**) ve `import/no-cycle`. Kaynaklar: [no-restricted-imports](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports.html), [no-cycle](https://oxc.rs/docs/guide/usage/linter/rules/import/no-cycle.html), [config overrides](https://oxc.rs/docs/guide/usage/linter/config.html).
   - Yedek olarak bir Vitest "mimari testi": `src/**` import grafiğini tarar ve iki şeyi doğrular. (a) Modülden modüle kenar yalnızca `contract.js`'e gidebilir. (b) `supabase` ve `localStorage` yalnızca `src/core/storage/**` içinde geçebilir.
4. **AGENTS.md değişikliği (uygulama aşamasında):** "yalnızca `storage.js`" kuralı "yalnızca `src/core/storage/**`" olur. Modüllerin `storage.js` dosyaları sadece core'un `loadJSON`/`saveJSON`/`query` fonksiyonlarını çağırır. `activeProvider` tek anahtar olarak kalır.
5. **Yeni modül ayarları:** `settings` tablosuna yeni sütun eklemek yerine `module_settings(user_id, module_id, data jsonb)` tablosu. Gerekçe: PGRST204 hatası tekrar tekrar `settings` satırında patladı.
6. **Tam registry objesi** (id, sekmeler, koleksiyonlar, tablolar, `fullOnlyFeatures`, hedefler) 3. modül eklenirken kurulur. O zamana kadar mevcut `experienceMode.js` + modül anahtarı haritası yeterli.
7. **Bağımsız Pomodoro:**
   - `VITE_APP_TARGET` varsayılanı `pomodoro`; modüller `targets` alanına göre filtrelenir.
   - `base`, AGENTS.md'deki gibi yalnızca `GITHUB_PAGES` ile değişir.
   - Life web'i **`/pomodoro-app/life/` altına koyma.** Service worker kapsamı ve paylaşılan `*.github.io` origin'i çakışır. Life web için ayrı bir domain kullan.

### 5.5 Veri modeli: taslağına yorum
| Taslak | Görüş |
|---|---|
| "days" tablosu yok, hesapla | ✓ Doğru. Gün bir görünüm. |
| Her kayıtta `date` | ✓, ama **ek olarak** `occurred_at timestamptz` sakla. `date`, yazma anındaki gün sınırıyla hesaplanan mantıksal gün olur. Sınır sonradan değişirse eski kayıtlar yeniden yazılmaz. |
| `tasks(date, status, carried_from_date, …)` | Yeni tablo yerine `today_tasks`'a **additive** sütun ekle: `date` (NULL = "Later"), `status`, `carried_from_date`. Eski satırlar için kural: `date` NULL ise "bugün listesi" sayılır. |
| `ticks + task_id` | ✓ Additive, nullable. |
| `expenses` (tamsayı alt birim, para birimi, tip) | ✓. Ayrıca `occurred_at`, `(user_id, date)` index'i ve tutar işareti için CHECK. |
| `categories + kind` | ✓ (`kind`: task/expense/income). Mevcut `is_default` dersini unutma: normalize ve schema aynı değişiklikte güncellenir. |
| `budgets`, `calendar_events`, `day_reviews` | Hepsi v1'den sonra. `day_reviews` ancak not veya ruh hali eklenirse gerekir. |
| `daily_metrics(date, key, value)` | ✓ + `source` sütunu (manual/health_connect) ve unique `(user_id, date, key, source)`. |

**Mevcut UTC tarihli satırlar için migration gerekmiyor.** UTC tarih Türkiye'de fiilen 03:00'te başlayan bir gün anlamına geliyor, önerilen sınır 04:00. Fark yalnızca 03:00–04:00 arasındaki kayıtlarda; bu ihmal edilebilir. Batı saat dilimlerindeki kullanıcılar için tick'ler `timestamp` alanından yeniden tarihlenebilir; gerekirse yapılır.

### 5.6 Çevrimdışı strateji ("çoğunlukla online + kuyruk")
- **Kuyruk:** IndexedDB'de, core/storage arkasında. Her işlem şu alanları taşır: `{opId, userId, table, kind, rowId, payload, attempts, nextAt}`. Aynı `(table, rowId)` için işlemler birleştirilir.
- **İdempotent upsert:** istemcinin ürettiği UUID'ler zaten var.
- **Yeniden deneme:** `online`, `visibilitychange` ve Capacitor resume olaylarında; üstel bekleme ile.
- **Hata yönetimi:** 4xx hatalar (PGRST204/23514) **görünür bir "dead-letter" listesine** düşer. 401 gelince oturum yenilenir.
- **Danger Zone / import:** reload'dan önce kuyruk boşaltılır.
- **Kalıcı okuma cache'i:** Mühendis şunu tespit etti: bugün giriş yapmış bir telefon çevrimdışı açılırsa **misafir verisini** gösteriyor, çünkü remote cache yalnızca bellekte duruyor. Telefon uygulaması için bu cache zorunlu.
- **Realtime gerekmiyor** (senin cevabın). Uygulama açılınca ve sayfa görünür olunca veri yenilenir.

### 5.7 Mobil platform notları (Capacitor 8)
- **Zamanlayıcı:**
  - Seans başlayınca `endAt` için **tek bir native local notification** zamanla. Mevcut `endAt` tasarımı burada büyük avantaj.
  - Android 14+ cihazlarda `SCHEDULE_EXACT_ALARM` varsayılan olarak verilmiyor.
  - Life için bu izni kullanıcıdan iste. `USE_EXACT_ALARM` yalnızca alarm, timer ve takvim uygulamalarına izinli ([policy](https://support.google.com/googleplay/android-developer/answer/16558241)).
  - Doze modunda bildirim en fazla 9 dakikada bir tetiklenebiliyor ([docs](https://capacitorjs.com/docs/apis/local-notifications)).
- **Ortam sesi:** Web Audio, uygulama arka plana geçince durur. MVP'de "sadece ön planda" diye yaz. Arka planda çalması native player + foreground service gerektirir, 20–40 saat ([kaynak](https://capawesome.io/blog/how-to-play-audio-in-the-background-in-capacitor/)).
- **Google girişi:** WebView içinde OAuth engelli (`disallowed_useragent`) ([Google](https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html)). Çözüm: `@capgo/capacitor-social-login` → `signInWithIdToken`.
- **Health Connect:** `@capgo/capacitor-health` (aktif bakımlı, MPL-2.0); yedek olarak `capacitor-health` (mley, MIT). Capawesome eklentisi ücretli.
- **Widget:** Native Kotlin gerektirir. Onun yerine uzun basınca açılan "Harcama ekle" App Shortcut'ı yeterli.
- **`src/lib/platform/` katmanı:** `scheduleTimerAlert`, `getStepsForDay`, `signInWithGoogle` gibi fonksiyonların web ve native uygulamaları burada durur. Bileşenler eklentileri doğrudan import etmez.

### 5.8 Test ve sürümleme
- `package.json` sürümü `0.1.0` olur; git tag ve CHANGELOG tutulur; Android'de `versionCode` tutulur.
- Gecikme simüle eden (50–400 ms) ve schema'yı zorlayan sahte client ile entegrasyon testleri.
- CI sırası: lint → test → TZ matrisi → iki hedefin build'i.

---

## 6. Yatırımcı görüşü

### 6.1 Maliyetler (kaynaklı)
| Kalem | Değer | Kaynak |
|---|---|---|
| Supabase Free | 500 MB DB, 50 bin MAU, 2 aktif proje, 1 hafta hareketsizlikte uyku, **yedek yok** | [pricing](https://supabase.com/pricing), [backups](https://supabase.com/docs/guides/platform/backups) |
| Supabase Pro | $25/ay'dan başlar; 7 günlük günlük yedek. PITR ~$100/ay (bütçe dışı). | [pricing](https://supabase.com/pricing) |
| Google Play kaydı | $25, tek seferlik. **Yalnızca ikincil kaynak**; resmi sayfada bulunamadı. | [ikincil](https://consolemint.com/google-play-console-price/) |
| Play hizmet bedeli | Abonelikte %15. ABD/AEA/UK'de 30 Haziran 2026'dan itibaren %10 + %5 faturalama ücreti. | [Play](https://support.google.com/googleplay/android-developer/answer/112622) |
| Play kapalı test | Kişisel hesapta ≥12 test kullanıcısı × ≥14 gün; mühendis raporuna göre **uygulama başına**. | [Play](https://support.google.com/googleplay/android-developer/answer/14151465) |
| Apple | $99/yıl; Small Business Program'da %15 | [Apple](https://developer.apple.com/programs/whats-included/), [SBP](https://developer.apple.com/app-store/small-business-program/) |
| Google OAuth (Calendar) | Hassas kapsam doğrulaması **ücretsiz**, "genellikle 3–5 iş günü". Calendar kısıtlı listede **değil**, CASA gerekmiyor. | [sensitive](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification), [restricted list](https://support.google.com/cloud/answer/13464325) |
| Domain | ~$10,5/yıl | [tld-list](https://tld-list.com/registrars/cloudflare) |

**Kalıcı maliyet (tahmin):** ~$26/ay (Pro + domain). Bütçenin içinde. Staging ücretsiz ikinci projede kalmalı; ücretli staging toplamı ~$35/ay'a çıkarır.

### 6.2 Gelir kıyasları
- **RevenueCat 2026:**
  - İndirmeden ödemeye dönüşüm medyanı %2,0 (freemium %2,1).
  - 60. günde yükleme başına gelir $0,34.
  - Ödeyen başına 1. yıl LTV medyanı $23.
  - Lansmandan 1 yıl sonra medyan gelir ~$72/ay. 2 yılda $10 bin/ay'a ulaşan uygulamaların oranı yalnızca %4,6.
  - Kaynak: [RevenueCat](https://www.revenuecat.com/state-of-subscription-apps). Örneklem zaten para kazanan uygulamalardan oluşuyor, yani sonuçlar yukarı yanlı.
- **D30 elde tutma:** "güçlü" verimlilik uygulamalarında %12–18, finans uygulamalarında %10–15 ([uxcam](https://uxcam.com/blog/mobile-app-retention-benchmarks/)).

### 6.3 Senaryolar (24 ay, tahmin)
| | Kötü | Baz | İyi |
|---|---|---|---|
| Android üretim lansmanı | 12. ay ve sonrası | 7. ay | 4. ay (yalnızca Day-MVP) |
| Yükleme (12. ay / 24. ay) | 50 / 400 | 600 / 4.000 | 3.000 / 25.000 |
| D30 elde tutma | %3 | %6 | %12 |
| Ödemeye dönüşüm | %0,5 | %1,5 | %3 |
| 24 ayda gelir | ~$20 | ~$840 | ~$13.500 |
| Zaman maliyeti dahil net (~$6/sa, TR junior) | ≈ −$5.000 | ≈ −$4.400 | ≈ +$7.900 |
| Sezgisel olasılık | ~%45 | ~%45 | ≤%10 |

**Başabaş noktaları:**
- **Supabase Pro'yu karşılamak:** yaklaşık 15 aktif ödeyen abone yetiyor.
- **Zaman dahil toplam maliyeti karşılamak:** yaklaşık 250 abone-yılı gerekiyor. Bu da kabaca 15–17 bin yükleme demek; buna yalnızca "iyi" senaryo ulaşıyor.

### 6.4 Fırsat maliyeti
| Aynı ~390 saat/yıl nereye? | CV değeri | Risk |
|---|---|---|
| Staj arama + mülakat hazırlığı | **En yüksek** | Düşük |
| Pomodoro'yu sağlamlaştırmak + Play'e çıkarmak | Yüksek: canlı, testli, mağazada olan bir uygulama ve AGENTS.md'deki gotcha'ların post-mortem anlatısı | Düşük |
| Geniş ama yarım kalmış bir Life | Orta-düşük. İşe alımcı çalışan şeye bakar, roadmap'e değil. | Yüksek |

**Öneri:**
- Staj bulunana kadar boş zamanının en az %50'si staja gitsin.
- Uygulama bütçesi de haftada en az ~4 saat kalsın ki ivme kaybolmasın.
- Bir staj teklifi ya da mülakat süreci gelirse uygulamaya ayrılan süre haftada ≤3 saate iner.

### 6.5 Kill kriterleri ve kapılar
| Kapı | Ne zaman | Geçer → devam | Kalırsa → eylem |
|---|---|---|---|
| **G-1 Deney** | Kod yazmadan önce, 14 gün | 14 günün ≥11'inde kayıt; ≥3 "birleşik görünüm bana bir şey söyledi" notu; arkadaş olmayan ≥12 test kaydı | Yalnızca Pomodoro'ya "tarihli görev + devretme + gün özeti" eklenir; Life rafa kalkar |
| **G0 Dogfood** | MVP sonrası 8 hafta | 5–8. haftalarda her modül haftada ≥5/7 gün açılıyor; harcama girişi medyanı ≤10 sn | 5/7'nin altında kalan modül kesilir. Art arda 2 hafta genel kullanım <4/7 ise ürün hattı durur. |
| **G1 Kapalı test** | 4–6. ay | Para ödemeden ≥12 gerçek test kullanıcısı; 14. günde ≥6 aktif | Asıl darboğaz dağıtım demektir; yeni özellik yapılmaz |
| **G2 Public beta** | Lansmandan 8 hafta sonra, arkadaş olmayan ≥100 yükleme | D30 ≥%10 | %5–10 → portföy modu (ücretli katman yok). <%5 → portföy seviyesinin ötesine yatırım yapılmaz. |
| **G3 Para kazanma** | ≥500 yükleme | Dönüşüm ≥%1 | <%0,5 → paywall kaldırılır, Free plana dönülür |
| Özellik kapısı: iki yönlü takvim | G2 sonrası | Aktif kullanıcıların ≥%30'u salt okunur takvimi açmış | Salt okunur kalır |
| Özellik kapısı: Health Connect | G2 sonrası (ya da senin kişisel kullanımın için daha erken, yalnızca cihazda) | Aktif kullanıcıların ≥%20'si istiyor | Yapılmaz |
| Zaman kutusu | 9. ay | Play'de üretim sürümü var | Kapsam yalnızca Pomodoro Play sürümüne indirilir |

### 6.6 Yatırım yapılabilirlik
Bugün **0/4**: fark yok, hendek (moat) yok, dağıtım kanalı yok, zaman yok.

Bunu değiştirebilecek şey (makul ama olası değil): kendi kanalı olan dar bir niş. Örnek: kampüs ve Discord toplulukları üzerinden öğrenciler, modüller arası içgörülerle ("Pomodoro'ları bitirmediğin günler daha çok harcıyorsun"). Bunun kanıtı da D30 ≥%15 olur.

---

## 7. UX ve bilgi mimarisi

**Kullanıcının zihnindeki model:** "Bir günün içinde şeyler vardır." Gün bir tablo değil, bir görünüm.

```
Day (mantıksal gün, kullanıcının gün bitişi örn. 04:00)
├─ Plan        görevler (todo/done/skipped/carried), her birine focus seansı bağlanabilir
├─ Agenda      takvim etkinlikleri (önce salt okuma)
├─ Spend       harcama/gelir
├─ Body        adım (modül)
├─ Focus       pomodoro/tick'ler, görevlere bağlı (modül)
└─ Reflection  gün incelemesi
Günlerin dışında: Later (tarihsiz görevler), Bütçeler (aylık), Kategoriler, Ayarlar
```

### Navigasyon
- **Alt bar:** Today + en fazla 3 modül sekmesi. Varsayılan: **Today · Calendar · Money · Stats**. Ayarlar sağ üstteki avatarda.
- **"More" sekmesi yok.**
  - Apple HIG "More" sekmesini alan israfı sayıyor.
  - Material 3 alt barı 3–5 hedefle sınırlıyor ([Android](https://developer.android.com/develop/ui/compose/components/navigation-bar)).
  - Türkçe etiketler uzun ("Zamanlayıcı"), bu da sorunu büyütüyor.
- **Yeni modül sekme değil, Today'de kart ekler.** Kullanıcı hangi modüllerin sekme alacağını seçebilir; TickTick'te de böyle bir sekme çubuğu ayarı var.
- **Görevler ayrı sekme değil.** Today'de ve Calendar'da görünür.
- **Ekran başına tek "+" (FAB).** Today'de [Harcama | Görev | Etkinlik] seçimli bir sheet açar ve son kullanılanı hatırlar.
- **Focus bir mod, sekme değil.** Görevdeki ▶'den tam ekran açılır. Android'de ongoing notification ile görünür kalır. Web PiP mobilde desteklenmiyor ([caniuse](https://caniuse.com/mdn-api_documentpictureinpicture)).

### Today ekranı (taslak)
```
┌──────────────────────────────────────┐
│ Wed, 7 Oct            ☁✓   (A)       │  ☁✓ senkron / ☁↑ 3 bekliyor / ⚠ hata
│ M  T [W] T  F  S  S          ‹ ›     │  tarih şeridi (kaydırma sadece burada)
├──────────────────────────────────────┤
│ AGENDA  10:00 Ders · 14:30 Dişçi      │
├──────────────────────────────────────┤
│ PLAN                     3/6 done    │
│ ○ Staj ön yazısı           🍅2  ▶    │
│ ○ 4. bölümü oku            🍅1  ▶    │
│ From earlier (2) ▸                   │  devreden/geciken
├──────────────────────────────────────┤
│ SPEND   ₺340 bugün · ₺2.150 / ₺5.000 │
├──────────────────────────────────────┤
│ STEPS 6.240        FOCUS 3 🍅         │
├──────────────────────────────────────┤
│ [ Günü kapat → ]  (20:00 sonrası)    │
│                                 (+)  │
├──────────────────────────────────────┤
│ Today   Calendar   Money    Stats    │
└──────────────────────────────────────┘
```

### Ekran kuralları
- **Hızlı harcama** (hedef 5 saniyenin altında; 4–6 dokunuş, tahmin):
  - "+" → keypad → kategoriye dokunmak kaydeder.
  - Keypad'in ondalık tuşu yerele göre değişir.
  - MVP'de cüzdan seçici yok.
  - Kayıttan sonra "Geri al" toast'u görünür.
- **Gün kapanışı:** her adımı atlanabilen 2–3 adımlık bir sheet.
  - Açık görevler için seçenekler: Yarın / Tarih seç / Atla, ayrıca "Hepsini yarına taşı".
  - Ardından harcama özeti.
  - Ruh hali yalnızca o modül açıksa gelir.
  - **Devretme kapanışa bağlı değil.** İnceleme yapılmazsa görevler kendi günlerinde kalır ve "From earlier" grubunda görünür. Sabah "Dünden 2 açık görev var, bakalım mı?" diye sorulur. Sunsama'da da benzeri var ([Sunsama](https://www.sunsama.com/blog/the-official-daily-planning-guide)).
- **İstatistik:** Today'de en fazla 3–4 sayı. Stats ekranında "bu hafta vs geçen hafta". MVP'de korelasyon grafiği yok.
- **Onboarding:** Hoş geldin → Dil → "Neyi takip etmek istiyorsun?" (modüller) → "Gün ne zaman bitsin?" (varsayılan 04:00). Modül kurulumu ilk açılışta yapılır: para birimi, Google, Health Connect. Bildirim izni akşam hatırlatıcısı açılınca istenir ([Android](https://developer.android.com/develop/ui/views/notifications/notification-permission)).
- **Mobil:**
  - Kontroller ekranın alt %40'ında, dokunma hedefleri ≥48dp.
  - Android 15'te edge-to-edge görünüm için inset'ler ele alınmalı ([Android 15](https://developer.android.com/about/versions/15/behavior-changes-15)).
  - Para ve sayılar her zaman `Intl` ile biçimlendirilir.
  - Gün sınırından sonra "Çar, 7 Eki · gece" gibi bir gösterim.
- **MVP'den kesilecekler:** zaman çizelgesi görünümü, cüzdanlar, çoklu para birimi, iki yönlü takvim, ruh hali, korelasyonlar, widget, RPG, tekrarlayan harcamalar, fiş fotoğrafı.

---

## 8. Güvenlik, gizlilik ve hukuk

> Ajan avukat değil. **[AVUKAT]** işaretli maddeler public beta'dan önce profesyonel görüş gerektirir.

### 8.1 Veri sınıflandırması
| Veri | GDPR | KVKK | Mağaza etiketi | İşleme |
|---|---|---|---|---|
| Harcama | Art. 9 özel nitelikli veri **değil**, ama yüksek risk. Kategori ve notlar dolaylı olarak sağlık veya din bilgisi açığa çıkarabilir ([CJEU C-184/20](https://www.insideprivacy.com/eu-data-protection/special-category-data-by-inference-cjeu-significantly-expands-the-scope-of-article-9-gdpr/)). | Özel nitelikli değil | Play: Other financial info | Minimum veri, analytics yok |
| Adım (günlük toplam) | **Art. 9 gibi davran:** ayrı ve açık onay ([Art. 4(15)](https://gdpr-info.eu/art-4-gdpr/), [WP29 özeti](https://www.hunton.com/privacy-and-cybersecurity-law-blog/article-29-working-party-clarifies-scope-health-data-processed-lifestyle-wellbeing-apps)) | Sağlık verisi say [AVUKAT] | Health & fitness + Health apps beyanı | Ham örnek değil, yalnızca `daily_metrics` |
| Google Takvim | Sıradan veri + Google Limited Use | Sıradan | Calendar events | Token yalnızca sunucuda |
| Görev ve notlar | Sıradan (serbest metin her şeyi içerebilir) | Sıradan | App activity | — |

### 8.2 Asgari uyum listesi
1. **Gizlilik politikası + kullanım şartları (EN+TR)**, sabit bir URL'de ve uygulama içinde. Kendi domain'inde olmalı, çünkü Google doğrulaması aynı domain'i istiyor.
2. **Hukuki dayanak:** hesap verisi için sözleşme, adım ve takvim için açık onay.
3. **Haklar:** export (JSON/CSV) yeni tabloların hepsini kapsamalı. Uygulama içi silme var; Play için **web'den silme sayfası** eklenmeli ([Play](https://support.google.com/googleplay/android-developer/answer/13327111)).
4. **Supabase:** prod için **AB bölgesi** ve DPA kabulünün kaydı ([DPA](https://supabase.com/legal/dpa), [regions](https://supabase.com/docs/guides/platform/regions)). Mevcut projenin bölgesi bilinmiyor; bkz. açık soru Q4.
5. **İhlal runbook'u:** yarım sayfa, 72 saat kuralını içeren ([Art. 33](https://gdpr-info.eu/art-33-gdpr/)).
6. **Yaş:** şartlarda 16+.
7. **[AVUKAT] Art. 27 AB temsilcisi:** güvenlik ajanına göre "büyük olasılıkla gerekli", yatırımcı ajanına göre "küçükken muhtemelen değil". Bkz. §12.
8. **[AVUKAT] KVKK yurt dışı aktarımı:** 7499 sayılı Kanun ile standart sözleşme ve 5 iş günü içinde bildirim zorunlu. Supabase'in GDPR SCC'leri KVKK standart sözleşmesi değil. VERBİS büyük olasılıkla muaf ([mondaq](https://www.mondaq.com/turkey/data-protection/1712758/verbis-exemption-for-micro-enterprises-introduced-by-the-personal-data-protection-board)).

### 8.3 Mağaza politikaları
- **Play:**
  - Data safety formu.
  - Financial features beyanı: manuel harcama takibi için "finansal özellik yok" seçilir ([Play](https://support.google.com/googleplay/android-developer/answer/13849271)).
  - Health apps beyanı + veri tipi başına gerekçe ([Health Connect](https://developer.android.com/health-and-fitness/health-connect/publish)).
  - Life için `SCHEDULE_EXACT_ALARM`.
- **Apple (sonra):**
  - Google girişi sunuluyorsa Sign in with Apple zorunlu (4.8).
  - Uygulama içi hesap silme.
  - HealthKit kuralları (5.1.3): sağlık verisi reklamda kullanılamaz, iCloud'da saklanamaz.
  - 4.2: "paketlenmiş web sitesinden fazlası" olmalı ([guidelines](https://developer.apple.com/app-store/review/guidelines/)).

### 8.4 Google Takvim mimarisi (API yolu seçilirse)
- Supabase girişinden gelen `provider_token`'ı **kullanma**. Kısa ömürlü, tarayıcıda duruyor ve Supabase onu yenilemiyor ([Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)).
- Ayrı bir "Takvimi bağla" akışı kur:
  - Edge Function, PKCE ve `access_type=offline` ile.
  - Refresh token'lar `google_connections` tablosunda dursun: RLS açık, policy yok, `revoke all … from anon, authenticated`, Vault ya da uygulama tarafında AES-GCM ile şifreli.
  - **pgsodium kullanma**; kullanımdan kalkması bekleniyor ([docs](https://supabase.com/docs/guides/database/extensions/pgsodium)).
- Kapsamlar: önce `calendar.events.readonly`. Yazma gerekirse `calendar.app.created`, yani yalnızca uygulamanın kendi takvimi.

### 8.5 Yeni tablo şablonu
- `enable row level security` + `to authenticated using ((select auth.uid()) = user_id)` ile dört policy.
- **Açık grant** (card_draws dersi). Grants denetimi gerektirirse `revoke all from anon`.
- `(user_id, date)` index'i ve `on delete cascade`.
- Normalize ve schema **aynı değişiklikte** güncellenir.
- Her migration'dan sonra Security Advisor çalıştırılır.

### 8.6 Public repo ve Dev Mode
- Asıl tehdit Dev Mode değil. **Giriş yapmış her kullanıcı kendi JWT'siyle PostgREST'e doğrudan istek atıp kendi satırlarına istediğini yazabiliyor.**
- Bugün bu yalnızca kişinin kendi hesabını etkiliyor; risk kabul edilebilir.
- **Leaderboard, arkadaş ya da streak paylaşımı gelmeden önce:**
  - tick'ler sunucuda zaman damgası basan bir `SECURITY DEFINER` RPC ile yazılmalı;
  - streak ve başarımlar sunucuda hesaplanmalı;
  - geçmiş veri güvenilmez sayılmalı.
- Staging projesi açılınca Dev Mode artık prod'a hiç dokunmaz.

---

## 9. Birleşik yol haritası (Pomodoro + Life)

**Her adımda geçerli kurallar:**
- Yalnızca **additive** SQL (`if not exists`).
- Schema değişikliği **önce staging'e, sonra prod'a elle SQL Editor ile** uygulanır.
- `npm run lint && npm test`.
- Network sekmesinde `supabase.co` filtresiyle 400 hatası kontrolü.
- Canlı Pomodoro linki her sürümde çalışır olmalı.

### Adım 0: Sadece doğrulama (≈1 saat, kod yok, sen yapacaksın)
SQL Editor'da yalnızca okuma sorguları:
```sql
-- L1: tick ve activity_log satır sayıları (1000'e yakın/üstü = canlı truncation riski)
select user_id, count(*) from public.ticks group by user_id order by 2 desc;
select user_id, count(*) from public.activity_log group by user_id order by 2 desc;
-- L7: anon/authenticated yetkileri
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
order by 1, 2;
```
Dashboard'da ayrıca bunlara bak:
- API Settings → "Max rows" değeri.
- Projenin **bölgesi**.
- Kullanılan anahtar tipi (legacy anon mı, publishable mı).
- Arka plan görseli yüklü bir test hesabıyla hesap silmeyi dene (L4).

### v0.1.0: "Sağlam temel" (Pomodoro), ≈40–75 saat, 1,5–3,5 ay
Kapsam:
- §5.1'deki 1–7. maddeler.
- `progress.md`'deki **stabilizasyon turu** (bu sürüm o turun ta kendisi).
- `package.json` sürümü 0.1.0, CHANGELOG ve **semver başlangıcı**.
- Gizlilik politikası taslağı.

Life işi yok.
- **SQL:** `0001_baseline.sql`. Yeni sütun yok, bugünkü schema dondurulur. Grants denetimi gerektirirse `revoke` içeren `0002_grants_hardening.sql`, **önce staging'de**. Elle yapıştırılır.
- **Doğrulama:**
  - Gerçek bir Android telefonda Pomodoro'yu tamamla. Bildirim izni açıkken çökmemeli (L2).
  - 1000'den fazla tick olan bir test hesabında streak doğru olmalı.
  - Gece 00:30'da başlayan bir pomodoro doğru güne yazılmalı (TZ testi).
  - Arka planı olan test hesabı silinebilmeli.
  - Publishable key ile giriş yapılabilmeli; GitHub secret güncellenmiş olmalı.
- **Paralel (kod dışı):** motivasyon kartı içeriği, yazabildiğin kadar.

### Paralel: G-1 deneyi (14 gün, ≈10 saat)
- Google Form harcama kısayolu.
- Akşam formu: planlanan/yapılan görev, odak dakikası, adım, 1–5 gün puanı.
- Sheet'te birleşik gün görünümü.
- Landing page ve test kaydı formu: üniversite, Türk çalışma toplulukları, mevcut web kullanıcıları.
- **Kapı:** G-1 (§6.5).

### v0.2.0: "Gün" temeli, ≈40–70 saat
- Tarihli görevler (`today_tasks.date`, `status`, `carried_from_date`), "Later" listesi, "From earlier" grubu, gün şeridi.
- Klasör sınırları ve lint kuralı (§5.1, madde 8).
- **Planning sekmesi yeniden tasarımı** bu sürümde Day görünümünün içinde erir (`progress.md` kısa vadeli maddesi).
- **SQL:** `0003_task_dates.sql`. Additive sütunlar; JS tarafındaki normalize fonksiyonu **aynı commit'te**. Önce staging, sonra prod.
- **Doğrulama:**
  - Drift testi yeşil.
  - Network'te `today_tasks` upsert'lerinde 400 yok.
  - Misafir modu `.env` olmadan çalışıyor.
  - Eski görevler (`date` NULL) bugün listesinde görünüyor.

### v0.3.0: "Day MVP" (bayrak arkasında, web/PWA), ≈60–100 saat
- Harcama MVP'si.
- Gün kapanışı.
- `daily_metrics` ile elle adım girişi.
- Modül aç/kapa.
- CSV export.
- App.jsx bölme.
- **Reports yeniden tasarımı** Stats ekranının içinde erir.
- **SQL:** `0004_expenses.sql` (RLS, grant, index, CHECK), `0005_module_settings.sql`, `0006_daily_metrics.sql`. Her biri önce staging'de; Security Advisor kontrolü yapılır.
- **Doğrulama:**
  - Uçak modunda harcama girildiğinde hata görünür oluyor.
  - Misafir harcamaları yerelde kalıyor ve uyarı gösteriliyor.
  - CSV'yi Excel açtığında Türkçe karakterler bozulmuyor (BOM).
- **Kapı: G0** (8 hafta kendi kullanımın).

### v0.4.0: Çevrimdışı dayanıklılık, ≈45–75 saat
- IndexedDB yazma kuyruğu ve dead-letter banner'ı.
- Kalıcı okuma cache'i.
- `src/lib/platform/` katmanı.
- **SQL:** yok, ya da `_migrations` tablosu.
- **Doğrulama:** gecikme simüle eden entegrasyon testleri; çevrimdışı açılışta hesap verisi görünüyor; Danger Zone işleminden önce kuyruk boşalıyor.

### v0.5.0: Android (Capacitor 8), ≈30–60 saat
- Mevcut Capacitor prompt'u bu sürüme birleştirilir.
- Native Google login.
- `endAt` için local notification.
- Misafir verisi için SQLite/Preferences.
- App Shortcut.
- Özel domain, gizlilik politikası, web'den silme sayfası, isim ve maskot kararı.
- **Play kapalı testi hemen başlar** (12×14).
- **Kapı: G1.**
- **Doğrulama:**
  - Ekran kilitliyken bildirim zamanında geliyor; exact-alarm izni kapalıyken uygulama düzgün davranıyor.
  - Google girişi çalışıyor.
  - Data safety formu, Financial features ("yok") beyanı ve hesap silme bağlantısı tamam.

### v0.6.0: Entegrasyonlar (kapılı), ≈30–80 saat
- Health Connect: önce cihazda; açık onayla senkron.
- `CalendarContract` spike'ı. İşe yararsa takvim okuma (ve isteğe bağlı yazma).
- **SQL:** `daily_metrics.source` (v0.3'te eklenmediyse).
- **Doğrulama:** Health apps beyanı onaylandı; izin reddedildiğinde akış düzgün çalışıyor.

### v1.0.0: Play üretim sürümü + public beta
- Supabase Pro.
- AB bölgesi kararı uygulanmış olur.
- [AVUKAT] maddeleri kapanmış olur.
- **Kapılar:** G2, ardından G3.

### v1 sonrası (kanıt geldikçe)
- Web için salt okunur Google Takvim importu (API, Edge Function, doğrulama).
- Bütçeler, cüzdanlar, çoklu para birimi.
- iOS (bulut CI, Sign in with Apple, HealthKit).
- Arka planda ortam sesi.

### Pomodoro roadmap maddelerinin yeri
| `progress.md` maddesi | Yeni yeri |
|---|---|
| Motivasyon kartı içeriği | Kod dışı, paralel; v0.1–v0.3 arasında bitir |
| Reports yeniden tasarımı | v0.3 Stats ekranının içinde |
| Planning yeniden tasarımı | v0.2 Day görünümünün içinde |
| Stabilizasyon turu | **v0.1'in ta kendisi** |
| Semantik versiyonlama (0.1) | **v0.1** |
| Android paketleme (Capacitor) | **v0.5**; prompt güncellenerek |
| Maskot / görsel kimlik | v0.5 mağaza listelemesinden önce, isimle birlikte |
| Component testleri | Her sürümde dokunulan alanlar için; v0.1'de kritik yollar |
| Hazır arka plan galerisi | v1 sonrası ya da iptal (mobilde PiP/fullscreen ikincil) |
| Çoklu dil (TR/EN dışı) | v1 sonrası, pazar verisine göre |
| Realtime çoklu cihaz senkronu | **Gerekmiyor** (senin cevabın); v1 sonrası, belki hiç |
| Kitap notları | **Parked.** Not alma odak değil. |
| Sosyal / leaderboard | **Parked.** Sunucu doğrulaması önkoşul (§8.6). |
| RPG / okul simülasyonu / AI / masaüstü / oyun ekosistemi | **Parked: koşullu** (D9) |
| Ödeme sistemi | G3 kapısına bağlı |

### Life geliştirilirken Pomodoro'nun kaybetmemesi gerekenler
- `alperenakturk.github.io/pomodoro-app` her sürümde çalışır kalacak; varsayılan build hedefi `pomodoro`.
- Misafir modu `.env` olmadan çalışacak; Pomodoro hesapsız kullanılabilecek.
- Timer doğruluk kuralları: `endAt`, panellerin mounted kalması, Pause sapması.
- Additive migration'lar sayesinde eski client'lar yeni tablolarla bozulmayacak.

---

## 10. Riskler ve önlemler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Kapsam şişmesi / bitmeyen proje | Yüksek | Yüksek | Kapılar (G-1…G3), 9. ay zaman kutusu, modül kesme kuralı |
| Sessiz veri kaybı (finans) | Yüksek (bugünkü kodla) | Kritik | v0.1 + v0.4: görünür hatalar, kuyruk, drift testi |
| Schema drift (PGRST204) | Orta | Yüksek | Migrations klasörü, `columns.json` testi, schema'yı zorlayan sahte client, `module_settings` jsonb |
| Tempo: sprint ve ardından uzun boşluk | Yüksek | Yüksek | Küçük sürümler; büyük işler tatil dönemlerine; staj önceliği kuralı |
| Dağıtım ve 12 test kullanıcısı | Yüksek | Yüksek | Landing page ile v0.1 sırasında toplamaya başla |
| Rakipler (TickTick, Brite) | Kesin | Orta | Bundle ile değil "gün kapanışı" ritüeli ile konumlan |
| Günlük kayıt yorgunluğu | Yüksek | Yüksek | ≤3 dokunuş, atlanabilir kapanış, devretme incelemeye bağlı değil |
| Google Takvim karmaşıklığı | Yüksek (API yolunda) | Yüksek | `CalendarContract`; iki yönlü API yok |
| Play politikası (exact alarm, Health) | Orta | Orta | `SCHEDULE_EXACT_ALARM` + yedek akış; adım verisini önce cihazda tut |
| Hukuk (Art. 27, KVKK aktarımı) | Orta | Orta | [AVUKAT] public beta'dan önce; o zamana kadar dar test grubu |
| Vizyon dağılması | Yüksek | Orta | D9: "Parked" bölümü, tek aktif vizyon |
| Eklenti bakımı (küçük bakımcılar) | Orta | Orta | `platform/` katmanı, sabitlenmiş sürümler, yedek eklenti |
| Staj aramasının ertelenmesi | Orta | Yüksek | Boş zamanın %50'si staja; teklif gelirse uygulama ≤3 sa/hafta |

---

## 11. Açık sorular

| # | Soru | Neden önemli | Nasıl çözülür |
|---|---|---|---|
| Q1 | Senin hesabında tick sayısı 1000'i geçti mi? | L1 canlı bir hata mı? | Adım 0 SQL sorgusu |
| Q2 | `notify()` gerçek Android cihazda çöküyor mu? | L2 | Telefonda tek test |
| Q3 | Arka planı olan hesap silinebiliyor mu? | L4, mağaza ve GDPR | Test hesabıyla deneme |
| Q4 | Prod Supabase projesi hangi bölgede? AB değilse Life için yeni AB projesi mi açılmalı? | GDPR; proje taşımak pahalı | Dashboard; v0.5'ten önce karar |
| Q5 | `CalendarContract` ile yazılan etkinlik Google'a geri senkronlanıyor mu? Play `READ_CALENDAR` için ek beyan istiyor mu? | D4 | 1 saatlik spike + politika okuması (doğrulanamadı) |
| Q6 | `github.io` alt yolu Google doğrulamasında "doğrulanmış domain" sayılıyor mu? | Özel domain gerekli mi? | Büyük olasılıkla domain al (~$10/yıl) |
| Q7 | 12×14 kuralı uygulama başına mı, hesap başına mı? | İkinci listeleme maliyeti | Mühendis "uygulama başına" dedi; red team doğrulayamadı |
| Q8 | Art. 27 AB temsilcisi gerekli mi? KVKK aktarım mekanizması ne olacak? | Yasal maliyet | [AVUKAT] |
| Q9 | Ürün adı? | ASO; "Life" çok genel | v0.5'ten önce |
| Q10 | 48 günlük commit boşluğunun sebebi (okul, başka repo)? | Tempo tahminleri buna göre ayarlanır | Senin cevabın |
| Q11 | Lifetime satış olacak mı? | Gelir modeli | G3 öncesi karar (§12) |

---

## 12. Ajan anlaşmazlıkları ve çözümleri

| Konu | Taraflar | Lider kararı ve gerekçe |
|---|---|---|
| **Modül registry** | Mühendis: şimdi kur, 20–35 saat, lint ile zorla. Red team: erken, rule of three. | **Orta yol:** klasör sınırları, alias ve lint kuralı şimdi (ucuz, CV değeri yüksek, sınır ihlallerini önler). Registry objesi 3. modülle. |
| **Pomodoro build hedefi (C)** | Mühendis ve mobil: bayrak olsun; ayrıca Pomodoro-only build `USE_EXACT_ALARM`'a uyar. Red team: monorepo/build matrisi gereksiz, Pomodoro web'i olduğu gibi dondur. | **Hafif bayrak, monorepo yok.** Varsayılan hedef zaten bugünkü deploy olduğu için maliyet düşük. Ayrı bir Pomodoro Android listelemesi şimdilik yok. |
| **Google Takvim yolu** | Mühendis, mobil, güvenlik: API ile salt okuma (Edge Function, Vault), iki yönlü yok. Red team: Android `CalendarContract` (OS senkronlar; OAuth ve backend yok, 15–40 saat). | Android önce geldiği için **önce `CalendarContract` spike'ı**. Web için API ile salt okuma G2'den sonra. İki yönlü API yolu herkesin ortak "yapma" listesinde. |
| **Adım verisi** | Yatırımcı: ertele, yalnızca cihazda, hiç senkronlama. Güvenlik: açık onayla, günlük toplam olarak senkron. Mobil: v0.3 fazında `daily_metrics`'e senkron. | **Önce cihazda; senkron açık ve ayrı onayla, [AVUKAT] sonrasında.** Senin otomatik adım isteğini v0.6'da karşılar, ama MVP'yi bloke etmez. |
| **Lifetime fiyat** | Pazar: lifetime seçeneği olsun (rakiplerde yaygın). Yatırımcı: yinelenen bulut maliyeti varken lifetime olmasın. Kullanıcı: öğrenciler tek seferlik $5–15 öder. | **Karar G3'e ertelendi.** Eğilim: yalnızca "yerel/cihazda" katman için tek seferlik kilit açma; bulut senkronu abonelikte. |
| **AB temsilcisi (Art. 27)** | Güvenlik: büyük olasılıkla gerekli (işleme sürekli, adım verisi Art. 9 olabilir). Yatırımcı: küçükken muhtemelen değil (Art. 27(2)). | **[AVUKAT]**. O zamana kadar public beta'yı açmak yerine kapalı test ve dar grup. Adımları cihazda tutmak Art. 9 riskini düşürür. |
| **Efor ve takvim** | Mühendis: geniş MVP 200–330 saat, mağaza v1 12–24 ay. Red team: tam plan 300–700 saat. Yatırımcı: baz senaryoda 7. ay lansman (yalnızca Day-MVP). | Aralıklar uyumlu, kapsam tanımları farklı. **Kesilmiş MVP (110–180 sa) esas alındı.** 7. ay lansman ancak kesilmiş kapsamla gerçekçi. |
| **Konumlandırma** | Pazar: B + C (odak kaması + gün kapanışı). Kullanıcı: öğrenci personası. Red team: Android'e özel "günlük skor kartı" (c). | Üçü aynı yöne bakıyor: **öğrenciler için "planla, odaklan, günü kapat"**, skor kartı da gün kapanışının çıktısı. |
| **Simple/Full** | UX ve kullanıcı: kaldır, yerine modül aç/kapa. Mühendis: registry'de `fullOnlyFeatures` birleşimi olarak sakla. | **Life hedefinde modül anahtarları + modül içi "gelişmiş" ayarları.** Pomodoro web hedefinde Simple/Full aynen kalır. Mühendisin birleşim fikri teknik olarak ikisini de destekliyor. |
| **Misafir modu ve Full özellikler** | UX: misafir tüm yerel modülleri kullansın. Mevcut kod: misafir hep Simple. | Life'ta misafir tüm yerel modülleri kullanır, hesap yalnızca bulut özelliklerini açar. Pomodoro hedefinde mevcut kural değişmez. |
| **Monetizasyon zamanı** | Pazar: freemium fiyat bandı öner. Yatırımcı: Play'de kişisel hesapla para alırsan adresin herkese açık olur, traction'a kadar bekle. | **G2'ye kadar para yok.** |

---

### Ek: Kaynak raporlar
Ajan raporlarının tamamı (URL'ler, varsayımlar, doğrulanamayan maddeler) oturumun scratchpad klasöründe duruyor ve repo'ya eklenmedi. Bu dokümandaki her web iddiası o raporlardan alındı. Ajanların sayfayı açamayıp yalnızca arama özetinden aldığı bilgiler metinde "arama özeti" ya da "ikincil" olarak işaretlendi.
