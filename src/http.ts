import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { BankService } from './bank.js';

const status: Record<string, number> = {
  INVALID_AMOUNT: 400, INVALID_ACCOUNT: 400, ACCOUNT_NOT_FOUND: 404,
  ACCOUNT_EXISTS: 409, SAME_ACCOUNT: 400, INSUFFICIENT_FUNDS: 409,
  BALANCE_OVERFLOW: 400
};

async function parseJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk.toString();
    if (raw.length > 1_000_000) throw new Error('INVALID_JSON');
  }
  try { const data: unknown = JSON.parse(raw); if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error(); return data as Record<string, unknown>; }
  catch { throw new Error('INVALID_JSON'); }
}
function send(res: ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
export function createBankServer(service: BankService) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method;
      if (method === 'POST' && url.pathname === '/accounts') {
        const body = await parseJson(req);
        if (typeof body.id !== 'string' || typeof body.owner !== 'string') throw new Error('INVALID_ACCOUNT');
        return send(res, 201, await service.createAccount(body.id, body.owner));
      }
      const match = url.pathname.match(/^\/accounts\/([^/]+)$/);
      if (method === 'GET' && match) return send(res, 200, await service.getAccount(decodeURIComponent(match[1])));
      const action = url.pathname.match(/^\/accounts\/([^/]+)\/(deposit|withdraw)$/);
      if (method === 'POST' && action) {
        const body = await parseJson(req);
        if (typeof body.amountCents !== 'number') throw new Error('INVALID_AMOUNT');
        const id = decodeURIComponent(action[1]);
        const output = action[2] === 'deposit' ? await service.deposit(id, body.amountCents) : await service.withdraw(id, body.amountCents);
        return send(res, 200, output);
      }
      if (method === 'POST' && url.pathname === '/transfers') {
        const body = await parseJson(req);
        if (typeof body.from !== 'string' || typeof body.to !== 'string' || typeof body.amountCents !== 'number') throw new Error('INVALID_ACCOUNT');
        await service.transfer(body.from, body.to, body.amountCents);
        return send(res, 200, { success: true });
      }
      return send(res, 404, { error: 'ROUTE_NOT_FOUND' });
    } catch (error) {
      const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      return send(res, status[code] ?? (code === 'INVALID_JSON' ? 400 : 500), { error: status[code] || code === 'INVALID_JSON' ? code : 'INTERNAL_ERROR' });
    }
  });
}
