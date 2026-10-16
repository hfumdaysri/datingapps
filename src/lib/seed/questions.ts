export type Depth = "fun" | "sweet" | "romantic" | "deep" | "vulnerable";
export type GameType = "truth_or_truth" | "deep_talk" | "would_you_rather" | "most_likely" | "know_me";

export type SeedQuestion = {
  seedKey: string;
  gameType: GameType;
  category: string;
  depth: Depth;
  prompt: string;
  optionA?: string;
  optionB?: string;
  followUp?: string;
};

function list(gameType: GameType, category: string, depth: Depth, prefix: string, prompts: string[], followUp?: string): SeedQuestion[] {
  return prompts.map((prompt, i) => ({ seedKey: `${prefix}-${i + 1}`, gameType, category, depth, prompt, followUp }));
}

const TRUTH_FOLLOW = "Apa yang membuatmu merasa begitu?";

const truthFun = list("truth_or_truth", "Fun", "fun", "tt-fun", [
  "Kebiasaan anehmu yang belum pernah kamu ceritakan ke aku apa?",
  "Lagu apa yang diam-diam kamu nyanyikan kencang kalau sendirian?",
  "Apa hal paling memalukan yang pernah terjadi saat kamu sedang naik kendaraan umum?",
  "Kalau kamu harus makan satu jenis makanan seumur hidup, apa pilihanmu?",
  "Apa tontonan yang kamu suka tapi malu mengakuinya?",
  "Pernah nggak kamu pura-pura paham obrolan padahal sama sekali nggak ngerti? Soal apa?",
  "Apa julukan paling konyol yang pernah orang berikan padamu?",
  "Apa barang paling nggak berguna yang pernah kamu beli karena impulsif?",
  "Kalau besok kamu bangun dengan satu kekuatan super acak, kamu berharap apa?",
  "Apa kebohongan kecil yang paling sering kamu ucapkan tanpa sadar?",
  "Apa hal paling lucu yang pernah kamu lakukan waktu kecil?",
  "Aplikasi apa yang paling sering kamu buka tapi nggak mau ketahuan waktu layar teleponmu dilihat orang?",
  "Kalau kita ketukar hidup seminggu, apa yang paling kamu nantikan dari hidupku?",
  "Apa kata atau kalimat yang paling sering kamu ucapkan menurutmu?",
  "Apa rahasia kecil soal kebiasaan tidurmu yang bikin orang geleng-geleng kepala?",
]);

const truthSweet = list("truth_or_truth", "Sweet", "sweet", "tt-sweet", [
  "Apa hal kecil yang aku lakukan yang paling bikin kamu tersenyum?",
  "Kapan terakhir kali kamu merasa bangga padaku?",
  "Apa kenangan bersamaku yang paling sering kamu ingat?",
  "Apa kebiasaanku yang diam-diam kamu sukai?",
  "Hal apa dari hari ini yang membuatmu bersyukur?",
  "Apa kesan pertamamu waktu pertama kali kita ngobrol?",
  "Apa momen yang membuatmu sadar kamu nyaman denganku?",
  "Apa satu kata yang menggambarkan perasaanmu tentang kita sekarang?",
  "Apa hal sederhana yang kalau kita lakukan bareng bikin harimu lebih baik?",
  "Apa pesan singkat dariku yang paling kamu ingat?",
  "Apa hal yang ingin kamu ucapkan terima kasih padaku tapi belum sempat?",
  "Apa yang paling kamu rindukan dariku saat kita berjauhan?",
  "Apa yang kamu harap lebih sering kita lakukan di panggilan video?",
  "Siapa yang menurutmu lebih dulu merasa suka, kamu atau aku? Kenapa?",
  "Apa hal paling manis yang pernah orang lain lakukan untukmu, dan kamu ingin aku coba juga?",
]);

