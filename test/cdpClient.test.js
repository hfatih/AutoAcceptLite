const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const { CdpSession } = require('../src/cdpClient');
const { setLanguage } = require('../src/i18n');

test('a stalled WebSocket handshake rejects without crashing the engine', async () => {
    setLanguage('en');
    const server = http.createServer();
    const sockets = new Set();
    server.on('connection', socket => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
    });
    server.on('upgrade', () => {});
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const session = new CdpSession(`ws://127.0.0.1:${server.address().port}`);
    try {
        await assert.rejects(session.ready, /connection timed out/);
        assert.equal(session.dead, true);
        await assert.rejects(session.send('Runtime.enable'), /connection is dead/);
    } finally {
        session.close();
        for (const socket of sockets) socket.destroy();
        await new Promise(resolve => server.close(resolve));
    }
});

test('a live local CDP session still evaluates and closes normally', async () => {
    const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    server.on('connection', socket => socket.on('message', raw => {
        const request = JSON.parse(raw);
        socket.send(JSON.stringify({ id: request.id, result: { result: { value: 42 } } }));
    }));
    await once(server, 'listening');
    const session = new CdpSession(`ws://127.0.0.1:${server.address().port}`);
    try {
        await session.ready;
        assert.equal(await session.evaluate('6 * 7'), 42);
    } finally {
        session.close();
        await new Promise(resolve => server.close(resolve));
    }
});

test('--check loads the modules and exits without running the engine', () => {
    const root = path.join(__dirname, '..');
    const result = spawnSync(process.execPath, [path.join(root, 'index.js'), '--check'], {
        cwd: root, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), `AutoAccept Lite ${require('../package.json').version}: OK`);
});
