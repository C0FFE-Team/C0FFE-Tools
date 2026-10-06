// Everything the page shows that depends on the chosen AI or operating system.
// A step variant with `ai`/`os` only shows for those choices; without them it always shows.

export type Ai = "claude" | "codex" | "opencode" | "free";
export type Os = "mac" | "windows" | "linux";

export const AIS: { id: Ai; label: string; hint: string; cli: string }[] = [
  { id: "claude", label: "Claude Code", hint: "plano Pro ou Max", cli: "claude" },
  { id: "codex", label: "Codex", hint: "conta ChatGPT", cli: "codex" },
  { id: "opencode", label: "OpenCode", hint: "qualquer modelo", cli: "opencode" },
  { id: "free", label: "OpenCode grátis", hint: "modo fácil", cli: "opencode" },
];

export const OSES: { id: Os; label: string; shell: string; prompt: string }[] = [
  { id: "mac", label: "macOS", shell: "Terminal", prompt: "~ %" },
  { id: "windows", label: "Windows", shell: "PowerShell", prompt: "PS C:\\>" },
  { id: "linux", label: "Linux", shell: "Terminal", prompt: "~ $" },
];

export const REPO = "https://github.com/C0FFE-Team/C0FFE-Tools";

export interface Variant {
  ai?: Ai[];
  os?: Os[];
  lines: string[];
  note?: string;
}

export interface Step {
  title: string;
  why: string;
  variants: Variant[];
}

const installFlag: Record<Ai, string> = {
  claude: "--claude",
  codex: "--codex",
  opencode: "--opencode",
  free: "--profile free",
};

export const STEPS: Step[] = [
  {
    title: "Instale o Node.js e o Git",
    why: "O C0FFE Tools roda em Node. O Git baixa o projeto.",
    variants: [
      {
        os: ["mac"],
        lines: ["brew install node git"],
        note: "Sem Homebrew? Instale antes em `brew.sh`",
      },
      {
        os: ["windows"],
        lines: ["winget install OpenJS.NodeJS.LTS", "winget install Git.Git"],
        note: "Depois feche e abra o PowerShell de novo.",
      },
      {
        os: ["linux"],
        lines: ["sudo apt install nodejs npm git"],
        note: "Precisa de Node 18 ou mais novo. Confira com `node -v`",
      },
    ],
  },
  {
    title: "Instale a sua IA",
    why: "O C0FFE Tools turbina a IA que você já usa. Ela precisa estar instalada e logada.",
    variants: [
      { ai: ["claude"], os: ["mac", "linux"], lines: ["curl -fsSL https://claude.ai/install.sh | bash", "claude"] },
      { ai: ["claude"], os: ["windows"], lines: ["irm https://claude.ai/install.ps1 | iex", "claude"] },
      { ai: ["claude"], lines: [], note: "Ao abrir, entre com sua conta. O Claude Code precisa do plano Pro ou Max." },
      { ai: ["codex"], lines: ["npm install -g @openai/codex", "codex"], note: "Ao abrir, escolha `Sign in with ChatGPT`." },
      { ai: ["opencode", "free"], lines: ["npm install -g opencode-ai", "opencode"] },
      {
        ai: ["opencode"],
        lines: [],
        note: "Dentro do OpenCode, digite `/connect` e conecte o provedor que você usa.",
      },
      {
        ai: ["free"],
        lines: [],
        note: "Dentro do OpenCode, digite `/connect`, escolha `OpenCode Zen` e cole a chave grátis de `opencode.ai/auth`. Saia com `Ctrl+C`.",
      },
    ],
  },
  {
    title: "Baixe o C0FFE Tools",
    why: "Uma pasta com tudo: skills, agents, regras e o comando `coff`.",
    variants: [{ lines: [`git clone ${REPO}.git`, "cd C0FFE-Tools"] }],
  },
  {
    title: "Instale",
    why: "Cria o comando `coff` e configura a sua IA. Pode rodar de novo quando quiser.",
    variants: (["claude", "codex", "opencode", "free"] as Ai[]).flatMap((ai) => [
      { ai: [ai], os: ["mac", "linux"] as Os[], lines: [`./install.sh ${installFlag[ai]}`] },
      { ai: [ai], os: ["windows"] as Os[], lines: [`.\\install.cmd ${installFlag[ai]}`] },
    ]),
  },
  {
    title: "Confira",
    why: "Feche e abra o terminal. O doctor mostra o que está certo e o que falta.",
    variants: [{ lines: ["coff doctor"], note: "✓ está certo. ! é opcional. ✗ precisa resolver (ele diz como)." }],
  },
  {
    title: "Prepare um projeto",
    why: "Entre na pasta do seu projeto e rode uma vez. Ele cria a memória do projeto e instala o pipeline ali.",
    variants: [
      { os: ["mac", "linux"], lines: ["cd ~/projetos/meu-app", "coff init"] },
      { os: ["windows"], lines: ["cd ~\\projetos\\meu-app", "coff init"] },
    ],
  },
];

export interface Skill {
  name: string;
  args?: string;
  does: string;
  where: "global" | "project";
}

export const SKILLS: Skill[] = [
  { name: "coff-research", args: "<tema>", does: "Pesquisa uma lib ou dúvida e resume com exemplos", where: "global" },
  { name: "coff-validate", does: "Roda typecheck, lint, testes e build. Corrige o que quebrar", where: "global" },
  { name: "coff-create-pr", does: "Abre um Pull Request no GitHub com título padrão", where: "global" },
  { name: "coff-do", args: '"<o que fazer>"', does: "Pipeline completo a partir de um texto", where: "project" },
  { name: "coff-solve", args: "<id>", does: "Pipeline completo a partir de uma tarefa do Linear/Jira", where: "project" },
  { name: "coff-styleguide", does: "Extrai cores, fontes e espaçamentos do Figma", where: "project" },
  { name: "coff-plan", does: "Lê o PRD e o Figma e cria as tarefas no tracker", where: "project" },
  { name: "coff-implement", args: "<link do figma>", does: "Transforma uma tela do Figma em código fiel", where: "project" },
  { name: "coff-linear", args: "<issue>", does: "Resolve as sub-tarefas de uma issue comparando com o Figma", where: "project" },
  { name: "coff-deploy", does: "Sobe o backend no Railway e o frontend na Vercel", where: "project" },
];

export const PIPELINE: { agent: string; does: string; gate?: boolean }[] = [
  { agent: "Scout", does: "lê o código, o PRD e o Figma" },
  { agent: "Architect", does: "escreve o plano" },
  { agent: "Você", does: "lê e aprova o plano", gate: true },
  { agent: "Engineer", does: "escreve o código, commit a commit" },
  { agent: "Tester", does: "roda os testes e corrige" },
  { agent: "Publisher", does: "abre o PR e atualiza a tarefa" },
];

export const CLI: { cmd: string; does: string }[] = [
  { cmd: "coff install", does: "instala ou atualiza tudo" },
  { cmd: "coff doctor", does: "confere se está tudo certo" },
  { cmd: "coff init", does: "prepara a pasta de um projeto" },
  { cmd: "coff profiles", does: "lista os perfis (ex.: free)" },
  { cmd: "coff status", does: "mostra clientes, projetos e features" },
  { cmd: "coff reset", does: "recomeça a config global, com backup" },
  { cmd: "coff restore", does: "volta um backup" },
  { cmd: "coff uninstall", does: "remove tudo que o coff instalou" },
  { cmd: "coff up <feature>", does: "sobe os servidores em <feature>.coff.localhost" },
];
