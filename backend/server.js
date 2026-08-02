import { register } from 'tsx/esm/api';

register();

await import(new URL('./src/index.ts', import.meta.url));
