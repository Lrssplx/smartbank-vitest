import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BankService, InMemoryRepository, type AuditLogger } from '../src/bank.js';

describe('BankService - testes unitários', () => {
  let bank: BankService;
  let audit: AuditLogger;
  beforeEach(async () => {
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    bank = new BankService(new InMemoryRepository(), audit);
    await bank.createAccount('A', 'Ana');
    await bank.createAccount('B', 'Bia');
  });
  it('conta inicia zerada', async () => { expect((await bank.getAccount('A')).balanceCents).toBe(0); });
  it('deposita centavos', async () => { expect((await bank.deposit('A', 1500)).balanceCents).toBe(1500); });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejeita valores inválidos %s', async amount => {
    await expect(bank.deposit('A', amount)).rejects.toThrow('INVALID_AMOUNT');
  });
  it('permite saque igual ao saldo', async () => {
    await bank.deposit('A', 1000);
    expect((await bank.withdraw('A', 1000)).balanceCents).toBe(0);
  });
  it('recusa saque acima do saldo, mantendo o saldo', async () => {
    await bank.deposit('A', 1000);
    await expect(bank.withdraw('A', 1001)).rejects.toThrow('INSUFFICIENT_FUNDS');
    expect((await bank.getAccount('A')).balanceCents).toBe(1000);
  });
  it('transfere entre contas e registra auditoria', async () => {
    await bank.deposit('A', 5000);
    await bank.transfer('A', 'B', 2000);
    expect((await bank.getAccount('A')).balanceCents).toBe(3000);
    expect((await bank.getAccount('B')).balanceCents).toBe(2000);
    expect(audit.log).toHaveBeenCalledWith({ type: 'transfer', amountCents: 2000, from: 'A', to: 'B' });
  });
  it('rejeita transferência para a mesma conta', async () => {
    await expect(bank.transfer('A', 'A', 100)).rejects.toThrow('SAME_ACCOUNT');
  });
  it('rejeita conta inexistente', async () => {
    await expect(bank.getAccount('X')).rejects.toThrow('ACCOUNT_NOT_FOUND');
  });
  it('rejeita criação duplicada', async () => {
    await expect(bank.createAccount('A', 'Outro')).rejects.toThrow('ACCOUNT_EXISTS');
  });
});
