import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['public', 'scripts', 'tests'];
const sourceFiles = [];

async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            await walk(path);
        } else {
            sourceFiles.push(path);
        }
    }
}

for (const root of roots) {
    await walk(root);
}

const failures = [];
const javascriptFiles = sourceFiles.filter((file) => ['.js', '.mjs'].includes(extname(file)));

for (const file of javascriptFiles) {
    const result = spawnSync(process.execPath, ['--check', file], {
        encoding: 'utf8'
    });

    if (result.status !== 0) {
        failures.push(`${file}: ${result.stderr.trim()}`);
    }
}

const htmlFiles = sourceFiles.filter((file) => extname(file) === '.html');

for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const checks = [
        ['doctype', /<!doctype html>/i],
        ['idioma pt-BR', /<html[^>]+lang=["']pt-BR["']/i],
        ['viewport', /<meta[^>]+name=["']viewport["']/i],
        ['title', /<title>[^<]+<\/title>/i],
        ['meta description', /<meta[^>]+name=["']description["']/i]
    ];

    for (const [label, pattern] of checks) {
        if (!pattern.test(html)) failures.push(`${file}: ausente ${label}`);
    }

    const h1Count = (html.match(/<h1\b/gi) || []).length;
    if (h1Count !== 1) failures.push(`${file}: esperado 1 H1, encontrado ${h1Count}`);

    const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
    if (imageTags.some((tag) => !/\salt=["'][^"']*["']/i.test(tag))) {
        failures.push(`${file}: imagem sem atributo alt`);
    }

    if (!file.endsWith('404.html')) {
        const seoChecks = [
            ['canonical', /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\//i],
            ['Open Graph title', /<meta[^>]+property=["']og:title["']/i],
            ['Open Graph description', /<meta[^>]+property=["']og:description["']/i],
            ['Open Graph URL', /<meta[^>]+property=["']og:url["']/i]
        ];

        for (const [label, pattern] of seoChecks) {
            if (!pattern.test(html)) failures.push(`${file}: ausente ${label}`);
        }
    }

    const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length) {
        failures.push(`${file}: IDs duplicados: ${[...new Set(duplicates)].join(', ')}`);
    }
}

if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
}

console.log(`Lint estático concluído: ${javascriptFiles.length} scripts e ${htmlFiles.length} páginas.`);
