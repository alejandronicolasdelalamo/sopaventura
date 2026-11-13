/**
 * Palabras comunes en español (sin tildes, 4-8 letras). Sirven para las "palabras extra": se esconden algunas a proposito en cada
 * tablero y, ademas, cualquier palabra de esta lista (o de los temas del juego) que encuentres por casualidad da monedas.
 */
export const COMMON_WORDS: string[] = (
  'casa mesa silla puerta ventana techo suelo pared cocina cuarto salon bano jardin calle plaza parque barrio ciudad pueblo campo monte rio lago mar playa arena roca piedra camino puente ' +
  'sol luna estrella cielo nube lluvia viento nieve hielo fuego agua tierra aire trueno rayo niebla brisa tormenta verano invierno otono primavera ' +
  'perro gato pajaro pez caballo vaca oveja cabra cerdo gallo pato lobo oso zorro tigre leon mono cebra jirafa raton conejo ardilla tortuga rana abeja hormiga mosca araña ' +
  'arbol rama hoja flor rosa lirio tulipan hierba semilla fruta manzana pera uva naranja limon fresa cereza melon sandia platano durazno ' +
  'pan queso leche huevo carne pollo arroz pasta sopa pizza tarta helado dulce miel sal azucar aceite vino cafe cena comida desayuno almuerzo merienda ' +
  'libro hoja lapiz pluma papel carta mapa cuento poema cancion musica baile juego juguete pelota muneca coche tren avion barco bici moto camion ' +
  'amigo amiga madre padre hijo hija hermano hermana abuelo abuela tio tia primo prima novio novia pareja familia vecino maestro doctor ' +
  'cabeza cara ojo nariz boca oreja mano dedo brazo pierna pie rodilla pecho espalda corazon cuerpo pelo diente lengua ' +
  'rojo azul verde amarillo blanco negro gris rosa morado naranja marron claro oscuro grande pequeno largo corto alto bajo ancho fino gordo ' +
  'feliz triste alegre calma fuerte rapido lento listo bueno malo nuevo viejo joven bonito feo limpio sucio dulce amargo suave duro ' +
  'amor paz vida sueno risa beso abrazo gracias hola adios fiesta regalo sorpresa secreto recuerdo viaje aventura historia ' +
  'tiempo hora dia noche tarde manana semana mes ano lunes martes jueves viernes sabado domingo hoy ayer siempre nunca ' +
  'comer beber dormir correr saltar nadar volar cantar bailar leer escribir pintar dibujar jugar mirar oir hablar pensar sonar viajar ' +
  'camisa falda pantalon zapato gorro bufanda guante abrigo vestido calcetin cinturon bolsa mochila reloj anillo collar ' +
  'ropa cama sillon lampara espejo cuadro alfombra cortina nevera horno plato vaso taza cuchara tenedor cuchillo olla sarten ' +
  'escuela clase examen nota tarea clase pizarra tiza regla goma cuaderno ' +
  'dinero moneda precio tienda mercado banco trabajo oficina jefe equipo ' +
  'monte valle selva bosque isla costa cueva volcan desierto cumbre sendero ' +
  'robot cohete planeta galaxia cometa satelite telefono pantalla teclado raton ordenador camara foto video radio ' +
  'sombra brillo color forma linea punto circulo cuadrado triangulo numero letra palabra frase nombre'
).split(/\s+/).filter(w => w.length >= 4 && w.length <= 8);
