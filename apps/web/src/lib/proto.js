/* eslint-disable */
// Gerado a partir de preview/think-it-cyber-academy.html — fonte única de layout.

let SIM_TAB="investigar";
function setSimTab(t){SIM_TAB=t;}

/* ------------------------------------------------------------------ dados (seed) */
const USER = { name:'Rogério Analista', role:'SOC Analyst N1', level:5, xp:2450 };
const COMPS = [
  {key:'SIEM', name:'SIEM', pct:82}, {key:'KQL', name:'KQL', pct:71},
  {key:'NET', name:'Redes', pct:91}, {key:'WIN', name:'Windows', pct:63},
  {key:'CLOUD', name:'Nuvem', pct:42}, {key:'IR', name:'Resposta a Incidentes', pct:58},
];
const BADGES = [
  ['Primeiro Curso','Concluiu seu primeiro curso',50,true],['Primeiro Lab','Concluiu seu primeiro lab',100,true],
  ['Iniciante em SOC','Iniciou a trilha SOC N1',25,true],['Caçador de Logs','Labs de análise de logs',150,true],
  ['Caçador de Ameaças','Módulo de Threat Hunting',200,false],['Investigador de Incidentes','Resolveu o SOC Investigation',250,true],
  ['Defensor de Nuvem','Trilha de Segurança em Nuvem',200,false],['Fundamentos de Segurança','Passou no simulado de fundamentos',100,true],
  ['Analista KQL','Dominou consultas KQL',150,false],['Analista SIEM','Concluiu o módulo de SIEM',150,true],
  ['Defensor Cibernético','Concluiu a trilha SOC N1',500,false],
];
const PATHS = [
  {title:'SOC Analyst N1',courses:2,diff:'MÉDIO',pct:68},
  {title:'Preparação para AZ-900',courses:1,diff:'FÁCIL',pct:20},
  {title:'Preparação para SC-900',courses:1,diff:'FÁCIL',pct:0},
  {title:'Preparação para Security+',courses:1,diff:'MÉDIO',pct:0},
];
const COURSES = [
  {title:'Fundamentos de Cybersecurity',desc:'Conceitos essenciais de segurança da informação.',diff:'FÁCIL',h:8,mods:2},
  {title:'SOC Analyst N1',desc:'Formação de analista de SOC nível 1.',diff:'MÉDIO',h:40,mods:4},
  {title:'Azure Fundamentals (AZ-900)',desc:'Preparação para a certificação AZ-900.',diff:'FÁCIL',h:12,mods:2},
  {title:'Microsoft Security Fundamentals (SC-900)',desc:'Preparação para a certificação SC-900.',diff:'FÁCIL',h:12,mods:2},
];
const COURSE_DETAIL = {
  title:'SOC Analyst N1', diff:'MÉDIO', h:40,
  modules:[
    {t:'Fundamentos de Segurança', lessons:[['Introdução ao SOC','video'],['Tipos de Ataque','video']]},
    {t:'SIEM', lessons:[['O que é um SIEM','video'],['Ingestão de Logs','video'],['Regras de Correlação','quiz']]},
    {t:'MITRE ATT&CK', lessons:[['Táticas e Técnicas','video'],['Mapeando Alertas','video']]},
    {t:'Investigação de Incidentes', lessons:[['Triagem de Alertas','video'],['Correlação de Eventos','lab']]},
  ]
};
const LABS = [
  {slug:'soc-brute',title:'SOC Investigation — Brute Force',cat:'SOC',diff:'MÉDIO',xp:250,ch:4,obj:'Investigar múltiplas falhas de autenticação em dados sintéticos e classificar o incidente.'},
  {slug:'log-web',title:'Log Analysis — Web Access',cat:'REDE',diff:'MÉDIO',xp:150,ch:2,obj:'Analisar logs de acesso web e identificar tentativa de path traversal.'},
  {slug:'kql',title:'KQL Basics — Sentinel Sandbox',cat:'NUVEM',diff:'MÉDIO',xp:100,ch:1,obj:'Escrever consultas KQL sobre uma tabela sintética de sign-ins.'},
];
const LAB_CONSOLE = {
  title:'SOC Investigation — Brute Force', cat:'SOC', diff:'MÉDIO', xp:250, dur:45,
  challenges:[
    ['Identificar o usuário-alvo',50,true],['Identificar o IP de origem',50,true],
    ['Mapear a técnica MITRE',75,false],['Classificar a severidade',75,false],
  ],
  hints:[['Filtre os eventos 4625 do Windows.',10],['Correlacione horário e IP de origem.',10]],
};
const EXAMS = [
  {title:'AZ-900 — Simulado #01',cat:'AZ-900',diff:'MÉDIO',q:10,min:60,pass:70},
  {title:'SC-900 — Simulado #01',cat:'SC-900',diff:'MÉDIO',q:10,min:30,pass:70},
  {title:'Security+ — Simulado #01',cat:'Security+',diff:'MÉDIO',q:10,min:30,pass:70},
];
const EXAM_RUN = {
  title:'SC-900 — Simulado #01',
  questions:[
    {p:'Qual princípio do Zero Trust afirma que se deve sempre validar explicitamente cada requisição?',
     o:['Verificar explicitamente','Confiar na rede interna','Permitir por padrão','Segurança apenas de perímetro'],c:0},
    {p:'No Microsoft Entra ID, o que é o Acesso Condicional?',
     o:['Políticas que controlam o acesso com base em sinais de risco','Um antivírus','Um firewall de rede','Um serviço de backup'],c:0},
    {p:'Qual recurso adiciona uma camada extra de verificação além da senha?',o:['MFA','SSO','DNS','VPN'],c:0},
  ]
};
const RANKING = [
  ['Analista A',5820,7],['Analista B',5430,6],['Analista C',4990,6],
  ['Rogério Analista',2450,5],['Analista D',2100,4],['Analista E',1740,3],
];
const MATRIX = {
  comps:['SIEM','KQL','REDE','WIN','AMEAÇA','DFIR','NUVEM'],
  analysts:[
    ['Rogério A.', {SIEM:'A',KQL:'A',REDE:'E',WIN:'I',AMEAÇA:'B',DFIR:'B',NUVEM:'B'}],
    ['Marina S.',  {SIEM:'E',KQL:'A',REDE:'A',WIN:'A',AMEAÇA:'A',DFIR:'I',NUVEM:'A'}],
    ['Carlos M.',  {SIEM:'A',KQL:'I',REDE:'A',WIN:'A',AMEAÇA:'I',DFIR:'B',NUVEM:'I'}],
    ['Beatriz L.', {SIEM:'I',KQL:'B',REDE:'A',WIN:'I',AMEAÇA:'B',DFIR:'B',NUVEM:'B'}],
  ]
};
/* SOC Simulator */
const INCIDENTS=[
  {id:'2026-000184',sev:'Média',title:'Impossible Travel',user:'usuario@empresa.com',src:'Microsoft Entra ID',time:'09:13',sla:'12 min'},
  {id:'2026-000185',sev:'Alta',title:'Brute Force — múltiplas falhas 4625',user:'jsilva',src:'Windows / Active Directory',time:'02:41',sla:'4 min'},
  {id:'2026-000186',sev:'Baixa',title:'PowerShell codificado (Base64)',user:'host-fin-07',src:'Defender for Endpoint',time:'14:22',sla:'27 min'},
];
const SIM_SCORE=[['Detecção',92],['Investigação',84],['KQL',76],['MITRE',81],['Documentação',88],['Decisão',91]];
const SIM_KQL=`SigninLogs\n| where UserPrincipalName == "usuario@empresa.com"\n| where TimeGenerated > ago(24h)\n| project TimeGenerated, IPAddress, Location, ResultType\n| order by TimeGenerated asc`;
const SIM_SIGNINS=[
  ['08:57','203.0.113.47','São Paulo, BR','0 (sucesso)'],
  ['09:11','185.220.101.9','Amsterdã, NL','0 (sucesso)'],
  ['09:13','185.220.101.9','Amsterdã, NL','0 (sucesso)'],
];
/* Detection Engineering */
const DET_LOGS=[
  ['02:40:11','jsilva','10.0.4.7 → DC01','4625 (falha)'],
  ['02:40:13','jsilva','10.0.4.7 → DC01','4625 (falha)'],
  ['02:40:15','jsilva','10.0.4.7 → DC01','4625 (falha)'],
  ['02:41:02','jsilva','10.0.4.7 → DC01','4624 (sucesso)'],
];
const DET_QUERY=`SecurityEvent\n| where EventID == 4625\n| summarize Falhas=count() by TargetAccount, IpAddress, bin(TimeGenerated, 5m)\n| where Falhas >= 10`;
/* Cyber Passport / MITRE */
const CERTS=['SOC Analyst N1','AZ-900','SC-900'];
const MITRE=[['T1110','Brute Force','praticada'],['T1078','Valid Accounts','praticada'],['T1059.001','PowerShell','estudada'],['T1566','Phishing','estudada'],['T1021.001','RDP','praticada']];
/* Mapa de Risco (gestor) — RAG por nível */
const HEATMAP={rows:['SIEM','KQL','Nuvem','DFIR','Caça a Ameaças'],cols:['N1','N2','N3'],
  data:{SIEM:['g','g','g'],KQL:['y','g','g'],Nuvem:['r','y','g'],DFIR:['r','y','g'],'Caça a Ameaças':['r','y','g']}};

