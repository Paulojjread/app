"use client";

import { useCallback, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type StatusAgendamento = "agendado" | "realizado" | "cancelado";
type FormaPagamento = "Pix" | "Dinheiro" | "Cartão crédito" | "Cartão débito" | "Permuta";
type Aba = "agenda" | "atendimentos" | "financeiro" | "config";
type FiltroFinanceiro = "mes" | "3" | "6" | "12" | "inicio";

type Agendamento = {
  id: number;
  nome_cliente: string;
  data_atendimento: string;
  horario: string;
  servico: string;
  valor: number;
  status?: StatusAgendamento | string | null;
  forma_pagamento?: FormaPagamento | string | null;
  tipo_resultado?: string | null;
};

type Preco = {
  id: number;
  servico: string;
  valor: number;
};

const FORMAS_PAGAMENTO: FormaPagamento[] = [
  "Pix",
  "Dinheiro",
  "Cartão crédito",
  "Cartão débito",
  "Permuta",
];

const SERVICOS_PADRAO = ["Mão", "Pé", "Pé e Mão", "Plástica dos pés", "Sobrancelha"];

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function criarDataHora(dataISO: string, horario: string) {
  return new Date(`${dataISO}T${horario.slice(0, 5)}:00`);
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataCompleta(dataISO: string, hora: string) {
  const data = new Date(`${dataISO}T00:00:00`);

  return `${data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })} às ${hora.slice(0, 5)}`;
}

function inicioFiltroFinanceiro(filtro: FiltroFinanceiro, referencia = new Date()) {
  if (filtro === "inicio") return null;

  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);

  if (filtro !== "mes") {
    inicio.setMonth(inicio.getMonth() - (Number(filtro) - 1));
  }

  return inicio;
}


function formatarMesCurto(data: Date) {
  return data.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function chaveMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function tituloFiltroFinanceiro(filtro: FiltroFinanceiro) {
  if (filtro === "mes") return "Último mês";
  if (filtro === "3") return "Últimos 3 meses";
  if (filtro === "6") return "Últimos 6 meses";
  if (filtro === "12") return "Último 1 ano";
  return "Desde o início";
}

function textoAtendimentos(quantidade: number) {
  return `${quantidade} atendimento${quantidade === 1 ? "" : "s"}`;
}

function textoAtendimentosRealizados(quantidade: number) {
  return `${textoAtendimentos(quantidade)} realizado${quantidade === 1 ? "" : "s"}`;
}

function formatarDataTitulo(dataISO: string) {
  const data = new Date(`${dataISO}T00:00:00`);

  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function statusVisual(item: Agendamento) {
  const status = item.status || "agendado";

  if (status === "realizado") {
    return { texto: "Realizado", classe: "realizado" };
  }

  if (status === "cancelado") {
    return {
      texto: item.tipo_resultado === "nao_compareceu" ? "Falta" : "Cancelado",
      classe: "cancelado",
    };
  }

  const atrasado = criarDataHora(item.data_atendimento, item.horario) < new Date();
  return atrasado
    ? { texto: "Para confirmar", classe: "pendente" }
    : { texto: "Agendado", classe: "agendado" };
}

export default function Home() {
  const [login, setLogin] = useState("");
  const [logado, setLogado] = useState(false);
  const [aba, setAba] = useState<Aba>("agenda");

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [precos, setPrecos] = useState<Preco[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(dataLocalISO());

  const hoje = useMemo(() => new Date(), []);
  const hojeISO = useMemo(() => dataLocalISO(), []);

  const [mesAtual, setMesAtual] = useState(() => new Date().getMonth());
  const [anoAtual, setAnoAtual] = useState(() => new Date().getFullYear());
  const [filtroFinanceiro, setFiltroFinanceiro] = useState<FiltroFinanceiro>("mes");

  const [pagamentoModal, setPagamentoModal] = useState<Agendamento | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("Pix");

  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>(["Mão"]);
  const [valor, setValor] = useState("");

  const servicosDisponiveis = useMemo(() => {
    const servicosDoBanco = precos.map((preco) => preco.servico).filter(Boolean);
    return servicosDoBanco.length > 0 ? servicosDoBanco : SERVICOS_PADRAO;
  }, [precos]);

  const precoPorServico = useMemo(() => {
    return new Map(precos.map((preco) => [preco.servico, Number(preco.valor) || 0]));
  }, [precos]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const [agendaResposta, precosResposta] = await Promise.all([
      supabase
        .from("agendamentos")
        .select("*")
        .order("data_atendimento", { ascending: true })
        .order("horario", { ascending: true }),
      supabase.from("configuracoes_precos").select("*").order("servico", { ascending: true }),
    ]);

    if (agendaResposta.error || precosResposta.error) {
      setErro("Não foi possível carregar os dados. Confira a conexão com o Supabase.");
      setCarregando(false);
      return;
    }

    setAgendamentos((agendaResposta.data || []) as Agendamento[]);
    setPrecos((precosResposta.data || []) as Preco[]);
    setCarregando(false);
  }, []);

  function entrar() {
    if (login.trim().toLowerCase() === "suziane") {
      setLogado(true);
      void carregar();
      return;
    }

    alert("Login inválido.");
  }

  function proximoMes() {
    setMesAtual((mes) => {
      if (mes === 11) {
        setAnoAtual((ano) => ano + 1);
        return 0;
      }
      return mes + 1;
    });
  }

  function mesAnterior() {
    setMesAtual((mes) => {
      if (mes === 0) {
        setAnoAtual((ano) => ano - 1);
        return 11;
      }
      return mes - 1;
    });
  }

  const nomeMes = useMemo(() => {
    return new Date(anoAtual, mesAtual, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [anoAtual, mesAtual]);

  const diasMes = useMemo(() => {
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const vazios = Array.from({ length: primeiroDiaSemana }, () => null);
    const dias = Array.from({ length: diasNoMes }, (_, indice) =>
      dataLocalISO(new Date(anoAtual, mesAtual, indice + 1)),
    );

    return [...vazios, ...dias];
  }, [anoAtual, mesAtual]);

  const futuros = useMemo(() => {
    return agendamentos.filter((item) => {
      const status = item.status || "agendado";
      return criarDataHora(item.data_atendimento, item.horario) >= hoje && status === "agendado";
    });
  }, [agendamentos, hoje]);

  const confirmar = useMemo(() => {
    return agendamentos.filter((item) => {
      const status = item.status || "agendado";
      return criarDataHora(item.data_atendimento, item.horario) < hoje && status === "agendado";
    });
  }, [agendamentos, hoje]);

  const realizados = useMemo(() => {
    return agendamentos.filter((item) => item.status === "realizado");
  }, [agendamentos]);

  const realizadosFiltrados = useMemo(() => {
    const inicio = inicioFiltroFinanceiro(filtroFinanceiro);
    if (!inicio) return realizados;

    return realizados.filter((item) => criarDataHora(item.data_atendimento, item.horario) >= inicio);
  }, [realizados, filtroFinanceiro]);

  const financeiro = useMemo(() => {
    const totais = Object.fromEntries(FORMAS_PAGAMENTO.map((forma) => [forma, 0])) as Record<
      FormaPagamento,
      number
    >;

    for (const item of realizadosFiltrados) {
      const forma = item.forma_pagamento as FormaPagamento | undefined;
      if (forma && forma in totais) {
        totais[forma] += Number(item.valor) || 0;
      }
    }

    const faturamento = Object.values(totais).reduce((soma, valor) => soma + valor, 0);

    return { totais, faturamento, atendimentos: realizadosFiltrados.length };
  }, [realizadosFiltrados]);

  const faturamentoMesAtual = useMemo(() => {
    const referencia = new Date();
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth();

    return realizados.reduce((total, item) => {
      const dataItem = criarDataHora(item.data_atendimento, item.horario);
      if (dataItem.getFullYear() !== ano || dataItem.getMonth() !== mes) {
        return total;
      }

      return total + (Number(item.valor) || 0);
    }, 0);
  }, [realizados]);

  const realizadosMesAtual = useMemo(() => {
    const referencia = new Date();
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth();

    return realizados.filter((item) => {
      const dataItem = criarDataHora(item.data_atendimento, item.horario);
      return dataItem.getFullYear() === ano && dataItem.getMonth() === mes;
    }).length;
  }, [realizados]);


  const graficoFaturamento = useMemo(() => {
    const hojeReferencia = new Date();

    if (filtroFinanceiro === "mes") {
      const ano = hojeReferencia.getFullYear();
      const mes = hojeReferencia.getMonth();
      const diasNoMes = hojeReferencia.getDate();
      const totaisPorDia = new Map<string, number>();

      for (let dia = 1; dia <= diasNoMes; dia += 1) {
        const chave = String(dia).padStart(2, "0");
        totaisPorDia.set(chave, 0);
      }

      for (const item of realizadosFiltrados) {
        const dataItem = criarDataHora(item.data_atendimento, item.horario);
        if (dataItem.getFullYear() === ano && dataItem.getMonth() === mes) {
          const chave = String(dataItem.getDate()).padStart(2, "0");
          totaisPorDia.set(chave, (totaisPorDia.get(chave) || 0) + (Number(item.valor) || 0));
        }
      }

      return Array.from(totaisPorDia.entries()).map(([dia, total]) => ({
        label: dia,
        valor: total,
      }));
    }

    const meses: Date[] = [];

    if (filtroFinanceiro === "inicio") {
      const primeiroRealizado = [...realizados]
        .sort((a, b) => a.data_atendimento.localeCompare(b.data_atendimento))[0];
      const inicio = primeiroRealizado
        ? criarDataHora(primeiroRealizado.data_atendimento, primeiroRealizado.horario)
        : new Date(hojeReferencia.getFullYear(), hojeReferencia.getMonth(), 1);

      const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      const fim = new Date(hojeReferencia.getFullYear(), hojeReferencia.getMonth(), 1);

      while (cursor <= fim) {
        meses.push(new Date(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      const quantidadeMeses = Number(filtroFinanceiro);
      for (let indice = quantidadeMeses - 1; indice >= 0; indice -= 1) {
        meses.push(new Date(hojeReferencia.getFullYear(), hojeReferencia.getMonth() - indice, 1));
      }
    }

    const totaisPorMes = new Map(meses.map((mes) => [chaveMes(mes), 0]));

    for (const item of realizadosFiltrados) {
      const dataItem = criarDataHora(item.data_atendimento, item.horario);
      const chave = chaveMes(dataItem);
      if (totaisPorMes.has(chave)) {
        totaisPorMes.set(chave, (totaisPorMes.get(chave) || 0) + (Number(item.valor) || 0));
      }
    }

    return meses.map((mes) => ({
      label: formatarMesCurto(mes),
      valor: totaisPorMes.get(chaveMes(mes)) || 0,
    }));
  }, [filtroFinanceiro, realizados, realizadosFiltrados]);

  const agendamentosPorDia = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>();

    for (const item of agendamentos) {
      const lista = mapa.get(item.data_atendimento) || [];
      lista.push(item);
      mapa.set(item.data_atendimento, lista);
    }

    return mapa;
  }, [agendamentos]);

  const agendamentosDia = diaSelecionado ? agendamentosPorDia.get(diaSelecionado) || [] : [];

  function calcularTotalServicos(servicos: string[]) {
    return servicos.reduce((soma, servico) => soma + (precoPorServico.get(servico) || 0), 0);
  }

  function abrirNovo() {
    const servicoInicial = servicosDisponiveis.includes("Mão") ? "Mão" : servicosDisponiveis[0] || "";

    setEditando(null);
    setNome("");
    setData(diaSelecionado || hojeISO);
    setHorario("");
    setServicosSelecionados(servicoInicial ? [servicoInicial] : []);
    setValor(servicoInicial ? String(precoPorServico.get(servicoInicial) || "") : "");
    setModal(true);
  }

  function abrirEditar(item: Agendamento) {
    setEditando(item);
    setNome(item.nome_cliente);
    setData(item.data_atendimento);
    setHorario(item.horario.slice(0, 5));
    setServicosSelecionados(item.servico ? item.servico.split(", ") : []);
    setValor(String(item.valor));
    setModal(true);
  }

  function alternarServico(nomeServico: string) {
    setServicosSelecionados((selecionados) => {
      const novaLista = selecionados.includes(nomeServico)
        ? selecionados.filter((servico) => servico !== nomeServico)
        : [...selecionados, nomeServico];

      setValor(String(calcularTotalServicos(novaLista)));
      return novaLista;
    });
  }

  async function salvar() {
    const valorNumerico = Number(valor);

    if (!nome.trim() || !data || !horario || servicosSelecionados.length === 0 || Number.isNaN(valorNumerico)) {
      alert("Preencha nome, data, horário, serviço e valor.");
      return;
    }

    const horarioNormalizado = horario.slice(0, 5);
    const existeHorarioOcupado = agendamentos.some((item) => {
      const status = item.status || "agendado";
      return (
        item.id !== editando?.id &&
        status !== "cancelado" &&
        item.data_atendimento === data &&
        item.horario.slice(0, 5) === horarioNormalizado
      );
    });

    if (existeHorarioOcupado) {
      alert("Já existe um agendamento neste dia e horário. Escolha outro horário.");
      return;
    }

    const payload = {
      nome_cliente: nome.trim(),
      data_atendimento: data,
      horario: horarioNormalizado,
      servico: servicosSelecionados.join(", "),
      valor: valorNumerico,
      status: editando?.status === "realizado" ? "realizado" : "agendado",
      forma_pagamento: editando?.status === "realizado" ? editando.forma_pagamento : null,
      tipo_resultado: editando?.status === "realizado" ? editando.tipo_resultado : null,
    };

    const resposta = editando
      ? await supabase.from("agendamentos").update(payload).eq("id", editando.id)
      : await supabase.from("agendamentos").insert(payload);

    if (resposta.error) {
      alert("Não foi possível salvar. Tente novamente.");
      return;
    }

    setModal(false);
    await carregar();
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este agendamento?")) return;

    const { error } = await supabase.from("agendamentos").delete().eq("id", id);

    if (error) {
      alert("Não foi possível excluir.");
      return;
    }

    await carregar();
  }

  async function confirmarAtendimento() {
    if (!pagamentoModal) return;

    const { error } = await supabase
      .from("agendamentos")
      .update({
        status: "realizado",
        tipo_resultado: "realizado",
        forma_pagamento: formaPagamento,
      })
      .eq("id", pagamentoModal.id);

    if (error) {
      alert("Não foi possível confirmar o atendimento.");
      return;
    }

    setPagamentoModal(null);
    await carregar();
  }

  async function marcarFalta(id: number) {
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado", tipo_resultado: "nao_compareceu", forma_pagamento: null })
      .eq("id", id);

    if (error) {
      alert("Não foi possível marcar falta.");
      return;
    }

    await carregar();
  }

  async function salvarPreco(id: number, novoValor: string) {
    const valorNumerico = Number(novoValor);
    if (Number.isNaN(valorNumerico)) return;

    const { error } = await supabase.from("configuracoes_precos").update({ valor: valorNumerico }).eq("id", id);

    if (error) {
      alert("Não foi possível salvar o preço.");
      return;
    }

    await carregar();
  }

  if (!logado) {
    return (
      <>
        <main className="login">
          <div className="loginBox">
            <div className="logo">💅</div>
            <h1>Agenda</h1>
            <p>Manicure & Pedicure</p>

            <input
              placeholder="Login"
              value={login}
              onChange={(evento) => setLogin(evento.target.value)}
              onKeyDown={(evento) => evento.key === "Enter" && entrar()}
            />

            <button onClick={entrar}>Entrar</button>
          </div>
        </main>

      </>
    );
  }

  return (
    <>
      <main className="app">
        <header className="topo">
          <div>
            <span>Agenda profissional</span>
            <h1>Olá, Suzi Assis</h1>
            <p>Manicure & Pedicure</p>
          </div>

          <button onClick={() => setLogado(false)}>Sair</button>
        </header>

        {erro && <p className="erro">{erro}</p>}
        {carregando && <p className="carregando">Carregando...</p>}

        {aba === "agenda" && (
          <section className="pageStack agendaPage">
            <section className="resumo resumoAgenda">
              <div>
                <span>Faturamento mês</span>
                <strong>{formatarMoeda(faturamentoMesAtual)}</strong>
              </div>
              <small>{textoAtendimentosRealizados(realizadosMesAtual)}</small>
            </section>

            <section className="calendarioPainel">
              <div className="calHeader">
                <button onClick={mesAnterior} aria-label="Mês anterior">‹</button>
                <h2>{nomeMes}</h2>
                <button onClick={proximoMes} aria-label="Próximo mês">›</button>
              </div>

              <div className="semanaLinha">
                <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
              </div>

              <div className="calendario">
                {diasMes.map((dia, indice) => {
                  if (!dia) return <span key={`vazio-${indice}`} className="dia vazio" />;

                  const qtd = (agendamentosPorDia.get(dia) || []).filter((item) => {
                    const status = item.status || "agendado";
                    return criarDataHora(item.data_atendimento, item.horario) >= hoje && status === "agendado";
                  }).length;

                  return (
                    <button
                      key={dia}
                      className={`dia ${qtd > 0 ? "comAgenda" : ""} ${diaSelecionado === dia ? "selecionado" : ""} ${dia === hojeISO ? "hoje" : ""}`}
                      onClick={() => setDiaSelecionado(dia)}
                    >
                      <strong>{Number(dia.slice(8, 10))}</strong>
                      {qtd > 0 && <span>{qtd}</span>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="agendaBloco">
              <div className="tituloLinha">
                <div>
                  <span>Agenda do dia</span>
                  <h2>{diaSelecionado ? formatarDataTitulo(diaSelecionado) : "Selecione uma data"}</h2>
                </div>
                <button onClick={abrirNovo}>+ Agendar</button>
              </div>

              <div className="listaCards">
                {agendamentosDia.length === 0 && <p className="vazioTexto">Sem agendamentos para este dia.</p>}
                {agendamentosDia.map((item) => (
                  <CardAgendamento key={item.id} item={item} onEditar={abrirEditar} onExcluir={excluir} />
                ))}
              </div>
            </section>

            <section className="agendaBloco">
              <div className="tituloLinha simples">
                <div>
                  <span>Próximos horários</span>
                  <h2>{textoAtendimentos(futuros.length)}</h2>
                </div>
              </div>

              <div className="listaCards">
                {futuros.length === 0 && <p className="vazioTexto">Nenhum próximo atendimento.</p>}
                {futuros.map((item) => (
                  <CardAgendamento key={item.id} item={item} onEditar={abrirEditar} onExcluir={excluir} />
                ))}
              </div>
            </section>
          </section>
        )}

        {aba === "atendimentos" && (
          <section className="pageStack atendimentosPage">
            <header className="paginaTitulo">
              <span>Controle de conclusão</span>
              <h2>Atendimentos</h2>
            </header>

            <section className="subSecaoAtendimento confirmarSecao">
              <div className="subTituloLinha">
                <div>
                  <span>Status pendente</span>
                  <h3>Para confirmar</h3>
                </div>
                <strong>{confirmar.length}</strong>
              </div>

              <div className="listaCards">
                {confirmar.length === 0 && <p className="vazioTexto">Nenhum atendimento pendente.</p>}
                {confirmar.map((item) => (
                  <CardConfirmacao
                    key={item.id}
                    item={item}
                    onConfirmar={() => setPagamentoModal(item)}
                    onEditar={abrirEditar}
                    onFalta={marcarFalta}
                  />
                ))}
              </div>
            </section>

            <section className="subSecaoAtendimento realizadosSecao">
              <div className="subTituloLinha">
                <div>
                  <span>Histórico confirmado</span>
                  <h3>Realizados</h3>
                </div>
                <strong>{realizados.length}</strong>
              </div>

              <div className="listaCards">
                {realizados.length === 0 && <p className="vazioTexto">Nenhum atendimento realizado ainda.</p>}
                {realizados.map((item) => (
                  <CardAgendamento key={item.id} item={item} onEditar={abrirEditar} onExcluir={excluir} mostrarPagamento />
                ))}
              </div>
            </section>
          </section>
        )}

        {aba === "financeiro" && (
          <section className="pageStack financeiroPage">
            <section className="resumo resumoFinanceiro">
              <div>
                <span>Faturamento recebido</span>
                <strong>{formatarMoeda(financeiro.faturamento)}</strong>
              </div>
              <small>{tituloFiltroFinanceiro(filtroFinanceiro)}</small>
            </section>

            <section className="financeiroBox">
              <div className="financeiroHeader">
                <div>
                  <span>Visão financeira</span>
                  <h2>Ganhos e pagamentos</h2>
                </div>

                <label className="filtroFinanceiro">
                  <span>Período</span>
                  <select value={filtroFinanceiro} onChange={(evento) => setFiltroFinanceiro(evento.target.value as FiltroFinanceiro)}>
                    <option value="mes">Último mês</option>
                    <option value="3">Últimos 3 meses</option>
                    <option value="6">Últimos 6 meses</option>
                    <option value="12">Último 1 ano</option>
                    <option value="inicio">Desde o início</option>
                  </select>
                </label>
              </div>

              <div className="dash">
                <article className="metricCard metricPrimary">
                  <span>Atendimentos</span>
                  <strong>{financeiro.atendimentos}</strong>
                </article>
                {FORMAS_PAGAMENTO.map((forma) => (
                  <article className="metricCard" key={forma}>
                    <span>{forma}</span>
                    <strong>{formatarMoeda(financeiro.totais[forma])}</strong>
                  </article>
                ))}
              </div>

              <GraficoLinhaFaturamento
                dados={graficoFaturamento}
                titulo={`Faturamento - ${tituloFiltroFinanceiro(filtroFinanceiro)}`}
              />
            </section>
          </section>
        )}

        {aba === "config" && (
          <section className="pageStack configPage">
            <section className="configBox">
              <div className="paginaTitulo">
                <span>Tabela de valores</span>
                <h2>Serviços e preços</h2>
              </div>

              <div className="precosLista">
                {precos.map((preco) => (
                  <label className="precoLinha" key={preco.id}>
                    <span>{preco.servico}</span>
                    <div className="precoInput">
                      <small>R$</small>
                      <input
                        aria-label={`Valor de ${preco.servico}`}
                        type="number"
                        defaultValue={preco.valor}
                        min="0"
                        step="0.01"
                        onBlur={(evento) => salvarPreco(preco.id, evento.target.value)}
                      />
                    </div>
                  </label>
                ))}
              </div>

              <p className="aviso">Ao mudar o valor, novos agendamentos já usam o preço atualizado.</p>
            </section>
          </section>
        )}

        <nav className="menu" aria-label="Menu principal">
          <MenuBotao ativo={aba === "agenda"} onClick={() => setAba("agenda")} emoji="📅" texto="Agenda" />
          <MenuBotao ativo={aba === "atendimentos"} onClick={() => setAba("atendimentos")} emoji="✓" texto="Atendimentos" />
          <MenuBotao ativo={aba === "financeiro"} onClick={() => setAba("financeiro")} emoji="R$" texto="Financeiro" />
          <MenuBotao ativo={aba === "config"} onClick={() => setAba("config")} emoji="⚙" texto="Preços" />
        </nav>
      </main>

      {modal && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modalBox modalBoxAgendamento">
            <div className="modalHeader">
              <div>
                <span>Agenda</span>
                <h2>{editando ? "Editar agendamento" : "Novo agendamento"}</h2>
              </div>
              <button className="modalClose" aria-label="Fechar modal" onClick={() => setModal(false)}>×</button>
            </div>

            <div className="modalCampos">
              <div className="campo">
                <label>Nome da cliente</label>
                <input placeholder="Ex: Fernanda" value={nome} onChange={(evento) => setNome(evento.target.value)} />
              </div>

              <div className="formGridDataHora">
                <div className="campo">
                  <label>Data</label>
                  <input type="date" value={data} onChange={(evento) => setData(evento.target.value)} />
                </div>

                <div className="campo">
                  <label>Horário</label>
                  <input type="time" value={horario} onChange={(evento) => setHorario(evento.target.value)} />
                </div>
              </div>

              <div className="campo campoServicos">
                <label>Serviços</label>
                <div className="servicosChecklist">
                  {servicosDisponiveis.map((item) => (
                    <label key={item} className="servicoCheck">
                      <input type="checkbox" checked={servicosSelecionados.includes(item)} onChange={() => alternarServico(item)} />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="campo">
                <label>Valor cobrado</label>
                <input type="number" placeholder="Ex: 60" value={valor} min="0" step="0.01" onChange={(evento) => setValor(evento.target.value)} />
              </div>
            </div>

            <div className="modalActions">
              <button className="cancelar" onClick={() => setModal(false)}>Cancelar</button>
              <button onClick={salvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {pagamentoModal && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modalBox">
            <div className="modalHeader">
              <div>
                <span>Pagamento</span>
                <h2>Confirmar atendimento</h2>
              </div>
              <button className="modalClose" aria-label="Fechar modal" onClick={() => setPagamentoModal(null)}>×</button>
            </div>

            <p className="modalResumo">{pagamentoModal.nome_cliente} · {formatarMoeda(Number(pagamentoModal.valor))}</p>

            <div className="campo">
              <label>Forma de pagamento</label>
              <select value={formaPagamento} onChange={(evento) => setFormaPagamento(evento.target.value as FormaPagamento)}>
                {FORMAS_PAGAMENTO.map((forma) => <option key={forma}>{forma}</option>)}
              </select>
            </div>

            <div className="modalActions">
              <button className="cancelar" onClick={() => setPagamentoModal(null)}>Cancelar</button>
              <button onClick={confirmarAtendimento}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuBotao({ ativo, onClick, emoji, texto }: { ativo: boolean; onClick: () => void; emoji: string; texto: string }) {
  return (
    <button className={ativo ? "ativo" : ""} onClick={onClick} aria-pressed={ativo}>
      <b>{emoji}</b>
      <span>{texto}</span>
    </button>
  );
}

function CardConfirmacao({
  item,
  onConfirmar,
  onEditar,
  onFalta,
}: {
  item: Agendamento;
  onConfirmar: () => void;
  onEditar: (item: Agendamento) => void;
  onFalta: (id: number) => void;
}) {
  return (
    <article className="card cardConfirmacao">
      <div className="cardConteudo">
        <div className="cardCabecalho">
          <h3>{item.nome_cliente}</h3>
          <span className="statusPill pendente">Para confirmar</span>
        </div>
        <p>{formatarDataCompleta(item.data_atendimento, item.horario)}</p>
        <div className="cardTags">
          <span className="servicoTag">{item.servico}</span>
        </div>
      </div>

      <div className="lado">
        <strong>{formatarMoeda(Number(item.valor))}</strong>
        <div className="cardActions">
          <button className="primaryMini" onClick={onConfirmar}>Confirmar</button>
          <button onClick={() => onEditar(item)}>Remarcar</button>
          <button className="danger" onClick={() => onFalta(item.id)}>Falta</button>
        </div>
      </div>
    </article>
  );
}

function CardAgendamento({
  item,
  onEditar,
  onExcluir,
  mostrarPagamento = false,
}: {
  item: Agendamento;
  onEditar: (item: Agendamento) => void;
  onExcluir: (id: number) => void;
  mostrarPagamento?: boolean;
}) {
  const status = statusVisual(item);

  return (
    <article className="card">
      <div className="cardConteudo">
        <div className="cardCabecalho">
          <h3>{item.nome_cliente}</h3>
          <span className={`statusPill ${status.classe}`}>{status.texto}</span>
        </div>
        <p>{formatarDataCompleta(item.data_atendimento, item.horario)}</p>
        <div className="cardTags">
          <span className="servicoTag">{item.servico}</span>
          {mostrarPagamento && <span className="pagamentoTag">{item.forma_pagamento || "Sem pagamento"}</span>}
        </div>
      </div>

      <div className="lado">
        <strong>{formatarMoeda(Number(item.valor))}</strong>
        <div className="cardActions">
          <button onClick={() => onEditar(item)}>Editar</button>
          <button className="danger" onClick={() => onExcluir(item.id)}>Excluir</button>
        </div>
      </div>
    </article>
  );
}


function GraficoLinhaFaturamento({ dados, titulo }: { dados: { label: string; valor: number }[]; titulo: string }) {
  const largura = 360;
  const altura = 230;
  const paddingEsquerda = 52;
  const paddingDireita = 18;
  const paddingTopo = 26;
  const paddingBaixo = 42;
  const total = dados.reduce((soma, item) => soma + item.valor, 0);
  const maiorValor = Math.max(...dados.map((item) => item.valor), 1);
  const escalaMaxima = Math.ceil(maiorValor / 50) * 50 || 50;
  const larguraUtil = largura - paddingEsquerda - paddingDireita;
  const alturaUtil = altura - paddingTopo - paddingBaixo;

  const pontos = dados.map((item, indice) => {
    const x = dados.length === 1 ? paddingEsquerda + larguraUtil / 2 : paddingEsquerda + (indice / (dados.length - 1)) * larguraUtil;
    const y = paddingTopo + alturaUtil - (item.valor / escalaMaxima) * alturaUtil;
    return { ...item, x, y };
  });

  const caminho = pontos.map((ponto, indice) => `${indice === 0 ? "M" : "L"} ${ponto.x} ${ponto.y}`).join(" ");
  const area = pontos.length
    ? `${caminho} L ${pontos[pontos.length - 1].x} ${altura - paddingBaixo} L ${pontos[0].x} ${altura - paddingBaixo} Z`
    : "";
  const linhasGrade = Array.from({ length: 5 }, (_, indice) => {
    const valor = (escalaMaxima / 4) * indice;
    const y = paddingTopo + alturaUtil - (valor / escalaMaxima) * alturaUtil;
    return { valor, y };
  });
  const mostrarRotulo = (indice: number) => pontos.length <= 6 || indice === 0 || indice === pontos.length - 1 || indice % Math.ceil(pontos.length / 5) === 0;

  return (
    <section className="graficoProfissionalBox">
      <div className="graficoProfissionalTopo">
        <div>
          <span>Ganhos confirmados</span>
          <h3>{titulo}</h3>
        </div>
        <strong>{formatarMoeda(total)}</strong>
      </div>


      <svg className="graficoProfissional" viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={titulo}>
        <defs>
          <linearGradient id="gradienteFaturamento" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#db2777" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#db2777" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {linhasGrade.map((linha) => (
          <g key={linha.valor}>
            <line className="gradeGrafico" x1={paddingEsquerda} y1={linha.y} x2={largura - paddingDireita} y2={linha.y} />
            <text className="eixoValor" x={paddingEsquerda - 8} y={linha.y + 4} textAnchor="end">
              {formatarMoeda(linha.valor).replace("R$", "")}
            </text>
          </g>
        ))}

        <path className="areaGraficoProfissional" d={area} />
        <path className="linhaGraficoProfissional" d={caminho} />

        {pontos.map((ponto, indice) => (
          <g key={`${ponto.label}-${indice}`}>
            <circle className="pontoGrafico" cx={ponto.x} cy={ponto.y} r="4.5" />
            {mostrarRotulo(indice) && (
              <text className="eixoData" x={ponto.x} y={altura - 14} textAnchor="middle">
                {ponto.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </section>
  );
}
