# Italienische Eckhäuser aus festen 3D-Modellen

Vier Varianten mit zwei Geschossen werden jeweils aus demselben Modell in vier Richtungen gerendert und anschließend gestalterisch ausgearbeitet. Der Grundriss hat eine gerade, abgeschrägte Eingangsecke. Dachflächen, Überstand, Schornstein und Markise sind echte Geometrie. Die orthografische Kamera bleibt fest und liefert Bodenachsen im Verhältnis 2:1.

| Familie | Gestaltung | Perspektiven |
| --- | --- | --- |
| 0 | Ocker, rote Läden, Uhr über dem Eingang | SE, SW, NW, NE |
| 1 | Elfenbein, grüne Läden | SE, SW, NW, NE |
| 2 | Koralle, blaugrüne Läden, grün-weiße Markise und zwei Schornsteinrohre | SE, SW, NW, NE |
| 3 | Goldgelb, bordeauxrote Läden | SE, SW, NW, NE |

Die Eingangsfassade ist vorne sichtbar, links von der Kante gesehen, hinten verdeckt und rechts von der Kante gesehen. Sie wandert nicht auf eine normale Seitenwand. Die Markise kann seitlich als schmales Profil sichtbar bleiben. Dachkonturen und Schornsteine folgen derselben Modelldrehung.

Laufzeitatlas: `assets/pizza/city/italian-chamfered-corners-3d-v1.png`.

Quellen: `art-source/buildings/chamfered-corners/` mit vier OBJ/MTL-Modellen, Rendercode, Rohvorlage, Metadaten und bestätigter Illustration. `tools/prepare_corner_sprites.py` erstellt den transparenten Atlas und `pizza-city-corner-art.js` reproduzierbar. Die RGB-Daten der bestätigten Illustration bleiben unverändert.

Die Bodenanker stammen aus den virtuellen vorderen Ecken des vollständigen Quadrats. Jeder vollständige Sprite wird gemeinsam auf das Raster projiziert. PNGs werden weder gedreht noch gespiegelt. Die Häuser stehen ausschließlich an geeigneten Blockecken; Familien-IDs und Richtungen bleiben stabil.

Vor jeder künftigen Haus-Erzeugung [HOUSE-ASSET-WORKFLOW.md](HOUSE-ASSET-WORKFLOW.md) lesen.
