"use client";

import { useState } from "react";
import { cauceBrowserAuth } from "@/lib/cauce/auth-browser";

export function MerchantLogin() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const { error } = await cauceBrowserAuth().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/cauce/confirm` },
      });
      if (error) throw error;
      setMessage("Si tu correo está autorizado, vas a recibir un enlace de acceso.");
    } catch { setMessage("No se pudo solicitar el enlace. Intentá nuevamente."); }
    finally { setPending(false); }
  }

  return <div className="c-merchant-login"><span className="c-overline">Equipo Cauce</span><h1>Entrá a tu espacio.</h1>
    <p>Administrá el catálogo, la disponibilidad y los pedidos desde un solo lugar.</p>
    <form onSubmit={onSubmit}>
      <label htmlFor="staff-email">Correo del equipo</label>
      <input id="staff-email" type="email" autoComplete="email" required placeholder="tu@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="c-button c-button-dark" type="submit" disabled={pending}>{pending ? "Enviando…" : "Recibir enlace"}</button>
    </form>
    {message && <p role="status">{message}</p>}
  </div>;
}
