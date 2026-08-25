/* =========================================================
   TASTINGS-DATA.JS — Genusswerte Bonn
   Demo-Daten — wird später durch Supabase / Admin Panel ersetzt.
   Single source of truth für tastings.html (Cards + Modal).

   Hinweis:
   Die Tasting-Seite dient nur dem Kauf von Gutscheinen.
   Termin-/Einlöselogik gehört auf gutschein-einloesen.html.
   ========================================================= */

window.GW_TASTINGS = [
  {
    id: 'wein',
    tastingType: 'wein_tasting',
    title: 'Wein Tasting',
    category: 'Tasting-Format',
    description: 'Eine Reise durch fünf einzigartige Weine, fein abgestimmt auf ausgesuchte Käsespezialitäten. Auch als Naturwein, vegan oder alkoholfrei erhältlich.',
    image: 'assets/images/tasting-wein.jpg',
    pricePerPerson: 29.00,
    duration: 'ca. 2 Stunden',
    location: 'Genusswerte Bonn'
  },
  {
    id: 'afterwork',
    tastingType: 'afterwork_wein_tasting',
    title: 'Afterwork Wein Tasting',
    category: 'Tasting-Format',
    description: 'Vier ausgewählte Weine und feine Häppchen aus der Feinkost machen deinen Feierabend zum Genuss. Entspannt, stilvoll, unvergesslich.',
    image: 'assets/images/tasting-afterwork.jpg',
    pricePerPerson: 19.00,
    duration: 'ca. 1,5 Stunden',
    location: 'Genusswerte Bonn'
  },
  {
    id: 'gin',
    tastingType: 'gin_tasting',
    title: 'Gin Tasting',
    category: 'Tasting-Format',
    description: 'Vier besondere Gins, begleitet von passenden Tonic Waters. Kein Fachgesimpel — einfach gutes Trinken, spannende Aromen und ein toller Abend.',
    image: 'assets/images/tasting-gin.jpg',
    pricePerPerson: 45.00,
    duration: 'ca. 2 Stunden',
    location: 'Genusswerte Bonn'
  },
  {
    id: 'champagner',
    tastingType: 'champagner_popcorn_tasting',
    title: 'Champagner & Popcorn',
    category: 'Tasting-Format',
    description: 'Fünf Champagner und Schaumweine treffen auf kreative Popcorn-Sorten. Eine Kombination, die überrascht und garantiert ein Lächeln zaubert.',
    image: 'assets/images/tasting-champagner.jpg',
    pricePerPerson: 39.00,
    duration: 'ca. 2 Stunden',
    location: 'Genusswerte Bonn'
  },
  {
    id: 'trueffel',
    tastingType: 'trueffel_champagner_tasting',
    title: 'Trüffel & Champagner',
    category: 'Tasting-Format · Premium',
    description: 'Ein Aperitif zur Begrüßung, drei liebevoll komponierte Gänge — veredelt mit frischem Trüffel und abgestimmt auf edle Schaumweine. Kulinarische Eleganz pur.',
    image: 'assets/images/tasting-trueffel.png',
    pricePerPerson: 66.00,
    duration: 'ca. 3 Stunden',
    location: 'Genusswerte Bonn'
  },
  {
    id: 'whisky',
    tastingType: 'whisky_tasting',
    title: 'Whisky Tasting',
    category: 'Tasting-Format',
    description: 'Fünf ausgewählte Whiskys — ein stilvoller Abend für alle, die guten Geschmack feiern.',
    image: 'assets/images/tasting-whisky.png',
    pricePerPerson: 45.00,
    duration: 'ca. 2,5 Stunden',
    location: 'Genusswerte Bonn'
  },
  {
    id: 'craftbeer',
    tastingType: 'craft_beer_tasting',
    title: 'Craft Beer Tasting',
    category: 'Tasting-Format',
    description: 'Einzigartige, handgebraute Biere aus der Region und aller Welt — von hopfig-fruchtig bis malzig-dunkel. Finde dein Lieblingsbier in guter Gesellschaft.',
    image: 'assets/images/tasting-craftbeer.jpg',
    pricePerPerson: 25.00,
    duration: 'ca. 2 Stunden',
    location: 'Genusswerte Bonn'
  },
  {
    id: 'wagyu',
    tastingType: 'wagyu_wein_champagner_tasting',
    title: 'Wagyu, Wein & Champagner',
    category: 'Tasting-Format · Highlight',
    description: 'Das beste Fleisch der Welt trifft auf drei erstklassige Weine und einen erfrischenden Champagner — eine Geschmacksexplosion, die nachhaltig beeindruckt.',
    image: 'assets/images/tasting-wagyu.jpg',
    pricePerPerson: 55.00,
    duration: 'ca. 2,5 Stunden',
    location: 'Genusswerte Bonn'
  },
  {
    id: 'apero',
    tastingType: 'apero_antipasti_tasting',
    title: 'Apéro & Antipasti',
    category: 'Tasting-Format',
    description: 'Leckere Antipasti und perfekt abgestimmte Aperitif-Drinks — für jeden Geschmack etwas dabei. Auch in einer alkoholfreien Variante erhältlich.',
    image: 'assets/images/tasting-apero.jpg',
    pricePerPerson: 29.00,
    duration: 'ca. 1,5 Stunden',
    location: 'Genusswerte Bonn'
  }
];
