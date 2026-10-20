const test = require('node:test');
const assert = require('node:assert/strict');
const {localGenerate, masterPrompt, detectDomain, validateSections, KEYS} = require('../lib/engine');
const {handleRequest} = require('../api/generate');
test('generates the exact six sections',()=>{
  const result=localGenerate('Buat aplikasi pengelola tugas untuk mahasiswa');
  assert.equal(result.mode,'local');
  assert.deepEqual(Object.keys(result.sections),KEYS);
  const prompt=masterPrompt(result.sections);
  assert.ok(prompt.includes('# STOP CONDITIONS'));
  assert.ok(prompt.includes('# REASONING'));
});
test('preserves given facts and does not assign fake budget',()=>{
  const result=localGenerate('Buat strategi marketing untuk UMKM 30 hari');
  assert.match(result.sections.context,/30 hari/);
  assert.match(result.sections.context,/belum tersedia/);
  assert.ok(detectDomain('Buat strategi marketing').id.includes('marketing'));
});
test('English and deep options apply',()=>{
  const result=localGenerate('Write Instagram posts for a new product',{language:'en',detail:'deep'});
  assert.match(result.sections.output,/Write in English/);
  assert.match(result.sections.output,/trade-offs/);
});
test('rejects too short input and malformed AI results',()=>{
  assert.throws(()=>localGenerate('ok'));
  assert.throws(()=>validateSections({role:'short'}));
});
test('endpoint returns local result without API key',async()=>{
  const original=process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result=await handleRequest({brief:'Tolong buatkan rencana belajar bahasa Inggris'});
    assert.equal(result.status,200);
    assert.equal(result.result.mode,'local');
    assert.deepEqual(Object.keys(result.result.sections),KEYS);
  } finally {if(original)process.env.OPENAI_API_KEY=original;}
});
