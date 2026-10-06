# Clues & Corpses (antes SherlockGame) — Plan de desarrollo

## Estado (6 oct 2026)

**F0–F6 hechas y probadas en el navegador. F7 hecha a medias.** Los 3 casos se pueden jugar de principio a fin.

```bash
npm install
npm run dev        # http://localhost:5550
npm run build      # check-cases + playthrough + tsc + vite → dist/ (≈220 KB gzip)
```

Cambios respecto al plan:
- **Escenarios hechos por código en Three.js**, sin Blender ni `.glb`, porque en esta máquina no hay Blender. Cada `src/cases/<id>/scene.ts` construye su escena con primitivas, texturas generadas en canvas, luces y partículas. Si llegan modelos, se cargan en ese mismo archivo.
- **Sonido sintetizado** con WebAudio (lluvia, temporal, fiesta, tictac, lacre, sello), sin archivos.
- **La solución va en claro en el JSON**, no como hash, porque el relato final también hay que mostrarlo. Si un día se cobra, se valida en un Worker.
- La validación tiene dos scripts: `tools/check-cases.mjs` comprueba los datos y `tools/playthrough.ts` resuelve cada caso con las reglas reales.

Falta de F7: probar en el Xiaomi real, sacar Lighthouse, desplegar en Cloudflare Pages (`dist/`), meter Cloudflare Web Analytics y las imágenes OG.

Web de casos de asesinato que se juegan **dentro de escenarios 3D** (Three.js). Te mueves por la escena haciendo clic, examinas objetos que son pistas, interrogas a los sospechosos, conectas pruebas en un tablero y acusas al culpable.

Referencia: detectiveos.net/cases. Sus casos traen 59–87 pruebas en 2D (fotos, transcripciones, registros), duran 100–140 min, cuestan 7,99 $ cada uno y se presentan como expedientes clasificados. **Lo que nos diferencia:** las pruebas no salen en una lista; tienes que encontrarlas en el escenario 3D, girarlas, mirarlas con la lupa y relacionarlas.

---

## 1. Decisiones clave

| Tema | Decisión | Por qué |
|---|---|---|
| Stack | **Vite + TypeScript + Three.js** (r17x), UI en DOM/CSS sin framework | La UI son paneles y un tablero; React no aporta lo suficiente para justificarlo |
| Postprocesado | `postprocessing` (pmndrs): bloom suave, viñeta, grano, desenfoque de profundidad (DOF) al inspeccionar, contorno al pasar el ratón | Es la única dependencia que de verdad cambia la estética |
| Cámara | **Nodos de cámara** (estilo point‑and‑click 3D) + mirar alrededor arrastrando + zoom limitado | Funciona con ratón y con el dedo, no hay colisiones que programar y el jugador nunca se pierde |
| Arte 3D | Blender + assets **CC0** (Poly Haven, Kenney, Quaternius, ambientCG) con **luz horneada** (lightmaps) | Mucha calidad visual y va fluido en móviles flojos |
| Formato | `.glb` con Draco + texturas KTX2, menos de 15 MB por caso, carga diferida por caso | Tiempos de carga cortos |
| Casos | **Basados en datos**: `cases/<id>/case.json` + `scene.glb`. El motor es genérico | Para añadir el caso 4 no hace falta tocar código |
| Convención en Blender | `node_<id>` (puntos de cámara), `clue_<id>` (objetos-pista), `look_<id>` (objetos que se pueden mirar pero no son pista), `suspect_<id>` | El motor engancha la interacción por el nombre del objeto |
| Backend | **Ninguno** en el MVP. Progreso en `localStorage` | Se publica como web estática en Cloudflare Pages, gratis |
| Antispoiler | La solución se guarda como **hash SHA‑256** de `culpable|método|móvil` y se compara con `crypto.subtle` | Así no se lee en texto plano en el JSON. Es un parche (`ponytail:`): si un día se cobra, la validación pasa a un Worker |
| Idioma | Español primero; los textos ya van en el JSON, así que añadir el inglés es solo traducir | — |

---

