import * as T from "three";

const mat = (color: number, roughness = .7, metalness = 0) => new T.MeshStandardMaterial({color, roughness, metalness});
const black = mat(0x20292c, .38), joint = mat(0x12191c), eye = mat(0xa53424,.32);
const wing = new T.MeshStandardMaterial({color:0xcbe4eb,transparent:true,opacity:.55,side:T.DoubleSide,roughness:.25,depthWrite:false});
const vein = mat(0x68848a), brown = mat(0x463129), skin = mat(0xd5a180);
const cloth = mat(0x32667b), denim = mat(0x293f52), white = mat(0xf0eee2);
type P = [number,number,number];

function mesh(g:T.BufferGeometry,m:T.Material,p:P=[0,0,0],parent?:T.Object3D) {
  const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent?.add(o);return o;
}
function egg(parent:T.Object3D,m:T.Material,p:P,s:P) {
  const o=mesh(new T.IcosahedronGeometry(1,2),m,p,parent);o.scale.set(...s);return o;
}
function tube(parent:T.Object3D,points:P[],r:number,m:T.Material,segments=12) {
  return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,5,false),m,[0,0,0],parent);
}
function segment(parent:T.Object3D,a:P,b:P,r1:number,r2:number,m:T.Material) {
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);
  const o=mesh(new T.CylinderGeometry(r2,r1,d.length(),6),m,[0,0,0],parent);
  o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;
}
function profile(rows:Array<[number,number,number]>,m:T.Material,parent:T.Object3D,p:P=[0,0,0],lobes=0) {
  const vertices:number[]=[],indices:number[]=[],n=20;
  rows.forEach(([y,rx,rz],i)=>{for(let j=0;j<n;j++){const a=j/n*Math.PI*2,f=1+lobes*Math.cos(a*5);vertices.push(Math.cos(a)*rx*f,y,Math.sin(a)*rz*f);
    if(i<rows.length-1){const k=i*n+j,l=i*n+(j+1)%n;indices.push(k,k+n,l,l,k+n,l+n);}}});
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  return mesh(g,m,p,parent);
}
function plate(parent:T.Object3D,points:Array<[number,number]>,m:T.Material,depth=.006) {
  const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const o=mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),m,[0,0,0],parent);o.rotation.x=-Math.PI/2;return o;
}
function pivot(parent:T.Object3D,name:string,p:P) {const g=new T.Group();g.name=name;g.position.set(...p);parent.add(g);return g;}

