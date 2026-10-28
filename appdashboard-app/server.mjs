// Optional static server: no build step and no third-party packages.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const host=process.env.HOST||'0.0.0.0';
const port=Number(process.env.PORT||3004);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.woff':'font/woff','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname!=='/'&&pathname!=='/index.html'&&!pathname.startsWith('/assets/')){res.writeHead(404);res.end('Not found');return;}
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)||!(await stat(target)).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(target));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,host,()=>console.log(`明策 · HTML + Bootstrap: http://${host}:${port}/`));
