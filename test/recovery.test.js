// Retry dongusu susturmasi: sayac sayfa yerine motorda, hedef basina tutulur.
const test = require('node:test');
const assert = require('node:assert');
const { Injector } = require('../src/injector');
const { loadConfig } = require('../src/config');

test('3 retry in 60 s mutes recovery on that target and tells the page', async () => {
    const logs = [];
    const inj = new Injector(loadConfig(__dirname + '/..'), (m) => logs.push(m));
    const sent = [];
    const entry = { title: 'plugin #ABCD', session: { evaluate: async (e) => { sent.push(e); return 'ok'; } } };

    await inj._countRecovery(entry);
    await inj._countRecovery(entry);
    assert.equal(inj._recoveryMuted(entry), false);
    await inj._countRecovery(entry);
    assert.equal(inj._recoveryMuted(entry), true);
    assert.ok(sent.some((e) => e.includes('__AA_RECOVERY_MUTED = true')));
    assert.equal(logs.length, 1);

    // Susturulmusken yeni retry'lar ikinci uyari uretmez.
    await inj._countRecovery(entry);
    assert.equal(logs.length, 1);

    // Sure dolunca susturma kalkar.
    entry.recoveryMutedUntil = Date.now() - 1;
    assert.equal(inj._recoveryMuted(entry), false);
});