## 2. Dirección estética — «Gabinete de medianoche»

La interfaz es siempre la misma: **la mesa de un detective de noche**. Papel envejecido, tinta, latón y lacre rojo. Lo que cambia es el escenario 3D: cada caso tiene su propia luz y su propio clima. La interfaz es el despacho y cada escena es el lugar del crimen.

**Paleta (tokens CSS)**
- `--tinta: #14110F` (fondo, casi negro cálido)
- `--papel: #E8DEC8` / `--papel-sombra: #CBBF9F` (fichas, expediente)
- `--lacre: #8E1B1B` (acento único: sellos, hilo rojo, acusar)
- `--laton: #B08D57` (bordes, iconos, nodos de movimiento)
- `--verde-lampara: #1F3B2D` (paneles secundarios, tapete de la mesa)

**Tipografía** (Google Fonts)
- Títulos: **Bodoni Moda** (muy contrastada, aire de cartel de época; en cursiva para los nombres de los casos)
- Texto: **Newsreader** (serif de lectura, cómoda en textos largos)
- Documentos e informes: **Courier Prime** (máquina de escribir para transcripciones, informes forenses y registros)
- Notas a mano en el tablero: **Reenie Beanie**

**Textura y atmósfera**
- Grano de película y viñeta encima de todo; papel con ruido SVG (`feTurbulence`) en lugar de imágenes.
- En el 3D: niebla, partículas de polvo en los haces de luz, conos volumétricos falsos (malla aditiva) y tone mapping AgX.

**Cuatro momentos que se tienen que recordar**
1. **Abrir el expediente.** En la portada hay una carpeta 3D sobre la mesa con un sello de lacre. Al pulsar, el lacre se rompe (sonido + partículas), la carpeta se abre y la cámara entra en la foto de la escena, que se convierte en el escenario.
2. **La lupa de verdad.** Con Shift o una pulsación larga aparece una lente circular que amplía con una segunda cámara (render target) y una ligera distorsión en el borde. Sirve para ver detalles que a simple vista no se distinguen (micro‑texto, restos de sangre en un grabado, una fecha en un matasellos).
3. **El hilo rojo.** En el tablero de corcho arrastras de una foto a otra y se tiende un hilo rojo con física verlet que se balancea. Si la conexión es válida, se clava una nota escrita a mano con la deducción.
4. **Caso cerrado.** Al acusar, un sello de goma «CASO CERRADO» (o «ARCHIVADO SIN RESOLVER») cae sobre la ficha con un golpe seco y la cámara se queda quieta.

**Retratos de los sospechosos:** personajes low‑poly colocados en la escena y renderizados con un **shader de grabado o semitono** para la ficha policial. Todos siguen el mismo estilo y no cuestan nada.

**Movimiento:** curvas `cubic-bezier(.2,.8,.2,1)`, cámara con interpolación amortiguada (~0,9 s entre nodos), sin rebotes. Con `prefers-reduced-motion` se cambia a fundidos.

---

## 3. Sistemas de juego

1. **Exploración**
   - Anillos de latón en el suelo marcan a dónde puedes ir; al pulsar uno, la cámara viaja a ese nodo.
   - Arrastrando miras alrededor (yaw y pitch con límites) y con la rueda haces un poco de zoom.
   - El plano del lugar (esquina inferior) muestra los nodos visitados.
2. **Objetos**
   - Al pasar el ratón: contorno de latón y el cursor se convierte en lupa.
   - **Modo inspección**: el objeto se aísla delante de la cámara con el fondo desenfocado. Puedes girarlo 360° y acercarte, y tiene **puntos calientes** con acciones: leer, dar la vuelta, abrir, frotar con lápiz, luz UV y comparar con otra prueba.
3. **Expediente (cuaderno)**
   - Las pistas recogidas aparecen con una miniatura renderizada del objeto, la descripción y las notas automáticas del detective.
   - Contador «pistas encontradas X/Y» por escena.
