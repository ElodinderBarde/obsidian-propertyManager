// addPropertiesFromInstruction.js
// Version 3.3 – QuickAdd-kompatibel, rekursiv & vollständig mit Debug-Ausgabe

module.exports = async (params) => {
    const app = params.app;
    const vault = app.vault;
    const activeFile = app.workspace.getActiveFile();

    if (!activeFile) {
        new Notice("❌ Keine aktive Datei geöffnet.");
        return;
    }

    let instructionText = await vault.read(activeFile);
    instructionText = instructionText
        .replace(/;\s*(\/\/.*)?$/gm, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/\r/g, "")
        .trim();

    const fileMatch = /Betroffenes\s*File:\s*\[\[(.+?)\]\]/i.exec(instructionText);
    const folderLine = /Betroffener\s*Ordner:\s*([^\n#]*)/i.exec(instructionText);
    const includeSub = /Mit\s*unterordner:\s*(ja|true)/i.test(instructionText);
    const sameLevel = /Dateien\s*auf\s*gleicher\s*Ebene:\s*(ja|true)/i.test(instructionText);
    const allowCreate = /Properties\s*erstellen[^:]*:\s*(ja|true)/i.test(instructionText);

    const propertiesMatch = /```+\s*Properties[\s\r\n]*([\s\S]*?)```+/im.exec(instructionText);
    if (!propertiesMatch) {
        new Notice("❌ Kein Properties-Block gefunden.");
        return;
    }

    // --- Properties parsen ---
    const properties = {};
    for (const rawLine of propertiesMatch[1].split("\n")) {
        const line = rawLine.trim();
        if (!line) continue;
        const kv = /^([\w\s\-]+?)\s*:\s*(.+)?$/i.exec(line);
        if (!kv) continue;
        const key = kv[1].trim();
        const vals = [...kv[2]?.matchAll(/\[\[(.+?)\]\]/g) ?? []].map(m => m[1].trim());
        if (vals.length > 0) properties[key] = (properties[key] || []).concat(vals);
    }

    console.log("🧩 Parsed Properties:");
    for (const [k, v] of Object.entries(properties)) console.log("   ", k, v);

    // === 🧭 REKURSIVER ORDNER-SCANNER ===
    const collectAllMarkdownFiles = (folder, depth = 0, results = [], scanned = []) => {
        scanned.push({ path: folder.path, depth });
        for (const child of folder.children) {
            if (child.children) {
                collectAllMarkdownFiles(child, depth + 1, results, scanned);
            } else if (child.extension === "md") {
                results.push(child);
            }
        }
        return { files: results, folders: scanned };
    };

    let baseFolder = null;
    let targets = [];
    let scannedFolders = [];

    if (fileMatch) {
        const noteName = fileMatch[1].trim();
        const allMd = vault.getMarkdownFiles();
        const targetFile = allMd.find(f => f.name === `${noteName}.md`);
        if (!targetFile) {
            new Notice(`❌ Datei "${noteName}.md" nicht gefunden.`);
            return;
        }

        baseFolder = targetFile.parent;
        const { files, folders } = collectAllMarkdownFiles(baseFolder);
        scannedFolders = folders;
        if (includeSub) {
            targets = files;
        } else if (sameLevel) {
            targets = vault.getMarkdownFiles().filter(f => f.parent.path === baseFolder.path);
        } else {
            targets = [targetFile];
        }

    } else if (folderLine && (folderLine[1] || "").trim() !== "") {
        const folderPath = (folderLine[1] || "").trim();
        const folder = vault.getAbstractFileByPath(folderPath);
        if (!folder || !folder.children) {
            new Notice(`❌ Ordner "${folderPath}" nicht gefunden.`);
            return;
        }

        baseFolder = folder;
        const { files, folders } = collectAllMarkdownFiles(folder);
        scannedFolders = folders;
        targets = includeSub ? files : folder.children.filter(f => f.extension === "md");
    }

    // === Debug ===
    console.log("📁 Base Folder:", baseFolder?.path || "(keiner)");
    console.log("📂 Scanned Folders (rekursiv):");
    scannedFolders.forEach(f =>
        console.log(" ".repeat(f.depth * 2) + "- " + f.path)
    );

    console.log("🗂 Scanned Files:");
    for (const f of targets) console.log("  -", f.path);

    if (targets.length === 0) {
        new Notice("⚠️ Keine Markdown-Dateien gefunden.");
        return;
    }

    // === FRONTMATTER ===
    const extractWikilinks = (line) => [...line.matchAll(/\[\[(.+?)\]\]/g)].map(m => m[1].trim());
    const escapeYamlKey = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    const findPropertyBlock = (lines, key) => {
        const keyRegex = new RegExp(`^${escapeYamlKey(key)}\\s*:\\s*(.*)$`);
        for (let i = 0; i < lines.length; i++) {
            const m = keyRegex.exec(lines[i]);
            if (!m) continue;
            let start = i, end = i + 1;
            const collected = extractWikilinks(lines[i]);
            while (end < lines.length && /^\s*-\s+/.test(lines[end])) {
                collected.push(...extractWikilinks(lines[end]));
                end++;
            }
            return { start, end, values: collected };
        }
        return null;
    };

    const buildPropertyLines = (key, values) => {
        const uniq = Array.from(new Set(values));
        if (uniq.length === 1) return [`${key}: "[[${uniq[0]}]]"`];
        const out = [`${key}:`];
        for (const v of uniq) out.push(`  - "[[${v}]]"`);
        return out;
    };

    const mergeValues = (existing, incoming) => {
        const set = new Set(existing);
        for (const v of incoming) set.add(v);
        return Array.from(set);
    };

    let changed = 0;
    let skipped = [];

    for (const file of targets) {
        let text = await vault.read(file);
        let fm = /^---\n([\s\S]*?)\n---/m.exec(text);
        let fmContent = fm ? fm[1] : "";
        let lines = fmContent.split("\n");

        if (!fm && !allowCreate) {
            console.log("⏭️ Skip:", file.path, "(kein Frontmatter, Erstellen deaktiviert)");
            skipped.push(file.path);
            continue;
        }

        if (!fm) lines = [];

        let modified = false;
        for (const [key, incomingValues] of Object.entries(properties)) {
            const block = findPropertyBlock(lines, key);
            if (block) {
                const merged = mergeValues(block.values, incomingValues);
                lines.splice(block.start, block.end - block.start, ...buildPropertyLines(key, merged));
                modified = true;
            } else {
                lines.push(...buildPropertyLines(key, incomingValues));
                modified = true;
            }
        }

        if (modified) {
            const newFm = `---\n${lines.join("\n")}\n---\n`;
            text = newFm + (fm ? text.slice(fm[0].length) : text);
            await vault.modify(file, text);
            console.log("✅", file.path, "aktualisiert");
            changed++;
        }
    }

    console.log("📊 Debug Summary:");
    console.log("   Aktualisiert:", changed);
    console.log("   Übersprungen:", skipped.length);

    new Notice(`🧠 ${changed} Datei(en) aktualisiert – Unterordner: ${includeSub}, Properties-Erstellen: ${allowCreate}\n📂 Ordner: ${scannedFolders.length}, 🗂 Dateien: ${targets.length}, ⏭️ Skipped: ${skipped.length}`);
};
