import fs from "fs";
import path from "path";

export function copyTemplates(srcDir, destDir) {
    if (!fs.existsSync(srcDir)) return;

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            if (!fs.existsSync(destPath))
                fs.mkdirSync(destPath, { recursive: true });
            copyTemplates(srcPath, destPath);
        } else {
            // do not overwrite if file exists (lets user keep create-next-app defaults), but overwrite common configs
            const overwriteConfigs = [
                ".eslintrc.json",
                ".prettierrc",
                "tailwind.config.js",
                "next-i18next.config.js",
                "prisma/schema.prisma",
            ];
            const shouldOverwrite =
                overwriteConfigs.includes(entry.name) ||
                entry.name.endsWith(".css") ||
                entry.name.endsWith(".ts") ||
                entry.name.endsWith(".tsx");
            if (!fs.existsSync(destPath) || shouldOverwrite) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied ${destPath}`);
            }
        }
    }
}
