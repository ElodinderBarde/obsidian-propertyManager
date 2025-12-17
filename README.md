# Property Manager (Template)

Ein strukturiertes **Obsidian-Template** zur **zentralen Verwaltung und Vereinheitlichung von Properties (YAML-Frontmatter)** in einzelnen Dateien oder ganzen Ordnerstrukturen.

Das Template dient als **Steuer- und Konfigurationsdokument**, auf dessen Basis weitere Automatisierungen (z. B. QuickAdd-Scripts) arbeiten können.

---

## Zweck

Der Property Manager definiert **klar und maschinenlesbar**, welche Properties:

* in welchen Dateien oder Ordnern gelten sollen
* rekursiv auf Unterordner angewendet werden dürfen
* automatisch erstellt werden sollen, falls sie fehlen

Er eignet sich insbesondere für:

* Lern- und Aufgabenstrukturen
* Projekt- und Modulorganisation
* Konsistente Tag- und Kategorieverwaltung
* spätere automatisierte Property-Synchronisation

---

## Aufbau des Templates

Die gesamte Konfiguration erfolgt innerhalb einer einzigen Markdown-Datei.

### YAML-Frontmatter

```yaml
---
Kategorie:
  - "[[Vault Admin/indexes/Tags/Allgemein/Templates]]"
---
```

Dient der Einordnung des Templates selbst und ist unabhängig von den verwalteten Properties.

---

## Zieldefinition

```markdown
## Bezieht sich auf:
Betroffenes File: [[Aufgabenanpassung]]; //Path to File
Betroffener Ordner: ; //Path to Folder

//Nur 1 möglich
```

Genau **eine Zieldefinition** ist zulässig:

* entweder ein konkretes File
* oder ein Ordner

Diese Einschränkung verhindert Mehrdeutigkeiten bei automatisierter Verarbeitung.

---

## Verhaltensdefinition

```markdown
## Verhalten
Mit Unterordner: Ja;
Dateien auf gleicher Ebene: Ja;
Properties erstellen, falls nicht vorhanden: Nein;
```

### Bedeutung der Optionen

* **Mit Unterordner**
  Steuert, ob Unterordner rekursiv berücksichtigt werden

* **Dateien auf gleicher Ebene**
  Bezieht sich auf Dateien direkt im Zielordner

* **Properties erstellen, falls nicht vorhanden**
  Legt fest, ob fehlende Properties automatisch angelegt werden dürfen

Alle Werte sind als **Ja/Nein** definiert und eindeutig auswertbar.

---



### Regeln

- **Eine Property pro Zeile**
- **Unlimitierte Anzahl an Werten oder Links**
- Properties dürfen leer sein (Platzhalter)
- Werte können einfache Strings oder Wikilinks sein

Dieses Blockformat ist bewusst nicht YAML, sondern als **Custom-Block**, um:
- Parsing zu vereinfachen
- Konflikte mit bestehendem Frontmatter zu vermeiden
- klare Trennung zwischen Konfiguration und Ziel-Properties zu gewährleisten

---

## Erwartete Verwendung

Das Template ist nicht als alleinstehende Funktion gedacht, sondern als:

- Konfigurationsquelle für QuickAdd-Scripts
- Steuerdatei für Vault-weite Property-Operationen
- Dokumentation der beabsichtigten Metadatenstruktur

Ein typischer Workflow:
1. Template ausfüllen
2. Ziel definieren
3. Script liest Template
4. Script wendet Properties regelbasiert an

---

## Einschränkungen

- Keine Validierung innerhalb des Templates selbst
- Keine Konfliktauflösung bei bestehenden Properties
- Semantik der Properties ist projektabhängig
- Schreibweise der Property-Namen muss konsistent bleiben



## Autor

Elodin


