import { describe, expect, it, vi } from 'vitest';
import { BankService, InMemoryRepository } from '../src/bank.js';

describe('BankService - ramos de erro', () => {
  const setup = async () => {
    const bank = new BankService(new InMemoryRepository(), { log: vi.fn().mockResolvedValue(undefined) });
    await bank.createAccount('A', 'Ana');
    await bank.createAccount('B', 'Bia');
    return bank;
  };
  it('rejeita criação com id ou titular vazio', async () => {
    const bank = await setup();
    await expect(bank.createAccount('  ', 'Ana')).rejects.toThrow('INVALID_ACCOUNT');
    await expect(bank.createAccount('C', '')).rejects.toThrow('INVALID_ACCOUNT');
  });
  it('rejeita depósito que estoura o saldo seguro', async () => {
    const bank = await setup();
    await bank.deposit('A', Number.MAX_SAFE_INTEGER);
    await expect(bank.deposit('A', 1)).rejects.toThrow('BALANCE_OVERFLOW');
  });
  it('rejeita transferência sem saldo suficiente', async () => {
    const bank = await setup();
    await expect(bank.transfer('A', 'B', 100)).rejects.toThrow('INSUFFICIENT_FUNDS');
  });
  it('rejeita transferência que estoura o saldo do destinatário', async () => {
    const bank = await setup();
    await bank.deposit('B', Number.MAX_SAFE_INTEGER);
    await bank.deposit('A', 1);
    await expect(bank.transfer('A', 'B', 1)).rejects.toThrow('BALANCE_OVERFLOW');
  });
});
