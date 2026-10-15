export type Account = { id: string; owner: string; balanceCents: number };
export type Transaction = { type: 'deposit' | 'withdraw' | 'transfer'; amountCents: number; from?: string; to?: string };

export interface AccountRepository {
  get(id: string): Promise<Account | undefined>;
  save(account: Account): Promise<void>;
}
export interface AuditLogger { log(transaction: Transaction): Promise<void> }

export class InMemoryRepository implements AccountRepository {
  private data = new Map<string, Account>();
  async get(id: string) { const account = this.data.get(id); return account ? { ...account } : undefined; }
  async save(account: Account) { this.data.set(account.id, { ...account }); }
}

export class BankService {
  constructor(private readonly repository: AccountRepository, private readonly audit: AuditLogger) {}
  private validateAmount(cents: number): void {
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('INVALID_AMOUNT');
  }
  async getAccount(id: string): Promise<Account> {
    const account = await this.repository.get(id);
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');
    return account;
  }
  async createAccount(id: string, owner: string): Promise<Account> {
    if (!id?.trim() || !owner?.trim()) throw new Error('INVALID_ACCOUNT');
    if (await this.repository.get(id)) throw new Error('ACCOUNT_EXISTS');
    const account = { id, owner, balanceCents: 0 };
    await this.repository.save(account);
    return account;
  }
  async deposit(id: string, amountCents: number): Promise<Account> {
    this.validateAmount(amountCents);
    const account = await this.getAccount(id);
    if (!Number.isSafeInteger(account.balanceCents + amountCents)) throw new Error('BALANCE_OVERFLOW');
    account.balanceCents += amountCents;
    await this.repository.save(account);
    await this.audit.log({ type: 'deposit', amountCents, to: id });
    return account;
  }
  async withdraw(id: string, amountCents: number): Promise<Account> {
    this.validateAmount(amountCents);
    const account = await this.getAccount(id);
    if (account.balanceCents < amountCents) throw new Error('INSUFFICIENT_FUNDS');
    account.balanceCents -= amountCents;
    await this.repository.save(account);
    await this.audit.log({ type: 'withdraw', amountCents, from: id });
    return account;
  }
  async transfer(from: string, to: string, amountCents: number): Promise<void> {
    this.validateAmount(amountCents);
    if (from === to) throw new Error('SAME_ACCOUNT');
    const sender = await this.getAccount(from);
    const receiver = await this.getAccount(to);
    if (sender.balanceCents < amountCents) throw new Error('INSUFFICIENT_FUNDS');
    if (!Number.isSafeInteger(receiver.balanceCents + amountCents)) throw new Error('BALANCE_OVERFLOW');
    sender.balanceCents -= amountCents;
    receiver.balanceCents += amountCents;
    // Apenas didático: em produção usar transação ACID e idempotência.
    await this.repository.save(sender);
    await this.repository.save(receiver);
    await this.audit.log({ type: 'transfer', amountCents, from, to });
  }
}
