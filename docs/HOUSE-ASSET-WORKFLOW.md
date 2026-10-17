# Häuser aus einer festen 3D-Vorlage erzeugen

Ein Haus muss in allen Perspektiven dasselbe Gebäude bleiben. Deshalb zuerst die Geometrie modellieren und rendern, anschließend die Oberflächen mit Imagegen ausarbeiten. Die Modelle dienen der Asset-Erzeugung; das Spiel verwendet weiterhin 2D-Sprites.

## Verbindlicher Ablauf

1. **Grundform modellieren.** Eine Box oder ein extrudierter Grundriss reicht. Die abgeschrägte Ecke wirklich ausschneiden. Dachflächen, Dachüberstand und Schornstein als echte Geometrie modellieren. Fenster und Eingang an den jeweiligen Wänden verankern. Vorstehende Markisen und andere Anbauten mitmodellieren.
2. **Varianten festlegen.** Pro Variante ein festes Modell, maximal zwei Geschosse. Farbe und Ausstattung dürfen zwischen Varianten wechseln, innerhalb ihrer Perspektiven bleibt die Architektur identisch.
3. **Kamera fixieren.** Orthografisch, horizontaler Blickwinkel 45 Grad, Höhenwinkel 30 Grad. Dadurch haben die sichtbaren Bodenachsen die Steigungen +0,5 und -0,5 und passen zum 2:1-Raster. Maßstab, Ausschnitt und Mittelpunkt bleiben unverändert.
4. **Das gesamte Modell drehen.** Yaw 0, 90, 180 und 270 Grad rendern. Keine Anbauten einzeln umsetzen und keine fertigen Bitmaps drehen oder spiegeln. Varianten in Zeilen, Perspektiven in Spalten; identische Zellen mit freien Zwischenräumen.
5. **Die rohe Vorlage prüfen.** Silhouetten, Dachkonturen, Eingang, Anbauten, Schornsteine und Verdeckung kontrollieren. Fehler am Modell korrigieren und neu rendern.
6. **Bildgestaltung anwenden.** Der neue Render ist Bild 1 und das ausdrückliche Bearbeitungsziel. Eine ältere Illustration kann als Bild 2 ausschließlich Materialien und Stil vorgeben. Putz, Ziegel, Holz, Stein und kleine Dekoration ausarbeiten lassen. Konturen, Perspektive, Positionen, Fensterzahl und Verdeckung aus Bild 1 beibehalten.
7. **Ausarbeitung vergleichen.** Bildgenerierung garantiert keine exakte Geometrie. Alle Zellen gegen den Render prüfen, besonders Dächer, Eingangsecken und Schornsteine. Abweichungen gezielt korrigieren und erneut prüfen. Das bestätigte Original als `paintover.png` sichern.
8. **Assets vorbereiten.** Das Original erhalten. Außen verbundenen hellen Hintergrund deterministisch freistellen, Ausschnitte bestimmen und Bodenanker aus der Modellprojektion ableiten. Nur gemeinsam und gleichmäßig skalieren. Laufzeitatlas und Metadaten zusammen aktualisieren.
9. **Im Spiel prüfen und committen.** Galerie aller Ansichten und echten Stadtblock ansehen. Keine weißen Kästen, schwebenden Fundamente oder abgeschnittenen Anbauten. Modelle, Materialien, Rendercode, Rohvorlage, Metadaten, bestätigte Illustration und Laufzeitdateien ins Git aufnehmen.

## Die abgeschrägte Eingangsecke

Der Referenzgrundriss ist ein Quadrat mit einer um 45 Grad abgeschnittenen Ecke. Bei der festen symmetrischen Kamera gilt:

| Spalte | Yaw | Katalogrichtung | Eingangsfassade | Dachkontur |
| --- | --- | --- | --- | --- |
| 1 | 0 Grad | `se` | Vorne sichtbar; ihre waagerechten Kanten sind parallel zur Bildunterkante | Abgeflachte Vorderkante |
| 2 | 90 Grad | `sw` | Ganz links exakt von der Kante gesehen, ohne sichtbare Breite | Linke Spitze abgeschnitten |
| 3 | 180 Grad | `nw` | Hinten verdeckt | Hintere Spitze abgeschnitten |
| 4 | 270 Grad | `ne` | Ganz rechts exakt von der Kante gesehen, ohne sichtbare Breite | Rechte Spitze abgeschnitten |

Die seitliche Tür darf nicht auf eine breite Wand versetzt werden. Eine vorstehende Markise kann als Seitenprofil über die Silhouette ragen. Der Schornstein wandert durch die Projektion von rechts nach vorne, nach links und nach hinten. Verdeckung ergibt sich aus der modellierten Höhe und dem Tiefenpuffer.

