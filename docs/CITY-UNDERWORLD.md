# Die andere Seite der Stadt

Die bisherigen Sabotageknöpfe an Konkurrenzgebäuden sind durch Orte in der Stadt ersetzt. Der neue Sprechblasenknopf öffnet eine Übersicht mit Kartenfokus und Auftragsjournal. Ein Auftrag lässt sich erst beim anklickbaren Kontakt oder in einer Telefonzelle erteilen. Die Konkurrenzansicht zeigt Markt, Status und den Weg zu diesen Kontakten.

| Kontakt | Angebot | Vorlaufzeit |
| --- | --- | ---: |
| Nino und Rocco auf Parkbänken | Kakerlaken | 90 Spielminuten |
| Nino und Rocco auf Parkbänken | Stinkbombe | 30 Spielminuten |
| Rampencrew am Skaterpark | Fassade besprühen | 60 Spielminuten |
| Ordnungsamt über Telefonzellen | Fingierter Hinweis | 45 Spielminuten |

Die Karte enthält zwei besetzte Parkbänke in den bestehenden Denkmalgärten, einen Skaterpark in einem bestehenden öffentlichen Park und drei Telefonzellen. Der Skaterpark hat Rampen, ein Rail, einen ansprechbaren Skater und zwei weitere bewegte Figuren. Der Kartenwechsel verlegt die Orte, ohne Immobilien oder geschlossene Wohnblöcke zu entfernen. Identitäten der Kontakte und laufende Aufträge bleiben erhalten.

## Aufträge und Risiko

Das Budget wird einmalig beim Bestätigen bezahlt und als Konkurrenzkosten erfasst. Während des Vorlaufs ist das Ziel für weitere Aufträge gesperrt. Der Zufallswert wird bei Bestellung festgelegt und gespeichert; Laden oder Kartenwechsel ermöglichen keinen neuen Wurf. Bei Ausführung folgen entweder die bekannte zeitweilige Nachfrageminderung oder die volle Strafe. Nicht bezahlte Strafen bleiben Schulden. Weitere Aufträge sind bis zur Begleichung gesperrt. Die bisherigen Grundpreise, Strafhöhen und Wirkungen bleiben erhalten.

Zeit läuft ausschließlich mit der Spieluhr. Pause hält Aufträge und Skater an; Vorspulen erledigt sie regulär. Die Simulation trennt an Auftragsfristen. Eine Ausführung exakt um Mitternacht erfolgt nach Abschluss des alten Tages und wird im neuen Tag erfasst. Das Budget kann deshalb am vorherigen Spieltag stehen, die Strafe am nächsten.

Spielstandversion 13 und Konkurrenzzustand Version 2 migrieren ältere Zustände einschließlich Werbung, Markt, Effekten, Sperren und Strafen. Ungültige Kontakte, falsche Kanäle, doppelte Ziele oder Aufträge sowie nicht finanzierte oder bereits abgeschlossene Aufträge werden beim Wiederherstellen verworfen.

## Telefonspiel

Das Telefonbuch enthält vier Einträge als reinen Text. Es gibt keine Kurzwahl oder anklickbaren Nummern. Die Nummer wird über die klassische 12er-Tastatur oder physische Zifferntasten eingegeben und mit Telefonieren gewählt. Löschen, Auflegen und erneutes Wählen sind möglich. DTMF-Töne sind abschaltbar. Rufaufbau wird kurz animiert; Schließen beendet den Gesprächsaufbau zuverlässig.

| Anschluss | Nummer | Verlauf |
| --- | --- | --- |
| Ordnungsamt | 326500 | Verzweigtes Gespräch und Auftragsfreigabe |
| Pronto Pizza | 445566 | Zwei humorvolle Antworten, kein Auftrag |
| Wetteransage | 118144 | Wettertext und Hinweis auf den Skaterpark |
| Stadtinformation | 220011 | Hinweise auf Rampencrew und Parkbänke |

