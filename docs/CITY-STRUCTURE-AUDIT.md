# PizzaCity: vom Einzelhaus zum Stadtgefüge

Stand: 11. Oktober 2026. Untersucht wurde der Spielstand `4b54867`, einschließlich der zuletzt ergänzten L- und U-Palazzi. Der zugehörige Versuch ist unter [pizza-city-study.html](../pizza-city-study.html) ausführbar. Er verwendet die echten Texturen, die tatsächlichen Anker, Alpha-Auswahlflächen, die 2:1-Projektion und Pixi 8.22 des Spiels. Er verändert weder den Stadtgenerator noch Spielstände.

## Befund und Empfehlung

Der größte nächste Hebel sind zusammenhängende Straßenfronten mit kontrollierten Anschlüssen und bewusst begrenzten Rücksprüngen. Ein anderes Straßennetz hilft, ersetzt diese Aufgabe aber nicht. Die neuen L- und U-Sprites sind als große Formen nützlich, stellen jedoch noch kein anschlussfähiges Gebäudesystem dar.

Ein begrenzter Mischansatz erscheint nach dem Versuch am praktikabelsten: geeignete Bestandshäuser für freistehende Bauten, besondere Standorte und Zeilenenden behalten; eine kleine anschlussfähige Gebäudefamilie für dichte Fronten erproben; wenige vorbereitete Gruppen für komplizierte Ecken oder Höfe verwenden. Das ist eine Arbeitshypothese, keine Entscheidung für einen vollständigen modularen Renderer.

Zuerst sollte **eine** kurze Front mit Ecke, Restaurantzugang und unregelmäßigem Innenbereich die untenstehenden Abnahmekriterien bestehen. Erst dann lohnt es sich, diese Bausteine im Generator zu verteilen. Weitere großflächige Straßen- oder Asset-Umbauten wurden in dieser Studie deshalb nicht vorgenommen.

## 1. Ursachen getrennt betrachtet

| Ebene | Im vorhandenen Code / Bild beobachtet | Auswirkung |
| --- | --- | --- |
| Straßennetz | `cityLayout()` erzeugt 6 durchgehende Straßen entlang einer Achse, dazu 30 Abschnitte entlang der anderen. Die Standardkarte hat 42 Knoten und 66 Verbindungen. | Versetzte Einmündungen lockern eine Achse auf; die durchgehenden Querbänder bleiben erkennbar. |
| Blockgeometrie | Alle 25 Bauflächen bleiben Rechtecke. Die 9 inneren Blöcke sind standardmäßig 5,3 bis 8,4 Einheiten breit und 6,3 bis 7,4 tief. | Größenvariation ist vorhanden, lange schmale Blöcke, zusammengesetzte Bauflächen oder tatsächlich zusammengelegte Blöcke fehlen. |
| Zufall | Der Seed vertauscht die 9 inneren Quartiere und versetzt einige Straßen um höchstens 0,35 Einheiten. Die Anzahl und Grundstruktur der Straßen bleibt gleich. | Neue Karten verändern Standorte und Details stärker als die städtebauliche Struktur. |
| Platzierung | `block()` setzt die meisten Häuser über feste Ankerabstände wie `left=2.25`, `back=2.4`, `front=h-.7`. Vier Varianten verschieben oder ergänzen Einzelhäuser. | Keine gemeinsame Fassadenlinie aus tatsächlichen Gebäudetiefen; viele unabhängige Baukörper und breite Restflächen. |
| Assets | Fast alle kleinen Häuser besitzen zwei ausgearbeitete Schauseiten und ein eigenes, umlaufendes Dach. Einige enthalten Vorplätze, Treppen, Markisen und Bepflanzung. | Körper können sich am Sockel berühren, während Dach oder Ausstattung an derselben Grenze kollidieren. |
| Maßstab | Spritebreite wird überwiegend als Zielwert in Pixeln festgelegt, nicht aus einer vereinbarten Grundfläche abgeleitet. | Verschiedene grafische Maßstäbe und Gebäudetiefen werden mit weitgehend denselben Platzierungsabständen kombiniert. |
| Freiräume | Fast sämtliche freien Landflächen werden zunächst gepflastert; eine Ausnahme ist der benannte Park. | Zufällige Lücken und absichtliche Plätze sehen ähnlich aus. Der Straßenraum reicht optisch weit über den Asphalt hinaus. |
| Darstellung | `objects.sortableChildren=true`; Sprite und Akteur erhalten `zIndex=iso(x,y).y`. Beschriftungen liegen in einer separaten Ebene darüber. | Für einfache getrennte Häuser oft ausreichend, für konkave Hofbauten oder überlappende Flügel kein allgemeiner Nachweis korrekter Tiefe. |