const truthRomantic = list("truth_or_truth", "Romantic", "romantic", "tt-rom", [
  "Kencan seperti apa yang paling kamu impikan bersamaku?",
  "Apa bahasa cinta yang paling terasa buatmu: kata-kata, waktu bersama, sentuhan, hadiah, atau tindakan?",
  "Apa momen paling romantis yang pernah kita lewati?",
  "Kalau kita bertemu besok, apa yang ingin kamu lakukan pertama kali?",
  "Apa lagu yang membuatmu langsung teringat padaku?",
  "Tempat mana di dunia yang ingin kamu datangi bersamaku?",
  "Apa yang membuatmu merasa paling dicintai olehku?",
  "Apa yang ingin kamu lakukan di hari jadi kita tahun depan?",
  "Kalau kita punya satu malam tanpa batas jarak, kamu ingin menghabiskannya bagaimana?",
  "Apa kenangan pertama kita yang rasanya paling hangat?",
  "Apa hal kecil yang bisa aku lakukan supaya kamu merasa lebih dekat denganku walau berjauhan?",
  "Apa yang kamu suka dari caraku mengungkapkan sayang?",
  "Surat cinta seperti apa yang ingin kamu terima dariku?",
  "Apa yang ingin kamu katakan padaku kalau tidak ada rasa canggung sama sekali?",
  "Kapan kamu paling merasa kita sangat terhubung?",
]);

const truthDeep = list("truth_or_truth", "Deep", "deep", "tt-deep", [
  "Apa ketakutan yang masih sering mengganggumu belakangan ini?",
  "Hal apa yang ingin kamu ubah dari dirimu sendiri?",
  "Apa keputusan terbesar dalam hidupmu sejauh ini, dan apakah kamu masih yakin dengannya?",
  "Kapan terakhir kali kamu merasa kesepian, walau banyak orang di sekitarmu?",
  "Apa yang paling kamu butuhkan dariku saat kamu sedang tidak baik-baik saja?",
  "Apa pelajaran hidup yang paling mahal yang pernah kamu dapat?",
  "Apa yang membuatmu merasa paling dimengerti, dan paling tidak dimengerti?",
  "Apa mimpi lamamu yang sempat kamu kubur?",
  "Hal apa dari masa kecilmu yang masih membentuk caramu mencintai sekarang?",
  "Apa yang kamu harap lebih bisa kamu terima dari dirimu sendiri?",
  "Apa kekhawatiranmu tentang hubungan jarak jauh kita, kalau ada?",
  "Kapan kamu merasa paling jadi diri sendiri?",
  "Apa yang membuatmu sulit meminta bantuan?",
  "Apa yang kamu harap orang lain tahu tentangmu tanpa harus kamu jelaskan?",
  "Apa yang ingin kamu pelajari tentang cara kita berkomunikasi?",
]);

const deepLife = list("deep_talk", "Life", "deep", "dt-life", [
  "Apa yang membuat sebuah hari terasa 'berhasil' bagimu?",
  "Kalau kamu bisa menjalani satu hari biasa seumur hidup, hari seperti apa itu?",
  "Hal apa yang kamu lakukan hanya karena kamu menyukainya, bukan karena harus?",
  "Siapa orang yang paling memengaruhi caramu melihat hidup?",
  "Apa arti 'cukup' bagimu: cukup uang, cukup waktu, cukup tenang?",
  "Kebiasaan baik apa yang ingin kamu bangun tahun ini?",
  "Apa yang paling kamu syukuri dari hidupmu sekarang?",
  "Kalau kamu bisa memberi saran pada dirimu lima tahun lalu, apa yang kamu katakan?",
  "Apa pekerjaan atau aktivitas yang membuatmu lupa waktu?",
  "Apa yang membuatmu merasa hidup?",
  "Apa pilihan hidup yang kamu ambil dan tidak pernah kamu sesali?",
  "Bagaimana kamu mengisi ulang tenaga saat sedang lelah?",
]);

