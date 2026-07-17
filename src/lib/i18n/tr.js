export default {
  common: {
    // Deliberately identical to en.js — treated as a fixed brand/technique
    // name, not translated (subject to change independently later, per
    // methodology.md's trademark-avoidance note), unlike every other string
    // in this dictionary.
    appTitle: 'Pomodoro Technique',
    add: 'Ekle',
    save: 'Kaydet',
    cancel: 'Vazgeç',
    edit: 'Düzenle',
    delete: 'Sil',
    close: 'Kapat',
    noCategory: 'Kategori yok',
    noCategories: 'Kategori yok',
    descriptionPlaceholder: 'Açıklama (opsiyonel)',
    descriptionAria: 'Açıklama',
    showDescription: 'Açıklamayı göster',
    hideDescription: 'Açıklamayı gizle',
    collapseSectionAria: "{{section}} bölümünü daralt",
    expandSectionAria: "{{section}} bölümünü genişlet",
  },

  tabs: {
    timer: 'Zamanlayıcı',
    planning: 'Planlama',
    reports: 'Raporlar',
  },

  header: {
    homeAria: "Zamanlayıcı'ya git",
    greeting: 'Merhaba, {{name}}! Odaklan',
    settingsAria: 'Ayarlar',
    accountMenuAria: 'Hesap menüsü',
    streakAria: 'Seri detaylarını görüntüle',
  },

  streak: {
    detailsTitle: 'Serin',
    closeAria: 'Seri detaylarını kapat',
    currentStreakLabel: '{{count}} günlük seri',
    longestStreakLabel: 'En uzun: {{count}} gün',
    freezeAvailableYes: 'Dondurma hakkı hazır',
    freezeAvailableNo: 'Sonraki dondurma hakkı {{days}} gün sonra',
    freezeExplainer: 'Bir günü kaçırırsan, elindeki dondurma hakkı seriyi otomatik korur — haftada 1 hak.',
    nextMilestoneLabel: '{{milestone}} günlük kilometre taşına {{days}} gün kaldı',
    allMilestonesReached: 'Tüm kilometre taşlarını geçtin — etkileyici!',
    recentDaysCaption: 'Son 14 gün',
    recentDayDone: '{{date}}: Pomodoro tamamlandı',
    recentDayFrozen: '{{date}}: dondurma hakkıyla korundu',
    recentDayMissed: '{{date}}: kaçırıldı',
    // StreakDetailsModal'ın 14 günlük şeridin altındaki renk açıklaması.
    legendDone: 'Tamamlandı',
    legendFrozen: 'Donduruldu',
    legendMissed: 'Kaçırıldı',
    celebrationIncrementAria: 'Seri {{count}} güne çıktı',
    celebrationMilestoneTitle: '{{count}} Günlük Seri!',
    celebrationMilestoneAria: 'Kilometre taşına ulaşıldı: {{count}} günlük seri',
    // StreakCelebrationScreen'in tam ekran gösterimi (bkz. App.jsx) — sıradan
    // artış, yukarıdaki kilometre taşı başlığıyla aynı "{{count}} Günlük
    // Seri!" ifadesini kullanır, sadece alt metni daha hafif; rozet satırı
    // yalnızca kilometre taşında görünür.
    celebrationIncrementTitle: '{{count}} Günlük Seri!',
    celebrationIncrementSubtitle: 'Ateşi canlı tut.',
    celebrationMilestoneSubtitle: 'Yeni bir kilometre taşına ulaştın!',
    celebrationMilestoneBadge: 'Kilometre Taşı',
    celebrationContinueButton: 'Devam et',
  },

  timer: {
    focus: 'Odaklan',
    shortBreak: 'Kısa mola',
    longBreak: 'Uzun mola',
    switchTo: "{{label}} moduna geç",
    currentTask: 'Aktif görev',
    noActiveTask: 'Aktif görev yok. Başlamak için Planlama\'da bir görev ekle.',
    goToPlanningButton: "Planlama'ya git",
    start: 'Başlat',
    resume: 'Devam Et',
    pause: 'Duraklat',
    pauseCount: 'Bu oturumda {{count}} kez duraklatıldı',
    noTaskStartHint: "Görevsiz de başlatabilirsin, ya da önce Planlama'da bir görev seç.",
    voidPomodoro: "Pomodoro'yu İptal Et",
    skipBreak: 'Molayı atla',
    hadInterruption: 'Bir kesinti mi oldu?',
    internalInterruption: 'İç kesinti ({{count}})',
    externalInterruption: 'Dış kesinti ({{count}})',
    undoInternalAria: 'iç kesintiyi geri al',
    undoExternalAria: 'dış kesintiyi geri al',
    keyboardShortcutsTitle: 'Klavye kısayolları',
    keyboardModalTitle: 'Klavye Kısayolları',
    keyboardColCommand: 'Komut',
    keyboardColAction: 'İşlev',
    shortcutStartPause: 'Zamanlayıcıyı başlat; çalışırken duraklat / devam ettir',
    shortcutVoid: 'Mevcut Pomodoro\'yu iptal et',
    shortcutFullscreen: 'Tam ekran odak modunu aç/kapat',
    shortcutSkipBreak: 'Mevcut molayı atla',
    shortcutGoTimer: "Zamanlayıcı sekmesine git",
    shortcutGoPlanning: "Planlama sekmesine git",
    shortcutGoReports: 'Raporlar sekmesine git',
    shortcutHelp: 'Bu kısayol listesini göster',
    shortcutsCloseAria: 'klavye kısayollarını kapat',
    unplannedPrompt: 'Aniden mi çıktı? Yaz ve devam et.',
    switchAwayConfirm:
      'Devam eden Pomodoro zili çalmadan yarıda bırakılıp iptal edilecek (sayılmayacak). Yine de molaya geçilsin mi?',
    voidPanelWarning: 'Bu Pomodoro iptal edilecek ve sayılmayacak.',
    voidReasonLabel: 'Bu Pomodoro\'yu neden iptal ettin? (opsiyonel)',
    voidReasonPlaceholder: 'ör. toplantıya çağrıldım',
    voidReasonAria: 'İptal nedeni (opsiyonel)',
    exitFullscreenAria: 'Tam ekran odak modundan çık',
    enterFullscreenAria: 'Tam ekran odak moduna gir',
    exitFullscreenTitle: 'Tam ekrandan çık (F veya Esc)',
    enterFullscreenTitle: 'Tam ekran odak modu (F)',
    closeMiniTimerAria: 'Mini zamanlayıcı penceresini kapat',
    openMiniTimerAria: 'Mini zamanlayıcı penceresini aç (resim içinde resim)',
    closeMiniTimerTitle: 'Mini zamanlayıcı penceresini kapat',
    openMiniTimerTitle: 'Mini zamanlayıcı penceresi (resim içinde resim)',
  },

  motivation: {
    buttonAria: 'Motivasyon anı',
    buttonTitle: 'Motivasyon anı için bir kart çek',
    usedBadgeAria: 'Bu Pomodoro için zaten kullanıldı',
    overlayCloseAria: 'Motivasyon anını kapat',
    pickPrompt: 'Bir kart seç',
    revealAgainHint: 'Ne çıkacağını görmek için bir karta dokun.',
    alreadyDrawnTitle: 'Bu Pomodoro için zaten çekildi',
    alreadyDrawnMessage: 'Bu Pomodoro için zaten bir kart çektin. Yeni bir kart bir sonraki Pomodoro\'da hazır olacak.',
    guessItShowAnswer: 'Cevabı göster',
    rareBadge: 'Nadir',
    guestPreviewBubble: 'Kayıt ol, seni de oyuna alayım.',
    guestPreviewMessage: 'Pomodorolarının arasında benimle motivasyon kartı çekmek için ücretsiz bir hesap oluştur.',
    flavorLines: [
      'Hangi kart sana gerçekten sesleniyorsa, onu seç.',
      'Elin sürüklensin, doğru kart zaten senin olduğunu biliyor.',
      'Burada yanlış seçim yok. Sadece seni çağıran var.',
      'Bir nefes gözlerini kapat, sonra sıcak gelen kartı seç.',
      'Çekimine güven. Kartlar zaten biliyor.',
      'Bunlardan biri seni bekliyor.',
      'Bir nefes al. Doğru hissettireni seç.',
      'Cevap seni de seçer. Hadi.',
    ],
    headPokeReactions: [
      'Hey! Dikkatli ol, ben stres topu değilim!',
      'Ay! Nazik ol, domates gibi morarırım!',
      'Bilge domatese böyle dokunulmaz!',
      'Olgunum, düğme değilim!',
      'Bilgeliğime dokun, yüzüme değil!',
      'Bir kere daha dürtersen yuvarlanıp giderim!',
    ],
    categories: {
      focusDiscipline: {
        label: 'Odak ve Disiplin',
        subTypes: {
          notableFigure: {
            entries: [
              'Bilge bir öğretmen şöyle derdi: Kaçındığın iş, çoğu zaman seni en çok büyüten iştir.',
              'Usta bir zanaatkarın sözüydü: Ustalık hızdan değil sabırdan doğar.',
              'Deneyimli bir antrenör hep şunu söylerdi: Disiplin, şimdi istediğinle en çok istediğin arasında seçim yapmaktır.',
              'Sessiz bir düşünür bir keresinde şöyle demişti: Her gün atılan küçük adımlar, seyrek atılan büyük sıçramaları geçer.',
              'Kıdemli bir öğretmen öğrencilerine hep şunu hatırlatırdı: Odak da bir kastır, bugün onun antrenman günü.',
              'Yaşlı bir bilge şöyle derdi: Tencere, sen izlemeyi bırakıp çalışmaya devam ettiğinde kaynar.',
            ],
          },
          fictional: {
            entries: [
              "Yaşlı Dağ Bilgesi: 'Zirve yerinden kımıldamaz. Kımıldayan sadece ayaklarındır.'",
              "Çelik Şövalye: 'Kılıç savaştan değil, kullanılmamaktan körelir. Durma.'",
              "Deniz Feneri Bekçisi: 'Feneri sakin denizler için yakmıyorum. Fırtına için yakıyorum.'",
              "Gezgin Bilgin: 'Çevrilen her sayfa, ustalığa doğru atılmış bir mildir.'",
              "Yıldız Rehberi: 'Rotasından sapan bir gemi bile yol almaya devam ederse karaya ulaşır.'",
              "Köy Demircisi: 'Demir, şekillenmeden önce sıcak olmayı istemez. Sen de istemeyi bekleme.'",
            ],
          },
          proverb: {
            entries: [
              'Yağmur dilemekle tarla sürülmez.',
              'En uzun boylu ağaç bile bir zamanlar vazgeçmeyi reddeden tek bir tohumdu.',
              'Uçmaya devam eden yavaş bir ok, sadakta kalandan daha uzağa gider.',
              'Küçük bir mum bile, yanmaya devam ettiği sürece uzun bir geceyi aşabilir.',
              'Nehir taşı gücüyle değil, sabrıyla oyar.',
              'Her gün konan tek bir tuğla bile kışa kadar bir duvar örer.',
            ],
          },
        },
      },
      // Amaçlanan ton (ileride gerçek içeriği yazacak kişi için): sıcak,
      // destekleyici, ertelemeyi veya bitmemiş bir görevi asla
      // yargılamayan — Odak ve Disiplin'in tam tersi bir ton.
      selfCompassion: {
        label: 'Kendine Şefkat',
        entries: [
          'Bugün ortaya çıktın. Bu bile bir şey ifade ediyor.',
          'Bitmemiş olmak başarısız olmak demek değil, hâlâ devam ediyor demek.',
          'Dinlenmek üretkenliğin zıttı değil, bir parçasıdır.',
          'Yavaş geçen bir günün olabilir ve yine de kendinle gurur duyabilirsin.',
          'İlerlemenin gerçek olması için gürültülü olması gerekmez.',
          'Kendine, iyi bir arkadaşına gösterdiğin sabrı göster.',
        ],
      },
      tomatoManJokes: {
        label: 'Domates Adam Şakaları',
        entries: [
          'Odadaki en üretken sebze olduğumu söylemiyorum ama teknik olarak bir meyveyim, ne düşünürsen düşün.',
          'Buna Pomodoro demelerinin bir sebebi var, yirmi beş dakika sonra ben de suratımdan kızarıyorum.',
          'Eskiden kanepe patatesiydim. Sonra hırslandım ve kanepe domatesi oldum.',
          'Molanın en sevdiğim kısmı telefonuma bakmayacakmış gibi yapmak. Her seferinde işe yarıyor.',
          'Kimileri rahatlamak için koyun sayar. Ben bitirdiğim pomodoroları sayarım. Daha iyi çalışıyor.',
          'Ertelemeyle ilgili bir şaka anlatacaktım ama sürekli erteliyorum.',
        ],
      },
      funFact: {
        label: 'İlginç Bilgi',
        subTypes: {
          fact: {
            entries: [
              "Avrupa'nın bazı yerlerinde domatesin zehirli olduğuna inanılırdı, oysa sebep sadece zengin sofralardaki kalay tabakların asitle tepkimeye girmesiydi. Domates baştan beri masumdu.",
              "Pomodoro Tekniği adını, yaratıcısı Francesco Cirillo'nun 1980'lerin sonunda üniversitede kullandığı domates şeklindeki sade bir mutfak zamanlayıcısından alır.",
              "Botanik olarak domates bir meyvedir. 1893'te ünlü bir ABD Yüksek Mahkemesi kararı, sadece vergi amacıyla onu sebze saydı. Kanun bile tek bir cevapta odaklanamadı.",
              'Dikkat üzerine yapılan araştırmalar, zihnin yaklaşık yirmi ila otuz dakikalık odaklı çalışmadan sonra dağılmaya başladığını gösteriyor, tam da klasik bir Pomodoro süresine denk geliyor.',
              'Dünya genelinde kiraz büyüklüğünden bir kilogramı aşan türlere kadar on binden fazla domates çeşidi yetiştiriliyor.',
              'Odaklı çalışma seansları arasındaki kısa molaların, beynin az önce öğrendiklerini pekiştirmesine yardımcı olduğu gösterilmiştir.',
            ],
          },
          guessIt: {
            entries: [
              {
                question: 'Doğru mu yanlış mı: Domates teknik olarak bir meyvedir, sebze değildir.',
                answer: 'Doğru. Botanik olarak domates bir meyvedir çünkü bir çiçekten gelişir ve tohum taşır.',
              },
              {
                question: 'Klasik bir Pomodoro çalışma seansı kaç dakika sürer?',
                answer: "Yirmi beş dakika, ardından kısa bir mola gelir. Ayarlar'dan değiştirebilirsin ama klasik varsayılan 25'tir.",
              },
              {
                question: "Pomodoro Tekniği'nin adını hangi günlük eşyadan aldı?",
                answer: "Domates şeklinde bir mutfak zamanlayıcısından. 'Pomodoro' İtalyancada domates demektir.",
              },
              {
                question: 'Çoğu insan dikkati dağılmadan önce derin odağı ne kadar süre koruyabilir?',
                answer: 'Yaklaşık yirmi ila otuz dakika, kısa odaklı seansların bu kadar işe yaramasının bir nedeni de bu.',
              },
              {
                question: 'Doğru mu yanlış mı: Çalışma sırasında kısa molalar vermek hafızayı gerçekten iyileştirebilir.',
                answer: 'Doğru. Kısa molalar, beynin az önce öğrendiklerini pekiştirmesine yardımcı olur.',
              },
              {
                question: 'Dünya genelinde aşağı yukarı kaç domates çeşidi var?',
                answer: 'On binden fazla, küçük kiraz domateslerinden bir kilogramı aşan devasa türlere kadar.',
              },
            ],
          },
        },
      },
      personalStatCard: {
        label: 'Kişisel İstatistik Kartı',
        templates: {
          today: 'Bugün {{count}} Pomodoro tamamladın.',
          week: 'Bu hafta {{count}} Pomodoro tamamladın.',
          allTime: 'Toplamda {{count}} Pomodoro tamamladın.',
          tasksDone: 'Şimdiye kadar {{count}} görev bitirdin.',
        },
      },
      rare: {
        label: 'Nadir Kart',
        openingLine: 'Zamanın nadir bir ipliği seni buldu. Bir an dur ve içine işlemesine izin ver.',
      },
    },
  },

  motivationStats: {
    title: 'Kart Koleksiyonu',
    noDrawsYet: 'Koleksiyonuna başlamak için Zamanlayıcı\'dan ilk kartını çek.',
    totalDrawsLabel: 'Çekilen kart',
    distinctCategoriesLabel: 'Keşfedilen kategori',
    rareFoundLabel: 'Bulunan nadir kart',
    firstRareLabel: 'İlk Nadir kart',
    firstRareNone: 'Henüz bulunamadı',
    byCategoryTitle: 'Kategoriye göre',
    achievementsFooter: 'Daha fazla kart rozeti hemen aşağıda.',
  },

  streakMilestones: {
    title: 'Seri Kilometre Taşları',
    summary: 'Mevcut seri: {{current}} gün · En uzun: {{longest}} gün',
    milestoneLabel: '{{days}} günlük seri',
    reachedAria: 'Ulaşıldı',
    lockedAria: 'Henüz ulaşılmadı',
  },

  // Ayarlar > Başarılar — bunun render ettiği yapılandırma için
  // src/lib/achievements.js'e (src/components/achievements/AchievementGrid.jsx),
  // açılış bildirimi için AchievementUnlockToast.jsx'e bakın.
  achievements: {
    title: 'Başarılar',
    summary: '{{unlocked}}/{{total}} açıldı',
    categories: {
      dailyPomodoroCount: {
        label: 'Günlük Odak',
        description: 'Tek bir günde birden fazla Pomodoro tamamla.',
      },
      cumulativeFocusHours: {
        label: 'Toplam Odak Süresi',
        description: 'Zaman içinde odaklanılmış çalışma saatleri biriktir.',
      },
      cumulativeBreakHours: {
        label: 'Toplam Mola Süresi',
        description: 'Pomodorolar arasında dinlenerek geçirilen süreyi biriktir.',
      },
      cumulativeTasksCompleted: {
        label: 'Tamamlanan Görevler',
        description: 'Tüm zamanlar boyunca görevleri tamamla.',
      },
      activeDaysLifetime: {
        label: 'Aktif Günler',
        description: 'Hangi sırayla olursa olsun, en az bir Pomodoro tamamladığın günler.',
      },
      motivationCardsDraws: {
        label: 'Kart Çekilişleri',
        description: 'Motivasyon destesinden kart çek.',
      },
      motivationCardsRare: {
        label: 'Nadir Buluşlar',
        description: 'Motivasyon destesinden Nadir kartlar çek.',
      },
      motivationCardsDiscovery: {
        label: 'Tam Koleksiyon',
        description: 'Her kart kategorisini keşfet.',
      },
      firsts: {
        label: 'İlkler',
        description: 'Sadece bir kez yaşadığın kilometre taşları.',
      },
      resilience: {
        label: 'Dayanıklılık',
        description: 'Bir kesintiyi görmezden gelmek yerine adını koy.',
      },
      categoryDiversity: {
        label: 'Çok Yönlü',
        description: 'Farklı kategorilerde görevler tamamla.',
      },
      earlyBird: {
        label: 'Erken Kalkan',
        description: 'Saat 08:00\'den önce bir Pomodoro tamamla.',
      },
      nightOwl: {
        label: 'Gece Kuşu',
        description: 'Saat 22:00 veya sonrasında bir Pomodoro tamamla.',
      },
      reflectivePause: {
        label: 'Düşünceli Mola',
        description: 'Bir Pomodoro planlandığı gibi gitmediğinde nedenini yaz.',
      },
    },
    dailyPomodoroCount: {
      tier1: { title: 'İlk Pomodoro', description: 'Gününün ilk Pomodorosunu tamamla.' },
      tier2: { title: 'Isınma Turu', description: 'Tek bir günde 4 Pomodoro tamamla.' },
      tier3: { title: 'Akışta', description: 'Tek bir günde 8 Pomodoro tamamla.' },
      tier4: { title: 'Derin Odak', description: 'Tek bir günde 12 Pomodoro tamamla.' },
      tier5: { title: 'Yılmaz', description: 'Tek bir günde 16 Pomodoro tamamla.' },
      tier6: { title: 'Durdurulamaz', description: 'Tek bir günde 20 Pomodoro tamamla.' },
      tier7: { title: 'Tam Gaz', description: 'Tek bir günde 24 Pomodoro tamamla.' },
    },
    cumulativeFocusHours: {
      tier1: { title: '25 Saat Odaklanma', description: 'Toplamda 25 saat odaklanılmış çalışmaya ulaş.' },
      tier2: { title: '50 Saat Odaklanma', description: 'Toplamda 50 saat odaklanılmış çalışmaya ulaş.' },
      tier3: { title: '100 Saat Odaklanma', description: 'Toplamda 100 saat odaklanılmış çalışmaya ulaş.' },
      tier4: { title: '250 Saat Odaklanma', description: 'Toplamda 250 saat odaklanılmış çalışmaya ulaş.' },
      tier5: { title: '500 Saat Odaklanma', description: 'Toplamda 500 saat odaklanılmış çalışmaya ulaş.' },
      tier6: { title: '1.000 Saat Odaklanma', description: 'Toplamda 1.000 saat odaklanılmış çalışmaya ulaş.' },
    },
    cumulativeBreakHours: {
      tier1: { title: 'Rahatına Bak', description: 'Toplamda 5 saat mola süresine ulaş.' },
      tier2: { title: 'İyi Dinlenmiş', description: 'Toplamda 15 saat mola süresine ulaş.' },
      tier3: { title: 'Dengeyi Koru', description: 'Toplamda 30 saat mola süresine ulaş.' },
      tier4: { title: 'Düzenli Şarj', description: 'Toplamda 75 saat mola süresine ulaş.' },
      tier5: { title: 'Toparlanma Ustası', description: 'Toplamda 150 saat mola süresine ulaş.' },
      tier6: { title: 'Dinlenme Efendisi', description: 'Toplamda 300 saat mola süresine ulaş.' },
    },
    cumulativeTasksCompleted: {
      tier1: { title: 'İşleri Bitiriyor', description: '5 görev tamamla.' },
      tier2: { title: 'İstikrarlı İlerleme', description: '25 görev tamamla.' },
      tier3: { title: 'Görev Ezicisi', description: '50 görev tamamla.' },
      tier4: { title: 'Momentum Yaratan', description: '150 görev tamamla.' },
      tier5: { title: 'Üretken', description: '300 görev tamamla.' },
      tier6: { title: 'Görev Efsanesi', description: '600 görev tamamla.' },
    },
    activeDaysLifetime: {
      tier1: { title: 'İlk Gün', description: 'İlk aktif gününde bir Pomodoro tamamla.' },
      tier2: { title: 'Bir Haftalık', description: '7 farklı günde aktif ol.' },
      tier3: { title: 'Bir Aylık', description: '30 farklı günde aktif ol.' },
      tier4: { title: 'Çeyrek Güç', description: '90 farklı günde aktif ol.' },
      tier5: { title: 'Yarım Yıl', description: '180 farklı günde aktif ol.' },
      tier6: { title: 'Tam Bir Yıl', description: '365 farklı günde aktif ol.' },
      tier7: { title: 'İki Yıl Güçlü', description: '730 farklı günde aktif ol.' },
    },
    motivationCardsDraws: {
      tier1: { title: 'İlk Çekiliş', description: 'İlk motivasyon kartını çek.' },
    },
    motivationCardsRare: {
      tier1: { title: 'Nadir Bulgu', description: 'İlk Nadir kartını çek.' },
      tier2: { title: 'Şanslı Seri', description: '5 Nadir kart çek.' },
      tier3: { title: 'Nadir Koleksiyoncu', description: '10 Nadir kart çek.' },
    },
    motivationCardsDiscovery: {
      tier1: { title: 'Kart Uzmanı', description: 'Her motivasyon kartı kategorisini keşfet.' },
    },
    firsts: {
      task: { title: 'İlk Görev Tamamlandı', description: 'İlk görevini tamamla.' },
      break: { title: 'İlk Mola Verildi', description: 'İlk molanı ver.' },
    },
    resilience: {
      tier1: {
        title: 'Adını Koyma',
        description: 'Fark etmeden geçmesine izin vermek yerine ilk kesintini kaydet.',
      },
      tier2: { title: 'Farkındalığını Koru', description: '10 kesinti kaydet.' },
      tier3: { title: 'Sağlam Duruş', description: '25 kesinti kaydet.' },
      tier4: { title: 'Sarsılmaz', description: '50 kesinti kaydet.' },
    },
    categoryDiversity: {
      tier1: { title: 'Ufkunu Genişlet', description: '2 farklı kategoride görev tamamla.' },
      tier2: { title: 'Çok Yönlü', description: '4 farklı kategoride görev tamamla.' },
      tier3: { title: 'Her Şeyden Biraz', description: '6 farklı kategoride görev tamamla.' },
    },
    earlyBird: {
      tier1: { title: 'Erken Kalkan', description: "Saat 08:00'den önce bir Pomodoro tamamla." },
    },
    nightOwl: {
      tier1: { title: 'Gece Kuşu', description: 'Saat 22:00 veya sonrasında bir Pomodoro tamamla.' },
    },
    reflectivePause: {
      tier1: {
        title: 'Düşünceli Mola',
        description: 'Bir Pomodoro ilk kez planlandığı gibi gitmediğinde nedenini yaz.',
      },
    },
    progress: {
      countFormat: '{{value}}/{{threshold}}',
      hoursFormat: '{{value}} sa / {{threshold}} sa',
      daysFormat: '{{value}}/{{threshold}} gün',
    },
    toast: {
      unlockedLabel: 'Başarı Açıldı',
      dismissAria: 'Kapat',
    },
    grid: {
      lockedAria: 'Kilitli',
      unlockedAria: 'Açıldı',
      allTiersDone: 'Tüm seviyeler tamamlandı',
      cardBadgesTitle: 'Kart Rozetleri',
      specialTitle: 'Özel',
    },
  },

  notifications: {
    pomodoroCompleteTitle: 'Pomodoro tamamlandı',
    longBreakBody: 'Uzun mola zamanı.',
    shortBreakBody: 'Kısa mola zamanı.',
    breakOverTitle: 'Mola bitti',
    backToWorkBody: 'Çalışmaya dönme zamanı.',
  },

  inventory: {
    title: 'Görev Envanteri',
    itemsCount: '{{count}} öğe',
    newTaskPlaceholder: 'Yeni görev...',
    newTaskAria: 'Yeni görev',
    estimateLabel: 'Tahmin',
    estimatePlaceholder: '# pomodoro',
    estimateShortPlaceholder: 'Tahmin',
    estimateAria: 'Tahmin',
    taskNameAria: 'Görev adı',
    deadlineAria: 'Son tarih',
    markUnplannedTitle: 'Plansız olarak işaretle',
    addButton: 'Ekle',
    saveButton: 'Kaydet',
    cancelButton: 'Vazgeç',
    selectToCombineTitle: 'Diğer küçük görevlerle birleştirmek için seç (Kural 5)',
    selectAria: "{{text}} görevini birleştirmek için seç",
    markDoneAria: 'tamamlandı olarak işaretle',
    unplannedBadgeTitle: 'Plansız',
    moreThanWarningInline: "{{max}}'den fazla. Parçalara ayır (Kural 4)",
    moreThanWarning: "{{max}} pomodorodan fazla. Görevi alt görevlere böl (Kural 4).",
    addToToday: "Bugüne ekle",
    editAria: 'envanter öğesini düzenle',
    editTitle: 'Düzenle',
    deleteConfirm: 'Bu görev envanterden silinsin mi?',
    combinePrompt: '{{count}} görev seçildi. Birleştirilsin mi? (Kural 5)',
    combineButton: 'Birleştir',
    combineConfirm: '{{count}} görev tek görevde birleştirilsin mi? Orijinaller kaldırılır ve bu geri alınamaz.',
    emptyState: 'Görev listeni oluşturmaya başlamak için yukarıdan ilk görevini ekle.',
  },

  today: {
    title: 'Bugünün Görevleri',
    newTaskPlaceholder: 'Yeni görev...',
    newTaskAria: 'Yeni görev',
    estimateLabel: 'Tahmin',
    estimatePlaceholder: '# pomodoro',
    estimateShortPlaceholder: 'Tahmin',
    estimateAria: 'Tahmin',
    taskNameAria: 'Görev adı',
    addButton: 'Ekle',
    saveButton: 'Kaydet',
    cancelButton: 'Vazgeç',
    moreThanWarning: "{{max}} pomodorodan fazla. Görevi alt görevlere böl (Kural 4).",
    colTask: 'Görev',
    colEstimate: 'Tahmin',
    colReal: 'Gerçek',
    colDiff: 'Fark',
    emptyState: 'Bugün için planlanmış bir şey yok. Envanterinden bir görev seç ya da doğrudan ekle.',
    unplannedUrgentTitle: 'Plansız ve Acil',
    unplannedBadgeTitle: 'Plansız',
    makeActiveAria: 'aktif görev yap',
    reestimateAria: 'görevi yeniden tahmin et',
    reestimateTitleRunningLong: 'Uzun mu sürüyor? Yeniden tahmin etmek için tıkla.',
    reestimateTitleAgain: 'Yeniden tahmin edildi: {{from}} → {{to}}{{extra}}. Tekrar tahmin etmek için tıkla.',
    finishTaskTitle: 'Görevi bitir',
    finishTaskAria: 'görevi bitir',
    editTaskTitle: 'Görevi düzenle',
    editTaskAria: 'görevi düzenle',
    deleteTaskTitle: 'Görevi sil',
    deleteTaskAria: 'görevi sil',
    deleteConfirm: 'Bu görev silinsin mi?',
    alreadyTwoReestimates:
      'Bu görevin zaten iki yeniden tahmini var (Fark I ve Fark II). İkincisi kilitlendi.',
    reestimatePrompt: '"{{text}}" için yeniden tahmin:',
    newEstimateAria: 'Yeni tahmin',
    moreThanWarningInline: "{{max}}'den fazla. Parçalara ayır (Kural 4)",
    bulkActionsAria: 'görev listesi işlemleri',
    clearFinishedLabel: 'Tamamlanan görevleri temizle',
    clearFinishedConfirm: 'Bu, bugünün listesindeki tüm tamamlanmış görevleri kalıcı olarak silecek. Devam edilsin mi?',
    clearAllLabel: 'Tüm görevleri temizle',
    clearAllConfirm:
      'Bu, bugünün listesindeki TÜM görevleri (tamamlanmamışlar dahil) kalıcı olarak silecek. Bu geri alınamaz. Devam edilsin mi?',
  },

  availablePomodoros: {
    title: 'Kullanılabilir Pomodorolar',
    hoursLabel: 'Bugün müsait saat',
    hoursPlaceholder: 'ör. 6',
    useTimetableButton: 'Zaman çizelgesini kullan ({{hours}}s)',
    useTimetableTitle: "Bugünün zaman çizelgesi bloklarından doldur",
    pomodorosAvailable: 'Kullanılabilir pomodoro',
    plannedLabel: '{{count}} planlandı',
    overCapacity: '. Kapasite aşıldı, bugünün listesini kısalt',
  },

  timetable: {
    title: 'Bugünün zaman çizelgesi',
    startAria: 'Blok başlangıç saati',
    endAria: 'Blok bitiş saati',
    labelPlaceholder: 'Etiket (opsiyonel)',
    labelAria: 'Blok etiketi',
    addButton: 'Ekle',
    emptyState: 'Henüz zaman bloğu planlanmadı.',
    removeAria: '{{start}}-{{end}} bloğunu kaldır',
    nowSuffix: ' (şimdi)',
  },

  unplanned: {
    placeholder: 'Ani görev...',
    aria: 'Ani görev',
    addButton: 'Ekle',
  },

  categoryPicker: {
    noneSelected: 'Kategori yok',
    noneYet: 'Henüz kategori yok',
    addCategory: 'Kategori ekle',
  },

  categorySelect: {
    allCategories: 'Tüm kategoriler',
    noCategory: 'Kategori yok',
  },

  categoryManager: {
    title: 'Kategoriler',
    newCategoryPlaceholder: 'Yeni kategori...',
    newCategoryAria: 'Yeni kategori adı',
    categoryNameAria: 'Kategori adı',
    addButton: 'Ekle',
    saveButton: 'Kaydet',
    cancelButton: 'Vazgeç',
    editAria: "{{name}} kategorisini düzenle",
    editTitle: 'Düzenle',
    deleteAria: "{{name}} kategorisini sil",
    deleteTitle: 'Sil',
    deleteConfirm: '"{{name}}" kategorisi silinsin mi? Bunu kullanan görev ve kayıtlar kategorisiz görünecek.',
    emptyState: 'Henüz kategori yok. Görevler kategorisiz görünecek.',
    // Misafirler mevcut kategorileri tam olarak kullanmaya devam eder
    // (atama/düzenleme/silme) — sadece yeni bir kategori oluşturmak hesap
    // gerektirir. Bkz. CategoryManager.jsx.
    signUpToCreateHint: 'Yeni kategori oluşturmak ücretsiz bir hesap gerektirir. Mevcut kategorilerini kullanmaya, düzenlemeye ve silmeye devam edebilirsin.',
  },

  defaultCategories: {
    work: 'İş',
    study: 'Ders',
    personal: 'Kişisel',
    admin: 'Yönetimsel',
    health: 'Sağlık',
  },

  categoryColors: {
    teal: 'Turkuaz',
    plum: 'Erik Moru',
    slate: 'Arduvaz',
    moss: 'Yosun',
    mustard: 'Hardal',
    rose: 'Gül Kurusu',
    ochre: 'Ohra',
    indigo: 'Çivit',
  },

  reports: {
    title: 'Raporlar',
    reviewToday: "Bugünü gözden geçir",
    periodToday: 'Bugün',
    periodWeek: 'Bu Hafta',
    periodMonth: 'Bu Ay',
    periodYear: 'Bu Yıl',
    noHistoryHint: 'Henüz yeterli geçmiş yok. Uygulamayı daha çok gün kullandıkça filtreler farklılaşacak.',
    noDataForPeriod: 'Bu dönem için henüz veri yok.',
    noDataAtAll:
      'Eğilimlerini burada görmek için birkaç pomodoro tamamla ve bir görev bitir: tahmin doğruluğu, kesinti örüntüleri ve odak sürenin nereye gittiği burada görünecek.',
    totalFocusTime: 'Toplam odaklanma süresi',
    totalFocusTimeTooltip:
      'Yaklaşık bir değerdir: geçmiş pomodoro sayısı × şu anki work-duration ayarı. Work duration\'ı değiştirirsen burada gösterilen geçmiş toplamlar da değişir. Her geçmiş oturumun gerçekte kaç dakika sürdüğünün birebir kaydı değildir.',
    pomodorosToday: 'Bugünkü pomodorolar',
    tasksToday: 'Bugünkü görevler',
    tasksTodayActiveCaption: '{{active}} aktif',
    interruptionsToday: 'Bugünkü kesintiler',
    pausesToday: 'Bugünkü duraklatmalar',
    todaySummaryTitle: 'Bugünün Özeti',
    todaySummarySubtitle: '{{poms}} pomodoro · {{interruptions}} kesinti',
    estimationAccuracyTitle: 'Tahmin Doğruluğu',
    estimationAccuracySubtitle: 'Tahmin - Gerçek',
    overestimated: 'Fazla tahmin edildi (daha az sürdü)',
    underestimated: 'Az tahmin edildi (daha uzun sürdü)',
    diffChartCaption: 'Tahmin ve gerçek, göreve göre ({{count}})',
    avgErrorThisWeek: 'Bu hafta ort. hata: {{value}}',
    avgErrorLastWeek: 'geçen hafta: {{value}}',
    interruptionTrendsTitle: 'Kesinti Eğilimleri',
    interruptionTrendsSubtitle: 'İç - dış kesintiler',
    avgInterruptionsPerTask: 'görev başına ort. kesinti',
    thisWeek: 'bu hafta: {{value}}',
    lastWeek: 'geçen hafta: {{value}}',
    interruptionCount: '{{count}} ({{internal}} iç · {{external}} dış)',
    pauseTrendsTitle: 'Duraklatma Eğilimleri',
    pauseTrendsSubtitle: 'Ne sıklıkla duraklatıyorsun',
    avgPausesPerDay: 'gün başına ort. duraklatma',
    categoryBreakdownTitle: 'Kategoriye Göre Pomodorolar',
    categoryBreakdownSubtitle: 'Kategoriye göre süre',
    pomSuffix: '{{count}} pom.',
    uncategorized: 'Kategorisiz',
    longTermTitle: 'Uzun Vadeli Isı Haritası',
    longTermSubtitle: 'Son {{weeks}} hafta',
    stepPrevious: '← Önceki',
    stepNext: 'Sonraki →',
    stepIndicator: '{{current}} / {{total}}',
    noChartDataTitle: 'Henüz burada bir şey yok',
    collapse: '▾ daralt',
    expand: '▸ genişlet',
    activityCaption: 'Etkinlik (son 13 hafta)',
    pomodorosThisMonth: 'Bu ayki pomodorolar',
    pomodorosThisQuarter: 'Bu çeyrekteki pomodorolar',
    avgInterruptionsMonth: 'Görev başına ort. kesinti (ay)',
    avgInterruptionsQuarter: 'Görev başına ort. kesinti (çeyrek)',
    heatmapAriaLabel: 'Günlük Pomodoro etkinliği, son 13 hafta',
    heatmapTooltipOne: '{{date}}: {{count}} pomodoro',
    heatmapTooltipOther: '{{date}}: {{count}} pomodoro',
    less: 'Az',
    more: 'Çok',
    noEstimatedTasks: 'Henüz tahmini olan tamamlanmış görev yok.',
    diffChartAriaLabel: 'Göreve göre tahmin farkı',
    diffTooltip: '{{activity}}: {{diff}}{{reestimated}}',
    diffTooltipReestimated: ' (yeniden tahmin edildi)',
    tookLonger: 'Daha uzun sürdü',
    tookLess: 'Daha az sürdü',
  },

  dayReview: {
    title: 'Bugünün Özeti: {{date}}',
    closeAria: 'özeti kapat',
    pomodorosCompleted: 'Tamamlanan pomodorolar',
    interruptions: 'Kesintiler ({{internal}} iç · {{external}} dış)',
    unplannedTasks: 'Plansız görevler',
    mostAccurate: 'En doğru tahmin',
    biggestSurprise: 'En büyük sürpriz',
    tasksFinished: 'Bugün biten görevler ({{count}})',
    noTasksYet: 'Bugün henüz biten görev yok.',
    estimateLabel: 'Tah. {{value}}',
    realLabel: 'Gerçek {{value}}',
  },

  recordsLog: {
    title: 'Kayıt Günlüğü',
    filterDateAria: 'Tarihe göre filtrele',
    clearFilters: 'Filtreleri temizle',
    noRecordsFiltered: 'Bu filtrelere uyan kayıt yok.',
    noRecordsEmpty: 'Tamamlanan görevlerin burada görünecek.',
    activityAria: 'Etkinlik adı',
    editAria: 'kaydı düzenle',
    editTitle: 'Düzenle',
    deleteAria: 'kaydı sil',
    deleteTitle: 'Sil',
    deleteConfirm: 'Bu kayıt silinsin mi?',
    estimateLabel: 'Tahmin: {{value}}',
    actualLabel: 'Gerçek: {{value}}',
    diffLabel: 'Fark: {{value}}',
    diffILabel: 'Fark I: {{value}}',
    diffIILabel: 'Fark II: {{value}}',
    voidedPomodorosTitle: 'İptal Edilen Pomodorolar',
    voidedAt: '{{elapsed}} / {{total}}\'da iptal edildi',
    deleteVoidConfirm: 'Bu iptal günlüğü kaydı silinsin mi?',
    deleteVoidAria: 'iptal günlüğü kaydını sil',
    deleteVoidTitle: 'Sil',
  },

  chime: {
    classic: 'Klasik',
    soft: 'Yumuşak',
    alert: 'Uyarı',
  },

  // Bağlamsal metodoloji ipuçları — bkz. constants.js'teki COACH_MARKS/
  // pickCoachMark. Her bölümde tek bir genel "hoş geldin" yerine, belirli
  // bir ana bağlı (ilk ziyaret, ilk Pomodoro başlatma, ilk mola vb.) birkaç
  // kısa ipucu var. Her biri, Pomodoro Tekniği'ni hiç duymamış biri için
  // tek başına anlaşılır olmalı — hiçbir terim tanıtılmadan kullanılmaz.
  coachMarks: {
    gotIt: 'Anladım',
    learnMore: 'Daha fazla bilgi',
    timerIntro: {
      title: 'Fikir şu',
      body: 'Bir Pomodoro, tek bir görev üzerinde 25 dakikalık odaklanmış çalışmadır, ardından kısa bir mola gelir. Planlama sekmesinde bir görev ekle, sonra buraya dön ve ilk Pomodoro\'nu başlatmak için Başlat\'a bas.',
    },
    timerFirstStart: {
      title: 'Bu Pomodoro sonuna kadar sürmeli',
      body: 'Bir Pomodoro başladıktan sonra 25 dakika boyunca kesintisiz sürmesi beklenir. İki bilinçli istisna var:\n\n- Duraklat, kapı çalması gibi kısa bir kesinti için yerini korur. Bu uygulamanın kendi eklentisidir, orijinal tekniğin bir parçası değildir.\n- İptal Et, çalışmanın kendisi durmak zorunda olduğunda seansı tamamen siler.',
    },
    timerFirstInterruption: {
      title: 'Az önce bir kesinti işaretledin',
      body: 'Amaç tam olarak bu. Bir dikkat dağınıklığını hemen tepki vermek yerine not ediyorsun. İçsel kesintiler senden gelir, dışsal olanlar başka birinden. Her iki durumda da Pomodoro\'n çalışmaya devam ediyor ve bu örüntüleri daha sonra Raporlar\'da göreceksin.',
    },
    timerFirstBreak: {
      title: 'Bu senin molan',
      body: 'Her Pomodoro\'dan sonraki kısa mola, bir sonrakine geçmeden önce toparlanmanı sağlar. Her 4. Pomodoro\'dan sonra ise daha uzun bir mola alırsın. Bu, tüm gün boyunca zinde kalman için tekniğin ritmidir.',
    },
    planningIntro: {
      title: 'Gününü burada planla',
      body: 'Görevlerini Envanterine ekle. Bu, yapman gereken her şeyin biriktiği listedir. Sonra bugün gerçekten üzerinde çalışacaklarını seç ve her birinin kaç Pomodoro (25 dakikalık seans) süreceğini tahmin et.',
    },
    planningFirstTodayTask: {
      title: 'Tahmin neden önemli',
      body: "Bir görev Bugün listesine girdiğinde, onu bitirdiğinde tahminin ne kadar isabetli olduğunu görebileceksin. Bu uygulama tahmin ettiğinle gerçekte olanı karşılaştırır ve bu karşılaştırma, Raporlar'ın zamanla daha iyi planlamana yardımcı olmak için kullandığı şeydir.",
    },
    reportsIntro: {
      title: 'Bunlar bir skor tablosu değil, senin sayıların',
      body: 'Birkaç Pomodoro tamamladıktan sonra, bu sekme geçmişini örüntülere dönüştürür: tahminlerin ne kadar isabetliydi, seni gerçekte ne kesintiye uğrattı, odak sürenin gerçekte nereye gitti.',
    },
    reportsFirstData: {
      title: 'Bu grafikleri okumak',
      body: '"Fazla tahmin edilen"/"Az tahmin edilen", tahminini (değiştirdiysen en son tahminini) gerçekte olanla karşılaştırır. Kesinti eğilimleri dikkatini neyin dağıttığını gösterir. İkisi birlikte, geçmişi kaydetmekten çok yarınki planlamanı keskinleştirmek içindir.',
    },
    settingsIntro: {
      title: 'Tekniğin varsayılan ritmi',
      body: "Pomodoro Tekniği'nin klasik ritmi 25 dakika çalışma, kısa bir mola, sonra her 4. Pomodoro'da bir daha uzun moladır. Aşağıdaki süreler bu ritmi doğrudan kontrol eder. Değiştirmek sana kalmış, ama orijinal yöntemden bilinçli bir sapmadır.",
    },
    settingsDataIntro: {
      title: 'Kategoriler örüntüleri görmeni sağlar',
      body: 'Görevleri bir kategoriyle (Iş veya Ders gibi) etiketlemek, Raporlar\'ın odak sürenin gerçekte nereye gittiğini göstermesini sağlar. Bu, özellikle sadece bugünü değil, haftaları karşılaştırırken işe yarar.',
    },
    motivationIntro: {
      title: 'Küçük bir an, senin zamanında',
      body: 'İstediğin an, boşta, Pomodoro sırasında ya da molada, kart simgesine dokunarak kısa bir söz, şaka, bilgi ya da kendi istatistiklerine bir bakış çekebilirsin. Her Pomodoro\'da bir çekiliş hakkın var; bir sonrakinde sıfırlanır. Tamamen isteğe bağlıdır ve çalışan zamanlayıcına asla dokunmaz.',
    },
  },

  // İsteğe bağlı "derinlemesine öğrenme" yolu — bkz. MethodologyGuideModal.jsx.
  // Bir ipucundan daha uzun ve açıklayıcı olabilir, ama her konu yine de
  // Cirillo'nun kitabını hiç okumamış biri için tek başına anlaşılır olmalı
  // — docs/methodology.md gibi, bu uygulamanın kendi kelimeleriyle yazılmıştır.
  methodologyGuide: {
    title: 'Pomodoro Tekniği nasıl çalışır',
    closeAria: 'metodoloji rehberini kapat',
    whatIsIt: {
      title: 'Pomodoro nedir?',
      body: 'Pomodoro Tekniği, Francesco Cirillo tarafından 1980\'lerin sonunda geliştirilen bir zaman yönetimi yöntemidir. Adını, Cirillo\'nun çalışmalarını ilk kronometrelemek için kullandığı domates şeklindeki mutfak zamanlayıcısından alır. ("Pomodoro" İtalyanca domates demektir.)\n\nTemel fikir basittir. Olabildiğince uzun çalışıp odaklanmayı ummak yerine, Pomodoro adı verilen sabit ve kesintisiz bloklar halinde çalışırsın.\n\n## Temel ritim\n\n- Her Pomodoro, tek bir görev üzerinde 25 dakikalık odaklanmış çalışmadır.\n- Ardından birkaç dakikalık kısa bir mola gelir.\n- Her 4. Pomodoro\'dan sonra, döngü yeniden başlamadan önce genellikle 15 ila 30 dakikalık daha uzun bir mola verirsin.\n\nHer blok kısa ve net sınırlı olduğu için, görevin tamamı bunaltıcı görünse bile bir Pomodoro ulaşılabilir hisseder. Mola önceden yerleşik olduğu için de, tükenmemek için yalnızca irade gücüne güvenmezsin.',
    },
    rules: {
      title: 'İki temel kural',
      body: 'Bir Pomodoro bölünemez. Parçalara ayrılamaz veya kısmen sayılamaz. Ya 25 dakikanın tamamını tamamlarsın, ya da tamamlamazsın.\n\nSeni gerçekten durmaya zorlayan bir şey olursa, bir acil durum veya kaçınılmaz bir toplantı gibi, Pomodoro iptal edilir. Hiç başlamamış gibi tamamen silinir: kredi yok, kısmi kayıt yok, sadece dürüst bir sıfırlama.\n\nBir Pomodoro başladıktan sonra tam süresince çalması beklenir. Görevini erken bitirirsen, saati durdurmazsın. Bunun yerine kalan süreyi yaptığını gözden geçirmek veya iyileştirmek için kullanırsın. Disiplin, süreyi doldurmakta acele etmekte değil, bu kapta yatar.\n\n## Duraklat: bu uygulamanın kendi istisnası\n\nBu uygulama, bu kurallara bilinçli ve şeffaf bir istisna ekler. Duraklat, Cirillo\'nun orijinal tekniğinin bir parçası değildir; gerçek hayattaki kısa kesintiler için (kapı çalması, iki dakikalık bir dikkat dağınıklığı gibi) burada eklenen dürüst bir özelliktir. Bunlar tam bir İptal Et\'i hak etmez.\n\n- Duraklat, seansını tam olduğu yerde tutar, hiçbir şey kaybolmaz.\n- Tekrar Başlat\'a basmak kaldığın yerden devam ettirir.\n- Açıkça takip edilir, Raporlar\'da ne sıklıkla duraklattığını görebilirsin, böylece gizli bir kısayol değil görünür bir alışkanlık olarak kalır.',
    },
    sizing: {
      title: 'Görevlerini boyutlandırmak',
      body: 'Çalışmaya başlamadan önce, bir görevin kaç Pomodoro süreceğini tahmin edersin. İki basit kural bu tahmini gerçekçi tutmana yardımcı olur.\n\n## Bir görev çok büyükse\n\nBir görev yaklaşık 5 ila 7 Pomodoro\'dan fazla sürecek gibi görünüyorsa, Envanterinde daha küçük alt görevlere böl. Büyük ve belirsiz görevleri doğru tahmin etmek zordur ve seni motive tutan düzenli ilerleme hissini vermez.\n\n## Bir görev çok küçükse\n\nBir görev tam bir Pomodoro\'dan daha az sürecekse, onun için tüm bir 25 dakikalık blok çalıştırma. Birlikte bir Pomodoro\'yu dolduracak şekilde diğer küçük görevlerle birleştir. Bu uygulamanın Envanterinde tam olarak bunun için bir "birleştir" özelliği var: iki veya daha fazla küçük görevi seç, tahminleri toplanarak tek bir görevde birleşsinler.',
    },
    interruptions: {
      title: 'Kesintilerle başa çıkmak',
      body: 'Teknik, kesintileri sadece kötü hissedilecek bir şey olarak değil, yönetilmesi gereken bir şey olarak ele alır. Onları iki türe ayırır.\n\n- İçsel kesintiler senden gelir: başka bir şeyi kontrol etme isteği, mevcut görevinle ilgisiz bir düşünce.\n- Dışsal kesintiler başka biri veya bir şeyden gelir: bir meslektaş, bir telefon çağrısı, bir bildirim.\n\nHer iki tür için de tepki aynıdır. Kesintiye hemen tepki verme, ama görmezden gelmeye çalışma da.\n\n## Aslında ne yapmalısın\n\n- İşaretle. Bu uygulamada tam olarak bunun için içsel/dışsal bir sayaç var.\n- Dikkatini dağıtan şeyi kaybetmemek için hızlıca bir yere not et.\n- Mevcut Pomodoro\'na geri dön.\n\nKolayca geçiştiremeyeceğin dışsal bir kesinti için klasik yaklaşım biraz daha kapsamlıdır: kişiye meşgul olduğunu bildir, geri dönmek için belirli bir zaman üzerinde anlaş, söz verdiğin o zamanı aklından çıkması için hemen not et, sonra Pomodoro\'n bittiğinde sözünü gerçekten tut.\n\nAmaç asla kesintiye uğramamak değil. Ne sıklıkla olduğunu fark etmek ve içinde bulunduğun Pomodoro\'yu raydan çıkarmasına izin vermemektir.',
    },
    estimation: {
      title: 'Tahmin ve Gerçek',
      body: 'Her görev, başlamadan önce bir tahmin alır: kaç Pomodoro süreceğini düşündüğün. Bir görev uzarsa, orijinal tahminin bayatlamasına izin vermek yerine onu en fazla iki kez yeniden tahmin edebilirsin.\n\n"Gerçek" ise, o görev üzerinde her Pomodoro tamamladığında otomatik olarak sayılan, gerçekte kaç tane sürdüğüdür. Diff, gerçek ile en güncel tahmin arasındaki farktır: yeniden tahmin ettiysen en son tahminin, etmediysen orijinal tahminin.\n\n- Sıfır diff, tahmininin tam isabetli olduğu anlamına gelir.\n- Pozitif bir diff, görevin planlanandan uzun sürdüğü anlamına gelir (az tahmin).\n- Negatif bir diff, daha hızlı bittiği anlamına gelir (fazla tahmin).\n\nHiçbiri tek başına bir başarısızlık değildir. Zamanla diff\'i takip etmenin amacı, kendi örüntülerini fark ederek bir sonraki tahminini bir öncekinden biraz daha dürüst yapmaktır.\n\nDikkat edilmesi gereken ikinci, daha ince bir hata türü var: bilinen bir görevi yanlış tahmin etmek değil, bir görevi hiç öngörememek, gün ortasında ortaya çıkan planlanmamış bir şey. Bu uygulama bunları ayrı olarak "planlanmamış" görevler olarak takip eder, çünkü bunlar zaman tahmininden çok planlamandaki bir boşluğa işaret eder.',
    },
    reports: {
      title: 'Raporlarını okumak',
      body: 'Cirillo, bir çalışma gününde beş aşama tanımlar: Planlama, Takip, Kayıt, İşleme ve Görselleştirme. Bu uygulama ilk üçünü çalışırken otomatik olarak yönetir. Raporlar, son ikisinin gerçekleştiği yerdir: İşleme (ham kayıtları sonuçlara dönüştürmek) ve Görselleştirme (bu sonuçları net bir şekilde görmek).\n\n## Her bölüm ne sorar\n\n- Tahmin Doğruluğu: tahminlerin gerçeğe ne kadar yakın ve bu fark zamanla küçülüyor mu?\n- Kesinti Eğilimleri: odaklanmanı gerçekte ne bozuyor ve ne sıklıkla?\n- Duraklatma Eğilimleri: bu uygulamanın Duraklat özelliğini ne sıklıkla kullanıyorsun? Sık duraklatmak tek başına fark edilmeye değer olabilir.\n- Kategori dağılımı: görevleri kategorilerle etiketledikten sonra Pomodoro\'ların gerçekte nereye gidiyor?\n\nBu sayıların hiçbiri maksimize edilmek için değildir. Tahminlerin sürekli çok yanlışsa yüksek bir Pomodoro sayısı otomatik olarak iyi değildir. Amaç, daha büyük bir sayı değil, zamanla daha dürüst ve öngörülebilir hale gelen bir süreçtir.',
    },
  },

  settings: {
    title: 'Ayarlar',
    closeAria: 'ayarlar penceresini kapat',
    categoryGeneral: 'Genel',
    categoryTimer: 'Zamanlayıcı',
    categorySound: 'Ses',
    categoryAccount: 'Hesap',
    categoryData: 'Veri',
    categoryAchievements: 'Başarılar',
    categoryAbout: 'Hakkında',
    signInPromptLabel: 'Verilerinizi cihazlar arasında senkronize edin',
    aboutDescription:
      'Pomodoro Tekniği\'nin sadık bir uygulaması: planlama, takip, kesinti yönetimi, tahmin ve kayıt, hepsi tek bir yerde. Sadece bir zamanlayıcı değil.',
    aboutContactLabel: 'İletişim',
    aboutSourceLabel: 'Kaynak kod',
    aboutAttribution:
      'Francesco Cirillo tarafından oluşturulan Pomodoro Technique®\'i uygular. "Pomodoro Technique" ve zaman yönetimi yöntemi olarak "Pomodoro", Francesco Cirillo ile ilişkilendirilir; bu uygulama, aktif marka tescili hususlarına saygı göstererek kendi adında "Pomodoro" kullanmaktan kaçınır.',
    replayCoachMarks: 'Yönlendirme ipuçlarını tekrar göster',
    howItWorksButton: 'Pomodoro Tekniği nasıl çalışır',
    signedInAs: '{{email}} olarak giriş yapıldı',
    notSignedIn: 'Giriş yapılmadı',
    signOutButton: 'Çıkış yap',
    signOutConfirm: 'Çıkış yapmak istediğinden emin misin?',
    changePasswordLabel: 'Şifre',
    changePasswordButton: 'Şifreyi Değiştir',
    changePasswordTitle: 'Şifreyi Değiştir',
    newPasswordLabel: 'Yeni şifre',
    changePasswordSuccess: 'Şifren değiştirildi.',
    changePasswordCloseAria: 'şifre değiştirme penceresini kapat',
    longBreakEvery: 'Uzun mola sıklığı',
    pomodoroUnit: 'pomodoroda bir',
    resetTitle: 'Varsayılana sıfırla ({{value}})',
    resetButton: 'Sıfırla',
    soundLabel: 'Ses',
    testButton: 'Dene',
    themeLabel: 'Tema',
    themeDark: 'Koyu',
    themeLightTerracotta: 'Açık Terrakota',
    themeLightSage: 'Açık Adaçayı',
    themeLightSand: 'Açık Kum',
    themeLightDustyBlue: 'Açık Toz Mavisi',
    themeCustom: 'Özel',
    customThemeGeneralLabel: 'Genel',
    customThemeFocusLabel: 'Odaklan / Çalışma oturumu',
    customThemeShortBreakLabel: 'Kısa Mola',
    customThemeLongBreakLabel: 'Uzun Mola',
    customThemeHint: "Genel, Timer dışındaki tüm ekranlara uygulanır; Timer ise o an aktif olan oturumu takip eder.",
    backgroundLabel: 'Tam ekran arka plan görseli',
    backgroundHint: 'Yalnızca Tam Ekran Odak Modunda görünür. Zamanlayıcı, Planlama, Raporlar veya Ayarlar ekranlarında gösterilmez.',
    backgroundSignInHint: 'Bu özelliği kullanmak için giriş yapmalısınız',
    backgroundUploadButton: 'Görsel yükle',
    backgroundUploading: 'Yükleniyor…',
    backgroundRemoveButton: 'Kaldır',
    backgroundErrorType: 'Lütfen JPG, PNG veya WEBP formatında bir görsel seç.',
    backgroundErrorSize: 'Görsel en fazla {{max}}MB olmalı.',
    backgroundErrorUpload: 'Görsel yüklenirken bir sorun oluştu. Lütfen tekrar dene.',
    backgroundPresetGalleryHint: 'Yükleme gerektirmeyen, hazır arka plan seçeneklerinden oluşan bir galeri gelecek bir güncellemede planlanıyor.',
    workDurationLabel: 'Pomodoro (çalışma) süresi',
    workDurationDeviationNote:
      'Pomodoro Tekniği, standart çalışma aralığı olarak özellikle 25 dakika kullanır. Bu, orijinal tekniğe kasıtlı bir sapmadır.',
    shortBreakLabel: 'Kısa mola süresi',
    longBreakLabel: 'Uzun mola süresi',
    minutesUnit: 'dk',
    minutesRangeHint: 'Aralık: {{min}}-{{max}} dk',
    shortBreakRecommendedHint: 'Önerilen aralık 3-5 dakikadır',
    longBreakRecommendedHint: 'Önerilen aralık 15-30 dakikadır',
    autoStartBreaksLabel: 'Molaları otomatik başlat',
    autoStartBreaksHint: 'Bir Pomodoro bittiğinde, Başlat\'ı beklemeden molayı otomatik olarak başlat.',
    autoStartPomodorosLabel: "Pomodoro'ları otomatik başlat",
    autoStartPomodorosHint: "Bir mola bittiğinde, Başlat'ı beklemeden bir sonraki Pomodoro'yu otomatik olarak başlat.",
    effectsVolumeLabel: 'Ses efektleri düzeyi',
    ambientVolumeLabel: 'Ortam sesi düzeyi',
    testingButton: 'Deneniyor…',
    ambientSoundLabel: 'Ortam sesi',
    ambientSoundHint: 'Aktif bir Pomodoro sırasında hafifçe çalar; duraklatma, iptal veya tamamlanmada durur.',
    ambientNone: 'Yok',
    ambientTicking: 'Tik sesi',
    ambientRain: 'Yağmur',
    ambientCafe: 'Kafe',
    ambientWhiteNoise: 'Beyaz Gürültü',
    checkToBottomLabel: 'Tamamlananı alta taşı',
    checkToBottomHint: "Bir görev tamamlandı olarak işaretlendiğinde bugünün listesinin en altına taşınsın.",
    displayNameLabel: 'Adınız',
    displayNameHint: "Header'daki kişiselleştirilmiş selamda gösterilir.",
    displayNamePlaceholder: 'ör. Sanem',
    dailyGoalLabel: 'Günlük Pomodoro hedefi',
    dailyGoalHint: 'Günde hedeflediğin Pomodoro sayısı. İsteğe bağlı, belirlendiğinde Raporlar\'da gösterilir.',
    languageLabel: 'Dil',
    languageEnglish: 'English',
    languageTurkish: 'Türkçe',
    dangerZoneTitle: 'Tehlikeli Bölge',
    dangerZoneWarning: 'Bu işlemler veriyi kalıcı olarak siler ve geri alınamaz.',
    deleteButton: 'Sil',
    resetFactoryButton: 'Fabrika Ayarlarına Sıfırla',
    resetFactoryHint: 'Bu ayarlar dahil her şeyi siler ve uygulamayı varsayılan durumuna döndürür.',
    deleteAccountButton: 'Hesabı Sil',
    deleteAccountConfirm:
      'Bu işlem hesabını ve ona ait tüm verileri sunucularımızdan KALICI OLARAK SİLECEK. Bu geri alınamaz. Emin misin?',
    deleteAccountHint: 'Hesabını ve tüm verilerini kalıcı olarak siler. Çıkış yapılıp misafir moduna dönülecek.',
    deleteAccountError: 'Hesabın silinemedi. Lütfen biraz sonra tekrar dene.',
    resetRecordsLabel: 'Kayıtlar / Etkinlik Günlüğü',
    resetRecordsConfirm: 'Bu, tüm Kayıtlarını kalıcı olarak silecek. Bu geri alınamaz. Devam edilsin mi?',
    resetTicksLabel: 'Kesinti verisi (tick\'ler)',
    resetTicksConfirm:
      "Bu, tüm kesinti ve Pomodoro tick geçmişini (Raporlar tarafından kullanılır) kalıcı olarak silecek. Bu geri alınamaz. Devam edilsin mi?",
    resetTodayLabel: 'Bugünün Görevleri',
    resetTodayConfirm:
      "Bu, Bugünün Görevlerini ve bugünün Zaman Çizelgesini kalıcı olarak silecek. Bu geri alınamaz. Devam edilsin mi?",
    resetInventoryLabel: 'Görev Envanteri',
    resetInventoryConfirm: 'Bu, Görev Envanterini kalıcı olarak silecek. Bu geri alınamaz. Devam edilsin mi?',
    resetTimerLabel: 'Zamanlayıcı durumu',
    resetTimerConfirm:
      'Bu, kayıtlı zamanlayıcı durumunu sıfırlayacak (bir yenilemeden sonra Pomodoro takılı kalırsa faydalıdır). Bu geri alınamaz. Devam edilsin mi?',
    resetCategoriesLabel: 'Kategoriler',
    resetCategoriesConfirm:
      'Bu, tüm Kategorilerini kalıcı olarak silecek. Bunları kullanan görev ve kayıtlar kategorisiz görünecek. Bu geri alınamaz. Devam edilsin mi?',
    resetVoidLogLabel: 'İptal günlüğü',
    resetVoidLogConfirm:
      'Bu, İptal günlüğünü (iptal edilen Pomodorolar ve nedenleri) kalıcı olarak silecek. Bu geri alınamaz. Devam edilsin mi?',
    resetCardDrawsLabel: 'Kart koleksiyonu',
    resetCardDrawsConfirm:
      'Bu, Motivasyon Kartı çekiliş geçmişini (Başarılar istatistikleri) kalıcı olarak silecek. Bu geri alınamaz. Devam edilsin mi?',
    resetAchievementsLabel: 'Başarılar',
    resetAchievementsConfirm:
      'Bu, açtığın Başarıları kalıcı olarak silecek. Hâlâ hak kazandığın herhangi biri bir sonraki değerlendirmede tekrar açılacak. Bu geri alınamaz. Devam edilsin mi?',
    factoryResetConfirm:
      "Bu, HER ŞEYİ kalıcı olarak silecek: Görev Envanteri, Bugünün Görevleri, Kayıtlar, kesinti geçmişi, Kategoriler, İptal günlüğü, Kart koleksiyonun, açtığın Başarılar VE ayarların (döngü uzunluğu, ses, tema). Uygulama ilk açılış durumuna dönecek. Bu geri alınamaz. Devam edilsin mi?",
  },

  dataImport: {
    title: 'Veri İçe/Dışa Aktarma',
    jsonExportLabel: 'JSON Dışa Aktarma',
    jsonExportDesc: 'Her şeyi indirir: görevler, kategoriler, kayıtlar, ayarlar. Tam yedek.',
    csvExportLabel: 'CSV Dışa Aktarma',
    csvExportDesc: 'Sadece tamamlanmış görev kayıtlarını, bir e-tablo olarak indirir.',
    jsonImportLabel: 'JSON İçe Aktarma',
    jsonImportDesc: 'Tam bir yedeği geri yükler. Görevler dahil her şeyi geri getirir.',
    csvImportLabel: 'CSV İçe Aktarma',
    csvImportDesc: 'Sadece kayıtları içe aktarır. Görevleri veya kategorileri geri getirmez.',
    exportButton: 'Dışa Aktar',
    chooseFileButton: 'Dosya seç',
    invalidJsonError: 'Bu dosya geçerli bir yedek gibi görünmüyor. Hiçbir değişiklik yapılmadı.',
    invalidCsvError: 'Bu dosya geçerli bir Kayıtlar CSV dosyası gibi görünmüyor. Hiçbir değişiklik yapılmadı.',
    choosePrompt: 'Bu nasıl içe aktarılsın?',
    replaceButton: 'Tüm veriyi değiştir',
    mergeButton: 'Mevcut veriyle birleştir',
    jsonReplaceConfirm:
      "Bu, tüm verini (Görev Envanteri, Bugünün Görevleri, Kayıtlar, kesinti geçmişi, Kategoriler, İptal günlüğü VE ayarların) bu dosyanın içeriğiyle kalıcı olarak DEĞİŞTİRECEK. Bu geri alınamaz. Devam edilsin mi?",
    jsonMergeConfirm:
      'Bu, içe aktarılan dosyayı mevcut verinle birleştirecek: eşleşen kayıtlar daha yeniyse korunur, sadece dosyada olanlar eklenir. Mevcut ayarların değişmez. Devam edilsin mi?',
    csvReplaceConfirm:
      'Bu, Kayıtlar / Etkinlik Günlüğünü bu CSV dosyasının içeriğiyle kalıcı olarak DEĞİŞTİRECEK. Bu geri alınamaz. Devam edilsin mi?',
    csvMergeConfirm:
      'Bu, CSV\'de olup henüz mevcut olmayan kayıtları ekleyecek (tarih, saat ve etkinlik adına göre eşleştirilir). Mevcut kayıtlar değişmez. Devam edilsin mi?',
  },

  auth: {
    signInTitle: 'Giriş yap',
    signUpTitle: 'Hesap oluştur',
    closeAria: 'giriş penceresini kapat',
    googleButton: "Google ile devam et",
    orDivider: 'veya',
    emailLabel: 'E-posta',
    emailPlaceholder: 'sen@ornek.com',
    passwordLabel: 'Şifre',
    confirmPasswordLabel: 'Şifreyi onayla',
    passwordMismatch: 'Şifreler eşleşmiyor.',
    showPasswordAria: 'şifreyi göster',
    hidePasswordAria: 'şifreyi gizle',
    signInButton: 'Giriş yap',
    signUpButton: 'Kayıt ol',
    switchToSignUp: 'Hesabın yok mu? Kayıt ol',
    switchToSignIn: 'Zaten hesabın var mı? Giriş yap',
    continueWithoutAccount: 'Hesap olmadan devam et',
    signUpSuccessMessage: 'Hesabını onaylamak için e-postana bak.',
  },

  // Misafirler için tek seferlik bir büyüme ipucu (bkz. GuestSignupNudge.jsx)
  // — bir misafirin ilk kez bir Pomodoro başlattığı anda bir kez gösterilir.
  // Bilinçli olarak coachMarks isim alanının dışında: bu bir ürün ipucudur,
  // metodoloji ipucu değildir, ve giriş yapıldığında asla gösterilmez.
  guestNudge: {
    title: 'Hesapla daha fazlasını al',
    body: '- Görevlerini ve geçmişini her cihazda senkronize et\n- Sınırsız kategori oluştur\n- Özel tam ekran arka planları',
    dismissAria: 'hesap ipucunu kapat',
  },

  // Sadece giriş hatası — bkz. App.jsx. Artık giriş yaparken yerel misafir
  // verisi hiç birleştirilmiyor/taşınmıyor, bu yüzden ayrı bir "senkronize
  // edildi" başarı bildirimine veya birleştirme onay istemine gerek yok;
  // sadece "hesabın yüklenemedi, bu yüzden misafir moduna döndük" kaldı.
  account: {
    loadErrorNotice: 'Hesabın yüklenemedi. Şimdilik misafir modunda çalışılıyor.',
    dismissAria: 'bildirimi kapat',
  },

  // İlk hesap kurulum sihirbazı (AccountSetupFlow.jsx) — yeni bir hesabın ilk
  // girişinden hemen sonra bir kez gösterilir. Yönlendirme ipucu sisteminden
  // ayrı bir mekanizma: bu hesap/uygulama hakkındadır (dil, isim, tema,
  // günlük hedef), Pomodoro Tekniği'nin metodolojisi hakkında değil.
  accountSetup: {
    stepIndicator: 'Adım {{current}} / {{total}}',
    backButton: 'Geri',
    continueButton: 'Devam et',
    finishButton: 'Bitir',
    skipStepButton: 'Bu adımı atla',
    skipButton: 'Kurulumu tamamen atla',
    welcome: {
      title: 'Hesabın hazır',
      body: 'Hızlıca birkaç tercih ayarlayalım. Her adım isteğe bağlıdır ve bunların hepsini daha sonra Ayarlar\'dan değiştirebilirsin.',
      dataNote:
        'Misafir olarak gezinirken oluşan yerel veriler bu hesaba otomatik olarak taşınmaz. Aktarmak istersen, istediğin zaman Ayarlar > Veri bölümündeki Dışa/İçe Aktar özelliğini kullanabilirsin.',
    },
    // Sadece 'guestIntro' modu — henüz hiçbir hesap yokken ilk kez gelen bir
    // misafire gösterilir, o yüzden metin "hesabın" diye başlayamaz.
    welcomeGuest: {
      title: 'Nereden başlayalım?',
      body: 'Hızlıca birkaç tercih ayarlayalım. Her adım isteğe bağlıdır ve bunların hepsini daha sonra Ayarlar\'dan değiştirebilirsin.',
    },
    language: {
      title: 'Dilini seç',
    },
    name: {
      title: 'Sana ne diyelim?',
    },
    theme: {
      title: 'Bir görünüm seç',
    },
    goal: {
      title: 'Günlük Pomodoro hedefi belirle',
      body: 'Günde kaç Pomodoro hedefliyorsun? Bu tamamen isteğe bağlıdır ve sadece kendi referansın içindir.',
      placeholder: 'ör. 8',
    },
    // 'guestIntro' modunun kapanış adımı — hesap açma daveti ve iki sonuç
    // (bkz. App.jsx'in onRequestSignUp/onContinueAsGuest'i).
    signup: {
      title: 'Daha fazlası için ücretsiz hesap aç',
      body: 'Görevlerin için özel kategoriler, motivasyon kartları, başarılar ve seriler — hepsi bir hesapla ücretsiz. Burada seçtiğin her şey de seninle gelir.',
      createAccountButton: 'Ücretsiz hesap aç',
      continueLocallyButton: "Yerel depolamayla devam et",
    },
  },
}
