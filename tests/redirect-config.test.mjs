import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { redirects } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('legacy homepage has an explicit permanent redirect to the new homepage', () => {
  const rule = redirects.find(({ source }) => source === '/');
  assert.ok(rule, 'homepage redirect must be explicit');
  assert.equal(rule.destination, 'https://877hand.com/');
  assert.equal(rule.permanent, true);
  assert.ok(rule.has.some(({ type, value }) => type === 'host' && new RegExp(`^${value}$`).test('877hand.vercel.app')));
});
