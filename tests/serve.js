// Tiny static server for local testing: node tests/serve.js [port]
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),port=+process.argv[2]||8080;
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.txt':'text/plain'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);
 if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end('not found');}
 res.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);});
if(require.main===module)server.listen(port,()=>console.log('http://localhost:'+port));
module.exports=server;
