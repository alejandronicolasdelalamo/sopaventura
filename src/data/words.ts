import type { ThemeId } from './themes';
import { ANIMALES_EXTRA, CIUDADES, CINE, TIKTOK } from './words2';

/**
 * Listas de palabras por tema. Cada entrada es "palabra" o ["palabra", "pista para el modo Acertijos"].
 * Se normalizan solas (sin tildes, sin espacios, con Ñ). Editables sin tocar codigo del juego.
 * Lo marcado como VERIFICAR esta recogido en docs/A_VERIFICAR.md.
 */
export type WordEntry = string | [string, string];

export const WORDS: Record<ThemeId, WordEntry[]> = {
  himym: [
    ['Ted', 'Arquitecto romantico que cuenta la historia'], ['Robin', 'Periodista canadiense'], ['Barney', 'Siempre viste traje'],
    ['Lily', 'Maestra y mejor amiga de Robin'], ['Marshall', 'Abogado, marido de Lily'], ['MacLarens', 'Bar donde Ted conocio a Robin'],
    ['Paraguas amarillo', 'Objeto que une a Ted con la madre'], ['Legendario', 'Legen... espera... dario'],
    ['Desafio aceptado', 'Lo que dice Barney cuando le retan'], ['Nueva York', 'Ciudad de la serie'],
    ['Choca esos cinco', 'Gesto de Barney'], ['Boda', 'Evento que acaba con la serie... o no'], ['Traje', 'Prenda favorita de Barney'],
    ['Cornofrances', 'Instrumento azul robado'], ['Ranjit', 'Taxista amigo del grupo'], ['Stella', 'Dermatologa que dejo plantado a Ted'],
    ['Playbook', 'Libro de trucos de Barney'], ['Pina', 'Misterio de Ted y la fruta'], ['Apartamento', 'Donde viven Ted y Marshall'],
    ['Madre', 'A quien Ted espera durante toda la serie'], ['Victoria', 'Pastelera ex de Ted'], ['Slap bet', 'Apuesta de bofetadas'],
  ],
  castle: [
    ['Castle', 'Escritor de novelas de misterio'], ['Beckett', 'Detective de homicidios'], ['Richard Castle', 'Nombre completo del escritor'],
    ['Alexis', 'Hija de Castle'], ['Martha', 'Madre actriz de Castle'], ['Esposito', 'Detective amigo de Ryan'], ['Ryan', 'Detective irlandes'],
    ['Lanie', 'Forense del equipo'], ['Gates', 'Capitana de la comisaria'], ['Derrick Storm', 'Heroe de las primeras novelas'],
    ['Nikki Heat', 'Protagonista inspirada en Beckett'], ['Homicidios', 'Departamento de Beckett'], ['Misterio', 'Genero de Castle'],
    ['Escritor', 'Profesion de Castle'], ['Novela', 'Lo que escribe Castle'], ['Comisaria', 'Donde trabaja el equipo'],
    ['Detective', 'Profesion de Beckett'], ['Pizarra', 'Donde se ordenan las pistas'], ['Autopsia', 'Trabajo de Lanie'], ['Sospechoso', 'Primero en la lista'],
  ],
  naruto: [
    ['Naruto', 'Ninja de Konoha con zorro dentro'], ['Sasuke', 'Ultimo Uchiha'], ['Sakura', 'Ninja medico'], ['Kakashi', 'Maestro del equipo 7'],
    ['Hinata', 'Del clan Hyuga'], ['Itachi', 'Hermano mayor de Sasuke'], ['Gaara', 'Kazekage de la Arena'], ['Jiraiya', 'Sabio pervertido'],
    ['Tsunade', 'Quinta Hokage'], ['Orochimaru', 'Sannin serpiente'], ['Konoha', 'Aldea de la Hoja'], ['Akatsuki', 'Organizacion de capas con nubes rojas'],
    ['Rasengan', 'Tecnica de esfera de chakra'], ['Chidori', 'Tecnica de rayo de Kakashi'], ['Sharingan', 'Ojos rojos de los Uchiha'],
    ['Kurama', 'El Nueve Colas'], ['Ichiraku', 'Puesto de ramen favorito'], ['Ramen', 'Comida favorita de Naruto'], ['Hokage', 'Lider de la aldea'],
    ['Shinobi', 'Ninja'], ['Kunai', 'Cuchillo ninja'], ['Shikamaru', 'Genio perezoso'], ['Neji', 'Prodigio Hyuga'], ['Rock Lee', 'Maestro del taijutsu'],
    ['Minato', 'Cuarto Hokage'], ['Obito', 'Compañero de Kakashi'], ['Madara', 'Legendario Uchiha'], ['Byakugan', 'Ojos blancos de los Hyuga'],
    ['Jutsu', 'Tecnica ninja'], ['Dattebayo', 'Muletilla de Naruto'],
  ],
  aot: [
    ['Eren', 'Protagonista que quiere ser libre'], ['Mikasa', 'Siempre con su bufanda roja'], ['Armin', 'El estratega rubio'], ['Levi', 'El soldado mas fuerte'],
    ['Hanji', 'Cientifica obsesionada con los titanes'], ['Erwin', 'Comandante de la Legion'], ['Reiner', 'El Titan Acorazado'], ['Bertholdt', 'El Titan Colosal'],
    ['Annie', 'Titan Hembra'], ['Historia', 'Reina de las murallas'], ['Ymir', 'Pecosa que se sacrifico'], ['Jean', 'El de la cara de caballo'],
    ['Connie', 'El soldado calvo'], ['Sasha', 'Le encanta la patata'], ['Zeke', 'Titan Bestia'], ['Titan', 'Gigante devorador'], ['Muralla', 'Protege a la humanidad'],
    ['Maria', 'Primera muralla'], ['Rose', 'Segunda muralla'], ['Sina', 'Tercera muralla'], ['Legion', 'Cuerpo de exploracion'], ['Libertad', 'Lo que busca Eren'],
    ['Shingeki', 'Primera palabra del titulo en japones'], ['Paradis', 'Isla de los eldianos'], ['Marley', 'Pais enemigo'], ['Sasageyo', 'Entregad vuestros corazones'],
    ['Guren no Yumiya', 'Primer opening de la serie'], ['Jiyuu no Tsubasa', 'Alas de la libertad'], ['Colosal', 'Tipo de titan gigantesco'],
  ],
  rickmorty: [
    ['Rick', 'Cientifico loco'], ['Morty', 'Su nieto'], ['Summer', 'Hermana de Morty'], ['Beth', 'Madre cirujana de caballos'], ['Jerry', 'Padre desafortunado'],
    ['Birdperson', 'Amigo mitad pajaro'], ['Squanchy', 'Gato squanchy'], ['Mr Meeseeks', 'Existe para cumplir una tarea'], ['Pickle Rick', 'Rick convertido en pepinillo'],
    ['Portal', 'Pistola para viajar'], ['Wubba lubba dub dub', 'Grito de dolor de Rick'], ['Schwifty', 'Hay que ponerse...'], ['Citadela', 'Ciudad de ricks'],
    ['Plumbus', 'Todos tienen uno en casa'], ['Szechuan', 'Salsa de McDonalds muy deseada'], ['Evil Morty', 'Morty malvado'], ['Unity', 'Mente colmena ex de Rick'],
    ['Gazorpazorp', 'Planeta de mujeres'], ['Dimension', 'C-137 es la de Rick'], ['Mortyconomicon', 'Libro de Morty'],
  ],
  adventure: [
    ['Finn', 'Humano aventurero'], ['Jake', 'Perro magico'], ['BMO', 'Consola viviente'], ['Princesa Chicle', 'Gobierna el Dulce Reino'], ['Rey Helado', 'Villano con corona'],
    ['Marceline', 'Reina de los vampiros'], ['Princesa Grumosa', 'Princesa espacial'], ['Lady Arcoiris', 'Unicornio de colores'], ['Casa del arbol', 'Hogar de Finn y Jake'],
    ['Ooo', 'Reino de la serie'], ['Lich', 'Enemigo supremo'], ['Gunter', 'Pinguino travieso'], ['Princesa Llama', 'Novia de Finn'], ['Betty', 'Amiga de Simon'],
    ['Simon', 'Rey Helado antes de serlo'], ['Espada', 'Arma de Finn'], ['Dulce Reino', 'Reino de caramelo'], ['Matematico', 'Algebraico!'], ['Aventura', 'La hora mas esperada'],
  ],
  minecraft: [
    ['Creeper', 'Verde y explosivo'], ['Steve', 'Skin clasica'], ['Alex', 'La otra skin clasica'], ['Enderman', 'No le mires a los ojos'], ['Zombi', 'Muerto viviente'],
    ['Esqueleto', 'Arquero de huesos'], ['Araña', 'Trepa paredes'], ['Aldeano', 'Hmmm... comercia'], ['Diamante', 'El mineral mas buscado'], ['Redstone', 'Circuitos'],
    ['Nether', 'Dimension de fuego'], ['Obsidiana', 'Para hacer portales'], ['Pico', 'Para minar'], ['Espada', 'Para pelear'], ['Crafteo', 'Mesa de...'], ['TNT', 'Explosivo rojo'],
    ['Cerdo', 'Animal que da chuletas'], ['Vaca', 'Da leche'], ['Oveja', 'Da lana'], ['Gallina', 'Pone huevos'], ['Lobo', 'Se doma con huesos'], ['Antorcha', 'Da luz'],
    ['Cama', 'Para saltar la noche'], ['Cofre', 'Guarda objetos'], ['Esmeralda', 'Moneda aldeana'], ['Horno', 'Funde minerales'], ['Lava', 'Liquido peligroso'],
    ['Bloque', 'Unidad del mundo'], ['Dragon', 'Jefe del End'], ['Wither', 'Jefe de tres cabezas'], ['Elitros', 'Alas para volar'], ['Tridente', 'Arma del ahogado'],
  ],
  pokemon: [
    ['Pikachu', 'Ratoncito electrico'], ['Charmander', 'Lagarto de fuego'], ['Bulbasaur', 'Tiene una planta en la espalda'], ['Squirtle', 'Tortuga de agua'],
    ['Eevee', 'Tiene muchas evoluciones'], ['Snorlax', 'Duerme bloqueando caminos'], ['Mewtwo', 'Clon legendario'], ['Mew', 'Legendario rosa'], ['Gengar', 'Fantasma sonriente'],
    ['Jigglypuff', 'Canta y duerme a todos'], ['Psyduck', 'Siempre con dolor de cabeza'], ['Charizard', 'Dragon de fuego'], ['Gyarados', 'Evolucion de Magikarp'],
    ['Lucario', 'Pokemon aura'], ['Garchomp', 'Dragon tiburon'], ['Ash', 'Entrenador de Pueblo Paleta'], ['Misty', 'Lider de gimnasio de agua'], ['Brock', 'Lider de roca'],
    ['Pokeball', 'Sirve para capturar'], ['Profesor Oak', 'Da el primer pokemon'], ['Team Rocket', 'Despegamos otra vez!'], ['Lapras', 'Pokemon de transporte marino'],
    ['Magikarp', 'Solo salpica'], ['Togepi', 'Huevo con carita'], ['Mimikyu', 'Disfrazado de Pikachu'], ['Slowpoke', 'El mas lento'], ['Vaporeon', 'Eevee de agua'],
  ],
  gaming: [
    ['Ragebait', 'Nuestro juego de siempre'], ['Rage', 'Furia al perder'], ['Lag', 'Cuando todo va a trompicones'], ['Noob', 'Principiante'], ['GG', 'Buena partida'],
    ['AFK', 'Lejos del teclado'], ['Buff', 'Mejora a un personaje'], ['Nerf', 'Debilitar algo'], ['Respawn', 'Volver a aparecer'], ['Loot', 'Botin'], ['Boss', 'Jefe final'],
    ['Tilt', 'Perder los nervios'], ['Clutch', 'Ganar contra todo pronostico'], ['Smurf', 'Cuenta alternativa'], ['Main', 'Personaje principal'], ['Tanque', 'El que aguanta golpes'],
    ['Healer', 'El que cura'], ['Rush', 'Ir a toda prisa'], ['Headshot', 'Disparo a la cabeza'], ['Gamer', 'Quien juega mucho'], ['Mando', 'Se agarra con las dos manos'],
    ['Teclado', 'Para escribir y jugar'], ['Stream', 'Directo'], ['Cascos', 'Para el chat de voz'], ['Ping', 'Latencia'], ['Skin', 'Aspecto de un personaje'],
    ['Partida', 'Una de cada vez'], ['Logro', 'Se desbloquea'], ['Nivel', 'Se sube con experiencia'], ['Speedrun', 'Pasarse el juego a toda velocidad'],
  ],
  ghibli: [
    ['Totoro', 'Vecino gigante del bosque'], ['Chihiro', 'Niña en el mundo de los espiritus'], ['Haku', 'Dragon del rio'], ['Sin cara', 'Espiritu silencioso'],
    ['Ponyo', 'Pez que quiere ser humana'], ['Kiki', 'Bruja repartidora'], ['Howl', 'Mago del castillo ambulante'], ['Sophie', 'Maldita por la bruja del Paramo'],
    ['Mononoke', 'Princesa lobo'], ['Calcifer', 'Demonio de fuego'], ['Ashitaka', 'Principe maldito'], ['Laputa', 'Castillo en el cielo'], ['Kodama', 'Espiritus del arbol'],
    ['Nemo', 'Pez payaso perdido'], ['Dory', 'Pez con mala memoria'], ['Woody', 'Vaquero juguete'], ['Buzz', 'Hasta el infinito y mas alla'], ['Elsa', 'Reina de hielo'],
    ['Anna', 'Hermana de Elsa'], ['Simba', 'Rey leon'], ['Mufasa', 'Padre de Simba'], ['Timon', 'Suricato amigo'], ['Pumba', 'Facochero amigo'], ['Stitch', 'Experimento 626'],
    ['Moana', 'Voy a navegar'], ['Maui', 'Semidios del anzuelo'], ['Ratatouille', 'Rata cocinera'], ['Wall-E', 'Robot basurero'], ['Carl', 'Anciano de la casa de globos'],
    ['Coco', 'Dia de muertos'], ['Miguel', 'Quiere ser musico'], ['Mulan', 'Guerrera disfrazada'], ['Aladdin', 'Ladron con lampara'], ['Merida', 'Princesa valiente'],
    ['Tristeza', 'Emocion azul'], ['Alegria', 'Emocion amarilla'],
  ],
  comida: [
    ['Pizza', 'Redonda y con queso'], ['Pepperoni', 'Su cobertura favorita'], ['Pasta', 'Italiana y favorita'], ['Entrecot', 'Carne a la parrilla'], ['Durum', 'Kebab enrollado'],
    ['Ensalada de pasta', 'Plato frio con macarrones'], ['Lasaña', 'Capas de pasta y bechamel'], ['Hamburguesa', 'Pan, carne y queso'], ['Tortilla', 'Con o sin cebolla'],
    ['Jamon', 'Iberico, por ejemplo'], ['Patatas', 'Fritas o bravas'], ['Croquetas', 'Bolitas cremosas'], ['Tapas', 'Se comen en Granada con cada bebida'], ['Paella', 'Arroz valenciano'],
    ['Helado', 'Postre frio'], ['Chocolate', 'Dulce y marron'], ['Tarta', 'Con velas en el cumple'], ['Churros', 'Con chocolate'], ['Nachos', 'Con queso fundido'], ['Tacos', 'Mexicanos'],
    ['Burrito', 'Un apodo y un plato'], ['Kebab', 'Comida turca'], ['Queso', 'Lo que va en la pizza'], ['Sidra', 'Bebida asturiana'], ['Palomitas', 'Para el cine'],
    ['Arroz', 'Grano blanco'], ['Pollo', 'Ave de corral'], ['Bacon', 'Panceta ahumada'], ['Carne', 'Proteina'], ['Macarrones', 'Pasta corta'], ['Espaguetis', 'Pasta larga'],
    ['Carbonara', 'Salsa con huevo y panceta'], ['Tiramisu', 'Postre italiano'], ['Gnocchi', 'Pasta de patata'],
  ],
  animales: [
    'Gato', 'Perro', 'Elefante', 'Jirafa', 'Leon', 'Tigre', 'Panda', 'Koala', 'Delfin', 'Ballena', 'Pingüino', 'Buho', 'Zorro', 'Lobo', 'Conejo', 'Ardilla', 'Nutria',
    'Capibara', 'Mapache', 'Tortuga', 'Mariposa', 'Abeja', 'Rana', 'Caballo', 'Oveja', 'Cerdo', 'Pato', 'Flamenco', 'Loro', 'Oso', 'Erizo', 'Murcielago', 'Ciervo', 'Mono',
    'Hipopotamo', 'Canguro', 'Cocodrilo', 'Gaviota', ...ANIMALES_EXTRA,
  ],
  ciudades: CIUDADES,
  cine: CINE,
  tiktok: TIKTOK,
  citas: [
    ['Cine', 'Plan con palomitas'], ['Picnic', 'Comer sobre una manta en el parque'], ['Paseo', 'Plan sin prisa'], ['Cena', 'Plan nocturno'], ['Pelicula', 'Se ve en la tele'],
    ['Manta', 'Para el sofa'], ['Serie', 'Maraton de capitulos'], ['Beso', 'Muac'], ['Abrazo', 'Gesto de cariño'], ['Escapada', 'Viaje corto'], ['Viaje', 'Roma esta pendiente'],
    ['Atardecer', 'Hora dorada'], ['Terraza', 'Para tomar algo al aire libre'], ['Cafe', 'Para empezar el dia'], ['Bailar', 'Moverse juntos'], ['Museo', 'Plan cultural'],
    ['Parque', 'Para pasear'], ['Amor', 'Lo que hay entre los dos'], ['Sorpresa', 'Plan secreto'], ['Mimos', 'Caricias'], ['Sofa', 'Donde vemos series'], ['Foto', 'Para el recuerdo'],
    ['Regalo', 'Detalle envuelto'], ['Flores', 'Ramo'], ['Domingo', 'Dia de descanso'], ['Playa', 'Arena y sol'], ['Senderismo', 'Ruta por la montaña'], ['Concierto', 'Musica en directo'],
    ['Verbena', 'Fiesta de verano'], ['Tapeo', 'Ir de bar en bar'],
  ],
  kanye: [
    'Stronger', 'Runaway', 'Heartless', 'Gold Digger', 'Power', 'Flashing Lights', 'Jesus Walks', 'Homecoming', 'Touch the Sky', 'All Falls Down', 'Famous', 'Fade',
    'Ultralight Beam', 'Black Skinhead', 'Monster', 'Love Lockdown', 'Through the Wire', 'Good Life', 'Heard Em Say', 'Closed on Sunday', 'Ghost Town', 'New Slaves',
    'Graduation', 'College Dropout', 'Late Registration', 'Yeezus', 'Donda', 'Vultures', 'Kanye',
  ],
  luchork: [
    // VERIFICAR titulos concretos antes de añadirlos.
    ['Lucho RK', 'Artista'], 'Rap', 'Trap', 'Beat', 'Flow', 'Rima', 'Disco', 'Cancion', 'Estudio', 'Microfono', 'Barrio',
  ],
  amaia: [
    // VERIFICAR titulos concretos antes de añadirlos.
    ['Amaia', 'Cantante navarra'], ['Tu cancion', 'Dueto de Eurovision con Alfred'], ['Pura vida', 'Album de Amaia'], 'Voz', 'Pop', 'Disco', 'Piano', 'Escenario',
  ],
  dvalentino: [
    // VERIFICAR: la cancion que nos unio. Añade el titulo exacto en el panel o aqui.
    ['D Valentino', 'Artista de la cancion que nos unio'], 'Cancion', 'Trap', 'Rap', 'Beat', 'Flow', 'Rima', 'Disco', 'Titan', 'Instagram',
  ],
  mvrk: [
    ['MVRK', 'Artista'], 'Rap', 'Trap', 'Beat', 'Flow', 'Rima', 'Disco', 'Cancion', 'Estudio', 'Microfono', 'Barrio',
  ],
  lhaine: [
    ['Lhaine', 'Artista'], 'Rap', 'Trap', 'Beat', 'Flow', 'Rima', 'Disco', 'Cancion', 'Estudio', 'Microfono', 'Barrio',
  ],
  pantera: [
    ['La Pantera', 'Artista'], 'Rap', 'Trap', 'Beat', 'Flow', 'Rima', 'Disco', 'Cancion', 'Estudio', 'Microfono', 'Barrio',
  ],
  taylor: [
    'Lover', 'Folklore', 'Evermore', 'Midnights', 'Reputation', 'Fearless', 'Red', 'Speak Now', 'Shake It Off', 'Blank Space', 'Anti Hero', 'Cardigan', 'Karma', 'Willow',
    'Love Story', 'Style', 'Delicate', 'Enchanted', 'Bejeweled', 'Lavender Haze', 'Cruel Summer', 'Exile', 'August', 'Betty', 'Gorgeous', 'Bad Blood', 'Wildest Dreams',
  ],
  lana: [
    'Born to Die', 'Summertime Sadness', 'Video Games', 'Young and Beautiful', 'Ultraviolence', 'Honeymoon', 'Chemtrails', 'Blue Banisters', 'West Coast', 'Doin Time',
    'National Anthem', 'Brooklyn Baby', 'Dark Paradise', 'Cinnamon', 'Lust for Life', 'Radio', 'Diet Mountain Dew', 'Venice Bitch', 'Gods and Monsters', 'Ride', 'Cola',
  ],
  nosotros: [
    ['Nico', 'Tu novio'], ['Izana', 'Mi novia'], ['Cuchi', 'Apodo cariñoso'], ['Izanis', 'Apodo de Izana'], ['Burrito', 'Apodo de Nico'], ['Nicolasia', 'Apodo de Nico'],
    ['Alejandro', 'Nombre completo de Nico'], ['Olaf', 'Nuestro gato'], ['Ragebait', 'Nuestro juego'], ['Ok mañana', 'Lo que Izana dice mucho'], ['Instagram', 'Donde empezo todo'],
    ['Julio', 'Mes en que empezamos a hablar'], ['Septiembre', 'Mes en que somos pareja'], ['Titan', 'La serie que nos unio'], ['Novios', 'Lo que somos'], ['Pareja', 'Dos en uno'],
    ['Te quiero', 'Dos palabras importantes'], ['Rivas', 'Donde vivimos'], ['Granada', 'Nuestro primer gran viaje'], ['Roma', 'Viaje pendiente'],
  ],
  olaf: [
    ['Olaf', 'Gato de 11 años'], ['Gato', 'Felino de la casa'], ['Maullido', 'Su forma de hablar'], ['Bigotes', 'Sensores de la cara'], ['Caricias', 'Lo que mas le gusta'], ['Siesta', 'Su pasatiempo'],
    ['Arañazo', 'Cuidado con las uñas'], ['Pelo', 'Lo deja por todo el sofa'], ['Pelota', 'Juguete redondo'], ['Ronroneo', 'Sonido de felicidad'], ['Sofa', 'Su sitio favorito'],
    ['Caja', 'Cualquier caja le vale'], ['Patitas', 'Cuatro y muy suaves'], ['Cola', 'Se mueve con el humor'], ['Garras', 'Retractiles'], ['Leche', 'Mito sobre los gatos'], ['Once años', 'Su edad'],
  ],
  rivas: [
    // Parques y centros de Rivas. Los parques menos conocidos vienen de directorios web: ver docs/A_VERIFICAR.md.
    ['Rivas', 'Nuestra ciudad'], ['Covibar', 'Barrio de Izana'], ['Rivas Futura', 'Barrio de Nico'], ['Urbanizaciones', 'Zona de Izana'],
    ['HdosOcio', 'El H2O, centro comercial y de ocio de Rivas'], ['Rivas Centro', 'Centro comercial de Rivas'], ['Santa Monica', 'Centro comercial de Rivas'],
    ['El Zoco', 'Centro comercial de Rivas'], ['La Casa Mas Grande', 'Centro comercial de Rivas'],
    ['La Ramona', 'Bar de Rivas'], ['El Mana', 'Bar de Rivas'], ['MacLarens', 'Bar de Rivas como el de Ted y Robin'],
    ['El Cerro', 'El cerro del Telégrafo, con vistas'], ['Telegrafo', 'El cerro de Rivas con vistas'], ['Bellavista', 'Parque de Rivas'], ['Parque Lineal', 'Largo parque junto al río'],
    ['Barca Vieja', 'Parque de Rivas'], ['San Isidro', 'Parque de Rivas'], ['Asturias', 'Parque de Rivas'],
    'Madrid', 'Barrio', 'Vecinos', 'Casa', 'Portal', 'Calle',
  ],
  metro: [
    ['Puerta de Arganda', 'Parada de la línea 9 antes de entrar en Rivas'], ['Rivas Urbanizaciones', 'Parada de la línea 9'], ['Rivas Futura', 'Parada de la línea 9'],
    ['Rivas Vaciamadrid', 'Parada de la línea 9 en el centro de Rivas'], ['La Poveda', 'Parada de la línea 9 hacia Arganda'], ['Arganda del Rey', 'Final de la línea 9'],
    ['San Cipriano', 'Parada de la línea 9'], ['Vicalvaro', 'Parada de la línea 9'], ['Valdebernardo', 'Parada de la línea 9'], ['Pavones', 'Parada de la línea 9'],
    ['Paco de Lucia', 'Otro extremo de la línea 9'], ['Mirasierra', 'Parada de la línea 9'], ['Herrera Oria', 'Parada de la línea 9'],
    'Metro', 'Linea nueve', 'Andén', 'Vagon', 'Tarjeta', 'Abono', 'Estacion',
  ],
  metromad: [
    ['Sol', 'Kilómetro cero: líneas 1, 2 y 3'], ['Gran Via', 'Líneas 1 y 5, teatros y musicales'], ['Callao', 'Líneas 3 y 5, plaza con pantallas gigantes'],
    ['Opera', 'Líneas 2 y 5, frente al Teatro Real'], ['Atocha', 'Estación de trenes junto al Reina Sofía'], ['Retiro', 'Línea 2, a la puerta del parque'],
    ['Banco de España', 'Línea 2, junto a Cibeles'], ['Principe Pio', 'Líneas 6 y 10, intercambiador con centro comercial'], ['Plaza de España', 'Líneas 3 y 10, al final de la Gran Vía'],
    ['Moncloa', 'Líneas 3 y 6, intercambiador de autobuses'], ['Nuevos Ministerios', 'Líneas 6, 8 y 10, de camino al aeropuerto'], ['Chamartin', 'Líneas 1 y 10, estación de trenes del norte'],
    ['Cuatro Caminos', 'Líneas 1, 2 y 6'], ['Tribunal', 'Líneas 1 y 10, junto a Malasaña'], ['Bilbao', 'Líneas 1 y 4, glorieta de Bilbao'], ['Alonso Martinez', 'Líneas 4, 5 y 10'],
    ['Colon', 'Línea 4, plaza de Colón'], ['Goya', 'Líneas 2 y 4, barrio de Salamanca'], ['Serrano', 'Línea 4, calle de las tiendas de lujo'], ['Velazquez', 'Línea 4'],
    ['Arguelles', 'Líneas 3, 4 y 6, zona universitaria'], ['Lavapies', 'Línea 3, barrio multicultural'], ['Embajadores', 'Líneas 3 y 5'], ['La Latina', 'Línea 5, tapas y El Rastro'],
    ['Tirso de Molina', 'Línea 1, plaza del mercado de flores'], ['Puerta del Sur', 'Final de la línea 10, hacia Alcorcón'], ['Aeropuerto', 'Línea 8, para coger el avión'],
    ['Campo de las Naciones', 'Línea 8, junto a IFEMA'], ['Santiago Bernabeu', 'Línea 10, el estadio del Real Madrid'], ['Metropolitano', 'Línea 7, el estadio del Atlético'],
    ['Avenida de America', 'Líneas 4, 6, 7 y 9, gran intercambiador'], ['Plaza de Castilla', 'Líneas 1, 9 y 10, junto a las torres inclinadas'], ['Piramides', 'Línea 5, junto al Manzanares'],
    ['Legazpi', 'Líneas 3 y 6, cerca de Matadero'], ['Casa de Campo', 'Líneas 5 y 10, el parque más grande'], ['Ventas', 'Líneas 2 y 5, la plaza de toros'], ['Oporto', 'Líneas 5 y 6'],
    ['Conde de Casal', 'Línea 6'], ['Sevilla', 'Línea 2'], ['Noviciado', 'Línea 2'], ['Mendez Alvaro', 'Línea 6, estación de autobuses'], ['Plaza Eliptica', 'Líneas 6 y 11'],
    ['Pueblo Nuevo', 'Líneas 5 y 7'], ['Puerta de Toledo', 'Línea 5'], ['Mar de Cristal', 'Líneas 4 y 8'],
  ],
  madrid: [
    ['Puerta del Sol', 'Kilómetro cero, con el oso y el madroño'], ['Plaza Mayor', 'Plaza porticada de los Austrias'], ['Gran Via', 'La calle de los teatros'], ['El Retiro', 'Parque con el Palacio de Cristal'],
    ['Cibeles', 'Fuente de la diosa y el ayuntamiento'], ['Neptuno', 'Fuente junto al Museo del Prado'], ['Palacio Real', 'Residencia oficial de la Corona'], ['Templo de Debod', 'Templo egipcio con atardeceres'],
    ['Malasaña', 'Barrio de bares y la plaza del Dos de Mayo'], ['Chueca', 'Barrio del orgullo'], ['La Latina', 'Barrio del Rastro y las cañas'], ['Lavapies', 'Barrio multicultural'],
    ['Salamanca', 'Barrio de las compras de lujo'], ['Chamberi', 'Barrio castizo con mucha vida'], ['Bernabeu', 'Estadio del Real Madrid'], ['Metropolitano', 'Estadio del Atlético'],
    ['Madrid Rio', 'Paseo junto al Manzanares'], ['El Rastro', 'Mercadillo de los domingos'], ['El Prado', 'Museo de Velázquez y Goya'], ['Reina Sofia', 'Museo del Guernica'], ['Thyssen', 'Museo de la milla del arte'],
    ['Cuatro Torres', 'Los cuatro rascacielos del norte'], ['Puerta de Alcala', 'Arco monumental junto al Retiro'], ['Plaza de Oriente', 'Jardines frente al Palacio Real'], ['San Miguel', 'Mercado gastronómico de cristal'],
    ['San Gines', 'Chocolate con churros'], ['Parque del Oeste', 'Con la Rosaleda'], ['Santa Ana', 'Plaza del Barrio de las Letras'], ['Barrio de las Letras', 'Donde vivió Cervantes'],
    ['Vallecas', 'Barrio con mucho orgullo'], ['Conde Duque', 'Antiguo cuartel convertido en centro cultural'], ['El Capricho', 'Parque romántico de Barajas'], ['Faro de Moncloa', 'Mirador de la ciudad'],
    ['Ifema', 'Recinto de ferias'], ['Casa de Campo', 'El pulmón verde de Madrid'], ['Callao', 'Plaza con pantallas gigantes'], ['Castellana', 'El gran paseo de norte a sur'], ['Atocha', 'Estación de trenes'],
    ['Matadero', 'Antiguo matadero convertido en espacio cultural'], ['Azca', 'Zona de oficinas junto al Bernabéu'], ['Lavapies', 'Barrio de teatros y cultura'],
  ],
  granada: [
    ['Granada', 'Ciudad del viaje de agosto'], ['Alhambra', 'Palacio nazari'], ['Albaicin', 'Barrio de calles blancas'], ['Mirador', 'Para ver el atardecer'], ['Tapas', 'Se piden con la bebida'],
    ['La Buena Vida', 'Bar donde cenamos varios dias'], ['Sierra Nevada', 'Montañas al fondo'], ['Botella', 'La que exploto en el congelador'], ['Congelador', 'Donde estallo la botella'],
    ['Siesta', 'Dormimos muchisimo'], ['Agua', 'La de la Alhambra que no cogio'], ['Habitacion', 'Hubo un error con ella'], ['Agosto', 'Mes del viaje'], ['Piso', 'Donde nos alojamos'],
    ['Aire', 'Acondicionado del piso'], ['Sacromonte', 'Barrio de las cuevas'], ['Generalife', 'Jardines junto a la Alhambra'], ['Cena', 'Casi siempre en el mismo bar'],
  ],
  cercedilla: [
    ['Cercedilla', 'Pueblo de la sierra'], ['Senderismo', 'Ruta a pie'], ['Ruta', 'Camino marcado'], ['Tren', 'Con el que fuimos'], ['Pueblo', 'Tranquilo y de montaña'], ['Sidra', 'Bebimos juntos'],
    ['Relax', 'Plan del dia'], ['Cojo', 'Como iba Nico'], ['Montaña', 'Se sube a pie'], ['Bosque', 'Pinos y sombra'], ['Sierra', 'Guadarrama'], ['Mochila', 'Con agua y comida'],
    ['Botas', 'Calzado de ruta'], ['Picnic', 'Comida en el campo'], ['Camino', 'Sendero'],
  ],
  roma: [
    // Tema bloqueado hasta despues del viaje. Sin spoilers.
    ['Roma', 'Proximamente'],
  ],
  gente: [
    ['Elene', 'Mejor amiga de Izana'], ['Laura', 'Amiga de Izana'], ['Elisa', 'Amiga de Izana'], ['Lucia', 'Amiga (de Rivas y de la uni)'], ['Gabriela', 'Amiga de la universidad'],
    ['Daniela', 'Amiga de la universidad'], ['Nacho', 'Amigo de Rivas'], ['Dani', 'Amigo de Izana'], ['Xavi', 'Amigo de Galicia'], ['Carlos', 'Amigo de Galicia'], ['Jose', 'Amigo de Nico'],
    ['Pachito', 'Apodo de Diego'], ['Diego', 'Amigo de Nico'], ['Victor', 'Amigo de Nico'], ['Candela', 'Novia de Victor'], ['Amaya', 'Novia de Diego'], ['Oscar', 'Novio de Laura'],
  ],
  oceano: [
    ['Ballena', 'El animal mas grande del planeta'], ['Medusa', 'Transparente y con tentaculos que pican'], ['Pulpo', 'Tiene ocho brazos y tres corazones'],
    ['Tortuga', 'Nada miles de kilometros y vuelve a la playa donde nacio'], ['Delfin', 'Mamifero listo que se comunica con silbidos'], ['Tiburon', 'Pez con varias filas de dientes'],
    ['Coral', 'Arrecife hecho de animales diminutos'], ['Estrella de mar', 'Si pierde un brazo le vuelve a crecer'], ['Caballito de mar', 'El macho es quien lleva las crias'],
    ['Cangrejo', 'Camina de lado'], ['Orca', 'Ballena asesina en blanco y negro'], ['Foca', 'Duerme en el hielo y nada genial'], ['Ancla', 'Sujeta el barco al fondo'],
    ['Marea', 'Sube y baja por la Luna'], ['Ola', 'La que buscan los surfistas'], ['Perla', 'Joya que nace dentro de una ostra'], ['Submarino', 'Barco que navega bajo el agua'],
    ['Algas', 'Plantas del mar'], ['Calamar', 'Lanza tinta para escapar'], ['Abisal', 'Lo mas profundo y oscuro del oceano'], ['Faro', 'Torre con luz para los barcos'],
    ['Buzo', 'Persona que bucea con traje y botella'], ['Arrecife', 'Ciudad submarina de corales'], ['Manta raya', 'Pez plano que parece volar bajo el agua'],
  ],
  espacio: [
    ['Luna', 'Satelite de la Tierra'], ['Sol', 'Nuestra estrella'], ['Marte', 'El planeta rojo'], ['Saturno', 'Planeta con anillos espectaculares'], ['Jupiter', 'El planeta mas grande'],
    ['Venus', 'El planeta mas caliente'], ['Mercurio', 'El planeta mas cercano al Sol'], ['Neptuno', 'Planeta azul y con vientos enormes'], ['Urano', 'Gira tumbado de lado'],
    ['Galaxia', 'Miles de millones de estrellas juntas'], ['Via Lactea', 'Nuestra galaxia'], ['Cometa', 'Bola de hielo con cola brillante'], ['Asteroide', 'Roca que viaja por el espacio'],
    ['Nebulosa', 'Nube de gas donde nacen estrellas'], ['Astronauta', 'Viaja al espacio con escafandra'], ['Cohete', 'Nave que despega con fuego'], ['Eclipse', 'Cuando la Luna tapa el Sol'],
    ['Agujero negro', 'Ni la luz puede escapar de el'], ['Constelacion', 'Dibujo que forman las estrellas'], ['Orbita', 'Camino que sigue un planeta'], ['Telescopio', 'Sirve para mirar las estrellas'],
    ['Meteorito', 'Estrella fugaz que llega al suelo'], ['Aurora', 'Luces de colores en el cielo polar'], ['Satelite', 'Gira alrededor de un planeta'],
  ],
  bosque: [
    ['Ciervo', 'Animal con cornamenta'], ['Zorro', 'Animal astuto de cola naranja'], ['Buho', 'Ave que caza de noche y gira la cabeza'], ['Ardilla', 'Guarda bellotas para el invierno'],
    ['Lobo', 'Aulla a la luna'], ['Seta', 'Crece tras la lluvia en el suelo del bosque'], ['Musgo', 'Alfombra verde sobre las rocas'], ['Helecho', 'Planta antigua de hojas como plumas'],
    ['Roble', 'Arbol que da bellotas'], ['Pino', 'Arbol de hoja perenne con pinas'], ['Luciernaga', 'Insecto que brilla en la oscuridad'], ['Rio', 'Agua que baja de la montana'],
    ['Cascada', 'El agua cae desde lo alto'], ['Sendero', 'Camino para caminar por el monte'], ['Cabana', 'Casita de madera en el bosque'], ['Hada', 'Ser magico con alas pequenas'],
    ['Duende', 'Personaje travieso de los cuentos'], ['Bellota', 'Fruto del roble'], ['Tejon', 'Animal que excava madrigueras'], ['Mariposa', 'Fue oruga antes de volar'],
    ['Pajaro carpintero', 'Golpea los troncos con el pico'], ['Niebla', 'Nube que baja al suelo por la manana'], ['Hoguera', 'Fuego para calentarse de acampada'], ['Mochila', 'Imprescindible para ir de excursion'],
  ],
  invierno: [
    ['Nieve', 'Copos blancos que caen del cielo'], ['Muñeco de nieve', 'Tiene zanahoria por nariz'], ['Bufanda', 'Abriga el cuello'], ['Guantes', 'Para las manos frias'],
    ['Gorro', 'Abriga la cabeza'], ['Chocolate', 'Bebida caliente para el frio'], ['Manta', 'Para acurrucarse en el sofa'], ['Chimenea', 'Fuego dentro de casa'],
    ['Esqui', 'Deporte de bajar la montana'], ['Trineo', 'Para deslizarse por la nieve'], ['Pinguino', 'Ave que no vuela y vive en el hielo'], ['Oso polar', 'Oso blanco del Artico'],
    ['Iglu', 'Casa de bloques de hielo'], ['Copo', 'Cada uno tiene una forma distinta'], ['Escarcha', 'Hielo fino de las mananas frias'], ['Glaciar', 'Rio de hielo que avanza despacio'],
    ['Navidad', 'Fiesta de diciembre'], ['Patinaje', 'Deslizarse sobre hielo'], ['Calcetines', 'Mejor si son gorditos'], ['Abrigo', 'Prenda gorda para salir'],
    ['Castañas', 'Asadas en la calle cuando hace frio'], ['Ventisca', 'Tormenta de nieve y viento'], ['Estalactita', 'Pincho de hielo que cuelga del tejado'], ['Pijama', 'Lo mejor de los dias de frio'],
  ],
  postres: [
    ['Tarta', 'Con velas en los cumples'], ['Helado', 'Frio y en cucurucho'], ['Chocolate', 'Se derrite en la boca'], ['Galleta', 'Para mojar en leche'], ['Flan', 'Tiembla y lleva caramelo'],
    ['Churros', 'Con chocolate para desayunar'], ['Tortitas', 'Apiladas y con sirope'], ['Gofre', 'Dulce con cuadraditos'], ['Natillas', 'Con galleta encima'], ['Brownie', 'Bizcocho de chocolate denso'],
    ['Cupcake', 'Magdalena decorada con crema'], ['Donut', 'Dulce con agujero'], ['Piruleta', 'Caramelo con palo'], ['Algodon de azucar', 'Nube dulce de feria'], ['Crepe', 'Tortita fina francesa'],
    ['Tiramisu', 'Postre italiano con cafe'], ['Macaron', 'Galletita francesa de colores'], ['Gominola', 'Dulce blandito de colores'], ['Bizcocho', 'Esponjoso y casero'], ['Nata', 'Se monta para decorar'],
    ['Caramelo', 'Azucar derretida'], ['Magdalena', 'Perfecta con el cafe'], ['Arroz con leche', 'Lleva canela por encima'], ['Torrija', 'Pan dulce de Semana Santa'],
  ],
  deportes: [
    ['Futbol', 'Once contra once'], ['Baloncesto', 'Canasta de tres puntos'], ['Tenis', 'Raqueta y pelota amarilla'], ['Padel', 'Como el tenis pero con paredes'], ['Natacion', 'Deporte en la piscina'],
    ['Voleibol', 'Red alta y sin dejar caer la pelota'], ['Ciclismo', 'Sobre dos ruedas'], ['Atletismo', 'Correr, saltar y lanzar'], ['Escalada', 'Subir paredes de roca'], ['Surf', 'Montar olas con tabla'],
    ['Patinaje', 'Sobre ruedas o cuchillas'], ['Boxeo', 'Con guantes en un ring'], ['Yoga', 'Posturas y respiracion'], ['Maraton', 'Mas de 42 kilometros'], ['Gol', 'Lo que se grita en el futbol'],
    ['Portero', 'Puede tocar el balon con las manos'], ['Arbitro', 'Pita las faltas'], ['Medalla', 'Premio de oro, plata o bronce'], ['Equipo', 'Jugar juntos'], ['Estadio', 'Donde se juegan los partidos'],
    ['Olimpiadas', 'Cada cuatro anos'], ['Esgrima', 'Duelo con espadas'], ['Gimnasia', 'Saltos y piruetas'], ['Bolos', 'Derribar diez con una bola'],
  ],
  instrumentos: [
    ['Guitarra', 'Seis cuerdas'], ['Piano', 'Teclas blancas y negras'], ['Bateria', 'Platillos y tambores'], ['Violin', 'Se toca con arco'], ['Flauta', 'Se sopla de lado'],
    ['Trompeta', 'Metal con tres pistones'], ['Saxofon', 'Metal pero de la familia de la madera'], ['Ukelele', 'Guitarra pequenita'], ['Bajo', 'Cuerdas graves del grupo'], ['Arpa', 'Muchas cuerdas en un marco'],
    ['Acordeon', 'Se abre y se cierra'], ['Xilofono', 'Laminas que se golpean'], ['Violonchelo', 'Violin grande que se toca sentado'], ['Clarinete', 'Madera negra con lengüeta'], ['Tambor', 'Se golpea con baquetas'],
    ['Pandereta', 'Con sonajas alrededor'], ['Microfono', 'Para cantar fuerte'], ['Sintetizador', 'Teclado electronico'], ['Castañuelas', 'Se tocan con los dedos al bailar'], ['Armonica', 'Cabe en el bolsillo'],
    ['Partitura', 'Donde se escriben las notas'], ['Metronomo', 'Marca el ritmo'], ['Cajon', 'Caja flamenca que se toca sentado'], ['Triangulo', 'El mas facil de la orquesta... o no'],
  ],
};

/** Palabras comodin para temas con pocas palabras (musica). */
export const FALLBACK_WORDS = ['Musica', 'Ritmo', 'Melodia', 'Cancion', 'Estribillo', 'Guitarra', 'Bateria', 'Cantante', 'Letra', 'Disco', 'Radio', 'Baile', 'Concierto', 'Nota', 'Acorde'];
