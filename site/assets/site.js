  // Reads this page's own response headers to show which CloudFront edge served it.
  // If the headers are missing (for example when the file is opened locally), nothing changes.
  (function(){
    if(!document.getElementById('edge')) return;
    if(!window.fetch || location.protocol.indexOf('http') !== 0) return;
    var cities = {LHR:'London',MAN:'Manchester',DUB:'Dublin',AMS:'Amsterdam',FRA:'Frankfurt',CDG:'Paris',
      MAD:'Madrid',MXP:'Milan',ARN:'Stockholm',OSL:'Oslo',CPH:'Copenhagen',ZRH:'Zurich',VIE:'Vienna',WAW:'Warsaw',
      JFK:'New York',EWR:'Newark',IAD:'Washington DC',ORD:'Chicago',DFW:'Dallas',ATL:'Atlanta',LAX:'Los Angeles',
      SFO:'San Francisco',SEA:'Seattle',YYZ:'Toronto',GRU:'São Paulo',BOM:'Mumbai',DEL:'Delhi',MAA:'Chennai',
      SIN:'Singapore',HKG:'Hong Kong',NRT:'Tokyo',SYD:'Sydney',DXB:'Dubai',JNB:'Johannesburg'};
    var started = performance.now();
    fetch(location.pathname, {method:'HEAD', cache:'no-store'}).then(function(res){
      var ms = Math.round(performance.now() - started);
      var pop = res.headers.get('x-amz-cf-pop');
      if(!pop) return;
      var city = cities[pop.slice(0,3).toUpperCase()];
      var cache = (res.headers.get('x-cache') || '').toLowerCase();
      var cacheText = cache.indexOf('refreshhit') === 0 ? 'Edge cache, revalidated with S3'
        : cache.indexOf('hit') === 0 ? 'Served from the edge cache'
        : cache.indexOf('miss') === 0 ? 'Fetched from S3 for this request'
        : 'CloudFront';
      var edge = document.getElementById('edge');
      edge.textContent = 'Served you from ' + (city ? 'the ' + city + ' edge ' : 'edge ');
      var code = document.createElement('code');
      code.textContent = pop;
      edge.appendChild(code);
      document.getElementById('r-pop').textContent = city ? city + ' (' + pop + ')' : pop;
      document.getElementById('r-cache').textContent = cacheText;
      document.getElementById('r-ms').textContent = ms + ' ms';
      document.getElementById('readout').hidden = false;
    }).catch(function(){});
  })();

  // Visitor counter: one call per browser session to the API named in config.js.
  (function(){
    var el = document.getElementById('visits');
    var api = window.SITE && window.SITE.counterApi;
    if(!el || !api || !window.fetch) return;
    function show(n){ el.textContent = Number(n).toLocaleString('en-GB') + ' visits'; el.hidden = false; }
    var saved = null;
    try { saved = sessionStorage.getItem('visits'); } catch(e) {}
    if(saved){ show(saved); return; }
    fetch(api, {method:'POST'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if(!d || typeof d.visits !== 'number') return;
      try { sessionStorage.setItem('visits', d.visits); } catch(e) {}
      show(d.visits);
    }).catch(function(){});
  })();

  // Status page: draws the results the uptime monitor publishes to /status/status.json.
  (function(){
    var box = document.getElementById('status');
    if(!box || !window.fetch) return;
    function el(tag, cls, text){ var n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; }
    fetch('/status/status.json', {cache:'no-store'}).then(function(r){
      if(!r.ok) throw new Error('no file'); return r.json();
    }).then(function(data){
      box.textContent = '';
      (data.sites || []).forEach(function(s){
        var wrap = el('div', 'site-status');
        var h = el('h2', null, s.url.replace(/^https?:\/\//, ''));
        h.appendChild(el('span', 'pill' + (s.up ? '' : ' down'), s.up ? 'Up' : 'Down'));
        wrap.appendChild(h);
        wrap.appendChild(el('p', null, 'Last response in ' + s.ms + ' ms. Up for ' + s.uptime24h + '% of the checks shown.'));
        var bars = el('div', 'bars');
        bars.setAttribute('role', 'img');
        bars.setAttribute('aria-label', 'Check history, oldest on the left');
        (s.history || []).forEach(function(p){ var b = el('i', p[1] ? '' : 'down'); b.title = p[0] + (p[1] ? ' up, ' + p[2] + ' ms' : ' down'); bars.appendChild(b); });
        wrap.appendChild(bars);
        var lab = el('div', 'bars-label'); lab.appendChild(el('span', null, 'Oldest check')); lab.appendChild(el('span', null, 'Latest check'));
        wrap.appendChild(lab);
        box.appendChild(wrap);
      });
      var when = new Date(data.updated);
      if(!isNaN(when)) document.getElementById('status-updated').textContent = 'Last checked ' + when.toLocaleString('en-GB') + '. History covers up to 24 hours.';
    }).catch(function(){
      box.textContent = '';
      box.appendChild(el('p', 'note', 'The monitor has not published any results yet.'));
    });
  })();
