# Werbung

Werbung wird pro eigenem Restaurant beauftragt und beeinflusst ausschließlich dessen Anteil am festen Kundenpool seines Viertels. Die Zielgruppe bleibt an Preise, Mobiliar, Renovierung und Bewertungen gebunden. Personal, erreichbare Tische und Küche begrenzen weiterhin die tatsächliche Bedienung.

| Format | Tagespreis Basis | Zusätzliche Sichtbarkeit |
| --- | ---: | ---: |
| Flyer | 80 DM | 25 % |
| Plakatwerbung | 160 DM | 45 % |
| Zeitung | 240 DM | 65 % |
| Radio | 400 DM | 90 % |

Die drei Qualitätsstufen Basis, Klassisch und Premium sprechen Einfach, Mittel und Gehoben an. Sie kosten das 1-, 1,5- und 2,2-Fache. Die Sichtbarkeit multipliziert nur das Attraktivitätsgewicht der gewählten Zielgruppe. Mehrere Formate addieren ihre Zuschläge bis maximal +200 %. Andere eigene Filialen und die Konkurrenz teilen denselben unveränderten Viertelpool.

| Spieltage | Rabatt auf den Tagespreis |
| ---: | ---: |
| 1 | 0 % |
| 3 | 10 % |
| 7 | 20 % |
| 14 | 30 % |

Der gesamte Auftrag wird sofort bezahlt und einmalig unter Werbung im Tagesabschluss des Restaurants verbucht. Die Vergleichssumme pro Tag ist keine weitere Abbuchung. Werbung erhöht die Betriebskosten, nicht die Zutatenkosten oder erstattungsfähige Einrichtung. Eine laufende Kombination aus Restaurant, Format und Zielgruppe kann nicht doppelt beauftragt werden. Andere Formate und Zielgruppen können parallel laufen.

Start ist die aktuelle Spielminute, Ende exakt Start plus Spieltage mal 1440 Minuten. Die Service-Simulation trennt Zeitschritte an Kampagnenenden. Kampagnen laufen auch nachts, pausieren mit der Spielzeit und enden ohne Verlängerung. Spielstandversion 12 speichert laufende Kampagnen, jüngste beendete Aufträge und die Ausgaben. Versionen 1 bis 11 bleiben migrierbar; ältere Tagesberichte erhalten Werbung mit null.

Prüfung: `node tests/pizza-advertising-qa.mjs` und `node tests/pizza-advertising-browser-qa.cjs`.
