/* eslint-disable no-console */
// =============================================================================
// SEED — Think IT Cyber Academy
// Cria: papéis + permissões, usuários (admin/manager/aluno), categorias,
// competências, badges, cursos/módulos/aulas, trilhas, simulados com questões
// ORIGINAIS de treinamento (AZ-900, SC-900, Security+) e labs sintéticos
// (incluindo uma VM completa de exemplo).
//
// As questões são de treinamento, escritas com base nos OBJETIVOS PÚBLICOS de
// cada certificação. Não são dumps nem bancos proprietários.
// =============================================================================
import { PrismaClient, RoleName, Difficulty, ExamKind, LabCategory, LabDriver, VmOsType } from '.prisma/client';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const sha256 = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

async function main() {
  console.log('▶ Seeding Think IT Cyber Academy...');

  // ---------------------------------------------------------------- Roles
  const roleNames = Object.values(RoleName);
  const roles = new Map<RoleName, string>();
  for (const name of roleNames) {
    const r = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `Papel ${name}` },
    });
    roles.set(name, r.id);
  }

  // ------------------------------------------------------------ Permissions
  const permissionKeys = [
    'course:manage', 'lab:manage', 'exam:manage', 'user:manage',
    'report:view', 'competency:assess', 'content:publish',
  ];
  for (const key of permissionKeys) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  // ---------------------------------------------------------------- Users
  const pass = await bcrypt.hash('ChangeMe!123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@thinkit.academy' },
    update: {},
    create: {
      email: 'admin@thinkit.academy',
      name: 'Administrador Think IT',
      passwordHash: pass,
      jobTitle: 'Platform Admin',
      roles: { create: [{ roleId: roles.get(RoleName.SUPER_ADMIN)! }] },
    },
  });
  const manager = await prisma.user.upsert({
    where: { email: 'gestor@thinkit.academy' },
    update: {},
    create: {
      email: 'gestor@thinkit.academy',
      name: 'Gestor do SOC',
      passwordHash: pass,
      jobTitle: 'SOC Manager',
      roles: { create: [{ roleId: roles.get(RoleName.MANAGER)! }] },
    },
  });
  const student = await prisma.user.upsert({
    where: { email: 'analista@thinkit.academy' },
    update: {},
    create: {
      email: 'analista@thinkit.academy',
      name: 'Rogério Analista',
      passwordHash: pass,
      jobTitle: 'SOC Analyst N1',
      totalXp: 2450,
      level: 5,
      roles: {
        create: [
          { roleId: roles.get(RoleName.ANALYST)! },
          { roleId: roles.get(RoleName.STUDENT)! },
        ],
      },
    },
  });

  // ------------------------------------------------------------ Categories
  const catData = [
    { name: 'Fundamentos', slug: 'fundamentos', icon: 'shield' },
    { name: 'SOC', slug: 'soc', icon: 'radar' },
    { name: 'Cloud', slug: 'cloud', icon: 'cloud' },
    { name: 'Microsoft Security', slug: 'microsoft-security', icon: 'lock' },
  ];
  const cats = new Map<string, string>();
  for (const c of catData) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    cats.set(c.slug, row.id);
  }

  // ----------------------------------------------------------- Competencies
  const competencyDefs = [
    ['SIEM', 'SIEM & Log Management'],
    ['KQL', 'Kusto Query Language'],
    ['NETWORKING', 'Fundamentos de Redes'],
    ['WINDOWS', 'Windows Security'],
    ['LINUX', 'Linux Security'],
    ['CLOUD', 'Cloud Security'],
    ['INCIDENT_RESPONSE', 'Resposta a Incidentes'],
    ['THREAT_INTEL', 'Threat Intelligence'],
    ['DFIR', 'Digital Forensics & IR'],
  ];
  const comps = new Map<string, string>();
  for (const [key, name] of competencyDefs) {
    const row = await prisma.competency.upsert({
      where: { key }, update: {}, create: { key, name },
    });
    comps.set(key, row.id);
  }

  // Perfil de competências de exemplo para o analista (alimenta o radar).
  const sampleProfile: Record<string, number> = {
    SIEM: 82, KQL: 71, NETWORKING: 91, WINDOWS: 63,
    CLOUD: 42, INCIDENT_RESPONSE: 58,
  };
  const pctToLevel = (p: number) =>
    p >= 85 ? 'EXPERT' : p >= 65 ? 'ADVANCED' : p >= 45 ? 'INTERMEDIATE' : p >= 20 ? 'BASIC' : 'NONE';
  for (const [key, pct] of Object.entries(sampleProfile)) {
    await prisma.userCompetency.upsert({
      where: { userId_competencyId: { userId: student.id, competencyId: comps.get(key)! } },
      update: { scorePct: pct, level: pctToLevel(pct) as any },
      create: {
        userId: student.id, competencyId: comps.get(key)!,
        scorePct: pct, level: pctToLevel(pct) as any,
        evidence: 'EXAM', assessedById: manager.id,
      },
    });
  }

  // ---------------------------------------------------------------- Badges
  const badges = [
    ['Primeiro Curso', 'first-course', 'Concluiu seu primeiro curso', 50],
    ['Primeiro Lab', 'first-lab', 'Concluiu seu primeiro laboratório', 100],
    ['Iniciante em SOC', 'soc-beginner', 'Iniciou a trilha SOC Analyst N1', 25],
    ['Caçador de Logs', 'log-hunter', 'Concluiu labs de análise de logs', 150],
    ['Caçador de Ameaças', 'threat-hunter', 'Concluiu o módulo de Threat Hunting', 200],
    ['Investigador de Incidentes', 'incident-investigator', 'Resolveu o SOC Investigation Lab', 250],
    ['Defensor de Nuvem', 'cloud-defender', 'Concluiu a trilha de Cloud Security', 200],
    ['Fundamentos de Segurança', 'security-fundamentals', 'Passou no simulado de fundamentos', 100],
    ['Analista KQL', 'kql-analyst', 'Dominou consultas KQL', 150],
    ['Analista SIEM', 'siem-analyst', 'Concluiu o módulo de SIEM', 150],
    ['Defensor Cibernético', 'cyber-defender', 'Concluiu a trilha SOC Analyst N1', 500],
  ];
  for (const [name, slug, description, xpReward] of badges) {
    await prisma.badge.upsert({
      where: { slug: slug as string },
      update: {},
      create: { name: name as string, slug: slug as string, description: description as string, xpReward: xpReward as number, icon: 'award' },
    });
  }

  // ---------------------------------------------------------------- Courses
  async function courseWithModules(opts: {
    title: string; slug: string; short: string; catSlug: string; hours: number;
    difficulty: Difficulty; modules: { title: string; lessons: string[] }[];
  }) {
    const course = await prisma.course.upsert({
      where: { slug: opts.slug },
      update: {},
      create: {
        title: opts.title, slug: opts.slug, shortDescription: opts.short,
        estimatedHours: opts.hours, difficulty: opts.difficulty, status: 'PUBLISHED',
        publishedAt: new Date(), categoryId: cats.get(opts.catSlug)!, instructorId: admin.id,
        modules: {
          create: opts.modules.map((m, mi) => ({
            title: m.title, order: mi,
            lessons: {
              create: m.lessons.map((l, li) => ({ title: l, type: 'VIDEO' as const, order: li })),
            },
          })),
        },
      },
    });
    return course;
  }

  const cFund = await courseWithModules({
    title: 'Fundamentos de Cybersecurity', slug: 'fundamentos-cybersecurity',
    short: 'Conceitos essenciais de segurança da informação.', catSlug: 'fundamentos',
    hours: 8, difficulty: 'EASY',
    modules: [
      { title: 'Conceitos de Segurança', lessons: ['Tríade CIA', 'Ameaças e Vulnerabilidades', 'Superfície de Ataque'] },
      { title: 'Defesa em Profundidade', lessons: ['Controles de Segurança', 'Modelos de Confiança Zero'] },
    ],
  });
  const cSoc = await courseWithModules({
    title: 'SOC Analyst N1', slug: 'soc-analyst-n1',
    short: 'Formação de analista de SOC nível 1.', catSlug: 'soc',
    hours: 40, difficulty: 'MEDIUM',
    modules: [
      { title: 'Fundamentos de Segurança', lessons: ['Introdução ao SOC', 'Tipos de Ataque'] },
      { title: 'SIEM', lessons: ['O que é um SIEM', 'Ingestão de Logs', 'Regras de Correlação'] },
      { title: 'MITRE ATT&CK', lessons: ['Táticas e Técnicas', 'Mapeando Alertas'] },
      { title: 'Investigação de Incidentes', lessons: ['Triagem de Alertas', 'Correlação de Eventos'] },
    ],
  });
  const cAzure = await courseWithModules({
    title: 'Azure Fundamentals (AZ-900)', slug: 'azure-fundamentals-az900',
    short: 'Preparação para a certificação AZ-900.', catSlug: 'cloud',
    hours: 12, difficulty: 'EASY',
    modules: [
      { title: 'Conceitos de Cloud', lessons: ['Modelos de Cloud', 'Benefícios da Cloud'] },
      { title: 'Serviços do Azure', lessons: ['Computação', 'Armazenamento', 'Rede'] },
    ],
  });
  const cMsSec = await courseWithModules({
    title: 'Microsoft Security Fundamentals (SC-900)', slug: 'ms-security-sc900',
    short: 'Preparação para a certificação SC-900.', catSlug: 'microsoft-security',
    hours: 12, difficulty: 'EASY',
    modules: [
      { title: 'Conceitos de Segurança', lessons: ['Modelo de Responsabilidade Compartilhada', 'Zero Trust'] },
      { title: 'Microsoft Entra', lessons: ['Identidade', 'Autenticação', 'Acesso Condicional'] },
    ],
  });

  // ------------------------------------------------------------ Exams + Questions
  async function createSimulado(opts: {
    title: string; category: string; questions: {
      prompt: string; explanation: string; options: [string, boolean][];
    }[];
  }) {
    const exam = await prisma.exam.create({
      data: {
        title: opts.title, kind: ExamKind.SIMULATION, category: opts.category,
        difficulty: 'MEDIUM', questionCount: opts.questions.length, durationMin: 30,
        passScorePct: 70, maxAttempts: 3, randomize: true, shuffleOptions: true,
        status: 'PUBLISHED',
      },
    });
    let order = 0;
    for (const q of opts.questions) {
      const question = await prisma.question.create({
        data: {
          prompt: q.prompt, explanation: q.explanation, type: 'SINGLE_CHOICE',
          category: opts.category, difficulty: 'MEDIUM', points: 1,
          options: { create: q.options.map(([text, isCorrect], i) => ({ text, isCorrect, order: i })) },
        },
      });
      await prisma.examQuestion.create({
        data: { examId: exam.id, questionId: question.id, order: order++ },
      });
    }
    return exam;
  }

  await createSimulado({ title: 'AZ-900 — Simulado #01', category: 'AZ-900', questions: AZ900 });
  await createSimulado({ title: 'SC-900 — Simulado #01', category: 'SC-900', questions: SC900 });
  await createSimulado({ title: 'Security+ — Simulado #01', category: 'Security+', questions: SECURITY_PLUS });

  // ------------------------------------------------------------ Learning paths
  async function path(title: string, slug: string, courseSlugs: { slug: string; id: string }[]) {
    return prisma.learningPath.upsert({
      where: { slug }, update: {},
      create: {
        title, slug, status: 'PUBLISHED', difficulty: 'MEDIUM',
        courses: { create: courseSlugs.map((c, i) => ({ courseId: c.id, order: i })) },
      },
    });
  }
  const socPath = await path('SOC Analyst N1', 'soc-analyst-n1', [
    { slug: cFund.slug, id: cFund.id }, { slug: cSoc.slug, id: cSoc.id },
  ]);
  await path('AZ-900 Preparation', 'az900-preparation', [{ slug: cAzure.slug, id: cAzure.id }]);
  await path('SC-900 Preparation', 'sc900-preparation', [{ slug: cMsSec.slug, id: cMsSec.id }]);
  await path('Security+ Preparation', 'security-plus-preparation', [{ slug: cFund.slug, id: cFund.id }]);

  // Matricula o analista na trilha SOC N1
  await prisma.userLearningPath.upsert({
    where: { userId_learningPathId: { userId: student.id, learningPathId: socPath.id } },
    update: { progressPct: 68 },
    create: { userId: student.id, learningPathId: socPath.id, progressPct: 68 },
  });

  // ---------------------------------------------------------------- Labs
  const labs: Array<{
    title: string; slug: string; objective: string; category: LabCategory; xp: number;
    difficulty?: Difficulty; durationMin?: number;
    driver?: LabDriver; osType?: VmOsType; vmVersion?: string; cpuLimit?: string; memoryLimitMb?: number; timeoutMin?: number;
    /** Override explícito de imagem — necessário para labs cujo desafio exige dados/ferramentas REAIS
     * dentro do container/VM (ex.: log sintético pra analisar, nmap/Wireshark pra rodar), em vez do
     * placeholder inerte `nginx:alpine` (DOCKER) ou da imagem padrão do osType (VM). Ver infra/labs/README.md
     * — imagens custom são construídas uma vez no host dedicado via `docker build`, não vêm de um registry. */
    dockerImage?: string;
    challenges: { title: string; flag: string; points: number }[];
    hints: string[];
  }> = [
    {
      title: 'SOC Investigation — Brute Force', slug: 'soc-investigation-brute-force',
      objective: 'Investigar múltiplas falhas de autenticação em dados sintéticos e classificar o incidente.',
      category: LabCategory.SOC, xp: 250,
      // Antes usava o placeholder nginx:alpine (sem NENHUM dado real pro
      // aluno analisar — bug real, corrigido aqui). Agora serve o log
      // sintético de verdade via HTTP (accessUrl da instância). Imagem
      // construída uma vez no host: ver infra/labs/README.md.
      dockerImage: 'tica-lab-soc-brute-force:latest',
      challenges: [
        { title: 'Identificar o usuário-alvo', flag: 'jsilva', points: 50 },
        { title: 'Identificar o IP de origem', flag: '203.0.113.47', points: 50 },
        { title: 'Mapear a técnica MITRE', flag: 'T1110', points: 75 },
        { title: 'Classificar a severidade', flag: 'medium', points: 75 },
      ],
      hints: ['Filtre os eventos 4625 do Windows.', 'Correlacione horário e IP de origem.'],
    },
    {
      title: 'Log Analysis — Web Access', slug: 'log-analysis-web-access',
      objective: 'Analisar logs de acesso web sintéticos e identificar tentativa de path traversal.',
      category: LabCategory.NETWORK, xp: 150,
      // Idem: log de acesso sintético real, servido via HTTP — ver comentário no lab anterior.
      dockerImage: 'tica-lab-log-analysis-web-access:latest',
      // IMPORTANTE: o flag NUNCA pode ser uma string de payload de ataque
      // literal (ex.: "../../etc/passwd") — validado em produção que o WAF
      // na frente da API (Cloudflare, via Render) BLOQUEIA a requisição de
      // submit inteira com uma página "Blocked" antes mesmo de chegar no
      // NestJS, tornando o desafio impossível de completar. Peça o NOME do
      // arquivo/alvo em vez do payload completo.
      challenges: [
        { title: 'Qual arquivo sensível o atacante tentou acessar via path traversal?', flag: 'passwd', points: 75 },
        { title: 'Identificar o status code de sucesso', flag: '200', points: 75 },
      ],
      hints: ['Procure por sequências de "../" nas URLs.'],
    },
    {
      title: 'KQL Basics — Sentinel Sandbox', slug: 'kql-basics-sentinel',
      objective: 'Escrever consultas KQL sobre uma tabela sintética de sign-ins.',
      category: LabCategory.CLOUD, xp: 100,
      // Idem: tabela de sign-ins sintética real (CSV), servida via HTTP — ver comentário nos labs anteriores.
      dockerImage: 'tica-lab-kql-sentinel:latest',
      challenges: [{ title: 'Contar sign-ins com falha', flag: '17', points: 100 }],
      hints: ['Use where ResultType != 0 | count.'],
    },
    {
      // VM completa (não CTF): desktop Ubuntu real via RDP (xrdp), acessado
      // através de um gateway Apache Guacamole — mantém a VM na rede
      // isolada (RDP não é HTTP, não dá pra proxiar por Host() no Traefik
      // como o noVNC). Ver apps/api/src/labs/drivers/vm.driver.ts e
      // apps/api/src/labs/drivers/guacamole.client.ts. Sem Docker/Guacamole
      // configurados, a instância cai em modo simulação.
      title: 'Ubuntu Desktop — Recon Practice', slug: 'ubuntu-desktop-recon-practice',
      objective: 'Praticar enumeração e busca de vulnerabilidades num desktop Ubuntu completo, isolado.',
      category: LabCategory.LINUX, xp: 150,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 90,
      challenges: [{ title: 'Identificar a versão do kernel', flag: 'uname -r', points: 50 }],
      hints: ['Abra um terminal dentro do desktop e rode "uname -a".'],
    },

    // ------------------------------------------------- Redes (NETWORK) ---
    {
      title: 'Network Fundamentals — Subnetting & Protocolos', slug: 'network-fundamentals-subnetting',
      objective: 'Praticar cálculo de sub-redes e reconhecimento de protocolos/portas comuns num desktop Linux real, isolado.',
      category: LabCategory.NETWORK, xp: 120, difficulty: Difficulty.EASY, durationMin: 30,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      challenges: [
        { title: 'Endereço de broadcast de 192.168.10.0/26', flag: '192.168.10.63', points: 40 },
        { title: 'Hosts utilizáveis numa rede /27', flag: '30', points: 40 },
        { title: 'Porta TCP padrão do protocolo RDP', flag: '3389', points: 40 },
      ],
      hints: [
        'Hosts utilizáveis = 2^(32 - prefixo) - 2.',
        'O endereço de broadcast é sempre o último endereço do intervalo da sub-rede.',
      ],
    },
    {
      title: 'Packet Analysis — Tráfego Suspeito', slug: 'packet-analysis-trafego-suspeito',
      objective: 'Analisar tráfego de rede e identificar indícios de reconhecimento (port scanning) num desktop Linux real, isolado.',
      category: LabCategory.NETWORK, xp: 180, difficulty: Difficulty.MEDIUM, durationMin: 40,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      // Desktop Ubuntu comum não tem nmap instalado — sem isso o desafio
      // pede pra rodar uma ferramenta que não existe na VM. Usa a imagem
      // com ferramentas de rede reais (ver infra/labs/README.md).
      dockerImage: 'tica-lab-pentest-desktop:latest',
      challenges: [
        { title: 'Flag TCP que indica o início de uma conexão', flag: 'syn', points: 60 },
        { title: 'Ferramenta de linha de comando mais usada para varredura de portas', flag: 'nmap', points: 60 },
        { title: 'Nome do tipo de scan que nunca completa o three-way handshake', flag: 'syn scan', points: 60 },
      ],
      hints: [
        'Um handshake TCP completo é SYN → SYN-ACK → ACK.',
        'Esse tipo de scan é chamado de "half-open" porque a conexão nunca é finalizada.',
      ],
    },
    {
      title: 'Nmap — Varredura de Portas e Serviços', slug: 'nmap-varredura-portas-servicos',
      objective: 'Rodar varreduras reais com nmap num desktop Linux completo e interpretar os resultados.',
      category: LabCategory.NETWORK, xp: 160, difficulty: Difficulty.EASY, durationMin: 35,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      dockerImage: 'tica-lab-pentest-desktop:latest',
      challenges: [
        { title: 'Abra um terminal e rode "nmap -sV 127.0.0.1" — qual porta TCP aparece aberta rodando o serviço de RDP (xrdp)?', flag: '3389', points: 50 },
        { title: 'Qual parâmetro do nmap faz a varredura de TODAS as 65535 portas, em vez do padrão top-1000?', flag: '-p-', points: 50 },
        { title: 'Qual opção do nmap ativa a detecção de versão dos serviços encontrados?', flag: '-sV', points: 60 },
      ],
      hints: [
        'A porta do RDP/xrdp é a mesma usada pra você acessar essa própria VM.',
        'A flag de "todas as portas" usa um hífen seguido de "p" e outro hífen, sem número.',
      ],
    },
    {
      title: 'Wireshark/Tshark — Captura e Análise de Tráfego', slug: 'wireshark-captura-analise-trafego',
      objective: 'Usar tshark (Wireshark via linha de comando) pra capturar e filtrar tráfego real num desktop Linux completo, isolado.',
      category: LabCategory.NETWORK, xp: 180, difficulty: Difficulty.MEDIUM, durationMin: 40,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      dockerImage: 'tica-lab-pentest-desktop:latest',
      challenges: [
        { title: 'Rode "tshark -D" no terminal da VM — qual é o nome da interface de loopback listada?', flag: 'lo', points: 50 },
        { title: 'Qual comando de terminal roda a mesma engine de captura do Wireshark, sem interface gráfica?', flag: 'tshark', points: 50 },
        { title: 'Qual filtro do Wireshark/tshark exibe somente pacotes TCP com a flag SYN ativa?', flag: 'tcp.flags.syn==1', points: 80 },
      ],
      hints: [
        'A interface de loopback é a mesma usada por "ping 127.0.0.1".',
        'O nome do binário de captura sem GUI é uma contração de "terminal" + "shark".',
      ],
    },
    {
      title: 'Netstat — Conexões e Portas Ativas', slug: 'netstat-conexoes-portas-ativas',
      objective: 'Investigar conexões de rede e portas em escuta com netstat/ss num desktop Linux real, isolado.',
      category: LabCategory.NETWORK, xp: 140, difficulty: Difficulty.EASY, durationMin: 30,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      dockerImage: 'tica-lab-pentest-desktop:latest',
      challenges: [
        { title: 'Rode "netstat -tlnp" no terminal — qual porta TCP aparece em LISTEN associada ao processo xrdp?', flag: '3389', points: 40 },
        { title: 'Qual comando moderno substitui o netstat na maioria das distros Linux atuais?', flag: 'ss', points: 50 },
        { title: 'Qual opção do netstat exibe a tabela de roteamento em vez das conexões?', flag: '-r', points: 50 },
      ],
      hints: [
        'A mesma porta que você usa pra acessar essa VM por RDP.',
        'O comando moderno tem só duas letras.',
      ],
    },

    // ------------------------------------------------------- WINDOWS ----
    {
      // Windows 10 real via QEMU/KVM — exige host dedicado com recursos
      // adequados (padrão 4 vCPU/8GB) e WINDOWS_ISO_CACHE_PATH configurado
      // (rede isolada não tem saída à internet pra baixar a ISO da
      // Microsoft — ver vm.driver.ts). Validado em produção na VM 4
      // vCPU/16GB com a ISO em cache.
      title: 'Windows Event Log — Detecção de Força Bruta', slug: 'windows-event-log-forca-bruta',
      objective: 'Interpretar Event IDs nativos do Windows Security Log para identificar um ataque de força bruta local, numa VM Windows 10 real.',
      category: LabCategory.WINDOWS, xp: 130, difficulty: Difficulty.EASY, durationMin: 30,
      driver: LabDriver.VM, osType: VmOsType.WINDOWS10, vmVersion: '10', cpuLimit: '4', memoryLimitMb: 8192, timeoutMin: 90,
      challenges: [
        { title: 'Event ID de falha de logon', flag: '4625', points: 40 },
        { title: 'Event ID de logon bem-sucedido', flag: '4624', points: 40 },
        { title: 'Utilitário nativo de linha de comando para consultar logs do Windows', flag: 'wevtutil', points: 50 },
      ],
      hints: [
        'Os Event IDs de logon do Windows Security log ficam na faixa 4624-4634.',
        'O utilitário é parte do próprio Windows, não precisa instalar nada.',
      ],
    },
    {
      // Mesma ressalva de recursos do lab anterior — Windows 10 real via QEMU/KVM.
      title: 'Active Directory — Fundamentos de Escalonamento', slug: 'active-directory-fundamentos-escalonamento',
      objective: 'Compreender conceitos fundamentais de escalonamento de privilégios em ambientes Active Directory, numa VM Windows 10 real.',
      category: LabCategory.WINDOWS, xp: 200, difficulty: Difficulty.HARD, durationMin: 45,
      driver: LabDriver.VM, osType: VmOsType.WINDOWS10, vmVersion: '10', cpuLimit: '4', memoryLimitMb: 8192, timeoutMin: 90,
      challenges: [
        { title: 'Grupo do AD com controle total sobre o domínio', flag: 'domain admins', points: 70 },
        { title: 'Protocolo de autenticação alvo de ataques Kerberoasting', flag: 'kerberos', points: 65 },
        { title: 'Cmdlet do PowerShell que lista os membros de um grupo do AD', flag: 'get-adgroupmember', points: 65 },
      ],
      hints: [
        'Kerberoasting explora contas de serviço com SPN configurado.',
        'Os cmdlets do módulo ActiveDirectory seguem o padrão Verbo-Ad*.',
      ],
    },

    // --------------------------------------------------------- LINUX ----
    {
      title: 'Linux Privilege Escalation — Enumeração', slug: 'linux-privesc-enumeracao',
      objective: 'Praticar técnicas de enumeração usadas para encontrar vetores de escalonamento de privilégios, num desktop Linux real, isolado.',
      category: LabCategory.LINUX, xp: 150, difficulty: Difficulty.MEDIUM, durationMin: 35,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      challenges: [
        { title: 'Permissão especial que executa um binário com privilégios do proprietário', flag: 'suid', points: 50 },
        { title: 'Arquivo que lista os usuários com permissão de sudo', flag: '/etc/sudoers', points: 50 },
        { title: 'Comando que exibe a versão do kernel em execução', flag: 'uname -r', points: 50 },
      ],
      hints: [
        '`find / -perm -4000` lista binários com esse bit habilitado.',
        'Sempre edite esse arquivo com `visudo`, nunca direto.',
      ],
    },
    {
      title: 'Linux Log Analysis — Persistência', slug: 'linux-log-analysis-persistencia',
      objective: 'Identificar mecanismos comuns de persistência usados por atacantes, num desktop Linux real, isolado.',
      category: LabCategory.LINUX, xp: 170, difficulty: Difficulty.MEDIUM, durationMin: 40,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      challenges: [
        { title: 'Mecanismo de agendamento de tarefas usado para persistência', flag: 'crontab', points: 55 },
        { title: 'Diretório que guarda unidades de serviço do systemd', flag: '/etc/systemd/system', points: 55 },
        { title: 'Comando que lista os serviços habilitados no boot', flag: 'systemctl list-unit-files', points: 60 },
      ],
      hints: [
        'Verifique tanto o crontab do usuário quanto o /etc/crontab e /etc/cron.d/.',
        'Serviços "enabled" iniciam automaticamente no boot.',
      ],
    },

    // ------------------------------------------------------- RED TEAM ---
    // Categoria CTF — o catálogo ainda não tem um enum dedicado "RED_TEAM";
    // CTF é a categoria mais próxima pra desafios ofensivos/red team.
    {
      title: 'Red Team — MITRE ATT&CK na Prática', slug: 'red-team-mitre-attack-na-pratica',
      objective: 'Mapear técnicas de ataque observadas às táticas do framework MITRE ATT&CK, com um desktop Linux real à disposição.',
      category: LabCategory.CTF, xp: 160, difficulty: Difficulty.MEDIUM, durationMin: 35,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      challenges: [
        { title: 'Tática que corresponde ao movimento entre sistemas já comprometidos', flag: 'lateral movement', points: 55 },
        { title: 'Técnica de reautenticação usando um hash de senha roubado (sem saber o texto claro)', flag: 'pass the hash', points: 55 },
        { title: 'Tática que descreve a coleta de informações antes do ataque', flag: 'reconnaissance', points: 50 },
      ],
      hints: [
        'O MITRE ATT&CK organiza técnicas em táticas — cada tática representa um objetivo do atacante.',
        '"Pass the hash" evita a necessidade de quebrar o hash da senha.',
      ],
    },
    {
      title: 'Red Team — Acesso Inicial e Phishing', slug: 'red-team-acesso-inicial-phishing',
      objective: 'Compreender vetores comuns de acesso inicial usados em engajamentos de red team autorizados, com um desktop Linux real à disposição.',
      category: LabCategory.CTF, xp: 190, difficulty: Difficulty.HARD, durationMin: 40,
      driver: LabDriver.VM, osType: VmOsType.UBUNTU_DESKTOP_RDP, cpuLimit: '2', memoryLimitMb: 4096, timeoutMin: 60,
      challenges: [
        { title: 'Técnica de engenharia social que usa e-mail fraudulento para induzir um clique malicioso', flag: 'phishing', points: 60 },
        { title: 'Componente de documentos Office usado para entregar código malicioso', flag: 'macro', points: 60 },
        { title: 'Framework open-source amplamente usado para gerar payloads e sessões C2 em testes autorizados', flag: 'metasploit', points: 70 },
      ],
      hints: [
        'Spear phishing é uma variante direcionada a um alvo específico.',
        'Esse framework também é conhecido por seu módulo "meterpreter".',
      ],
    },
  ];
  for (const l of labs) {
    const isVm = l.driver === LabDriver.VM;
    await prisma.lab.upsert({
      where: { slug: l.slug }, update: {},
      create: {
        title: l.title, slug: l.slug, objective: l.objective, category: l.category,
        difficulty: l.difficulty ?? 'MEDIUM', durationMin: l.durationMin ?? 45, xpReward: l.xp, driver: l.driver ?? LabDriver.DOCKER,
        osType: isVm ? l.osType : null,
        vmVersion: isVm ? l.vmVersion : null,
        // Padrão: nginx:alpine — placeholder inerte e REAL (existe no Docker
        // Hub); validado em produção que uma imagem fictícia faz o
        // `docker run` falhar assim que o Docker está de fato conectado.
        // A validação do desafio é 100% server-side via hash da flag.
        // `l.dockerImage` sobrescreve esse padrão quando o desafio EXIGE
        // conteúdo real (log sintético pra analisar, ferramenta pra rodar)
        // — ver comentário no tipo `labs` acima. Sem override, VM continua
        // usando a imagem padrão do osType (null aqui, resolvida no driver).
        dockerImage: l.dockerImage ?? (isVm ? null : 'nginx:alpine'),
        cpuLimit: l.cpuLimit ?? '1', memoryLimitMb: l.memoryLimitMb ?? 1024,
        timeoutMin: l.timeoutMin ?? 60, exposedPorts: isVm ? [] : [80], status: 'PUBLISHED',
        challenges: { create: l.challenges.map((c, i) => ({ title: c.title, points: c.points, flagHash: sha256(c.flag), order: i })) },
        hints: { create: l.hints.map((h, i) => ({ text: h, order: i, costXp: 10 })) },
      },
    });
  }

  // ---------------------------------------------------------------- Fórum
  const forumSeed = [
    { title: 'Como reduzir falsos positivos em regra de Brute Force?', category: 'SOC', tags: ['KQL', 'Detecção'], body: 'Estou vendo muito FP na regra de 4625. Alguém tem uma boa janela/threshold?' },
    { title: 'Playbook de Impossible Travel no Sentinel', category: 'Cloud', tags: ['Sentinel', 'Entra ID'], body: 'Compartilhando meu playbook de resposta para Impossible Travel. Feedback?' },
    { title: 'DFIR: triagem de memória com Volatility', category: 'DFIR', tags: ['Forense'], body: 'Quais plugins vocês rodam primeiro numa triagem rápida?' },
  ];
  for (const t of forumSeed) {
    const thread = await prisma.forumThread.create({
      data: { ...t, authorId: student.id, authorName: student.name, votes: Math.floor(t.title.length / 5) },
    });
    await prisma.forumPost.create({
      data: { threadId: thread.id, authorId: manager.id, authorName: manager.name, body: 'Ótimo tópico — recomendo começar pelo agrupamento por conta + janela de 5 min.', votes: 2 },
    });
  }

  // ---------------------------------------------------------------- Incidentes (SOC Simulator)
  const incidents = [
    {
      publicId: '2026-000184', title: 'Impossible Travel', severity: 'MEDIUM', source: 'Microsoft Entra ID',
      asset: 'usuario@empresa.com', alertTime: '09:13',
      briefing: 'Dois sign-ins bem-sucedidos em locais incompatíveis dentro de 16 minutos.',
      signins: [
        { time: '08:57', ip: '203.0.113.47', location: 'São Paulo, BR', result: 'sucesso' },
        { time: '09:11', ip: '185.220.101.9', location: 'Amsterdã, NL', result: 'sucesso' },
        { time: '09:13', ip: '185.220.101.9', location: 'Amsterdã, NL', result: 'sucesso' },
      ],
      correctSeverity: 'MEDIUM', correctTechnique: 'T1078', correctVerdict: 'TRUE_POSITIVE',
      recommendedAction: 'Revogar sessões no Entra ID, forçar reset de MFA e bloquear o IP 185.220.101.9.',
    },
    {
      publicId: '2026-000185', title: 'Brute Force — múltiplas falhas 4625', severity: 'HIGH', source: 'Windows / Active Directory',
      asset: 'jsilva', alertTime: '02:41',
      briefing: '47 falhas de autenticação (4625) em 90s seguidas de um logon bem-sucedido.',
      signins: [{ time: '02:40', ip: '10.0.4.7', event: '4625', count: 47 }, { time: '02:41', ip: '10.0.4.7', event: '4624' }],
      correctSeverity: 'HIGH', correctTechnique: 'T1110', correctVerdict: 'TRUE_POSITIVE',
      recommendedAction: 'Bloquear o host 10.0.4.7, resetar credenciais de jsilva e habilitar lockout policy.',
    },
    {
      publicId: '2026-000186', title: 'PowerShell codificado (Base64)', severity: 'LOW', source: 'Defender for Endpoint',
      asset: 'host-fin-07', alertTime: '14:22',
      briefing: 'Execução de PowerShell com -EncodedCommand detectada por script legítimo de inventário.',
      signins: [{ time: '14:22', proc: 'powershell.exe -enc ...', parent: 'sccm-agent' }],
      correctSeverity: 'LOW', correctTechnique: 'T1059.001', correctVerdict: 'FALSE_POSITIVE',
      recommendedAction: 'Adicionar exceção para o agente de inventário e documentar como FP.',
    },
  ];
  for (const inc of incidents) {
    await prisma.incident.upsert({ where: { publicId: inc.publicId }, update: {}, create: inc as any });
  }

  // ---------------------------------------------------------------- Detection Engineering
  const detLogs: any[] = [];
  for (let i = 0; i < 47; i++) detLogs.push({ eventId: 4625, account: 'jsilva', ip: '10.0.4.7', ts: `02:40:${(i % 60).toString().padStart(2, '0')}`, malicious: true });
  for (let i = 0; i < 60; i++) detLogs.push({ eventId: 4625, account: `user${i % 12}`, ip: `10.0.${i % 5}.${i}`, ts: '10:00', malicious: false });
  await prisma.detectionChallenge.create({
    data: {
      title: 'Brute Force — múltiplas falhas 4625',
      description: 'Detecte ≥10 tentativas de autenticação falha (4625) contra um mesmo usuário em 5 minutos.',
      base: 'SecurityEvent', mitre: 'T1110', logs: detLogs,
      requiredTokens: ['4625', 'summarize'], precisionTokens: ['>= 10', '>=10', 'bin(', '5m'],
      passScore: 70,
    },
  });

  console.log('✔ Seed concluído.');
  console.log('  Admin:   admin@thinkit.academy   / ChangeMe!123');
  console.log('  Gestor:  gestor@thinkit.academy  / ChangeMe!123');
  console.log('  Aluno:   analista@thinkit.academy / ChangeMe!123');
}

