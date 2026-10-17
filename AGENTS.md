# Hinweise für Agenten

## Gebäude-Sprites

Vor der Erzeugung oder Änderung von Häusern [docs/HOUSE-ASSET-WORKFLOW.md](docs/HOUSE-ASSET-WORKFLOW.md) lesen.

- Zuerst ein echtes, einfaches 3D-Modell bauen. Grundriss, abgeschrägte Ecke, Dachflächen, Überstand, Schornstein und vorstehende Anbauten gehören zur Geometrie.
- Pro Variante genau ein festes Modell verwenden. Fenster und Türen bleiben an ihren Wänden. Das gesamte Modell in 90-Grad-Schritten bei fester orthografischer Kamera rendern.
- Den Render als Bearbeitungsziel an Imagegen geben; frühere Illustrationen ausschließlich als Stilreferenz verwenden. Kamera, Konturen, Maßstab und Verdeckung aus dem Render erhalten.
- Keine Perspektiven frei erfinden, spiegeln oder aus fertigen 2D-Bildern drehen. Der Eingang darf nicht auf andere Wände wandern.
- Modelle, Materialien, Rendercode, Rohvorlage, Metadaten, bestätigte Illustration und reproduzierbare Asset-Vorbereitung gemeinsam im Git aufbewahren.
- Alle Ansichten als Galerie und in einem echten Stadtblock prüfen. Bodenanker aus der Modellprojektion ableiten; höchstens das gesamte Bild gleichmäßig skalieren.

Referenz: `art-source/buildings/chamfered-corners/`. Im Spiel bleiben die Gebäude 2D-Sprites.

## Stadtkatalog

Normale Gebäude und Kaufobjekte verwenden den gemeinsamen 32er-Hausatlas. Der separate Atlas großer Sondergebäude wurde entfernt. Für neue Kaufobjekte einen passenden bestehenden Hauseintrag wählen. IDs, Preise und Spielfunktionen sind unabhängig vom Bild.
