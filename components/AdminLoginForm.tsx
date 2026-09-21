"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const { error: signInError } = await createClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (signInError) throw signInError;
      setError("Te enviamos un enlace seguro para ingresar.");
      setPending(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar sesión.");
      setPending(false);
    }
  }

  return <form className="checkout-card" onSubmit={submit}>
    <h1 className="checkout-title">Administración</h1>
    <p className="checkout-help">Ingresá con el enlace seguro que recibís por email.</p>
    <div className="checkout-field"><label htmlFor="admin-email">Email</label><input autoComplete="email" id="admin-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div>
    <button className="checkout-pay" disabled={pending} type="submit">{pending ? "Enviando…" : "Enviar enlace seguro"}</button>
    {error ? <p className="checkout-error">{error}</p> : null}
  </form>;
}
