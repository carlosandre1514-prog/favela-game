/* Mapa Colégio Central — construção da cena (extraído de Mapa_Colégio_Central.html). Coliders: [x0,x1,z0,z1,y0,y1]. */
function buildColegio(scene){
  const g=new THREE.Group();let sd=11;const R=()=>(sd=sd*16807%2147483647)/2147483647;
  const mc={},M=c=>mc[c]||(mc[c]=new THREE.MeshLambertMaterial({color:c}));
  const U=new THREE.BoxGeometry(1,1,1),occ=[],wm=[],CL=[],SB=[],FM=[];
  const lampM=new THREE.MeshBasicMaterial({color:0x888888});
  const cv=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'));return c};
  const box=(x0,x1,z0,z1,y0,y1,m)=>{const b=new THREE.Mesh(U,typeof m==='object'?m:M(m));b.scale.set(x1-x0,y1-y0,z1-z0);b.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);const ce=[x0,x1,z0,z1,y0,y1];CL.push(ce);b.cl=ce;if(typeof m!=='object'){b.userData.c=m;SB.push(b)}g.add(b);return b};
  const plane=(x0,x1,z0,z1,y,m)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),m);p.rotation.x=-Math.PI/2;p.position.set((x0+x1)/2,y,(z0+z1)/2);g.add(p);return p};
  const tx=(c,rx,ry)=>{const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.anisotropy=2;return t};
  const mb=(c,rx,ry)=>new THREE.MeshLambertMaterial({map:tx(c,rx,ry)});
  /* fachadas com janelas (acendem à noite) */
  const fc={},fm={};
  const fac=col=>fc[col]||(fc[col]={
    d:cv(128,128,x=>{x.fillStyle=col;x.fillRect(0,0,128,128);x.fillStyle='rgba(0,0,0,.14)';x.fillRect(0,58,128,5);x.fillRect(0,123,128,5);for(let i=0;i<2;i++)for(let j=0;j<2;j++){x.fillStyle='#5f8ca8';x.fillRect(12+j*64,12+i*64,40,34);x.fillStyle='rgba(255,255,255,.3)';x.fillRect(12+j*64,12+i*64,40,8)}}),
    e:cv(128,128,x=>{x.fillStyle='#000';x.fillRect(0,0,128,128);x.fillStyle='#ffd27a';for(let i=0;i<2;i++)for(let j=0;j<2;j++)x.fillRect(12+j*64,12+i*64,40,34)})});
  const fmat=(col,rx,ry)=>{rx=Math.max(1,Math.round(rx));ry=Math.max(1,Math.round(ry));const k=col+rx+'_'+ry;if(fm[k])return fm[k];const f=fac(col);const m=new THREE.MeshLambertMaterial({map:tx(f.d,rx,ry),emissiveMap:tx(f.e,rx,ry),emissive:0x000000});wm.push(m);return fm[k]=m};
  const bld=(x0,x1,z0,z1,fl,col,roof)=>{
    const h=fl*3.5,w=x1-x0,d=z1-z0,mx=fmat(col,d/8,fl/2),mz=fmat(col,w/8,fl/2),r=M(roof||0x6f6f6c);
    const b=new THREE.Mesh(U,[mx,mx,r,r,mz,mz]);b.scale.set(w,h,d);b.position.set(x0+w/2,h/2+.3,z0+d/2);CL.push([x0,x1,z0,z1,0,h+.3]);g.add(b);
    box(x0-.3,x1+.3,z0-.3,z1+.3,h+.3,h+.9,0x55575a);occ.push([x0-3,x1+3,z0-3,z1+3]);
    for(let i=0;i<3;i++){const a=x0+2+R()*(w-5),c=z0+2+R()*(d-5);box(a,a+2,c,c+2,h+.9,h+2,0x8c8f93)}
    return h+.9};
  const wl=(xa,xb,za,zb,y0,y1,col)=>{const w=xb-xa,d=zb-za,mx=fmat(col,d/8,(y1-y0)/7),mz=fmat(col,w/8,(y1-y0)/7),r=M(0x6f6f6c),b=new THREE.Mesh(U,[mx,mx,r,r,mz,mz]);b.scale.set(w,y1-y0,d);b.position.set(xa+w/2,(y0+y1)/2,za+d/2);CL.push([xa,xb,za,zb,y0,y1]);g.add(b)};
  /* parede com janelas abertas (peitoril, verga e pilares) */
  const ww=(xa,xb,za,zb,Y,fl,col)=>{const L=xb-xa,n=Math.floor(L/6),s=L/Math.max(n,1);
    for(let k=0;k<fl;k++){const yb=Y+3.5*k,yt=yb+3.5;
      if(!n){box(xa,xb,za,zb,yb,yt,col);continue}
      box(xa,xb,za,zb,yb,yb+1.1,col);box(xa,xb,za,zb,yb+2.5,yt,col);
      let p=xa;for(let i=0;i<n;i++){const c=xa+(i+.5)*s;box(p,c-1.2,za,zb,yb+1.1,yb+2.5,col);p=c+1.2}box(p,xb,za,zb,yb+1.1,yb+2.5,col)}};
  /* prédio OCO: paredes com porta, andares, escadas alternadas, divisórias, caixotes e teto acessível */
  const sgc={},sgn=(x,y,z,t)=>{const k=sgc[t]||(sgc[t]=new THREE.CanvasTexture(cv(256,64,s=>{s.fillStyle='#e0b03a';s.fillRect(0,0,256,64);s.fillStyle='#111';s.font='900 32px Arial';s.textAlign='center';s.textBaseline='middle';s.fillText(t,128,34)})));const p=new THREE.Sprite(new THREE.SpriteMaterial({map:k}));p.position.set(x,y,z);p.scale.set(3.2,.8,1);g.add(p)};
  const hol=(x0,x1,z0,z1,fl,col,dr,open,cust)=>{
    const h=fl*3.5,Y=.3,t=.8,zm=(z0+z1)/2,T=Y+h;
    if(open){wl(x0,dr-2,z1-t,z1,Y,T,col);wl(dr+2,x1,z1-t,z1,Y,T,col);wl(x0,x1,z0,z0+t,Y,T,col)}else{ww(x0,dr-2,z1-t,z1,Y,fl,col);ww(dr+2,x1,z1-t,z1,Y,fl,col);ww(x0,x1,z0,z0+t,Y,fl,col)}wl(dr-2,dr+2,z1-t,z1,Y+3,T,col);
    for(const [xa,xb] of [[x0,x0+t],[x1-t,x1]]){wl(xa,xb,z0+t,zm-2,Y,T,col);wl(xa,xb,zm+2,z1-t,Y,T,col);wl(xa,xb,zm-2,zm+2,Y+3,T,col)}
    box(x0+t,x1-t,z0+t,z1-t,Y,Y+.05,0x8d8a82);occ.push([x0-3,x1+3,z0-3,z1+3]);
    if(open)return T;
    for(let k=1;k<=fl;k++){
      const y=Y+3.5*k,a=k%2?x0+t+.5:x1-t-7.5,sc=k===fl?0x6f6f6c:0x8d8a82;sgn(k%2?a+5.8:a+1.2,y-3.5+2.7,z0+t+1.5,k===fl?'↑ TELHADO':'↑ ESCADA');
      box(x0+t,a,z0+t,z1-t,y-.3,y,sc);box(a+7,x1-t,z0+t,z1-t,y-.3,y,sc);box(a,a+7,z0+t+3,z1-t,y-.3,y,sc);
      for(let i=0;i<14;i++){const xs=k%2?a+7-(i+1)*.5:a+i*.5;box(xs,xs+.5,z0+t+.1,z0+t+3,y-3.5,y-3.5+(i+1)*.25,i%2?0xe0b03a:0x9a9890)}
    }
    for(let k=0;k<(cust?0:fl);k++){const y=Y+3.5*k+(k?0:.05);
      for(const p of [x0+(x1-x0)*.38,x0+(x1-x0)*.7]){box(p,p+.3,z0+t+3.5,zm-1.5,y,y+3.2,0xb5ad9c);box(p,p+.3,zm+1.5,z1-t,y,y+3.2,0xb5ad9c)}
      for(let i=0;i<2;i++){const cx=x0+10+R()*(x1-x0-20),cz=zm-4+R()*8,s=.6+R()*.3;box(cx-s,cx+s,cz-s,cz+s,y,y+s*2,0x8a6b43)}}
    for(let i=0;i<3;i++){const cx=x0+8+R()*(x1-x0-16);box(cx-1,cx+1,z1-3,z1-1,T,T+1.1,0x8a6b43)}
    for(const [xa,xb,za,zb] of [[x0,x1,z1-t,z1],[x0,x1,z0,z0+t],[x0,x0+t,z0,z1],[x1-t,x1,z0,z1]])box(xa,xb,za,zb,T,T+1.2,0x6f6f6c);
    return T};
  /* ---------- chão, calçada, grama, muro ---------- */
  plane(-700,700,-600,600,0,M(0x45484c));
  box(-96,96,-71,71,0,.15,0x9b988f);
  const grassC=cv(64,64,x=>{x.fillStyle='#5f9448';x.fillRect(0,0,64,64);for(let i=0;i<200;i++){x.fillStyle=R()<.5?'rgba(0,0,0,.1)':'rgba(255,255,255,.08)';x.fillRect(R()*64,R()*64,2,2)}});
  box(-90,90,-65,65,.15,.3,mb(grassC,30,22));
  for(let x=-200;x<200;x+=14)box(x,x+7,89.8,90.2,0,.04,0xe6c200);
  for(let x=-112;x<112;x+=14)box(x,x+7,-100.2,-99.8,0,.04,0xe6c200);
  for(let z=-100;z<90;z+=14){box(-112.2,-111.8,z,z+7,0,.04,0xe6c200);box(111.8,112.2,z,z+7,0,.04,0xe6c200)}
  for(let i=0;i<7;i++)box(48+i*2.4,49.6+i*2.4,74,86,0,.05,0xf2f2f2);
  const wc=0xbdb7aa;
  box(-90,22,65,65.8,.15,3.4,wc);box(46,90,65,65.8,.15,3.4,wc);box(-90,90,-65.8,-65,.15,3.4,wc);box(-90.8,-90,-65.8,65.8,.15,3.4,wc);box(90,90.8,-65.8,65.8,.15,3.4,wc);
  const gc=[0xe63946,0x2a9d8f,0xf4a261,0x7b2cbf];
  for(let i=0;i<7;i++)box(89.6,90,-20+i*9,-12+i*9,.5,3,gc[i%4]);
  /* ---------- 7 PORTARIA ---------- */
  box(22,27,58,65.8,.15,10,0x8a7f70);box(41,46,58,65.8,.15,10,0x8a7f70);box(22,46,59,65.8,8,10.6,0x6d6459);
  const sg=cv(512,96,x=>{x.fillStyle='#14324a';x.fillRect(0,0,512,96);x.fillStyle='#fff';x.font='900 46px "Arial Black",Impact,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('COLÉGIO CENTRAL',256,50)});
  const sp=new THREE.Mesh(new THREE.PlaneGeometry(17,2.3),new THREE.MeshBasicMaterial({map:tx(sg)}));sp.position.set(34,9.3,65.95);g.add(sp);
  box(48,53,56,61,.15,3.5,0xcfc9bb);box(47.5,53.5,55.5,61.5,3.5,3.9,0x55575a);box(48.2,52.8,60.9,61.1,1.5,3,0x20303c);
  box(27,41,62,62.4,1.2,1.5,0xdd3322);occ.push([20,56,54,67]);
  /* ---------- 1 BLOCO PRINCIPAL (U com pátio e fonte) ---------- */
  const b1=hol(-28,38,-26,-6,4,'#cdbfa6',5,0,1);
  for(let i=0;i<2;i++)for(let j=0;j<4;j++){const p=box(-4+j*6,1+j*6,-23+i*5,-19+i*5,b1,b1+.4,0x1b2a4a);p.rotation.x=-.25}
  
  const fx=6,fz=2;
  const fo=(r,y0,y1,c)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,y1-y0,20),M(c));m.position.set(fx,(y0+y1)/2,fz);g.add(m)};
  fo(9,.3,.4,0xd8c9a8);fo(4,.4,1,0x9a9a94);fo(3.4,.9,1.1,0x4aa3d8);box(fx-.4,fx+.4,fz-.4,fz+.4,1,3.6,0x8a8a84);box(fx-.6,fx+.6,fz-.3,fz+.3,3.6,5.2,0x777771);
  /* ---------- 2 ANEXO ---------- */
  const b2=hol(-32,0,-62,-44,2,'#b8c4c9',-16,0,1);bld(-44,-32,-58,-48,1,'#b8c4c9');
  /* ---------- 4 BIBLIOTECA ---------- */
  const b4=hol(-78,-44,-24,-2,3,'#c8a878',-61,0,1);
  /* ---------- 3 GINÁSIO (teto em arco) ---------- */
  const b3=hol(30,78,-58,-32,2,'#d9a15a',54,true);
  const ar=new THREE.Mesh(new THREE.CylinderGeometry(13,13,48,24,1,false,0,Math.PI),new THREE.MeshLambertMaterial({color:0x5b6b7a,side:THREE.DoubleSide}));
  ar.rotation.z=Math.PI/2;ar.scale.set(.4,1,1);ar.position.set(54,b3,-45);g.add(ar);
  for(const ex of [30,78]){const e=new THREE.Mesh(new THREE.CircleGeometry(13,24,0,Math.PI),new THREE.MeshLambertMaterial({color:0xd9a15a,side:THREE.DoubleSide}));e.scale.set(1,.4,1);e.rotation.y=Math.PI/2;e.position.set(ex,b3,-45);g.add(e)}
  /* ---------- 8 QUADRA ESPORTIVA ---------- */
  const ct=cv(576,480,x=>{x.fillStyle='#c4455a';x.fillRect(0,0,576,480);x.fillStyle='#2f8f5b';x.fillRect(48,48,480,384);x.strokeStyle='#fff';x.lineWidth=4;x.strokeRect(48,48,480,384);x.beginPath();x.moveTo(288,48);x.lineTo(288,432);x.stroke();x.beginPath();x.arc(288,240,50,0,7);x.stroke();x.strokeRect(48,150,90,180);x.strokeRect(438,150,90,180)});
  box(47,83,-4,26,.3,.45,0x777a7c);plane(47,83,-4,26,.46,mb(ct));
  for(let i=0;i<4;i++)box(50,80,-5.4-i*1.4,-4-i*1.4,.3,.5+(i+1)*.7,0x2f6fd0);
  for(const hx of [49,81]){box(hx-.2,hx+.2,10.8,11.2,.45,4,0xeeeeee);box(hx-.1,hx+.1,10,12,3,4.2,0xffffff)}
  const fmw=new THREE.MeshBasicMaterial({color:0x8a9096,wireframe:true});
  for(const [x0,x1,z0,z1] of [[47,83,26,26.1],[47,83,-4.1,-4],[47,47.1,-4,26],[83,83.1,-4,26]]){const w=x1-x0,d=z1-z0,L=Math.max(w,d);const q=new THREE.Mesh(new THREE.PlaneGeometry(L,3,Math.round(L/.8),4),fmw);q.position.set((x0+x1)/2,1.9,(z0+z1)/2);if(d>w)q.rotation.y=Math.PI/2;g.add(q)}
  occ.push([44,86,-8,29]);
  /* ginásio: quadra, arquibancadas e tabelas */
  plane(39,69,-57,-33,.42,mb(ct));
  for(const [za,zb] of [[-55,-48],[-42,-35]])for(let i=0;i<5;i++){box(39-(i+1)*1.5,39-i*1.5,za,zb,.3,.3+(i+1)*.7,0x2f6fd0);box(69+i*1.5,69+(i+1)*1.5,za,zb,.3,.3+(i+1)*.7,0xe08a1e)}
  for(const hx of [40,68]){box(hx-.15,hx+.15,-45.2,-44.8,.4,4,0xeeeeee);box(hx-.1,hx+.1,-46,-44,3,4.2,0xffffff)}
  /* biblioteca: estantes com livros e mesas em cada andar */
  for(let k=0;k<3;k++){const y=k?.3+3.5*k:.35,bc=[0xc0392b,0x2980b9,0xf1c40f,0x27ae60];
    for(let j=0;j<3;j++)for(const [xa,xb] of [[-75,-64],[-58,-47]]){const z=-17+j*5;box(xa,xb,z-.4,z+.4,y,y+2.4,0x6b3f2a);box(xa,xb,z+.4,z+.45,y+.3,y+2.2,bc[(j+k)%4])}
    }
  /* anexo: mesas de laboratório */
  /* mobília em lote (1 chamada por cor): fu = caixa instanciada */
  const fi={},fu=(x0,x1,z0,z1,y0,y1,c)=>{CL.push([x0,x1,z0,z1,y0,y1]);const kk=c+'|'+Math.floor((x0+x1)/64)+'|'+Math.floor((z0+z1)/64)+'|'+Math.floor(y0/3.5+.1);(fi[kk]=fi[kk]||[]).push([(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0])};
  const wc2=0xb5ad9c,yy=k=>k?.3+3.5*k:.35,lgc=0x5a5a5e;
  /* tb=mesa (tampo+4 pés), ch=cadeira (assento, encosto, 4 pés), lw=mureta baixa 1,1 m, tt=mesa tombada de lado com os pés para trás */
  const tb=(cx,cz,y,w,d,c)=>{fu(cx-w/2,cx+w/2,cz-d/2,cz+d/2,y+.7,y+.76,c);for(const a of [-1,1])for(const b of [-1,1])fu(cx+a*(w/2-.07)-.03,cx+a*(w/2-.07)+.03,cz+b*(d/2-.07)-.03,cz+b*(d/2-.07)+.03,y,y+.7,lgc)};
  const ch=(cx,cz,y,s)=>{fu(cx-.22,cx+.22,cz-.22,cz+.22,y+.44,y+.49,0x3a4a6b);const b=cz+s*.2;fu(cx-.22,cx+.22,b-.025,b+.025,y+.49,y+.9,0x3a4a6b);for(const a of [-1,1])for(const e of [-1,1])fu(cx+a*.18-.02,cx+a*.18+.02,cz+e*.18-.02,cz+e*.18+.02,y,y+.44,lgc)};
  const lw=(x0,x1,z0,z1,y)=>fu(x0,x1,z0,z1,y,y+1.1,0xa59c8a);
  const tt=(cx,cz,y,s)=>{fu(cx-.9,cx+.9,cz-.04,cz+.04,y,y+1,0x9b7b53);for(const a of [-1,1])for(const e of [.1,.9]){const lz=cz+s*.04;fu(cx+a*.8-.035,cx+a*.8+.035,Math.min(lz,lz+s*.72),Math.max(lz,lz+s*.72),y+e-.035,y+e+.035,0x6b4a2b)}};
  const dv=(x,za,zb,y)=>fu(x-.15,x+.15,za,zb,y,y+3.2,wc2);
  const cw=(xa,xb,z,y)=>{const c=(xa+xb)/2;fu(xa,c-1.1,z-.15,z+.15,y,y+3.2,wc2);fu(c+1.1,xb,z-.15,z+.15,y,y+3.2,wc2)};
  const rm=(xa,xb,za,zb,y,n)=>{const xc=(xa+xb)/2,tz=n?za+1.5:zb-1.5,s=n?1:-1;
    fu(xa+2.5,xb-2.5,n?za:zb-.15,n?za+.15:zb,y+1,y+2.4,0x1f3d2b);tb(xc,tz,y,2.6,.8,0x7a5a3a);
    for(let i=0;i<3;i++)for(let j=0;j<2;j++){const x=xa+2.2+i*3.2,z=tz+s*(1.9+j*1.7);tb(x,z,y,1.6,.7,0x9b7b53);ch(x,z+s*.85,y,s)}};
  /* BLOCO PRINCIPAL: corredor central, 4 salas de aula de cada lado, hall nas pontas (escadas), recepção no térreo */
  for(let k=0;k<4;k++){const y=yy(k);
    for(let i=0;i<4;i++){const xa=-16.4+10.8*i,xb=xa+10.8;rm(xa,xb,-25.2,-17,y,1);cw(xa,xb,-17,y);if(k||i%3==0){rm(xa,xb,-13,-6.8,y,0);cw(xa,xb,-13,y)}}
    for(const x of [-16.4,-5.6,5.2,16,26.8]){dv(x,-25.2,-17,y);if(k||x!==5.2)dv(x,-13,-6.8,y)}
    for(const sx of [-22,32]){tt(sx,-12,y,1);tt(sx+2.5,-8.5,y,-1);lw(sx-4,sx-1,-10.2,-9.85,y)}
    fu(-12,-8,-16.85,-16.3,y,y+1.9,0x4a6a8a);fu(8,12,-13.7,-13.15,y,y+1.9,0x4a6a8a);lw(-6,-5.65,-17,-14.8,y);lw(2,2.35,-15.2,-13,y);lw(11,11.35,-17,-14.8,y);lw(19,19.35,-15.2,-13,y);sgn(-13,y+2.7,-15,'← ESCADA');sgn(24,y+2.7,-15,'ESCADA →')}
  fu(-3,3,-11,-10,.35,1.2,0x7a5a3a);fu(9,13,-9.6,-9,.35,.8,0x6b4a2b);lw(5,8,-12,-11.65,.35);tt(13.5,-11,.35,-1);
  /* ANEXO: laboratório (bancadas e banquinhos) + sala técnica (computadores), divisória com passagem */
  for(let k=0;k<2;k++){const y=yy(k);dv(-16,-61.2,-53.9,y);dv(-16,-51.1,-44.8,y);
    for(const bx of [-28,-21])for(const bz of [-55,-49]){tb(bx,bz,y,3.6,1.2,0x6b6f73);ch(bx,bz+1.1,y,1)}
    for(let i=0;i<3;i++)for(const z of [-56,-50]){const x=-12+i*4;tb(x,z,y,2,1,0x9b7b53);fu(x-.4,x+.4,z-.15,z+.05,y+.76,y+1.1,0x111111);ch(x,z+.95,y,1)}
    fu(-31,-18,-45.6,-44.8,y,y+1.9,0x8a8f94);fu(-14,-2,-45.6,-44.8,y,y+1.9,0x8a8f94);tt(-24,-52,y,1);lw(-9,-5,-53.1,-52.75,y)}
  /* BIBLIOTECA: cadeiras nas mesas e balcão de atendimento no térreo */
  for(let k=0;k<3;k++){const y=yy(k);for(const [x,z] of [[-62,-13.8],[-60,-13.8],[-62,-10.2],[-60,-10.2]])ch(x,z,y,z<-12?-1:1);tb(-61,-12,y,4,2,0x9b7b53);lw(-56,-52,-9.5,-9.15,y);tt(-70,-9.5,y,1)}
  fu(-74,-65,-4.5,-3.5,.35,1.2,0x7a5a3a);fu(-57,-48,-4.5,-3.5,.35,1.2,0x7a5a3a);
  /* GINÁSIO: colchonetes empilhados na quadra */
  for(const [x,z] of [[46,-50],[46,-40],[62,-50],[62,-40],[54,-45]])fu(x-1.5,x+1.5,z-.8,z+.8,.45,1.5,0x2f6fd0);tt(54,-52,.45,1);tt(54,-38,.45,-1);
  /* decoração sem colisão: faixas no ginásio, mastro, grafites e cones */
  const dc=(a,b,c2,d,e,f,m)=>{box(a,b,c2,d,e,f,m);CL.pop()};
  for(const [x,c3] of [[36,0xc0392b],[44,0x2980b9],[52,0xf1c40f],[60,0x27ae60],[68,0x8e44ad],[74,0xe67e22]])dc(x-1.4,x+1.4,-57.2,-57.1,3.2,6.2,c3);
  dc(17.9,18.1,59.9,60.1,.3,11,0xcccccc);dc(18.1,21.6,59.9,60.1,8.2,10.2,0x2a9d8f);
  for(const [x,c3] of [[-60,0xe63946],[-20,0x2a9d8f],[25,0xf4a261],[60,0x7b2cbf]])dc(x,x+6,-65,-64.9,1,3,c3);
  for(const [z,c3] of [[-40,0x1e90ff],[20,0xffc61a]])dc(-90,-89.9,z,z+5,1,3,c3);
  for(const [x,z] of [[-48,30],[-44,30],[-40,30],[-36,30],[30,16],[34,16]])dc(x-.25,x+.25,z-.25,z+.25,.3,.9,0xff6a1a);
  /* barricadas (poucas): muretas, jersey e caixotes */
  const rt=(b,r)=>{b.rotation.y=r;const e=b.cl,cx=(e[0]+e[1])/2,cz=(e[2]+e[3])/2,hw=(e[1]-e[0])/2,hd=(e[3]-e[2])/2,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r)),w=c*hw+s*hd,d=s*hw+c*hd;e[0]=cx-w;e[1]=cx+w;e[2]=cz-d;e[3]=cz+d;occ.push([e[0]-1.2,e[1]+1.2,e[2]-1.2,e[3]+1.2])};
  const jb=(x,z,r)=>{rt(box(x-1.5,x+1.5,z-.4,z+.4,.3,1.5,0x9a9a94),r||0)};
  const crt=(x,z,s)=>{R();rt(box(x-s,x+s,z-s,z+s,.3,.3+s*2,0x8a6b43),0)};
  const mu=(x,z,r)=>{rt(box(x-3,x+3,z-.3,z+.3,.3,1.5,0xa59c8a),r||0)};
  const pall=(x,z,r)=>{rt(box(x-1.1,x+1.1,z-.8,z+.8,.3,1.05,0x9b7b53),r||0)};
  const ctn=(x,z,r,c)=>{rt(box(x-3,x+3,z-1.25,z+1.25,.3,2.9,c),r||0)};
  for(const [x,z,r] of [[14,22],[30,22],[22,36,1.57],[8,40],[38,40],[30,12],[40,-6,1.57],[-16,-38]])mu(x,z,r);
  for(const [x,z] of [[-2,30],[42,30],[25,50],[44,50],[-61,4],[-30,-36]])jb(x,z,0);
  for(const [x,z] of [[26,28],[18,44],[34,46],[50,-28],[58,-28],[-52,3]])crt(x,z,.9);
  /* barricadas espalhadas pelo mapa (fora dos prédios) */
  for(const [x,z,r] of [[46,-22],[75,-14,1.57],[0,-40],[-50,60],[60,32],[14,-32],[-70,12,1.57],[-20,5],[-82,-20,1.57],[70,50],[-40,-55],[85,55,1.57],[16,-3,1.57]])mu(x,z,r);
  for(const [x,z,r] of [[60,-20],[-38,-40,1.57],[-56,8],[-56,30,1.57],[-40,30,1.57],[10,60],[65,62],[0,76],[-20,78],[80,78],[44,-16,1.57],[-60,-60],[85,-55],[-10,-33],[-88,40,1.57],[88,10,1.57],[-30,76],[40,78],[-75,-50]])jb(x,z,r);
  for(const [x,z] of [[70,-24],[-85,-10],[-70,31],[5,-36],[78,32],[-45,-60],[0,10],[50,36],[-20,66],[88,-40],[-88,55]])crt(x,z,.9);
  /* rua e calçada fora do muro */
  for(const [x,z,r] of [[-120,80],[120,80,1.57],[-130,-20,1.57],[130,0],[0,-85],[-60,-82],[70,-82],[10,100]])mu(x,z,r);
  for(const [x,z,r] of [[-100,95],[100,95],[-110,-45],[115,-45,1.57],[40,-85]])jb(x,z,r);
  for(const [x,z] of [[-90,80],[95,70],[-120,10],[125,-30]])crt(x,z,1);
  /* contêineres e paletes: cobertura nova */
  for(const [x,z,r,c] of [[70,42,0,0x2a6f97],[10,-38,0,0xa63d40],[-60,-42,1.57,0x3f7a5c],[-8,78,0,0x2a6f97]])ctn(x,z,r,c);
  for(const [x,z,r] of [[18,10,0.4],[-35,5,1.2],[40,-24,0],[60,60,0.3],[-75,62,1.57],[55,-62,0],[10,-55,0.8],[-40,-70,0],[100,60,0.5],[-100,-60,1]])pall(x,z,r);
  /* áreas livres de árvores: pontos de captura, postes e bancos */
  occ.push([16,28,26,38]);
  for(const [lx,lz] of [[-8,50],[20,50],[44,50],[-8,20],[20,20],[44,20],[-20,-30],[40,-12],[-40,10],[30,69],[60,69],[-30,69]])occ.push([lx-2,lx+2,lz-2,lz+2]);
  for(const [bx,bz] of [[10,30],[22,24],[34,30],[22,42],[4,44],[40,44]])occ.push([bx-3,bx+3,bz-2.5,bz+2.5]);
  /* ---------- 5 ESTACIONAMENTO ---------- */
  const pk=cv(512,420,x=>{x.fillStyle='#3d3f43';x.fillRect(0,0,512,420);x.strokeStyle='#e8e8e8';x.lineWidth=3;for(const [a,b] of [[27,119],[237,329]]){x.beginPath();x.moveTo(30,a);x.lineTo(430,a);x.moveTo(30,b);x.lineTo(430,b);x.stroke();for(let i=0;i<=16;i++){x.beginPath();x.moveTo(40+i*25.6,a);x.lineTo(40+i*25.6,b);x.stroke()}}});
  box(-84,-28,12,58,.3,.34,0x3d3f43);plane(-84,-28,12,58,.35,mb(pk));occ.push([-86,-26,10,60]);
  const car=(x,z,c)=>{box(x-1,x+1,z-2.1,z+2.1,.4,1.3,c);box(x-.9,x+.9,z-1.1,z+1,1.3,2,0x222a33)};
  const cc=[0xc9ccd0,0x2b4a8a,0xa32b2b,0x1f1f22,0x3f7a5c,0xd9d9d9,0x6a6e75];
  for(const zc of [17.5,22.5,40.5,45.5])for(let i=0;i<16;i++)if(R()<.55)car(-80+2.8*(i+.5),zc,cc[Math.floor(R()*cc.length)]);
  for(const [px,pz] of [[-26,44],[-4,44],[-26,56],[-4,56]])box(px-.3,px+.3,pz-.3,pz+.3,.3,5,0x555555);
  const cn=box(-27,-3,43,58,5,5.4,0x28405c);cn.rotation.x=.08;occ.push([-30,0,40,60]);
  /* ---------- 6 PÁTIO CENTRAL ---------- */
  const tl=cv(64,64,x=>{x.fillStyle='#d6c8a8';x.fillRect(0,0,64,64);x.strokeStyle='#b9a982';x.lineWidth=2;x.strokeRect(0,0,64,64)});
  box(-6,46,14,54,.3,.34,0xcfc0a0);plane(-6,46,14,54,.35,mb(tl,26,20));
  plane(0,12,-10,14,.35,mb(tl,6,12));plane(28,40,50,66,.35,mb(tl,6,8));
  for(const [bx,bz] of [[10,30],[22,24],[34,30],[22,42],[4,44],[40,44]]){box(bx-1.2,bx+1.2,bz-.4,bz+.4,.7,.95,0x6b4a2b);box(bx-1.2,bx-.95,bz-.45,bz+.4,.34,.7,0x444444);CL.pop();box(bx+.95,bx+1.2,bz-.45,bz+.4,.34,.7,0x444444);CL.pop();box(bx-1.2,bx+1.2,bz-.5,bz-.3,.95,1.5,0x6b4a2b)}
  /* ---------- árvores ---------- */
  const tp=[];
  for(let i=0;i<900&&tp.length<110;i++){const x=-86+R()*172,z=-61+R()*122;if([...occ,[-6,18,-8,14],[26,42,48,66],[-9,12,-10,16]].some(a=>x>a[0]&&x<a[1]&&z>a[2]&&z<a[3]))continue;if(tp.some(q=>Math.hypot(q[0]-x,q[1]-z)<4))continue;tp.push([x,z,R()<.4])}
  const tg=new THREE.CylinderGeometry(.25,.35,1,6);tg.translate(0,.5,0);
  const pg=new THREE.ConeGeometry(1,1,8);pg.translate(0,.5,0);
  const tr=new THREE.InstancedMesh(tg,M(0x6b4a2b),tp.length),cr=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshLambertMaterial({color:0xffffff}),tp.length),pn=new THREE.InstancedMesh(pg,new THREE.MeshLambertMaterial({color:0xffffff}),tp.length),o=new THREE.Object3D(),col=new THREE.Color();
  let ti=0,ri=0,pi2=0;
  tp.forEach(t=>{CL.push([t[0]-.2,t[0]+.2,t[1]-.2,t[1]+.2,.3,3]);
    if(t[2]){const h=7+R()*2.5,w=2.3+R()*1.2;o.position.set(t[0],.3,t[1]);o.scale.set(1,h*.5,1);o.updateMatrix();tr.setMatrixAt(ti++,o.matrix);
      o.position.set(t[0],.3+h*.3,t[1]);o.scale.set(w,h*.8,w);o.updateMatrix();pn.setMatrixAt(pi2,o.matrix);pn.setColorAt(pi2++,col.setHSL(.33+R()*.04,.5,.2+R()*.08))}
    else{const h=3+R()*1.5,rr=1.1+R()*.5;o.position.set(t[0],.3,t[1]);o.scale.set(1,h,1);o.updateMatrix();tr.setMatrixAt(ti++,o.matrix);
      o.position.set(t[0],.3+h,t[1]);o.scale.set(rr*1.2,rr*1.05,rr*1.2);o.updateMatrix();cr.setMatrixAt(ri,o.matrix);cr.setColorAt(ri++,col.setHSL(.22+R()*.12,.5,.25+R()*.14))}});
  tr.count=ti;cr.count=ri;pn.count=pi2;
  g.add(tr,cr,pn);tr.frustumCulled=cr.frustumCulled=pn.frustumCulled=false;tr.castShadow=cr.castShadow=pn.castShadow=true;
  /* ---------- cidade ao redor (blocos escuros) ---------- */
  const cp=[];for(let x=-340;x<=340;x+=26)for(let z=-260;z<=260;z+=26){if(Math.abs(x)<190&&Math.abs(z)<150)continue;cp.push([x+(R()-.5)*4,z+(R()-.5)*4,8+R()*R()*42,14+R()*8,.8+R()*.4])}
  const ci=new THREE.InstancedMesh(U,new THREE.MeshLambertMaterial({color:0xffffff}),cp.length),pal=['#5d5f63','#6e6a63','#77706a','#4f5358','#8a7f72','#59606a'];
  cp.forEach((c,i)=>{o.position.set(c[0],c[2]/2,c[1]);o.scale.set(c[3],c[2],c[3]*c[4]);o.updateMatrix();ci.setMatrixAt(i,o.matrix);ci.setColorAt(i,col.set(pal[Math.floor(R()*pal.length)]))});
  ci.frustumCulled=false;g.add(ci);
  box(60,71,80,83.6,.6,3.8,0xf2c200);box(60.2,70.8,79.9,83.7,2.1,3.2,0x20303c);
  for(const [lx,lz] of [[-8,50],[20,50],[44,50],[-8,20],[20,20],[44,20],[-20,-30],[40,-12],[-40,10],[30,69],[60,69],[-30,69]]){box(lx-.12,lx+.12,lz-.12,lz+.12,.3,6,0x333333);box(lx-.5,lx+.5,lz-.5,lz+.5,6,6.3,lampM)}
  /* spawns (triângulos amarelos) */
  const spw=new THREE.Group(),cg=new THREE.ConeGeometry(1.1,2.4,3);
  const SPW=[[-56,31],[54,-42]],CAPS=[['A',22,32,'#ffc61a'],['B',5,-15,'#1e90ff'],['C',-61,-7,'#ff3b3b']];
  
  for(const [n,x,z,c] of CAPS){const rg=new THREE.Mesh(new THREE.RingGeometry(2.6,3.2,40),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.85,side:THREE.DoubleSide}));rg.rotation.x=-Math.PI/2;rg.position.set(x,.43,z);spw.add(rg);
    const dk=new THREE.Mesh(new THREE.CircleGeometry(2.6,40),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.2,side:THREE.DoubleSide}));dk.rotation.x=-Math.PI/2;dk.position.set(x,.42,z);spw.add(dk);
    const bm=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,6,6),new THREE.MeshBasicMaterial({color:c}));bm.position.set(x,3.4,z);spw.add(bm);
    const sk=cv(128,128,q=>{q.fillStyle=c;q.beginPath();q.arc(64,64,58,0,7);q.fill();q.fillStyle='#000';q.font='900 80px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText(n,64,70)});
    const s2=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(sk),transparent:true}));s2.position.set(x,7.2,z);s2.scale.set(2.6,2.6,1);spw.add(s2)}
  g.add(spw);
  /* ---------- rótulos numerados ---------- */
  const mk=[[1,'Bloco Principal',5,-18,b1+7,'#1e90ff'],[2,'Anexo',-16,-53,b2+7,'#7dff3a'],[3,'Ginásio',54,-45,b3+12,'#ff8c1a'],[4,'Biblioteca',-61,-13,b4+7,'#ff3b3b'],[5,'Estacionamento',-55,35,9,'#c050ff'],[6,'Pátio Central',22,32,8,'#ffc61a'],[7,'Portaria',34,61,15,'#1ad6ff'],[8,'Quadra Esportiva',65,11,10,'#ff4fa0']];
  const lb=new THREE.Group(),spr=[],markers=[];
  for(const [n,nm,x,z,y,c] of mk){
    const k=cv(320,96,s=>{s.fillStyle='rgba(8,14,22,.88)';s.fillRect(40,18,272,60);s.strokeStyle=c;s.lineWidth=4;s.strokeRect(40,18,272,60);s.fillStyle=c;s.beginPath();s.arc(48,48,40,0,7);s.fill();s.fillStyle='#fff';s.strokeStyle='#000';s.lineWidth=5;s.font='900 46px Arial';s.textAlign='center';s.textBaseline='middle';s.strokeText(n,48,50);s.fillText(n,48,50);s.font='700 25px Arial';s.fillStyle=c;s.fillText(nm,182,50)});
    const p=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(k),depthTest:false,transparent:true}));p.position.set(x,y,z);p.renderOrder=20;lb.add(p);spr.push(p);markers.push({n,name:nm,x,y:Math.min(y,10),z})}
  for(const c in fi){const a=fi[c],kp=c.split('|').map(Number),im=new THREE.InstancedMesh(U,M(kp[0]),a.length);a.forEach((v,i)=>{o.position.set(v[0],v[1],v[2]);o.scale.set(v[3],v[4],v[5]);o.updateMatrix();im.setMatrixAt(i,o.matrix)});im.frustumCulled=false;im.castShadow=im.receiveShadow=true;im.userData={cx:(kp[1]+.5)*32,cz:(kp[2]+.5)*32,lv:kp[3]};FM.push(im);g.add(im)}
  const cull=(px,py,pz,all)=>{const lv=Math.floor((py+.1)/3.5);for(const m of FM){const u=m.userData;m.visible=all||(Math.abs(u.cx-px)<62&&Math.abs(u.cz-pz)<62&&Math.abs(u.lv-lv)<=1)}};
  /* junta as caixas sólidas de mesma cor em blocos por região: poucos desenhos e ainda com culling */
  {const grp={};for(const b of SB){b.updateMatrix();const k=b.userData.c+'|'+Math.floor(b.position.x/48)+'|'+Math.floor(b.position.z/48);(grp[k]=grp[k]||[]).push(b)}
   const pa=U.attributes.position,na=U.attributes.normal,ia=U.index,V=pa.count,IC=ia.count,nm=new THREE.Matrix3(),v=new THREE.Vector3(),kids=new Set();
   for(const k in grp){const a=grp[k],PP=new Float32Array(a.length*V*3),NN=new Float32Array(a.length*V*3),II=new Uint32Array(a.length*IC);
     a.forEach((b,j)=>{nm.getNormalMatrix(b.matrix);for(let i=0;i<V;i++){v.fromBufferAttribute(pa,i).applyMatrix4(b.matrix);PP[(j*V+i)*3]=v.x;PP[(j*V+i)*3+1]=v.y;PP[(j*V+i)*3+2]=v.z;v.fromBufferAttribute(na,i).applyMatrix3(nm).normalize();NN[(j*V+i)*3]=v.x;NN[(j*V+i)*3+1]=v.y;NN[(j*V+i)*3+2]=v.z}for(let i=0;i<IC;i++)II[j*IC+i]=ia.getX(i)+j*V;kids.add(b)});
     const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.BufferAttribute(PP,3));ge.setAttribute('normal',new THREE.BufferAttribute(NN,3));ge.setIndex(new THREE.BufferAttribute(II,1));
     const me=new THREE.Mesh(ge,a[0].material);me.castShadow=me.receiveShadow=true;g.add(me)}
   g.children=g.children.filter(c=>!kids.has(c))}
  g.add(lb);scene.add(g);
  const setNight=n=>{wm.forEach(m=>m.emissive.set(n?0xffffff:0));lampM.color.set(n?0xffe9a0:0x888888)};
  return {group:g,labels:lb,spawns:spw,spr,markers,setNight,CL,cull,SPW,CAPS};
}

