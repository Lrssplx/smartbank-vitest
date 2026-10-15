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
  it('retorna 400 em corpo JSON que não é objeto', async () => {
    const response = await json('POST', '/accounts', [1, 2]);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'INVALID_JSON' });
  });
  it('retorna 400 em conta com campos inválidos', async () => {
    const response = await json('POST', '/accounts', { id: 1, owner: 'Ana' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'INVALID_ACCOUNT' });
  });
  it('faz saque via API e valida o valor', async () => {
    await json('POST', '/accounts', { id: 'A', owner: 'Ana' });
    await json('POST', '/accounts/A/deposit', { amountCents: 500 });
    const withdraw = await json('POST', '/accounts/A/withdraw', { amountCents: 200 });
    expect(withdraw.status).toBe(200);
    expect((await withdraw.json()).balanceCents).toBe(300);
    const invalid = await json('POST', '/accounts/A/withdraw', { amountCents: '200' });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: 'INVALID_AMOUNT' });
  });
  it('retorna 404 e 409 em erros de negócio', async () => {
    await json('POST', '/accounts', { id: 'A', owner: 'Ana' });
    expect((await json('GET', '/accounts/X')).status).toBe(404);
    const insufficient = await json('POST', '/accounts/A/withdraw', { amountCents: 100 });
    expect(insufficient.status).toBe(409);
    expect(await insufficient.json()).toEqual({ error: 'INSUFFICIENT_FUNDS' });
  });
  it('retorna 400 em transferência com corpo inválido', async () => {
    const response = await json('POST', '/transfers', { from: 'A', to: 'B', amountCents: 'x' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'INVALID_ACCOUNT' });
  });
  it('oculta erros inesperados como INTERNAL_ERROR (500)', async () => {
    const failing = createBankServer(new BankService({ get: async () => { throw new Error('DB_DOWN'); }, save: async () => undefined }, { log: async () => undefined }));
    await new Promise<void>(resolve => failing.listen(0, '127.0.0.1', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(failing.address() as AddressInfo).port}/accounts/A`);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'INTERNAL_ERROR' });
    } finally {
      await new Promise<void>(resolve => failing.close(() => resolve()));
    }
  });
});