Quellen im Repository: [Stadtlayout](../pizza-city-layout.js), [Platzierung und Sortierung](../pizza-city.js), [Boden](../pizza-city-ground.js), [Atlas und Aufbereitung](../pizza-city-art.js).

## 2. Was die vorhandenen Grafiken tatsächlich erlauben

### Projektion und Maßstab

Der Bestand enthält 24 kleine Häuser / Gebäudetypen, 2 Hofbauten und 2 Wahrzeichen. Bei 19 dieser 28 Grafiken sind drei Bodenkontaktpunkte erfasst. Eine affine Korrektur richtet **die beiden daraus gemessenen Kanten** auf Steigungen +0,5 und -0,5 aus. Vertikale Linien bleiben vertikal. Das beweist weder, dass alle gemalten Gesimse gleich verlaufen, noch dass alle Grundrisse dieselben Proportionen haben.

Die ersten 8 Häuser und das Kolosseum haben keine solche Kalibrierung; ihr Anker liegt an der unteren Mitte des zugeschnittenen Bildes. Bei den übrigen kleinen Häusern bestimmt weiterhin die Zielbreite des Bildes den Maßstab. Erst die beiden Hofbauten kalibrieren zusätzlich eine gemessene Kante in Rastereinheiten.

Auch diese Hofbauten passen noch nicht vollständig auf ihre Idealgeometrie: Beim U-Sprite beträgt das Verhältnis der beiden am Vorderpunkt gemessenen Kanten `301/73`, also etwa 4,12 statt der vorgesehenen 4. Eine Steigungskorrektur beseitigt diese Längenabweichung nicht. Die blauen Diagnoseflächen im Versuch sind daher **geplante** Grundflächen, kein pixelgenauer Beweis. Die zuvor ergänzte Belegungsprüfung prüft das Modell, nicht jede sichtbare Bildkante.

Aus den vorhandenen Messpunkten ergeben sich bei den acht Zusatzhäusern angenäherte Sockelmaße zwischen 0,97 und 1,72 Einheiten entlang einer Achse und 1,48 bis 2,58 entlang der anderen. Bei Spezialgebäuden reichen sie ungefähr von 1,50 bis 2,06 beziehungsweise 0,79 bis 1,73. Darunter sind Sockel, Treppen und Vorflächen; diese Werte sind nicht automatisch die Wandgrundrisse. Die Unterschiede sind zu groß, um alle Gebäude als gleiches 2×2-Haus zu behandeln.

### Eignung nach Familien

| Bestand | Sinnvoll weiterverwenden | Was für direkte Anschlüsse fehlt |
| --- | --- | --- |
| Schlichte Zusatzhäuser, z. B. `buildings` 8, 10, 12 | Einzelhäuser, Zeilenenden, Maßstabsreferenz; erste Kandidaten für Bearbeitung | Anschlussseite ohne umlaufenden Dachüberstand; sichtbare Brandwand bei Höhenunterschieden; verifizierter Wandgrundriss |
| Ladenhäuser, z. B. `buildings` 9 und 11 | Restaurants oder Geschäfte an freien Ecken | Markisen und Dekoration an der gemeinsamen Wand entfernen oder separat schalten; Eingangspunkt definieren |
| Schmale / tiefe Varianten, z. B. `buildings` 15 | Schmale Parzellen, einzelne vertikale Akzente | Eigene Tiefenklasse statt derselben Platzierungsregel wie quadratische Häuser |
| Markt, Rathaus, Theater, Kirche | Bewusst offene Vorplätze und besondere Orte | Als normale Zeilenmodule ungeeignet; Treppen, Vorplätze und Auskragungen als eigene Freihaltezonen erfassen |
| L- und U-Palazzi | Vorbereitete größere Bauformen, lokaler Formvergleich | Alle Bodenecken überprüfen; Anschlüsse außen festlegen; bei begehbaren Höfen Tiefe nachweisen |
| Wahrzeichen | Orientierungspunkte mit eigenem Freiraum | Nicht über allgemeine Reihenhausregeln skalieren oder dicht einpacken |

