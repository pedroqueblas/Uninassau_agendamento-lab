"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const UNIDADES = ["Olinda", "Graças", "Paulista"] as const;
const MIN_HORA = "07:00";
const MAX_HORA = "22:00";

type Agendamento = {
  id: string;
  professor: string;
  disciplina: string;
  turma: string;
  telefone?: string;
  unidade?: (typeof UNIDADES)[number];
  data: string;
  laboratorio: string;
  horaEntrada: string;
  horaSaida: string;
};

export default function AgendamentosPage() {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [autenticando, setAutenticando] = useState(true);
  const [erroIndice, setErroIndice] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [filtroHorario, setFiltroHorario] = useState("");
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState<
    "personalizado" | "hoje" | "amanha" | "semana"
  >("personalizado");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        setAutenticando(false);
        return;
      }
      setAutenticando(false);
    });

    const agendamentosRef = collection(db, "agendamentos");
    const agendamentosQuery = query(agendamentosRef);

    const unsubscribe = onSnapshot(
      agendamentosQuery,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Agendamento, "id">),
        }));
        setAgendamentos(dados);
        setCarregando(false);
        setErroIndice("");
      },
      () => {
        setErroIndice("Não foi possível carregar os agendamentos.");
        setCarregando(false);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeAuth();
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  if (autenticando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-amber-50 px-4 py-10 sm:px-6 lg:px-10">
        <main className="mx-auto flex w-full max-w-5xl items-center justify-center">
          <p className="text-sm text-slate-600">Carregando...</p>
        </main>
      </div>
    );
  }

  const ordenarAgendamentos = (itens: Agendamento[]) =>
    [...itens].sort((a, b) => {
      if (a.data !== b.data) {
        return a.data.localeCompare(b.data);
      }
      return a.horaEntrada.localeCompare(b.horaEntrada);
    });

  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  const amanhaIso = amanha.toISOString().slice(0, 10);
  const semanaFim = new Date(hoje);
  semanaFim.setDate(hoje.getDate() + 6);

  const dentroDoPeriodo = (data: string) => {
    if (filtroPeriodo === "hoje") {
      return data === hojeIso;
    }
    if (filtroPeriodo === "amanha") {
      return data === amanhaIso;
    }
    if (filtroPeriodo === "semana") {
      const dataAtual = new Date(data);
      const inicio = new Date(hojeIso);
      const fim = new Date(semanaFim.toISOString().slice(0, 10));
      return dataAtual >= inicio && dataAtual <= fim;
    }
    if (filtroData) {
      return data === filtroData;
    }
    return true;
  };

  const normalizar = (valor: string) => valor.toLowerCase().trim();

  const filtrados = ordenarAgendamentos(
    agendamentos.filter((item) => {
      if (!filtroUnidade) {
        return false;
      }
      if (item.unidade !== filtroUnidade) {
        return false;
      }
      if (!dentroDoPeriodo(item.data)) {
        return false;
      }
      if (
        filtroHorario &&
        !(item.horaEntrada <= filtroHorario && filtroHorario < item.horaSaida)
      ) {
        return false;
      }
      if (termoBusca) {
        const alvo = `${item.professor} ${item.disciplina} ${item.turma} ${
          item.telefone ?? ""
        } ${item.laboratorio}`.toLowerCase();
        if (!alvo.includes(normalizar(termoBusca))) {
          return false;
        }
      }
      return true;
    })
  );

  const formatarData = (valor: string) => {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const tituloData = (valor: string) => {
    if (valor === hojeIso) {
      return "Hoje";
    }
    if (valor === amanhaIso) {
      return "Amanhã";
    }
    return "Agendamentos";
  };

  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const statusAgendamento = (item: Agendamento) => {
    if (item.data !== hojeIso) {
      return { texto: "Futuro", classe: "bg-emerald-500/10 text-emerald-700" };
    }
    const inicio =
      Number(item.horaEntrada.split(":")[0]) * 60 +
      Number(item.horaEntrada.split(":")[1]);
    const fim =
      Number(item.horaSaida.split(":")[0]) * 60 +
      Number(item.horaSaida.split(":")[1]);
    if (agoraMin >= inicio && agoraMin < fim) {
      return { texto: "Em andamento", classe: "bg-blue-600/10 text-blue-700" };
    }
    if (agoraMin < inicio) {
      return { texto: "Futuro", classe: "bg-emerald-500/10 text-emerald-700" };
    }
    return { texto: "Concluído", classe: "bg-slate-200 text-slate-600" };
  };

  const grupos = filtrados.reduce<Record<string, Agendamento[]>>(
    (acc, item) => {
      acc[item.data] = acc[item.data] ?? [];
      acc[item.data].push(item);
      return acc;
    },
    {}
  );

  const datasOrdenadas = Object.keys(grupos).sort();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-amber-50 px-4 py-10 sm:px-6 lg:px-10">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-blue-600">
              UNISSAU • Laboratório de Informática
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Agendamentos
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Gerencie os agendamentos do Laboratório de Informática
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-400 hover:text-blue-800"
              onClick={handleLogout}
            >
              Sair
            </button>
            <Link
              className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              href="/"
            >
              Novo agendamento
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr_220px_200px]">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/30 px-3 text-sm text-slate-700">
              <select
                className="w-full bg-transparent text-sm text-slate-900 outline-none"
                value={filtroUnidade}
                onChange={(event) => setFiltroUnidade(event.target.value)}
              >
                <option value="">Unidade</option>
                {UNIDADES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/30 px-3 text-sm text-slate-700">
              <input
                className="w-full bg-transparent text-sm text-slate-900 outline-none"
                placeholder="Buscar agendamento..."
                value={termoBusca}
                onChange={(event) => setTermoBusca(event.target.value)}
              />
            </label>
            <div className="flex h-11 items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/30 px-3 text-sm text-slate-700">
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  filtroPeriodo === "hoje"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600"
                }`}
                onClick={() => {
                  setFiltroPeriodo("hoje");
                  setFiltroData(hojeIso);
                }}
              >
                Hoje
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  filtroPeriodo === "amanha"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600"
                }`}
                onClick={() => {
                  setFiltroPeriodo("amanha");
                  setFiltroData(amanhaIso);
                }}
              >
                Amanhã
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  filtroPeriodo === "semana"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600"
                }`}
                onClick={() => {
                  setFiltroPeriodo("semana");
                  setFiltroData("");
                }}
              >
                Esta semana
              </button>
            </div>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/30 px-3 text-sm text-slate-700">
              <input
                className="w-full bg-transparent text-sm text-slate-900 outline-none"
                type="time"
                min={MIN_HORA}
                max={MAX_HORA}
                value={filtroHorario}
                onChange={(event) => setFiltroHorario(event.target.value)}
              />
            </label>
          </div>
        </section>

        {erroIndice ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {erroIndice}
          </div>
        ) : carregando ? (
          <p className="text-sm text-slate-500">Carregando agendamentos...</p>
        ) : !filtroUnidade ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            Selecione uma unidade para visualizar os agendamentos.
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            Nenhum agendamento encontrado até o momento.
          </div>
        ) : (
          <section className="flex flex-col gap-8">
            {datasOrdenadas.map((dataGrupo) => (
              <div key={dataGrupo} className="relative pl-8">
                <div className="absolute left-[11px] top-0 h-full w-px bg-blue-100" />
                <div className="absolute left-2 top-1 h-4 w-4 rounded-full border-2 border-blue-500 bg-white" />
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                  {tituloData(dataGrupo)}
                  <span className="text-slate-500">
                    • {formatarData(dataGrupo)}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {grupos[dataGrupo].map((agendamento) => {
                    const status = statusAgendamento(agendamento);
                    return (
                      <div
                        key={agendamento.id}
                        className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                          <span>
                            {agendamento.unidade} • {agendamento.laboratorio}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${status.classe}`}
                          >
                            {status.texto}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-base font-semibold text-slate-900">
                            {agendamento.professor}
                          </p>
                          <p className="text-sm text-slate-600">
                            {agendamento.disciplina} • {agendamento.turma}
                          </p>
                          <p className="text-sm font-semibold text-red-600">
                            {agendamento.telefone || "Telefone não informado"}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
                          <span>
                            {formatarData(agendamento.data)} •{" "}
                            {agendamento.horaEntrada} — {agendamento.horaSaida}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
