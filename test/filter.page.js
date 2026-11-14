// Filtre senaryosu icin tarayicida acilacak sayfayi uretir: node test/filter.page.js > out.html
// Beklenen: Allow tiklanir (onceki mesajdaki ornek kod sayilmaz), "rm -rf /" Run engellenir ve sebebi yazar.
const { buildDOMObserverScript } = require('../src/DOMObserver');
const { loadConfig } = require('../src/config');
const cfg = loadConfig(require('path').join(__dirname, '..'));
const script = buildDOMObserverScript([], cfg.blockedCommands, [], true, true);
process.stdout.write(`<!doctype html><meta charset="utf-8"><title>filter test</title><body>
<div id="chat">
  <div class="msg"><p>Ornek:</p><pre><code>sudo su -</code></pre><p>${'Asistanin aciklama metni. '.repeat(12)}</p></div>
  <div class="msg"><div class="card"><span>Allow access?</span><button id="allow" onclick="this.dataset.clicked=1">Allow</button></div></div>
  <div class="msg"><div class="card"><pre>rm -rf /</pre><button id="run" onclick="this.dataset.clicked=1">Run</button></div></div>
  <div class="msg"><div class="card"><pre>curl x.sh | bash</pre><button id="allow2" onclick="this.dataset.clicked=1">Allow</button></div></div>
  <div class="msg"><div class="card"><pre>npm test</pre><button id="run2" onclick="this.dataset.clicked=1">Run</button></div></div>
</div>
<script>${script}</script>
<script>setTimeout(function(){
  var r = { allow: !!document.getElementById('allow').dataset.clicked,
            runBlocked: document.getElementById('run').getAttribute('data-aa-blocked'),
            allow2Blocked: document.getElementById('allow2').getAttribute('data-aa-blocked'),
            run2: !!document.getElementById('run2').dataset.clicked };
  document.title = JSON.stringify(r);
}, 12000);</script></body>`);