Die PNGs haben transparente Außenflächen, jedoch teilweise grafisch fest eingebaute Sockel, Treppen, Pflanzen und Vorflächen. Eine Alpha-Grenze trennt Bild von Transparenz, nicht zuverlässig Gebäude von Gehweg oder Schatten. Pauschales Zuschneiden oder engeres Schieben wäre deshalb keine sichere Bereinigung.

Es fehlt insbesondere eine bewusst gezeichnete gerade Anschlussfamilie, passende Eckansichten in beiden benötigten Ausrichtungen und ein Abschluss für sichtbare höhere Nachbarwände. Einfaches Spiegeln würde zugleich Licht, Ausstattung und Eingangsseite spiegeln.

## 3. Der Testabschnitt und sein Ergebnis

[Interaktive Studie öffnen](../pizza-city-study.html). Alle Varianten sind aus einzelnen vorhandenen Spielgrafiken zusammengesetzt; es gibt kein generiertes Gesamtbild und keine retuschierten Übergänge.

| Versuch | Aufbau | Was er zeigt | Was er nicht beweist |
| --- | --- | --- | --- |
| 01 Freistehend | Vier unterschiedliche Häuser an einer Front, zwei rückwärtige Häuser als Ecke, ein Gegenüber; je 0,7 Abstand zwischen Nachbarn | Einzelobjektwirkung trotz vorhandener Vielfalt; Einfluss des gesamten Straßenraums | Keine exakte Kopie einer Produktionskarte |
| 02 Kante an Kante | Dieselben Häuser und Maßstäbe, gemessene Sockelkanten unmittelbar aneinander, gemeinsame vordere Fassadenlinie | Deutlich geschlossenerer Gesamteindruck. Gleichzeitig bleiben eigene Walmdächer, überschneidende Überstände, Markisen und wechselnde Höhen sichtbar | Keine bereits produktionsreife Anschlussfamilie; Sockelkontakt allein ist kein bestandener visueller Anschlusstest |
| 03 Hofgruppe | U-Palazzo, zwei Nachbarhäuser, bewusste Passage und Gegenüber | Zusammenhängende Dachlandschaft und eindeutiger Innenbereich mit wenigen Sprites | Noch keine beliebig kombinierbare Blockform; der große Baukörper hat eine feste Silhouette und nur einen Sortieranker |

Regler verändern die Fahrbahn und den Rücksprung auf beiden Seiten unabhängig. Die Grundflächen lassen sich einblenden, Häuser transparent schalten und die Diagnosefigur verschieben. Häuser sind über ihre tatsächliche Alpha-Auswahlfläche anklickbar. Die Rolle „Restaurant im Test“ ist ein Auswahlversuch, keine neue kaufbare Immobilie.

Die Figur wird wie im Spiel nach einem einzigen Bodenpunkt sortiert. Ihre rosa Bodenmarkierung liegt zur Diagnose darüber. Bei der Hofgruppe muss zwischen echter Verdeckung durch den vorderen Flügel und falscher Verdeckung durch eine eigentlich hinter der Figur liegende Fassade unterschieden werden. Der Transparenzmodus erleichtert diesen Vergleich; er ist **keine** vorgeschlagene Lösung für die endgültige Darstellung.

Der kleine Versuch hat 7 beziehungsweise 4 Gebäudesprites. Er genügt, um Anschlussprobleme am konkreten Material sichtbar zu machen. Er ist weder ein Leistungstest einer vollständigen Stadt noch ein Nachweis aller Blick- und Höhenkonstellationen.

## 4. Straßenbreite als Fassadenabstand

Die Produktionsfahrbahn ist bereits von ungefähr 2 auf 0,75 bis 1,1 Rastereinheiten verengt. Das sichtbare Bord-/Gehwegband reicht zusätzlich rund 0,28 auf jede Seite. Die Blockgrenzen liegen pauschal 0,65 von den Straßenachsen entfernt; die eigentlichen Häuser stehen nochmals innerhalb dieser Blöcke. Somit sind Rücksprung, Gehweg und Fahrbahnbreite derzeit nicht als einheitlicher Querschnitt entworfen.

Im kontrollierten Versuch gilt:

`Fassadenabstand = Fahrbahn + 2 × Gehweg + 2 × Rücksprung`