// ================= BANCOS DE QUESTÕES ORIGINAIS DE TREINAMENTO ==============

const AZ900: { prompt: string; explanation: string; options: [string, boolean][] }[] = [
  { prompt: 'Qual modelo de serviço de nuvem entrega máquinas virtuais e redes, deixando o SO sob responsabilidade do cliente?',
    explanation: 'IaaS entrega infraestrutura (VMs, rede, storage); o cliente gerencia SO e aplicações.',
    options: [['IaaS', true], ['PaaS', false], ['SaaS', false], ['FaaS', false]] },
  { prompt: 'O que caracteriza a elasticidade na computação em nuvem?',
    explanation: 'Elasticidade é ajustar recursos automaticamente conforme a demanda, para cima ou para baixo.',
    options: [['Ajuste automático de recursos conforme a demanda', true], ['Pagamento fixo mensal', false], ['Armazenamento ilimitado gratuito', false], ['Backup manual diário', false]] },
  { prompt: 'Qual conceito descreve pagar apenas pelos recursos efetivamente consumidos?',
    explanation: 'O modelo consumption-based (pay-as-you-go) cobra pelo uso real.',
    options: [['Consumption-based pricing', true], ['Reserva vitalícia', false], ['Licenciamento perpétuo', false], ['CapEx fixo', false]] },
  { prompt: 'Uma implantação com recursos em datacenter próprio e também na nuvem pública é chamada de:',
    explanation: 'Nuvem híbrida combina infraestrutura on-premises com nuvem pública.',
    options: [['Nuvem híbrida', true], ['Nuvem pública', false], ['Nuvem comunitária', false], ['Edge isolado', false]] },
  { prompt: 'Qual serviço do Azure é o mais indicado para hospedar contêineres sem gerenciar a orquestração?',
    explanation: 'Azure Container Apps/Instances abstraem a infraestrutura de orquestração.',
    options: [['Azure Container Apps', true], ['Azure Virtual Machines', false], ['Azure Blob Storage', false], ['Azure DNS', false]] },
  { prompt: 'No modelo de responsabilidade compartilhada, quem é sempre responsável pela classificação dos dados?',
    explanation: 'A classificação e a governança dos dados são sempre responsabilidade do cliente.',
    options: [['O cliente', true], ['O provedor de nuvem', false], ['O fabricante do hardware', false], ['Ninguém', false]] },
  { prompt: 'Qual ferramenta ajuda a estimar custos antes de implantar recursos no Azure?',
    explanation: 'A Pricing Calculator estima custos de recursos planejados.',
    options: [['Azure Pricing Calculator', true], ['Azure Monitor', false], ['Azure Policy', false], ['Azure Bastion', false]] },
  { prompt: 'O que o Azure Policy permite fazer?',
    explanation: 'Azure Policy aplica e audita regras de conformidade sobre recursos.',
    options: [['Impor regras de conformidade nos recursos', true], ['Criar máquinas virtuais', false], ['Fazer backup de bancos', false], ['Enviar e-mails', false]] },
  { prompt: 'Qual benefício descreve melhor a alta disponibilidade em nuvem?',
    explanation: 'Alta disponibilidade minimiza o tempo de inatividade mantendo o serviço acessível.',
    options: [['Minimizar tempo de inatividade do serviço', true], ['Reduzir o número de usuários', false], ['Eliminar a necessidade de senhas', false], ['Aumentar a latência', false]] },
  { prompt: 'Qual escopo de gerenciamento no Azure agrupa múltiplas subscriptions para aplicar governança?',
    explanation: 'Management Groups agrupam subscriptions para aplicar políticas e RBAC em escala.',
    options: [['Management Group', true], ['Resource Group', false], ['Tag', false], ['Availability Zone', false]] },
];