4. **Sospechosos e interrogatorio**
   - Cada sospechoso tiene ficha (retrato, relación con la víctima, coartada) y una lista de declaraciones.
   - Puedes **presentar una prueba** contra una declaración. Si la contradice, se desbloquea una declaración nueva o una confesión parcial (al estilo Ace Attorney, pero sobrio).
5. **Tablero de deducción**
   - Conectas 2 o 3 pistas para formar una deducción, que se define en los datos: `{requires:[a,b], text, unlocks}`.
   - Las deducciones desbloquean opciones de método y de móvil para la acusación.
6. **Línea de tiempo**: arrastras los eventos conocidos a su hora. Si la ordenas bien, sale una deducción extra.
7. **Acusación final**
   - Eliges **Culpable + Método + Móvil**, solo entre opciones que ya hayas desbloqueado. Tienes 3 intentos.
   - Rango final: *Agente → Inspector → Detective → Sherlock*, según intentos, % de pistas encontradas, ayudas usadas y tiempo.
8. **Ayudas «Watson»**: 3 niveles por caso (empujón, dirección, casi solución). Usarlas penaliza el rango.
9. **Guardado**: estado completo por caso en `localStorage`, con botón de reinicio.
10. **Sonido**: ambiente en bucle por escena (lluvia en Londres, temporal en el faro, murmullo de fiesta), sonidos de papel y lacre y una música mínima. Todo CC0 (freesound.org con filtro CC0).

---

## 4. Esquema de datos (`case.json`)

```jsonc
{
  "id": "relojero",
  "title": "El relojero de Clerkenwell",
  "era": "Londres, 1889", "difficulty": 1, "minutes": 25,
  "briefing": "…",
  "scene": "scene.glb",
  "nodes":   [{ "id": "calle", "label": "Calle Amwell", "links": ["taller"] }],
  "clues":   [{ "id": "taza", "node": "taller", "name": "Taza de té", "desc": "…",
                "inspect": { "hotspots": [{ "id": "poso", "action": "lupa", "reveals": "…" }] } }],
  "suspects":[{ "id": "silas", "name": "Silas Reed", "role": "Aprendiz", "alibi": "…",
                "statements": [{ "id": "s1", "text": "…", "contradictedBy": "forense", "unlocks": "s1b" }] }],
  "deductions":[{ "id": "d_hora", "requires": ["reloj","forense"], "text": "La hora de la muerte se falseó", "unlocks": ["metodo_m2"] }],
  "timeline":[{ "id": "t1", "time": "21:30", "text": "…" }],
  "accusation": { "culprits": ["…"], "methods": [{ "id": "m2", "text": "…", "lockedBy": "d_hora" }], "motives": [] },
  "solutionHash": "sha256(culpable|metodo|movil)",
  "hints": ["…", "…", "…"]
}
```

**La única comprobación automática que necesitamos:** `npm run check-cases`. Verifica en cada caso que todas las pistas citadas existen y están en un nodo alcanzable, que toda deducción se puede formar, que la opción correcta de culpable, método y móvil se puede desbloquear y que el hash coincide con la solución. Si un caso no se puede resolver, el build falla.

---

## 5. Los 3 casos

> Los tres son de épocas distintas, con un hilo común: el jugador es detective del **Archivo Baker**, una oficina que reabre expedientes de cualquier época.

### Caso 01 — «El relojero de Clerkenwell»
**Londres, noviembre de 1889 · Dificultad: iniciación · ~25 min · funciona como tutorial**

**Ambiente:** luz de gas ámbar, lluvia en los cristales, niebla amarilla en la calle y el tictac de cuarenta relojes.

**El crimen:** el maestro relojero **Ambrose Tull** (61) aparece muerto en su taller con un golpe en la cabeza. La puerta estaba **cerrada con cerrojo por dentro** y la ventana tiene barrotes. A las 8:10 la tiraron abajo el aprendiz y el lechero.

**Escenario (4 nodos):** calle y puerta forzada → taller (banco, reloj de pie, escritorio) → cocina y despensa → buhardilla del aprendiz.