| Fahrbahn | Gehweg pro Seite | Rücksprung pro Seite | Fassadenabstand |
| --- | --- | --- | --- |
| 0,85 | 0,28 | 0,65 | 2,71 |
| 0,85 | 0,28 | 0,00 | 1,41 |
| 0,75 | 0,28 | 0,65 | 2,61 |

Der letzte Fall macht den Unterschied deutlich: Eine weitere Fahrbahnverengung um 0,10 verändert wenig, solange zusammen 1,30 Rücksprung bleiben. Die Zahlen sind Testquerschnitte, keine Messung sämtlicher Produktionsstraßen und keine Meterangaben.

Auch Verkehr setzt Grenzen: Das gezeichnete Auto hat einen Körper von 0,8 × 0,34 Einheiten. Die Fahrspuren liegen bei ±0,16; damit ist ihr Abstand von 0,32 sogar geringfügig kleiner als die Körperbreite. Das ist eine kleine bestehende grafische Überschneidung bei unmittelbar nebeneinanderliegenden Fahrzeugen. Eine weitere Fahrbahnverengung sollte daher nicht pauschal für Gegenverkehr erfolgen. Fußgänger laufen mit festem Abstand 0,67 von der Straßenachse, unabhängig von der Straßenklasse. Beide Werte sollten erst zusammen mit einem abgestimmten Querschnitt angepasst werden.

Sinnvolle Testklassen wären eine Nebenstraße mit Gegenverkehr, eine schmalere Gasse ohne Gegenverkehr und ein größerer Platz-/Hauptstraßenraum. Exakte Breiten sollten anhand derselben Häuser, Menschen und Fahrzeuge gewählt werden, statt vorab reale Meter vorzutäuschen.

## 5. Tiefe, Zugang und Bedienbarkeit

`place()` und `tickCity()` sortieren nach `16 × (x+y)`. Das berücksichtigt nur einen Punkt pro Sprite. Ein konkaves Gebäude kann zugleich hinter einer Figur und mit einem anderen Flügel vor ihr liegen. Ein anderer einzelner Anker löst diesen Widerspruch nicht allgemein. Auch Sortierung nach der Rechteckmitte wäre dafür kein ausreichender Ersatz.

Für die nächste kleine Anschlussfamilie sollten drei Möglichkeiten geprüft werden:

| Möglichkeit | Vorteil | Preis / Grenze |
| --- | --- | --- |
| Vorbereitete Gruppe als ein Sprite, Hof zunächst nicht begehbar | Geringer Aufwand, wenige Objekte, interne Anschlussstellen zeichnerisch kontrollierbar | Feste Form; Interaktion mehrerer Häuser braucht eigene Zonen; Hinterhofdetails können verdeckt bleiben |
| Größere logische Gebäude, wenige separat sortierbare Flügel | Mehr Kontrolle an Hof und Durchgang, ohne jede Fassade zu zerlegen | Flügel brauchen konsistente Schnittstellen; Sortierregeln und Überlappungen müssen überprüft werden |
| Vollständige modulare Wand-/Dachteile | Größte Freiheit bei Form und Höhe | Viel höherer Asset-, Kombinations- und Prüfaufwand; heute noch nicht begründet |

Zuerst ist eine konkrete fehlerhafte Überdeckung zu isolieren. Nur wenn sie mit einem einfachen Baukörper nicht lösbar ist, sollte dieser in wenige Zeichenebenen oder Flügel aufgeteilt werden. Keine globale Sortierarchitektur allein auf Verdacht umbauen.

Die Stadtfußgänger folgen derzeit dem Straßengraphen und wählen an Kreuzungen neue Kanten. Es gibt **keine Stadt-Routenplanung zu Restauranttüren** und keine Verknüpfung mit der separaten Restaurant-Innenraumsimulation. Die neue Dichte darf deshalb nicht als bereits funktionsfähiger Zugang beschrieben werden.

Restaurants reagieren auf Alpha-Treffer und ein zusätzliches Schild. Kaufgebäude besitzen eigene IDs und Marker; alle Schilder werden nach den Weltobjekten gezeichnet. Einnahmehinweise richten sich in der Stadt nach `restaurantSign`. Dadurch bleiben Labels sichtbar, können aber über einem Nachbargebäude schweben. Bei dichter Bebauung braucht der Test einen definierten Türpunkt, eine kurze freie Verbindung zum Gehweg und eine nachvollziehbare Label-/Auswahlposition. Das bestehende Ziehen-gegen-Antippen-Verhalten muss erhalten bleiben.

