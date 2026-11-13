/**
 * Diccionario ampliado de español (sin tildes, 4+ letras): palabras de uso diario, formas verbales frecuentes, adjetivos, adverbios y
 * palabras gramaticales ("para", "como", "pero"...). Solo sirve para reconocer palabras EXTRA que el jugador encuentre por casualidad
 * en el tablero (dan monedas); no se usan para generar niveles.
 */
const RAW =
  // gramaticales
  'para pero como cuando donde porque aunque entre sobre hasta desde tras ante bajo cada esta este esto estas estos esas esos esos aquel aquella aquello ' +
  'ellos ellas nosotros vosotros usted ustedes mismo misma mismos mismas tanto tanta tantos tantas mucho mucha muchos muchas poco poca pocos pocas ' +
  'todo toda todos todas nada algo alguien nadie otro otra otros otras cual cuales quien quienes cuyo cuya algun alguno alguna algunos algunas ' +
  'ningun ninguno ninguna cierto cierta varios varias demas ambos ambas sino pues luego entonces ademas incluso tambien tampoco siempre nunca jamas ' +
  'ahora antes despues pronto tarde temprano todavia aun ayer manana noche tarde hoy aqui alli alla ahi cerca lejos arriba abajo dentro fuera ' +
  'delante detras encima debajo junto contra segun mediante durante salvo excepto bien mejor peor mal muy casi apenas quiza quizas acaso tal vez ' +
  'solo sola solos solas asi asimismo mientras apenas sobre medio media menos bastante demasiado demasiada demasiados ' +
  // verbos: infinitivos
  'estar haber tener hacer poder decir venir salir poner saber querer llegar pasar deber parecer quedar creer hablar llevar dejar seguir encontrar llamar ' +
  'pensar volver tomar conocer vivir sentir tratar mirar contar empezar esperar buscar existir entrar trabajar escribir perder producir ocurrir entender ' +
  'pedir recibir recordar terminar permitir aparecer conseguir comenzar servir sacar necesitar mantener resultar leer caer cambiar presentar crear abrir ' +
  'considerar oir acabar convertir ganar formar traer partir morir aceptar realizar suponer comprender lograr explicar preguntar tocar reconocer estudiar ' +
  'alcanzar nacer dirigir correr utilizar pagar ayudar gustar jugar escuchar cumplir ofrecer descubrir levantar intentar usar cantar bailar comer beber ' +
  'dormir soñar reir llorar abrazar besar querer amar odiar viajar nadar volar subir bajar cerrar abrir romper cocinar limpiar lavar ducharse caminar saltar ' +
  'lanzar coger pintar dibujar cortar pegar mover empujar tirar esconder mostrar ensenar aprender olvidar imaginar celebrar regalar compartir cuidar ' +
  'ganar perder probar elegir decidir preparar acompanar visitar invitar llamar contestar responder apagar encender mojar secar crecer brillar sonreir ' +
  // verbos: formas frecuentes
  'tengo tienes tiene tenemos tienen tuve tuvo tenia tenian tendra tendre hago haces hace hacemos hacen hizo hice hacia haria puedo puedes puede podemos ' +
  'pueden pudo pude podia podria quiero quieres quiere queremos quieren quiso queria quisiera digo dices dice decimos dicen dijo dije decia dire vengo ' +
  'viene venimos vienen vino vine venia saldre salgo sale salen salio salia pongo pone ponen puso puse sabes sabe sabemos saben supo sabia creo crees ' +
  'cree creen creia pienso piensa piensan pense veo ves vemos ven vio vi veia voy vas vamos van fue fui fuimos fueron iba iban ibamos estoy estas esta ' +
  'estamos estan estuvo estuve estaba estaban estare soy eres somos sois son eras seria sera seran habia hubo haya hemos han has dame dime mira mirad ' +
  'ven vete anda oye espera toma ten ponte vamos cuenta cuentan cuento dejo deja dejan llevo lleva llevan llego llega llegan paso pasa pasan queda quedan ' +
  'parece parecen siento siente sienten vivo vive viven hablo habla hablan miro mira miran busco busca buscan encuentro encuentra juego juega juegan ' +
  'canto canta cantan bailo baila bailan como comes come comen bebo bebe duermo duerme sueño sueña rio rie lloro llora amo amas ama aman odio odia ' +
  'gusta gustan gusto necesito necesita necesitan quedo quedamos podemos debemos debo debe deben conozco conoce conocen trabajo trabaja trabajan ' +
  'escribo escribe escriben leo lee leen abro abre abren cierro cierra cierran vuelvo vuelve vuelven empiezo empieza empiezan siga sigue siguen ' +
  'termina terminan gano gana ganan pierdo pierde pierden entro entra entran subo sube suben bajo baja bajan corro corre corren salto salta saltan ' +
  'llamo llama llaman pregunto pregunta responde respondo cuido cuida cuidan ayudo ayuda ayudan uso usa usan toco toca tocan pinto pinta dibujo dibuja ' +
  // sustantivos de uso diario
  'casa casas hogar mesa silla sillon cama puerta ventana techo suelo pared cocina cuarto salon bano jardin terraza balcon escalera pasillo garaje ' +
  'calle plaza parque barrio ciudad pueblo campo monte rio lago mar playa arena roca piedra camino puente carretera autopista esquina avenida ' +
  'sol luna estrella cielo nube nubes lluvia viento nieve hielo fuego agua tierra aire trueno rayo niebla brisa tormenta verano invierno otono ' +
  'primavera dia dias noche tarde manana semana mes meses ano anos hora horas minuto segundo tiempo momento rato vez veces siglo epoca fecha ' +
  'lunes martes miercoles jueves viernes sabado domingo enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre ' +
  'perro perra gato gata pajaro pez peces caballo vaca toro oveja cabra cerdo gallo gallina pato lobo oso zorro tigre leon mono cebra jirafa raton ' +
  'conejo ardilla tortuga rana abeja hormiga mosca arana serpiente culebra lagarto delfin ballena tiburon pulpo cangrejo aguila buho loro paloma ' +
  'cisne pavo burro mula cordero ternero cachorro animal animales bicho insecto mariposa gusano caracol medusa foca morsa nutria castor jabali ' +
  'arbol arboles rama hoja hojas flor flores rosa lirio tulipan hierba semilla fruta frutas manzana pera uva naranja limon fresa cereza melon ' +
  'sandia platano durazno ciruela higo kiwi mango piña coco verdura tomate patata cebolla ajo lechuga zanahoria pimiento calabaza judia guisante ' +
  'pan queso leche huevo huevos carne pollo cerdo pescado marisco arroz pasta sopa pizza tarta pastel helado dulce miel sal azucar aceite vino cafe ' +
  'cena comida desayuno almuerzo merienda bocadillo ensalada galleta chocolate caramelo bombon tostada mantequilla mermelada zumo refresco cerveza ' +
  'libro libros pagina lapiz pluma papel carta cartas mapa cuento poema cancion musica baile juego juegos juguete pelota muneca coche tren avion ' +
  'barco bici moto camion autobus metro taxi bicicleta globo cometa cuerda rueda motor ' +
  'amigo amiga amigos madre padre hijo hija hijos hermano hermana abuelo abuela tio tia primo prima novio novia pareja familia vecino vecina maestro ' +
  'maestra doctor doctora nino nina ninos ninas chico chica chicos chicas hombre mujer gente persona personas bebe joven viejo viejos senor senora ' +
  'cabeza cara ojo ojos nariz boca oreja mano manos dedo dedos brazo brazos pierna piernas pie pies rodilla pecho espalda corazon pelo cuello hombro ' +
  'barriga cintura cadera tobillo muñeca codo dientes diente lengua labios mejilla frente cerebro sangre hueso huesos piel uñas ' +
  'ropa camisa camiseta pantalon falda vestido chaqueta abrigo jersey sudadera zapato zapatos bota botas calcetin gorro gorra sombrero bufanda guante ' +
  'bolsa mochila reloj anillo collar pulsera gafas paraguas cinturon pijama toalla ' +
  'espejo cuadro alfombra cortina nevera horno plato vaso taza cuchara tenedor cuchillo olla sarten lampara sabana manta almohada colchon armario ' +
  'estante cajon llave llaves candado caja cajas bolsillo maleta ' +
  'escuela cole clase examen nota notas tarea pizarra tiza regla goma cuaderno profesor alumno colegio instituto universidad ' +
  'dinero moneda monedas precio tienda mercado banco trabajo oficina jefe equipo empresa negocio compra venta ' +
  'valle selva bosque isla islas costa cueva volcan desierto cumbre sendero montana colina llanura orilla ' +
  'robot cohete planeta galaxia cometa satelite telefono movil pantalla teclado raton ordenador camara foto fotos video radio television internet ' +
  'sombra brillo color colores forma formas linea punto circulo cuadrado triangulo numero numeros letra letras palabra palabras frase nombre nombres ' +
  'amor cariño beso besos abrazo abrazos sonrisa risa risas lagrimas miedo alegria tristeza pena rabia calma paz suerte sueño sueños ilusion esperanza ' +
  'verdad mentira idea ideas pensamiento recuerdo recuerdos historia historias aventura viaje viajes vacaciones fiesta fiestas regalo regalos sorpresa ' +
  'cumpleaños navidad sorteo premio premios juego reto retos pista pistas secreto secretos misterio tesoro mapa ' +
  'cosa cosas parte partes lugar lugares sitio sitios mundo vida muerte nombre caso forma modo manera tipo clase grupo punto lado fondo final inicio ' +
  'principio centro medio borde esquina trozo pedazo mitad doble triple ' +
  'problema solucion pregunta respuesta razon motivo causa efecto cambio ' +
  'cine teatro museo biblioteca hospital iglesia castillo torre palacio estadio piscina gimnasio ' +
  'futbol baloncesto tenis natacion carrera deporte deportes jugador jugadores partido gol goles ' +
  'guitarra piano violin bateria tambor flauta trompeta cantante banda concierto ' +
  // adjetivos
  'grande grandes pequeño pequeña pequeños pequeñas gran buen buena bueno buenos buenas malo mala malos malas nuevo nueva nuevos nuevas viejo vieja ' +
  'joven jovenes alto alta altos altas bajo baja bajos bajas largo larga largos largas corto corta cortos cortas ancho ancha estrecho estrecha ' +
  'gordo gorda flaco flaca fuerte fuertes debil rapido rapida lento lenta duro dura blando blanda suave caliente frio fria tibio ' +
  'bonito bonita bonitos bonitas guapo guapa feo fea limpio limpia sucio sucia lleno llena vacio vacia abierto abierta cerrado cerrada ' +
  'feliz felices triste tristes contento contenta enfadado enfadada cansado cansada ocupado ocupada libre libres seguro segura cierto cierta ' +
  'facil faciles dificil dificiles posible imposible importante importantes necesario necesaria distinto distinta igual iguales mismo ' +
  'primero primera segundo segunda tercero tercera ultimo ultima unico unica solo sola propio propia ' +
  'rojo roja rojos rojas azul azules verde verdes amarillo amarilla blanco blanca negro negra gris grises rosa naranja morado morada marron dorado plateado ' +
  'dulce dulces salado salada amargo amarga rico rica sabroso sabrosa fresco fresca ' +
  'rapido lento tranquilo tranquila alegre divertido divertida aburrido aburrida curioso curiosa valiente listo lista tonto tonta loco loca ' +
  'mejor mayor menor peor primer tercer ' +
  // numeros y otros
  'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince veinte treinta cuarenta cincuenta cien mil millon ' +
  'primero medio entero ' +
  // expresiones frecuentes
  'hola adios gracias perdon vale claro bueno venga vamos guay genial vaya hasta luego bienvenido bienvenida felicidades enhorabuena';

export const COMMON_WORDS2: string[] = [...new Set(RAW.split(/\s+/).filter(w => w.length >= 4))];
