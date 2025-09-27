#!/usr/bin/env node
import { execa } from "execa";
import fs from "fs";
import path from "path";
import prompts from "prompts";
import { fileURLToPath } from "url";
import { copyTemplates } from "./utils/copyTemplates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log("\ncreate-my-next — opinionated Next.js starter\n");

    const response = await prompts(
        [
            {
                type: "text",
                name: "appName",
                message: "Project name:",
                initial: "my-next-app",
            },
            {
                type: "select",
                name: "location",
                message: "Where to create the project?",
                choices: [
                    { title: "New folder with app name", value: "new" },
                    { title: "Current directory", value: "current" },
                ],
            },
            {
                type: "select",
                name: "packageManager",
                message: "Choose package manager:",
                choices: [
                    { title: "npm", value: "npm" },
                    { title: "pnpm", value: "pnpm" },
                ],
            },
            {
                type: "multiselect",
                name: "features",
                message: "Select features to include:",
                choices: [
                    { title: "TailwindCSS", value: "tailwind" },
                    { title: "shadcn/ui", value: "shadcn" },
                    { title: "Prisma (SQLite)", value: "prisma" },
                    { title: "Redux Toolkit", value: "redux" },
                    { title: "TanStack React Query", value: "react-query" },
                    { title: "Framer Motion", value: "framer" },
                    { title: "i18next", value: "i18n" },
                    { title: "jose", value: "jose" },
                ],
                hint: "You can pick multiple",
            },
        ],
        {
            onCancel: () => {
                console.log("Aborted.");
                process.exit(1);
            },
        }
    );

    const { appName, location, packageManager, features } = response;
    if (!appName) {
        console.error("Project name is required.");
        process.exit(1);
    }

    const projectPath =
        location === "current"
            ? process.cwd()
            : path.join(process.cwd(), appName);

    if (location === "new") {
        if (fs.existsSync(projectPath)) {
            console.error(`Folder ${projectPath} already exists.`);
            process.exit(1);
        }
        fs.mkdirSync(projectPath, { recursive: true });
    }

    // 1) Bootstrap Next.js (App Router, TS, ESLint)
    console.log("\n⚡ Bootstrapping Next.js (TypeScript + ESLint)...\n");
    if (packageManager === "npm") {
        await execa(
            "npx",
            [
                "create-next-app@latest",
                projectPath,
                "--typescript",
                "--eslint",
                "--import-alias",
                "@/*",
            ],
            { stdio: "inherit" }
        );
    } else if (packageManager === "pnpm") {
        await execa(
            "pnpm create",
            [
                "next-app@latest",
                projectPath,
                "--typescript",
                "--eslint",
                "--import-alias",
                "@/*",
            ],
            { stdio: "inherit" }
        );
    }

    // If created in a separate folder, create-next-app already created the folder. If we passed projectPath as folder, change cwd accordingly
    const cwd = projectPath;

    // 2) Copy templates
    console.log("\n📂 Copying templates (configs, styles, starter code)...\n");
    const templateDir = path.join(__dirname, "templates");
    copyTemplates(templateDir, cwd);

    // 3) Install dependencies depending on features
    console.log("\n📦 Installing dependencies...\n");

    // Base packages (keep Next's own dependencies untouched)
    const installDeps = [];
    const installDevDeps = [];

    // always add types and tooling
    installDevDeps.push("eslint@latest");

    if (features.includes("tailwind")) {
        installDeps.push(
            "tailwindcss@latest",
            "postcss@latest",
            "autoprefixer@latest"
        );
    }

    if (features.includes("shadcn")) {
        // shadcn installs some dev tooling; we'll install common deps
        installDeps.push(
            "@shadcn/ui@latest",
            "class-variance-authority@latest",
            "tailwind-variants@latest",
            "lucide-react@latest",
            "react-hook-form@latest",
            "zod@latest",
            "@radix-ui/react-accordion@latest"
        );
    }

    if (features.includes("prisma")) {
        installDevDeps.push("prisma@latest");
        installDeps.push("@prisma/client@latest");
    }

    if (features.includes("redux")) {
        installDeps.push("@reduxjs/toolkit@latest", "react-redux@latest");
    }

    if (features.includes("react-query")) {
        installDeps.push("@tanstack/react-query@latest");
    }

    if (features.includes("framer")) {
        installDeps.push("framer-motion@latest");
    }

    if (features.includes("jose")) {
        installDeps.push("jose@latest");
    }

    if (features.includes("i18n")) {
        installDeps.push(
            "i18next@latest",
            "react-i18next@latest",
            "next-i18next@latest",
            "i18next-browser-languagedetector@latest"
        );
    }

    // common dev types for TS
    installDevDeps.push(
        "@types/react@latest",
        "@types/node@latest",
        "@types/react-dom@latest"
    );

    // flatten command args
    const installArgs = [];
    if (installDeps.length) installArgs.push("install", ...installDeps);
    if (installDevDeps.length)
        installArgs.push("install", "-D", ...installDevDeps);

    // prefer pnpm if selected
    try {
        if (packageManager === "pnpm") {
            if (installDeps.length)
                await execa("pnpm", ["add", ...installDeps], {
                    cwd,
                    stdio: "inherit",
                });
            if (installDevDeps.length)
                await execa("pnpm", ["add", "-D", ...installDevDeps], {
                    cwd,
                    stdio: "inherit",
                });
        } else {
            if (installDeps.length)
                await execa("npm", ["install", ...installDeps], {
                    cwd,
                    stdio: "inherit",
                });
            if (installDevDeps.length)
                await execa(
                    "npm",
                    ["install", "--save-dev", ...installDevDeps],
                    { cwd, stdio: "inherit" }
                );
        }
    } catch (err) {
        console.error("Failed to install dependencies:", err);
        process.exit(1);
    }

    // 4) Feature-specific setup steps
    if (features.includes("tailwind")) {
        console.log("\n🎨 Configuring Tailwind...");
        await execa("npx", ["tailwindcss", "init", "-p"], {
            cwd,
            stdio: "inherit",
        });
        // replace tailwind.config.js content to include src/**/*
        const tailwindPath = path.join(cwd, "tailwind.config.js");
        if (fs.existsSync(tailwindPath)) {
            let cfg = fs.readFileSync(tailwindPath, "utf8");
            cfg = cfg.replace(
                /content: \[.*\]/s,
                'content: ["./src/**/*.{js,ts,jsx,tsx}"]'
            );
            fs.writeFileSync(tailwindPath, cfg, "utf8");
        }

        // write base globals
        const globalsPath1 = path.join(cwd, "src", "app", "globals.css");
        const globalsPath2 = path.join(cwd, "src", "pages", "globals.css");
        const css = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
        if (fs.existsSync(globalsPath1))
            fs.writeFileSync(globalsPath1, css, "utf8");
        if (fs.existsSync(globalsPath2))
            fs.writeFileSync(globalsPath2, css, "utf8");
    }

    if (features.includes("shadcn")) {
        console.log("\n✨ Initializing shadcn/ui (this will prompt)...\n");
        try {
            await execa("npx", ["shadcn@latest", "init"], {
                cwd,
                stdio: "inherit",
            });
        } catch (e) {
            console.warn(
                "shadcn init failed or prompted; you can run npx shadcn@latest init inside the project to complete its interactive setup."
            );
        }
    }

    if (features.includes("prisma")) {
        console.log("\n🗄️ Setting up Prisma (SQLite)...\n");
        // initialize prisma files if not present
        const prismaDir = path.join(cwd, "prisma");
        if (!fs.existsSync(prismaDir))
            fs.mkdirSync(prismaDir, { recursive: true });
        const schemaPath = path.join(prismaDir, "schema.prisma");
        const defaultSchema = `generator client {\n  provider = \"prisma-client-js\"\n}\n\nsource db {\n  provider = \"sqlite\"\n  url      = \"file:./dev.db\"\n}\n\nmodel User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n  name  String?\n}\n`;
        fs.writeFileSync(schemaPath, defaultSchema, "utf8");
        // run prisma generate and migrate
        try {
            await execa("npx", ["prisma", "generate"], {
                cwd,
                stdio: "inherit",
            });
            // run a dev migrate to create SQLite file (silent --name)
            await execa("npx", ["prisma", "migrate", "dev", "--name", "init"], {
                cwd,
                stdio: "inherit",
            });
        } catch (e) {
            console.warn(
                "Prisma generate/migrate may have failed in this environment. Run 'npx prisma generate' and 'npx prisma migrate dev --name init' inside the project to finish setup."
            );
        }
    }

    // 5) i18n file wiring
    if (features.includes("i18n")) {
        console.log("\n🌍 Wiring i18n files...\n");
        // ensure next-i18next.config.js exists in project root
        const i18nConfig = `module.exports = {\n  i18n: {\n    defaultLocale: 'en',\n    locales: ['en','fr','ar']\n  }\n}`;
        fs.writeFileSync(
            path.join(cwd, "next-i18next.config.js"),
            i18nConfig,
            "utf8"
        );
    }

    // 6) run npm-check-updates to bump to latest compatible versions and reinstall
    console.log(
        "\n🔄 Updating package.json versions to latest where possible..."
    );
    try {
        await execa("npx", ["npm-check-updates", "-u"], {
            cwd,
            stdio: "inherit",
        });
        if (packageManager === "pnpm")
            await execa("pnpm", ["install"], { cwd, stdio: "inherit" });
        else await execa("npm", ["install"], { cwd, stdio: "inherit" });
    } catch (e) {
        console.warn(
            "npm-check-updates step failed — it's okay. The project likely already uses latest deps."
        );
    }

    console.log(`\n✅ Done! Your project is ready at: ${cwd}`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${location === "new" ? appName : "."}`);
    console.log(`  ${packageManager} run dev`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