## 6. Praktikable Richtungen

| Ansatz | Erwarteter sichtbarer Effekt | Aufwand relativ | Wesentliche Grenze |
| --- | --- | --- | --- |
| Nur Platzierung und Rücksprünge verbessern | Schnell dichter; unabsichtliche Restflächen nehmen ab | Niedrig bis mittel | Bestehende Dach-/Seitenanschlüsse bleiben problematisch |
| Kleine kompatible Familie plus weitergenutzter Bestand | Geschlossene Fronten mit kontrollierter Individualität | Mittel; wenige gezielte neue Grafiken und Metadaten | Zunächst beschränkte Tiefen-, Höhen- und Eckkombinationen |
| Wenige vorbereitete Hausgruppen | Sehr schnell überzeugende interne Ecken und Dachanschlüsse | Mittel, einfache Darstellung | Wiedererkennbare Großformen; pro Haus getrennte Interaktion erforderlich |
| Vollmodularer Blockbau | Potenziell sehr variable Formen | Hoch, einschließlich Prüfmatrix und Sortierung | Für den ersten Nachweis unnötige Komplexität |

Empfehlung: Platzierungsregeln und eine kleine kompatible Familie gemeinsam erproben; komplizierte Ecken bei Bedarf als vorbereitete Gruppe. Nicht sofort alle vorhandenen Assets ersetzen und nicht aus jedem Block denselben Vierseitenhof machen.

Für den nächsten Asset-Versuch reichen als bewusst enges Ziel zwei anschlussfähige Straßenhäuser mit gleicher Tiefe und unterschiedlicher Fassadenbreite, ein passendes Eckhaus sowie ein sichtbarer Abschluss / eine Brandwand für einen Höhenversatz. Eine Passage kann zunächst bewusst freigehalten werden. Beide Straßenorientierungen benötigen einen überprüften Blick; Varianten dürfen nicht ungeprüft gespiegelt werden. Farb- und Fensterabweichungen sind erst nach erfolgreichem Formanschluss sinnvoll. Neue Rasterbilder sollten gegen eine exakte geometrische Vorlage geprüft werden, nicht durch bloße Prompt-Vorgaben als maßhaltig gelten.

Die wenigen nötigen Gemeinsamkeiten sind Bodenkontakt und Maßstab, definierte Anschlussflächen, kompatible Dachüberstände, gekennzeichnete freie Seiten sowie ein Türpunkt. Breite, Höhe, Fassadengestaltung und rückwärtige Tiefe dürfen danach innerhalb geprüfter Kombinationen variieren. Wie diese Angaben gespeichert werden, kann erst nach dem ersten gelungenen Paar entschieden werden.

## 7. Straßennetz erst aus den Bauformen weiterentwickeln

Nach einem bestandenen Anschlussversuch sollten wenige **unterschiedliche räumliche Muster** erprobt werden: eine längliche Front mit rückwärtigen Anbauten, eine offene Ecke, ein dicht gefüllter kurzer Block und ein kleiner Platz. Nicht vier gleichartige Zeilen um gleich große Hofquadrate anordnen.

Das vorhandene zusammenhängende Straßengraph-Modell ist dafür eine brauchbare Grundlage. Einzelne Querabschnitte könnten kontrolliert entfallen und benachbarte Flächen verbinden. Dabei sind neue Baubänder und Fußwege wichtiger als zufällige Knicke. Erst aus diesen überprüften Mustern lässt sich entscheiden, ob ein explizites Zentrums-/Randgebietssystem benötigt wird oder wenige Auswahlregeln genügen.

## 8. Was eine generierte Karte später bestehen muss

