# Altstadtviertel mit geschlossenen Straßenfronten

Stand: 15. Oktober 2026. [Testviertel öffnen](../pizza-oldtown-study.html?v=20261015d).

Das Testviertel setzt den geplanten ersten Bauabschnitt um: drei an allen vier Straßenkanten bebaute Wohnblöcke, eine schmale Gasse und eine durch angrenzende Häuserfronten und zwei zusätzliche Zeilen eingefasste Piazza. Es verwendet die vorhandenen Spieltexturen mit dem Pixi-Renderer. Der Spielgenerator und gespeicherte Partien werden nicht geändert.

## Gestalterische Grundlage

- [Lucca, Piazza dell'Anfiteatro, Visit Tuscany](https://www.visittuscany.com/en/attractions/the-roman-amphitheater-of-lucca/): ein Platz erhält seine räumliche Form durch zusammenhängende umliegende Häuser. Für die Studie wird dieses Prinzip in die festen 2:1-Achsen übersetzt, nicht die elliptische Form kopiert.
- [Bologna, The Bolognese Portico, Comune di Bologna](https://portici.comune.bologna.it/en/publications/bolognese-portico): die Bebauung und ihre Arkaden begleiten den Straßenraum. Große Restflächen zwischen Fahrbahn und Hausfassaden sind kein angestrebter Normalfall.
- [Siena, UNESCO](https://whc.unesco.org/en/list/717): das Stadtgefüge enthält neben zusammenhängenden Baugruppen auch Plätze, historische Gärten und Grünräume. Dichte wird deshalb über geschlossene Straßenränder mit bewusst freigehaltenen Höfen und einem öffentlichen Platz erzeugt.

Die Belegungsquote ist ein Gestaltungsziel dieser Spielstudie, keine statistische Kennzahl italienischer Altstädte. Die Vorgabe von höchstens zwei Geschossen bleibt bestehen.

## Aufbau

`pizza-city-perimeter.js` ist ein reines, vom Renderer unabhängiges Grundrissmodell. Zuerst werden vier Eckhäuser platziert. Die vier verbleibenden Straßenfronten werden anhand der gemessenen Breiten beziehungsweise Tiefen mit Bestandshäusern belegt. Ihre natürlichen Maße werden nicht als identische Standardzellen behandelt.

Ein begrenzter Suchlauf füllt die gesamte jeweilige Front. Die ausgewählten Bilder werden dafür ausschließlich als Ganzes gleichmäßig verkleinert, mit einem gemeinsamen Faktor zwischen 0,9 und 1 pro Zeile. Es gibt keine nichtproportionale Streckung, Bilddrehung, Spiegelung oder Vergrößerung über die bestehende Fassadenhöhenbegrenzung. Beide 2:1-Richtungen und die Vertikalen bleiben erhalten. Die Wiederverwendung der Bestandsbilder ist ein Anschlusstest, noch keine neue speziell gezeichnete Dach-/Brandwandfamilie.

Jeder Wohnblock besitzt genau einen 0,55 Einheiten breiten, zusammenhängenden Durchgang an seiner Südseite. Nur dieser geplante Zugang unterbricht den Blockrand. Drei Seiten sind vollständig geschlossen; die Seite mit dem Zugang ist zu rund 92 % bebaut. Über alle Straßenfronten der drei Wohnblöcke ergibt sich gerundet 98 %. Innenhöfe und Zugänge bleiben frei von Gebäudegrundflächen.

Die Restaurantbilder haben jeweils einen Punkt am straßenseitigen Eingang und einen freien Annäherungspunkt auf dem Gehweg. Bild und darüberliegendes Schild können ausgewählt werden. Die ergänzende Piazza-Bebauung ist eine L-förmige Folge einzelner Häuser und kein weiteres großes konkaves Sprite.

## Bedienung und Vergleich

- Geschlossene Blöcke und eine offenere Anordnung desselben Viertels lassen sich direkt vergleichen. Letztere ist eine Vergleichsanordnung mit weggelassenen Seitenbauten, keine exakte Reproduktion einer bestimmten gespeicherten Spielkarte.
- Ansichten: ganzes Viertel, Gasse, Piazza und einzelner Häuserblock. Auf schmalen Geräten startet die Seite mit der näheren Gassenansicht.
- Ziehen, Mausrad, Zoomtasten und Zwei-Finger-Zoom bewegen die Kamera.
- Die transparente Hofansicht ist ein Diagnosewerkzeug zur Beurteilung des Blockinneren. Sie ist kein Ersatz für die normale Tiefensortierung und nicht als allgemeiner Darstellungsmodus des Spiels vorgesehen.
- Fußgänger bewegen sich auf den öffentlichen Gassen und dem Platz. Die Innenhöfe werden in dieser Studie nicht als simulierte Fußgängerziele betreten. Die geometrische Durchgängigkeit ihrer Zugänge wird separat geprüft.

## Prüfung

`node tests/pizza-city-perimeter-qa.mjs` prüft 69 reproduzierbare Viertel auf mindestens 90 % Bebauung an jeder Straßenkante, vier Eckhäuser pro Wohnblock, überschneidungsfreie Grundflächen, freie Höfe und Zugänge, Restaurant-Annäherungspunkte und ausschließlich gleichmäßige Verkleinerung.

`node tests/pizza-oldtown-study-browser-qa.cjs` prüft die echten Texturen, die Zwei-Geschoss-Grenze, die Vergleichsanordnung, Hof- und Platzansichten, Schilder, Zoom und Verschieben, einen echten Zwei-Finger-Zoom im Browser, 320/393 Pixel breite Mobilansichten und Querformat sowie unveränderte gespeicherte Partien. Die visuelle Kontrolle gilt den gemalten Dachüberständen und Fassaden zusätzlich zur Grundrissprüfung.

## Übernahme in die Spielstadt

Die geschlossenen Blöcke sind jetzt die reguläre Wohnbebauung. `closedCityBlock` übernimmt die variablen Parzellen des Stadtgenerators und belegt ihre vier Seiten vollständig, mit genau einem 0,36 Einheiten breiten Zugang im Westen. Damit bleiben auch bei kleinen Randparzellen mindestens 90 % jeder Straßenkante bebaut. Plätze, Parks, Wasserflächen und die beiden Wahrzeichen bleiben bewusste Ausnahmen.

Pflichtstandorte werden vor den Füllhäusern auf die vier Ecken verteilt: neun Kaufobjekte, zwei eingeschossige Lager, das Spielerrestaurant und drei Konkurrenten. Ein deterministischer Suchlauf passt die Eckkombinationen und die gleichmäßige Verkleinerung der Häuser an die gemessenen Grundflächen an. Er berücksichtigt die maximale Breite der Seitenflügel und hält Innenhöfe sowie Zugänge frei. Restauranttische stehen im eigenen Hof. Wichtige Schilder werden nach der Skalierung über dem jeweiligen Dach platziert.

Die Zwei-Geschoss-Grenze und die echte 2:1-Projektion bleiben erhalten. Bei ausgefallenen Atlanten bleiben die kalibrierten Grundflächen verfügbar; einfache prozedurale Ersatzhäuser verwenden dieselben Maße. Der Spielstand und die Identitäten der Standorte ändern sich nicht.

Die Modellprüfung wurde um 128 vollständige Stadtgrundrisse erweitert. Die Browserprüfung prüft 32 Städte mit allen vier Kanallagen auf geschlossene Straßenfronten, überschneidungsfreie Häuser, freie Höfe und Durchgänge sowie vollständige Standortlisten. Die bestehenden Tests für Kauf, Lager, Konkurrenz, Restaurantwechsel, Kamera, Mobilansicht und fehlende Atlanten bleiben aktiv.

Die gemalten Dachüberstände und Fassaden bleiben Bestandsgrafiken. Speziell aufeinander abgestimmte Brandwände bei Höhenwechseln sind eine mögliche spätere grafische Verfeinerung.
