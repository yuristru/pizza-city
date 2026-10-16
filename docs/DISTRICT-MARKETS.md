# Viertelmärkte und Konkurrenz

Jedes der sieben Geschäftsviertel hat einen festen Kundenpool pro Spieltag. Die
Kunden gehören zu den Schichten Einfach, Mittel und Gehoben. Ihre Preisgrenzen
liegen bei 9, 15 und 24 DM pro Pizza. Die Werte und Viertel stehen in
`pizza-market.js`. Der Stadt-Zufallsknopf ändert keine Marktkonten.

## Aufteilung und Gäste

Geöffnete und betriebsbereite eigene Filialen und die örtlichen Konkurrenten
teilen jeden Pool nach Attraktivität. Die Attraktivität berücksichtigt pro
Sitzplatz gewichtete Möbelqualität, Renovierungsstufe, Bewertung und passende
Angebote auf der Speisekarte. Ein Grundgewicht für nicht gewonnene Kunden
verhindert, dass ein einzelner ungeeigneter Anbieter automatisch alle Menschen
im Viertel erhält. Gute Polsterstühle und hoher Ausbau wirken besonders auf die
gehobene Schicht. Unbezahlbare Angebote erzeugen in der betreffenden Schicht
keine Nachfrage.

Der Pool wird während der elf Öffnungsstunden portionsweise freigegeben. Eine
frühe Zweiergruppe beim Öffnen wird ebenfalls vom selben Pool abgezogen und nur
einmal pro Standort und Tag angeboten. Reservierte Kunden, reale Gäste und die
Nachfrage der passiven Konkurrenz dürfen den Pool zusammen nicht überschreiten.
Ein Standort hält höchstens 16 noch nicht eingetroffene Kunden pro Schicht vor.
Nicht bediente Nachfrage wird nicht am Folgetag gutgeschrieben.

Die Gruppenaufnahme im tatsächlichen Service muss Kunden aus diesem Kontingent
abrufen. Sie übernimmt die Schicht und wählt ein Angebot innerhalb ihres Budgets.
Bestehende Küche, Tischkapazität und Personal bestimmen weiterhin, ob Gäste
bedient werden können. Geschlossene, unmöblierte oder nicht betriebsbereite
Filialen ziehen im laufenden Betrieb keine Nachfrage ab.

Die Kaufansicht zeigt alle drei Pools, heute unvergebene Kunden, örtliche
Konkurrenten und weitere geöffnete eigene Filialen. Der prognostizierte Anteil
ist eine Einschätzung für regulären Betrieb und berücksichtigt noch keine
Kapazitätsgrenze. Leere Objekte werden mit Holzstühlen und Renovierung 1 bewertet.
Es gibt 18 kaufbare Objekte mit eigenen Spielständen, Grundrissen und Schildern.

## Sabotage

| Aktion | Kosten | Entdeckungsrisiko | Strafe | Wirkung bei Erfolg |
| --- | ---: | ---: | ---: | --- |
| Ordnungsamt | 750 DM | 8 bis 45 %, je Gespräch | 15.000 DM | 45 % weniger Nachfrage, 6 Spielstunden |
| Kakerlaken | 2.400 DM | 42 % | 45.000 DM | 80 % weniger Nachfrage, 24 Spielstunden |
| Stinkbombe | 1.200 DM | 28 % | 24.000 DM | 65 % weniger Nachfrage, 4 Spielstunden |
| Fassade | 900 DM | 36 % | 18.000 DM | 25 % weniger Nachfrage, 12 Spielstunden |

Aufträge werden bei Stadtkontakten oder in Telefonzellen erteilt, siehe `CITY-UNDERWORLD.md`. Kosten fallen einmalig beim Beauftragen an. Die Ausführung folgt nach 30 bis 90 Spielminuten. Entdeckte Aktionen scheitern und lösen die
volle Strafe aus. Verfügbares Geld wird sofort belastet, der Rest bleibt als
Schuld erhalten und wird aus späterem Guthaben eingezogen. Alle Aktionen und
Strafen erscheinen als Kosten der gesamten Kette im Tagesabschluss und im
Filialvergleich. Eine ausstehende Strafe sperrt weitere Aktionen. Ein Ziel kann
während einer laufenden Wirkung oder sechs Stunden nach einem Versuch nicht
erneut angegriffen werden. Bestehende Gäste der Konkurrenz werden nicht rückwirkend
zu eigenen Kunden; erst künftige Nachfrage wird umverteilt.

## Speicherung und Prüfung

Spielstandversion 13 übernimmt alle bisherigen Versionen. Aufträge, Auftragsnummern und bereits festgelegte Zufallsergebnisse bleiben beim Laden erhalten. Poolkonten, ausstehende
Kunden, Effekte, Sperrzeiten, Strafen und Schulden werden gespeichert. Das Neuladen
setzt Tageskontingente nicht zurück. Bei Tageswechsel beginnt ein neuer Pool.
Die neuen Objekte verwenden bestehende erprobte Raumformen mit eigener Identität.

`tests/pizza-market-qa.mjs` prüft Erhaltung der Pools, Konkurrenz, Klassen,
Preisgrenzen, Tageswechsel, Speicherung, Wirkungen, Strafen und Abrechnung.
`tests/pizza-market-browser-qa.cjs` prüft Migration, Kauf, echte Gäste, Kontakte,
Finanzen, Neuladen, Kartenwechsel und responsive Dialoge.
Die beiden `pizza-underworld`-Prüfungen decken Kontakte, Telefonate, Aufträge,
Wirkungen, Strafen und Tagesgrenzen ab. Die bestehenden
Stadt-, Raum-, Service- und Tagesabschlussprüfungen bleiben aktiv.
