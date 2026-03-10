"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [autenticando, setAutenticando] = useState(true);
  const [modoRegistro, setModoRegistro] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/");
        return;
      }
      setAutenticando(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.push("/");
    } catch {
      setErro("Não foi possível entrar. Verifique seus dados.");
    } finally {
      setCarregando(false);
    }
  };

  const handleRegistro = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const credenciais = await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );
      await updateProfile(credenciais.user, { displayName: nomeCompleto });
      router.push("/");
    } catch {
      setErro("Não foi possível registrar. Verifique os dados.");
    } finally {
      setCarregando(false);
    }
  };

  if (autenticando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-amber-50 px-4 py-10 sm:px-6 lg:px-10">
        <main className="mx-auto flex w-full max-w-md items-center justify-center">
          <p className="text-sm text-slate-600">Carregando...</p>
        </main>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-amber-50 px-4 py-10 sm:px-6 lg:px-10">
      <main className="mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="text-center">
          <p className="text-sm font-medium text-blue-700">
            UNISSAU • Laboratório de Informática
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Acesso ao sistema
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Entre com o email e senha cadastrados.
          </p>
        </header>

        <form
          onSubmit={modoRegistro ? handleRegistro : handleLogin}
          className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="grid gap-5">
            {modoRegistro ? (
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Nome completo
                <input
                  className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex.: Ana Paula Ferreira"
                  type="text"
                  value={nomeCompleto}
                  onChange={(event) => setNomeCompleto(event.target.value)}
                  required
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="professor@unissau.edu"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Senha
              <input
                className="h-12 rounded-xl border border-blue-100 bg-blue-50/30 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
              />
            </label>
            {erro ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {erro}
              </p>
            ) : null}
            <button
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={carregando}
            >
              {carregando
                ? modoRegistro
                  ? "Registrando..."
                  : "Entrando..."
                : modoRegistro
                  ? "Criar conta"
                  : "Entrar"}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-red-600 transition hover:text-red-700"
              onClick={() => {
                setErro("");
                setModoRegistro((valor) => !valor);
              }}
            >
              {modoRegistro
                ? "Já tenho conta, voltar para login"
                : "Registrar nova conta"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
