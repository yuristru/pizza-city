# Restaurantbetrieb

## Küche planen

Ausbau > Küchenplatten: über eine rechteckige Fläche ziehen und den gemeinsamen Kauf bestätigen. Bereits verlegte Platten werden übersprungen. Jede neue Platte kostet 50 DM. Eine Fläche ist ein einziger Undo-Schritt; ein ungültiges Feld verhindert den gesamten Kauf.

Mindestens neun orthogonal zusammenhängende Platten, mindestens drei breit **oder** hoch. Ofen, Tresen und Kühlschrank müssen vollständig auf einer solchen Fläche stehen. Geräte brauchen freie Nachbarfelder, zusammenhängende Arbeitswege auf Küchenboden und einen Zugang aus dem Gastraum. Bei mehreren Küchenflächen genügt eine vollständige, erreichbare Küche. Wände lassen sich ausschließlich durch ihre Türen passieren.

„Verschieben“ bewegt vorhandene Möbel kostenlos und erhält ihren Kaufpreis. Besetzte Tische und Geräte während laufender Bestellungen bleiben geschützt. „Neue Gäste stoppen“ unter Personal lässt die vorhandenen Gäste fertig werden. Küchenboden ist grün umrandet. Immobilien zeigen vor dem Kauf den tatsächlichen Grundriss mit Eingang und Türen.

Restaurants beginnen ohne Ofen, Tresen oder Kühlschrank. Auch die früher fest gezeichneten Weinregale und Musikautomaten wurden entfernt; Gegenstände entstehen ausschließlich aus der bearbeitbaren Einrichtung. Die Migration alter leerer Räume fügt keine kostenlosen Geräte hinzu. Bereits gespeicherte Geräte und deren Kaufpreise bleiben erhalten.

## Personal und Abläufe

Die Personalseite hat drei Ansichten:

- **Arbeitsmarkt:** Bewerbungen aus Küche und Service, mit eigenem generiertem Avatar, Monatsgehalt, Level und genau drei Kompetenzen. Das Zielrestaurant wird bei der Einstellung gewählt. Neue Bewerbungen ersetzen eingestellte Kandidaten.
- **Personalakten:** Liste aller eigenen Mitarbeitenden mit Fachbereichsfilter. Jede Person hat getrennte Dropdowns für Restaurantzuordnung und Schicht, einschließlich „Ohne Restaurant“. Avatar, Gehalt, Schicht und Kompetenzen bleiben bei Wechseln und beim Neuladen erhalten.
- **Restaurants:** Restaurantfilter, Übersicht der zugeordneten Leute und Monatskosten. Neue Gäste können hier pro Restaurant gestoppt werden, damit laufende Bestellungen fertig werden.

Die drei Kompetenzen der Küche sind Zubereitung, Backen und Organisation. Sie steuern Vorbereitungs-/Backdauer, Qualität und Bewegungstempo. Im Service sind es Tempo, Aufmerksamkeit und Freundlichkeit; sie steuern Laufgeschwindigkeit, Übergabezeit und den Einfluss auf Gästebewertungen. Werte liegen zwischen 0 und 100. Das Level von 1 bis 5 entspricht dem Durchschnitt, in Schritten von 20. Höhere Werte führen auf dem Arbeitsmarkt zu höheren Monatsgehältern.

Jede Filiale hat unabhängig null bis vier Personen je Fachbereich. Für neue Gäste müssen in der aktuellen Schicht mindestens ein Koch und eine Servicekraft arbeiten. Neue Filialen beginnen ohne Personal. Es gibt eine Mittagsschicht von 11:00 bis 16:00 Uhr und eine Abendschicht von 17:00 bis 23:00 Uhr. Die Restaurantansicht der Personalseite bietet zusätzlich einen Schichtfilter. Personen werden beim Einstellen und in den Personalakten einer Schicht zugeteilt. Bestehende anonyme Personalzahlen werden einmalig in benannte Mitarbeitende mit 50er-Kompetenzen umgewandelt. Alte Personalakten ohne Schicht übernehmen beim Laden die aktuelle beziehungsweise zuletzt beendete Schicht. Das Speicherschema Version 10 erhält Restaurantlayout, bestehende Einnahmen und Kosten sowie die komplette Personalliste und die Bewerbungen.

