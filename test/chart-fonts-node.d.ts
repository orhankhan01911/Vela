// The few Node APIs the source-scanning tests use (the project compiles without @types/node).
declare module 'node:fs' {
    export function readFileSync(path: string, encoding: 'utf8'): string;
    export function readdirSync(path: string): string[];
    export function statSync(path: string): { isDirectory(): boolean };
    export function writeFileSync(path: string, data: string): void;
}