/* ------------------------------------------------------------------ helpers */
const el=(h)=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild;};
const pill=(t)=>`<span class="pill">${t}</span>`;
/* níveis da matriz → cor semântica do book (B vermelho, I laranja, A teal, E lime) */
const LVL={NONE:['#eceeee','#9aa0a6'],B:['#f7e2e2','#c03a3a'],I:['#faecd8','#b56a1e'],A:['#e0efee','#277471'],E:['#f0f4d9','#7d8a1f']};

/* Ícones inline (lucide-style) — sem dependência de fonte externa */
const ICONS={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
 menu_book:'<path d="M12 7v13"/><path d="M4 5h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5v13h-5a3 3 0 0 0-3 3 3 3 0 0 0-3-3H4z"/>',
 terminal:'<path d="M5 17l6-5-6-5"/><path d="M12 19h7"/>',
 my_location:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
 monitor_heart:'<path d="M3 12h3l2 5 4-11 2 6h7"/>',
 build:'<path d="M14.5 6.5a4 4 0 0 1-5.2 5.2L4 17.3V20h2.7l5.6-5.3a4 4 0 0 1 5.2-5.2l-2.6 2.6-2-.5-.5-2z"/>',
 quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 1 1 4 2.5c-.9.5-1.2 1-1.2 1.9"/><circle cx="12" cy="17" r=".7" fill="currentColor" stroke="none"/>',
 leaderboard:'<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="10"/>',
 military_tech:'<circle cx="12" cy="8" r="5"/><path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5"/>',
 radar:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 12l6-4"/>',
 badge:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.4 1.9-2 3-2s2.4.6 3 2"/><line x1="14" y1="10" x2="18" y2="10"/><line x1="14" y1="14" x2="18" y2="14"/>',
 workspace_premium:'<circle cx="12" cy="9" r="5"/><path d="M8.5 13L7 21l5-3 5 3-1.5-8"/>',
 notifications:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 6 2.5 8H3.5C3.5 15 6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 groups:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17 14.6c1.8.6 3 2 3.5 4"/>',
 insights:'<path d="M4 16l5-5 3 3 6-7"/><path d="M18 5h3v3"/>',
 payments:'<line x1="12" y1="3" x2="12" y2="21"/><path d="M16.5 7H9.8a2.8 2.8 0 0 0 0 5.6h4.4a2.8 2.8 0 0 1 0 5.6H7"/>',
 group_add:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3 3-4.5 5.5-4.5c1 0 1.9.2 2.7.6"/><line x1="18" y1="8" x2="18" y2="14"/><line x1="15" y1="11" x2="21" y2="11"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/>',
 security:'<path d="M12 2.5l7.5 3.5v5.5c0 4.7-3.2 7.6-7.5 9.5-4.3-1.9-7.5-4.8-7.5-9.5V6z"/>',
 calendar:'<rect x="3" y="4.5" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2.5" x2="8" y2="6"/><line x1="16" y1="2.5" x2="16" y2="6"/>',
 download:'<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
 bulb:'<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
 track_changes:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4a8 8 0 0 1 8 8"/>',
 savings:'<line x1="12" y1="3" x2="12" y2="21"/><path d="M16.5 7H9.8a2.8 2.8 0 0 0 0 5.6h4.4a2.8 2.8 0 0 1 0 5.6H7"/>',
 trending_up:'<path d="M4 16l5-5 3 3 6-7"/><path d="M18 5h3v3"/>',
};
function icon(n){return `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em">${ICONS[n]||ICONS.dashboard}</svg>`;}

function header(kicker,title,sub){
  return `<div class="head"><div class="accent"></div><div>
    <div class="kicker">${kicker}</div><h1>${title}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div></div>`;
}
function kpi(color,l,v,h){
  return `<div class="kpi" style="border-top-color:${color}"><div class="l">${l}</div>
    <div class="v" style="color:${color}">${v}</div><div class="u" style="background:${color}"></div>
    ${h?`<div class="h">${h}</div>`:''}</div>`;
}
function compRow(c,big){return `<div style="margin-bottom:11px"><div class="row" style="font-size:${big?'14px':'13px'};margin-bottom:5px">
  <span>${c.name}</span><span class="muted">${c.pct}%</span></div><div class="track"><div class="bar" style="width:${c.pct}%"></div></div></div>`;}

/* radar SVG (teal sobre claro) */
function radar(comps){
  const cx=160,cy=150,R=110,n=comps.length;
  const pt=(i,r)=>{const a=(-90+i*360/n)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];};
  let rings='';[0.25,0.5,0.75,1].forEach(f=>{rings+=`<polygon points="${comps.map((_,i)=>pt(i,R*f).join(',')).join(' ')}" fill="none" stroke="#E1E5E5"/>`;});
  let axes='',labels='';comps.forEach((c,i)=>{const [x,y]=pt(i,R);axes+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E1E5E5"/>`;
    const [lx,ly]=pt(i,R+18);labels+=`<text x="${lx}" y="${ly}" fill="#5A6066" font-size="10" text-anchor="middle" dominant-baseline="middle">${c.name}</text>`;});
  const poly=comps.map((c,i)=>pt(i,R*c.pct/100).join(',')).join(' ');
  const dots=comps.map((c,i)=>{const [x,y]=pt(i,R*c.pct/100);return `<circle cx="${x}" cy="${y}" r="3" fill="#277471"/>`;}).join('');
  return `<svg viewBox="0 0 320 300" width="100%" style="max-width:340px">${rings}${axes}
    <polygon points="${poly}" fill="rgba(39,116,113,.16)" stroke="#277471" stroke-width="2"/>${dots}${labels}</svg>`;
}
function fakeQR(){let g=[],s=7;for(let i=0;i<21*21;i++){s=(s*1103515245+12345)&0x7fffffff;g.push((s>>16)%2);}
  const fnd=(r,c)=>((r<7&&c<7)||(r<7&&c>13)||(r>13&&c<7));let cells='';
  for(let r=0;r<21;r++)for(let c=0;c<21;c++){let on=fnd(r,c)?((r%6===0||c%6===0)||(r>1&&r<5&&c>1&&c<5)):g[r*21+c];
    cells+=`<rect x="${c*6}" y="${r*6}" width="6" height="6" fill="${on?'#21242B':'#fff'}"/>`;}
  return `<svg viewBox="0 0 126 126" width="140" height="140" style="background:#fff;border:1px solid #E6E7E7;border-radius:8px;padding:6px">${cells}</svg>`;}

/* ------------------------------------------------------------------ views */
const V={};

V.dashboard=()=>`
  ${header('Aluno · Visão geral','Olá, Rogério 👋','SOC Analyst N1 · Nível 5')}
  <div class="grid g4" style="margin-bottom:16px">
    ${kpi('var(--teal)','XP total','2.450','463 em média/mês')}
    ${kpi('var(--teal)','Cursos','1/2','concluídos')}
    ${kpi('var(--lime)','Labs','18','ambientes resolvidos')}
    ${kpi('var(--orange)','Provas','14','87% de média')}
  </div>
  <div class="grid" style="grid-template-columns:1.35fr 1fr;margin-bottom:16px">
    <div class="card top"><div class="ck">Competências</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:250px">${radar(COMPS)}</div>
        <div style="flex:1;min-width:200px">${COMPS.map(c=>compRow(c)).join('')}</div>
      </div>
    </div>
    <div class="card"><div class="ck">Trilha atual</div>
      <div class="row" style="margin-bottom:6px"><b>SOC Analyst N1</b><span class="muted">68%</span></div>
      <div class="track" style="margin-bottom:18px"><div class="bar" style="width:68%"></div></div>
      <div class="ck">Conquistas recentes</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${BADGES.filter(b=>b[3]).slice(0,6).map(b=>pill('🏅 '+b[0])).join('')}
      </div>
    </div>
  </div>
  <div class="dark"><div class="ck">Destaques &amp; recomendação — Motor de Competências</div>
    <div class="hl"><span class="htag" style="background:var(--lime);color:#21242B">Positivo</span>
      <p>Redes (91%) e SIEM (82%) sólidos — base forte de SOC N1.</p></div>
    <div class="hl"><span class="htag" style="background:var(--teal)">Atenção</span>
      <p>Nuvem (42%) e Resposta a Incidentes (58%) abaixo do alvo de 65%.</p></div>
    <div class="hl"><span class="htag" style="background:var(--orange)">Ação</span>
      <p>Trilha recomendada: Fundamentos de Resposta a Incidentes · AZ-900 · Lab SOC Investigation · Simulado SC-900.</p></div>
  </div>`;