const SC900: { prompt: string; explanation: string; options: [string, boolean][] }[] = [
  { prompt: 'Qual princípio do Zero Trust afirma que se deve sempre validar explicitamente cada requisição?',
    explanation: '"Verificar explicitamente" exige autenticar e autorizar com base em todos os sinais disponíveis.',
    options: [['Verificar explicitamente', true], ['Confiar na rede interna', false], ['Permitir por padrão', false], ['Segurança apenas de perímetro', false]] },
  { prompt: 'No Microsoft Entra ID, o que é o Acesso Condicional?',
    explanation: 'Acesso Condicional aplica políticas baseadas em sinais (usuário, risco, dispositivo) para permitir/bloquear acesso.',
    options: [['Políticas que controlam o acesso com base em sinais de risco', true], ['Um antivírus', false], ['Um firewall de rede', false], ['Um serviço de backup', false]] },
  { prompt: 'Qual recurso adiciona uma camada extra de verificação além da senha?',
    explanation: 'MFA (autenticação multifator) exige mais de um fator de verificação.',
    options: [['MFA', true], ['SSO', false], ['DNS', false], ['VPN', false]] },
  { prompt: 'O que o Microsoft Purview endereça principalmente?',
    explanation: 'Purview cobre governança, compliance e proteção/classificação de dados.',
    options: [['Governança e compliance de dados', true], ['Provisionar VMs', false], ['Balanceamento de carga', false], ['Renderização gráfica', false]] },
  { prompt: 'Qual conceito descreve conceder o mínimo de privilégios necessários a um usuário?',
    explanation: 'O princípio do menor privilégio (least privilege) limita permissões ao estritamente necessário.',
    options: [['Privilégio mínimo', true], ['Acesso total', false], ['Administração compartilhada', false], ['Confiança aberta', false]] },
  { prompt: 'No Microsoft Defender, qual capacidade foca em detectar e responder a ameaças em endpoints?',
    explanation: 'Defender for Endpoint fornece EDR (detecção e resposta em endpoints).',
    options: [['Defender for Endpoint (EDR)', true], ['Azure DNS', false], ['Blob Storage', false], ['Pricing Calculator', false]] },
  { prompt: 'O que é SIEM no contexto da segurança Microsoft (Sentinel)?',
    explanation: 'SIEM coleta e correlaciona logs para detecção; o Sentinel é o SIEM nativo em nuvem.',
    options: [['Coleta e correlação de logs para detecção', true], ['Um editor de texto', false], ['Um serviço de e-mail', false], ['Um CDN', false]] },
  { prompt: 'Qual tipo de identidade o Entra ID usa para aplicações e serviços acessarem recursos com segurança?',
    explanation: 'Managed identities permitem que serviços autentiquem sem credenciais embutidas.',
    options: [['Managed identity', true], ['Conta pessoal', false], ['Chave física USB', false], ['Endereço MAC', false]] },
  { prompt: 'O que o Secure Score da Microsoft mede?',
    explanation: 'O Secure Score mede a postura de segurança e recomenda melhorias.',
    options: [['A postura de segurança da organização', true], ['A velocidade da rede', false], ['O custo mensal', false], ['O número de usuários', false]] },
  { prompt: 'Qual é a finalidade do RBAC no Azure?',
    explanation: 'RBAC concede permissões por papéis atribuídos a um escopo específico.',
    options: [['Conceder permissões com base em papéis e escopo', true], ['Criptografar discos', false], ['Medir latência', false], ['Traduzir DNS', false]] },
];

