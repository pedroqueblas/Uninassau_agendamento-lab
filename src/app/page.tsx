"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const MIN_HORA = "07:00";
const MAX_HORA = "22:00";
const UNIDADES = ["Olinda", "Graças", "Paulista"] as const;
const LABS_POR_UNIDADE: Record<(typeof UNIDADES)[number], string[]> = {
  Olinda: ["Lab 1", "Lab 2"],
  Graças: ["Lab 1"],
  Paulista: ["Lab 1"],
};
const INTERVALO_MINUTOS = 30;

type AgendamentoResumo = {
  horaEntrada: string;
  horaSaida: string;
};

export default function Home() {
  const router = useRouter();
  const [professor, setProfessor] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [turma, setTurma] = useState("");
  const [telefone, setTelefone] = useState("");
  const [unidade, setUnidade] = useState<(typeof UNIDADES)[number]>("Olinda");
  const [data, setData] = useState("");
  const [laboratorio, setLaboratorio] = useState("Lab 1");
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSaida, setHoraSaida] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [autenticando, setAutenticando] = useState(true);
  const [agendamentosDia, setAgendamentosDia] = useState<AgendamentoResumo[]>(
    []
  );
  const [carregandoDisponibilidade, setCarregandoDisponibilidade] =
    useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        setAutenticando(false);
        return;
      }
      setAutenticando(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const labs = LABS_POR_UNIDADE[unidade];
    if (!labs.includes(laboratorio)) {
      setLaboratorio(labs[0]);
    }
  }, [unidade, laboratorio]);

  useEffect(() => {
    setHoraEntrada("");
    setHoraSaida("");
  }, [data, laboratorio, unidade]);

  useEffect(() => {
    if (!data) {
      setAgendamentosDia([]);
      return;
    }

    setCarregandoDisponibilidade(true);
    const agendamentosRef = collection(db, "agendamentos");
    const agendamentosQuery = query(
      agendamentosRef,
      where("unidade", "==", unidade),
      where("laboratorio", "==", laboratorio),
      where("data", "==", data)
    );

    const unsubscribe = onSnapshot(
      agendamentosQuery,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => {
          const item = doc.data() as AgendamentoResumo;
          return {
            horaEntrada: item.horaEntrada,
            horaSaida: item.horaSaida,
          };
        });
        setAgendamentosDia(dados);
        setCarregandoDisponibilidade(false);
      },
      () => {
        setAgendamentosDia([]);
        setCarregandoDisponibilidade(false);
      }
    );

    return () => unsubscribe();
  }, [data, laboratorio, unidade]);

  const resetForm = () => {
    setProfessor("");
    setDisciplina("");
    setTurma("");
    setTelefone("");
    setUnidade("Olinda");
    setData("");
    setLaboratorio("Lab 1");
    setHoraEntrada("");
    setHoraSaida("");
  };

  const paraMinutos = (valor: string) => {
    const [hora, minuto] = valor.split(":").map(Number);
    return hora * 60 + minuto;
  };

  const paraHorario = (minutos: number) => {
    const hora = Math.floor(minutos / 60)
      .toString()
      .padStart(2, "0");
    const minuto = (minutos % 60).toString().padStart(2, "0");
    return `${hora}:${minuto}`;
  };

  const geraOpcoesHorario = () => {
    const inicio = paraMinutos(MIN_HORA);
    const fim = paraMinutos(MAX_HORA);
    const opcoes: string[] = [];
    for (let tempo = inicio; tempo <= fim; tempo += INTERVALO_MINUTOS) {
      opcoes.push(paraHorario(tempo));
    }
    return opcoes;
  };

  const conflita = (inicio: string, fim: string) => {
    const inicioMin = paraMinutos(inicio);
    const fimMin = paraMinutos(fim);
    return agendamentosDia.some((item) => {
      const itemInicio = paraMinutos(item.horaEntrada);
      const itemFim = paraMinutos(item.horaSaida);
      return inicioMin < itemFim && fimMin > itemInicio;
    });
  };

  const horariosEntradaDisponiveis = () => {
    if (!data) {
      return [];
    }
    return geraOpcoesHorario().filter((horario) => {
      const horarioMin = paraMinutos(horario);
      if (horarioMin === paraMinutos(MAX_HORA)) {
        return false;
      }
      return !agendamentosDia.some((item) => {
        const inicio = paraMinutos(item.horaEntrada);
        const fim = paraMinutos(item.horaSaida);
        return horarioMin >= inicio && horarioMin < fim;
      });
    });
  };

  const horariosSaidaDisponiveis = () => {
    if (!data || !horaEntrada) {
      return [];
    }
    const inicioMin = paraMinutos(horaEntrada);
    return geraOpcoesHorario().filter((horario) => {
      const horarioMin = paraMinutos(horario);
      if (horarioMin <= inicioMin) {
        return false;
      }
      return !conflita(horaEntrada, horario);
    });
  };

  const opcoesEntrada = horariosEntradaDisponiveis();
  const opcoesSaida = horariosSaidaDisponiveis();

  useEffect(() => {
    if (horaSaida && !opcoesSaida.includes(horaSaida)) {
      setHoraSaida("");
    }
  }, [horaSaida, opcoesSaida]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro("");
    setSucesso("");

    if (!data || !horaEntrada || !horaSaida) {
      setErro("Preencha a data, horário de entrada e saída.");
      return;
    }

    if (horaEntrada >= horaSaida) {
      setErro("O horário de saída deve ser maior que o de entrada.");
      return;
    }

    if (conflita(horaEntrada, horaSaida)) {
      setErro(
        "Já existe agendamento nesse horário. Escolha outro intervalo disponível."
      );
      return;
    }

    setSalvando(true);
    try {
      await addDoc(collection(db, "agendamentos"), {
        professor,
        disciplina,
        turma,
        telefone,
        unidade,
        data,
        laboratorio,
        horaEntrada,
        horaSaida,
        createdAt: serverTimestamp(),
      });
      setSucesso("Agendamento registrado com sucesso.");
      resetForm();
    } catch {
      setErro("Não foi possível salvar o agendamento.");
    } finally {
      setSalvando(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  if (autenticando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-amber-50 px-4 py-10 sm:px-6 lg:px-10">
        <main className="mx-auto flex w-full max-w-6xl items-center justify-center">
          <p className="text-sm text-slate-600">Carregando...</p>
        </main>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-amber-50 px-4 py-10 sm:px-6 lg:px-10">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-600/10 p-2">
                  <div className="h-full w-full rounded-xl bg-blue-700" />
                </div>
              <div>
                  <p className="text-sm font-medium text-blue-700">
                    UNISSAU • Laboratório de Informática
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    Agendamento do Laboratório
                  </h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <button
                className="rounded-full border border-blue-200 bg-white px-4 py-2 text-blue-700 transition hover:border-blue-400 hover:text-blue-800"
                onClick={handleLogout}
              >
                Sair
              </button>
              <Link
                className="rounded-full bg-blue-700 px-4 py-2 text-white transition hover:bg-blue-800"
                href="/agendamentos"
              >
                Ver agendamentos
              </Link>
            </div>
          </div>
          <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
            Organize as reservas do laboratório com rapidez. Preencha os dados
            do professor, disciplina, turma, unidade, laboratório e horários.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Novo agendamento
              </h2>
              <p className="text-sm text-slate-500">
                Informe os detalhes para garantir o horário do laboratório.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Nome do professor
                  <input
                    className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex.: Ana Paula Ferreira"
                    type="text"
                    value={professor}
                    onChange={(event) => setProfessor(event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Disciplina
                  <input
                    className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex.: Programação Web"
                    type="text"
                    value={disciplina}
                    onChange={(event) => setDisciplina(event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Turma
                  <input
                    className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex.: 3º ADS B"
                    type="text"
                    value={turma}
                    onChange={(event) => setTurma(event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Unidade
                  <select
                    className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={unidade}
                    onChange={(event) =>
                      setUnidade(event.target.value as (typeof UNIDADES)[number])
                    }
                  >
                    {UNIDADES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Telefone do professor
                  <input
                    className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex.: (98) 99999-0000"
                    type="tel"
                    value={telefone}
                    onChange={(event) => setTelefone(event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Laboratório
                  <select
                    className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={laboratorio}
                    onChange={(event) => setLaboratorio(event.target.value)}
                  >
                    {LABS_POR_UNIDADE[unidade].map((lab) => (
                      <option key={lab} value={lab}>
                        {lab}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Data
                  <input
                    className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    type="date"
                    value={data}
                    onChange={(event) => setData(event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Horário de entrada
                  <select
                    className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                    value={horaEntrada}
                    onChange={(event) => setHoraEntrada(event.target.value)}
                    disabled={!data || carregandoDisponibilidade}
                    required
                  >
                    <option value="">
                      {carregandoDisponibilidade
                        ? "Carregando horários..."
                        : "Selecione"}
                    </option>
                    {opcoesEntrada.map((horario) => (
                      <option key={horario} value={horario}>
                        {horario}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Horário de saída
                <select
                  className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                  value={horaSaida}
                  onChange={(event) => setHoraSaida(event.target.value)}
                  disabled={!horaEntrada || carregandoDisponibilidade}
                  required
                >
                  <option value="">Selecione</option>
                  {opcoesSaida.map((horario) => (
                    <option key={horario} value={horario}>
                      {horario}
                    </option>
                  ))}
                </select>
              </label>

              {!data ? (
                <p className="text-xs text-slate-500">
                  Selecione a data para visualizar os horários disponíveis.
                </p>
              ) : opcoesEntrada.length === 0 && !carregandoDisponibilidade ? (
                <p className="text-xs text-red-600">
                  Não há horários disponíveis para este laboratório nesta data.
                </p>
              ) : null}

              {erro ? (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </p>
              ) : null}
              {sucesso ? (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {sucesso}
                </p>
              ) : null}

              <button
                className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Confirmar agendamento"}
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-amber-200/70 bg-amber-50/80 p-6">
              <h3 className="text-base font-semibold text-amber-900">
                Status do laboratório
              </h3>
              <p className="mt-3 text-sm text-amber-800">
                Atendimentos disponíveis entre 07:00 e 22:00. Confirme os
                horários com a coordenação antes de reservar.
              </p>
              <div className="mt-6 flex flex-col gap-3 text-sm text-amber-900">
                <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3">
                  <span>Lab 1</span>
                  <span className="rounded-full bg-blue-700/10 px-3 py-1 text-xs font-semibold text-blue-700">
                    Aberto
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3">
                  <span>Lab 2</span>
                  <span className="rounded-full bg-blue-700/10 px-3 py-1 text-xs font-semibold text-blue-700">
                    Aberto
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-red-200/60 bg-white p-6">
              <h3 className="text-base font-semibold text-red-600">
                Ajuda rápida
              </h3>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <p>
                  Para agendar, preencha o formulário com professor, disciplina,
                  turma, unidade, laboratório, telefone e horários de entrada e
                  saída.
                </p>
                <p>
                  Para visualizar, use o botão Ver agendamentos e consulte a
                  lista por data e hora.
                </p>
                <p>
                  Se o horário desejado já estiver ocupado, utilize o telefone
                  do professor exibido na lista para combinar divisão do
                  laboratório ou troca de horário.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
