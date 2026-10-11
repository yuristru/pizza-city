# Restaurantbetrieb

## Küche planen

Ausbau > Küchenplatten: über eine rechteckige Fläche ziehen und den gemeinsamen Kauf bestätigen. Bereits verlegte Platten werden übersprungen. Jede neue Platte kostet 50 DM. Eine Fläche ist ein einziger Undo-Schritt; ein ungültiges Feld verhindert den gesamten Kauf.

Mindestens neun orthogonal zusammenhängende Platten, mindestens drei breit **oder** hoch. Ofen, Tresen und Kühlschrank müssen vollständig auf einer solchen Fläche stehen. Geräte brauchen freie Nachbarfelder, zusammenhängende Arbeitswege auf Küchenboden und einen Zugang aus dem Gastraum. Bei mehreren Küchenflächen genügt eine vollständige, erreichbare Küche. Wände lassen sich ausschließlich durch ihre Türen passieren.

„Verschieben“ bewegt vorhandene Möbel kostenlos und erhält ihren Kaufpreis. Besetzte Tische und Geräte während laufender Bestellungen bleiben geschützt. „Neue Gäste stoppen“ unter Personal lässt die vorhandenen Gäste fertig werden. Küchenboden ist grün umrandet. Immobilien zeigen vor dem Kauf den tatsächlichen Grundriss mit Eingang und Türen.

## Personal und Abläufe

Jede Filiale hat unabhängig null bis vier Köche und Servicekräfte. Mindestens je eine Kraft ist zum Öffnen nötig. Neue Filialen beginnen ohne Personal. Bestehende eingerichtete Küchen bekommen bei der Migration je eine Kraft; die Auswahl wird danach gespeichert.

Ein Koch bearbeitet eine Bestellung gleichzeitig: Kühlschrank > Tresen > Ofen > Tresen. Eine Servicekraft bringt die fertige Bestellung vom Tresen zum Tisch. Bewegung folgt freien Zellen und tatsächlichen Türen. Entfernungen, Portionsanzahl und verfügbare Kräfte bestimmen die Wartezeit. Die Arbeit ist im Raum sichtbar. Es gibt aktuell keine individuelle Namens- oder Schichtverwaltung.

## Nachfrage und Zufriedenheit

Standort, mittlerer Menüpreis, Angebotsauswahl, Renovierung, Pflanzen und Musik beeinflussen die Ankunftsrate. Piazzalage hat mehr Laufkundschaft als Flusslage. Volle Restaurants verlieren ankommende Gäste. Gäste, die länger als 90 Simulationssekunden auf ihr Essen warten, gehen ohne Bezahlung; verbrauchte Zutaten bleiben als Kosten verbucht.

Bewertungen liegen zwischen einem und fünf Sternen. Wartezeit und hohe Preise senken sie, Pflanzen verbessern sie. Abgebrochene Bestellungen erhalten einen Stern. Bewertungen wirken auf die weitere Nachfrage. Dies sind zunächst Spielwerte, die sich bei weiteren Spieltests anpassen lassen.

## Wirtschaft und Filialvergleich

Eine Spielstunde dauert bei Tempo 1 fünf reale Minuten. Der Betrieb aller gekauften Filialen läuft auch in der Stadt und im Pizzaeditor weiter. Pause hält Simulation und Kosten an. Es gibt keine Offline-Abrechnung.

Kosten pro Spielstunde:

| Position | Kosten |
| --- | --- |
| Koch | 12 DM je Kraft |
| Service | 8 DM je Kraft |
| Gebäudeunterhalt | 0,015 DM pro m² |
| Strom | 0,80 DM plus 0,35 DM je Ofen oder Kühlschrank |
| Zutaten | Rezeptkosten pro bestellter Pizza |

Die Abrechnung erfolgt in Pfennig; Bruchteile werden bis zur nächsten Abbuchung gesammelt und gespeichert. Bei Geldmangel bleiben Kosten offen. Sie werden mit neuem Guthaben bezahlt; solange Kosten offen sind, kommen keine neuen Gäste. Der Kontostand wird dadurch nicht negativ.

Personal / Finanzen zeigt pro Filiale Umsatz, Zutaten, Löhne, Gebäude, Strom, Gewinn, Auslastung, Bewertung, mittlere Wartezeit in Spielminuten, bediente / verlorene Gäste und offene Kosten seit Spielbeginn. Gewinn = Umsatz minus Zutaten und laufende Kosten. Immobilienkäufe und Einrichtung sind Investitionen und nicht in diesem Betriebsergebnis enthalten. Gemeinsames Konto und Speisekarte bleiben erhalten. Einrichtungs-Undo erstattet nur die konkrete Änderung und lässt Betriebskosten und andere Filialen bestehen.

## Stadt

Die Fahrbahnen sind 0,60 bis 0,95 Weltzellen breit. Häuser verwenden ihre kalibrierten Fundamentmaße. Unterschiedlich lange Fronten, ausgesparte Endhäuser und zusätzliche Hofseiten bilden offene L-Gruppen und Hofgruppen mit mehreren Seiten. Drei eigenständige Hofgebäude, Plätze und neun kaufbare Standorte bleiben erhalten. Die Prüfung kontrolliert acht Karten auf Straßen-/Wasserkollisionen, Fundamentüberschneidungen und gemeinsame Gebäudekanten.

## Prüfung

Neue Tests: `pizza-business-qa.mjs` und `pizza-business-browser-qa.cjs`. Dazu bestehen weiterhin die Prüfungen für Küchen, Laufwege, Speichermigration, Restaurantwechsel, Grundrisse, Preise, Stadt und responsive Bedienung. Browserprüfungen starten mit gestoppter Simulation, damit zeitabhängige Kosten die Kauf- und Undo-Prüfungen nicht verfälschen.