V.courses=()=>`
  ${header('Catálogo','Cursos & Trilhas','Jornadas de formação e cursos avulsos.')}
  <div class="ck">Trilhas</div>
  <div class="grid g3" style="margin-bottom:26px">
    ${PATHS.map(p=>`<div class="card"><div class="row"><b>${p.title}</b>${pill(p.diff)}</div>
      <p class="tag" style="margin:8px 0 12px">${p.courses} cursos</p>
      <div class="track"><div class="bar" style="width:${p.pct}%"></div></div>
      <p class="tag" style="margin-top:6px">${p.pct}% concluído</p></div>`).join('')}
  </div>
  <div class="ck">Cursos</div>
  <div class="grid g3">
    ${COURSES.map(c=>`<div class="card clickable" onclick="go('course-detail')">
      <b>${c.title}</b><p class="tag" style="margin:8px 0 12px">${c.desc}</p>
      <div style="display:flex;gap:8px;align-items:center">${pill(c.diff)}<span class="tag">${c.h}h · ${c.mods} módulos</span></div></div>`).join('')}
  </div>`;

V['course-detail']=()=>`
  <span class="backlink" onclick="go('courses')">← Cursos</span>
  <div class="row" style="align-items:flex-start">
    ${header('Curso','SOC Analyst N1','MÉDIO · 40h · 4 módulos')}
    <button class="btn">Matricular</button>
  </div>
  <div class="grid" style="grid-template-columns:1fr 1.6fr">
    <div>${COURSE_DETAIL.modules.map((m,i)=>`<div class="card" style="margin-bottom:12px">
      <b style="font-size:13px">${i+1}. ${m.t}</b>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:3px">
        ${m.lessons.map((l,j)=>`<div style="font-size:13px;color:${i===1&&j===0?'var(--teal)':'var(--gray)'};background:${i===1&&j===0?'var(--teal-tint)':'transparent'};padding:6px 8px;border-radius:6px;cursor:pointer">
          ${l[1]==='video'?'▶':l[1]==='quiz'?'❓':'🧪'} ${l[0]}</div>`).join('')}
      </div></div>`).join('')}</div>
    <div class="card top"><h2>O que é um SIEM</h2>
      <div style="aspect-ratio:16/9;background:#101317;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#c7ccd2;font-size:13px">▶ player de vídeo (URL assinada temporária)</div>
      <p class="tag" style="margin:10px 0 6px">URL assinada expira em ~15 min · <code>storage/stream?sig=…</code></p>
      <div class="track" style="margin:8px 0 14px"><div class="bar" style="width:45%"></div></div>
      <button class="btn">Marcar como assistida</button>
      <button class="btn ghost" style="margin-left:8px">Salvar 50%</button></div>
  </div>`;

V.labs=()=>`
  ${header('Prática','Cyber Labs','Ambientes deliberadamente vulneráveis e controlados, em rede isolada. Somente treinamento.')}
  <div class="grid g3">
    ${LABS.map(l=>`<div class="card clickable" onclick="go('lab-console')">
      <div style="display:flex;gap:8px;margin-bottom:10px">${pill(l.cat)}${pill(l.diff)}</div>
      <b>${l.title}</b><p class="tag" style="margin:8px 0 12px">${l.obj}</p>
      <div class="row"><span class="tag">+${l.xp} XP · ${l.ch} desafios</span><span style="color:var(--teal);font-size:12px;font-weight:600">Abrir console →</span></div></div>`).join('')}
  </div>`;

