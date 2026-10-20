'use strict';

const KEYS = ['role', 'task', 'context', 'reasoning', 'stop', 'output'];
const DOMAIN = [
  { id: 'produk & teknologi', rx: /\b(app|aplikasi|website|web app|software|saas|fitur|coding|kode|developer|dashboard|api|mobile|startup|produk digital)\b/i, role: 'arsitek produk digital dan konsultan UX/teknologi senior', gaps: ['pengguna utama', 'fitur prioritas', 'platform atau teknologi', 'batasan waktu/anggaran'], format: 'Ringkasan solusi, kebutuhan pengguna, fitur prioritas, alur utama, langkah implementasi, kriteria penerimaan.' },
  { id: 'marketing & bisnis', rx: /\b(marketing|pemasaran|jualan|penjualan|brand|bisnis|iklan|campaign|peluncuran|launch|go.to.market|gtm|customer|pelanggan|usaha|umkm|strategi|growth)\b/i, role: 'strategi bisnis dan growth marketing senior yang berorientasi pada hasil terukur', gaps: ['target audiens', 'penawaran/produk', 'kanal distribusi', 'anggaran atau target waktu'], format: 'Tujuan, profil audiens, strategi, rencana aksi berprioritas, metrik keberhasilan, risiko dan mitigasi.' },
  { id: 'konten & penulisan', rx: /\b(konten|content|artikel|blog|caption|copywriting|post|thread|script|naskah|cerita|email|linkedin|instagram|tiktok|youtube|newsletter)\b/i, role: 'editor konten dan copywriter senior yang kuat dalam riset audiens', gaps: ['platform/kanal', 'audiens', 'gaya bahasa', 'panjang/format konten'], format: 'Konsep utama, hook/pembuka, isi terstruktur, CTA/penutup, alternatif versi, checklist kualitas.' },
  { id: 'pendidikan & pembelajaran', rx: /\b(belajar|mengajar|materi|kursus|silabus|pelajaran|siswa|mahasiswa|ujian|kelas|latihan|study|guru|pendidikan)\b/i, role: 'perancang pembelajaran dan pengajar ahli yang menyederhanakan materi kompleks', gaps: ['tingkat kemampuan', 'topik cakupan', 'durasi belajar', 'tujuan pembelajaran'], format: 'Tujuan belajar, prasyarat, penjelasan bertahap, contoh, latihan, evaluasi pemahaman.' },
  { id: 'riset & analisis', rx: /\b(analisis|analisa|riset|research|data|laporan|investigasi|bandingkan|perbandingan|evaluasi|insight|review)\b/i, role: 'analis riset senior yang skeptis terhadap asumsi dan berorientasi bukti', gaps: ['pertanyaan utama', 'cakupan data', 'periode analisis', 'kriteria evaluasi'], format: 'Ringkasan eksekutif, metode/asumsi, temuan utama, perbandingan, keterbatasan, rekomendasi.' },
  { id: 'desain & kreatif', rx: /\b(desain|design|logo|branding|visual|poster|ui|ux|mockup|warna|identitas|ilustrasi)\b/i, role: 'direktur kreatif dan desainer produk senior yang mengutamakan kejelasan', gaps: ['target pengguna', 'preferensi visual', 'media/ukuran output', 'pedoman merek'], format: 'Arah kreatif, prinsip visual, konsep desain, elemen utama, variasi, checklist kelayakan.' }
];

