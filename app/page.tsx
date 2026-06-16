"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Agendamento = {
  id: number;
  nome_cliente: string;
  data_atendimento: string;
  horario: string;
  servico: string;
  valor: number;
  status?: string;
  forma_pagamento?: string;
  tipo_resultado?: string;
};

type Preco = {
  id: number;
  servico: string;
  valor: number;
};

export default function Home() {
  const [login, setLogin] = useState("");
  const [logado, setLogado] = useState(false);

  const [aba, setAba] = useState("agenda");

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [precos, setPrecos] = useState<Preco[]>([]);

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Agendamento | null>(null);

  const [diaSelecionado, setDiaSelecionado] =
    useState<string | null>(null);

  const hoje = new Date();

  const [mesAtual, setMesAtual] = useState(
    new Date().getMonth()
  );

  const [anoAtual, setAnoAtual] = useState(
    new Date().getFullYear()
  );

  const [filtroFinanceiro, setFiltroFinanceiro] =
    useState("mes");

  const [pagamentoModal, setPagamentoModal] =
    useState<Agendamento | null>(null);

  const [formaPagamento, setFormaPagamento] =
    useState("Pix");

  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
const [servicosSelecionados, setServicosSelecionados] = useState<string[]>(["Mão"]);  const [valor, setValor] = useState("");

  async function carregar() {
    const { data: agenda } = await supabase
      .from("agendamentos")
      .select("*")
      .order("data_atendimento", {
        ascending: true,
      })
      .order("horario", {
        ascending: true,
      });

    const { data: listaPrecos } = await supabase
      .from("configuracoes_precos")
      .select("*");

    setAgendamentos(agenda || []);
    setPrecos(listaPrecos || []);
  }

  useEffect(() => {
    if (logado) carregar();
  }, [logado]);

  function entrar() {
    if (
      login.trim().toLowerCase() === "suziane"
    ) {
      setLogado(true);
    }
  }

  function criarDataHora(item: Agendamento) {
    return new Date(
      `${item.data_atendimento}T${item.horario}`
    );
  }

  function formatarDataCompleta(
    dataISO: string,
    hora: string
  ) {
    const d = new Date(dataISO + "T00:00:00");

    return (
      d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }) +
      " às " +
      hora.slice(0, 5)
    );
  }

  const nomeMes = new Date(
    anoAtual,
    mesAtual,
    1
  ).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const diasNoMes = new Date(
    anoAtual,
    mesAtual + 1,
    0
  ).getDate();

  const diasMes = Array.from(
    { length: diasNoMes },
    (_, i) => {
      const d = new Date(
        anoAtual,
        mesAtual,
        i + 1
      );

      return d.toISOString().slice(0, 10);
    }
  );

  function proximoMes() {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual((a) => a + 1);
    } else {
      setMesAtual((m) => m + 1);
    }
  }

  function mesAnterior() {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual((a) => a - 1);
    } else {
      setMesAtual((m) => m - 1);
    }
  }

  const futuros = agendamentos.filter(
    (item) =>
      criarDataHora(item) >= hoje &&
      item.status !== "realizado"
  );

  const confirmar = agendamentos.filter(
    (item) =>
      criarDataHora(item) < hoje &&
      item.status !== "realizado" &&
      item.status !== "cancelado"
  );

  const realizados = agendamentos.filter(
    (item) =>
      item.status === "realizado"
  );

  async function confirmarAtendimento() {
    if (!pagamentoModal) return;

    await supabase
      .from("agendamentos")
      .update({
        status: "realizado",
        tipo_resultado: "realizado",
        forma_pagamento: formaPagamento,
      })
      .eq("id", pagamentoModal.id);

    setPagamentoModal(null);

    carregar();
  }

  async function marcarFalta(
    id: number
  ) {
    await supabase
      .from("agendamentos")
      .update({
        status: "cancelado",
        tipo_resultado:
          "nao_compareceu",
      })
      .eq("id", id);

    carregar();
  }

  const faturamentoMes =
    realizados.reduce(
      (acc, item) =>
        acc + Number(item.valor),
      0
    );

  const pix = realizados
    .filter(
      (i) =>
        i.forma_pagamento === "Pix"
    )
    .reduce(
      (s, i) => s + Number(i.valor),
      0
    );

  const dinheiro = realizados
    .filter(
      (i) =>
        i.forma_pagamento ===
        "Dinheiro"
    )
    .reduce(
      (s, i) => s + Number(i.valor),
      0
    );

  const credito = realizados
    .filter(
      (i) =>
        i.forma_pagamento ===
        "Cartão crédito"
    )
    .reduce(
      (s, i) => s + Number(i.valor),
      0
    );

  const debito = realizados
    .filter(
      (i) =>
        i.forma_pagamento ===
        "Cartão débito"
    )
    .reduce(
      (s, i) => s + Number(i.valor),
      0
    );

  const permuta = realizados
    .filter(
      (i) =>
        i.forma_pagamento ===
        "Permuta"
    )
    .reduce(
      (s, i) => s + Number(i.valor),
      0
    );

    function abrirNovo() {
    setEditando(null);
    setNome("");
    setData(diaSelecionado || "");
    setHorario("");
    setServicosSelecionados(["Mão"]);

    const preco = precos.find((p) => p.servico === "Mão");
    setValor(String(preco?.valor || ""));

    setModal(true);
  }

  function abrirEditar(item: Agendamento) {
    setEditando(item);
    setNome(item.nome_cliente);
    setData(item.data_atendimento);
    setHorario(item.horario.slice(0, 5));
    setServicosSelecionados(item.servico.split(", "));
    setValor(String(item.valor));
    setModal(true);
  }

  function alternarServico(nomeServico: string) {
  const jaSelecionado = servicosSelecionados.includes(nomeServico);

  const novaLista = jaSelecionado
    ? servicosSelecionados.filter((s) => s !== nomeServico)
    : [...servicosSelecionados, nomeServico];

  setServicosSelecionados(novaLista);

  const total = novaLista.reduce((soma, servico) => {
    const preco = precos.find((p) => p.servico === servico);
    return soma + Number(preco?.valor || 0);
  }, 0);

  setValor(String(total));
}

  async function salvar() {
    if (!nome || !data || !horario || !valor) {
      alert("Preencha todos os campos.");
      return;
    }

    const payload = {
      nome_cliente: nome,
      data_atendimento: data,
      horario,
      servico: servicosSelecionados.join(", "),
      valor: Number(valor),
      status: "agendado",
    };

    if (editando) {
      await supabase
        .from("agendamentos")
        .update(payload)
        .eq("id", editando.id);
    } else {
      await supabase
        .from("agendamentos")
        .insert(payload);
    }

    setModal(false);
    carregar();
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este agendamento?")) return;

    await supabase
      .from("agendamentos")
      .delete()
      .eq("id", id);

    carregar();
  }

  async function salvarPreco(id: number, novoValor: string) {
    await supabase
      .from("configuracoes_precos")
      .update({ valor: Number(novoValor) })
      .eq("id", id);

    carregar();
  }

  const agendamentosDia = diaSelecionado
    ? agendamentos.filter(
        (item) => item.data_atendimento === diaSelecionado
      )
    : [];

  const hojeISO = new Date().toISOString().slice(0, 10);

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
              onChange={(e) => setLogin(e.target.value)}
            />

            <button onClick={entrar}>
              Entrar
            </button>
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

          <button onClick={() => setLogado(false)}>
            Sair
          </button>
        </header>

        {aba === "agenda" && (
          <>
            <section className="resumo">
              <span>Faturamento confirmado</span>
              <strong>
                R$ {faturamentoMes.toFixed(2)}
              </strong>
            </section>

            <div className="calHeader">
              <button onClick={mesAnterior}>‹</button>
              <h2>{nomeMes}</h2>
              <button onClick={proximoMes}>›</button>
            </div>

            <div className="semanaLinha">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            <div className="calendario">
              {diasMes.map((dia) => {
                const qtd = agendamentos.filter(
                  (item) =>
                    item.data_atendimento === dia &&
                    criarDataHora(item) >= hoje &&
                    item.status !== "realizado"
                ).length;

                return (
                  <button
                    key={dia}
                    className={`dia ${
                      qtd > 0 ? "comAgenda" : ""
                    } ${
                      diaSelecionado === dia ? "selecionado" : ""
                    } ${
                      dia === hojeISO ? "hoje" : ""
                    }`}
                    onClick={() => setDiaSelecionado(dia)}
                  >
                    <strong>
                      {Number(dia.slice(8, 10))}
                    </strong>

                    {qtd > 0 && <span>{qtd}</span>}
                  </button>
                );
              })}
            </div>

            <div className="tituloLinha">
              <h2>Agenda do dia</h2>
              <button onClick={abrirNovo}>
                + Agendar
              </button>
            </div>

            {diaSelecionado && (
              <section className="box">
                <h2 className="dataTitulo">
                  {new Date(
                    diaSelecionado + "T00:00:00"
                  ).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>

                {agendamentosDia.length === 0 && (
                  <p>Sem agendamentos.</p>
                )}

                {agendamentosDia.map((item) => (
                  <div className="card" key={item.id}>
                    <div>
                      <h3>{item.nome_cliente}</h3>
                      <p>
                        {formatarDataCompleta(
                          item.data_atendimento,
                          item.horario
                        )}
                      </p>
                      <span>{item.servico}</span>
                    </div>

                    <div className="lado">
                      <strong>
                        R$ {Number(item.valor).toFixed(2)}
                      </strong>

                      <button onClick={() => abrirEditar(item)}>
                        Editar
                      </button>

                      <button
                        className="danger"
                        onClick={() => excluir(item.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <div className="tituloLinha">
              <h2>Próximos</h2>
            </div>

            {futuros.map((item) => (
              <div className="card" key={item.id}>
                <div>
                  <h3>{item.nome_cliente}</h3>
                  <p>
                    {formatarDataCompleta(
                      item.data_atendimento,
                      item.horario
                    )}
                  </p>
                  <span>{item.servico}</span>
                </div>

                <div className="lado">
                  <strong>
                    R$ {Number(item.valor).toFixed(2)}
                  </strong>

                  <button onClick={() => abrirEditar(item)}>
                    Editar
                  </button>

                  <button
                    className="danger"
                    onClick={() => excluir(item.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {aba === "confirmar" && (
          <div className="box">
            <h2>Confirmar atendimentos</h2>

            {confirmar.length === 0 && (
              <p>Nenhum atendimento pendente.</p>
            )}

            {confirmar.map((item) => (
              <div className="card" key={item.id}>
                <div>
                  <h3>{item.nome_cliente}</h3>
                  <p>
                    {formatarDataCompleta(
                      item.data_atendimento,
                      item.horario
                    )}
                  </p>
                  <span>{item.servico}</span>
                </div>

                <div className="lado">
                  <strong>
                    R$ {Number(item.valor).toFixed(2)}
                  </strong>

                  <button onClick={() => setPagamentoModal(item)}>
                    Confirmar
                  </button>

                  <button onClick={() => abrirEditar(item)}>
                    Remarcar
                  </button>

                  <button
                    className="danger"
                    onClick={() => marcarFalta(item.id)}
                  >
                    Falta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {aba === "historico" && (
          <div className="box">
            <h2>Atendimentos realizados</h2>

            {realizados.length === 0 && (
              <p>Nenhum atendimento realizado ainda.</p>
            )}

            {realizados.map((item) => (
              <div className="card" key={item.id}>
                <div>
                  <h3>{item.nome_cliente}</h3>
                  <p>
                    {formatarDataCompleta(
                      item.data_atendimento,
                      item.horario
                    )}
                  </p>
                  <span>
                    {item.servico} • {item.forma_pagamento || "Sem pagamento"}
                  </span>
                </div>

                <div className="lado">
                  <strong>
                    R$ {Number(item.valor).toFixed(2)}
                  </strong>

                  <button onClick={() => abrirEditar(item)}>
                    Editar
                  </button>

                  <button
                    className="danger"
                    onClick={() => excluir(item.id)}
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {aba === "financeiro" && (
          <>
            <section className="resumo">
              <span>Faturamento recebido</span>
              <strong>
                R$ {faturamentoMes.toFixed(2)}
              </strong>
            </section>

            <div className="box">
              <h2>Financeiro</h2>

              <select
                value={filtroFinanceiro}
                onChange={(e) =>
                  setFiltroFinanceiro(e.target.value)
                }
              >
                <option value="mes">Este mês</option>
                <option value="3">Últimos 3 meses</option>
                <option value="6">Últimos 6 meses</option>
                <option value="12">Último 1 ano</option>
                <option value="inicio">Desde o início</option>
              </select>

              <div className="dash">
                <div>
                  <span>Atendimentos</span>
                  <strong>{realizados.length}</strong>
                </div>

                <div>
                  <span>Pix</span>
                  <strong>R$ {pix.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Dinheiro</span>
                  <strong>R$ {dinheiro.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Crédito</span>
                  <strong>R$ {credito.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Débito</span>
                  <strong>R$ {debito.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Permuta</span>
                  <strong>R$ {permuta.toFixed(2)}</strong>
                </div>
              </div>

              <h3>Pagamentos recebidos</h3>

              <div className="pagamentosGrafico">
                <p>Pix <b>R$ {pix.toFixed(2)}</b></p>
                <div><span style={{ width: `${Math.min(pix, 100)}%` }} /></div>

                <p>Dinheiro <b>R$ {dinheiro.toFixed(2)}</b></p>
                <div><span style={{ width: `${Math.min(dinheiro, 100)}%` }} /></div>

                <p>Crédito <b>R$ {credito.toFixed(2)}</b></p>
                <div><span style={{ width: `${Math.min(credito, 100)}%` }} /></div>

                <p>Débito <b>R$ {debito.toFixed(2)}</b></p>
                <div><span style={{ width: `${Math.min(debito, 100)}%` }} /></div>

                <p>Permuta <b>R$ {permuta.toFixed(2)}</b></p>
                <div><span style={{ width: `${Math.min(permuta, 100)}%` }} /></div>
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
                <input
                  type="number"
                  defaultValue={preco.valor}
                  onBlur={(e) =>
                    salvarPreco(preco.id, e.target.value)
                  }
                />
              </div>
            ))}

            <p className="aviso">
              Ao mudar o valor, novos agendamentos já usam o preço atualizado.
            </p>
          </div>
        )}

        <nav className="menu">
          <button className={aba === "agenda" ? "ativo" : ""} onClick={() => setAba("agenda")}>
            📅<span>Agenda</span>
          </button>

          <button className={aba === "confirmar" ? "ativo" : ""} onClick={() => setAba("confirmar")}>
            ⏳<span>Confirmar</span>
          </button>

          <button className={aba === "historico" ? "ativo" : ""} onClick={() => setAba("historico")}>
            ✅<span>Realizados</span>
          </button>

          <button className={aba === "financeiro" ? "ativo" : ""} onClick={() => setAba("financeiro")}>
            💰<span>Financeiro</span>
          </button>

          <button className={aba === "config" ? "ativo" : ""} onClick={() => setAba("config")}>
            ⚙️<span>Preços</span>
          </button>
        </nav>
      </main>

      {modal && (
        <div className="modal">
          <div className="modalBox">
            <h2>{editando ? "Reagendar cliente" : "Novo agendamento"}</h2>

            <div className="campo">
              <label>Nome da cliente</label>
              <input
                placeholder="Ex: Fernanda"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="formGrid">
              <div className="campo">
                <label>Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Horário</label>
                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                />
              </div>
            </div>

           <div className="servicosChecklist">
  {["Mão", "Pé", "Pé e Mão", "Plástica dos pés", "Sombrancelha"].map((item) => (
    <label key={item} className="servicoCheck">
      <input
        type="checkbox"
        checked={servicosSelecionados.includes(item)}
        onChange={() => alternarServico(item)}
      />
      <span>{item}</span>
    </label>
  ))}
</div>

            <div className="campo">
              <label>Valor cobrado</label>
              <input
                type="number"
                placeholder="Ex: 60"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>

            <button onClick={salvar}>Salvar</button>

            <button
              className="cancelar"
              onClick={() => setModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pagamentoModal && (
        <div className="modal">
          <div className="modalBox">
            <h2>Confirmar atendimento</h2>

            <p>
              {pagamentoModal.nome_cliente} - R$ {Number(pagamentoModal.valor).toFixed(2)}
            </p>

            <div className="campo">
              <label>Forma de pagamento</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Cartão crédito</option>
                <option>Cartão débito</option>
                <option>Permuta</option>
              </select>
            </div>

            <button onClick={confirmarAtendimento}>
              Confirmar
            </button>

            <button
              className="cancelar"
              onClick={() => setPagamentoModal(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Estilos />
    </>
  );
}

function Estilos() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      html,
      body {
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

      button {
        border: 0;
        cursor: pointer;
        font-weight: 800;
      }

      input,
      select,
      textarea,
      button {
        font-size: 16px;
      }

      input,
      select {
        width: 100%;
        padding: 15px;
        border-radius: 16px;
        border: 1px solid #f9a8d4;
        margin-top: 12px;
        outline: none;
        background: white;
      }

      .login {
        min-height: 100vh;
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

      .loginBox h1 {
        margin: 0;
        color: #be185d;
        font-size: 32px;
      }

      .loginBox p {
        color: #777;
        margin-bottom: 22px;
      }

      .loginBox button,
      .modalBox button {
        width: 100%;
        padding: 15px;
        border-radius: 16px;
        background: #db2777;
        color: white;
        margin-top: 14px;
      }

      .app {
        width: 100%;
        max-width: 430px;
        margin: 0 auto;
        min-height: 100vh;
        padding: 16px 16px 105px;
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
        align-items: flex-start;
        box-shadow: 0 18px 40px rgba(219, 39, 119, 0.3);
      }

      .topo h1 {
        margin: 4px 0;
        font-size: 27px;
      }

      .topo p {
        margin: 0;
        opacity: 0.9;
      }

      .topo button {
        background: rgba(255, 255, 255, 0.25);
        color: white;
        border-radius: 14px;
        padding: 9px 12px;
      }

      .resumo,
      .box {
        background: white;
        padding: 20px;
        border-radius: 26px;
        margin-top: 18px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
      }

      .resumo span {
        color: #777;
      }

      .resumo strong {
        display: block;
        font-size: 34px;
        margin-top: 6px;
        color: #be185d;
      }

      .tituloLinha {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 24px 0 14px;
      }

      .tituloLinha h2 {
        margin: 0;
        font-size: 23px;
      }

      .tituloLinha button {
        background: #db2777;
        color: white;
        border-radius: 16px;
        padding: 12px 15px;
      }

      .calendario {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
        background: white;
        padding: 14px;
        border-radius: 24px;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07);
      }

      .dia {
        height: 42px;
        border-radius: 14px;
        background: #fff1f7;
        color: #777;
        position: relative;
      }
        
      .dia.hoje {
      border: 3px solid #111827;
    }

      .dia.comAgenda {
        background: #fce7f3;
        color: #be185d;
      }

      .dia.selecionado {
        background: #db2777;
        color: white;
      }

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

      .card {
        background: white;
        border-radius: 24px;
        padding: 16px;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        gap: 14px;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07);
      }

      .card h3 {
        margin: 0;
        font-size: 19px;
      }

      .card p {
        margin: 6px 0;
        color: #666;
        font-size: 14px;
        text-transform: capitalize;
      }

      .card span {
        display: inline-block;
        background: #fce7f3;
        color: #be185d;
        padding: 7px 11px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 800;
      }

      .lado {
        text-align: right;
        min-width: 88px;
      }

      .lado strong {
        color: #be185d;
        display: block;
        margin-bottom: 8px;
      }

      .lado button {
        display: block;
        width: 100%;
        background: #f3f4f6;
        color: #374151;
        padding: 7px;
        border-radius: 10px;
        margin-top: 6px;
        font-size: 12px;
      }

      .lado .danger {
        background: #fee2e2;
        color: #dc2626;
      }

      .dash {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin: 16px 0;
      }

      .dash div {
        background: #fff1f7;
        padding: 14px;
        border-radius: 18px;
      }

      .dash span {
        display: block;
        font-size: 13px;
        color: #777;
      }

      .dash strong {
        display: block;
        font-size: 26px;
        margin-top: 4px;
        color: #be185d;
      }

      .grafico {
        height: 200px;
        background: #fff1f7;
        border-radius: 20px;
        display: flex;
        align-items: flex-end;
        padding: 18px;
      }

      .grafico div {
        width: 100%;
        background: linear-gradient(180deg, #fb7185, #db2777);
        border-radius: 16px 16px 6px 6px;
      }

      .menu {
        position: fixed;
        left: 50%;
        bottom: 14px;
        transform: translateX(-50%);
        width: calc(100% - 28px);
        max-width: 400px;
        background: #111827;
        border-radius: 24px;
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
      }

      .menu button {
        background: transparent;
        color: white;
        border-radius: 16px;
        padding: 9px 4px;
      }

      .menu button span {
        display: block;
        font-size: 10px;
        margin-top: 4px;
      }

      .menu .ativo {
        background: #db2777;
      }

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
        background: white;
        border-radius: 28px;
        padding: 22px;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.28);
      }

      .modalBox h2 {
        margin: 0 0 10px;
      }

      .modalBox .cancelar {
        background: #f3f4f6;
        color: #374151;
      }

      .preco {
        margin-top: 14px;
      }

      .preco label {
        font-weight: 800;
        color: #be185d;
      }

      .aviso {
        color: #777;
        font-size: 14px;
      }

.campo {
  margin-top: 12px;
}

.campo label {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #be185d;
  margin-bottom: 6px;
}

.campo input,
.campo select {
  margin-top: 0;
}

.formGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.calHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 0 14px;
}

.calHeader h2 {
  margin: 0;
  text-transform: capitalize;
  color: #be185d;
  font-size: 22px;
  font-weight: 800;
}

.calHeader button {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #fce7f3;
  color: #be185d;
  font-size: 24px;
}

.semanaLinha {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.semanaLinha span {
  text-align: center;
  font-size: 12px;
  color: #888;
  font-weight: 700;
}

.dia {
  min-height: 54px;
  border-radius: 16px;
  background: #fff1f7;
  color: #777;
  position: relative;
  transition: 0.2s;
}

.dia strong {
  font-size: 15px;
}

.dia:hover {
  transform: scale(1.05);
}

.dia.hoje {
  border: 3px solid #111827;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.15);
}

.dataTitulo {
  text-transform: capitalize;
  color: #be185d;
  font-size: 18px;
}

.modalBox p {
  color: #555;
  margin: 10px 0 16px;
}

.pagamentosGrafico {
  margin-top: 18px;
}

.pagamentosGrafico p {
  display: flex;
  justify-content: space-between;
  margin: 14px 0 6px;
  font-size: 14px;
}

.pagamentosGrafico div {
  height: 12px;
  background: #f3f4f6;
  border-radius: 999px;
  overflow: hidden;
}

.pagamentosGrafico span {
  display: block;
  height: 100%;
  background: linear-gradient(
    90deg,
    #fb7185,
    #db2777
  );
}

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

.card h3 {
  font-size: 18px;
  margin-bottom: 4px;
}

.card p {
  font-size: 13px;
}

.menu {
  grid-template-columns: repeat(5, 1fr);
}

.servicosGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}

.servicoOpcao,
.servicoAtivo {
  padding: 12px;
  border-radius: 14px;
  font-size: 14px;
}

.servicoOpcao {
  background: #fff1f7;
  color: #be185d;
}

.servicoAtivo {
  background: #db2777;
  color: white;
}

.servicosChecklist {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}

.servicoCheck {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff1f7;
  color: #be185d;
  padding: 12px;
  border-radius: 14px;
  font-weight: 800;
}

.servicoCheck input {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: #db2777;
}

.servicoCheck span {
  flex: 1;
}

    `}</style>
  );
}