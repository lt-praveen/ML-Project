/* ClimateLens — standalone browser-side project demonstration.
   The bundled/demo records are synthetic. Uploaded CSV files are processed locally. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const COLORS = ['#55d9db','#a69bff','#71e6b0','#ffca82','#6ba8ff','#ff8f9b','#e5e879','#80c9ee'];
  const FEATURE_NAMES = ['Maximum Temperature','Minimum Temperature','Average Temperature','Humidity','Rainfall','Wind Speed','Pressure','Cloud Cover'];
  const FEATURE_ALIASES = {
    'Maximum Temperature':['maximumtemperature','maxtemperature','maxtemp','tmax','maximumtemp'],
    'Minimum Temperature':['minimumtemperature','mintemperature','mintemp','tmin','minimumtemp'],
    'Average Temperature':['averagetemperature','meantemperature','avgtemperature','avgtemp','temperature','temp'],
    'Humidity':['humidity','relativehumidity','relativehumiditypercent'],
    'Rainfall':['rainfall','precipitation','precip','rain'],
    'Wind Speed':['windspeed','windvelocity','windspeedkmh','wind'],
    'Pressure':['pressure','atmosphericpressure','surfacepressure','sealevelpressure'],
    'Cloud Cover':['cloudcover','cloudcoverage','clouds','cloudiness']
  };
  let state = { rows:[], columns:[], features:[], featureColumns:{}, source:'synthetic', split:null, prepared:null, kmeans:null, hierarchical:null };
  let toastTimer = null;

  function norm(s){ return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g,''); }
  function numeric(v){
    if(v === null || v === undefined || String(v).trim() === '') return NaN;
    if(typeof v === 'number') return Number.isFinite(v) ? v : NaN;
    const s = String(v).trim().replace(/,/g,'').replace(/%$/,'');
    const m = s.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/i);
    if(!m) return NaN;
    const n = Number(m[0]); return Number.isFinite(n) ? n : NaN;
  }
  function seeded(seed){ let s = seed >>> 0; return () => { s = (1664525*s + 1013904223) >>> 0; return s / 4294967296; }; }
  function shuffle(a, rnd){ const out=a.slice(); for(let i=out.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[out[i],out[j]]=[out[j],out[i]];} return out; }
  function mean(a){return a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;}
  function median(a){if(!a.length)return 0;const x=a.slice().sort((p,q)=>p-q),m=x.length>>1;return x.length%2?x[m]:(x[m-1]+x[m])/2;}
  function fmt(v,d=3){return Number.isFinite(v)?Number(v).toFixed(d):'—';}
  function fmtNum(v){return Number(v).toLocaleString('en-US');}
  function setText(id,v){const el=$(id);if(el)el.textContent=v;}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3600);}
  function setBusy(show,title='Running analysis…',desc='Preparing your data.',progress=12){$('busy-overlay').classList.toggle('show',show);setText('busy-title',title);setText('busy-desc',desc);$('busy-progress-bar').style.width=progress+'%';}
  function wait(ms){return new Promise(r=>setTimeout(r,ms));}

  function createDemoRows(){
    const rnd=seeded(20261012);
    const cities=[
      ['Mumbai','Maharashtra','coastal'],['Kochi','Kerala','coastal'],['Chennai','Tamil Nadu','coastal'],['Visakhapatnam','Andhra Pradesh','coastal'],
      ['Jaisalmer','Rajasthan','arid'],['Jodhpur','Rajasthan','arid'],['Ahmedabad','Gujarat','arid'],['Bikaner','Rajasthan','arid'],
      ['Shimla','Himachal Pradesh','hill'],['Srinagar','Jammu and Kashmir','hill'],['Gangtok','Sikkim','hill'],['Ooty','Tamil Nadu','hill'],
      ['Delhi','Delhi','continental'],['Bhopal','Madhya Pradesh','continental'],['Lucknow','Uttar Pradesh','continental'],['Nagpur','Maharashtra','continental']
    ];
    const rows=[];const start=new Date('2024-01-01T00:00:00Z');
    for(let i=0;i<480;i++){
      const city=cities[i%cities.length], month=(i%24)%12, season=Math.sin((month/12)*Math.PI*2), profile=city[2];
      let avg,hum,rain,wind,pressure,cloud;
      if(profile==='coastal'){avg=28+season*2;hum=77+season*5;rain=3+Math.max(0,season)*8;wind=13+Math.abs(season)*3;pressure=1007+season*2;cloud=55+Math.max(0,season)*24;}
      else if(profile==='arid'){avg=30+season*6;hum=34-season*5;rain=.5+Math.max(0,season)*2;wind=12+Math.abs(season)*2;pressure=1009+season*1.5;cloud=16+Math.max(0,season)*13;}
      else if(profile==='hill'){avg=15+season*7;hum=61+season*7;rain=2+Math.max(0,season)*6;wind=7+Math.abs(season)*2;pressure=910+season*2;cloud=45+Math.max(0,season)*20;}
      else {avg=26+season*8;hum=48+season*9;rain=1.5+Math.max(0,season)*4;wind=9+Math.abs(season)*4;pressure=1001+season*2;cloud=29+Math.max(0,season)*20;}
      avg+=(rnd()-.5)*5;hum+=(rnd()-.5)*22;rain=Math.max(0,rain+(rnd()-.5)*4);wind=Math.max(.3,wind+(rnd()-.5)*5);pressure+=(rnd()-.5)*5;cloud=Math.max(0,Math.min(100,cloud+(rnd()-.5)*20));
      const max=avg+2+rnd()*4,min=avg-2-rnd()*4;
      const date=new Date(start.getTime()+i*86400000).toISOString().slice(0,10);
      const aqi=Math.round(Math.max(18,Math.min(280,70+(profile==='arid'?32:profile==='continental'?45:0)+(rnd()-.5)*65)));
      const row={'Date':date,'City':city[0],'State':city[1],'Maximum Temperature':+max.toFixed(1),'Minimum Temperature':+min.toFixed(1),'Average Temperature':+avg.toFixed(1),'Humidity':+Math.max(8,Math.min(100,hum)).toFixed(1),'Rainfall':+rain.toFixed(1),'Wind Speed':+wind.toFixed(1),'Pressure':+pressure.toFixed(1),'Cloud Cover':+cloud.toFixed(1),'AQI':aqi,'AQI Category':aqi<50?'Good':aqi<100?'Moderate':aqi<150?'Poor':'Very Poor'};
      // Seed a few missing measurements so the imputation demo is visible.
      if(i%83===0) row['Rainfall']=''; if(i%137===0) row['Humidity']='';
      rows.push(row);
    }
    return {columns:Object.keys(rows[0]),rows};
  }

  function parseCSV(text){
    const rows=[];let row=[],field='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quoted){ if(c==='"' && text[i+1]==='"'){field+='"';i++;} else if(c==='"'){quoted=false;} else {field+=c;} }
      else if(c==='"'){quoted=true;}
      else if(c===','){row.push(field);field='';}
      else if(c==='\n' || c==='\r'){
        if(c==='\r' && text[i+1]==='\n')i++;
        row.push(field);field=''; if(row.some(v=>String(v).trim()!==''))rows.push(row); row=[];
      } else field+=c;
    }
    row.push(field);if(row.some(v=>String(v).trim()!==''))rows.push(row);
    if(rows.length<2)throw new Error('The CSV needs a header row and at least one data row.');
    const columns=rows[0].map((v,i)=>String(v).trim() || `Column ${i+1}`);
    const objects=rows.slice(1).map(r=>{const o={};columns.forEach((c,i)=>o[c]=(r[i]??'').trim());return o;});
    return {columns,rows:objects};
  }

  function discoverFeatures(columns){
    const map={}; const normalized=columns.map(c=>[c,norm(c)]);
    for(const f of FEATURE_NAMES){
      const aliases=[norm(f),...(FEATURE_ALIASES[f]||[])];
      let found=normalized.find(([c,n])=>aliases.includes(n));
      if(!found) found=normalized.find(([c,n])=>aliases.some(a=>a.length>3 && n.includes(a)));
      if(!found){
        // Avoid interpreting AQI itself as average temperature.
        if(f==='Average Temperature') found=normalized.find(([c,n])=>n.includes('temperature')&&!n.includes('maximum')&&!n.includes('minimum')&&!n.includes('aqi'));
      }
      if(found)map[f]=found[0];
    }
    return map;
  }
  function loadDataset(data,source){
    if(!data.rows.length)throw new Error('No records were found in the dataset.');
    state.rows=data.rows;state.columns=data.columns;state.source=source;state.featureColumns=discoverFeatures(data.columns);state.features=FEATURE_NAMES.filter(f=>state.featureColumns[f]);
    if(state.features.length<2){
      // fall back to numeric columns, while ensuring the UI makes the selected features explicit
      const numericCols=data.columns.filter(c=>data.rows.some(r=>Number.isFinite(numeric(r[c]))));
      if(numericCols.length>=2){state.features=numericCols.slice(0,Math.min(8,numericCols.length));state.featureColumns={};state.features.forEach(f=>state.featureColumns[f]=f);}
    }
    if(state.features.length<2)throw new Error('Could not identify at least two numerical climate columns. Please use the project CSV with temperature, humidity, rainfall, wind speed, pressure and/or cloud cover columns.');
    state.split=null;state.prepared=null;state.kmeans=null;state.hierarchical=null;
    updateDatasetUI(); renderEDA(); renderPrep(); renderComparison();
    const demo=source==='synthetic';
    setText('sidebar-data-status',demo?'Demo dataset active':'Project CSV loaded');
    setText('sidebar-row-count',`${fmtNum(data.rows.length)} records • ${demo?'synthetic':'local CSV'}`);
    $('sidebar-dot').style.background=demo?'#ffca82':'#71e6b0';
    setText('stat-rows-note',demo?'Synthetic demo records':'Uploaded project records');
    toast(demo?'Synthetic demo dataset loaded. Upload the real CSV for project findings.':`Loaded ${fmtNum(data.rows.length)} rows from your CSV.`);
  }

  function numericValues(feature,rows=state.rows){const col=state.featureColumns[feature];return rows.map(r=>numeric(r[col])).filter(Number.isFinite);}
  function getVector(row){return state.features.map(f=>numeric(row[state.featureColumns[f]]));}
  function medianByFeature(rows){return state.features.map((f,j)=>median(rows.map(r=>numeric(r[state.featureColumns[f]])).filter(Number.isFinite)));}
  function splitData(){
    const rnd=seeded(42);const ids=shuffle(state.rows.map((row,index)=>({row,index})),rnd);
    const n=ids.length,nTrain=Math.floor(n*.70),nVal=Math.floor(n*.15);
    const train=ids.slice(0,nTrain),validation=ids.slice(nTrain,nTrain+nVal),test=ids.slice(nTrain+nVal);
    state.split={train,validation,test};return state.split;
  }
  function prepareData(){
    if(!state.split)splitData();
    const {train,validation,test}=state.split;
    const medians=state.features.map((f)=>median(train.map(o=>numeric(o.row[state.featureColumns[f]])).filter(Number.isFinite)));
    const means=[],stds=[];
    const rawTrain=train.map(o=>vectorImpute(o.row,medians));
    for(let j=0;j<state.features.length;j++){const vals=rawTrain.map(v=>v[j]);means[j]=mean(vals);const sd=Math.sqrt(mean(vals.map(v=>(v-means[j])**2)));stds[j]=sd>1e-12?sd:1;}
    const transform=items=>items.map(o=>({index:o.index,row:o.row,raw:vectorImpute(o.row,medians),x:vectorImpute(o.row,medians).map((v,j)=>(v-means[j])/stds[j])}));
    state.prepared={train:transform(train),validation:transform(validation),test:transform(test),medians,means,stds,trainRaw:rawTrain,featureNames:state.features.slice()};
    renderPrep();return state.prepared;
  }
  function vectorImpute(row,medians){return state.features.map((f,j)=>{const v=numeric(row[state.featureColumns[f]]);return Number.isFinite(v)?v:medians[j];});}

  function updateDatasetUI(){
    setText('stat-rows',fmtNum(state.rows.length));setText('stat-cols',state.columns.length);setText('stat-features',state.features.length);
    setText('eda-rows',fmtNum(state.rows.length));setText('eda-cols',state.columns.length);
    const missing=state.rows.reduce((sum,r)=>sum+state.columns.reduce((s,c)=>s+(r[c]===null||r[c]===undefined||String(r[c]).trim()===''?1:0),0),0);
    setText('eda-missing',fmtNum(missing));
    const seen=new Set();let dup=0;state.rows.forEach(r=>{const key=state.columns.map(c=>String(r[c]??'')).join('\u241f');if(seen.has(key))dup++;else seen.add(key);});setText('eda-duplicates',fmtNum(dup));
    const picker=$('range-feature');picker.innerHTML='';state.features.forEach(f=>{const op=document.createElement('option');op.value=f;op.textContent=f;picker.appendChild(op);});
    renderTable($('data-preview'),state.columns.slice(0,7),state.rows.slice(0,6));setText('preview-count',`FIRST ${Math.min(6,state.rows.length)} ROWS`);
    renderRangeChart(picker.value||state.features[0]);renderMissingList();renderCorrelation();
  }

  function renderTable(el,columns,rows){
    const thead=el.querySelector('thead'),tbody=el.querySelector('tbody');thead.innerHTML='';tbody.innerHTML='';
    const tr=document.createElement('tr');columns.forEach(c=>{const th=document.createElement('th');th.textContent=c;tr.appendChild(th);});thead.appendChild(tr);
    rows.forEach(r=>{const tr=document.createElement('tr');columns.forEach(c=>{const td=document.createElement('td');let v=r[c];td.textContent=(v===null||v===undefined||v==='')?'—':String(v);tr.appendChild(td);});tbody.appendChild(tr);});
  }
  function renderRangeChart(feature){const canvas=$('range-chart');if(!canvas)return;const vals=numericValues(feature);drawHistogram(canvas,vals,`${feature} distribution`);const min=vals.length?Math.min(...vals):0,max=vals.length?Math.max(...vals):0;const legend=$('range-legend');legend.innerHTML=`<span class="legend-item"><span class="legend-swatch" style="background:${COLORS[0]}"></span>Min ${fmt(min,2)}</span><span class="legend-item"><span class="legend-swatch" style="background:${COLORS[2]}"></span>Max ${fmt(max,2)}</span><span class="legend-item">Valid values: ${fmtNum(vals.length)}</span>`;}
  function renderMissingList(){const el=$('missing-list');el.innerHTML='';const entries=state.columns.map(c=>({c,n:state.rows.reduce((s,r)=>s+((r[c]===null||r[c]===undefined||String(r[c]).trim()==='')?1:0),0)})).sort((a,b)=>b.n-a.n).slice(0,12);const max=Math.max(1,...entries.map(o=>o.n));entries.forEach(o=>{const row=document.createElement('div');row.className='missing-row';const nm=document.createElement('span');nm.className='missing-name';nm.textContent=o.c;const track=document.createElement('div');track.className='missing-track';const fill=document.createElement('div');fill.className='missing-fill';fill.style.width=(o.n/max*100)+'%';track.appendChild(fill);const num=document.createElement('span');num.className='missing-num';num.textContent=fmtNum(o.n);row.append(nm,track,num);el.appendChild(row);});if(entries.every(x=>x.n===0)){const n=document.createElement('p');n.className='panel-caption';n.textContent='No missing cells detected in the loaded dataset.';el.appendChild(n);}}
  function correlation(a,b){const pairs=[];for(let i=0;i<Math.min(a.length,b.length);i++)if(Number.isFinite(a[i])&&Number.isFinite(b[i]))pairs.push([a[i],b[i]]);if(pairs.length<2)return 0;const ma=mean(pairs.map(p=>p[0])),mb=mean(pairs.map(p=>p[1]));const num=pairs.reduce((s,p)=>s+(p[0]-ma)*(p[1]-mb),0);const den=Math.sqrt(pairs.reduce((s,p)=>s+(p[0]-ma)**2,0)*pairs.reduce((s,p)=>s+(p[1]-mb)**2,0));return den?num/den:0;}
  function renderCorrelation(){const el=$('correlation-wrap');el.innerHTML='';const n=state.features.length,grid=document.createElement('div');grid.className='heatmap';grid.style.gridTemplateColumns=`76px repeat(${n},minmax(25px,1fr))`;const blank=document.createElement('div');grid.appendChild(blank);state.features.forEach(f=>{const l=document.createElement('div');l.className='heat-label';l.style.writingMode='vertical-rl';l.style.transform='rotate(180deg)';l.style.height='72px';l.title=f;l.textContent=shortFeature(f);grid.appendChild(l);});const vals=state.features.map(f=>state.rows.map(r=>numeric(r[state.featureColumns[f]])));for(let i=0;i<n;i++){const lab=document.createElement('div');lab.className='heat-label';lab.title=state.features[i];lab.textContent=shortFeature(state.features[i]);grid.appendChild(lab);for(let j=0;j<n;j++){const r=correlation(vals[i],vals[j]);const cell=document.createElement('div');cell.className='heat-cell';cell.textContent=fmt(r,1);cell.title=`${state.features[i]} / ${state.features[j]}: ${fmt(r,3)}`;const intensity=Math.min(1,Math.abs(r));cell.style.background=r>=0?`rgba(85,217,219,${.07+intensity*.45})`:`rgba(166,155,255,${.07+intensity*.45})`;cell.style.color=intensity>.5?'#f1f8ff':'#90a4bf';grid.appendChild(cell);}}el.appendChild(grid);}
  function shortFeature(f){const m={'Maximum Temperature':'Max Temp','Minimum Temperature':'Min Temp','Average Temperature':'Avg Temp','Humidity':'Humidity','Rainfall':'Rainfall','Wind Speed':'Wind','Pressure':'Pressure','Cloud Cover':'Cloud'};return m[f]||f.slice(0,11);}

  function renderPrep(){
    if(!state.rows.length)return;
    const features=$('feature-list');features.innerHTML='';state.features.forEach(f=>{const el=document.createElement('span');el.className='feature-chip';el.textContent=f;features.appendChild(el);});setText('prep-feature-count',`${state.features.length} FEATURES`);
    if(!state.split)splitData();const {train,validation,test}=state.split;setText('train-count',`${fmtNum(train.length)} records`);setText('val-count',`${fmtNum(validation.length)} records`);setText('test-count',`${fmtNum(test.length)} records`);$('train-segment').querySelector('strong').textContent=Math.round(train.length/state.rows.length*100)+'%';$('val-segment').querySelector('strong').textContent=Math.round(validation.length/state.rows.length*100)+'%';$('test-segment').querySelector('strong').textContent=(100-Math.round(train.length/state.rows.length*100)-Math.round(validation.length/state.rows.length*100))+'%';
    const im=$('imputer-state'),sc=$('scaler-state');im.classList.toggle('complete',!!state.prepared);sc.classList.toggle('complete',!!state.prepared);im.innerHTML=`<span class="state-indicator"></span>${state.prepared?'Fitted on training medians':'Waiting to run'}`;sc.innerHTML=`<span class="state-indicator"></span>${state.prepared?'Fitted on training mean / SD':'Waiting to run'}`;
    if(state.prepared){const sample=state.prepared.train.slice(0,5).map(o=>{const obj={};state.features.forEach((f,j)=>obj[f]=fmt(o.x[j],3));return obj;});renderTable($('scaled-preview'),state.features,sample);}else{$('scaled-preview').querySelector('thead').innerHTML='';$('scaled-preview').querySelector('tbody').innerHTML='<tr><td>Click “Run preprocessing” to generate the train-fitted scaled matrix.</td></tr>';}
  }

  function dist2(a,b){let d=0;for(let i=0;i<a.length;i++){const z=a[i]-b[i];d+=z*z;}return d;}
  function fitKMeans(X,k,seed=42,maxIter=50){
    if(X.length<k)throw new Error('Not enough training records for the selected K.');
    const rnd=seeded(seed),d=X[0].length,centroids=[];let first=Math.floor(rnd()*X.length);centroids.push(X[first].slice());
    while(centroids.length<k){const ds=X.map(row=>Math.min(...centroids.map(c=>dist2(row,c))));const total=ds.reduce((s,x)=>s+x,0);let chosen;if(total<=0)chosen=X[Math.floor(rnd()*X.length)];else{let t=rnd()*total,idx=0;for(;idx<ds.length-1;idx++){t-=ds[idx];if(t<=0)break;}chosen=X[idx];}centroids.push(chosen.slice());}
    let labels=new Array(X.length).fill(-1),iterations=0;
    for(let it=0;it<maxIter;it++){iterations=it+1;let changed=0;const sums=Array.from({length:k},()=>Array(d).fill(0)),counts=Array(k).fill(0);const nearestD=Array(X.length).fill(0);
      for(let i=0;i<X.length;i++){let best=0,bd=Infinity;for(let c=0;c<k;c++){const dd=dist2(X[i],centroids[c]);if(dd<bd){bd=dd;best=c;}}nearestD[i]=bd;if(labels[i]!==best){labels[i]=best;changed++;}counts[best]++;for(let j=0;j<d;j++)sums[best][j]+=X[i][j];}
      for(let c=0;c<k;c++){if(counts[c])centroids[c]=sums[c].map(v=>v/counts[c]);else{let far=0;for(let i=1;i<nearestD.length;i++)if(nearestD[i]>nearestD[far])far=i;centroids[c]=X[far].slice();labels[far]=c;}}
      if(changed===0)break;
    }
    return {centroids,labels,iterations,k};
  }
  function predictCentroids(X,centroids){return X.map(row=>{let best=0,bd=Infinity;for(let c=0;c<centroids.length;c++){const d=dist2(row,centroids[c]);if(d<bd){bd=d;best=c;}}return best;});}
  function centroidsFromLabels(X,labels,k){const d=X[0].length,sums=Array.from({length:k},()=>Array(d).fill(0)),counts=Array(k).fill(0);X.forEach((x,i)=>{const c=labels[i];counts[c]++;for(let j=0;j<d;j++)sums[c][j]+=x[j];});return sums.map((s,i)=>counts[i]?s.map(v=>v/counts[i]):Array(d).fill(0));}
  function sampleIndices(n,max,seed=7){const rnd=seeded(seed);if(n<=max)return Array.from({length:n},(_,i)=>i);return shuffle(Array.from({length:n},(_,i)=>i),rnd).slice(0,max);}
  function silhouetteScore(X,labels,maxSample=280){
    const idx=sampleIndices(X.length,maxSample,71),sample=idx.map(i=>X[i]),labs=idx.map(i=>labels[i]),unique=[...new Set(labs)];if(unique.length<2||unique.length>=sample.length)return NaN;
    const groupCounts={};unique.forEach(k=>groupCounts[k]=labs.filter(v=>v===k).length);let total=0,used=0;
    for(let i=0;i<sample.length;i++){const own=labs[i],sum={},counts={};for(const c of unique){sum[c]=0;counts[c]=0;}for(let j=0;j<sample.length;j++){if(i===j)continue;const c=labs[j];sum[c]+=Math.sqrt(dist2(sample[i],sample[j]));counts[c]++;}const a=counts[own]?sum[own]/counts[own]:0;let b=Infinity;for(const c of unique)if(c!==own&&counts[c])b=Math.min(b,sum[c]/counts[c]);if(!Number.isFinite(b))continue;const den=Math.max(a,b);total+=den?((b-a)/den):0;used++;}
    return used?total/used:NaN;
  }
  function daviesBouldin(X,labels,k){
    const centers=centroidsFromLabels(X,labels,k),scatter=Array(k).fill(0),counts=Array(k).fill(0);X.forEach((x,i)=>{const c=labels[i];scatter[c]+=Math.sqrt(dist2(x,centers[c]));counts[c]++;});for(let c=0;c<k;c++)scatter[c]=counts[c]?scatter[c]/counts[c]:NaN;let total=0,valid=0;
    for(let i=0;i<k;i++){if(!Number.isFinite(scatter[i]))continue;let worst=-Infinity;for(let j=0;j<k;j++){if(i===j||!Number.isFinite(scatter[j]))continue;const d=Math.sqrt(dist2(centers[i],centers[j]));const ratio=d>1e-12?(scatter[i]+scatter[j])/d:Infinity;if(ratio>worst)worst=ratio;}if(Number.isFinite(worst)){total+=worst;valid++;}}
    return valid?total/valid:NaN;
  }
  function countLabels(labels,k){const c=Array(k).fill(0);labels.forEach(x=>{if(x>=0&&x<k)c[x]++;});return c;}
  function validateIndex(indices){return indices.map(o=>o.x);}

  async function runPreprocessing(){
    if(!state.rows.length)return;setBusy(true,'Preparing climate features…','Creating reproducible train, validation and test partitions.',15);await wait(40);
    try{splitData();setBusy(true,'Handling missing values…','Training medians are calculated from the training split only.',42);await wait(35);prepareData();setBusy(true,'Standardizing features…','Training means and standard deviations are applied consistently to all splits.',86);await wait(40);setBusy(false);toast('Preprocessing complete: 70% train, 15% validation, 15% test.');}
    catch(e){setBusy(false);toast(e.message);}
  }
  async function runKMeans(){
    if(!state.rows.length)return; if(!state.prepared)prepareData();const p=state.prepared;setBusy(true,'Searching for K…','Fitting K-Means candidates on the training data.',8);await wait(20);
    try{
      const maxK=Math.min(6,p.train.length-1);if(maxK<2)throw new Error('Not enough records to fit clustering.');const candidates=[];
      for(let k=2;k<=maxK;k++){setText('busy-desc',`Training candidate K = ${k} of ${maxK}…`);$('busy-progress-bar').style.width=(10+(k-1)/(maxK-1)*64)+'%';await wait(12);const fit=fitKMeans(validateIndex(p.train),k,42+k,45);const valLabels=predictCentroids(validateIndex(p.validation),fit.centroids);const score=silhouetteScore(validateIndex(p.validation),valLabels,260);const db=daviesBouldin(validateIndex(p.validation).slice(0,Math.min(600,p.validation.length)),valLabels.slice(0,Math.min(600,p.validation.length)),k);candidates.push({k,fit,score,db});}
      const best=candidates.reduce((a,b)=>(Number.isFinite(b.score)&&(!Number.isFinite(a.score)||b.score>a.score))?b:a,candidates[0]);const testX=validateIndex(p.test),testLabels=predictCentroids(testX,best.fit.centroids);const metricX=sampleIndices(testX.length,650,23).map(i=>testX[i]),metricLabels=sampleIndices(testX.length,650,23).map(i=>testLabels[i]);
      state.kmeans={k:best.k,model:best.fit,centroids:best.fit.centroids,validationScores:candidates.map(c=>({k:c.k,score:c.score,db:c.db})),testLabels,testSil:silhouetteScore(metricX,metricLabels,650),testDb:daviesBouldin(metricX,metricLabels,best.k),test:p.test,trainLabels:best.fit.labels};
      renderKMeans();renderComparison();setBusy(false);toast(`K-Means completed. Validation selected K = ${best.k}.`);
    }catch(e){setBusy(false);console.error(e);toast(`K-Means could not run: ${e.message}`);}
  }

  // Ward agglomeration implemented in-browser on a bounded training sample.
  function buildWardTree(X,maxK=6){
    const d=X[0].length;let nextId=X.length;let active=X.map((x,i)=>({id:i,members:[i],centroid:x.slice(),size:1}));const merges=[],labelsByK={};
    const minK=Math.min(6,Math.max(2,maxK));
    while(active.length>1){let bi=0,bj=1,best=Infinity;
      for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const a=active[i],b=active[j];const dd=(a.size*b.size/(a.size+b.size))*dist2(a.centroid,b.centroid);if(dd<best){best=dd;bi=i;bj=j;}}
      const a=active[bi],b=active[bj],size=a.size+b.size,centroid=a.centroid.map((v,j)=>(v*a.size+b.centroid[j]*b.size)/size);const merged={id:nextId++,members:a.members.concat(b.members),centroid,size};merges.push({left:a.id,right:b.id,newId:merged.id,distance:Math.sqrt(Math.max(0,best)),size});
      active.splice(bj,1);active.splice(bi,1);active.push(merged);
      if(active.length>=2&&active.length<=6){const k=active.length,lab=Array(X.length);active.forEach((c,ci)=>c.members.forEach(i=>lab[i]=ci));labelsByK[k]=lab;}
    }
    // Need hierarchy partitions for k=2..6: replay saved merges from singleton leaves.
    const cuts={};for(let k=2;k<=Math.min(6,X.length);k++){let clusters=Array.from({length:X.length},(_,i)=>({id:i,members:[i]}));let nid=X.length;const idMap=new Map(clusters.map(c=>[c.id,c]));for(let m=0;m<X.length-k;m++){const merge=merges[m];const left=idMap.get(merge.left),right=idMap.get(merge.right);if(!left||!right)continue;const combined={id:merge.newId,members:left.members.concat(right.members)};idMap.delete(merge.left);idMap.delete(merge.right);idMap.set(combined.id,combined);}const remaining=[...idMap.values()];const labels=Array(X.length);remaining.forEach((c,ci)=>c.members.forEach(i=>labels[i]=ci));cuts[k]=labels;}
    return {merges,cuts,sampleN:X.length};
  }
  async function runHierarchical(){
    if(!state.rows.length)return;if(!state.prepared)prepareData();const p=state.prepared;setBusy(true,'Building hierarchical tree…','Selecting a deterministic sample from the training split.',8);await wait(25);
    try{
      const trainX=validateIndex(p.train);const cap=180;const sIdx=sampleIndices(trainX.length,Math.min(cap,trainX.length),99);const sampleX=sIdx.map(i=>trainX[i]);if(sampleX.length<3)throw new Error('At least three training observations are required.');
      setText('busy-desc',`Computing Ward merges for ${sampleX.length} training observations…`);$('busy-progress-bar').style.width='30%';await wait(35);const tree=buildWardTree(sampleX,Math.min(6,sampleX.length-1));
      const candidates=[];const maxK=Math.min(6,sampleX.length-1);for(let k=2;k<=maxK;k++){setText('busy-desc',`Evaluating hierarchical candidate K = ${k}…`);$('busy-progress-bar').style.width=(38+(k-1)/(maxK-1)*45)+'%';await wait(10);const labels=tree.cuts[k];if(!labels)continue;const centers=centroidsFromLabels(sampleX,labels,k);const valX=validateIndex(p.validation),valLabels=predictCentroids(valX,centers);const score=silhouetteScore(valX,valLabels,240);candidates.push({k,labels,centers,score});}
      if(!candidates.length)throw new Error('Not enough records to evaluate cluster candidates.');const best=candidates.reduce((a,b)=>(Number.isFinite(b.score)&&(!Number.isFinite(a.score)||b.score>a.score))?b:a,candidates[0]);const testX=validateIndex(p.test),testLabels=predictCentroids(testX,best.centers);const idx=sampleIndices(testX.length,650,24),metricX=idx.map(i=>testX[i]),metricLabels=idx.map(i=>testLabels[i]);
      state.hierarchical={k:best.k,tree,sampleIndices:sIdx,sampleX,labels:best.labels,centroids:best.centers,validationScores:candidates.map(c=>({k:c.k,score:c.score})),testLabels,testSil:silhouetteScore(metricX,metricLabels,650),testDb:daviesBouldin(metricX,metricLabels,best.k),test:p.test,approximate:true};renderHierarchical();renderComparison();setBusy(false);toast(`Hierarchical clustering completed on ${sampleX.length} training samples. Selected K = ${best.k}.`);
    }catch(e){setBusy(false);console.error(e);toast(`Hierarchical clustering could not run: ${e.message}`);}
  }

  function setupCanvas(canvas){const rect=canvas.getBoundingClientRect(),dpr=Math.max(1,window.devicePixelRatio||1);const width=Math.max(260,rect.width||600),height=Number(canvas.getAttribute('height'))||240;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.height=height+'px';const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);return {ctx,w:width,h:height};}
  function chartText(ctx,text,x,y,color='#8194af',size=10,align='left'){ctx.fillStyle=color;ctx.font=`${size}px "DM Sans", sans-serif`;ctx.textAlign=align;ctx.fillText(text,x,y);}
  function drawHistogram(canvas,values,title='Distribution'){
    const {ctx,w,h}=setupCanvas(canvas),L=36,R=12,T=20,B=32,iw=w-L-R,ih=h-T-B;const vals=values.filter(Number.isFinite);if(!vals.length){chartText(ctx,'No numeric values available',w/2,h/2,'#8194af',11,'center');return;}let min=Math.min(...vals),max=Math.max(...vals);if(min===max){min-=1;max+=1;}const bins=12,counts=Array(bins).fill(0);vals.forEach(v=>{let idx=Math.floor((v-min)/(max-min)*bins);idx=Math.min(bins-1,Math.max(0,idx));counts[idx]++;});const maxC=Math.max(1,...counts);ctx.strokeStyle='rgba(147,168,201,.12)';ctx.lineWidth=1;for(let i=0;i<4;i++){let y=T+ih*i/3;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();chartText(ctx,String(Math.round(maxC*(1-i/3))),L-8,y+3,'#5c6d87',8,'right');}counts.forEach((c,i)=>{const bw=iw/bins,barH=(c/maxC)*(ih-3),x=L+i*bw+2,y=T+ih-barH;ctx.fillStyle=`rgba(85,217,219,${.45+.45*(c/maxC)})`;roundedRect(ctx,x,y,Math.max(2,bw-4),barH,3);});chartText(ctx,fmt(min,1),L,T+ih+18,'#778aa6',8);chartText(ctx,fmt(max,1),w-R,T+ih+18,'#778aa6',8,'right');chartText(ctx,title,L,T-5,'#8da0bc',9);
  }
  function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();}
  function drawBarChart(canvas,labels,values,title='',valueFmt=v=>String(Math.round(v))){const {ctx,w,h}=setupCanvas(canvas),L=42,R=15,T=23,B=35,iw=w-L-R,ih=h-T-B;if(!values.length){chartText(ctx,'Run the model to view results',w/2,h/2,'#8194af',11,'center');return;}const max=Math.max(1,...values);ctx.strokeStyle='rgba(147,168,201,.12)';for(let i=0;i<4;i++){const y=T+ih*i/3;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();chartText(ctx,valueFmt(max*(1-i/3)),L-7,y+3,'#63738c',8,'right');}const gap=iw/values.length;values.forEach((v,i)=>{const bw=Math.min(45,gap*.55),bh=Math.max(1,v/max*(ih-3)),x=L+i*gap+(gap-bw)/2,y=T+ih-bh;ctx.fillStyle=COLORS[i%COLORS.length];roundedRect(ctx,x,y,bw,bh,4);chartText(ctx,valueFmt(v),x+bw/2,y-6,'#c4d4e9',9,'center');chartText(ctx,labels[i],x+bw/2,T+ih+18,'#8a9cb7',9,'center');});if(title)chartText(ctx,title,L,T-8,'#8da0bc',9);}
  function drawLineChart(canvas,labels,values,title='Validation score'){const {ctx,w,h}=setupCanvas(canvas),L=43,R=17,T=25,B=37,iw=w-L-R,ih=h-T-B;if(!values.length){chartText(ctx,'Run the model to calculate scores',w/2,h/2,'#8194af',11,'center');return;}const valid=values.filter(Number.isFinite);let min=Math.min(-.1,...valid),max=Math.max(.1,...valid);if(max-min<.25){min-=.1;max+=.1;}ctx.strokeStyle='rgba(147,168,201,.12)';for(let i=0;i<5;i++){const y=T+ih*i/4;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();chartText(ctx,fmt(max-(max-min)*i/4,2),L-7,y+3,'#63738c',8,'right');}const pts=values.map((v,i)=>({x:L+(labels.length===1?iw/2:i*iw/(labels.length-1)),y:T+(max-v)/(max-min)*ih,v}));ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#55d9db';ctx.lineWidth=2;ctx.stroke();pts.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fillStyle=COLORS[i%COLORS.length];ctx.fill();chartText(ctx,fmt(p.v,3),p.x,p.y-10,'#c9e6ef',9,'center');chartText(ctx,String(labels[i]),p.x,T+ih+20,'#8a9cb7',9,'center');});chartText(ctx,title,L,T-9,'#8da0bc',9);}
  function drawScatter(canvas,rows,labels){const {ctx,w,h}=setupCanvas(canvas),L=47,R=15,T=20,B=38,iw=w-L-R,ih=h-T-B;if(!rows.length){chartText(ctx,'Run K-Means to display cluster assignments',w/2,h/2,'#8194af',11,'center');return;}const fX=state.featureColumns['Average Temperature'],fY=state.featureColumns['Humidity'];const points=rows.map((item,i)=>({x:numeric(item.row[fX]),y:numeric(item.row[fY]),c:labels[i]})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));if(!points.length)return;let xmin=Math.min(...points.map(p=>p.x)),xmax=Math.max(...points.map(p=>p.x)),ymin=Math.min(...points.map(p=>p.y)),ymax=Math.max(...points.map(p=>p.y));if(xmin===xmax){xmin--;xmax++;}if(ymin===ymax){ymin--;ymax++;}for(let i=0;i<4;i++){const gy=T+ih*i/3;ctx.strokeStyle='rgba(147,168,201,.12)';ctx.beginPath();ctx.moveTo(L,gy);ctx.lineTo(w-R,gy);ctx.stroke();chartText(ctx,fmt(ymax-(ymax-ymin)*i/3,0),L-8,gy+3,'#64758e',8,'right');}points.forEach(p=>{const x=L+(p.x-xmin)/(xmax-xmin)*iw,y=T+(ymax-p.y)/(ymax-ymin)*ih;ctx.beginPath();ctx.arc(x,y,3.2,0,Math.PI*2);ctx.fillStyle=COLORS[p.c%COLORS.length];ctx.globalAlpha=.78;ctx.fill();ctx.globalAlpha=1;});chartText(ctx,'Average Temperature',L+iw/2,h-8,'#91a2bc',9,'center');chartText(ctx,fmt(xmin,0),L,T+ih+16,'#64758e',8);chartText(ctx,fmt(xmax,0),w-R,T+ih+16,'#64758e',8,'right');}
  function drawDendrogram(canvas,merges){const {ctx,w,h}=setupCanvas(canvas),L=42,R=14,T=20,B=33,iw=w-L-R,ih=h-T-B;if(!merges.length){chartText(ctx,'Run Hierarchical to display Ward merge distances',w/2,h/2,'#8194af',11,'center');return;}const d=merges.slice(-Math.min(120,merges.length));const max=Math.max(1,...d.map(m=>m.distance));ctx.strokeStyle='rgba(147,168,201,.12)';for(let i=0;i<4;i++){const y=T+ih*i/3;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();chartText(ctx,fmt(max*(1-i/3),1),L-7,y+3,'#63738c',8,'right');}const slot=iw/d.length;ctx.beginPath();d.forEach((m,i)=>{const x=L+i*slot+slot/2,y=T+ih-(m.distance/max)*ih;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.strokeStyle='#a69bff';ctx.lineWidth=1.7;ctx.stroke();d.forEach((m,i)=>{const x=L+i*slot+slot/2,y=T+ih-(m.distance/max)*ih;ctx.beginPath();ctx.arc(x,y,1.9,0,Math.PI*2);ctx.fillStyle='#d0caff';ctx.fill();});chartText(ctx,'Merge steps (last merges)',L+iw/2,h-7,'#91a2bc',9,'center');}
  function renderDonut(canvas,labels){const {ctx,w,h}=setupCanvas(canvas);const counts=countLabels(labels,Math.max(0,...labels)+1),total=counts.reduce((a,b)=>a+b,0);if(!total){chartText(ctx,'Run the model to view cluster sizes',w/2,h/2,'#8194af',11,'center');return;}const cx=w/2,cy=h/2-2,r=Math.min(74,w*.18),inner=r*.62;let start=-Math.PI/2;counts.forEach((v,i)=>{if(!v)return;const end=start+v/total*Math.PI*2;ctx.beginPath();ctx.arc(cx,cy,r,start,end);ctx.arc(cx,cy,inner,end,start,true);ctx.closePath();ctx.fillStyle=COLORS[i%COLORS.length];ctx.fill();start=end;});chartText(ctx,`${total.toLocaleString()}`,cx,cy-1,'#f0f7ff',18,'center');chartText(ctx,'test records',cx,cy+16,'#8295b2',9,'center');}
  function renderClusterLegend(id,labels,k){const el=$(id);el.innerHTML='';const counts=countLabels(labels,k);counts.forEach((n,i)=>{const sp=document.createElement('span');sp.className='legend-item';sp.innerHTML=`<span class="legend-swatch" style="background:${COLORS[i%COLORS.length]}"></span>Cluster ${i+1}: ${fmtNum(n)}`;el.appendChild(sp);});}
  function renderKMeans(){const m=state.kmeans;if(!m)return;setText('km-k',m.k);setText('km-sil',fmt(m.testSil,3));setText('km-db',fmt(m.testDb,3));drawLineChart($('km-score-chart'),m.validationScores.map(x=>x.k),m.validationScores.map(x=>x.score),'Mean validation silhouette');renderDonut($('km-cluster-chart'),m.testLabels);renderClusterLegend('km-cluster-legend',m.testLabels,m.k);drawScatter($('km-scatter'),m.test,m.testLabels);}
  function renderHierarchical(){const m=state.hierarchical;if(!m)return;setText('hc-k',m.k);setText('hc-sil',fmt(m.testSil,3));setText('hc-db',fmt(m.testDb,3));drawDendrogram($('hc-dendrogram'),m.tree.merges);renderDonut($('hc-cluster-chart'),m.testLabels);renderClusterLegend('hc-cluster-legend',m.testLabels,m.k);}
  function renderComparison(){const km=state.kmeans,hc=state.hierarchical;setText('cmp-km-k',km?km.k:'—');setText('cmp-hc-k',hc?hc.k:'—');setText('cmp-km-sil',km?fmt(km.testSil,4):'—');setText('cmp-hc-sil',hc?fmt(hc.testSil,4):'—');setText('cmp-km-db',km?fmt(km.testDb,4):'—');setText('cmp-hc-db',hc?fmt(hc.testDb,4):'—');setText('compare-status',km&&hc?'BOTH MODELS RUN':km||hc?'ONE MODEL RUN':'WAITING FOR RUN');}
  function exportResults(){if(!state.rows.length){toast('Load a dataset first.');return;}const p=state.prepared;if(!p){toast('Run preprocessing before exporting results.');return;}const byIndex=new Map();if(state.kmeans)state.kmeans.test.forEach((o,i)=>{byIndex.set(o.index,{...(byIndex.get(o.index)||{}),KMeans_Cluster:state.kmeans.testLabels[i]+1});});if(state.hierarchical)state.hierarchical.test.forEach((o,i)=>{byIndex.set(o.index,{...(byIndex.get(o.index)||{}),Hierarchical_Cluster:state.hierarchical.testLabels[i]+1});});const rows=state.split.test.filter(o=>byIndex.has(o.index));if(!rows.length){toast('Run at least one model before exporting cluster assignments.');return;}const cols=[...state.columns,'Split','KMeans_Cluster','Hierarchical_Cluster'];const esc=v=>{const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};const data=[cols.map(esc).join(',')];rows.forEach(o=>{const extra=byIndex.get(o.index);data.push([...state.columns.map(c=>o.row[c]),'Test',extra.KMeans_Cluster??'',extra.Hierarchical_Cluster??''].map(esc).join(','));});const blob=new Blob([data.join('\r\n')],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='climate_clustering_test_results.csv';a.click();URL.revokeObjectURL(url);toast('Test split results downloaded as CSV.');}

  function goto(view){const el=$('view-'+view);if(!el)return;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));el.classList.add('active');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const active=document.querySelector(`.nav-item[data-view="${view}"]`);setText('current-crumb',active?active.textContent.trim():view);window.scrollTo({top:0,behavior:'smooth'});if(view==='eda')renderEDA();if(view==='prep')renderPrep();if(view==='comparison')renderComparison();}
  function renderEDA(){if(!state.rows.length)return;renderRangeChart($('range-feature').value||state.features[0]);renderMissingList();renderCorrelation();}
  function sampleColumnsFromCsv(){const input=$('csv-upload');input.value='';input.click();}

  document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>goto(btn.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(btn=>btn.addEventListener('click',()=>goto(btn.dataset.goto)));
  $('hero-run').addEventListener('click',()=>goto('prep'));
  $('hero-data').addEventListener('click',sampleColumnsFromCsv);
  $('csv-upload').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>80*1024*1024)throw new Error('The CSV is larger than 80 MB. Please use a smaller export for the browser demo.');setBusy(true,'Reading your CSV…',file.name,25);await wait(20);const text=await file.text();setBusy(true,'Understanding columns…','Identifying numerical climate features.',68);await wait(20);const data=parseCSV(text);loadDataset(data,'uploaded');setBusy(false);goto('eda');}catch(err){setBusy(false);toast(err.message||'Could not read that CSV.');}});
  $('range-feature').addEventListener('change',()=>renderRangeChart($('range-feature').value));$('eda-reload').addEventListener('click',()=>{updateDatasetUI();toast('Dataset profile refreshed.');});$('run-prep').addEventListener('click',runPreprocessing);$('run-kmeans').addEventListener('click',runKMeans);$('run-hierarchical').addEventListener('click',runHierarchical);$('run-both').addEventListener('click',async()=>{await runPreprocessing();await runKMeans();await runHierarchical();goto('comparison');});$('download-results').addEventListener('click',exportResults);$('help-btn').addEventListener('click',()=>window.open('DEMO_GUIDE.md','_blank'));
  window.addEventListener('resize',()=>{if(state.rows.length){renderRangeChart($('range-feature').value||state.features[0]);if(state.kmeans)renderKMeans();if(state.hierarchical)renderHierarchical();}});

  // Demo-only sign-in: credentials are checked in the browser and are not secure authentication.
  const loginScreen = $('login-screen');
  const loginForm = $('login-form');
  const emailField = $('login-email');
  const passwordField = $('login-password');
  const loginError = $('login-error');

  function openWorkspace(displayName) {
    loginScreen.classList.add('is-hidden');
    setText('session-label', displayName);
    if (loginError) loginError.textContent = '';
    toast(`Welcome to ClimateLens, ${displayName}.`);
  }
  function returnToLogin() {
    loginScreen.classList.remove('is-hidden');
    setText('session-label', 'Demo session');
    if (loginError) loginError.textContent = '';
    window.setTimeout(() => emailField?.focus(), 30);
  }
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = String(emailField.value || '').trim().toLowerCase();
    const password = String(passwordField.value || '');
    if (email === 'demo@climatelens.local' && password === 'climate123') {
      openWorkspace('Demo user');
    } else {
      loginError.textContent = 'Those demo credentials do not match. Use the credentials shown below or continue as guest.';
      passwordField.focus();
    }
  });
  $('guest-login').addEventListener('click', () => openWorkspace('Guest session'));
  $('logout-btn').addEventListener('click', returnToLogin);
  $('toggle-password').addEventListener('click', () => {
    const reveal = passwordField.type === 'password';
    passwordField.type = reveal ? 'text' : 'password';
    $('toggle-password').textContent = reveal ? 'Hide' : 'Show';
    $('toggle-password').setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  });
  document.querySelectorAll('.copy-credential').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy || '';
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(value);
        toast('Demo credential copied.');
      } catch (_) {
        const field = value.includes('@') ? emailField : passwordField;
        field.value = value;
        field.focus();
        field.select();
        toast('Credential filled in the login form. Press Cmd+C or Ctrl+C to copy.');
      }
    });
  });

  const demo=createDemoRows();loadDataset(demo,'synthetic');renderPrep();renderComparison();
})();
