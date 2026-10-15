import { describe, expect, it, vi } from 'vitest';
import { BankService, type AccountRepository, type AuditLogger } from '../src/bank.js';

describe('Mocks e testes assíncronos', () => {
  it('vi.fn permite simular dependências e verificar chamadas', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const repository: AccountRepository = { get: vi.fn().mockResolvedValue({ id: 'A', owner: 'Ana', balanceCents: 0 }), save };
    const audit: AuditLogger = { log: vi.fn().mockResolvedValue(undefined) };
    const bank = new BankService(repository, audit);
    await bank.deposit('A', 100);
    expect(save).toHaveBeenCalledWith({ id: 'A', owner: 'Ana', balanceCents: 100 });
  });
  it('spyOn observa uma chamada existente', async () => {
    const audit = { log: async (_event: unknown) => undefined };
    const spy = vi.spyOn(audit, 'log');
    const repo: AccountRepository = { get: async () => ({ id: 'A', owner: 'Ana', balanceCents: 0 }), save: async () => undefined };
    await new BankService(repo, audit).deposit('A', 100);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
  it('falha de persistência é propagada', async () => {
    const repo: AccountRepository = { get: async () => ({ id: 'A', owner: 'Ana', balanceCents: 0 }), save: vi.fn().mockRejectedValue(new Error('DB_DOWN')) };
    const audit: AuditLogger = { log: vi.fn() };
    await expect(new BankService(repo, audit).deposit('A', 100)).rejects.toThrow('DB_DOWN');
    expect(audit.log).not.toHaveBeenCalled();
  });
});
