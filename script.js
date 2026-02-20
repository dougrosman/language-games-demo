// Snow canvas + generated ambient audio (pads, wind, chimes, reverb)
(() => {
  /* ====== Snow Canvas ====== */
  const canvas = document.getElementById('snow-canvas');
  const ctx = canvas.getContext('2d');
  let w=0,h=0, flakes=[];
  function resize(){
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    initFlakes();
  }
  window.addEventListener('resize', resize);

  function random(min,max){return Math.random()*(max-min)+min}

  function createFlake(){
    return {
      x: random(0,w),
      y: random(-h,0),
      r: random(1,4),
      d: random(0.5,1.5),
      a: random(0,Math.PI*2),
      sway: random(0.5,1.5),
      opacity: random(0.4,0.98)
    }
  }

  function initFlakes(){
    const count = Math.round(w/12);
    flakes = new Array(count).fill(0).map(()=>createFlake());
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for(let f of flakes){
      ctx.beginPath();
      ctx.globalAlpha = f.opacity;
      ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
      ctx.fill();
      ctx.closePath();
    }
    ctx.globalAlpha = 1;
  }

  function update(dt){
    for(let f of flakes){
      f.y += f.d + f.r * 0.3;
      f.x += Math.sin(f.a) * f.sway;
      f.a += 0.01 * f.d;
      if(f.y > h + 10){
        f.x = random(0,w);
        f.y = random(-20, -5);
        f.r = random(1,4);
        f.d = random(0.5,1.5);
        f.opacity = random(0.4,0.98);
      }
      if(f.x > w + 10) f.x = -10;
      if(f.x < -10) f.x = w + 10;
    }
  }

  let last = performance.now();
  function loop(now){
    const dt = (now - last) / 16.6667; // approx frames
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);

  /* ====== Ambient audio (WebAudio) ====== */
  const btn = document.getElementById('toggleAudio');
  const vol = document.getElementById('volume');

  let audioCtx = null;
  let masterGain = null;
  let ambient = null; // holds nodes for cleanup

  function ensureAudioContext(){
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = Number(vol.value);
      masterGain.connect(audioCtx.destination);
    }
  }

  function makeReverb(seconds = 4){
    const rate = audioCtx.sampleRate;
    const length = rate * seconds;
    const ir = audioCtx.createBuffer(2, length, rate);
    for(let ch=0; ch<2; ch++){
      const data = ir.getChannelData(ch);
      for(let i=0;i<length;i++){
        // decaying noise
        data[i] = (Math.random()*2-1) * Math.pow(1 - i/length, 3);
      }
    }
    const conv = audioCtx.createConvolver();
    conv.buffer = ir;
    return conv;
  }

  function makeNoiseBuffer(seconds = 4){
    const rate = audioCtx.sampleRate;
    const buf = audioCtx.createBuffer(1, rate * seconds, rate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = Math.random()*2 - 1;
    return buf;
  }

  function startAmbient(){
    ensureAudioContext();
    const now = audioCtx.currentTime;

    // create reverb
    const reverb = makeReverb(6);
    const reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.8;
    reverb.connect(reverbGain);
    reverbGain.connect(masterGain);

    // WIND: looped noise through lowpass and slow movement
    const windBuf = makeNoiseBuffer(6);
    const windSrc = audioCtx.createBufferSource();
    windSrc.buffer = windBuf; windSrc.loop = true;
    const windLP = audioCtx.createBiquadFilter(); windLP.type = 'lowpass'; windLP.frequency.value = 900;
    const windGain = audioCtx.createGain(); windGain.gain.value = 0.06;
    // subtle slow filter modulation
    const windLfo = audioCtx.createOscillator(); windLfo.frequency.value = 0.02;
    const windLfoGain = audioCtx.createGain(); windLfoGain.gain.value = 600;
    windLfo.connect(windLfoGain); windLfoGain.connect(windLP.frequency);
    windSrc.connect(windLP); windLP.connect(windGain); windGain.connect(masterGain);
    windSrc.connect(reverb);
    windSrc.start(now);
    windLfo.start(now);

    // PADS: layered detuned oscillators
    const padGroup = [];
    const padBase = [55, 82.4, 110];
    for(let i=0;i<padBase.length;i++){
      const o = audioCtx.createOscillator(); o.type = 'sine';
      o.frequency.value = padBase[i] * (1 + (Math.random()-0.5)*0.01);
      o.detune.value = (Math.random()-0.5)*25;
      const g = audioCtx.createGain(); g.gain.value = 0.0;
      const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1000 - Math.random()*300;
      o.connect(g); g.connect(lp); lp.connect(masterGain);
      lp.connect(reverb);
      // slow attack
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.12/(i+1), now + 3 + Math.random()*3);
      o.start(now);
      // subtle LFO to detune
      const lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.03 + Math.random()*0.06;
      const lfoGain = audioCtx.createGain(); lfoGain.gain.value = 6 + Math.random()*8;
      lfo.connect(lfoGain); lfoGain.connect(o.detune); lfo.start(now);
      padGroup.push({o,g,lfo,lfoGain,lp});
    }

    // CHIMES: occasional bell sounds
    const bells = [];
    let bellTimer = setInterval(()=>{
      if(!audioCtx) return;
      const t = audioCtx.currentTime;
      const bell = audioCtx.createOscillator(); bell.type = 'sine';
      const freq = 880 * (0.5 + Math.random()*1.5);
      bell.frequency.value = freq;
      const bellGain = audioCtx.createGain(); bellGain.gain.value = 0.0;
      const bellHP = audioCtx.createBiquadFilter(); bellHP.type = 'highpass'; bellHP.frequency.value = 400;
      bell.connect(bellGain); bellGain.connect(bellHP); bellHP.connect(masterGain); bellHP.connect(reverb);
      // envelope
      bellGain.gain.cancelScheduledValues(t);
      bellGain.gain.setValueAtTime(0.0, t);
      bellGain.gain.linearRampToValueAtTime(0.18 + Math.random()*0.12, t + 0.01);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 3 + Math.random()*3);
      bell.start(t); bell.stop(t + 4 + Math.random()*3);
      bells.push(bell);
      // cleanup after stop
      setTimeout(()=>{
        try{ bell.disconnect(); bellGain.disconnect(); bellHP.disconnect(); }catch(e){}
      }, 8000);
    }, 12000 + Math.random()*12000);

    ambient = {reverb,reverbGain,windSrc,windLP,windGain,windLfo,windLfoGain,padGroup,bells,bellTimer};
    btn.textContent = 'Stop Ambient';
  }

  function stopAmbient(){
    if(!audioCtx || !ambient) return;
    try{
      ambient.windSrc.stop();
    }catch(e){}
    try{ ambient.windLfo.stop(); }catch(e){}
    for(const p of ambient.padGroup){
      try{ p.o.stop(); }catch(e){}
      try{ p.lfo.stop(); }catch(e){}
    }
    clearInterval(ambient.bellTimer);
    // disconnect everything
    for(const k in ambient){
      try{ if(ambient[k] && ambient[k].disconnect) ambient[k].disconnect(); }catch(e){}
    }
    ambient = null;
    btn.textContent = 'Start Ambient';
  }

  vol.addEventListener('input', ()=>{
    if(masterGain) masterGain.gain.value = Number(vol.value);
  });

  btn.addEventListener('click', async ()=>{
    ensureAudioContext();
    if(audioCtx.state === 'suspended') await audioCtx.resume();
    if(ambient) stopAmbient(); else startAmbient();
  });

  // stop audio on page unload
  window.addEventListener('pagehide', ()=>{
    stopAmbient();
    if(audioCtx) try{ audioCtx.close() }catch(e){}
    audioCtx = null;
  });
})();
  const facts = [
    'Cats sleep 12–16 hours a day on average.',
    'A group of kittens is called a kindle.',
    'Cats have five toes on their front paws, but only four on the back ones.',
    'Adult cats can run up to 30 mph (48 km/h).',
    'Cats purr for many reasons: contentment, healing, or communication.',
    'Whiskers help cats sense nearby objects and changes in air currents.',
    'Most cats prefer vertical space — shelves and perches make them happy.'
  ];

  function showRandomFact(){
    const el = document.getElementById('fact');
    if(!el) return;
    const idx = Math.floor(Math.random()*facts.length);
    el.textContent = facts[idx];
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('factBtn');
    if(btn) btn.addEventListener('click', showRandomFact);
  });
