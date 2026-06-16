"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type StatusAgendamento = "agendado" | "realizado" | "cancelado";
type FormaPagamento = "Pix" | "Dinheiro" | "Cartão crédito" | "Cartão débito" | "Permuta";
type Aba = "agenda" | "confirmar" | "historico" | "financeiro" | "config";
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

  useEffect(() => {
    if (logado) void carregar();
  }, [logado, carregar]);

  function entrar() {
    if (login.trim().toLowerCase() === "suziane") {
      setLogado(true);
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

    const payload = {
      nome_cliente: nome.trim(),
      data_atendimento: data,
      horario,
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

        <Estilos />
      </>
    );
  }

  return (
    <>
      <main className="app">
        <header className="topo">
          <div>
            <h1>Olá, Suzi Assis</h1>
            <p>Manicure & Pedicure</p>
          </div>

          <button onClick={() => setLogado(false)}>Sair</button>
        </header>

        {erro && <p className="erro">{erro}</p>}
        {carregando && <p className="carregando">Carregando...</p>}

        {aba === "agenda" && (
          <>
            <section className="resumo">
              <span>Faturamento confirmado no filtro atual</span>
              <strong>{formatarMoeda(financeiro.faturamento)}</strong>
            </section>

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

            <div className="tituloLinha">
              <h2>Agenda do dia</h2>
              <button onClick={abrirNovo}>+ Agendar</button>
            </div>

            {diaSelecionado && (
              <section className="box">
                <h2 className="dataTitulo">
                  {new Date(`${diaSelecionado}T00:00:00`).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>

                {agendamentosDia.length === 0 && <p>Sem agendamentos.</p>}
                {agendamentosDia.map((item) => (
                  <CardAgendamento key={item.id} item={item} onEditar={abrirEditar} onExcluir={excluir} />
                ))}
              </section>
            )}

            <div className="tituloLinha"><h2>Próximos</h2></div>
            {futuros.length === 0 && <p className="vazioTexto">Nenhum próximo atendimento.</p>}
            {futuros.map((item) => (
              <CardAgendamento key={item.id} item={item} onEditar={abrirEditar} onExcluir={excluir} />
            ))}
          </>
        )}

        {aba === "confirmar" && (
          <div className="box">
            <h2>Confirmar atendimentos</h2>
            {confirmar.length === 0 && <p>Nenhum atendimento pendente.</p>}
            {confirmar.map((item) => (
              <div className="card" key={item.id}>
                <div className="cardConteudo">
                  <h3>{item.nome_cliente}</h3>
                  <p>{formatarDataCompleta(item.data_atendimento, item.horario)}</p>
                  <span>{item.servico}</span>
                </div>

                <div className="lado">
                  <strong>{formatarMoeda(Number(item.valor))}</strong>
                  <button onClick={() => setPagamentoModal(item)}>Confirmar</button>
                  <button onClick={() => abrirEditar(item)}>Remarcar</button>
                  <button className="danger" onClick={() => marcarFalta(item.id)}>Falta</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {aba === "historico" && (
          <div className="box">
            <h2>Atendimentos realizados</h2>
            {realizados.length === 0 && <p>Nenhum atendimento realizado ainda.</p>}
            {realizados.map((item) => (
              <CardAgendamento key={item.id} item={item} onEditar={abrirEditar} onExcluir={excluir} mostrarPagamento />
            ))}
          </div>
        )}

        {aba === "financeiro" && (
          <>
            <section className="resumo">
              <span>Faturamento recebido</span>
              <strong>{formatarMoeda(financeiro.faturamento)}</strong>
            </section>

            <div className="box">
              <h2>Financeiro</h2>

              <select value={filtroFinanceiro} onChange={(evento) => setFiltroFinanceiro(evento.target.value as FiltroFinanceiro)}>
                <option value="mes">Este mês</option>
                <option value="3">Últimos 3 meses</option>
                <option value="6">Últimos 6 meses</option>
                <option value="12">Último 1 ano</option>
                <option value="inicio">Desde o início</option>
              </select>

              <div className="dash">
                <div><span>Atendimentos</span><strong>{financeiro.atendimentos}</strong></div>
                {FORMAS_PAGAMENTO.map((forma) => (
                  <div key={forma}><span>{forma}</span><strong>{formatarMoeda(financeiro.totais[forma])}</strong></div>
                ))}
              </div>

              <h3>Pagamentos recebidos</h3>
              <div className="pagamentosGrafico">
                {FORMAS_PAGAMENTO.map((forma) => {
                  const total = financeiro.faturamento || 1;
                  const porcentagem = Math.round((financeiro.totais[forma] / total) * 100);

                  return (
                    <div className="linhaGrafico" key={forma}>
                      <p>{forma} <b>{formatarMoeda(financeiro.totais[forma])}</b></p>
                      <div><span style={{ width: `${porcentagem}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {aba === "config" && (
          <div className="box">
            <h2>Valores dos serviços</h2>
            {precos.map((preco) => (
              <div className="preco" key={preco.id}>
                <label>{preco.servico}</label>
                <input type="number" defaultValue={preco.valor} min="0" step="0.01" onBlur={(evento) => salvarPreco(preco.id, evento.target.value)} />
              </div>
            ))}

            <p className="aviso">Ao mudar o valor, novos agendamentos já usam o preço atualizado.</p>
          </div>
        )}

        <nav className="menu" aria-label="Menu principal">
          <MenuBotao ativo={aba === "agenda"} onClick={() => setAba("agenda")} emoji="📅" texto="Agenda" />
          <MenuBotao ativo={aba === "confirmar"} onClick={() => setAba("confirmar")} emoji="⏳" texto="Confirmar" />
          <MenuBotao ativo={aba === "historico"} onClick={() => setAba("historico")} emoji="✅" texto="Realizados" />
          <MenuBotao ativo={aba === "financeiro"} onClick={() => setAba("financeiro")} emoji="💰" texto="Financeiro" />
          <MenuBotao ativo={aba === "config"} onClick={() => setAba("config")} emoji="⚙️" texto="Preços" />
        </nav>
      </main>

      {modal && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modalBox">
            <h2>{editando ? "Editar agendamento" : "Novo agendamento"}</h2>

            <div className="campo">
              <label>Nome da cliente</label>
              <input placeholder="Ex: Fernanda" value={nome} onChange={(evento) => setNome(evento.target.value)} />
            </div>

            <div className="formGrid">
              <div className="campo">
                <label>Data</label>
                <input type="date" value={data} onChange={(evento) => setData(evento.target.value)} />
              </div>

              <div className="campo">
                <label>Horário</label>
                <input type="time" value={horario} onChange={(evento) => setHorario(evento.target.value)} />
              </div>
            </div>

            <div className="servicosChecklist">
              {servicosDisponiveis.map((item) => (
                <label key={item} className="servicoCheck">
                  <input type="checkbox" checked={servicosSelecionados.includes(item)} onChange={() => alternarServico(item)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>

            <div className="campo">
              <label>Valor cobrado</label>
              <input type="number" placeholder="Ex: 60" value={valor} min="0" step="0.01" onChange={(evento) => setValor(evento.target.value)} />
            </div>

            <button onClick={salvar}>Salvar</button>
            <button className="cancelar" onClick={() => setModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {pagamentoModal && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modalBox">
            <h2>Confirmar atendimento</h2>
            <p>{pagamentoModal.nome_cliente} - {formatarMoeda(Number(pagamentoModal.valor))}</p>

            <div className="campo">
              <label>Forma de pagamento</label>
              <select value={formaPagamento} onChange={(evento) => setFormaPagamento(evento.target.value as FormaPagamento)}>
                {FORMAS_PAGAMENTO.map((forma) => <option key={forma}>{forma}</option>)}
              </select>
            </div>

            <button onClick={confirmarAtendimento}>Confirmar</button>
            <button className="cancelar" onClick={() => setPagamentoModal(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <Estilos />
    </>
  );
}

function MenuBotao({ ativo, onClick, emoji, texto }: { ativo: boolean; onClick: () => void; emoji: string; texto: string }) {
  return (
    <button className={ativo ? "ativo" : ""} onClick={onClick}>
      {emoji}<span>{texto}</span>
    </button>
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
  return (
    <div className="card">
      <div className="cardConteudo">
        <h3>{item.nome_cliente}</h3>
        <p>{formatarDataCompleta(item.data_atendimento, item.horario)}</p>
        <span>{mostrarPagamento ? `${item.servico} • ${item.forma_pagamento || "Sem pagamento"}` : item.servico}</span>
      </div>

      <div className="lado">
        <strong>{formatarMoeda(Number(item.valor))}</strong>
        <button onClick={() => onEditar(item)}>Editar</button>
        <button className="danger" onClick={() => onExcluir(item.id)}>Excluir</button>
      </div>
    </div>
  );
}

function Estilos() {
  return (
    <style jsx global>{`
      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        touch-action: manipulation;
        -webkit-text-size-adjust: 100%;
        font-family: Arial, Helvetica, sans-serif;
        background: #ffe4ef;
        color: #28111d;
      }

      button { border: 0; cursor: pointer; font-weight: 800; }
      input, select, textarea, button { font-size: 16px; }

      input, select {
        width: 100%;
        padding: 15px;
        border-radius: 16px;
        border: 1px solid #f9a8d4;
        outline: none;
        background: white;
      }

      .login {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: linear-gradient(135deg, #f9a8d4, #fff1f2);
      }

      .loginBox {
        width: 100%;
        max-width: 390px;
        background: white;
        padding: 30px;
        border-radius: 34px;
        text-align: center;
        box-shadow: 0 25px 70px rgba(190, 24, 93, 0.25);
      }

      .logo {
        width: 70px;
        height: 70px;
        margin: 0 auto 18px;
        border-radius: 24px;
        background: #fce7f3;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 34px;
      }

      .loginBox h1 { margin: 0; color: #be185d; font-size: 32px; }
      .loginBox p { color: #777; margin-bottom: 22px; }

      .loginBox button, .modalBox button {
        width: 100%;
        padding: 15px;
        border-radius: 16px;
        background: #db2777;
        color: white;
        margin-top: 14px;
      }

      .app {
        width: 100%;
        max-width: 480px;
        margin: 0 auto;
        min-height: 100dvh;
        padding: 16px 16px calc(112px + env(safe-area-inset-bottom));
        background: #fff7fb;
        overflow-x: hidden;
      }

      .topo {
        background: linear-gradient(135deg, #db2777, #fb7185);
        color: white;
        padding: 22px;
        border-radius: 30px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        box-shadow: 0 18px 40px rgba(219, 39, 119, 0.3);
      }

      .topo h1 { margin: 4px 0; font-size: clamp(23px, 6vw, 29px); }
      .topo p { margin: 0; opacity: 0.9; }
      .topo button { background: rgba(255, 255, 255, 0.25); color: white; border-radius: 14px; padding: 9px 12px; }

      .resumo, .box {
        background: white;
        padding: 20px;
        border-radius: 26px;
        margin-top: 18px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
      }

      .resumo span { color: #777; }
      .resumo strong { display: block; font-size: clamp(28px, 8vw, 34px); margin-top: 6px; color: #be185d; }
      .erro { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 16px; font-weight: 700; }
      .carregando, .vazioTexto { color: #777; }

      .tituloLinha { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 24px 0 14px; }
      .tituloLinha h2 { margin: 0; font-size: 23px; }
      .tituloLinha button { background: #db2777; color: white; border-radius: 16px; padding: 12px 15px; white-space: nowrap; }

      .calHeader { display: flex; align-items: center; justify-content: space-between; margin: 22px 0 14px; }
      .calHeader h2 { margin: 0; text-transform: capitalize; color: #be185d; font-size: 22px; font-weight: 800; }
      .calHeader button { width: 42px; height: 42px; border-radius: 50%; background: #fce7f3; color: #be185d; font-size: 24px; }

      .semanaLinha, .calendario { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
      .semanaLinha { margin-bottom: 8px; }
      .semanaLinha span { text-align: center; font-size: 12px; color: #888; font-weight: 700; }

      .calendario {
        gap: 8px;
        background: white;
        padding: 14px;
        border-radius: 24px;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07);
      }

      .dia {
        min-width: 0;
        min-height: 52px;
        border-radius: 16px;
        background: #fff1f7;
        color: #777;
        position: relative;
        transition: 0.2s;
      }

      .dia.vazio { background: transparent; pointer-events: none; }
      .dia strong { font-size: 15px; }
      .dia:hover { transform: scale(1.04); }
      .dia.hoje { border: 3px solid #111827; box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.15); }
      .dia.comAgenda { background: #fce7f3; color: #be185d; }
      .dia.selecionado { background: #db2777; color: white; }

      .dia span {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #111827;
        color: white;
        border-radius: 999px;
        width: 19px;
        height: 19px;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .dataTitulo { text-transform: capitalize; color: #be185d; font-size: 18px; }

      .card {
        background: white;
        border-radius: 28px;
        padding: 18px;
        margin-bottom: 14px;
        display: flex;
        justify-content: space-between;
        gap: 14px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
      }

      .cardConteudo { min-width: 0; }
      .card h3 { margin: 0 0 4px; font-size: 18px; word-break: break-word; }
      .card p { margin: 6px 0; color: #666; font-size: 13px; text-transform: capitalize; }
      .card span { display: inline-block; background: #fce7f3; color: #be185d; padding: 7px 11px; border-radius: 999px; font-size: 13px; font-weight: 800; }

      .lado { text-align: right; min-width: 96px; }
      .lado strong { color: #be185d; display: block; margin-bottom: 8px; }
      .lado button { display: block; width: 100%; background: #f3f4f6; color: #374151; padding: 8px; border-radius: 10px; margin-top: 6px; font-size: 12px; }
      .lado .danger { background: #fee2e2; color: #dc2626; }

      .dash { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
      .dash div { background: #fff1f7; padding: 14px; border-radius: 18px; min-width: 0; }
      .dash span { display: block; font-size: 13px; color: #777; }
      .dash strong { display: block; font-size: clamp(19px, 5vw, 26px); margin-top: 4px; color: #be185d; word-break: break-word; }

      .pagamentosGrafico { margin-top: 18px; }
      .linhaGrafico p { display: flex; justify-content: space-between; gap: 12px; margin: 14px 0 6px; font-size: 14px; }
      .linhaGrafico div { height: 12px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
      .linhaGrafico span { display: block; height: 100%; background: linear-gradient(90deg, #fb7185, #db2777); }

      .menu {
        position: fixed;
        left: 50%;
        bottom: calc(14px + env(safe-area-inset-bottom));
        transform: translateX(-50%);
        width: calc(100% - 28px);
        max-width: 440px;
        background: #111827;
        border-radius: 24px;
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
        z-index: 10;
      }

      .menu button { background: transparent; color: white; border-radius: 16px; padding: 9px 3px; min-width: 0; }
      .menu button span { display: block; font-size: 10px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; }
      .menu .ativo { background: #db2777; }

      .modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        z-index: 20;
      }

      .modalBox {
        width: 100%;
        max-width: 390px;
        max-height: calc(100dvh - 36px);
        overflow-y: auto;
        background: white;
        border-radius: 28px;
        padding: 22px;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.28);
      }

      .modalBox h2 { margin: 0 0 10px; }
      .modalBox p { color: #555; margin: 10px 0 16px; }
      .modalBox .cancelar { background: #f3f4f6; color: #374151; }

      .campo, .preco { margin-top: 12px; }
      .campo label, .preco label { display: block; font-size: 13px; font-weight: 800; color: #be185d; margin-bottom: 6px; }
      .formGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .aviso { color: #777; font-size: 14px; }

      .servicosChecklist { display: grid; gap: 10px; margin-top: 12px; }
      .servicoCheck { display: flex; align-items: center; gap: 10px; background: #fff1f7; color: #be185d; padding: 12px; border-radius: 14px; font-weight: 800; }
      .servicoCheck input { width: 20px; height: 20px; margin: 0; accent-color: #db2777; flex: none; }
      .servicoCheck span { flex: 1; }

      @media (max-width: 380px) {
        .app { padding-left: 10px; padding-right: 10px; }
        .calendario { gap: 5px; padding: 10px; }
        .dia { min-height: 46px; border-radius: 13px; }
        .card { flex-direction: column; }
        .lado { text-align: left; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .lado strong { grid-column: 1 / -1; }
        .lado button { margin-top: 0; }
        .formGrid { grid-template-columns: 1fr; }
        .menu button span { font-size: 9px; }
      }
    `}</style>
  );
}