export function flyModel() {
  const g=new T.Group();g.name="fly";
  const abdomen=profile([[-.11,.004,.004],[-.085,.04,.035],[-.02,.067,.052],[.045,.055,.045],[.06,.008,.008]],black,g,[0,0,.095]);
  abdomen.rotation.x=Math.PI/2;
  const thorax=egg(g,black,[0,.01,0],[.075,.07,.082]);thorax.name="body";
  for(const x of [-.032,0,.032])tube(g,[[x,.064,.035],[x,.079,-.018],[x*.7,.053,-.068]],.003,vein);
  egg(g,black,[0,.005,-.099],[.058,.049,.046]);
  for(const side of [-1,1]){
    egg(g,eye,[side*.038,.016,-.113],[.032,.04,.027]);
    segment(g,[side*.019,.016,-.132],[side*.029,.032,-.162],.005,.002,joint);
    const w=pivot(g,side<0?"wingL":"wingR",[side*.032,.044,.016]);
    const membrane=plate(w,[[0,0],[side*.068,.032],[side*.20,.126],[side*.217,.184],[side*.183,.204],[side*.12,.173],[side*.038,.065]],wing,.0015);
    membrane.rotation.x=Math.PI/2;
    for(const end of [[.197,.177],[.155,.176],[.12,.144]])tube(w,[[0,.002,0],[side*.07,.002,.055],[side*end[0]!, .002,end[1]!]],.0017,vein);
    for(let i=0;i<3;i++){
      const leg=pivot(g,"leg-"+(side<0?i:i+3),[side*.035,-.025,-.04+i*.044]);
      const knee:P=[side*.075,-.027,(i-1)*.06],ankle:P=[side*.105,-.09,(i-1)*.10];
      segment(leg,[0,0,0],knee,.007,.005,joint);segment(leg,knee,ankle,.005,.003,joint);
      segment(leg,ankle,[side*.12,-.095,(i-1)*.10-.024],.003,.0015,joint);
    }
  }
  tube(g,[[0,-.025,-.13],[0,-.054,-.143],[0,-.059,-.165]],.005,joint);
  return g;
}
export function spiderModel() {
  const g=new T.Group();g.name="spider";
  egg(g,brown,[0,.20,.17],[.23,.18,.30]);
  egg(g,joint,[0,.17,-.13],[.16,.12,.16]);
  for(let i=0;i<4;i++)egg(g,mat(0x967054),[0,.363-i*.012,.12+i*.055],[.06-i*.009,.005,.018]);
  for(const s of [-1,1])for(let i=0;i<4;i++){
    const leg=pivot(g,"leg-"+(s<0?i:i+4),[s*.10,.17,-.21+i*.085]);
    const knee:P=[s*(.32+Math.sin(i)*.08),.16,(i-1.5)*.19];
    const foot:P=[s*(.43+Math.sin(i)*.10),-.16,(i-1.5)*.31];
    segment(leg,[0,0,0],knee,.027,.020,brown);segment(leg,knee,foot,.020,.004,joint);
    egg(leg,brown,knee,[.026,.026,.026]);
  }
  for(const s of [-1,1]){
    egg(g,black,[s*.047,.215,-.272],[.032,.032,.024]);egg(g,white,[s*.049,.226,-.293],[.009,.009,.004]);
    egg(g,black,[s*.10,.21,-.234],[.016,.016,.016]);
    tube(g,[[s*.07,.11,-.25],[s*.055,.065,-.30],[s*.02,.095,-.32]],.013,joint);
  }return g;
}
export function humanModel() {
  const g=new T.Group();g.name="human";
  const torso=profile([[2.5,.30,.22],[2.65,.36,.24],[3.25,.39,.24],[3.55,.48,.23],[3.68,.29,.18]],cloth,g); torso.name="torso";
  profile([[2.2,.36,.23],[2.55,.34,.23]],denim,g);
  segment(g,[0,3.6,0],[0,3.89,0],.14,.13,skin);
  const head=profile([[3.83,.12,.12],[3.9,.22,.19],[4.15,.26,.235],[4.37,.20,.20],[4.44,.015,.015]],skin,g); head.name="head";
  egg(g,brown,[0,4.35,-.025],[.255,.155,.24]);
  for(const s of [-1,1]){
    egg(g,skin,[s*.25,4.12,0],[.045,.084,.05]);
    egg(g,joint,[s*.092,4.17,.214],[.026,.015,.012]);
  }
  egg(g,skin,[0,4.1,.245],[.038,.055,.055]);tube(g,[[-.067,4.005,.219],[0,3.995,.237],[.067,4.005,.219]],.008,brown);
  for(const s of [-1,1]){
    const arm=pivot(g,s<0?"armL":"armR",[s*.46,3.49,0]);
    segment(arm,[0,0,0],[s*.08,-.47,0],.18,.13,cloth);
    segment(arm,[s*.08,-.43,0],[s*.12,-.88,.04],.11,.075,skin);
    egg(arm,skin,[s*.12,-1,.05],[.10,.14,.065]);
    for(let i=0;i<4;i++)segment(arm,[s*.12+(i-1.5)*.04,-1.06,.04],[s*.12+(i-1.5)*.04,-1.2+Math.abs(i-1.5)*.025,.04],.02,.012,skin);
    segment(arm,[s*.06,-.96,.075],[s*.005,-1.08,.075],.03,.019,skin);
    const leg=pivot(g,s<0?"legL":"legR",[s*.20,2.35,0]);
    segment(leg,[0,0,0],[s*.018,-1.05,0],.19,.145,denim);
    segment(leg,[s*.018,-1.02,0],[s*.025,-2.13,0],.145,.10,denim);
    egg(leg,joint,[s*.025,-2.23,.12],[.145,.12,.29]);
  }
  return g;
}
export function appleModel(){
  const g=new T.Group();g.name="apple";
  profile([[-.25,.015,.015],[-.23,.13,.13],[-.16,.245,.235],[0,.29,.27],[.16,.255,.245],[.23,.17,.16],[.20,.055,.055],[.18,.005,.005]],mat(0xbb392c,.43),g,[0,0,0],.065);
  tube(g,[[0,.19,0],[.02,.30,0],[.018,.35,-.016]],.014,brown);
  const leaf=plate(g,[[.01,0],[.10,-.015],[.19,.04],[.1,.075],[.01,0]],mat(0x41682e));leaf.position.y=.29;leaf.rotation.z=.4;return g;
}
export function bananaModel(){
  const g=new T.Group();g.name="banana";
  const curve=new T.CatmullRomCurve3([new T.Vector3(-.32,.12,0),new T.Vector3(-.17,-.06,0),new T.Vector3(.07,-.095,0),new T.Vector3(.29,.07,0)]);
  const geo=new T.TubeGeometry(curve,18,.077,6,false);
  const a=geo.getAttribute("position");
  for(let i=0;i<=18;i++){const t=i/18,c=curve.getPointAt(t),f=.20+.80*Math.sin(Math.PI*t)**.45;for(let j=0;j<=6;j++){const k=i*7+j;a.setXYZ(k,c.x+(a.getX(k)-c.x)*f,c.y+(a.getY(k)-c.y)*f,(a.getZ(k)-c.z)*f);}}
  geo.computeVertexNormals();mesh(geo,mat(0xe6bc39),[0,0,0],g);
  tube(g,[[-.32,.12,0],[-.335,.16,0]],.021,brown);
  tube(g,[[.29,.07,0],[.31,.105,0]],.018,brown);return g;
}
export function breadModel(){
  const g=new T.Group();g.name="bread";
  const crust=mat(0xb77536),crumb=mat(0xe8c987);
  const s=new T.Shape();s.moveTo(-.34,-.13);s.lineTo(.34,-.13);s.lineTo(.34,.045);s.bezierCurveTo(.40,.25,-.40,.25,-.34,.045);s.closePath();
  const loaf=mesh(new T.ExtrudeGeometry(s,{depth:.36,bevelEnabled:true,bevelSize:.018,bevelThickness:.015,bevelSegments:1,steps:1,curveSegments:10}),crust,[0,0,-.18],g);
  const face=mesh(new T.ShapeGeometry(s,10),crumb,[0,0,.197],g);face.scale.set(.88,.84,1);
  for(const [x,y] of [[-.15,.04],[.11,.07],[.23,-.04],[-.22,-.05],[.02,-.045]])egg(g,crust,[x!,y!,.200],[.017,.012,.002]);
  loaf.name="crust";return g;
}
export function fanModel(){
  const g=new T.Group();g.name="fan";const steel=mat(0x6c8589,.35,.7),plastic=mat(0x315664);
  segment(g,[0,.04,0],[0,.42,0],.075,.065,steel);egg(g,plastic,[0,.12,0],[.29,.22,.29]);
  const blades=pivot(g,"blades",[0,0,0]);
  for(let i=0;i<3;i++){
    const b=pivot(blades,"blade-"+i,[0,0,0]);b.rotation.y=i*Math.PI*2/3;
    plate(b,[[.16,-.08],[.48,-.20],[1.22,-.31],[1.44,-.17],[1.43,.07],[.8,.15],[.25,.06]],plastic,.035);
  }
  egg(g,steel,[0,-.095,0],[.18,.10,.18]);
  for(const r of [.35,.65,1,1.48]){const ring=mesh(new T.TorusGeometry(r,.016,5,64),steel,[0,-.17,0],g);ring.rotation.x=Math.PI/2;}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;tube(g,[[Math.cos(a)*.18,-.2,Math.sin(a)*.18],[Math.cos(a)*.9,-.18,Math.sin(a)*.9],[Math.cos(a)*1.48,-.17,Math.sin(a)*1.48]],.01,steel);}
  return g;
}
export function glassModel(){
  const g=new T.Group();g.name="glass";
  const glass=new T.MeshPhysicalMaterial({color:0xd4edf1,transparent:true,opacity:.24,roughness:.13,metalness:.05,side:T.DoubleSide,depthWrite:false});
  profile([[0,.30,.30],[.055,.34,.34],[1.13,.38,.38],[1.15,.38,.38],[1.15,.35,.35],[.075,.31,.31],[.075,.003,.003]],glass,g);
  const rim=mesh(new T.TorusGeometry(.365,.015,6,48),white,[0,1.15,0],g);rim.rotation.x=Math.PI/2;
  return g;
}
export const modelFactories = {fly:flyModel,spider:spiderModel,human:humanModel,apple:appleModel,banana:bananaModel,bread:breadModel,fan:fanModel,glass:glassModel};