const ENGLISH = {
  'produk & teknologi': {role:'senior digital product architect and UX/technology advisor',gaps:['primary users','priority features','platform or technology','time/budget constraints'],format:'solution summary, user requirements, prioritized features, main user flow, implementation steps, acceptance criteria'},
  'marketing & bisnis': {role:'senior business strategist and results-focused growth marketer',gaps:['target audience','product or offer','distribution channels','budget or timeline'],format:'objectives, audience profile, strategy, prioritized action plan, success metrics, risks and mitigations'},
  'konten & penulisan': {role:'senior content editor and copywriter with audience research expertise',gaps:['publishing platform','audience','tone of voice','content length and format'],format:'core idea, hook, structured body, call-to-action, optional variations, quality checklist'},
  'pendidikan & pembelajaran': {role:'learning designer and subject-matter educator',gaps:['current ability level','topic scope','study duration','learning objectives'],format:'learning objectives, prerequisites, step-by-step explanations, examples, exercises, comprehension checks'},
  'riset & analisis': {role:'evidence-focused senior research analyst',gaps:['research question','available data','analysis period','evaluation criteria'],format:'executive summary, methods and assumptions, main findings, comparison, limitations, recommendations'},
  'desain & kreatif': {role:'senior creative director and product designer',gaps:['target users','visual preferences','output medium or dimensions','brand guidelines'],format:'creative direction, visual principles, design concept, key elements, variants, feasibility checklist'},
  'tugas umum': {role:'senior consultant and pragmatic problem solver',gaps:['desired outcome','intended audience','constraints','definition of success'],format:'outcome summary, key steps, concrete examples, risks and assumptions, final checklist'}
};

const clean = value => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
const clamp = (value, max) => clean(value).slice(0, max);
const bullet = arr => arr.map(x => `- ${x}`).join('\n');

function detectDomain(brief) {
  const input = brief.toLowerCase();
  return DOMAIN.find(d => d.rx.test(input)) || {
    id: 'tugas umum', role: 'konsultan senior dan pemecah masalah yang fokus pada ketepatan hasil',
    gaps: ['tujuan akhir', 'target pembaca/pengguna', 'batasan', 'definisi hasil yang sukses'],
    format: 'Ringkasan hasil, langkah utama, contoh konkret, risiko/asumsi, checklist final.'
  };
}

