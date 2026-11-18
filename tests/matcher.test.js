import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/matcher.js';

const { matches } = globalThis.GTA6Shield;
const blocked = [
  'GTA 6', 'gta6', '#GTA6', 'GTA VI', 'GTAVI', 'GTA-VI', 'GTA: VI',
  'Grand Theft Auto VI', 'Grand Theft Auto 6', '#GrandTheftAutoVI',
  'grand-theft-auto-vi', 'G.T.A. 6', 'G T A 6', 'GTA six',
  'Grand Theft Auto Six', 'GTA ６', 'ＧＴＡ ６', 'GTA Ⅵ',
  'GTA​6', 'GTA 6', 'GTA 6️⃣', 'GTA_6', 'GTA/6',
  'GṪÁ 6', 'before GTA 6 comes out', 'GTA\n6 trailer', 'GTA💥6',
  'Grand Theft Auto', 'GRAND THEFT AUTO', 'GrandTheftAuto',
  '#GrandTheftAuto', 'grand-theft-auto', 'Grand_Theft_Auto',
  'Grand Theft Auto’s ending leaked', 'Grand Theft Auto San Andreas',
  'Grand Theft Auto V', 'Ｇｒａｎｄ Ｔｈｅｆｔ Ａｕｔｏ',
];
const allowed = [
  '', null, undefined, 'GTA', 'GTA V', 'GTA IV', 'GTA Online',
  'GTA 60', 'GTA 64', 'GTA 600',
  'GTA VII', 'GTA VIII', 'GTA video', 'GTA vice city', 'GTA V is fun',
  'GTA V: I won', 'GTA 5 episode 6', 'GTA has 6 cars', 'GTAVIew',
  'myGTA6name', 'AGTA 6', 'GTA6abc', 'GTA6é', 'GTA６０',
  'Rockstar Games', 'Lucia', 'Jason', 'Vice City', 'GTA 2026',
  'Grand Theft Automobile', 'myGrandTheftAuto', 'GrandTheftAutonomy',
];
for (const value of blocked) test('blocks ' + JSON.stringify(value), () => assert.equal(matches(value), true));
for (const value of allowed) test('allows ' + JSON.stringify(value), () => assert.equal(matches(value), false));
test('has no stateful regex lastIndex', () => {
  for (let i = 0; i < 10; i++) assert.equal(matches('GTA VI'), true);
});
