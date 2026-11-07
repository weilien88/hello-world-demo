import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export function generateWorker(html){return `const html = ${JSON.stringify(html)};\nexport default {fetch(){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}})}};\n`;}
export async function build(){const html=await readFile(new URL('../index.html',import.meta.url),'utf8');await mkdir(new URL('../cloudflare/',import.meta.url),{recursive:true});await writeFile(new URL('../cloudflare/worker.js',import.meta.url),generateWorker(html));}
if(process.argv[1]===fileURLToPath(import.meta.url))await build();