Das Ordnungsamt fragt nach Anliegen, Restaurant, Auftreten und Anonymität. Es gibt zwölf Kombinationen aus aktivem Gesprächseinstieg, Darstellung und Antwort auf die Rückfrage. Öffnungszeiten und Rücknahme beenden das Gespräch ohne Auftrag. Glaubwürdigkeit wird mit vier Balken gezeigt. Sachliches Auftreten verbessert sie, Forderungen, Übertreibungen, Hörensagen und Ausflüchte senken sie. Risiko bei Glaubwürdigkeit 0 bis 4: 45, 35, 25, 15 und 8 Prozent. Der Spieler sieht Budget, Risiko und Strafhöhe vor der verbindlichen Freigabe. Bis dahin bleiben alle Anrufe und Dialogentscheidungen kostenlos. Kosten und Risiko sind Spielmechaniken.

## Grafik

Mit dem integrierten Imagegen-Werkzeug erzeugt, keine CLI. Projektdatei: `assets/pizza/city/italian-city-contacts-v1.png`, 1536 × 1024, RGBA. Eine transparente Atlasgrafik mit sechs Feldern: zwei besetzte Bänke, eine Telefonzelle und drei Skaterposen. Die Spiellaufzeit verwendet Ausschnitte und eine einheitliche Skaterskalierung. Rampen und Platzgeometrie entstehen als flache 2D-Grafik entlang der bestehenden 2:1-Achsen. Fehlende Grafiken haben eine native Ersatzdarstellung.

Bildanweisung:

```text
Use case: stylized-concept. Asset type: a single transparent pixel-art sprite atlas for the existing 2D isometric Pizza City game. Create ONE 1536x1024 PNG atlas arranged as exactly THREE columns by TWO rows, equal 512x512 cells. Every subject fully contained in its own cell with generous empty padding, no overlap, no backgrounds, no ground tiles, true transparent alpha, no labels, no letters or words. Warm detailed 1990s Italian town tycoon pixel art, tiny crisp square pixel clusters, charcoal outlines, muted terracotta and olive tones, top-left sunlight. Fixed 2:1 isometric game camera, ground axes 26.565 degrees, vertical objects perfectly upright. Top-left cell: a weathered warm wooden park bench with black iron legs, one mysterious ADULT person seated on it in a dark olive jacket and flat cap reading a folded newspaper, relaxed shady atmosphere, facing lower-right. Top-middle cell: another bench of the same size and orientation with a different mysterious ADULT in dark burgundy jacket and cap sitting quietly. Top-right cell: a single charming old Italian street payphone booth, dark green metal lower body, glass upper enclosure, slightly curved roof, visible small handset inside, viewed from southeast. Bottom row: THREE frames of the SAME youthful skater in orange hoodie, dark trousers, cap and small black skateboard, viewed from southeast, standing height consistent across frames: bottom-left relaxed rolling pose; bottom-middle crouching on the board; bottom-right small ollie jump with board beneath feet. No violence, no weapons, no tools of sabotage. Subjects centered at x=256 within each cell; bench bases, telephone base and skateboard ground-contact line all approximately y=420 within their cells. Preserve transparent empty space, no checkerboard painted into the picture. Pixel sprites only, no 3D render or mockup.
```

## Prüfung

`tests/pizza-underworld-qa.mjs` prüft 69 Karten, Ortssicherheit, Kanaltrennung, Budget, Vorlauf, gespeicherte Ergebnisse, Strafen, Migration, Dialogwege und Tagesbuchung. `tests/pizza-underworld-browser-qa.cjs` prüft echte Kartentipps, Skaterbewegung, manuelle Wahl, falsche und richtige Anrufe, Gesprächsrisiko, Abbruch und Freigabe, automatische Ausführung, Laden, Kartenwechsel, Tagesgrenze und vier Bildschirmgrößen. Markt-, Werbe-, Handels-, Stadt-, Tagesabschluss- und Demoprüfungen bleiben aktiv.