- Das Straßennetz bleibt zusammenhängend; zusätzliche Sackgassen sind beabsichtigt und enden plausibel.
- Belegte Wandgrundflächen und Freihaltezonen schneiden keine Fahrbahn oder Wasserfläche. Dächer dürfen eine ausdrücklich erlaubte Auskragung besitzen; diese ist von Bodenkollision zu trennen.
- Gemeinsame Fassadenlinien treffen innerhalb einer vereinbarten Pixeltoleranz aufeinander. Nicht passende Nachbarn werden abgelehnt, statt durch verdeckte Überlappung passend gemacht.
- Eingänge wichtiger Orte haben einen freien Weg zum Gehweg; kleine Restflächen dürfen bewusst leer bleiben.
- Kein wichtiger Standort wird bei normalem Zoom ausschließlich durch ein verdecktes Pixel auswählbar. Schild und Einnahmehinweis bleiben eindeutig zuordenbar.
- Höhenwechsel, Innen-/Außenecken und beide Straßenrichtungen bestehen eine visuelle Matrix. Fußgänger vor, hinter und zwischen Gebäuden werden korrekt verdeckt.
- Viele Seeds werden auf Geometrie und Erreichbarkeit geprüft; ergänzend wird eine überschaubare Auswahl ungünstiger Karten visuell kontrolliert. Reproduzierbarkeit allein reicht nicht.
- Eine Karte muss mehrere erkennbare Blockformen und Freiraumtypen enthalten, ohne eine starre Mindestfüllung jedes Restgrundstücks zu erzwingen.

Die bisherigen Tests prüfen bereits Straßengraph, Eigenschaften, Zufallsreproduzierbarkeit, Hof-Belegungszellen und Ausweichdarstellung bei fehlenden Bildern. Sie prüfen noch keine vollständige Anschlussmatrix, alle gemalten Dachüberstände oder Tür-Erreichbarkeit. Der neue Studientest prüft reale Sprite-Ladung, gemeinsame gemessene Sockelkanten, den veränderbaren Fassadenabstand, die Hof-Diagnose, mobile Bedienung und unveränderte Spielstände.

## 9. Technischer Aufwand und mobile Grenzen

Der Boden wird derzeit einmal pro Karte in eine Textur von 2688 × 1344 Pixeln gerastert, etwa 13,8 MiB für unkomprimierte RGBA-Pixel ohne weitere Kopien oder GPU-Verwaltungsaufwand. Jedes Atlasbild wird in einzelne, kleinere Canvas-Texturen aufbereitet. Die vollständig dekodierten Quelldateien, temporäre Canvas-Daten und GPU-Texturen sind unterschiedliche Speicherposten. Mehr Varianten kosten daher auch dann Speicher, wenn nicht jede gerade sichtbar ist.

Spritezahl ist nicht gleich Zahl der Draw Calls; Pixi kann einiges bündeln, Texturwechsel und Sortierung beeinflussen das Ergebnis. Eine feste Behauptung wie „ein Modul = ein Draw Call“ wäre hier falsch. Ein Grundriss aus drei großen Flügeln ist voraussichtlich günstiger zu verwalten als Dutzende kleine Wandteile, aber das muss auf einem echten Zieltelefon gemessen werden.

Ein sinnvoller nächster Vergleich verwendet dieselbe Kamerafahrt und denselben Gebäudebestand in beiden Anordnungen: Ladezeit, Texturspeicher soweit messbar, Szenenobjekte, Zeit für Kartenerzeugung sowie mediane und hohe Framezeiten beim Ziehen. Headless-Browsertests beweisen Funktion, keine mobile Bildrate. Für diese Studie wurde deshalb kein unbelegtes FPS-Ziel als bereits erreicht gemeldet.

## Abnahme des nächsten kleinen Bauabschnitts

1. Mindestens drei unterschiedliche Häuser ergeben eine durchgehende Front und eine saubere Ecke bei normalem Spielzoom.
2. Ein Höhenwechsel besitzt eine plausible sichtbare Wand; Dächer und Markisen durchdringen Nachbarhäuser nicht.
3. Der Innenbereich ist absichtlich asymmetrisch oder teilweise bebaut, statt ein weiterer standardisierter Hofkasten zu sein.
4. Ein Restaurant ist per Bild und Schild auswählbar; sein Türpunkt hat eine freie Verbindung zum Gehweg.
5. Eine Figur vor, hinter und im Innenbereich erzeugt keine falsche Verdeckung. Falls ein Hof unzugänglich bleiben soll, wird das bewusst festgelegt.
6. Dieselben Bausteine ergeben mindestens zwei glaubwürdige Anordnungen, ohne jedes Mal die Bilder nachzubearbeiten.

Der vorliegende Versuch besteht den technischen Aufbau mit echten Sprites und macht die Grenzen sichtbar. Er besteht ausdrücklich noch nicht die endgültige visuelle Anschlussabnahme. Genau diese Unterscheidung sollte die nächste Entscheidung über Generator und neue Assets bestimmen.