const deepRelationship = list("deep_talk", "Relationship", "deep", "dt-rel", [
  "Apa yang membuat sebuah hubungan terasa aman bagimu?",
  "Bagaimana kita sebaiknya menyelesaikan perbedaan pendapat supaya kita berdua merasa didengar?",
  "Apa kebiasaan kecil dalam hubungan kita yang ingin kamu pertahankan?",
  "Apa yang kamu pelajari tentang dirimu sejak bersamaku?",
  "Seberapa sering kamu butuh waktu sendiri, dan bagaimana aku bisa memahaminya?",
  "Apa tanda bahwa kamu sedang butuh perhatian lebih, yang mungkin tidak aku sadari?",
  "Apa arti kejujuran dalam hubungan menurutmu?",
  "Bagaimana kita bisa tetap dekat saat sedang sama-sama sibuk?",
  "Apa yang membuatmu merasa dihargai dalam hubungan?",
  "Apa harapanmu dari cara kita saling mendukung impian masing-masing?",
  "Bagaimana kamu ingin kita merayakan hal-hal kecil?",
  "Apa satu hal yang ingin kamu coba bersamaku yang belum pernah kita lakukan?",
]);

const deepMemories = list("deep_talk", "Memories", "deep", "dt-mem", [
  "Apa kenangan masa kecil yang paling hangat bagimu?",
  "Aroma, lagu, atau tempat apa yang langsung membawamu ke masa lalu?",
  "Ceritakan hari paling menyenangkan yang pernah kamu alami.",
  "Siapa guru atau orang dewasa yang paling membekas bagimu?",
  "Apa tradisi keluarga yang paling kamu rindukan?",
  "Apa momen pertama kali kita saling kenal yang masih kamu ingat jelas?",
  "Apa liburan atau perjalanan yang paling berkesan untukmu?",
  "Apa makanan yang selalu mengingatkanmu pada rumah?",
  "Apa kenangan bersamaku yang ingin kamu ulang kalau bisa?",
  "Ceritakan teman masa kecil yang masih kamu ingat dan kenapa.",
  "Apa momen yang dulu terasa biasa tapi sekarang terasa berharga?",
  "Apa hal yang kamu lakukan bersama keluarga yang ingin kamu lakukan juga dengan keluarga barumu kelak?",
]);

const deepFuture = list("deep_talk", "Future", "deep", "dt-fut", [
  "Seperti apa hidup yang kamu bayangkan lima tahun dari sekarang?",
  "Kota atau tempat seperti apa yang ingin kamu tinggali suatu hari nanti?",
  "Apa satu hal yang ingin kamu capai sebelum usia tertentu, dan kenapa itu penting?",
  "Bagaimana kamu membayangkan hari-hari biasa kita saat tidak lagi berjauhan?",
  "Apa yang ingin kamu pelajari dalam beberapa tahun ke depan?",
  "Kalau uang bukan masalah, bagaimana kamu akan menghabiskan satu tahun?",
  "Apa nilai yang ingin kamu pegang teguh seiring bertambahnya usia?",
  "Seperti apa rumah impianmu: suasananya, bukan hanya bentuknya?",
  "Apa kebiasaan yang ingin kita bangun bersama ke depannya?",
  "Apa yang membuatmu bersemangat menghadapi tahun depan?",
  "Bagaimana kamu ingin diingat oleh orang-orang yang kamu sayangi?",
  "Apa langkah kecil minggu ini yang bisa mendekatkan kita pada rencana bersama?",
]);

const deepUnderstanding = list("deep_talk", "Understanding", "deep", "dt-und", [
  "Apa yang biasanya kamu butuhkan ketika sedang stres: ditemani, dibiarkan sendiri, atau dihibur?",
  "Bagaimana caraku bisa tahu kamu sedang tidak nyaman kalau kamu diam?",
  "Apa hal yang sering disalahpahami orang tentang dirimu?",
  "Apa yang paling membuatmu merasa dilihat dan didengar?",
  "Kata-kata seperti apa yang menenangkanmu saat cemas?",
  "Apa pemicu kecil yang bikin moodmu cepat turun, supaya aku lebih peka?",
  "Bagaimana kamu mengekspresikan sayang yang mungkin tidak selalu kelihatan?",
  "Apa yang kamu harap aku tanyakan lebih sering padamu?",
  "Apa hal yang ingin kamu pahami lebih dalam tentang aku?",
  "Apa cara terbaik menyampaikan kritik padamu supaya terasa membangun?",
  "Apa hal yang membuatmu sulit terbuka, dan apa yang membuatnya lebih mudah?",
  "Apa yang bisa kita lakukan bersama saat salah satu dari kita sedang lelah?",
]);