**Sospechosos**
| | Quién | Lo que parece | La verdad |
|---|---|---|---|
| ✦ | **Silas Reed**, aprendiz | Tiene coartada: estuvo en la taberna The Eagle hasta las 0:00 y el reloj de la víctima se paró a las 23:40 | **Culpable** |
| | Margaret Tull, sobrina y heredera | Sin coartada esa noche, con deudas, hereda el negocio | Pista falsa: estuvo empeñando joyas a escondidas |
| | Mrs. Pell, ama de llaves | El láudano del té es suyo | Pista falsa: Silas le pidió láudano «para las muelas» el día antes |
| | Julius Crane, relojero rival | Discutió a gritos con Tull a las 21:00 | Pista falsa: le estaba comprando los planos robados a Silas |

**Pistas (14)**
- Taza de té con un poso marrón (con la lupa se ve que es láudano).
- Frasco de láudano vacío en la papelera, con la etiqueta de la botica a nombre de Mrs. Pell.
- Reloj de bolsillo de la víctima, parado a las 23:40, con el cristal roto y **la corona sacada** (se paró a mano).
- Informe del forense (Courier): «sangre aún líquida a las 8:25; muerte hace menos de una hora».
- Cerrojo arrancado, con las astillas hacia dentro.
- Declaración del lechero: «el chico entró primero y se tiró sobre el cuerpo unos segundos; me mandó a por un agente».
- Llave de cuerda de latón del reloj de la torre, debajo del banco: está limpia, pero con la lupa se ve sangre en el dentado.
- Borrador de una carta en el escritorio: «Silas, mañana a primera hora hablaremos de los planos del escape…».
- Plano del escape patentado, con una esquina rota.
- Recibo de Crane con 40 soberanos «por planos», escondido en la buhardilla.
- Delantal de Silas con un trapo manchado en el bolsillo.
- Libreta de empeños de Margaret (pista falsa).
- Cuenta de la taberna The Eagle (confirma la coartada nocturna de Silas, que no sirve de nada).
- Los 40 relojes del taller van bien salvo uno (detalle que lleva a fijarse en el reloj de bolsillo).

**Deducciones clave**
- Reloj + forense → *la hora de la muerte se falseó*.
- Láudano + taza → *Tull estaba drogado, no muerto, por la noche*.
- Lechero + cerrojo → *el asesino estuvo a solas con él al abrir*.
- Carta + plano + recibo → *el móvil eran los planos vendidos*.

**Solución:** **Silas Reed.** *Método:* drogó el té de la noche con láudano, paró el reloj de su maestro a las 23:40 para tener coartada y por la mañana, al forzar la puerta con el lechero, lo mató con la llave de cuerda en los segundos en que estuvo a solas con él. *Móvil:* Tull había descubierto que vendía los planos del escape a Crane e iba a denunciarlo.

**Tutorial integrado:** el primer nodo enseña a moverse, la taza enseña la inspección y la lupa, el lechero enseña a presentar pruebas y el tablero llega con la primera deducción ya guiada.

---

### Caso 02 — «La luz de Punta Negra»
**Costa da Morte, Galicia, diciembre de 1957 · Dificultad: media · ~45 min**

**Ambiente:** temporal nocturno, el haz del faro barriendo la niebla, lluvia lateral, olas rompiendo, lámparas de parafina y azul pizarra frente al ámbar de la lámpara.

**El crimen:** el farero **Anselmo Rial** (58) aparece al pie de la escalera de caracol con la cabeza rota. Parece una caída. Esa misma noche **el faro estuvo apagado de 2:10 a 2:40** y el pesquero *Virxe do Mar* casi encalla. La tormenta tiene a todos aislados en el islote.

**Escenario (5 nodos):** muelle y caseta de botes → casa del farero (cocina y dormitorios) → escalera de caracol (el cuerpo) → sala de la linterna (lámpara y libro de registro) → cala de la Ensenada.

