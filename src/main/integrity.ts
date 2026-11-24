// Administrador: ler o nível de integridade e saber quem pediu para reabrir elevado.
//
// Nível: saída do "whoami /groups /fo csv /nh". S-1-16-12288 = alto (elevado, administrador),
// S-1-16-16384 = sistema. O nome do grupo muda com o idioma do Windows; o SID não. Não usa
// "net session", que falha mesmo elevado quando o serviço "Servidor" está desligado.
export const isElevatedGroups = (groupsCsv: string) => /S-1-16-(12288|16384)\b/.test(groupsCsv);

// Quem pediu: num PC com usuário padrão, o UAC pede a senha de OUTRA conta e o Vanish reabre como
// ela (limparia os caches e a Lixeira dessa conta). A cópia antiga passa o próprio SID neste
// argumento; a nova compara com o dela e avisa se for outra pessoa.
const FLAG = '--launched-by=';

export const launchFlag = (sid: string) => `${FLAG}${sid}`;

/** SID de quem pediu "Abrir como administrador", ou undefined se o app foi aberto normalmente */
export function launcherSid(argv: readonly string[]): string | undefined {
  const sid = argv.find((a) => a.startsWith(FLAG))?.slice(FLAG.length);
  return sid && /^S-1-[\d-]+$/.test(sid) ? sid : undefined;
}

/** a cópia elevada está em outra conta que não a de quem pediu */
export const isOtherAccount = (launcher: string | undefined, current: string | undefined) =>
  !!launcher && !!current && launcher.toUpperCase() !== current.toUpperCase();
