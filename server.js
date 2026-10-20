'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {handleRequest} = require('./api/generate');
const ROOT = __dirname;
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};

async function loadEnv() {
  try {
    const content=await fs.readFile(path.join(ROOT,'.env'),'utf8');
    content.split(/\r?\n/).forEach(line=>{
      const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if(match && !process.env[match[1]]) process.env[match[1]]=match[2].trim().replace(/^("|')|("|')$/g,'');
    });
  } catch {}
}

async function start() {
  await loadEnv();
  const port=Number(process.env.PORT)||3000;
  const server=http.createServer(async (req,res)=>{
    try {
      if(req.url.split('?')[0]==='/api/generate') {
        res.setHeader('Content-Type','application/json; charset=utf-8');
        res.setHeader('Cache-Control','no-store');
        if(req.method!=='POST'){res.writeHead(405);return res.end(JSON.stringify({error:'Gunakan metode POST.'}));}
        let payload='';
        for await(const part of req){payload+=part;if(payload.length>16000){res.writeHead(413);return res.end(JSON.stringify({error:'Input terlalu panjang.'}));}}
        let body;
        try{body=JSON.parse(payload);}catch{res.writeHead(400);return res.end(JSON.stringify({error:'JSON tidak valid.'}));}
        const {status,result}=await handleRequest(body);
        res.writeHead(status);return res.end(JSON.stringify(result));
      }
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const allowed=new Set(['/','/index.html','/styles.css','/app.js','/favicon.svg']);
      if(!allowed.has(pathname)){res.writeHead(404);return res.end('Not Found');}
      const name=pathname==='/'?'index.html':pathname.slice(1);
      const data=await fs.readFile(path.join(ROOT,name));
      res.setHeader('Content-Type',MIME[path.extname(name)]||'application/octet-stream');
      res.setHeader('X-Content-Type-Options','nosniff');
      res.writeHead(200);res.end(req.method==='HEAD'?'':data);
    }catch(e){res.writeHead(500);res.end('Internal Server Error');}
  });
  server.listen(port,()=>console.log(`PromptForge berjalan di http://localhost:${port} (${process.env.OPENAI_API_KEY?'AI aktif':'mode lokal'})`));
}
if(require.main===module) start();
module.exports={start};