V['lab-console']=()=>`
  <span class="backlink" onclick="go('labs')">← Cyber Labs</span>
  <div class="row" style="align-items:flex-start">
    ${header('Console do lab','SOC Investigation — Brute Force','SOC · MÉDIO · 45 min · +250 XP')}
    <div style="display:flex;gap:8px"><button class="btn ghost">Resetar</button><button class="btn danger">Destruir</button></div>
  </div>
  <div class="banner">Status: <b>RUNNING</b> · expira 14:58 · rede isolada: <b>tica-labs-isolated</b> · sem rota para a rede corporativa</div>
  <div class="grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px">
    <div class="card top"><div class="ck">Briefing</div>
      <p style="margin:0;font-size:13.5px;color:var(--gray);line-height:1.55">Às 02:41 o SIEM disparou alerta de múltiplas falhas de autenticação (Event ID 4625) contra uma conta do Active Directory, seguidas de um logon bem-sucedido. Investigue os dados sintéticos, correlacione os eventos e classifique o incidente.</p>
      <div class="ck" style="margin-top:16px">Conhecimentos necessários</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${['Windows Event Logs','Active Directory','SIEM','MITRE ATT&CK'].map(pill).join('')}</div>
    </div>
    <div class="card"><div class="ck">Ambiente</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${[['🪟','Windows Server'],['🧩','Active Directory'],['🌐','Firewall'],['🛡️','EDR'],['📊','SIEM']].map(m=>`<span style="display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:12.5px">${m[0]} ${m[1]}</span>`).join('')}</div>
      <div class="ck">Objetivo</div>
      <p style="margin:0;font-size:13px;color:var(--gray)">Responder: usuário atacado · IP de origem · máquina comprometida · técnica MITRE · horário · severidade · ação do SOC.</p>
    </div>
  </div>
  <div class="ck">Desafios</div>
  <div class="grid" style="margin-bottom:22px">
    ${LAB_CONSOLE.challenges.map(c=>`<div class="card"><div class="row" style="margin-bottom:8px">
      <b style="font-size:13px">${c[0]} ${c[2]?'<span style="color:var(--teal)">✔</span>':''}</b>${pill(c[1]+' pts')}</div>
      <div style="display:flex;gap:8px"><input style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:9px 11px;color:var(--ink)" placeholder="${c[2]?'resolvido':'Sua resposta'}" ${c[2]?'disabled':''}/><button class="btn">Enviar</button></div></div>`).join('')}
  </div>
  <div class="grid" style="grid-template-columns:1fr 1fr;margin-bottom:22px">
    <div class="card"><div class="ck">Evidências coletadas</div>
      ${['4625 × 47 em 90s — conta jsilva','Origem 10.0.4.7 (host não corporativo)','4624 (sucesso) às 02:41 — comprometimento'].map(e=>`<label style="display:flex;gap:8px;align-items:center;background:var(--surface2);border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:13px"><input type="checkbox" checked/> ${e}</label>`).join('')}
    </div>
    <div class="card"><div class="ck">MITRE ATT&CK</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${[['T1110','Brute Force'],['T1078','Valid Accounts']].map(m=>pill(m[0]+' · '+m[1])).join('')}</div>
      <div class="ck" style="margin-top:16px">Dicas</div>
      ${LAB_CONSOLE.hints.map((h,i)=>`<div class="row" style="background:var(--surface2);border-radius:8px;padding:8px 10px;margin-bottom:6px"><span class="muted" style="font-size:12.5px">Dica ${i+1} (custa ${h[1]} XP)</span><button class="btn ghost" style="padding:5px 11px">Revelar</button></div>`).join('')}
    </div>
  </div>
  <div class="dark"><div class="ck">Relatório final</div>
    <div class="hl"><span class="htag" style="background:var(--lime);color:#21242B">Resumo</span><p>Brute force contra <b>jsilva</b> a partir de 10.0.4.7, com logon bem-sucedido às 02:41. Severidade Média, contido.</p></div>
    <div class="hl"><span class="htag" style="background:var(--teal)">Técnica</span><p>T1110 (Brute Force) → T1078 (Valid Accounts).</p></div>
    <div class="hl"><span class="htag" style="background:var(--orange)">Ação</span><p>Bloquear host, resetar credenciais de jsilva, habilitar lockout policy e regra de detecção 4625≥10/5min.</p></div>
    <div class="row" style="border-top:1px solid #3a3f47;margin-top:6px;padding-top:12px"><span style="font-weight:700">Score do lab</span><span style="font-weight:800;color:var(--lime);font-size:20px">+250 XP · 4/4 desafios</span></div>
  </div>`;

V.exams=()=>`
  ${header('Avaliação','Avaliações & Simulados','Questões originais de treinamento, baseadas nos objetivos públicos das certificações.')}
  <div class="grid g2">
    ${EXAMS.map(e=>`<div class="card row"><div>
      <div style="display:flex;gap:8px;margin-bottom:8px">${pill(e.cat)}${pill(e.diff)}</div>
      <b>${e.title}</b><p class="tag" style="margin-top:6px">${e.q} questões · ${e.min} min · nota mínima ${e.pass}%</p></div>
      <button class="btn" onclick="go('exam-run')">Iniciar</button></div>`).join('')}
  </div>`;

V['exam-run']=()=>`
  <span class="backlink" onclick="go('exams')">← Avaliações</span>
  ${header('Simulado em andamento','SC-900 — Simulado #01','3 questões · sem gabarito visível')}
  <div class="grid">${EXAM_RUN.questions.map((q,i)=>`<div class="card">
    <p style="font-weight:700;margin:0 0 12px">${i+1}. ${q.p}</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${q.o.map((o,j)=>`<label style="display:flex;gap:10px;align-items:center;border:1px solid ${j===0&&i===0?'var(--teal)':'var(--border)'};background:${j===0&&i===0?'var(--teal-tint)':'#fff'};border-radius:8px;padding:9px 12px;font-size:13px;cursor:pointer">
        <input type="radio" name="q${i}" ${j===0&&i===0?'checked':''}/> ${o}</label>`).join('')}
    </div></div>`).join('')}</div>
  <button class="btn" style="margin-top:16px">Enviar respostas</button>`;

V.leaderboard=()=>`
  ${header('Gamificação','Ranking','Ranking global por XP acumulado.')}
  <div class="card"><table>
    <thead><tr><th style="text-align:left;color:var(--muted);padding:8px">#</th><th style="text-align:left;color:var(--muted)">Analista</th><th style="text-align:right;color:var(--muted);padding-right:8px">XP</th></tr></thead>
    <tbody>${RANKING.map((r,i)=>{const me=r[0]==='Rogério Analista';const m=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'º';
      return `<tr style="border-top:1px solid var(--border);${me?'background:var(--teal-tint)':''}"><td style="padding:11px 8px">${m}</td>
      <td>${r[0]} <span class="tag">Nível ${r[2]}</span></td>
      <td style="text-align:right;padding-right:8px;color:var(--teal);font-weight:700">${r[1].toLocaleString('pt-BR')}</td></tr>`;}).join('')}</tbody>
  </table></div>`;

V.achievements=()=>`
  ${header('Gamificação','Conquistas',BADGES.filter(b=>b[3]).length+' de '+BADGES.length+' badges conquistadas.')}
  <div class="grid g3">${BADGES.map(b=>`<div class="card" style="${b[3]?'border-top:4px solid var(--lime)':'opacity:.55'}">
    <div style="font-size:24px">${b[3]?'🏅':'🔒'}</div><b>${b[0]}</b><p class="tag" style="margin:6px 0">${b[1]}</p>
    <span style="color:var(--teal);font-size:12px;font-weight:600">+${b[2]} XP</span>
    <p class="tag" style="margin-top:4px">${b[3]?'Conquistada':'Bloqueada'}</p></div>`).join('')}</div>`;
V.certificates=()=>`
  ${header('Certificação','Meus certificados','Conclua uma trilha para receber seu certificado.')}
  <div class="grid g2"><div class="card top">
    <div class="row" style="margin-bottom:6px"><span class="ck" style="margin:0">Think IT Cyber Academy</span>${pill('40h')}</div>
    <h2 style="font-size:18px;margin:0">SOC Analyst N1</h2>
    <p class="tag" style="margin:8px 0">Emitido em 17/08/2026</p>
    <p style="font-family:monospace;font-size:12px;color:var(--gray)">TICA-SOCANALYS-2026-0001</p>
    <span class="backlink" onclick="go('verify')">Validar publicamente →</span></div></div>`;

V.verify=()=>`
  <div style="display:flex;justify-content:center;padding-top:6px">
    <div class="card top" style="max-width:460px;text-align:center;border-top-width:5px">
      <div class="ck">Think IT Cyber Academy</div>
      <div style="font-size:36px;margin:8px 0">✅</div>
      <h1 style="font-size:20px">Certificado válido</h1>
      <p class="tag" style="margin:14px 0 2px">Certificamos que</p>
      <p style="font-size:18px;font-weight:800;margin:0">Rogério Analista</p>
      <p class="tag" style="margin:8px 0 2px">concluiu a trilha</p>
      <p style="color:var(--teal);font-weight:700;margin:0">SOC Analyst N1</p>
      <p class="tag" style="margin-top:14px">Carga horária: 40h · Emitido em 17/08/2026</p>
      <p style="font-family:monospace;font-size:12px;color:var(--gray)">TICA-SOCANALYS-2026-0001</p>
      <div style="display:flex;justify-content:center;margin-top:16px">${fakeQR()}</div>
      <p class="tag" style="margin-top:8px">página pública · /verify/certificate/&lt;id&gt;</p>
    </div>
  </div>`;

V.manager=()=>`
  ${header('01 · Gestão do SOC','Dashboard do Gestor','Evolução do time, matriz de competências e avaliação de analistas.')}
  <div class="grid g4" style="margin-bottom:16px">
    ${kpi('var(--teal)','Analistas','4')}
    ${kpi('var(--teal)','Cursos concluídos','12')}
    ${kpi('var(--lime)','Labs realizados','63')}
    ${kpi('var(--orange)','Média em provas','81%','14 provas')}
  </div>
  <div class="card top" style="margin-bottom:16px;overflow-x:auto"><div class="ck">Matriz de competências</div>
    <table><thead><tr><th style="text-align:left;color:var(--muted);padding:6px">Analista</th>
      ${MATRIX.comps.map(c=>`<th style="color:var(--muted);padding:6px;font-size:11px">${c}</th>`).join('')}</tr></thead>
      <tbody>${MATRIX.analysts.map(a=>`<tr style="border-top:1px solid var(--border)"><td style="padding:6px;font-weight:600">${a[0]}</td>
        ${MATRIX.comps.map(c=>{const lv=a[1][c]||'NONE';const col=LVL[lv]||LVL.NONE;
          return `<td style="padding:4px;text-align:center"><span style="display:inline-flex;width:34px;height:26px;align-items:center;justify-content:center;border-radius:6px;background:${col[0]};color:${col[1]};font-size:12px;font-weight:700">${lv==='NONE'?'—':lv}</span></td>`;}).join('')}</tr>`).join('')}</tbody></table>
    <p class="tag" style="margin-top:10px">Legenda: B=Básico · I=Intermediário · A=Avançado · E=Especialista</p>
  </div>
  <div class="card top" style="margin-bottom:16px"><div class="ck">Mapa de Risco — cobertura por nível</div>
    <table style="max-width:420px"><thead><tr><th style="text-align:left;color:var(--muted);padding:6px;font-size:11px">Competência</th>
      ${HEATMAP.cols.map(c=>`<th style="color:var(--muted);padding:6px;font-size:11px">${c}</th>`).join('')}</tr></thead>
      <tbody>${HEATMAP.rows.map(r=>`<tr style="border-top:1px solid var(--border)"><td style="padding:6px;font-weight:600">${r}</td>
        ${HEATMAP.data[r].map(v=>{const col={g:'#2f9e6b',y:'#E88A3A',r:'#C03A3A'}[v];
          return `<td style="padding:5px;text-align:center"><span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:${col}"></span></td>`;}).join('')}</tr>`).join('')}</tbody></table>
    <p class="tag" style="margin-top:10px">🟩 coberto · 🟧 atenção · 🟥 gap crítico — onde está o risco de conhecimento do time.</p>
  </div>
  <div class="grid g2">
    <div class="card"><div class="ck">Principais gaps do time</div>
      ${[['DFIR',34],['Nuvem',49],['Caça a Ameaças',52],['Resposta a Incidentes',58]].map(g=>`<div style="margin-bottom:10px"><div class="row" style="font-size:13px;margin-bottom:5px"><span>${g[0]}</span><span class="muted">${g[1]}%</span></div><div class="track"><div class="bar" style="width:${g[1]}%"></div></div></div>`).join('')}
    </div>
    <div class="card"><div class="ck">Avaliar competência</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${sel('Analista','Rogério A.')}${sel('Competência','Nuvem')}
        <div style="display:flex;gap:10px">${sel('Nível','INTERMEDIÁRIO')}${inp('Score %','60')}</div>
        <button class="btn" style="align-self:flex-start">Registrar avaliação</button>
      </div>
    </div>
  </div>`;

V.admin=()=>`
  ${header('Administração','Painel administrativo','Gestão de conteúdo, avaliações e ambientes.')}
  <div class="ck">Telas prontas</div>
  <div class="grid g3" style="margin-bottom:24px">
    ${adm('Cursos','Criar, publicar e estruturar cursos/módulos/aulas + vídeos')}
    ${adm('Banco de questões','Criar questões, importar CSV e alimentar provas')}
    ${adm('Cyber Labs','Criar labs isolados, desafios e hints')}
  </div>
  <div class="ck">Endpoints prontos (telas nas próximas fases)</div>
  <div class="grid g3">
    ${['Provas','Badges','Usuários','Certificados','Relatórios','Notificações'].map(t=>adm(t,'Disponível via API / Swagger')).join('')}
  </div>`;

function sel(l,v){return `<label style="flex:1;font-size:12px;color:var(--gray)">${l}<div style="margin-top:4px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:9px 11px;color:var(--ink);font-size:13px">${v} ▾</div></label>`;}
function inp(l,v){return `<label style="flex:1;font-size:12px;color:var(--gray)">${l}<div style="margin-top:4px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:9px 11px;color:var(--ink);font-size:13px">${v}</div></label>`;}
function adm(t,d){return `<div class="card clickable"><b>${t}</b><p class="tag" style="margin:8px 0 12px">${d}</p><span style="color:var(--teal);font-size:12px;font-weight:600">Abrir →</span></div>`;}

/* ---- SOC Simulator ---- */
const sevColor={Alta:'var(--red)',Média:'var(--orange)',Baixa:'var(--teal2)'};
function sevPill(s){return `<span style="background:${sevColor[s]};color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:2px 10px">${s}</span>`;}

V.sim=()=>`
  ${header('Simulação · Blue Team','SOC Simulator','Trate incidentes simulados como no SOC real — investigue, decida e seja avaliado.')}
  <div class="grid g4" style="margin-bottom:16px">
    ${kpi('var(--teal)','Na fila','3','aguardando triagem')}
    ${kpi('var(--orange)','SLA médio','8 min','tempo de resposta')}
    ${kpi('var(--lime)','Encerrados hoje','11')}
    ${kpi('var(--teal)','Score do Analista','85%','média do turno')}
  </div>
  <div class="card top"><div class="ck">Fila de incidentes</div>
    <table><thead><tr>
      ${['#','Severidade','Alerta','Ativo/Usuário','Fonte','Hora','SLA',''].map(h=>`<th style="text-align:left;color:var(--muted);padding:8px;font-size:11px;text-transform:uppercase">${h}</th>`).join('')}
    </tr></thead><tbody>
    ${INCIDENTS.map(i=>`<tr style="border-top:1px solid var(--border)">
      <td style="padding:10px 8px;font-family:monospace;font-size:12px;color:var(--gray)">#${i.id}</td>
      <td>${sevPill(i.sev)}</td><td style="font-weight:600">${i.title}</td>
      <td class="tag">${i.user}</td><td class="tag">${i.src}</td><td class="tag">${i.time}</td>
      <td class="tag">${i.sla}</td>
      <td><button class="btn" style="padding:6px 12px" onclick="simTab('investigar')">Atender</button></td></tr>`).join('')}
    </tbody></table>
  </div>`;

V['sim-run']=()=>{
  const TABS=[['investigar','Investigar'],['kql','KQL'],['evidencias','Evidências'],['mitre','MITRE'],['classificar','Classificar'],['encerrar','Encerrar']];
  const body={
    investigar:`<p class="tag" style="margin:0 0 10px">Alerta <b>Impossible Travel</b> para <b>usuario@empresa.com</b>. Dois sign-ins bem-sucedidos em locais incompatíveis dentro de 16 min.</p>
      <table><thead><tr>${['Hora','IP','Local','Resultado'].map(h=>`<th style="text-align:left;color:var(--muted);padding:6px;font-size:11px">${h}</th>`).join('')}</tr></thead>
      <tbody>${SIM_SIGNINS.map((r,i)=>`<tr style="border-top:1px solid var(--border);${i>0?'background:#fbeaea':''}">${r.map(c=>`<td style="padding:8px 6px;font-size:13px">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
    kql:`<p class="tag" style="margin:0 0 8px">Consulte a telemetria com KQL (Sentinel):</p>
      <pre style="background:#101317;color:#d7e0d0;border-radius:10px;padding:14px;font-size:12.5px;overflow:auto;margin:0">${SIM_KQL}</pre>
      <button class="btn" style="margin-top:10px">Executar consulta</button>
      <p class="tag" style="margin-top:8px">3 registros · 2 origens distintas (BR e NL) · 1 IP suspeito 185.220.101.9 (nó Tor).</p>`,
    evidencias:`<div class="ck" style="margin-top:0">Evidências coletadas</div>
      ${['Sign-in NL (185.220.101.9) 09:11 — sucesso','IP classificado como nó de saída Tor (Threat Intel)','Nenhuma viagem corporativa registrada para o usuário'].map(e=>`<label style="display:flex;gap:8px;align-items:center;background:var(--surface2);border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:13px"><input type="checkbox" checked/> ${e}</label>`).join('')}`,
    mitre:`<p class="tag" style="margin:0 0 10px">Mapeie a técnica observada:</p>
      ${[['T1078','Valid Accounts',true],['T1110','Brute Force',false],['T1556','Modify Auth Process',false]].map(m=>`<label style="display:flex;gap:10px;align-items:center;border:1px solid ${m[2]?'var(--teal)':'var(--border)'};background:${m[2]?'var(--teal-tint)':'#fff'};border-radius:8px;padding:9px 12px;margin-bottom:6px;font-size:13px;cursor:pointer"><input type="radio" name="mitre" ${m[2]?'checked':''}/> <b>${m[0]}</b> · ${m[1]}</label>`).join('')}`,
    classificar:`<div style="display:flex;flex-direction:column;gap:10px">
      ${sel('Severidade','Média')}${sel('Tipo','Tomada de conta (suspeita)')}${sel('Verdadeiro/Falso positivo','Verdadeiro Positivo')}</div>`,
    encerrar:`<div class="ck" style="margin-top:0">Ação de resposta</div>
      ${['Revogar sessões do usuário no Entra ID','Forçar reset de MFA','Bloquear IP 185.220.101.9','Notificar o usuário e o gestor'].map(a=>`<label style="display:flex;gap:8px;align-items:center;background:var(--surface2);border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:13px"><input type="checkbox" checked/> ${a}</label>`).join('')}
      <textarea rows="3" placeholder="Resumo do fechamento (o que aconteceu, impacto, ação tomada)…" style="margin-top:6px;width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;color:var(--ink)"></textarea>
      <button class="btn" style="margin-top:10px">Encerrar incidente</button>`,
  };
  return `
  <span class="backlink" onclick="go('sim')">← Fila de incidentes</span>
  <div class="row" style="align-items:flex-start">
    ${header('Incidente #2026-000184','Impossible Travel','Microsoft Entra ID · usuario@empresa.com · 09:13')}
    ${sevPill('Média')}
  </div>
  <div class="grid" style="grid-template-columns:1.7fr 1fr">
    <div class="card top">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
        ${TABS.map(t=>`<button onclick="simTab('${t[0]}')" style="border:1px solid ${SIM_TAB===t[0]?'var(--teal)':'var(--border)'};background:${SIM_TAB===t[0]?'var(--teal)':'#fff'};color:${SIM_TAB===t[0]?'#fff':'var(--gray)'};border-radius:8px;padding:7px 13px;font-size:12.5px;font-weight:600;cursor:pointer">${t[1]}</button>`).join('')}
      </div>
      <div>${body[SIM_TAB]||body.investigar}</div>
    </div>
    <div class="dark"><div class="ck">Score do Analista de SOC</div>
      ${SIM_SCORE.map(s=>`<div style="margin-bottom:11px"><div class="row" style="font-size:13px;color:#c7ccd2;margin-bottom:5px"><span>${s[0]}</span><span>${s[1]}%</span></div>
        <div style="height:7px;background:#3a3f47;border-radius:999px;overflow:hidden"><div style="height:100%;width:${s[1]}%;background:linear-gradient(90deg,var(--teal2),var(--lime))"></div></div></div>`).join('')}
      <div style="border-top:1px solid #3a3f47;margin-top:12px;padding-top:12px" class="row"><span style="font-weight:700">Score geral</span><span style="font-weight:800;color:var(--lime);font-size:22px">85%</span></div>
    </div>
  </div>`;
};

/* ---- Detection Engineering ---- */
V.detect=()=>`
  ${header('Engenharia de Detecção','Laboratório de Engenharia de Detecção','Escreva uma detecção em KQL contra logs sintéticos e receba TP/FP e score.')}
  <div class="card top" style="margin-bottom:16px"><div class="ck">Desafio</div>
    <p style="margin:0 0 4px;font-weight:600">Detecte múltiplas tentativas de autenticação falha (≥10 em 5 min) contra um mesmo usuário.</p>
    <p class="tag">Base: <b>SecurityEvent</b> (Windows) · técnica esperada: T1110 — Brute Force</p>
  </div>
  <div class="grid" style="grid-template-columns:1.4fr 1fr">
    <div class="card"><div class="ck">Sua regra (KQL)</div>
      <pre style="background:#101317;color:#d7e0d0;border-radius:10px;padding:14px;font-size:12.5px;overflow:auto;margin:0">${DET_QUERY}</pre>
      <button class="btn" style="margin-top:12px">Executar contra logs sintéticos</button>
      <div class="ck" style="margin-top:18px">Amostra dos logs</div>
      <table><thead><tr>${['Hora','Conta','Origem','Evento'].map(h=>`<th style="text-align:left;color:var(--muted);padding:6px;font-size:11px">${h}</th>`).join('')}</tr></thead>
      <tbody>${DET_LOGS.map(r=>`<tr style="border-top:1px solid var(--border)">${r.map(c=>`<td style="padding:7px 6px;font-size:12.5px">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </div>
    <div class="dark"><div class="ck">Resultado</div>
      <div class="row" style="font-size:14px;margin-bottom:10px"><span style="color:#c7ccd2">Eventos correspondentes</span><b>47</b></div>
      <div class="row" style="font-size:14px;margin-bottom:10px"><span style="color:#c7ccd2">Verdadeiros Positivos</span><b style="color:var(--lime)">42</b></div>
      <div class="row" style="font-size:14px;margin-bottom:10px"><span style="color:#c7ccd2">Falsos Positivos</span><b style="color:var(--orange)">5</b></div>
      <div style="border-top:1px solid #3a3f47;margin:12px 0;padding-top:12px" class="row"><span style="font-weight:700">Score de Detecção</span><span style="font-weight:800;color:var(--lime);font-size:22px">89%</span></div>
      <span class="htag" style="background:var(--teal);width:auto;display:inline-block;padding:6px 12px">MITRE T1110 · Brute Force</span>
    </div>
  </div>`;

/* ---- Cyber Passport ---- */
V.passport=()=>`
  ${header('Perfil profissional','Cyber Passport','Perfil técnico verificável — skills, prática, certificações e cobertura MITRE.')}
  <div class="grid" style="grid-template-columns:1fr 1.4fr">
    <div class="dark">
      <div style="font-size:20px;font-weight:800">Rogério Analista</div>
      <div style="color:var(--lime);font-size:13px;margin-top:2px">SOC Analyst N1 · Nível 5</div>
      <div style="border-top:1px solid #3a3f47;margin:14px 0;padding-top:12px" class="ck">Certificações</div>
      ${CERTS.map(c=>`<div style="font-size:13px;color:#e6ecf7;margin-bottom:4px">🎓 ${c}</div>`).join('')}
      <div style="border-top:1px solid #3a3f47;margin:14px 0;padding-top:12px" class="ck">Cobertura MITRE</div>
      <div class="row" style="font-size:13px;color:#c7ccd2"><span>Técnicas estudadas</span><b>32</b></div>
      <div class="row" style="font-size:13px;color:#c7ccd2;margin-top:4px"><span>Técnicas praticadas</span><b style="color:var(--lime)">18</b></div>
      <div style="border-top:1px solid #3a3f47;margin:14px 0;padding-top:12px" class="row"><span class="ck" style="margin:0">Labs concluídos</span><b style="font-size:18px">18</b></div>
      <p style="font-family:monospace;font-size:11px;color:#6b727a;margin-top:12px">passport.thinkit.academy/rogerio-a · verificável</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card top"><div class="ck">Skills</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
          <div style="flex:1;min-width:230px">${radar(COMPS)}</div>
          <div style="flex:1;min-width:190px">${COMPS.map(c=>compRow(c)).join('')}</div>
        </div>
      </div>
      <div class="card"><div class="ck">Técnicas MITRE praticadas</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${MITRE.map(m=>`<span class="pill" style="${m[2]==='praticada'?'':'opacity:.55'}">${m[0]} · ${m[1]}${m[2]==='praticada'?' ✔':''}</span>`).join('')}
        </div>
      </div>
    </div>
  </div>`;

/* ---- Executivo: Gestão de Talentos ---- */
const TALENT_M={cols:['Operação SIEM','KQL/Caça a ameaças','Segurança de Redes','Resp. Incidentes','Segurança em Nuvem'],
  rows:[['Alex Chen',[3,1,3,0,1]],['Sarah Jenkins',[1,0,1,1,0]],['David Kim',[3,3,2,3,3]],['Maria Garcia',[0,0,1,0,0]]]};
const heatC=['#e0e2ec','#bfe0dd','#7cbcb7','#277471'];
V.talent=()=>`
  <div class="row" style="align-items:flex-start">
    ${header('Executivo · Talentos','Competências do Time de SOC','Análise de gaps de skill por departamento e telemetria de treinamento.')}
    <div style="display:flex;gap:10px"><button class="btn ghost">Exportar relatório</button><button class="btn" onclick="go('assign')">Atribuir treinamento</button></div>
  </div>
  <div class="grid g3" style="margin-bottom:16px">
    ${kpi('var(--teal)','Alunos ativos','42','↗ +12% no trimestre')}
    ${kpi('var(--teal)','Proficiência média','L3 / L5')}
    ${kpi('var(--red)','Gaps críticos','7','requerem ação imediata')}
  </div>
  <div class="grid" style="grid-template-columns:1.6fr 1fr">
    <div class="card top"><div class="ck">Matriz de Competências</div>
      <table><thead><tr><th style="text-align:left;color:var(--muted);padding:8px;font-size:11px" class="mono">Analista</th>
        ${TALENT_M.cols.map(c=>`<th class="mono" style="color:var(--muted);padding:8px;font-size:10px;text-align:center">${c}</th>`).join('')}</tr></thead>
        <tbody>${TALENT_M.rows.map(r=>`<tr style="border-top:1px solid var(--border)"><td style="padding:10px 8px;font-weight:600">${r[0]}</td>
          ${r[1].map(v=>`<td style="padding:6px;text-align:center"><span style="display:inline-block;width:30px;height:30px;border-radius:8px;background:${heatC[v]}"></span></td>`).join('')}</tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:12px"><span class="tag mono">menos proficiente → mais proficiente</span><span class="backlink" onclick="go('manager')" style="margin:0">Ver roster completo →</span></div>
    </div>
    <div class="card"><div class="row"><div class="ck" style="margin:0"><span style="font-size:16px;color:#8a9a1f;display:inline-flex;vertical-align:-3px">${icon('bulb')}</span> Recomendações</div></div>
      <div style="border-left:3px solid var(--red);background:var(--surface2);border-radius:0 8px 8px 0;padding:12px;margin:12px 0">
        <div class="mono" style="font-size:11px;color:var(--red);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Prioridade Crítica</div>
        <p style="margin:0;font-size:13px;color:var(--gray)">Matricular analistas N1 em <b style="color:var(--teal)">Fundamentos de KQL</b>. Apenas 20% de proficiência entre juniores.</p></div>
      <div style="border-left:3px solid var(--teal);background:var(--surface2);border-radius:0 8px 8px 0;padding:12px">
        <div class="mono" style="font-size:11px;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Trilha Sugerida</div>
        <p style="margin:0;font-size:13px;color:var(--gray)">Atribuir <b style="color:var(--teal)">Segurança em Nuvem Avançada</b> ao time N2 — 4 membros prontos para avançar.</p></div>
    </div>
  </div>`;

/* ---- Gestão: Atribuição em massa ---- */
const ASSIGN_PEOPLE=[['Alex Chen','SOC N1',true],['Sarah Jenkins','SOC N1',true],['Maria Garcia','SOC N1',true],['David Kim','SOC N2',false],['Bruno Costa','SOC N1',true]];
V.assign=()=>`
  ${header('Gestão · Onboarding','Atribuição de Treinamento em Massa','Matricule equipes inteiras em trilhas, cursos ou simulados de uma só vez.')}
  <div class="grid" style="grid-template-columns:1fr 1.4fr">
    <div class="card top"><div class="ck">1 · O que atribuir</div>
      ${sel('Tipo','Trilha')}${sel('Item','SOC Analyst N1')}
      <div style="height:12px"></div><div class="ck">2 · Prazo & regras</div>
      <div style="display:flex;gap:10px">${inp('Prazo','30/09/2026')}${sel('Obrigatório','Sim')}</div>
      <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;color:var(--gray)"><span class="sw on"></span> Notificar por e-mail e no app</label>
      <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;color:var(--gray)"><span class="sw on"></span> Contar XP ao concluir</label>
    </div>
    <div class="card"><div class="row"><div class="ck" style="margin:0">3 · Público-alvo</div>
      <div style="display:flex;gap:8px">${sel('Equipe','SOC — todos')}${sel('Nível','N1')}</div></div>
      <table style="margin-top:10px"><thead><tr>
        <th style="width:36px"></th>${['Analista','Time','Status atual'].map(h=>`<th class="mono" style="text-align:left;color:var(--muted);padding:8px;font-size:11px">${h}</th>`).join('')}</tr></thead>
        <tbody>${ASSIGN_PEOPLE.map(p=>`<tr style="border-top:1px solid var(--border)">
          <td style="padding:8px;text-align:center"><span class="sw ${p[2]?'on':'off'}" style="transform:scale(.8)"></span></td>
          <td style="padding:8px;font-weight:600">${p[0]}</td><td class="tag">${p[1]}</td>
          <td>${p[2]?pill('selecionado'):'<span class="tag">—</span>'}</td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
        <span class="tag">4 analistas selecionados</span>
        <button class="btn"><span style="font-size:17px;margin-right:6px;display:inline-flex;vertical-align:-3px">${icon('group_add')}</span>Atribuir a 4 analistas</button></div>
    </div>
  </div>`;

/* ---- Central de Notificações ---- */
const NOTIF_FULL=[
  ['workspace_premium','var(--lime)','Certificado emitido','Você concluiu a trilha "SOC Analyst N1". Certificado TICA-SOCANALYS-2026-0001.','há 2 min',false],
  ['military_tech','var(--teal)','Badge conquistada','Você desbloqueou "Investigador de Incidentes".','há 1 h',false],
  ['group_add','var(--orange)','Novo treinamento atribuído','Seu gestor atribuiu "Fundamentos de Resposta a Incidentes" — prazo 30/09.','há 3 h',true],
  ['my_location','var(--red)','Incidente na fila','SOC Simulator: novo incidente #2026-000185 (Alta) aguardando triagem.','há 5 h',true],
  ['menu_book','var(--teal)','Nova trilha publicada','Segurança em Nuvem acaba de ser disponibilizada no catálogo.','ontem',true],
];
V.notif=()=>`
  ${header('Central de Notificações','Notificações','Tudo o que aconteceu na sua jornada e na operação.')}
  <div style="display:flex;gap:8px;margin-bottom:16px">
    ${['Todas','Não lidas','Sistema','Conquistas','Treinamentos'].map((f,i)=>`<button style="border:1px solid ${i===0?'var(--teal)':'var(--border)'};background:${i===0?'var(--teal)':'#fff'};color:${i===0?'#fff':'var(--gray)'};border-radius:999px;padding:6px 14px;font-size:12.5px;cursor:pointer">${f}</button>`).join('')}
    <button class="btn ghost" style="margin-left:auto">Marcar todas como lidas</button>
  </div>
  <div class="card top" style="padding:6px">
    ${NOTIF_FULL.map((n,i)=>`<div style="display:flex;gap:14px;align-items:flex-start;padding:14px;${i<NOTIF_FULL.length-1?'border-bottom:1px solid var(--border)':''};${!n[5]?'background:var(--teal-tint)':''};border-radius:8px">
      <span style="color:${n[1]};background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px;display:inline-flex;font-size:20px">${icon(n[0])}</span>
      <div style="flex:1"><div class="row"><b style="font-size:14px">${n[2]}</b><span class="tag mono" style="font-size:11px">${n[4]}</span></div>
        <p style="margin:4px 0 0;font-size:13px;color:var(--gray)">${n[3]}</p></div>
      ${!n[5]?'<span style="width:8px;height:8px;border-radius:50%;background:var(--teal);margin-top:6px"></span>':''}</div>`).join('')}
  </div>`;

/* ---- Fórum Técnico ---- */
const FORUM_THREADS=[
  {title:'Como reduzir falsos positivos em regra de Brute Force?',cat:'SOC',tags:['KQL','Detecção'],author:'Rogério Analista',time:'há 2 h',votes:5,answers:2,body:'Estou vendo muito FP na regra de 4625. Alguém tem uma boa janela/threshold?'},
  {title:'Playbook de Impossible Travel no Sentinel',cat:'Nuvem',tags:['Sentinel','Entra ID'],author:'Rogério Analista',time:'há 1 dia',votes:8,answers:3,body:'Compartilhando meu playbook de resposta para Impossible Travel. Feedback?'},
  {title:'DFIR: triagem de memória com Volatility',cat:'DFIR',tags:['Forense'],author:'Rogério Analista',time:'há 3 dias',votes:4,answers:1,body:'Quais plugins vocês rodam primeiro numa triagem rápida?'},
];
V.forum=()=>`
  <div class="row" style="align-items:flex-start">
    ${header('Comunidade','Fórum Técnico','Dúvidas, playbooks e discussões entre analistas do SOC.')}
    <button class="btn">+ Nova pergunta</button>
  </div>
  <div class="grid" style="grid-template-columns:1.7fr 1fr">
    <div style="display:flex;flex-direction:column;gap:12px">
      ${FORUM_THREADS.map(t=>`<div class="card">
        <div style="display:flex;gap:8px;margin-bottom:8px">${pill(t.cat)}${t.tags.map(pill).join('')}</div>
        <b style="font-size:14.5px">${t.title}</b>
        <p class="tag" style="margin:8px 0 10px">${t.body}</p>
        <div class="row"><span class="tag">${t.author} · ${t.time}</span><span class="tag">▲ ${t.votes} votos · ${t.answers} resposta${t.answers===1?'':'s'}</span></div>
      </div>`).join('')}
    </div>
    <div class="card top"><div class="ck">Tags em alta</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${['KQL','SIEM','Sentinel','Entra ID','DFIR','Detecção','Forense'].map(pill).join('')}</div>
      <div class="ck" style="margin-top:18px">Como funciona</div>
      <p class="tag">Pergunte, compartilhe playbooks e vote nas respostas mais úteis da comunidade de analistas.</p>
    </div>
  </div>`;

/* ---- Gestão: Perfil do Analista ---- */
V['manager-profile']=()=>`
  <span class="backlink" onclick="go('manager')">← Gestão do SOC</span>
  ${header('Gestão · Perfil do Analista','Marina S.','SOC Analyst N2 · Nível 4')}
  <div class="grid" style="grid-template-columns:1fr 1.4fr">
    <div class="dark">
      <div style="font-size:20px;font-weight:800">Marina S.</div>
      <div style="color:var(--lime);font-size:13px;margin-top:2px">SOC Analyst N2 · Nível 4</div>
      <div style="border-top:1px solid #3a3f47;margin:14px 0;padding-top:12px" class="ck">Certificações</div>
      <div style="font-size:13px;color:#e6ecf7;margin-bottom:4px">🎓 SC-900</div>
      <div style="font-size:13px;color:#e6ecf7;margin-bottom:4px">🎓 AZ-900</div>
      <div style="border-top:1px solid #3a3f47;margin:14px 0;padding-top:12px" class="ck">Resumo</div>
      <div class="row" style="font-size:13px;color:#c7ccd2"><span>Labs concluídos</span><b>22</b></div>
      <div class="row" style="font-size:13px;color:#c7ccd2;margin-top:4px"><span>Cursos concluídos</span><b style="color:var(--lime)">5</b></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card top"><div class="ck">Matriz de competências</div>
        <table><thead><tr>${MATRIX.comps.map(c=>`<th style="color:var(--muted);padding:6px;font-size:11px">${c}</th>`).join('')}</tr></thead>
          <tbody><tr>${MATRIX.comps.map(c=>{const lv=MATRIX.analysts[1][1][c]||'NONE';const col=LVL[lv]||LVL.NONE;
            return `<td style="padding:4px;text-align:center"><span style="display:inline-flex;width:34px;height:26px;align-items:center;justify-content:center;border-radius:6px;background:${col[0]};color:${col[1]};font-size:12px;font-weight:700">${lv==='NONE'?'—':lv}</span></td>`;}).join('')}</tr></tbody></table>
        <p class="tag" style="margin-top:10px">Legenda: B=Básico · I=Intermediário · A=Avançado · E=Especialista</p>
      </div>
      <div class="card"><div class="ck">Avaliação do gestor</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${sel('Próxima trilha sugerida','Segurança em Nuvem Avançada')}
          ${inp('Observação','Pronta para assumir turnos N3 em Caça a Ameaças.')}
          <button class="btn" style="align-self:flex-start">Registrar avaliação</button>
        </div>
      </div>
    </div>
  </div>`;

/* ---- Executivo: Relatório de Talentos ---- */
const REPORT_TOP=[['Sarah Jenkins','Pentester Líder',98.5],['Marcus Chen','Arquiteto de Segurança em Nuvem',97.2],['Alex Rivera','Respondente de Incidentes',95.8]];
const REPORT_MATRIX={cols:['Red Team','Blue Team','Forense','AppSec','Compliance'],
  rows:[['Esquadrão Alpha',[92,85,64,88,45]],['Esquadrão Bravo',[68,95,78,52,82]],['Esquadrão Charlie',[35,71,89,65,58]]]};
const REPORT_CERTS=[['OSCP (Offensive Security)',14,20],['CISSP (Segurança de Sistemas)',8,10],['AWS Security Specialty',22,25],['CEH (Ethical Hacker)',5,15]];
function capCell(v){const c=v>=80?'#e0efee':v>=50?'#faecd8':'#f7e2e2';const t=v>=80?'#277471':v>=50?'#b56a1e':'#c03a3a';
  return `<td style="padding:6px;text-align:center"><span style="display:inline-flex;width:100%;justify-content:center;border-radius:6px;background:${c};color:${t};font-size:12px;font-weight:700;padding:4px 0">${v}</span></td>`;}
V['talent-report']=()=>`
  <span class="backlink" onclick="go('talent')">← Gestão de Talentos</span>
  <div class="row" style="align-items:flex-start">
    ${header('Relatório executivo','Dossiê de Talentos — Q3 2026','Prontidão técnica do time de SOC, gaps críticos e pipeline de certificação.')}
    <button class="btn ghost"><span style="font-size:17px;margin-right:6px;display:inline-flex;vertical-align:-3px">${icon('download')}</span>Exportar PDF</button>
  </div>
  <div class="grid g3" style="margin-bottom:16px">
    ${kpi('var(--teal)','Score médio de competência','84','de 100 · ↗ +4,2%')}
    ${kpi('var(--lime)','Taxa de conclusão de labs','92%','↗ +1,8%')}
    ${kpi('var(--red)','Gaps críticos identificados','3')}
  </div>
  <div class="card top" style="margin-bottom:16px"><div class="ck">Top performers</div>
    ${REPORT_TOP.map(p=>`<div class="row" style="padding:8px 0;border-bottom:1px solid var(--border)"><span>${p[0]} <span class="tag">${p[1]}</span></span><b style="color:var(--teal)">${p[2]}</b></div>`).join('')}
  </div>
  <div class="card top" style="margin-bottom:16px;overflow-x:auto"><div class="ck">Matriz de capacidade por esquadrão</div>
    <table><thead><tr><th style="text-align:left;color:var(--muted);padding:6px;font-size:11px">Esquadrão</th>
      ${REPORT_MATRIX.cols.map(c=>`<th style="color:var(--muted);padding:6px;font-size:11px">${c}</th>`).join('')}</tr></thead>
      <tbody>${REPORT_MATRIX.rows.map(r=>`<tr style="border-top:1px solid var(--border)"><td style="padding:6px;font-weight:600">${r[0]}</td>${r[1].map(capCell).join('')}</tr>`).join('')}</tbody></table>
    <p class="tag" style="margin-top:10px">⚠️ Gap crítico identificado em Red Team no Esquadrão Charlie.</p>
  </div>
  <div class="card"><div class="ck">Pipeline de certificação</div>
    ${REPORT_CERTS.map(c=>`<div class="row" style="padding:6px 0;border-bottom:1px solid var(--border)"><span>${c[0]}</span><b>${c[1]} / ${c[2]}</b></div>`).join('')}
  </div>`;

const STITCH={};
const NAV=[["dashboard","dashboard","Dashboard"],["courses","school","Cursos & Trilhas"],["labs","biotech","Cyber Labs"],["sim","terminal","SOC Simulator"],["exams","quiz","Avaliações"],["leaderboard","leaderboard","Ranking"],["achievements","military_tech","Conquistas"],["passport","badge","Cyber Passport"],["certificates","workspace_premium","Certificados"],["notif","notifications","Notificações"],["forum","forum","Fórum Técnico"],["manager","groups","Gestor"],["talent","insights","Gestão de Talentos"],["assign","group_add","Atribuição em massa"],["admin","settings","Administração"]];
const ROUTE={"dashboard":"/dashboard","courses":"/courses","course-detail":"/courses/detail","labs":"/labs","lab-console":"/labs/console","sim":"/sim","exams":"/exams","exam-run":"/exams/run","leaderboard":"/leaderboard","achievements":"/achievements","passport":"/passport","certificates":"/certificates","notif":"/notifications","forum":"/forum","manager":"/manager","manager-profile":"/manager/profile","talent":"/talent","talent-report":"/talent/report","assign":"/assign","admin":"/admin"};
function buildSidebar(active){
  const link=(id,ic,label)=>{const on=id===active;
    const cls=(on?'nav-link active ':'nav-link ')+'flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 '+(on?'border-electric-lime':'border-transparent')+' transition-all duration-300 hover:translate-x-1';
    return '<a class="'+cls+'" href="#" onclick="go(\''+id+'\');return false;"><span class="material-symbols-outlined shrink-0">'+ic+'</span><span class="nav-label text-label-md font-label-md">'+label+'</span></a>';};
  const items=NAV.map(n=>link(n[0],n[1],n[2])).join('');
  return '<nav class="app-sidebar hidden md:flex flex-col h-full py-base gap-2 bg-surface-dark shadow-2xl border-r border-outline-variant/10 fixed left-0 top-0 z-50">'
    +'<div class="px-6 py-6 mb-4"><div class="flex items-center gap-3">'
    +'<svg width="34" height="34" viewBox="0 0 24 24" fill="none" class="shrink-0"><g stroke="#C8D541" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13"/></g></svg>'
    +'<div class="brand-text"><h1 class="text-headline-md font-headline-md font-bold text-electric-lime leading-none">Cyber Academy</h1><p class="text-label-sm font-label-sm text-cyber-teal mt-1">Think IT · Operador de Elite</p></div></div></div>'
    +'<div class="px-6 mb-6"><button onclick="go(\'labs\')" class="w-full bg-electric-lime text-on-surface font-label-md text-label-md py-3 rounded-lg hover:bg-secondary-container transition-colors shadow-[0_4px_12px_rgba(200,213,65,0.2)] flex items-center justify-center gap-2"><span class="material-symbols-outlined shrink-0" style="font-variation-settings:\'FILL\' 1;">terminal</span><span class="start-lab-label">Iniciar Lab</span></button></div>'
    +'<div class="flex-1 overflow-y-auto px-4 flex flex-col gap-1">'+items+'</div>'
    +'<div class="mt-auto px-4 pt-4 pb-6 border-t border-outline-variant/10 flex flex-col gap-1">'
    +link('admin','settings','Administração')
    +'<a class="nav-link flex items-center gap-3 px-4 py-3 rounded-lg" href="#" onclick="if(window.__logout)window.__logout();return false;"><span class="material-symbols-outlined shrink-0">logout</span><span class="nav-label text-label-md font-label-md">Sair</span></a>'
    +'</div></nav>';
}
function renderView(id){
  if (STITCH[id] !== undefined) return STITCH[id];
  return '<div class="pt-24 pb-12 px-margin-desktop mx-auto" style="max-width:1160px">' + (V[id]||V.dashboard)() + '</div>';
}
export { V, STITCH, NAV, ROUTE, renderView, setSimTab, icon, buildSidebar };
