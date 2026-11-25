// Testes da montagem da linha do tempo a partir do log de alterações (B06).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { montarEventos, type RegistroLog } from "../lib/historicoRisco.ts";

const base = {
  usuario_email: "ana@exemplo.com",
  usuario_nome: "Ana Souza",
  origem: "aplicacao" as const,
};

test("alteração de vários campos na mesma transação vira um evento só", () => {
  const registros: RegistroLog[] = [
    { ...base, id: 1, ocorrido_em: "2026-11-25T14:00:00Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "status", valor_anterior: "Identificado", valor_novo: "Em Tratamento", transacao: 100 },
    { ...base, id: 2, ocorrido_em: "2026-11-25T14:00:00Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto", valor_anterior: 4, valor_novo: 5, transacao: 100 },
    { ...base, id: 3, ocorrido_em: "2026-11-25T14:00:00Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "im_prob_atual", valor_anterior: 0, valor_novo: 0.2, transacao: 100 },
  ];
  const eventos = montarEventos(registros);
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].titulo, "Risco atualizado");
  assert.equal(eventos[0].autor, "Ana Souza");
  assert.deepEqual(eventos[0].mudancas, [
    { campo: "Status", de: "Identificado", para: "Em Tratamento" },
    { campo: "Impacto inerente", de: "4", para: "5" },
  ]);
});

