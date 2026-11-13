/**
 * Pistas para palabras que en su tema no traen pista propia (canciones, palabras genericas).
 * Clave = palabra normalizada (mayusculas, sin tildes ni espacios, con Ñ). Solo datos comprobables.
 */
export const EXTRA_CLUES: Record<string, string> = {
  // --- generico musica / rap ---
  RAP: 'Se canta rimando sobre una base', TRAP: 'Estilo con 808 y hi-hats rapidos', BEAT: 'La base instrumental', FLOW: 'La forma de encajar las rimas en el ritmo',
  RIMA: 'Dos versos que suenan igual al final', DISCO: 'Album, o donde se baila', CANCION: 'Unos tres minutos de musica', ESTUDIO: 'Donde se graba la musica',
  MICROFONO: 'Lo que amplifica la voz', BARRIO: 'De donde salen muchas letras', VOZ: 'El instrumento que todos tenemos', POP: 'Musica pegadiza de radio',
  PIANO: 'Teclas blancas y negras', ESCENARIO: 'Donde se actua en directo', INSTAGRAM: 'Red social de fotos', TITAN: 'La serie que nos unio',
  // --- Kanye West ---
  STRONGER: 'Kanye: sample de Daft Punk', RUNAWAY: 'Kanye: "Let\'s have a toast for the douchebags"', HEARTLESS: 'Kanye: del disco 808s & Heartbreak',
  GOLDDIGGER: 'Kanye: con Jamie Foxx', POWER: 'Kanye: abre My Beautiful Dark Twisted Fantasy', FLASHINGLIGHTS: 'Kanye: del disco Graduation',
  JESUSWALKS: 'Kanye: del disco The College Dropout', HOMECOMING: 'Kanye: con Chris Martin de Coldplay', TOUCHTHESKY: 'Kanye: del disco Late Registration',
  ALLFALLSDOWN: 'Kanye: del disco The College Dropout', FAMOUS: 'Kanye: del disco The Life of Pablo', FADE: 'Kanye: cierra The Life of Pablo',
  ULTRALIGHTBEAM: 'Kanye: abre The Life of Pablo', BLACKSKINHEAD: 'Kanye: del disco Yeezus', MONSTER: 'Kanye: con Nicki Minaj y Jay-Z',
  LOVELOCKDOWN: 'Kanye: del disco 808s & Heartbreak', THROUGHTHEWIRE: 'Kanye: grabada con la mandibula cerrada', GOODLIFE: 'Kanye: del disco Graduation',
  HEARDEMSAY: 'Kanye: del disco Late Registration', CLOSEDONSUNDAY: 'Kanye: del disco Jesus Is King', GHOSTTOWN: 'Kanye: del disco Ye',
  NEWSLAVES: 'Kanye: del disco Yeezus', GRADUATION: 'Kanye: disco de 2007, el del oso universitario', COLLEGEDROPOUT: 'Kanye: su primer disco (2004)',
  LATEREGISTRATION: 'Kanye: disco de 2005', YEEZUS: 'Kanye: disco de 2013', DONDA: 'Kanye: disco con el nombre de su madre', VULTURES: 'Kanye: disco con Ty Dolla $ign',
  KANYE: 'Ye, el rapero de Chicago',
  // --- Taylor Swift ---
  LOVER: 'Taylor: disco de 2019', FOLKLORE: 'Taylor: disco de 2020 grabado en pandemia', EVERMORE: 'Taylor: disco hermano de Folklore', MIDNIGHTS: 'Taylor: disco de 2022',
  REPUTATION: 'Taylor: disco de 2017 con serpientes', FEARLESS: 'Taylor: disco de 2008', RED: 'Taylor: disco de 2012 (y un color)', SPEAKNOW: 'Taylor: disco de 2010',
  SHAKEITOFF: 'Taylor: del disco 1989', BLANKSPACE: 'Taylor: del disco 1989', ANTIHERO: 'Taylor: "It\'s me, hi, I\'m the problem"', CARDIGAN: 'Taylor: del disco Folklore',
  KARMA: 'Taylor: del disco Midnights', WILLOW: 'Taylor: del disco Evermore', LOVESTORY: 'Taylor: Romeo y Julieta, del disco Fearless', STYLE: 'Taylor: del disco 1989',
  DELICATE: 'Taylor: del disco Reputation', ENCHANTED: 'Taylor: del disco Speak Now', BEJEWELED: 'Taylor: del disco Midnights', LAVENDERHAZE: 'Taylor: abre Midnights',
  CRUELSUMMER: 'Taylor: del disco Lover', EXILE: 'Taylor: con Bon Iver', AUGUST: 'Taylor: del disco Folklore (y un mes)', BETTY: 'Taylor: del disco Folklore (un nombre)',
  GORGEOUS: 'Taylor: del disco Reputation', BADBLOOD: 'Taylor: del disco 1989', WILDESTDREAMS: 'Taylor: del disco 1989',
  // --- Lana Del Rey ---
  BORNTODIE: 'Lana: disco de 2012', SUMMERTIMESADNESS: 'Lana: tristeza de verano', VIDEOGAMES: 'Lana: la cancion que la hizo famosa', YOUNGANDBEAUTIFUL: 'Lana: de la pelicula El gran Gatsby',
  ULTRAVIOLENCE: 'Lana: disco de 2014', HONEYMOON: 'Lana: disco de 2015 (y luna de miel)', CHEMTRAILS: 'Lana: ...over the Country Club', BLUEBANISTERS: 'Lana: disco de 2021',
  WESTCOAST: 'Lana: del disco Ultraviolence', DOINTIME: 'Lana: version de Sublime', NATIONALANTHEM: 'Lana: del disco Born to Die', BROOKLYNBABY: 'Lana: del disco Ultraviolence',
  DARKPARADISE: 'Lana: del disco Born to Die', CINNAMON: 'Lana: ...Girl, del disco Norman F. Rockwell!', LUSTFORLIFE: 'Lana: disco de 2017', RADIO: 'Lana: del disco Born to Die',
  DIETMOUNTAINDEW: 'Lana: del disco Born to Die', VENICEBITCH: 'Lana: la de casi 10 minutos', GODSANDMONSTERS: 'Lana: del EP Paradise', RIDE: 'Lana: del EP Paradise', COLA: 'Lana: del EP Paradise',
  // --- animales (lista base sin pista) ---
  GATO: 'Como Olaf', PERRO: 'El mejor amigo del humano', ELEFANTE: 'Tiene trompa', JIRAFA: 'El cuello mas largo', LEON: 'El rey de la sabana', TIGRE: 'Felino a rayas',
  PANDA: 'Come bambu', KOALA: 'Duerme en eucaliptos', DELFIN: 'Mamifero listo del mar', BALLENA: 'El animal mas grande', PINGUINO: 'Ave que no vuela y nada',
  BUHO: 'Gira la cabeza y caza de noche', ZORRO: 'Astuto y naranja', LOBO: 'Aulla a la luna', CONEJO: 'Orejas largas y zanahorias', ARDILLA: 'Guarda nueces para el invierno',
  NUTRIA: 'Se coge de la mano para dormir en el agua', CAPIBARA: 'El roedor mas grande y tranquilo', MAPACHE: 'Antifaz y manos habiles', TORTUGA: 'Lleva su casa a cuestas',
  MARIPOSA: 'Antes fue oruga', ABEJA: 'Hace miel', RANA: 'Salta y croa', CABALLO: 'Se monta y relincha', OVEJA: 'Da lana', CERDO: 'Hace oink', PATO: 'Hace cuac',
  FLAMENCO: 'Ave rosa que duerme a la pata coja', LORO: 'Repite lo que oye', OSO: 'Hiberna en invierno', ERIZO: 'Pequeño y con pinchos', MURCIELAGO: 'Vuela de noche boca abajo',
  CIERVO: 'Tiene cornamenta', MONO: 'Le encantan los platanos', HIPOPOTAMO: 'Gigante que vive en el rio', CANGURO: 'Lleva a su cria en una bolsa', COCODRILO: 'Reptil de grandes dientes',
  GAVIOTA: 'Ave de la playa que roba patatas',
};