/* Adaptador para o motor do jogo: mesmo formato do buildFavela (colliders [x0,y0,z0,x1,y1,z1], heightAt, spawns,
   maze para bots/minimapa) + cfg com o que é específico do mapa (zona segura, spawn da polícia, lojas, limites). */
function buildColegioGame(THREE, scene) {
  const m = buildColegio(scene);
  m.labels.visible = false;                               // rótulos atravessariam paredes
  const colliders = m.CL.map(c => [c[0], c[4], c[2], c[1], c[5], c[3]]);
  const GS = 6, GR = new Map(), gk = (i, j) => (i + 200) * 1000 + (j + 200);
  for (const c of m.CL) for (let i = Math.floor(c[0] / GS); i <= Math.floor(c[1] / GS); i++) for (let j = Math.floor(c[2] / GS); j <= Math.floor(c[3] / GS); j++) { const k = gk(i, j); (GR.get(k) || GR.set(k, []).get(k)).push(c); }
  const sup = (x, z, y) => { let h = 0; for (const c of GR.get(gk(Math.floor(x / GS), Math.floor(z / GS))) || []) if (x > c[0] && x < c[1] && z > c[2] && z < c[3] && c[5] <= y + .4 && c[5] > h) h = c[5]; return h; };
  const solid = (x, z, y) => { for (const c of GR.get(gk(Math.floor(x / GS), Math.floor(z / GS))) || []) if (x > c[0] - .4 && x < c[1] + .4 && z > c[2] - .4 && z < c[3] + .4 && c[5] > y + .45 && c[4] < y + 1.7) return true; return false; };
  // grade de navegação no térreo: nós a cada P m, aresta aberta se o caminho entre dois nós não bate em nada
  const P = 6, X0 = -108, Z0 = -96, NX = 36, NZ = 31, hO = [], vO = [];
  const clear = (ax, az, bx, bz) => { for (let t = 0; t <= 1.001; t += .125) { const x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = sup(x, z, .5); if (y > .6 || solid(x, z, y)) return false; } return true; };
  for (let a = 0; a <= NX; a++) { hO[a] = []; vO[a] = []; for (let b = 0; b <= NZ; b++) { const x = X0 + a * P, z = Z0 + b * P;
    hO[a][b] = a < NX && clear(x, z, x + P, z); vO[a][b] = b < NZ && clear(x, z, x, z + P); } }
  const spawns = [[-56, 31], [54, -42], [22, 32], [-61, -7], [65, 11], [-55, 45], [34, 50], [-20, 40], [70, -10], [-75, -50], [0, 30], [80, 50], [-80, 0], [40, -60], [-40, -30]]
    .filter(([x, z]) => !solid(x, z, sup(x, z, .5))).map(([x, z]) => [x, sup(x, z, .5), z]);
  let night = false;
  return {
    group: m.group, colliders, spawns, cull: m.cull,
    heightAt: (x, z) => sup(x, z, .5),
    windows: { color: { set: c => { night = c !== 0x1c2733; m.setNight(night); } } }, lamps: { color: { set() {} } },
    maze: { hO, vO, NX, NZ, P, X0, Z0 },
    cfg: { name: 'Colégio Central', botZ: [-1e9, 64], safe: z => z > 67, pol: [28, 40, 71, 78], pyaw: Math.PI, pdir: -1, bx: 110, bz0: -98, bz1: 88,
      shops: [['guns', 54, 77, Math.PI], ['skins', 14, 77, 0]], polMsg: 'Você renasceu na portaria', banMsg: 'Você renasceu no colégio' }
  };
}