Mitarbeitende bleiben während ihrer Schicht auch ohne Aufgabe sichtbar. Bewegungen, Aufgabenwechsel und Leerlauf verwenden denselben Sprite je Person und die zuletzt erreichte Position. Zum Schichtende werden keine neuen Gäste aufgenommen. Das bisherige Team beendet die angenommenen Bestellungen, räumt die Teller ab und kehrt zum Tresen zurück; danach verschwinden die Personen zum Feierabend. Bei Beginn der nächsten Schicht erscheint das dafür eingeteilte Team. Ein Schritt über eine Schichtgrenze wird ebenso wie ein Tageswechsel geteilt. Gehälter bleiben feste Monatsgehälter und laufen anteilig auch außerhalb der Schicht weiter.

Ein Koch bearbeitet eine Bestellung gleichzeitig: Kühlschrank > Belegungsfläche > Ofen > Abholfläche. Jede der beiden Tresenflächen braucht einen eigenen freien Zugang. Die helle Fläche dient zur Vorbereitung, die grüne Fläche zur Übergabe fertiger Pizzen und zur Rückgabe benutzter Teller. Nach der Backzeit bringt der Koch die Pizza an die Abholfläche. Eine Servicekraft geht dorthin, übernimmt die Bestellung, liefert sie zum Tisch und geht zum Tresen zurück.

Nach dem Essen bleiben benutzte Teller sichtbar am Tisch. Der Tisch erhält erst neue Gäste, wenn die Servicekraft ihn abgeräumt hat. Sie trägt die Teller zur grünen Tresenfläche zurück und kann dort sofort die nächste fertige Pizza abholen. Rückgaben belegen kurz sichtbar die Übergabefläche, ohne die Zubereitungsfläche zu beanspruchen. Ein schmutziger Tisch und aktive Rückwege schützen Einrichtung und Personal vor Verschieben, Verkauf, Reset und Umverteilung.

Belegungsfläche, Ofen und Abholfläche haben jeweils Kapazität für eine Bestellung. Bei belegter Abholfläche bleibt die fertig gebackene Bestellung im Ofen, bis die Übergabe möglich ist. Die Aufgabe wird einer konkreten Person zugeteilt; ihr persönliches Aussehen, getragene Pizza oder Teller und die Drehung in Laufrichtung sind im Raum sichtbar. Wege beginnen am zuletzt erreichten Arbeitsplatz und folgen freien Zellen und tatsächlichen Türen. Entfernungen, Portionsanzahl, Kompetenzen und verfügbare Kräfte bestimmen die Wartezeit. Produktionsaufträge, benutzte Tische und Rückwege bleiben mit `chainVersion: 1` in den Restaurantdaten gespeichert und werden beim Laden fortgesetzt. Alte Aufträge ohne diese Daten werden mit ihrer bereits bezahlten Bestellung wieder aufgenommen.

Wer gerade an einer Bestellung arbeitet, kann bis zum Abschluss nicht umverteilt oder entlassen werden. Bereits fertig gekochte Bestellungen behalten ihre Qualitätswerte, wenn der Koch anschließend die Filiale wechselt. Entlassene Mitarbeiter sind erneut auf dem Arbeitsmarkt verfügbar.

Avatare entstehen deterministisch aus einem gespeicherten Seed: Hautfarbe, Haarfarbe, Frisur, Gesicht, Brille, Bart und Kleidung. Die Farben werden auch für die isometrischen Personal-Sprites verwendet. Es werden keine externen Bilddienste oder Portraitdateien benötigt.

## Nachfrage und Zufriedenheit