const SECURITY_PLUS: { prompt: string; explanation: string; options: [string, boolean][] }[] = [
  { prompt: 'Qual princípio da tríade CIA é violado quando um atacante altera dados sem autorização?',
    explanation: 'Integridade garante que os dados não sejam alterados indevidamente.',
    options: [['Integridade', true], ['Confidencialidade', false], ['Disponibilidade', false], ['Não repúdio', false]] },
  { prompt: 'Um ataque que envia e-mails falsos em massa induzindo cliques é classificado como:',
    explanation: 'Phishing é engenharia social por mensagens fraudulentas.',
    options: [['Phishing', true], ['DDoS', false], ['SQL Injection', false], ['Buffer overflow', false]] },
  { prompt: 'Qual controle é do tipo "detectivo"?',
    explanation: 'Controles detectivos identificam eventos após ocorrerem — ex.: logs e IDS.',
    options: [['Sistema de detecção de intrusão (IDS)', true], ['Firewall que bloqueia porta', false], ['Política de senha forte', false], ['Treinamento de conscientização', false]] },
  { prompt: 'O que caracteriza um ataque de força bruta?',
    explanation: 'Força bruta testa exaustivamente combinações de credenciais.',
    options: [['Testar exaustivamente senhas/credenciais', true], ['Interceptar tráfego criptografado', false], ['Explorar erro de lógica de negócio', false], ['Falsificar registros DNS', false]] },
  { prompt: 'Qual tecnologia garante confidencialidade dos dados em trânsito na web?',
    explanation: 'TLS criptografa a comunicação entre cliente e servidor.',
    options: [['TLS', true], ['FTP', false], ['Telnet', false], ['HTTP', false]] },
  { prompt: 'Qual é a melhor defesa contra SQL Injection?',
    explanation: 'Consultas parametrizadas (prepared statements) separam dados de comandos.',
    options: [['Consultas parametrizadas', true], ['Aumentar a RAM', false], ['Desativar o firewall', false], ['Usar senhas curtas', false]] },
  { prompt: 'No framework MITRE ATT&CK, "Credential Access" é um exemplo de:',
    explanation: 'ATT&CK organiza comportamentos em táticas; Credential Access é uma tática.',
    options: [['Tática', true], ['Vulnerabilidade CVE', false], ['Porta de rede', false], ['Algoritmo de hash', false]] },
  { prompt: 'Qual princípio dificulta que um único indivíduo cometa fraude sozinho?',
    explanation: 'Separação de funções (separation of duties) divide tarefas críticas entre pessoas.',
    options: [['Separação de funções', true], ['Menor privilégio', false], ['Defesa em profundidade', false], ['Fail-open', false]] },
  { prompt: 'O que um hash criptográfico fornece?',
    explanation: 'Hashes verificam integridade — a mesma entrada gera sempre o mesmo resumo.',
    options: [['Verificação de integridade', true], ['Compressão reversível', false], ['Criptografia simétrica de disco', false], ['Balanceamento de carga', false]] },
  { prompt: 'Durante a resposta a incidentes (modelo comum), qual fase vem imediatamente após a Identificação?',
    explanation: 'A ordem usual é: Preparação, Identificação, Contenção, Erradicação, Recuperação, Lições aprendidas.',
    options: [['Contenção', true], ['Preparação', false], ['Recuperação', false], ['Lições aprendidas', false]] },
];

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
