# SmartBank QA - Curso completo de Vitest

## Início rápido
Requer Node >= 22.12.
```bash
npm install
npm run typecheck
npm run test:run
npm run coverage
npm run dev
```
API local em http://localhost:3000.

## Exercícios em ordem
1. Leia `src/bank.ts` e `tests/unit.test.ts`; identifique Arrange, Act, Assert.
2. Acrescente `it.each` para saques inválidos e erros por saldo insuficiente.
3. Crie testes para transferência com saldo exatamente igual ao valor.
4. Teste conta de destino inexistente sem perder dinheiro da conta de origem.
5. Simule erro na segunda chamada a `save` e mostre a falha de atomicidade. Proponha solução transacional.
6. Use `vi.fn`, `vi.spyOn`, `mockRejectedValue` e `toHaveBeenCalledWith`.
7. Teste `POST /accounts`, `GET /accounts/:id`, depósito, saque e transferência por HTTP.
8. Rode `npm run coverage` e explique linhas, funções e branches.
9. Altere de propósito `balance < amount` para `balance <= amount` e confirme que um teste falha (mutação manual).
10. Envie ao GitHub para executar o workflow CI.
11. Exporte JSON do reporter: `npx vitest run --reporter=json --outputFile=vitest-report.json`.
12. Crie um script que leia falhas do JSON e gere um resumo local sem IA. Só então conecte uma LLM.

## Limitações arquiteturais intencionais
Este é um laboratório didático, **não** uma implementação bancária pronta para produção. `transfer` salva duas contas sequencialmente sem transação ACID e não protege contra operações concorrentes. Logs de auditoria também podem falhar depois do saldo já estar atualizado. Use esses defeitos arquiteturais como material de testes avançados (atomicidade, concorrência, idempotência, outbox e rollbacks). Nunca envie dados bancários reais ou segredos para modelos de IA.

## Documentação oficial
https://vitest.dev/guide/
https://vitest.dev/guide/mocking.html
https://vitest.dev/guide/coverage.html
# smartbank-vitest