Das Dach folgt dem **fünfeckigen Grundriss**. Ein beliebiges quadratisches Pyramidendach in allen Ansichten ist falsch. Besonders die kurze hintere Schnittkante in Spalte 3 nicht vermeintlich korrigieren.

## Quellen und Reproduktion

| Datei | Zweck |
| --- | --- |
| `art-source/buildings/chamfered-corners/build_models.py` | Vier feste Meshes, OBJ/MTL-Export und Renderer mit Tiefenpuffer |
| `art-source/buildings/chamfered-corners/house-1.obj` bis `house-4.obj` mit `.mtl` | Importierbare 3D-Modelle, Z-Achse nach oben |
| `art-source/buildings/chamfered-corners/corner-houses-3d-template.png` | 2048 x 2048 Pixel, vier Varianten mit je vier Ansichten |
| `art-source/buildings/chamfered-corners/render-metadata.json` | Kamera, Grundriss, Fassadenhöhe, virtuelle Bodenanker und Richtungen |
| `art-source/buildings/chamfered-corners/paintover.png` | Unveränderte, bestätigte Illustration |
| `tools/prepare_corner_sprites.py` | Hintergrund freistellen, Ausschnitte und Katalog erstellen |
| `assets/pizza/city/italian-chamfered-corners-3d-v1.png` | Transparenter Laufzeitatlas |
| `pizza-city-corner-art.js` | Automatisch erzeugte Ausschnitte, Bodenanker und Familien |

Benötigt werden Python, NumPy und Pillow. Im Hauptverzeichnis:

```bash
python art-source/buildings/chamfered-corners/build_models.py
python tools/prepare_corner_sprites.py
node tests/pizza-city-height-qa.mjs
node tests/pizza-isometric-art-qa.mjs
node tests/pizza-city-corners-browser-qa.cjs
node tests/pizza-city-mix-qa.cjs
```

Der erste Befehl erzeugt Modelle, Rohvorlage und Metadaten. Er führt keine Bildgenerierung aus und überschreibt `paintover.png` nicht. Nach Änderungen der Geometrie die Illustration zur neuen Vorlage erneut erstellen und bestätigen, bevor die Laufzeitdateien vorbereitet werden.

Die Bodenanker sind die **virtuellen drei vorderen Ecken des vollständigen Quadrats**. Eine abgeschnittene Ecke kann außerhalb der sichtbaren Silhouette liegen. Trotzdem den Anker erhalten und nicht auf Türschwelle oder tiefsten Pixel verschieben. So bleiben alle Ansichten gleich groß und passen zum Raster.

Die Vorbereitung entfernt ausschließlich hellen, mit dem äußeren Bildrand verbundenen Hintergrund. Helle Innenflächen und alle RGB-Daten der Illustration bleiben unverändert. Familien-IDs bleiben stabil, damit deterministische Stadtpläne ihre Zuordnungen behalten.

## Vorlage für den Bildauftrag

```text
Image 1 is the edit target: an orthographic atlas rendered from actual 3D
meshes. Image 2 is ONLY a material and illustration style reference.
Paint over Image 1. Preserve its layout, camera, scale, silhouettes,
pentagonal footprints, roof facets, clipped roof outlines, window counts,
door locations, chimney positions, heights and occlusion in every cell.
Apply the finish of Image 2 without copying its geometry.

Four rows are four variants. Four columns show the same physical mesh at
yaw 0, 90, 180 and 270 degrees. Do not rotate or mirror finished bitmaps.
The entrance chamfer is visible in column 1, edge-on at the far left in
column 2, hidden behind in column 3 and edge-on at the far right in column 4.
Never move the entrance or decoration onto a broad wall. Preserve rendered
side profiles of protruding awnings and their correct occlusion.

The roof follows the clipped five-sided footprint. Keep its low height and
every clipped edge, especially the back edge in column 3. Paint tiles along
those exact planes. Keep each chimney where the model rendered it.
Only elaborate materials and small decorative details. No added floors,
gables, relocated windows or architectural changes. Keep the white exterior
background for deterministic preparation after approval.
```

## Aktiver Stadtkatalog

Normale Häuser und Kaufobjekte nutzen `italian-houses-32-two-storey-v2.png`. Der separate Sondergebäude-Atlas mit acht größeren Motiven wurde entfernt; sechs Kaufobjekte verwenden passende Bilder aus dem 32er-Atlas. IDs, Preise, Flächen, Größenklassen und Funktionen bleiben unverändert. Eckhäuser nutzen den neuen 3D-basierten Atlas. Innenhofhäuser und Wahrzeichen bleiben eigene Motive.
