(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const FIELDS = [
    {key:'role',title:'ROLE',desc:'Siapa AI harus berperan?',color:'#637af0',tint:'#f0f2ff'},
    {key:'task',title:'TASK',desc:'Apa yang harus dicapai?',color:'#e49a46',tint:'#fff5e9'},
    {key:'context',title:'CONTEXT',desc:'Fakta, batasan, dan asumsi',color:'#2bac9a',tint:'#eaf9f5'},
    {key:'reasoning',title:'REASONING',desc:'Pendekatan dan pertimbangan',color:'#d7805d',tint:'#fff0e9'},
    {key:'stop',title:'STOP CONDITIONS',desc:'Kapan pekerjaan dianggap tuntas?',color:'#e36f95',tint:'#fff0f5'},
    {key:'output',title:'OUTPUT',desc:'Bagaimana hasil harus disajikan?',color:'#9878d8',tint:'#f4efff'}
  ];
  const KEY='promptforge_history_v1';
  const current = {sections:null,analysis:null,mode:null,id:null,tab:'structure',rawDirty:false,busy:false};
  let toastTimer;
  const icon = name => `<svg><use href="#ic-${name}"/></svg>`;
  const safe = value => String(value ?? '').trim();
  const getHistory = () => {try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
  const saveHistory = items => {try{localStorage.setItem(KEY,JSON.stringify(items.slice(0,12)))}catch{notify('Penyimpanan lokal tidak tersedia.','error')}};

  function notify(message,type='') {
    const toast=$('toast');
    toast.textContent=message;toast.className=`toast show ${type}`;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.className='toast'},3500);
  }
  function setBusy(busy){
    current.busy=busy;
    $('generateBtn').disabled=busy;$('regenerateBtn').disabled=busy;
    $('generateBtn').querySelector('span').textContent=busy?'Sedang merancang...':'Bangun Master Prompt';
    $('emptyState').hidden=busy || Boolean(current.sections);
    $('loadingState').hidden=!busy;
    $('resultState').hidden=busy || !current.sections;
  }
  function masterText(){return FIELDS.map(f=>`# ${f.title}\n${safe(current.sections?.[f.key])}`).join('\n\n');}
  function rawText(){return current.rawDirty && current.tab==='raw' ? $('rawOutput').value : masterText();}
  function storeCurrent(){
    if(!current.sections||!current.id)return;
    const entry={id:current.id,brief:$('briefInput').value.trim(),sections:{...current.sections},analysis:current.analysis,mode:current.mode,language:$('languageSelect').value,detail:$('detailSelect').value,created:Date.now()};
    const all=getHistory().filter(x=>x.id!==current.id);
    saveHistory([entry,...all]);renderHistory();
  }
  function renderHistory(){
    const list=$('historyList'),history=getHistory();
    $('historyCount').textContent=String(history.length);
    list.replaceChildren();
    if(!history.length){const p=document.createElement('div');p.className='history-empty';p.textContent='Belum ada prompt tersimpan.';list.append(p);return;}
    for(const item of history){
      const btn=document.createElement('button');btn.className='history-item'+(item.id===current.id?' active':'');btn.title=item.brief;
      const symbol=document.createElement('span');symbol.innerHTML=icon('clock');
      const label=document.createElement('span');label.textContent=item.brief || 'Master prompt';
      btn.append(symbol,label);btn.addEventListener('click',()=>restore(item));list.append(btn);
    }
  }
  function newPrompt(){
    current.sections=null;current.analysis=null;current.mode=null;current.id=null;current.tab='structure';current.rawDirty=false;
    $('briefInput').value='';$('charCount').textContent='0 / 3000';$('modeBadge').textContent='SIAP DIGUNAKAN';$('modeBadge').className='mode-pill';
    $('emptyState').hidden=false;$('loadingState').hidden=true;$('resultState').hidden=true;
    renderHistory();$('briefInput').focus();closeMenu();
  }
  function restore(item){
    current.sections={...item.sections};current.analysis=item.analysis||{};current.mode=item.mode||'local';current.id=item.id;current.rawDirty=false;
    $('briefInput').value=item.brief || '';$('charCount').textContent=`${$('briefInput').value.length} / 3000`;
    $('languageSelect').value=item.language || 'id';$('detailSelect').value=item.detail || 'balanced';
    presentResult();closeMenu();notify('Prompt dari riwayat berhasil dibuka.');
    if(window.innerWidth<730)$('resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function createLocal(brief,options){
    const words=brief.toLowerCase();
    let focus='tugas umum',expert='konsultan senior dan pemecah masalah',gaps=['audiens utama','cakupan dan batasan','indikator keberhasilan'];
    if(/aplikasi|website|app|software|dashboard|saas|coding|sistem/.test(words)){focus='produk dan teknologi';expert='arsitek produk digital dan ahli UX senior';gaps=['target pengguna','fitur utama','platform yang dituju'];}
    else if(/marketing|bisnis|pemasaran|jualan|strategi|pelanggan|usaha/.test(words)){focus='bisnis dan pemasaran';expert='strategi pemasaran dan pengembangan bisnis senior';gaps=['audiens','kanal promosi','anggaran'];}
    else if(/konten|artikel|instagram|tiktok|youtube|naskah|blog|caption/.test(words)){focus='pembuatan konten';expert='strategi konten dan copywriter senior';gaps=['audiens','kanal publikasi','gaya bahasa'];}
    else if(/belajar|materi|kursus|ujian|kelas/.test(words)){focus='pembelajaran';expert='desainer kurikulum dan pengajar senior';gaps=['level awal','durasi belajar','hasil pembelajaran'];}
    const en=options.language==='en',deep=options.detail==='deep';
    const sections=en?{
      role:`Act as a senior expert in ${focus}. Prioritize clear, pragmatic, and verifiable results.`,
      task:`Deliver a complete solution for this user request: "${brief}". Identify the central objective, necessary deliverables, and success criteria.`,
      context:`Facts supplied by the user: "${brief}". Not yet specified: ${gaps.join(', ')}. Do not invent missing specifics; explicitly label necessary assumptions.`,
      reasoning:'Identify the end goal, break the work into practical stages, prioritize the biggest impact, examine trade-offs and dependencies, and state brief observable rationales without revealing private internal reasoning. Ask at most three questions only when essential.',
      stop:'- Fulfill the main request with relevant deliverables.\n- Make every recommended action concrete.\n- Distinguish facts from assumptions.\n- Include practical quality checks.\n- End with a final completion checklist.',
      output:`Respond in English using clear headings, actionable steps, helpful examples, and a concise summary. ${deep?'Include priorities, metrics, risks, dependencies, and a detailed implementation roadmap where relevant.':'Keep it concise and direct.'}`
    }:{
      role:`Bertindak sebagai ${expert}. Prioritaskan rekomendasi praktis, presisi, dan hasil yang dapat dievaluasi.`,
      task:`Kerjakan tujuan utama dari permintaan pengguna ini: "${brief}". Definisikan deliverable utama dan indikator keberhasilan yang sesuai.`,
      context:`Fakta yang diberikan pengguna: "${brief}". Belum diketahui: ${gaps.join(', ')}. Jangan mengarang fakta; tandai asumsi yang benar-benar dibutuhkan secara eksplisit.`,
      reasoning:'Identifikasi tujuan akhir, bagi pekerjaan menjadi langkah logis, prioritaskan dampak terbesar, periksa risiko serta ketergantungan, dan jelaskan alasan utama rekomendasi secara ringkas tanpa membuka penalaran internal tersembunyi. Ajukan maksimal tiga pertanyaan hanya bila informasi kritis kurang.',
      stop:'- Tujuan utama dan deliverable tercapai.\n- Setiap langkah dapat ditindaklanjuti.\n- Asumsi dipisahkan dari fakta.\n- Ada kriteria dan checklist kualitas.\n- Tutup dengan evaluasi akhir yang jelas.',
      output:`Jawab dalam bahasa Indonesia dengan subjudul jelas, langkah yang bisa dieksekusi, contoh relevan, dan rangkuman. ${deep?'Sertakan prioritas, metrik, risiko, dependensi, dan rencana implementasi terperinci jika relevan.':'Ringkas, spesifik, dan tanpa pengulangan.'}`
    };
    return {mode:'local',sections,analysis:{intent:en?`Detected focus: ${focus}`:`Fokus terdeteksi: ${focus}`,improvements:en?['Clear role','Practical outputs','Completion criteria']:['Peran lebih spesifik','Output lebih operasional','Kriteria selesai yang jelas'],missing:gaps,score:78}};
  }
  async function generate(){
    if(current.busy)return;
    const brief=$('briefInput').value.trim();
    if(brief.length<8){notify('Tulis idemu terlebih dahulu (minimal 8 karakter).','error');$('briefInput').focus();return;}
    const options={language:$('languageSelect').value,detail:$('detailSelect').value};
    setBusy(true);const started=Date.now();
    try{
      let data;
      try{
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),35000);
        let response;
        try{response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief,...options}),signal:controller.signal});}
        finally{clearTimeout(timer);}
        data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||`Terjadi kesalahan HTTP ${response.status}`);
      }catch(error){
        if(error instanceof TypeError){data=createLocal(brief,options);notify('Tidak dapat terhubung ke server. Menggunakan generator lokal.');}
        else{throw error;}
      }
      if(!data?.sections || !FIELDS.every(f=>typeof data.sections[f.key]==='string' && data.sections[f.key].length>2))throw new Error('Hasil belum lengkap. Silakan ulangi.');
      const remaining=Math.max(0,650-(Date.now()-started));if(remaining)await new Promise(r=>setTimeout(r,remaining));
      current.sections=Object.fromEntries(FIELDS.map(f=>[f.key,data.sections[f.key]]));
      current.analysis=data.analysis||{};current.mode=data.mode||'local';current.id=`pf-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      current.rawDirty=false;presentResult();storeCurrent();
      if(window.innerWidth<730)$('resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){notify(error.name==='AbortError'?'Permintaan terlalu lama. Silakan coba kembali.':error.message,'error');}
    finally{setBusy(false);}
  }
  function presentResult(){
    $('emptyState').hidden=true;$('loadingState').hidden=true;$('resultState').hidden=false;
    $('modeBadge').className='mode-pill '+(current.mode==='ai'?'ai':'local');
    $('modeBadge').textContent=current.mode==='ai'?'✦ AI AKTIF':'◈ MODE LOKAL';
    $('intentText').textContent=current.analysis?.intent||'Tujuan berhasil diidentifikasi';
    $('qualityScore').textContent='6/6 BAGIAN';
    const improvements=$('improvements');improvements.replaceChildren();
    for(const item of (current.analysis?.improvements||[]).slice(0,4)){
      const span=document.createElement('span');span.innerHTML=icon('check');span.append(document.createTextNode(item));improvements.append(span);
    }
    $('modeNote').hidden=current.mode==='ai';
    $('modeNote').textContent='Mode lokal: struktur prompt dibuat dengan aturan cerdas. Hubungkan OPENAI_API_KEY di server untuk analisis AI yang lebih kontekstual.';
    renderSections();selectTab('structure');renderHistory();
  }
  function renderSections(){
    const view=$('sectionView');view.replaceChildren();
    FIELDS.forEach((field,i)=>{
      const card=document.createElement('article');card.className='section-card';card.style.setProperty('--section-color',field.color);card.style.setProperty('--section-tint',field.tint);
      const head=document.createElement('div');head.className='section-card-header';
      const bullet=document.createElement('span');bullet.className='section-bullet';bullet.textContent=String(i+1).padStart(2,'0');
      const title=document.createElement('h3');title.textContent=field.title;
      const btn=document.createElement('button');btn.type='button';btn.className='section-edit';btn.innerHTML=`${icon('pencil')} Edit`;btn.setAttribute('aria-label',`Edit ${field.title}`);
      head.append(bullet,title,btn);card.append(head);
      const text=document.createElement('p');text.textContent=current.sections[field.key];card.append(text);
      const editor=document.createElement('textarea');editor.value=current.sections[field.key];editor.hidden=true;editor.setAttribute('aria-label',`Isi ${field.title}`);card.append(editor);
      btn.addEventListener('click',()=>{
        const editing=!editor.hidden;
        if(editing){
          const value=editor.value.trim();if(!value){notify('Bagian prompt tidak boleh kosong.','error');return;}
          current.sections[field.key]=value;text.textContent=value;editor.hidden=true;text.hidden=false;card.classList.remove('editing');btn.innerHTML=`${icon('pencil')} Edit`;storeCurrent();
        }else{
          text.hidden=true;editor.hidden=false;card.classList.add('editing');btn.innerHTML=`${icon('check')} Simpan`;editor.focus();
        }
      });
      editor.addEventListener('keydown',e=>{if(e.key==='Escape'){editor.value=current.sections[field.key];btn.click();}});
      editor.addEventListener('blur',()=>{if(!editor.hidden && editor.value.trim()){current.sections[field.key]=editor.value.trim();text.textContent=current.sections[field.key];storeCurrent();}});
      view.append(card);
    });
  }
  function parseRaw(raw){
    const result={};
    for(let i=0;i<FIELDS.length;i++){
      const label=FIELDS[i].title;
      const start=`# ${label}\n`;
      const begin=raw.indexOf(start);
      if(begin<0)return null;
      const from=begin+start.length;
      const next=i<FIELDS.length-1?raw.indexOf(`\n\n# ${FIELDS[i+1].title}\n`,from):-1;
      if(i<FIELDS.length-1 && next<0)return null;
      result[FIELDS[i].key]=raw.slice(from,next<0?undefined:next).trim();
      if(!result[FIELDS[i].key])return null;
    }
    return result;
  }
  function selectTab(tab){
    if(tab==='structure'&&current.tab==='raw'&&current.rawDirty){
      const parsed=parseRaw($('rawOutput').value);
      if(!parsed){notify('Format judul di Master Prompt berubah. Pulihkan # ROLE, # TASK, # CONTEXT, # REASONING, # STOP CONDITIONS, dan # OUTPUT sebelum kembali.','error');return;}
      current.sections=parsed;current.rawDirty=false;renderSections();storeCurrent();
    }
    current.tab=tab;
    $('structureTab').classList.toggle('active',tab==='structure');$('rawTab').classList.toggle('active',tab==='raw');
    $('structureTab').setAttribute('aria-selected',String(tab==='structure'));$('rawTab').setAttribute('aria-selected',String(tab==='raw'));
    $('sectionView').hidden=tab!=='structure';$('rawView').hidden=tab!=='raw';
    if(tab==='raw'){current.rawDirty=false;$('rawOutput').value=masterText();}
  }
  async function copyPrompt(){
    if(!current.sections){notify('Belum ada prompt untuk disalin.','error');return;}
    const text=rawText();
    try{await navigator.clipboard.writeText(text);notify('Master prompt berhasil disalin!');}
    catch{
      const temporary=document.createElement('textarea');temporary.value=text;temporary.style.position='fixed';temporary.style.opacity='0';document.body.append(temporary);temporary.select();
      const ok=document.execCommand('copy');temporary.remove();notify(ok?'Master prompt berhasil disalin!':'Gagal menyalin otomatis. Salin teks secara manual.',ok?'':'error');
    }
  }
  function downloadPrompt(){
    if(!current.sections){notify('Belum ada prompt untuk diunduh.','error');return;}
    const data=new Blob([rawText()+'\n'],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(data);const link=document.createElement('a');link.href=url;link.download='master-prompt-promptforge.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('File master prompt diunduh.');
  }
  function closeMenu(){$('sidebar').classList.remove('open');}
  $('briefInput').addEventListener('input',()=>{$('charCount').textContent=`${$('briefInput').value.length} / 3000`;});
  $('briefInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();generate();}});
  $('generateBtn').addEventListener('click',generate);$('regenerateBtn').addEventListener('click',generate);
  $('newPrompt').addEventListener('click',newPrompt);$('brandLink').addEventListener('click',e=>{e.preventDefault();newPrompt();});
  $('structureTab').addEventListener('click',()=>selectTab('structure'));$('rawTab').addEventListener('click',()=>selectTab('raw'));
  $('rawOutput').addEventListener('input',()=>{current.rawDirty=true;});
  $('copyBtn').addEventListener('click',copyPrompt);$('downloadBtn').addEventListener('click',downloadPrompt);
  document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{$('briefInput').value=button.dataset.example;$('charCount').textContent=`${$('briefInput').value.length} / 3000`;$('briefInput').focus();notify('Contoh dimasukkan. Kamu bisa mengubahnya sebelum membuat prompt.');}));
  $('historyNav').addEventListener('click',()=>{if(!getHistory().length){notify('Riwayat masih kosong. Buat satu prompt dulu.');return;}$('historyList').scrollIntoView({behavior:'smooth',block:'center'});if(window.innerWidth<730)$('sidebar').classList.add('open');});
  $('clearHistory').addEventListener('click',()=>{if(!getHistory().length)return;if(confirm('Hapus semua riwayat prompt yang tersimpan di browser ini?')){saveHistory([]);renderHistory();notify('Riwayat berhasil dihapus.');}});
  $('menuToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  renderHistory();
})();
