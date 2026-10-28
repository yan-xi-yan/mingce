import {spawnSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
function check(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())check(file);else if(file.endsWith('.js')){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status){console.error(result.stderr);process.exit(1);}}}}
check(path.join(root,'assets/js'));
const html=readFileSync(path.join(root,'index.html'),'utf8');
if(/react|jsx|vite|src\/main/i.test(html))throw Error('Unexpected framework entry');
for(const {1:ref} of html.matchAll(/(?:src|href)="(assets\/[^\"]+)"/g))readFileSync(path.join(root,ref));
console.log('PASS native HTML entry, local assets, and JavaScript syntax. No React/Vite runtime.');
