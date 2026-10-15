import { BankService, InMemoryRepository } from './bank.js';
import { createBankServer } from './http.js';
const bank = new BankService(new InMemoryRepository(), { log: async (transaction) => { console.log('AUDIT', transaction); } });
createBankServer(bank).listen(3000, () => console.log('SmartBank API em http://localhost:3000'));
