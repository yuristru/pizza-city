# Restaurantqualität, Pizza-Angebot und Stadtzeiten

## Stadtzeiten

Die Spieluhr entscheidet, unabhängig von der Bildrate und vom Stadt-Seed:

| Zeit | Rampencrew | Parkkontakte | Laternen |
| --- | --- | --- | --- |
| 00:00 bis 07:00 | abwesend | unter einzelnen Parklaternen | an |
| 07:00 bis 12:00 | abwesend | auf Parkbänken | aus |
| 12:00 bis 19:00 | auf den Rampen | auf Parkbänken | aus |
| 19:00 bis 24:00 | sitzend auf der Skaterbank | unter einzelnen Parklaternen | an |

07:00 entspricht dem Beginn der bestehenden Morgendämmerung. Die Skaterbank bleibt auch ohne Crew stehen. Nachts bleiben die verlassenen Parkbänke sichtbar. Die beiden Nachtkontakte haben dieselben logischen Kontakt-IDs und Auftragskanäle wie ihre Gegenstücke am Tag; vorhandene Aufträge bleiben gültig. Telefonzellen sind immer erreichbar. Der Kontaktführer erklärt die Zeiten und zeigt nachts den tatsächlichen Laternenstandort. Schlafende Skater lassen sich weder anklicken noch über einen offenen Dialog oder ein Geschenk umgehen.

## Restaurantstatus

`pizza-quality.js` ist die gemeinsame Quelle für Simulation und Oberfläche. Kein separater gespeicherter Status kann nach einem Umbau veralten.

Alle Komponenten haben Werte von 0 bis 2:

- Tische: Kunststoff 0, Holz 1, Premium 2, gewichtet nach Sitzplätzen.
- Renovierung: Ausbaustufe 0 / 1 / 2 / 3 wird auf 0 / 0,67 / 1,33 / 2 abgebildet.
- Ausstattung: Mittelwert aus Ofen, Kühlschrank und Tresen. Pro Gerätetyp zählt die beste vorhandene Variante, zusätzliche Exemplare erhöhen die Qualität nicht. Elektrisch / Stein / Profi: 0 / 1 / 2. Kompakt / Kühlraum: 0 / 2. Rustikal / Gekachelt / Marmor: 0 / 1 / 2. Fehlende Geräte zählen 0.

Gesamtwert = 40 % Tische + 30 % Renovierung + 30 % Ausstattung. Unter 0,65: Einfach. Ab 0,65: Mittel. Ab 1,4: Gehoben, aber nur, wenn jede einzelne Komponente mindestens 1 erreicht. Pflanzen und Automaten kaufen keinen Restaurantstatus.

## Zutatenklasse

Mozzarella, Basilikum, Zwiebeln und Paprika sind die einfache Basis. Oliven, Pilze, Schinken und Salami bilden die mittlere Klasse. Parmesan und Thunfisch sind die exklusiven Zutaten; ihre Portionskosten betragen jetzt 12 bzw. 14 Pfennig.

Für die Klassifikation zählen je Zutat höchstens acht gesetzte Portionen. Ab sechs nicht einfachen Portionen ist eine Pizza mittel. Gehoben verlangt mindestens sechs exklusive Portionen, mindestens 35 % exklusiven Anteil und mindestens zwei verschiedene Zutaten. Ein einzelner Parmesan-Klecks oder hundert identische Stempel machen keine exklusive Komposition. Die tatsächlichen Zutatenkosten werden weiterhin für jede einzelne gesetzte Portion berechnet.

## Faire Verkaufspreise pro Pizza

Die Speisekarte gilt weiterhin für die gesamte Kette. Die Preisprüfung hat deshalb einen Filialwähler.

| Restaurantstatus | Einfache Pizza | Mittlere Pizza | Gehobene Pizza |
| --- | ---: | ---: | ---: |
| Einfach | 8,50 DM | 10,50 DM | 12,50 DM |
| Mittel | 10,00 DM | 14,50 DM | 17,00 DM |
| Gehoben | 11,00 DM | 17,00 DM | 23,50 DM |

Ab einem Pfennig über der Grenze erscheint die rote Preiswarnung. Gehobene Zutaten über dem Restaurantniveau bleiben ein Passungsrisiko, auch wenn ihr Preis niedrig ist. Eine bewusst einfache Pizza in einer gehobenen Pizzeria verursacht dagegen keinen automatischen Passungsabzug.

## Nachfrage und Bewertungen

