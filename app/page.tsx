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

  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [servico, setServico] = useState("Mão");
  const [valor, setValor] = useState("");

  async function carregar() {
    const { data: agenda } = await supabase
      .from("agendamentos")
      .select("*")
      .order("data_atendimento", { ascending: true })
      .order("horario", { ascending: true });

    const { data: listaPrecos } = await supabase
      .from("configuracoes_precos")
      .select("*")
      .order("id", { ascending: true });

    setAgendamentos(agenda || []);
    setPrecos(listaPrecos || []);
  }

  useEffect(() => {
    if (logado) carregar();
  }, [logado]);

  function entrar() {
    if (login.trim().toLowerCase() === "suziane") setLogado(true);
  }

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setData("");
    setHorario("");
    setServico("Mão");
    const preco = precos.find((p) => p.servico === "Mão");
    setValor(String(preco?.valor || ""));
    setModal(true);
  }

  function abrirEditar(item: Agendamento) {
    setEditando(item);
    setNome(item.nome_cliente);
    setData(item.data_atendimento);
    setHorario(item.horario.slice(0, 5));
    setServico(item.servico);
    setValor(String(item.valor));
    setModal(true);
  }

  function trocarServico(novoServico: string) {
    setServico(novoServico);
    const preco = precos.find((p) => p.servico === novoServico);
    if (preco) setValor(String(preco.valor));
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
      servico,
      valor: Number(valor),
    };

    if (editando) {
      await supabase.from("agendamentos").update(payload).eq("id", editando.id);
    } else {
      await supabase.from("agendamentos").insert(payload);
    }

    setModal(false);
    carregar();
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este agendamento?")) return;
    await supabase.from("agendamentos").delete().eq("id", id);
    carregar();
  }

  async function salvarPreco(id: number, novoValor: string) {
    await supabase
      .from("configuracoes_precos")
      .update({ valor: Number(novoValor) })
      .eq("id", id);

    carregar();
  }

  const total = agendamentos.reduce((soma, item) => soma + Number(item.valor), 0);

const hoje = new Date();

function formatarDataCompleta(dataISO: string, horario: string) {
  const dataObj = new Date(dataISO + "T00:00:00");

  return dataObj.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }) + " às " + horario.slice(0, 5);
}

function mesmaData(dataISO: string, data: Date) {
  return dataISO === data.toISOString().slice(0, 10);
}

const diasSemana = Array.from({ length: 7 }, (_, i) => {
  const data = new Date();
  data.setDate(hoje.getDate() + i);
  return data;
});