const deepVulnerable = list("deep_talk", "Vulnerable", "vulnerable", "dt-vul", [
  "Apa luka lama yang masih kamu bawa dan ingin kamu ceritakan, kalau kamu siap?",
  "Apa hal yang membuatmu merasa tidak cukup baik, dan dari mana perasaan itu datang?",
  "Kapan kamu merasa paling rapuh, dan apa yang kamu butuhkan saat itu?",
  "Apa yang paling kamu takutkan kehilangan?",
  "Apa penyesalan terbesarmu, dan apa yang kamu pelajari darinya?",
  "Apa yang sulit kamu maafkan, pada dirimu sendiri atau orang lain?",
  "Apa yang kamu sembunyikan karena takut dinilai?",
  "Bagaimana masa lalumu memengaruhi caramu percaya pada orang lain?",
  "Apa yang kamu butuhkan dariku supaya merasa aman membuka diri?",
  "Apa hal yang ingin kamu ceritakan tapi belum menemukan waktu yang tepat?",
]);

const wyrPairs: Array<[string, string, string, string]> = [
  ["Fun", "Bisa terbang", "Bisa menghilang", "Kalau kamu bisa memilih, ke mana atau di mana kamu akan memakainya pertama kali?"],
  ["Fun", "Makan mie instan setiap hari", "Makan nasi goreng setiap hari", "Apa topping atau tambahan wajibmu?"],
  ["Fun", "Tinggal di pantai", "Tinggal di pegunungan", "Apa yang paling kamu nantikan dari sana?"],
  ["Fun", "Selalu terlambat 10 menit", "Selalu datang 30 menit lebih awal", "Siapa di antara kita yang lebih sering begini?"],
  ["Fun", "Bisa bicara dengan hewan", "Bisa bicara semua bahasa manusia", "Bahasa atau hewan apa yang ingin kamu ajak ngobrol pertama?"],
  ["Fun", "Liburan seminggu di hutan tanpa sinyal", "Liburan seminggu di kota besar penuh keramaian", "Apa yang pasti kamu bawa?"],
  ["Fun", "Punya asisten robot yang bersih-bersih", "Punya koki pribadi", "Menu pertama yang kamu minta apa?"],
  ["Fun", "Nonton film yang sama seumur hidup", "Mendengar satu album yang sama seumur hidup", "Film atau album apa yang kamu pilih?"],
  ["Fun", "Selalu kepanasan", "Selalu kedinginan", "Cara apa yang kamu pakai untuk bertahan?"],
  ["Fun", "Jadi terkenal di seluruh dunia", "Jadi orang paling bahagia di lingkunganmu", "Apa alasan pilihanmu?"],
  ["Fun", "Tidak boleh makan makanan pedas lagi", "Tidak boleh makan makanan manis lagi", "Makanan apa yang paling bakal kamu rindukan?"],
  ["Fun", "Punya kemampuan mengulang waktu 10 detik", "Punya kemampuan menghentikan waktu 10 detik", "Kapan kamu akan memakainya?"],
  ["Fun", "Tinggal di rumah pohon", "Tinggal di rumah kapal", "Rumah itu akan kamu isi dengan apa?"],
  ["Fun", "Jago menyanyi tapi tidak pernah bisa menari", "Jago menari tapi tidak pernah bisa menyanyi", "Tampil di mana kamu pertama kali?"],
  ["Fun", "Hanya bisa jalan kaki ke mana pun", "Hanya bisa naik transportasi umum ke mana pun", "Perjalanan favoritmu yang seperti itu apa?"],
  ["Fun", "Bisa mencicipi semua rasa makanan di dunia sekali", "Punya satu makanan favorit yang selalu terasa pertama kali", "Makanan apa yang ingin kamu coba?"],
  ["Fun", "Bangun pagi tiap hari dengan segar", "Tidur nyenyak kapan pun dibutuhkan", "Mana yang lebih berguna buatmu?"],
  ["Fun", "Punya satu hari ekstra tiap minggu", "Punya satu jam ekstra tiap hari", "Apa yang kamu lakukan dengan waktu itu?"],
  ["Fun", "Menginap di hotel mewah sendirian", "Berkemah dengan orang tersayang", "Apa yang membuatmu memilih itu?"],
  ["Fun", "Bisa membaca pikiran hewan peliharaan", "Bisa membaca pikiran bayi", "Menurutmu apa yang mereka pikirkan sekarang?"],
  ["Fun", "Hidup di zaman dulu tanpa teknologi", "Hidup di masa depan penuh teknologi", "Hal apa yang akan paling kamu rindukan?"],
  ["Fun", "Sarapan besar setiap hari", "Makan malam besar setiap hari", "Menu favoritmu apa?"],
  ["Fun", "Punya hewan peliharaan yang bisa bicara", "Punya tanaman yang bisa berjalan", "Kamu beri nama apa?"],
  ["Fun", "Boleh tidur kapan saja tapi hanya 4 jam sehari", "Tidur 10 jam tapi harus terjaga di jam tertentu", "Mana yang lebih cocok buat ritmemu?"],
  ["Fun", "Menang undian kecil tiap bulan", "Menang undian besar sekali seumur hidup", "Uangnya kamu pakai untuk apa?"],
  ["Sweet", "Dapat pesan suara panjang dari pasangan tiap pagi", "Dapat surat tulisan tangan sebulan sekali", "Kenapa pilihan itu lebih terasa bagimu?"],
  ["Sweet", "Video call tiap malam sebelum tidur", "Bertemu langsung sebulan sekali", "Apa kompromi terbaik buat kita?"],
  ["Sweet", "Dikirimi makanan favorit dari jauh", "Dikirimi playlist yang dibuat khusus", "Isinya ingin seperti apa?"],
  ["Sweet", "Kejutan kecil yang tidak terduga", "Rencana kencan yang disiapkan jauh hari", "Mana yang lebih membuatmu bahagia?"],
  ["Sweet", "Menonton film bareng lewat layar", "Bermain game bareng lewat layar", "Film atau game apa yang ingin kita coba?"],
  ["Sweet", "Diberi pelukan panjang tanpa bicara", "Diajak ngobrol panjang tanpa pelukan", "Kapan kamu paling butuh salah satunya?"],
  ["Sweet", "Pasangan yang selalu mengingat tanggal penting", "Pasangan yang selalu membuat hari biasa jadi istimewa", "Menurutmu kita lebih condong ke mana?"],
  ["Sweet", "Foto bersama yang dicetak dan dipajang", "Video kompilasi kenangan kita", "Momen apa yang pertama kali masuk?"],
  ["Sweet", "Belajar masak resep favoritnya", "Belajar lagu favoritnya di alat musik", "Apa yang pertama kali kamu coba?"],
  ["Sweet", "Piknik sederhana di taman", "Makan malam di restoran bagus", "Kamu ingin kencan pertama kita yang nyata seperti apa?"],
  ["Sweet", "Saling menulis tiga hal yang disyukuri tiap hari", "Saling berbagi satu foto tiap hari", "Mana yang ingin kita mulai?"],
  ["Sweet", "Nama panggilan khusus yang hanya kita berdua tahu", "Lagu khusus yang hanya kita berdua tahu", "Apa idenya?"],
  ["Romantic", "Menatap bintang bersama", "Berjalan di pantai saat senja", "Dengan musik apa?"],
  ["Romantic", "Dansa pelan di dapur", "Menonton hujan dari balkon bersama", "Apa yang kamu pakai?"],
  ["Romantic", "Surat cinta untuk dibaca di masa depan", "Rekaman suara untuk didengar di hari tertentu", "Apa yang ingin kamu sampaikan?"],
  ["Romantic", "Perjalanan spontan tanpa rencana berdua", "Perjalanan terencana yang matang berdua", "Tujuan kita ke mana?"],
  ["Romantic", "Menghabiskan satu malam penuh bercerita", "Menghabiskan satu pagi penuh diam yang nyaman", "Dari mana kamu merasa lebih dekat?"],
  ["Romantic", "Hadiah buatan tangan", "Hadiah dari tempat yang jauh", "Apa yang paling terasa istimewa?"],
  ["Romantic", "Pertemuan pertama kembali di stasiun", "Pertemuan pertama kembali di bandara", "Apa yang ingin kamu katakan saat itu?"],
  ["Romantic", "Berfoto di tempat yang sama tiap tahun", "Menanam sesuatu bersama dan merawatnya", "Dimulai dari mana?"],
  ["Romantic", "Menulis janji kecil untuk satu sama lain", "Membuat daftar impian bersama", "Apa isi pertamanya?"],
  ["Romantic", "Menghabiskan Tahun Baru berdua saja", "Menghabiskan Tahun Baru bersama teman-teman", "Apa harapanmu?"],
  ["Romantic", "Duduk berdampingan tanpa gawai", "Berbagi satu earphone sambil mendengar musik", "Lagu apa yang pertama?"],
  ["Romantic", "Memasak berdua di dapur kecil", "Piknik malam di atap rumah", "Menu atau suasananya apa?"],
  ["Romantic", "Menghadiri konser bersama", "Menonton pertunjukan teater bersama", "Pertunjukan apa yang ingin kamu tonton?"],
];

