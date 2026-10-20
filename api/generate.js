'use strict';
const { localGenerate, validateSections } = require('../lib/engine');

const SYSTEM = `You are an elite prompt architect. Transform a short user idea into a high-quality MASTER PROMPT with EXACTLY six structural components matching the reference: ROLE, TASK, CONTEXT, REASONING, STOP CONDITIONS, OUTPUT.
Return ONLY a valid JSON object with fields sections:{role,task,context,reasoning,stop,output} and analysis:{intent, improvements, missing, score}.
IMPORTANT:
1. Build a reusable instruction for ANOTHER AI, not the answer to the user's underlying task.
2. ROLE: concrete expert persona and priorities.
3. TASK: explicit outcome, objective, deliverables, and boundaries using only what the user actually supplied.
4. CONTEXT: clearly separate facts provided by the user from unknowns and any conditional assumptions. NEVER fabricate specific facts, audiences, budgets, deadlines, or resources.
5. REASONING: define the approach and decision criteria, use short observable justifications, identify risk/dependencies, and tell downstream AI to reason carefully but NOT reveal hidden internal chain of thought.
6. STOP CONDITIONS: unambiguous checkable completion criteria including coverage, actionable quality, no invented claims, and an end gate if appropriate. Aim for 3-6 concrete conditions.
7. OUTPUT: prescribe a useful deliverable format, sections, level of detail, and style. Concrete to the domain; do not force an irrelevant table or timeline.
8. Missing critical details: ask at most 3 focused questions only where blocking; otherwise proceed with explicit conditional assumptions.
9. Ensure the result is far more useful and context-specific than a generic template. Keep all 6 fields substantial, self-contained, clear, nonredundant, and immediately copy-pastable.
10. Use requested language in all fields. Respect depth preference.
11. Do not include JSON markdown fences. JSON score integer between 0 and 100; improvements and missing must be arrays of short strings; intent is a concise string. Never claim to have verified real-world claims without tools.`;

async function openAITransform(brief, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.5,
        response_format: {type:'json_object'},
        messages: [
          {role:'system',content:SYSTEM},
          {role:'user',content:JSON.stringify({idea:brief,language:options.language === 'en' ? 'English' : 'Bahasa Indonesia', depth:options.detail === 'deep' ? 'Deep and comprehensive' : 'Clear, concise and actionable'})}
        ], max_tokens: 2000
      })
    });
    if (!resp.ok) {
      const fail = await resp.json().catch(()=>({}));
      throw new Error(resp.status === 401 ? 'API key tidak valid. Periksa OPENAI_API_KEY.' : resp.status === 429 ? 'Batas penggunaan API tercapai. Coba beberapa saat lagi.' : (fail.error?.message || `API AI gagal (${resp.status}).`));
    }
    const data = await resp.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const sections = validateSections(result.sections);
    const analysis = result.analysis || {};
    return {
      mode:'ai', sections,
      analysis: {
        intent: String(analysis.intent || 'Tujuan berhasil diidentifikasi').slice(0, 250),
        improvements: Array.isArray(analysis.improvements) ? analysis.improvements.slice(0, 5).map(v=>String(v).slice(0,200)) : [],
        missing: Array.isArray(analysis.missing) ? analysis.missing.slice(0, 4).map(v=>String(v).slice(0,200)) : [],
        score: Number.isFinite(analysis.score) ? Math.max(0,Math.min(100,Math.round(analysis.score))) : 90
      }
    };
  } finally { clearTimeout(timer); }
}

async function handleRequest(body = {}) {
  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  if (brief.length < 8) return {status:400, result:{error:'Masukkan ide minimal 8 karakter.'}};
  if (brief.length > 3000) return {status:400, result:{error:'Maksimal 3.000 karakter untuk satu ide.'}};
  const options = {language:body.language === 'en' ? 'en' : 'id', detail:body.detail === 'deep' ? 'deep' : 'balanced'};
  if (!process.env.OPENAI_API_KEY) return {status:200,result:localGenerate(brief,options)};
  try { return {status:200,result:await openAITransform(brief,options)}; }
  catch(error) { return {status:502,result:{error:error.name==='AbortError'?'AI terlalu lama merespons. Silakan coba lagi.':error.message || 'Terjadi kesalahan pada layanan AI.'}}; }
}

async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method !== 'POST') {res.setHeader('Allow','POST');return res.status(405).json({error:'Metode tidak diizinkan.'});}
  try {
    const result = await handleRequest(req.body);
    return res.status(result.status).json(result.result);
  } catch(e) {return res.status(500).json({error:'Gagal memproses permintaan.'});}
}

module.exports = handler;
module.exports.handleRequest = handleRequest;