test("alteração só de campos técnicos não aparece na linha do tempo", () => {
  const eventos = montarEventos([
    { ...base, id: 1, ocorrido_em: "2026-11-25T14:00:00Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "im_imp_atual", valor_anterior: 0, valor_novo: 0.1, transacao: 101 },
  ]);
  assert.equal(eventos.length, 0);
});

test("criação usa o registro novo no título e datas viram dd/mm/aaaa", () => {
  const eventos = montarEventos([
    { ...base, id: 1, ocorrido_em: "2026-11-25T15:00:00Z", tabela: "planos_acao", registro_id: "7", operacao: "INSERT", campo: null, valor_anterior: null, valor_novo: { id: 7, titulo: "Aplicar patch" }, transacao: 102 },
    { ...base, id: 2, ocorrido_em: "2026-11-25T16:00:00Z", tabela: "acoes", registro_id: "9", operacao: "UPDATE", campo: "prazo", valor_anterior: "2026-12-01", valor_novo: "2026-12-15", transacao: 103 },
  ]);
  assert.equal(eventos[0].titulo, "Ação atualizada");
  assert.deepEqual(eventos[0].mudancas, [{ campo: "Prazo", de: "01/12/2026", para: "15/12/2026" }]);
  assert.equal(eventos[1].titulo, "Plano de ação criado: Aplicar patch");
  assert.equal(eventos[1].chave, "planos_acao:7");
});

test("alteração feita direto no banco é identificada", () => {
  const eventos = montarEventos([
    { id: 1, ocorrido_em: "2026-11-25T17:00:00Z", tabela: "riscos", registro_id: "1", operacao: "UPDATE", campo: "status", valor_anterior: "Mitigado", valor_novo: "Em Tratamento", usuario_email: "banco: neondb_owner", usuario_nome: null, origem: "banco", transacao: 104 },
  ]);
  assert.equal(eventos[0].autor, "banco: neondb_owner (direto no banco)");
});

test("eventos ordenados do mais recente para o mais antigo", () => {
  const eventos = montarEventos([
    { ...base, id: 1, ocorrido_em: "2026-11-20T10:00:00Z", tabela: "riscos", registro_id: "1", operacao: "INSERT", campo: null, valor_anterior: null, valor_novo: { id: 1 }, transacao: 1 },
    { ...base, id: 2, ocorrido_em: "2026-11-24T10:00:00Z", tabela: "planos_acao_auditorias", registro_id: "3", operacao: "INSERT", campo: null, valor_anterior: null, valor_novo: { resultado: "Conforme" }, transacao: 2 },
  ]);
  assert.deepEqual(eventos.map((e) => e.titulo), ["Auditoria do plano: Conforme", "Risco cadastrado"]);
});

test("atualizações seguidas do mesmo registro e autor viram um evento", () => {
  const eventos = montarEventos([
    { ...base, id: 1, ocorrido_em: "2026-11-25T14:32:41.100Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto", valor_anterior: 5, valor_novo: 4, transacao: 200 },
    { ...base, id: 2, ocorrido_em: "2026-11-25T14:32:41.100Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "nivel_inicial", valor_anterior: "Crítico", valor_novo: "Alto", transacao: 200 },
    { ...base, id: 3, ocorrido_em: "2026-11-25T14:32:41.400Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto_qualitativo", valor_anterior: "Crítico", valor_novo: "Alto", transacao: 201 },
    // Outra edição, um minuto depois: evento separado.
    { ...base, id: 4, ocorrido_em: "2026-11-25T14:33:45.000Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto", valor_anterior: 4, valor_novo: 5, transacao: 202 },
  ]);
  assert.equal(eventos.length, 2);
  assert.deepEqual(eventos[1].mudancas.map((m) => m.campo), ["Impacto inerente", "Nível inerente", "Nível atual"]);
});

test("duas edições seguidas do mesmo campo não se misturam", () => {
  const eventos = montarEventos([
    { ...base, id: 1, ocorrido_em: "2026-11-25T14:32:40.000Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto", valor_anterior: 5, valor_novo: 4, transacao: 300 },
    { ...base, id: 2, ocorrido_em: "2026-11-25T14:32:40.300Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto_qualitativo", valor_anterior: "Crítico", valor_novo: "Alto", transacao: 301 },
    { ...base, id: 3, ocorrido_em: "2026-11-25T14:32:41.000Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto", valor_anterior: 4, valor_novo: 5, transacao: 302 },
    { ...base, id: 4, ocorrido_em: "2026-11-25T14:32:41.300Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto_qualitativo", valor_anterior: "Alto", valor_novo: "Crítico", transacao: 303 },
  ]);
  assert.equal(eventos.length, 2);
  assert.deepEqual(eventos[0].mudancas, [
    { campo: "Impacto inerente", de: "4", para: "5" },
    { campo: "Nível atual", de: "Alto", para: "Crítico" },
  ]);
  assert.deepEqual(eventos[1].mudancas, [
    { campo: "Impacto inerente", de: "5", para: "4" },
    { campo: "Nível atual", de: "Crítico", para: "Alto" },
  ]);
});

test("salvar a reavaliação sem mudar nada aparece como revisão (B17)", () => {
  const eventos = montarEventos([
    { ...base, id: 1, ocorrido_em: "2026-11-25T18:00:00Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "revisado_em", valor_anterior: "2026-09-20T12:00:00", valor_novo: "2026-11-25T18:00:00", transacao: 400 },
  ]);
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].titulo, "Risco revisado sem alterações");
  assert.deepEqual(eventos[0].mudancas, []);
});

test("reavaliação com mudança de valor junta a revisão e o recálculo", () => {
  const eventos = montarEventos([
    { ...base, id: 1, ocorrido_em: "2026-11-25T18:00:00.000Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto", valor_anterior: 5, valor_novo: 4, transacao: 500 },
    { ...base, id: 2, ocorrido_em: "2026-11-25T18:00:00.000Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "revisado_em", valor_anterior: "2026-09-20T12:00:00", valor_novo: "2026-11-25T18:00:00", transacao: 500 },
    { ...base, id: 3, ocorrido_em: "2026-11-25T18:00:00.300Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "impacto_qualitativo", valor_anterior: "Crítico", valor_novo: "Alto", transacao: 501 },
  ]);
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].titulo, "Risco reavaliado (revisão periódica)");
  assert.deepEqual(eventos[0].mudancas.map((m) => m.campo), ["Impacto inerente", "Nível atual"]);
});

test("preenchimento inicial de revisado_em (migração) não aparece na linha do tempo", () => {
  const eventos = montarEventos([
    { id: 1, ocorrido_em: "2026-11-25T14:42:00Z", tabela: "riscos", registro_id: "58", operacao: "UPDATE", campo: "revisado_em", valor_anterior: null, valor_novo: "2026-09-20T13:56:14", usuario_email: "banco: neondb_owner", usuario_nome: null, origem: "banco", transacao: 600 },
  ]);
  assert.equal(eventos.length, 0);
});
