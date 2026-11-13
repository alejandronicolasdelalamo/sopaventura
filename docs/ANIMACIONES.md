# Catálogo de animaciones y cómo ajustarlas

Reglas generales: se animan solo `transform` y `opacity` (o `clip-path` en las líneas), con tiempos de 80–900 ms y curva `--ease` (`cubic-bezier(.2,.8,.2,1)`). Se respeta "reducir movimiento" del sistema y el interruptor de *Ajustes*: ambos reducen todo a un instante (`src/style.css`, final del archivo).

| Animación | Dónde | Cómo ajustarla |
|---|---|---|
| Fichas del título que caen | Inicio · `@keyframes drop` | `animation-delay: calc(var(--i) * 70ms)` en `.tile` |
| Nubes que flotan | Inicio y mapa · `@keyframes drift` | `animation-duration` en `.cloud`, `.island::before/::after` |
| Botones que se hunden | `.btn:active` | `translateY(4px)` y `transition .08s` |
| Nodos del mapa que aparecen | `@keyframes pop` | `animation-delay: calc(var(--k) * 40ms)` en `.node` |
| Nivel actual que late | `.node.next` · `@keyframes bob` | `1.2s steps(2)` |
| Línea al encontrar palabra | `.bar.found` · `@keyframes reveal` | `.28s steps(6)` (efecto "pixel") |
| Letras que rebotan | `.cell.bounce` · `@keyframes bounce` | retardo por letra en `game.ts` (`i * 45`) |
| Fallo (tablero tiembla) | `.board.shake` | `.3s steps(4)` |
| Pista parpadeando | `.cell.hint` | `.7s steps(2)` |
| Palabra tachada | `.word.done` | `pop .35s` |
| Texto flotante (+puntos, frases) | `floatText` en `game.ts` | duración 900 ms, desplazamiento 34 px |
| Estrellas del resultado | `.big-star` · `@keyframes starin` | `animationDelay = 300 + i*260 ms` en `game.ts` |
| Confeti pixelado | `src/ui/confetti.ts` | parámetro `count`, `COLORS`, gravedad `0.22`, vida de partículas |
| Monedas que vuelan al contador | `flyCoins` en `src/ui/dom.ts` | duración `800 + i*60 ms`, número de monedas |
| Ventanas (modal) | `.modal` · `@keyframes modalin` | `.3s` |
| Avisos (toast) | `.toast` · `@keyframes toastin` | duración en `toast(text, ms)` |
| Ola de pintado | `src/paint/engine.ts` → `WAVE_MAX_MS = 900` | tope de duración de la ola; velocidad `min(34, 900/distanciaMax)` ms por casilla |
| "Pop" de cada casilla pintada | `engine.draw` (pops) | `280` ms y escala `1.45` |
| Deshacer (ola inversa) | `engine.apply` (`t:'u'`) | `min(20, 500/n)` ms por casilla |
| Pulso del color elegido | `engine.draw` | `sin(now/240)` y alfa `.28–.70` |
| Check del color completo | `.swatch.done .sw-check` y `.swatch.celebrate` | `@keyframes cele` |
| Cámara (zoom a una pista) | `engine.flyTo` | `dur: 450` |
| Inercia al arrastrar | `engine.frame` | fricción `0.94` por fotograma |
| Revelado final | `engine.revealFinal(ms)` | 2800 ms (barrido de brillo + fundido a imagen suave) |
| Time-lapse | `engine.playTimelapse(ms)` | 7000 ms por defecto |
| Sobre que se abre / carta | `.envelope`, `.env-flap` | `.7s` |
| Carta que se escribe sola | `final.ts` | 2 letras cada 28 ms |
| Olaf que salta | `.olaf.hop`, `.loading-olaf`, `.win-olaf` | `@keyframes hop` |
| Cursor de carga | `.spinner` | `1s steps(4)` |

**Sonido y háptica:** `src/ui/audio.ts` (notas y volúmenes de cada efecto) y `src/ui/haptics.ts` (patrones de vibración, p. ej. `buzz([40,60,40])`).