const diasMes = Array.from(
  { length: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate() },
  (_, i) => new Date(hoje.getFullYear(), hoje.getMonth(), i + 1)
);

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

        {aba === "agenda" && (
  <>
    <section className="resumo">
      <span>Faturamento</span>
      <strong>R$ {total.toFixed(2)}</strong>
    </section>

    <div className="tituloLinha">
      <h2>Calendário do mês</h2>
      <button onClick={abrirNovo}>+ Agendar</button>
    </div>

    <div className="calendarioMes">
      {diasMes.map((dia) => {
        const qtd = agendamentos.filter((item) =>
          mesmaData(item.data_atendimento, dia)
        ).length;

        return (
          <div
            key={dia.toISOString()}
            className={qtd > 0 ? "diaMes ativoDia" : "diaMes"}
          >
            <strong>{dia.getDate()}</strong>
            {qtd > 0 && <span>{qtd}</span>}
          </div>
        );
      })}
    </div>

    <div className="tituloLinha">
      <h2>Agenda da semana</h2>
    </div>

    {diasSemana.map((dia) => {
      const listaDia = agendamentos.filter((item) =>
        mesmaData(item.data_atendimento, dia)
      );

      return (
        <section className="diaSemana" key={dia.toISOString()}>
          <h3>
            {dia.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </h3>

          {listaDia.length === 0 && (
            <p className="semAgenda">Sem agendamentos</p>
          )}

          {listaDia.map((item) => (
            <div className="card" key={item.id}>
              <div>
                <h3>{item.nome_cliente}</h3>
                <p>{formatarDataCompleta(item.data_atendimento, item.horario)}</p>
                <span>{item.servico}</span>
              </div>

              <div className="lado">
                <strong>R$ {Number(item.valor).toFixed(2)}</strong>
                <button onClick={() => abrirEditar(item)}>Editar</button>
                <button className="danger" onClick={() => excluir(item.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </section>
      );
    })}
  </>
)}

        {aba === "financeiro" && (
          <>
            <section className="resumo">
              <span>Total ganho</span>
              <strong>R$ {total.toFixed(2)}</strong>
            </section>

            <div className="box">
              <h2>Financeiro</h2>
              <p>{agendamentos.length} atendimentos cadastrados.</p>

              <div className="barra">
                <div style={{ width: `${Math.min(total, 500)}px` }} />
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
                  onBlur={(e) => salvarPreco(preco.id, e.target.value)}
                />
              </div>
            ))}

            <p className="aviso">Ao mudar o valor, novos agendamentos já usam o preço atualizado.</p>
          </div>
        )}

        <nav className="menu">
          <button className={aba === "agenda" ? "ativo" : ""} onClick={() => setAba("agenda")}>
            📅<span>Agenda</span>
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

            <input placeholder="Nome da cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />

            <select value={servico} onChange={(e) => trocarServico(e.target.value)}>
              <option>Mão</option>
              <option>Pé</option>
              <option>Pé e Mão</option>
            </select>

            <input type="number" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />

            <button onClick={salvar}>Salvar</button>
            <button className="cancelar" onClick={() => setModal(false)}>Cancelar</button>
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

      body {
        margin: 0;
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
      select {
        width: 100%;
        padding: 15px;
        border-radius: 16px;
        border: 1px solid #f9a8d4;
        font-size: 16px;
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
        font-size: 16px;
      }

      .app {
        max-width: 430px;
        margin: 0 auto;
        min-height: 100vh;
        padding: 16px 16px 95px;
        background: #fff7fb;
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

      .topo p,
      .topo small {
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
        font-size: 24px;
      }

      .tituloLinha button {
        background: #db2777;
        color: white;
        border-radius: 16px;
        padding: 12px 15px;
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
        font-size: 20px;
      }

      .card p {
        margin: 6px 0;
        color: #666;
        font-size: 14px;
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
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
      }

      .menu button {
        background: transparent;
        color: white;
        border-radius: 16px;
        padding: 10px 6px;
      }

      .menu button span {
        display: block;
        font-size: 11px;
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

      .barra {
        height: 18px;
        background: #fce7f3;
        border-radius: 999px;
        overflow: hidden;
      }

      .barra div {
        height: 100%;
        max-width: 100%;
        background: #db2777;
      }
        .calendarioMes {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  background: white;
  padding: 14px;
  border-radius: 24px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07);
}

.diaMes {
  height: 42px;
  border-radius: 14px;
  background: #fff1f7;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: #777;
}

.diaMes strong {
  font-size: 14px;
}

.ativoDia {
  background: #db2777;
  color: white;
}

.ativoDia span {
  position: absolute;
  right: -4px;
  top: -4px;
  background: #111827;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diaSemana {
  margin-top: 16px;
}

.diaSemana > h3 {
  margin: 0 0 10px;
  font-size: 16px;
  text-transform: capitalize;
  color: #be185d;
}

.semAgenda {
  background: white;
  color: #999;
  padding: 16px;
  border-radius: 20px;
  margin: 0 0 12px;
}
  html,
body {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  touch-action: manipulation;
  -webkit-text-size-adjust: 100%;
}

input,
select,
textarea,
button {
  font-size: 16px;
}

.app {
  width: 100%;
  max-width: 430px;
  overflow-x: hidden;
}

    `}</style>
  );
}