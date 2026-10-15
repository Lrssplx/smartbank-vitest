import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { BankService, InMemoryRepository } from '../src/bank.js';
import { createBankServer } from '../src/http.js';

describe('SmartBank HTTP - integração', () => {
  let server: Server;
  let base: string;
  const json = (method: string, path: string, body?: unknown) => fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  beforeEach(async () => {
    const bank = new BankService(new InMemoryRepository(), { log: vi.fn().mockResolvedValue(undefined) });
    server = createBankServer(bank);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => { await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())); });
  it('cria conta e consulta saldo', async () => {
    const created = await json('POST', '/accounts', { id: 'A', owner: 'Ana' });
    expect(created.status).toBe(201);
    const queried = await json('GET', '/accounts/A');
    expect(queried.status).toBe(200);
    expect(await queried.json()).toMatchObject({ balanceCents: 0, owner: 'Ana' });
  });
  it('faz depósito e transferência via API', async () => {
    await json('POST', '/accounts', { id: 'A', owner: 'Ana' });
    await json('POST', '/accounts', { id: 'B', owner: 'Bia' });
    const deposit = await json('POST', '/accounts/A/deposit', { amountCents: 1000 });
    expect(deposit.status).toBe(200);
    const transfer = await json('POST', '/transfers', { from: 'A', to: 'B', amountCents: 400 });
    expect(transfer.status).toBe(200);
    const receiver = await json('GET', '/accounts/B');
    expect((await receiver.json()).balanceCents).toBe(400);
  });
  it('retorna 400 em JSON inválido', async () => {
    const response = await fetch(base + '/accounts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'INVALID_JSON' });
  });
  it('retorna 404 em rota inexistente', async () => {
    const response = await json('GET', '/nada');
    expect(response.status).toBe(404);
  });
});
