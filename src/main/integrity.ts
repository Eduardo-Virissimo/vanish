// Ler o nível de integridade do processo na saída do "whoami /groups /fo csv /nh".
// S-1-16-12288 = alto (elevado, administrador), S-1-16-16384 = sistema. O nome do grupo muda com o
// idioma do Windows; o SID não. Não usa "net session", que falha mesmo elevado quando o serviço
// "Servidor" está desligado.
export const isElevatedGroups = (groupsCsv: string) => /S-1-16-(12288|16384)\b/.test(groupsCsv);