const wyr: SeedQuestion[] = wyrPairs.map(([category, a, b, follow], i) => ({
  seedKey: `wyr-${i + 1}`,
  gameType: "would_you_rather",
  category,
  depth: category === "Fun" ? "fun" : category === "Sweet" ? "sweet" : "romantic",
  prompt: "Pilih salah satu:",
  optionA: a,
  optionB: b,
  followUp: follow,
}));

const mostLikelyFun = [
  "Siapa yang lebih mungkin ketiduran saat nonton film?",
  "Siapa yang lebih mungkin lupa taruh barang di tempat yang aneh?",
  "Siapa yang lebih mungkin tertawa di waktu yang nggak tepat?",
  "Siapa yang lebih mungkin salah jalan walau sudah pakai peta?",
  "Siapa yang lebih mungkin bangun siang di hari libur?",
  "Siapa yang lebih mungkin menangis saat nonton film sedih?",
  "Siapa yang lebih mungkin memesan makanan dalam jumlah terlalu banyak?",
  "Siapa yang lebih mungkin jadi pemenang kalau main tebak-tebakan?",
  "Siapa yang lebih mungkin mengganti rencana di menit-menit terakhir?",
  "Siapa yang lebih mungkin menyanyi di kamar mandi dengan suara keras?",
  "Siapa yang lebih mungkin lupa nama orang yang baru dikenal?",
  "Siapa yang lebih mungkin mencoba resep baru tanpa membaca sampai habis?",
  "Siapa yang lebih mungkin punya terlalu banyak tab terbuka di browser?",
  "Siapa yang lebih mungkin tersesat di toko buku berjam-jam?",
  "Siapa yang lebih mungkin menang debat soal hal sepele?",
  "Siapa yang lebih mungkin menyimpan snack untuk dimakan nanti lalu lupa?",
  "Siapa yang lebih mungkin kena spoiler lalu tetap menonton?",
  "Siapa yang lebih mungkin mengirim stiker yang salah ke orang yang salah?",
  "Siapa yang lebih mungkin membawa payung padahal cerah?",
  "Siapa yang lebih mungkin membuat lelucon yang cuma dirinya sendiri yang paham?",
  "Siapa yang lebih mungkin menunda balas pesan karena lupa, bukan karena sengaja?",
  "Siapa yang lebih mungkin jadi koki dadakan saat lapar tengah malam?",
  "Siapa yang lebih mungkin mengajak jalan-jalan mendadak?",
  "Siapa yang lebih mungkin memotret makanan sebelum makan?",
  "Siapa yang lebih mungkin mengantre paling lama demi makanan viral?",
];