Standort, mittlerer Menüpreis, Angebotsauswahl, Renovierung, Pflanzen und Musik beeinflussen die Ankunftsrate. Piazzalage hat mehr Laufkundschaft als Flusslage. Volle Restaurants verlieren ankommende Gäste. Gäste, die länger als 90 Simulationssekunden auf ihr Essen warten, gehen ohne Bezahlung; verbrauchte Zutaten bleiben als Kosten verbucht.

Bewertungen liegen zwischen einem und fünf Sternen. Wartezeit und hohe Preise senken sie, Pflanzen verbessern sie. Abgebrochene Bestellungen erhalten einen Stern. Bewertungen wirken auf die weitere Nachfrage. Dies sind zunächst Spielwerte, die sich bei weiteren Spieltests anpassen lassen.

## Wirtschaft und Filialvergleich

Eine Spielstunde dauert bei Tempo 1 fünf reale Minuten. Der Betrieb aller gekauften Filialen läuft auch in der Stadt und im Pizzaeditor weiter. Pause hält Simulation und Kosten an. Es gibt keine Offline-Abrechnung.

Kosten pro Spielstunde:

| Position | Kosten |
| --- | --- |
| Personal | Summe der individuellen Monatsgehälter / 720 Spielstunden |
| Gebäudeunterhalt | 0,015 DM pro m² |
| Strom | 0,80 DM plus 0,35 DM je Ofen oder Kühlschrank |
| Zutaten | Rezeptkosten pro bestellter Pizza |

Ein Gehaltsmonat umfasst 30 Spieltage mit je 24 Stunden. Personen ohne Restaurantzuordnung werden weiter bezahlt; ihre Kosten und offenen Gehälter erscheinen separat in der Finanzübersicht und im Gesamtergebnis. Die Abrechnung erfolgt in Pfennig; Bruchteile werden bis zur nächsten Abbuchung gesammelt und gespeichert. Bei Geldmangel bleiben Kosten offen. Sie werden mit neuem Guthaben bezahlt; solange Kosten offen sind, kommen keine neuen Gäste. Der Kontostand wird dadurch nicht negativ.

Personal / Finanzen zeigt pro Filiale Umsatz, Zutaten, Löhne, Gebäude, Strom, Gewinn, Auslastung, Bewertung, mittlere Wartezeit in Spielminuten, bediente / verlorene Gäste und offene Kosten seit Spielbeginn. Gewinn = Umsatz minus Zutaten und laufende Kosten. Immobilienkäufe und Einrichtung sind Investitionen und nicht in diesem Betriebsergebnis enthalten. Gemeinsames Konto und Speisekarte bleiben erhalten. Einrichtungs-Undo erstattet nur die konkrete Änderung und lässt Betriebskosten und andere Filialen bestehen.

## Tagesabschluss

Die Finanzansicht öffnet zuerst den Tagesabschluss. „Heute“ zeigt laufende Werte; eine Auswahl enthält die letzten 30 abgeschlossenen Spieltage. Über den Restaurantfilter lassen sich eine Filiale oder alle Restaurants zusammen auswerten. Der bisherige Vergleich seit Spielbeginn bleibt unter „Filialvergleich“ verfügbar.

Um 00:00 Uhr werden alle Filialen und die Gehälter nicht zugeordneter Personen gemeinsam abgeschlossen. Ein Simulationsschritt über Mitternacht wird geteilt, bevor die Abrechnung gespeichert wird. Bestellungen und Gäste laufen weiter. Es gibt einen Hinweis und eine Markierung bei „Finanzen“. Der nächste Tag beginnt mit neuen Tageswerten, die Gesamtsummen bleiben bestehen.