**Sospechosos**
| | Quién | Lo que parece | La verdad |
|---|---|---|---|
| ✦ | **Don Ramiro Castro**, médico del pueblo, de visita por la fiebre de Rosalía | Respetable; dice que no salió de su cuarto | **Culpable**: es el jefe de una red de contrabando de tabaco |
| | Benigno Souto, ayudante del farero | Le tocaba la guardia y se durmió; miente diciendo que no | Pista falsa: lo drogaron, y miente para no perder el puesto |
| | Rosalía Pazos, esposa de Anselmo | Póliza de vida firmada hace un mes | Pista falsa: la contrató Anselmo porque se sentía amenazado |
| | Lino Barreiro, marinero que trajo víveres | Esconde cajetillas de tabaco de contrabando en su barca | Pista falsa: es un contrabandista menor; solo lo usaban |

**Pistas (16)**
- Libro de registro. Última entrada de Anselmo: «1:30 · NO fuerza 9 · Lámpara OK». Entrada de Benigno, con letra temblorosa: «2:45 · Lámpara apagada al despertar, encendida».
- Depósito de parafina **medio lleno** y **válvula cerrada a mano**: el faro se apagó a propósito.
- Telegrama del patrón del *Virxe do Mar*: «perdimos la luz a las 2:10».
- Botella de aguardiente y vaso en el cuarto de Benigno, con un poso blanco (Veronal).
- Maletín del médico: le **falta un tubo de Veronal**, según su propia lista de existencias.
- Testimonio de Rosalía: «Don Ramiro le sirvió una copa a Benigno para el frío».
- Herida en la sien **redonda**, que no encaja con el canto recto de los peldaños (comparación en el modo inspección).
- Bastón del médico con empuñadura de plata abollada: con la lupa se ven restos de sangre en el grabado.
- Botón de asta en la mano del cadáver; a la chaqueta del médico le falta uno.
- Huellas de suela fina de cuero, embarradas, en la escalera. Las botas de goma de Benigno y Lino no coinciden; los zapatos del médico siguen húmedos.
- Hoja arrancada del diario de Anselmo. **Frotándola con lápiz** se lee: «…C. volvió a ofrecer dinero por apagar la luz los jueves. El lunes voy a la Guardia Civil».
- Agenda del médico: «J · 2:00 · Ensenada».
- Linterna con cristal rojo escondida en la cala (la señal para la lancha).
- Cajas de tabaco con la marca de la red en la caseta de botes.
- Póliza de vida firmada por el propio Anselmo (descarta a Rosalía).
- Cajetillas en la barca de Lino (pista falsa).

**Deducciones clave**
- Válvula + telegrama + registro → *el faro se apagó a propósito a las 2:10*.
- Veronal + maletín + testimonio → *Benigno fue drogado por el médico*.
- Herida + bastón + botón → *no fue una caída: lo golpearon arriba*.
- Diario + agenda + linterna → *la luz se apagaba para un desembarco de contrabando*.

**Solución:** **Don Ramiro Castro.** *Método:* drogó a Benigno con Veronal en el aguardiente, subió a las 2:00 a apagar la lámpara para el desembarco y, cuando Anselmo lo sorprendió, lo golpeó con el bastón y lo empujó escaleras abajo para que pareciera una caída. *Móvil:* Anselmo se negó al soborno e iba a denunciar la red a la Guardia Civil.

---

### Caso 03 — «Noche de inauguración»
**Madrid, barrio de las Letras, 2025 · Dificultad: experto · ~70 min**

**Ambiente:** galería de paredes blancas, luz fría de neón, una instalación de espejos que fragmenta la escena, música electrónica amortiguada y el resplandor verde de los monitores de seguridad.

**El crimen:** el galerista **Gonzalo Ibarra** (52), con alergia grave a los frutos secos, muere de **anafilaxia** dentro del almacén climatizado durante la fiesta de inauguración. Llevaba su autoinyector de adrenalina y lo usó, pero no le hizo efecto.

**Escenario (6 nodos):** sala principal (instalación de espejos) → barra del catering → despacho de dirección → almacén climatizado → cuarto de seguridad (CCTV y registro de tarjetas) → guardarropa y aseo del personal.