Die drei bestehenden, endlichen Viertel-Kundenpools bleiben erhalten, inklusive Konkurrenz, Werbung und Taxiempfehlungen. Restaurantstatus bestimmt die Hauptzielgruppe. Menü-Zutatenklasse, Preis und Sterne beeinflussen die Attraktivität für jede Zielgruppe. Gäste wählen im Rahmen ihres Budgets bevorzugt eine Pizza ihrer Zutatenklasse.

Beim Bestellen werden Preis, Zutatenkosten, faire Preisgrenze und Passung festgehalten. Umbau oder Preisänderung während des Essens verändert diese Bestellung nicht. Der Bewertungsabzug wird erst bei der Zahlung angewendet:

- Preisabzug: dreimal der relative Preisaufschlag über die faire Grenze.
- Passungsabzug: 0,8 Sterne je Zutatenklasse über dem Restaurantstatus.
- Zusammen höchstens vier Sterne Abzug; Wartezeit, Service und kleine Dekorationsboni wirken weiterhin. Die Bewertung bleibt zwischen einem und fünf Sternen.

Es gibt keinen pauschalen Abzug mehr allein deshalb, weil eine Pizza mehr als 10 DM kostet. In der Auslastungsansicht steht der letzte Bewertungsgrund. Der Sterne-Nachfragefaktor ist `(Sterne / 4)^2`, begrenzt auf 0,08 bis 1,5: zwei Sterne ergeben ein Viertel des Gewichts von vier Sternen. Wettbewerb und Kapazität bestimmen die tatsächlichen Gästezahlen.

Spielstände bleiben Version 13. Neue Bestellungen speichern ihre Erwartungen optional; alte laufende Bestellungen bleiben erhalten und erhalten keinen nachträglich erfundenen Preis- oder Passungsabzug. Bereits gebuchte Zutatenkosten bleiben unverändert.

## Prüfung

`tests/pizza-quality-qa.mjs` prüft Qualitätsgrenzen, vollständigen Ausbau, Zutatenkomposition und Stempelbegrenzung, Preisgrenzen, Sterne-Nachfrage, Bewertung erst beim Bezahlen, gespeicherte Erwartungen und exakte Zeitgrenzen. `tests/pizza-quality-browser-qa.cjs` prüft echte Kartenklicks bei Tag und Nacht, Bank und Rampen, schlafende Crew, Laternen, Filialstatus und Preiswarnungen auf 320, 393, 844 und 1280 Pixeln.

## Aktuelle Platzauslastung und Mindestbesetzung

Die Restaurantanzeige zeigt jetzt die aktuelle Platzauslastung: tatsächlich sitzende Gäste (wartend oder essend) geteilt durch alle vorhandenen Sitzplätze. Acht Gäste auf acht Plätzen sind 100 %, acht Gäste auf sechzehn Plätzen sind 50 %. Ankommende Gäste werden separat ausgewiesen. Die Auslastungsansicht und jede Werbe- oder Taxi-Prognose zeigen diesen Live-Balken vor der weiterhin getrennten Tagesprognose. Die Tagesprognose berücksichtigt zusätzlich Arbeitswege, Tischwechsel, Küche und Service, damit freie Stühle keine unmöglichen Werbeversprechen auslösen.

Je Schicht genügen genau eine Person in der Küche und eine Person im Service als Mindestbesetzung, auch für große Restaurants. Die bestehende Simulation hat keine Personalpflicht je Tisch oder Sitzplatz. Größere Restaurants benötigen daher keinen zweiten Angestellten, um Gäste zu bedienen. Zusätzliche Arbeitskräfte bleiben optional; fehlende Geräte oder blockierte Arbeitswege müssen weiterhin behoben werden.

## Italienische Brücken und private Innenhöfe

Brücken erhalten warmen Travertin, segmentierte Steinbögen über dem Wasser, helle gemauerte Brüstungen und vier eiserne Laternen. Der befahrbare Verlauf und die vorhandenen Straßenrouten bleiben identisch. Die Laternen folgen demselben nächtlichen Lichtwechsel wie die Parklaternen.

Jeder geschlossene Häuserblock bekommt einen deterministisch aus dem Stadt-Seed gewählten Innenhofgarten: Zitronenhof, Kräutergarten oder geometrischer Garten mit Brunnen. Grünflächen, Steinwege und terrakottafarbene Pflanzbeete passen sich an die freie Fläche an. Kleine Höfe erhalten kleine Pflanzen; größere zusätzlich Brunnen und Bänke. Der bestehende Zugang wird freigehalten, kein Element ersetzt Häuser oder Straßen. Die Gartenplanung ist getrennt vom Renderer und für 420 verschiedene Größen und Seeds auf Begrenzungen und freie Zugänge geprüft.
