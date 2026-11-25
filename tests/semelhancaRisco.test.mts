import { test } from "node:test";
import assert from "node:assert/strict";
import {
  palavrasRelevantes,
  jaccard,
  notaSemelhanca,
  sugerirSemelhantes,
  podeRegistrarOcorrencia,
} from "../lib/semelhancaRisco.ts";

test("palavrasRelevantes tira acentos, palavras vazias e reduz variações", () => {
  assert.deepEqual(
    [...palavrasRelevantes("Exploração de vulnerabilidades críticas no Firewall.")].sort(),
    ["criti", "explo", "firew", "vulne"]
  );
  assert.deepEqual([...palavrasRelevantes("Explorar a vulnerabilidade crítica")].sort(), ["criti", "explo", "vulne"]);
  assert.equal(palavrasRelevantes(null).size, 0);
});

test("jaccard", () => {
  assert.equal(jaccard(new Set(["a", "b"]), new Set(["b", "c"])), 1 / 3);
  assert.equal(jaccard(new Set(), new Set(["a"])), 0);
});

test("notaSemelhanca considera só os campos digitados", () => {
  const existente = {
    evento: "Exploração de vulnerabilidade crítica",
    causa: "Vulnerabilidades críticas sem correção dentro do prazo",
    consequencia: "Exposição de dados e indisponibilidade",
  };
  assert.equal(notaSemelhanca({ evento: "Explorar vulnerabilidades críticas" }, existente), 1);
  assert.ok(notaSemelhanca({ evento: "Queda de energia no datacenter" }, existente) < 0.1);
  assert.equal(notaSemelhanca({}, existente), 0);
});

test("sugerirSemelhantes filtra pelo limiar e ordena", () => {
  const candidatos = [
    { id: 1, evento: "Falha na execução do backup", causa: "Rotina sem verificação" },
    { id: 2, evento: "Falha na restauração do backup da intranet", causa: "Backups sem testes de restauração" },
    { id: 3, evento: "Ataque de negação de serviço", causa: "Sem proteção DDoS" },
  ];
  const s = sugerirSemelhantes({ evento: "Falha no backup", causa: "Backup sem verificação de execução" }, candidatos);
  assert.deepEqual(
    s.map((x) => x.id),
    [1, 2]
  );
  assert.ok(s[0].nota >= s[1].nota);
});

test("podeRegistrarOcorrencia bloqueia risco mitigado", () => {
  assert.match(podeRegistrarOcorrencia("Mitigado")!, /Mitigado/);
  assert.equal(podeRegistrarOcorrencia("Identificado"), null);
  assert.equal(podeRegistrarOcorrencia("Aceito"), null);
});