const mostLikelySweet = [
  "Siapa yang lebih mungkin membuat kejutan kecil tanpa alasan?",
  "Siapa yang lebih mungkin mengingat detail kecil dari obrolan lama?",
  "Siapa yang lebih mungkin menulis catatan manis diam-diam?",
  "Siapa yang lebih mungkin lebih dulu bilang 'aku kangen'?",
  "Siapa yang lebih mungkin menyimpan foto kita paling banyak?",
  "Siapa yang lebih mungkin menyiapkan hadiah jauh-jauh hari?",
  "Siapa yang lebih mungkin menangis terharu di momen penting kita?",
  "Siapa yang lebih mungkin mengajak lebih dulu berbaikan setelah salah paham kecil?",
  "Siapa yang lebih mungkin membuat playlist khusus untuk kita?",
  "Siapa yang lebih mungkin memeriksa kabar saat tahu yang lain sedang sibuk?",
  "Siapa yang lebih mungkin memeluk lebih lama saat bertemu nanti?",
  "Siapa yang lebih mungkin menghafal makanan favorit yang lain?",
  "Siapa yang lebih mungkin merencanakan kencan berikutnya lebih awal?",
  "Siapa yang lebih mungkin mengirim ucapan semangat sebelum hari besar yang lain?",
  "Siapa yang lebih mungkin bercerita ke teman tentang betapa bangganya pada yang lain?",
  "Siapa yang lebih mungkin tersenyum sendiri saat membaca pesan dari yang lain?",
  "Siapa yang lebih mungkin mengingat tanggal-tanggal kecil yang spesial?",
  "Siapa yang lebih mungkin rela menunggu lebih lama demi bisa ngobrol?",
  "Siapa yang lebih mungkin mencoba hobi baru demi menemani yang lain?",
  "Siapa yang lebih mungkin menyiapkan kejutan video call?",
  "Siapa yang lebih mungkin lebih dulu minta maaf kalau sadar salah?",
  "Siapa yang lebih mungkin menyimpan tiket atau kenangan kecil dari kencan kita?",
  "Siapa yang lebih mungkin mengirim doa atau ucapan semangat tiap pagi?",
  "Siapa yang lebih mungkin mengingat mimpi kecil yang pernah kita ceritakan?",
  "Siapa yang lebih mungkin mengajak mengambil foto berdua?",
];