**Sospechosos (5)**
| | Quién | Lo que parece | La verdad |
|---|---|---|---|
| ✦ | **Irene Salvat**, socia de la galería | Dio el discurso de la noche; dice que no pisó el despacho | **Culpable** |
| | Teo Marín, el artista expuesto | Discutió a gritos con Gonzalo a las 20:50 | Pista falsa: descubrió que Gonzalo vendía falsificaciones de sus obras antiguas |
| | Álex Roldán, coleccionista | Estaba con él en el almacén y lo «encontró» | Pista falsa: compró una de esas falsificaciones y venía a reclamar |
| | Lucía Ferrer, chef del catering | Los canapés llevaban salsa satay (cacahuete) | Pista falsa: los etiquetó, y Gonzalo no comió nada |
| | Bruno Vidal, registrador de la galería | Borró 7 minutos de grabación del pasillo | Pista falsa: salió a fumar con una pieza pequeña para venderla |

**Pistas (20)**
- El autoinyector que llevaba la víctima: al girarlo en el modo inspección, la etiqueta raspada deja leer con la lupa «TRAINER — NO CONTIENE MEDICAMENTO».
- El autoinyector **real** aparece sin usar en el contenedor higiénico del aseo del personal.
- Botella personal de mezcal de Gonzalo en el despacho; un kit de detección da positivo en cacahuete en la botella, no en el vaso del catering.
- Testimonio de un camarero: «Gonzalo no probó nada; nunca come en las inauguraciones».
- Plato con canapés intacto en la mesa VIP (sin mordiscos).
- Etiquetas del catering con los alérgenos (Lucía cumplió).
- **Registro de tarjetas** (terminal interactivo en Courier): despacho 21:04 G. Ibarra · **21:13 I. Salvat** · 21:41 G. Ibarra; almacén 21:44 G. Ibarra; alarma 21:52.
- Declaración de Irene: «Estuve con la prensa de 21:00 a 21:30, no entré al despacho».
- Story de Instagram de un invitado (pantalla de móvil): a las 21:20 se ve a Irene con la tarjeta colgada, de vuelta del pasillo de dirección.
- Vídeo del discurso: la hora real del discurso es **21:22–21:31**, no 21:10, como dijo ella.
- Foto del hijo de Irene en su mesa + circular del colegio: «formación de alergias: se entrega a las familias un **dispositivo de entrenamiento**».
- Correo de Gonzalo a Irene: «El lunes, ante notario: disuelvo la sociedad y tu parte se liquida a valor contable».
- Póliza de **seguro de persona clave**: 1,2 M€ para el socio superviviente.
- Extractos con las deudas de Irene (dentro del bolso, en el guardarropa).
- Certificado de autenticidad con firma falsificada (sirve para el móvil de Teo y Álex; pista falsa).
- Mensajes de Álex reclamando el dinero (pista falsa).
- Hueco de 7 min en el CCTV del pasillo y log de borrado con el usuario de Bruno (pista falsa).
- Hoja de inventario: falta una pieza pequeña (explica a Bruno).
- Contraseña del ordenador del despacho escrita en un pósit debajo del teclado (da acceso al correo de disolución).
- Mapa de la galería con el recorrido de Gonzalo.

**Deducciones clave**
- Trainer + autoinyector real → *alguien cambió el autoinyector*.
- Mezcal + camarero + canapés → *el alérgeno no estaba en la comida, sino en su botella*.
- Registro de tarjetas + declaración de Irene + story + vídeo del discurso → *Irene mintió: estuvo en el despacho a las 21:13*.
- Foto del hijo + circular → *Irene tenía acceso a un dispositivo de entrenamiento*.
- Correo + póliza + deudas → *móvil económico*.
- Las pistas falsas tienen su propia deducción, que las cierra (por ejemplo, Bruno + inventario → *el borrado tapaba un robo, no un asesinato*).

**Solución:** **Irene Salvat.** *Método:* a las 21:13 entró en el despacho, puso polvo de cacahuete en la botella personal de mezcal de Gonzalo y cambió su autoinyector por el dispositivo de entrenamiento de su hijo; tiró el real en el aseo del personal. *Móvil:* Gonzalo iba a disolver la sociedad dejándola en la ruina, y su muerte le daba la galería y 1,2 M€ del seguro.

