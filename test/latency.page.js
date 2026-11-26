// Ayni yerde art arda acilan onay dugmesinin bekleme suresini olcer: node test/latency.page.js > out.html
// Sayfa sonucu document.title'a yazar. Beklenen: her yeni dugme 1 sn icinde tiklanir (eskiden ~5 sn).
const { buildDOMObserverScript } = require('../src/DOMObserver');
const script = buildDOMObserverScript(['submit'], [], [], true, true);
process.stdout.write(`<!doctype html><meta charset="utf-8"><title>latency test</title><body>
<div id="bar"></div>
<script>
var lat = [], shown = 0, N = 5;
function show() {
  var b = document.createElement('button'); b.textContent = 'Submit';
  b.onclick = function() { lat.push(Date.now() - shown); b.remove(); if (lat.length < N) setTimeout(show, 30); else done(); };
  shown = Date.now(); document.getElementById('bar').appendChild(b);
}
function done() { var max = Math.max.apply(null, lat); document.title = (max < 1000 ? 'PASS ' : 'FAIL ') + JSON.stringify(lat); }
show();
setTimeout(function(){ if (lat.length < N) document.title = 'FAIL timeout ' + JSON.stringify(lat); }, 40000);
</script>
<script>${script}</script></body>`);
