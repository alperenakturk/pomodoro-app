# Gizlilik Politikası / Privacy Policy: TASLAK (DRAFT)

> **Durum:** Taslak. Henüz uygulamada yayınlanmadı ve bir avukat tarafından incelenmedi. Hukuki tavsiye değildir. `[KÖŞELİ PARANTEZ]` içindeki yerler doldurulmalı. Yayınlamadan önce: sabit bir URL'ye konmalı, uygulama içinden bağlanmalı, [AVUKAT] maddeleri (plan §8.2) gözden geçirilmeli.
> **Son güncelleme / Last updated:** 2026-10-09
> **Kapsam:** Bugünkü Pomodoro uygulaması. Life modülleri (harcama, adım vb.) eklendiğinde bu belge güncellenmeli.

---

## Türkçe

### 1. Biz kimiz?
Bu uygulamanın sorumlusu Alperen Aktürk'tür (bireysel geliştirici). İletişim: **ahmetalperenakturk@gmail.com**.

### 2. Hangi verileri işliyoruz?

**Misafir olarak kullanırsan:** Tüm verilerin (görevler, Pomodoro kayıtları, ayarlar) yalnızca **kendi cihazındaki tarayıcı depolamasında** (localStorage) durur. Bize ya da herhangi bir sunucuya gönderilmez. Tarayıcı verilerini silersen bu veriler kaybolur.

**Hesap açarsan** (e-posta ya da Google ile) şunlar sunucuda saklanır:
- **Hesap bilgileri:** e-posta adresin, (e-posta ile kayıt olduysan) şifrenin güvenli özeti (hash), Google ile girdiysen Google'ın verdiği temel profil bilgisi.
- **Uygulama verilerin:** görevler ve notlar, Pomodoro/zamanlayıcı kayıtları, kategoriler, zaman çizelgesi, "iptal" kayıtları, başarımlar, ayarlar (tema, dil, görünen ad, günlük hedef vb.).
- **İsteğe bağlı arka plan görseli:** yüklediysen tam ekran odak modu için yüklediğin görsel.

Reklam, analitik ya da izleme (tracking) araçları kullanmıyoruz. Üçüncü taraf reklam çerezi yok.

### 3. Neden işliyoruz? (Hukuki dayanak)
Hesabını oluşturmak, verilerini cihazlar arasında eşitlemek ve uygulamayı sana sunmak için. Bu, seninle aramızdaki kullanım ilişkisinin (sözleşmenin) gereğidir.

### 4. Verileri kim işliyor? Nerede saklanıyor?
Hesap verilerin **Supabase** altyapısında saklanır. Sunucular **Avrupa Birliği'nde (Frankfurt, Almanya)** bulunur. Supabase bizim adımıza veri işleyen (işleyici) taraftır. Google ile giriş yaparsan kimlik doğrulaması için Google da devreye girer. Uygulamanın arayüzü GitHub Pages üzerinden sunulur. GitHub, sayfayı sunarken standart sunucu kayıtlarını (IP adresi gibi) işleyebilir.

### 5. Verilerin ne kadar süre saklanır?
Hesabın açık olduğu sürece. Hesabını sildiğinde hesabın ve tüm uygulama verilerin, yüklediğin arka plan görseliyle birlikte kalıcı olarak silinir. Şu anda ayrı bir yedek tutulmuyor, dolayısıyla silinen veri geri getirilemez.

### 6. Hakların
Verilerine erişme, düzeltme, silme, dışa aktarma ve işlenmesine itiraz etme hakkın var.
- **Dışa aktarma:** Ayarlar → Veri bölümünden JSON/CSV olarak.
- **Silme:** Ayarlar → hesap silme (tüm verini kalıcı olarak siler).
- Diğer talepler için: **ahmetalperenakturk@gmail.com**.

KVKK (Türkiye) ve GDPR (AB) kapsamındaki haklarını kullanabilirsin. Şikâyet hakkın: Kişisel Verileri Koruma Kurumu ya da yaşadığın ülkenin veri koruma otoritesi.

### 7. Çocuklar
Uygulama **16 yaş ve üzeri** kullanıcılar içindir.

### 8. Değişiklikler
Bu politika güncellenebilir. Önemli değişikliklerde uygulama içinde haber veririz.

---

## English

### 1. Who we are
This app is operated by Ahmet Alperen Aktürk (individual developer). Contact: **ahmetalperenakturk@gmail.com**.

### 2. What data we process

**If you use the app as a guest:** all your data (tasks, Pomodoro records, settings) stays **only in your own browser's storage** (localStorage). It is not sent to us or to any server. Clearing your browser data deletes it.

**If you create an account** (email or Google), we store on our servers:
- **Account info:** your email address; (for email sign-up) a secure hash of your password; for Google sign-in, the basic profile information Google provides.
- **Your app data:** tasks and notes, Pomodoro/timer records, categories, timetable, "void" records, achievements, settings (theme, language, display name, daily goal, etc.).
- **Optional background image:** if you uploaded one for fullscreen focus mode.

We use no advertising, analytics or tracking tools, and no third-party advertising cookies.

### 3. Why we process it (legal basis)
To create your account, sync your data across devices and provide the app to you. This is necessary to perform our agreement with you.

### 4. Who processes it and where it is stored
Account data is stored with **Supabase**, on servers in the **European Union (Frankfurt, Germany)**. Supabase acts as our data processor. If you sign in with Google, Google also takes part in authentication. The app's front end is served via GitHub Pages; GitHub may process standard server logs (such as IP address) when serving pages.

### 5. Retention
For as long as your account exists. When you delete your account, your account and all app data, including any uploaded background image, are permanently deleted. We currently keep no separate backups, so deleted data cannot be recovered.

### 6. Your rights
You can access, correct, delete, export your data and object to its processing.
- **Export:** Settings → Data, as JSON/CSV.
- **Delete:** Settings → delete account (permanently removes all your data).
- Other requests: **ahmetalperenakturk@gmail.com**.

You may exercise your rights under GDPR (EU) and KVKK (Türkiye). You may lodge a complaint with your local data protection authority.

### 7. Children
The app is intended for users aged **16 and over**.

### 8. Changes
We may update this policy and will notify you in the app of material changes.

---

## Yayın öncesi kontrol listesi (sana not)
- [x] İletişim e-postası ve ad: Alperen kendi GitHub'ındaki bilgileri kullanmayı seçti (2026-10-09).
- [x] Yedekler: Free planda yedek yok (Supabase panelinden doğrulandı, 2026-10-09). **Pro plana geçince** (günlük, 7 gün yedek) bölüm 5'i güncelle: "silinen veri yedeklerde en fazla 7 gün kalabilir".
- [ ] Sabit bir URL'ye koy (şimdilik GitHub Pages yolu olabilir; Google OAuth doğrulaması için özel domain gerekebilir, plan Q6).
- [ ] Uygulamada giriş/kayıt ekranından ve Ayarlar'dan bağla (TR/EN metinleri `en.js` / `tr.js` üzerinden).
- [ ] Hesap silme sayfasını web'de de erişilebilir yap (Play Store gereksinimi, plan §8.2).
- [ ] [AVUKAT] KVKK yurt dışı aktarımı ve AB temsilcisi (Art. 27) maddelerini gözden geçirt.
- [ ] Life modülleri (harcama, adım) eklendiğinde bölüm 2'yi güncelle.