Erfasst werden Umsatz, Zutaten, Löhne, Gebäude, Strom, Gewinn, bediente und verlorene Gäste, Wartezeit, Sitzplatzauslastung und Gästezufriedenheit. Die Bewertung eines Tages ergibt sich aus den Bewertungen an diesem Tag, nicht aus dem bisherigen Durchschnitt. Der Gesamtwert gewichtet Bewertungen, Wartezeiten und Auslastung nach den tatsächlichen Bewertungen, Gästen und Sitzplatzzeiten. Ohne Bewertungen erscheint kein erfundener Zufriedenheitswert.

Offene Kosten am Tagesende sind schon als Aufwand enthalten. Ihre spätere Bezahlung wird nicht nochmals als Kosten gebucht. Einrichtungs- und Immobilienkäufe sind Investitionen und verändern den Betriebsgewinn nicht. Gehälter ohne Restaurantzuordnung erscheinen separat im Gesamtergebnis. Eine untertags gekaufte Filiale wird ab dem Kauf erfasst. Ein begonnenes Spiel startet die Erfassung zu seiner aktuellen Uhrzeit; frühere Gesamtsummen werden nicht als Tagesumsatz übernommen. Der erste Abschluss ist entsprechend als Teil des Tages gekennzeichnet.

Das Speicherschema Version 10 erhält Tagesbeginn, Vergleichswerte, abgeschlossene Berichte und den zuletzt gelesenen Abschluss zusätzlich zu allen bisherigen Daten. Laden erzeugt keine nachträglichen Kosten oder zusätzlichen Abschlüsse. Eine Grafik zeigt Gewinn und Verlust der letzten sieben abgeschlossenen Spieltage mit direkt auswählbaren Tagen.

## Stadt

Die Fahrbahnen sind 0,60 bis 0,95 Weltzellen breit. Häuser verwenden ihre kalibrierten Fundamentmaße. Unterschiedlich lange Fronten, ausgesparte Endhäuser und zusätzliche Hofseiten bilden offene L-Gruppen und Hofgruppen mit mehreren Seiten. Drei eigenständige Hofgebäude, Plätze und neun kaufbare Standorte bleiben erhalten. Die Prüfung kontrolliert acht Karten auf Straßen-/Wasserkollisionen, Fundamentüberschneidungen und gemeinsame Gebäudekanten.

## Prüfung

`pizza-shifts-qa.mjs` und `pizza-shifts-browser-qa.cjs` prüfen leere Küchen, entfernte feste Gegenstände, beide Schichten und deren Zuordnung, sichtbare Personen bei Leerlauf und Produktion, das Fertigarbeiten zum Schichtende ohne neue Gäste, die nächste Mittagsschicht, alte Personalakten und die Bedienung auf kleinen Bildschirmen.

Personaltests: `pizza-staff-qa.mjs` und `pizza-staff-browser-qa.cjs` prüfen Arbeitsmarkt, Gehaltsabstufungen, drei Kompetenzen, Zuordnung, laufende Aufgaben, Avatare, Monatsabrechnung und Speichermigration. `pizza-daily-qa.mjs` und `pizza-daily-browser-qa.cjs` prüfen Tagesgrenzen, eine Zahlung über Mitternacht, korrekte Kosten und Gewichtung, neue Filialen, 30-Tage-Historie, Filter, Gewinnkurve, alte Spielstände und erneutes Laden. `pizza-production-qa.mjs` und `pizza-production-browser-qa.cjs` prüfen beide Tresenflächen, konkurrierende Köche, Ofen- und Übergabekapazität, sichtbare Pizza-/Tellertransporte, gesperrte Tische, Abräumen, unmittelbare nächste Abholung, Speichern mitten im Arbeitsgang und die mobile Anleitung. Die Betriebsprüfungen `pizza-business-qa.mjs` und `pizza-business-browser-qa.cjs` bleiben erhalten. Dazu bestehen weiterhin die Prüfungen für Küchen, Laufwege, Speichermigration, Restaurantwechsel, Grundrisse, Preise, Stadt und responsive Bedienung. Browserprüfungen starten mit gestoppter Simulation, damit zeitabhängige Kosten die Kauf- und Undo-Prüfungen nicht verfälschen.