function localGenerate(rawBrief, options = {}) {
  const brief = clamp(rawBrief, 3000);
  if (brief.length < 8) throw new Error('Tuliskan ide minimal 8 karakter.');
  const language = options.language === 'en' ? 'en' : 'id';
  const detail = options.detail === 'deep' ? 'deep' : 'balanced';
  const domain = detectDomain(brief);
  const matches = brief.match(/(?:\b\d+[\d.,]*\s*(?:hari|minggu|bulan|tahun|day|week|month|jam|rupiah|rb|jt|%|orang|kata|halaman)\b)/gi) || [];
  const constraints = matches.length ? `\nBatasan eksplisit yang terdeteksi: ${[...new Set(matches)].join(', ')}.` : '';
  const english = ENGLISH[domain.id] || ENGLISH['tugas umum'];
  const constraintsEn = matches.length ? `\nExplicit constraints identified: ${[...new Set(matches)].join(', ')}.` : '';
  let sections;
  if (language === 'en') {
    sections = {
      role: `Act as a ${english.role}. Prioritize clarity, practicality, and verifiable results. Adapt your expertise to the user's specific objective.`,
      task: `Turn the following request into a complete, directly usable solution:\n"${brief}"\nDefine the main objective, the essential deliverables, and what success looks like.`,
      context: `Known user input: "${brief}".${constraintsEn}\nImportant information not yet supplied: ${english.gaps.join(', ')}. Treat missing details as unknown, not as confirmed facts. State necessary assumptions explicitly.`,
      reasoning: `First identify the end goal and the intended audience. Break down the work into manageable stages, prioritize the highest-impact decisions, check dependencies and risks, and explain key recommendations with concise rationales (do not reveal private chain-of-thought). Ask up to 3 focused clarifying questions only if critical information is missing; otherwise proceed with labeled assumptions.`,
      stop: bullet(['The answer directly fulfills the main request and covers all essential deliverables.', 'Each action or recommendation is specific and feasible.', 'Unknown facts are not fabricated; assumptions are marked.', 'Success criteria and quality checks are included.', 'The output ends with a concise final review/checklist.']),
      output: `Write in English using clear headings and actionable language. Recommended structure: ${english.format}. ${detail === 'deep' ? 'Include examples, prioritization, ownership, metrics, dependencies and trade-offs where relevant.' : 'Be concise, avoid filler, and use tables only when they improve comprehension.'} End with the next recommended action.`
    };
  } else {
    sections = {
      role: `Bertindak sebagai ${domain.role}. Prioritaskan kejelasan, implementasi yang realistis, dan hasil yang dapat dievaluasi. Sesuaikan keahlian dengan tujuan pengguna.`,
      task: `Ubah permintaan berikut menjadi hasil yang lengkap dan langsung dapat digunakan:\n"${brief}"\nTentukan tujuan utama, deliverable terpenting, dan indikator keberhasilannya.`,
      context: `Informasi yang benar-benar diberikan pengguna: "${brief}".${constraints}\nInformasi yang belum tersedia: ${domain.gaps.join(', ')}. Jangan menganggap detail yang belum diberikan sebagai fakta. Beri label jelas pada asumsi yang diperlukan.`,
      reasoning: `Identifikasi tujuan akhir dan siapa yang akan menggunakan hasilnya. Pecah pekerjaan menjadi tahapan logis, prioritaskan dampak tertinggi, periksa dependensi dan risiko, lalu jelaskan alasan utama rekomendasi secara ringkas (tanpa memaparkan penalaran internal tersembunyi). Ajukan maksimal 3 pertanyaan klarifikasi jika informasi benar-benar krusial; jika tidak, lanjutkan dengan asumsi yang ditandai.`,
      stop: bullet(['Permintaan utama terjawab dan semua deliverable esensial tercakup.', 'Setiap langkah atau rekomendasi cukup spesifik untuk dijalankan.', 'Tidak ada fakta yang dikarang; asumsi diberi label.', 'Indikator keberhasilan dan cara memeriksa kualitas tersedia.', 'Akhiri dengan evaluasi singkat atau checklist final.']),
      output: `Gunakan bahasa Indonesia yang lugas dengan judul dan langkah yang dapat dieksekusi. Susunan yang disarankan: ${domain.format} ${detail === 'deep' ? 'Tambahkan contoh, prioritas, penanggung jawab, metrik, dependensi, serta trade-off jika relevan.' : 'Tetap ringkas, hindari basa-basi, dan gunakan tabel hanya bila memperjelas.'} Tutup dengan tindakan berikutnya yang paling disarankan.`
    };
  }
  return {
    mode: 'local',
    sections,
    analysis: {
      intent: language === 'en' ? `Detected focus: ${domain.id}` : `Fokus terdeteksi: ${domain.id}`,
      improvements: language === 'en' ? ['Clarified the expert role', 'Added execution standards', 'Added safeguards against invented facts'] : ['Memperjelas peran ahli', 'Menambahkan standar eksekusi', 'Menetapkan batasan agar tidak mengarang fakta'],
      missing: (language === 'en' ? english.gaps : domain.gaps).slice(0, 3),
      score: 82
    }
  };
}

function validateSections(value) {
  if (!value || typeof value !== 'object' || !KEYS.every(k => typeof value[k] === 'string' && value[k].trim().length >= 12)) {
    throw new Error('Respons AI tidak lengkap. Silakan coba kembali.');
  }
  return Object.fromEntries(KEYS.map(k => [k, value[k].trim().slice(0, 5500)]));
}

function masterPrompt(sections) {
  const labels = [ ['role','ROLE'], ['task','TASK'], ['context','CONTEXT'], ['reasoning','REASONING'], ['stop','STOP CONDITIONS'], ['output','OUTPUT'] ];
  return labels.map(([key,title]) => `# ${title}\n${String(sections[key] ?? '').trim()}`).join('\n\n');
}

module.exports = { localGenerate, validateSections, masterPrompt, detectDomain, KEYS };