---

## 6. Estructura del proyecto

```
SherlockGame/
  index.html               portada «Archivo» (mesa 3D con los 3 expedientes)
  src/
    main.ts                arranque, router mínimo por hash (#/, #/caso/relojero)
    engine/
      scene.ts             renderer, postprocesado, carga de glb, bucle
      nodes.ts             cámara entre nodos + mirar libre
      pick.ts              raycast, hover, contorno
      inspect.ts           modo inspección, puntos calientes, lupa
    game/
      state.ts             estado del caso + guardado en localStorage
      deduce.ts            deducciones, contradicciones, desbloqueos, acusación
    ui/                    expediente, fichas, tablero (SVG + verlet), línea de tiempo, acusación
    styles.css             tokens, tipografía, grano
  public/cases/<id>/       case.json, scene.glb, audio/, thumbs/
  tools/check-cases.ts     el validador de casos que se puedan resolver
```
*(ponytail: sin capa de abstracción para «motores» ni sistema de plugins; si un caso necesita una mecánica única, se añade una acción nueva de punto caliente.)*

---

## 7. Fases

| Fase | Contenido | Hecho cuando… |
|---|---|---|
| **F0 · Base** | Vite + TS + Three, tokens CSS y fuentes, carga de `case.json` + glb, `check-cases`, despliegue en Cloudflare Pages | Una escena de prueba se ve en la URL pública |
| **F1 · Motor de exploración** | Nodos, mirar libre, hover con contorno, modo inspección, lupa. Pruebas sobre un *greybox* del caso 01 | Se recorre el taller en cajas y se inspecciona la taza con la lupa, con ratón y con el dedo |
| **F2 · Sistemas de juego** | Expediente, fichas e interrogatorio con pruebas, tablero con hilo rojo, línea de tiempo, acusación con hash, rangos, ayudas, guardado | El caso 01 se resuelve de principio a fin en greybox |
| **F3 · Caso 01 con arte** | Taller victoriano en Blender con luz horneada, personajes y retratos de grabado, audio, tutorial | Jugable completo y bonito; partida de prueba con alguien que no conoce la solución |
| **F4 · Portada y pulido de la interfaz** | Mesa del Archivo en 3D, apertura con lacre, sello de «caso cerrado», transiciones, reduced‑motion | Los 4 momentos de la sección 2 funcionan |
| **F5 · Caso 02** | Faro: escena, temporal (lluvia en partículas, haz giratorio), frotado con lápiz, comparación de heridas | `check-cases` en verde + partida de prueba |
| **F6 · Caso 03** | Galería: espejos (reflejos falsos con cubemap), terminal de tarjetas, pantalla de móvil, vídeo del discurso | `check-cases` en verde + partida de prueba |
| **F7 · Lanzamiento** | Rendimiento (30 fps o más en el Xiaomi, glb de menos de 15 MB), accesibilidad (teclado, contraste, subtítulos), Cloudflare Web Analytics, OG images | Lighthouse ≥ 90 en la portada y los 3 casos probados en el móvil |

**Fuera del MVP (cuando haya tracción):** cuentas y progreso en la nube, casos de pago (caso 01 gratis y los demás de pago, con la solución validada en un Worker), editor de casos, versión en inglés y casos semanales.

---

## 8. Riesgos

- **El arte 3D es el cuello de botella** (más que el código). Para mitigarlo: kits CC0 y luz horneada, y no modelar nada desde cero que ya exista en Poly Haven o Kenney.
- **Un caso que no se puede resolver o que es injusto.** Para eso están `check-cases` y una partida de prueba con alguien externo antes de cerrar cada caso.
- **Móvil**: arrastrar para mirar entra en conflicto con el scroll y el zoom de la página. Se usa canvas a pantalla completa con `touch-action: none` y se prueba en el móvil real, no en emulador.
- **Rendimiento del postprocesado** en GPU floja: un ajuste «calidad» que desactiva el DOF y el bloom.
