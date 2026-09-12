import { readFileSync } from 'fs';
async function test() {
  const { readFileSync } = await import('fs');
  console.log('worked');
}
test();