const mlRows = [
  ...mostLikelyFun.map((p, i) => ({ p, category: "Fun", depth: "fun" as Depth, k: `ml-fun-${i + 1}` })),
  ...mostLikelySweet.map((p, i) => ({ p, category: "Sweet", depth: "sweet" as Depth, k: `ml-sweet-${i + 1}` })),
];
const mostLikely: SeedQuestion[] = mlRows.map(({ p, category, depth, k }) => ({
  seedKey: k,
  gameType: "most_likely",
  category,
  depth,
  prompt: p,
  followUp: "Ceritakan momen yang membuatmu memilih jawaban itu.",
}));

const withFollow = (qs: SeedQuestion[], follow: string) => qs.map((q) => ({ ...q, followUp: q.followUp ?? follow }));

export const SEED_QUESTIONS: SeedQuestion[] = [
  ...withFollow([...truthFun, ...truthSweet, ...truthRomantic, ...truthDeep], TRUTH_FOLLOW),
  ...withFollow(
    [...deepLife, ...deepRelationship, ...deepMemories, ...deepFuture, ...deepUnderstanding, ...deepVulnerable],
    "Boleh lanjut ke pertanyaan berikutnya kapan saja, atau lewati kalau belum ingin menjawab.",
  ),
  ...wyr,
  ...mostLikely,
];

export const GAME_CATEGORIES = {
  truth_or_truth: ["Fun", "Sweet", "Romantic", "Deep"],
  deep_talk: ["Life", "Relationship", "Memories", "Future", "Understanding"],
} as const;
