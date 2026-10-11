import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { SEOMeta } from "../components/SEOMeta";
import { apiJson } from "../lib/api";
import { SITE, absoluteUrl } from "../lib/site";

// Marco de las páginas de texto largo (términos, privacidad, nosotros).
function LegalPage({ title, description, path, children, updated = true }: { title: string; description: string; path: string; children: ReactNode; updated?: boolean }) {
  return (
    <div className="pt-32 pb-24 px-6 max-w-3xl mx-auto text-[#2C2C2C]">
      <SEOMeta title={title} description={description} canonicalUrl={absoluteUrl(path)} />
      <h1 className="text-4xl font-serif font-light text-[#1C3829] mb-3">{title}</h1>
      {updated && <p className="text-xs text-[#5D5D5D] mb-10">Última actualización: {SITE.lastLegalUpdate}</p>}
      <div className="space-y-5 text-[15px] leading-relaxed text-[#3d3d3d] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#1C3829] [&_h2]:mt-10 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-[#6f8656] [&_a]:underline">
        {children}
      </div>
    </div>
  );
}

const Titular = () => (
  <p>
    <b>{SITE.legalName}</b>{SITE.cuit ? <> (CUIT {SITE.cuit})</> : null}, con domicilio en {SITE.address} (en adelante, “Omia”). Contacto:{" "}
    <a href={`mailto:${SITE.email}`}>{SITE.email}</a> o desde el <Link to="/contacto">formulario de contacto</Link>.
  </p>
);

export function Terms() {
  return (
    <LegalPage title="Términos y condiciones" path="/terminos" description="Condiciones de uso de Omia: directorio de profesores e institutos de yoga y pilates, planes para profesionales y tienda.">
      <p>Estos términos regulan el uso del sitio <b>{SITE.url.replace(/^https?:\/\//, "")}</b> y de los servicios de Omia. Al crear una cuenta o usar el sitio, aceptás estas condiciones.</p>

      <h2>1. Quiénes somos</h2>
      <Titular />

      <h2>2. Qué es Omia</h2>
      <p>Omia es un directorio y una red que conecta a alumnos con profesores e institutos de yoga y pilates, y una tienda de artículos relacionados. Omia <b>no dicta las clases ni es parte de la relación entre alumno y profesional</b>: cada profesor o instituto es responsable por sus clases, sus horarios, sus precios y la información de su ficha.</p>

      <h2>3. Cuentas</h2>
      <ul>
        <li>Tenés que ser mayor de 18 años y brindar datos veraces. Sos responsable de la seguridad de tu contraseña.</li>
        <li>Podés registrarte como alumno, profesor o instituto. Podemos suspender cuentas que incumplan estas condiciones o publiquen contenido falso, ilegal u ofensivo.</li>
        <li>Podés pedir la baja de tu cuenta en cualquier momento desde el <Link to="/contacto?tipo=baja">formulario de baja</Link>.</li>
      </ul>

      <h2>4. Clases y pagos entre alumnos y profesionales</h2>
      <p>Las solicitudes de clase se hacen por la plataforma, pero <b>el precio se acuerda y se paga directamente entre el alumno y el profesional</b>. Omia no cobra comisión ni procesa esos pagos, y no se hace responsable por cancelaciones, devoluciones o diferencias entre las partes.</p>

      <h2>5. Planes para profesores e institutos</h2>
      <ul>
        <li>La ficha se publica en el directorio cuando se activa un plan. Los planes, sus beneficios y sus precios en pesos argentinos figuran en <Link to="/para-profes">Para profes</Link>.</li>
        <li>El plan es una <b>suscripción mensual con débito automático por Mercado Pago</b>. Se renueva cada mes hasta que te des de baja.</li>
        <li><b>Podés darte de baja cuando quieras</b> desde tu panel (<Link to="/perfil">Mi perfil</Link>), sin permanencia mínima. Conservás los beneficios hasta el final del período ya pagado.</li>
        <li>Si un cobro no se acredita, Mercado Pago reintenta automáticamente. Mantenemos tu plan unos días adicionales; si no se regulariza, la ficha deja de tener los beneficios del plan.</li>
        <li>Podemos modificar los precios con aviso previo de al menos 30 días por mail. Si no estás de acuerdo, podés darte de baja antes de la renovación.</li>
        <li>Si contratás como consumidor final, tenés derecho a revocar la contratación dentro de los 10 días corridos desde que la realizás (art. 34 de la Ley 24.240) desde el <Link to="/arrepentimiento">botón de arrepentimiento</Link>.</li>
      </ul>

      <h2>6. Reseñas y contenido</h2>
      <p>Las reseñas deben reflejar una experiencia real. Omia puede quitar reseñas falsas, injuriosas o que violen derechos de terceros. Al subir fotos y textos, nos autorizás a mostrarlos en el sitio y en nuestras comunicaciones, y declarás tener derecho a usarlos.</p>

      <h2>7. Tienda</h2>
      <ul>
        <li>Los precios están en pesos argentinos e incluyen impuestos. El costo de envío, si corresponde, se informa antes de pagar.</li>
        <li>Los pagos se procesan por Mercado Pago. Omia no almacena datos de tu tarjeta.</li>
        <li>Tenés derecho a arrepentirte de la compra dentro de los 10 días corridos de recibido el producto desde el <Link to="/arrepentimiento">botón de arrepentimiento</Link>, y a la garantía legal por fallas, según la Ley 24.240.</li>
      </ul>

      <h2>8. Asistente de inteligencia artificial</h2>
      <p>El chat y la búsqueda inteligente usan inteligencia artificial para sugerir fichas. Las respuestas son orientativas y pueden contener errores: verificá siempre los datos con el profesional antes de reservar.</p>

      <h2>9. Responsabilidad</h2>
      <p>Hacemos lo posible para que el sitio funcione sin interrupciones, pero no garantizamos disponibilidad permanente. Omia no responde por lesiones, daños o perjuicios derivados de la práctica de yoga o pilates, que es responsabilidad de quien la dicta y de quien la realiza (consultá siempre con un profesional de la salud si tenés dudas sobre tu condición física). Nada de lo dispuesto limita los derechos que la Ley de Defensa del Consumidor te reconoce.</p>

      <h2>10. Propiedad intelectual</h2>
      <p>La marca Omia, el diseño y el software del sitio son de {SITE.legalName}. No podés copiarlos ni usarlos sin autorización.</p>

      <h2>11. Cambios y ley aplicable</h2>
      <p>Podemos actualizar estos términos; cuando el cambio sea importante te avisamos por mail o en el sitio. Se rigen por las leyes de la República Argentina. Para reclamos de consumo, podés acudir a la autoridad de aplicación de tu jurisdicción (Defensa del Consumidor).</p>
    </LegalPage>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Política de privacidad" path="/privacidad" description="Cómo Omia trata tus datos personales: qué guardamos, para qué, con quién los compartimos y cómo ejercer tus derechos.">
      <p>En Omia cuidamos tus datos personales conforme a la <b>Ley 25.326 de Protección de Datos Personales</b>. Esta política explica qué recopilamos y por qué.</p>

      <h2>1. Responsable</h2>
      <Titular />

      <h2>2. Qué datos recopilamos</h2>
      <ul>
        <li><b>Cuenta:</b> nombre, email, contraseña (guardada cifrada, nunca en texto) o identificador de Google si ingresás con Google, y el tipo de cuenta.</li>
        <li><b>Ficha de profesores e institutos:</b> nombre, fotos, descripción, ubicación, horarios, precios y datos de contacto que decidas publicar.</li>
        <li><b>Actividad:</b> favoritos, reseñas, solicitudes de clase y compras en la tienda (incluidos los datos de entrega).</li>
        <li><b>Pagos:</b> los datos de tarjeta los procesa Mercado Pago; Omia solo recibe el estado y el importe del pago.</li>
        <li><b>Uso del sitio:</b> datos técnicos (navegador, páginas vistas) mediante cookies o herramientas de analítica, si las aceptás.</li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Crear tu cuenta, mostrar tu ficha y gestionar tu plan o tus compras.</li>
        <li>Enviarte mails del servicio (confirmaciones, cobros, recuperación de contraseña, solicitudes de clase).</li>
        <li>Mejorar el sitio y medir qué contenidos funcionan.</li>
        <li>Cumplir obligaciones legales y contables.</li>
      </ul>
      <p>No vendemos tus datos. Solo te enviaremos novedades comerciales si las pedís o das tu consentimiento, y podés darte de baja en cada mail.</p>

      <h2>4. Con quién los compartimos</h2>
      <p>Solo con proveedores que necesitamos para operar, que los tratan en nuestro nombre: Mercado Pago (pagos y suscripciones), Resend (envío de mails), Google (ingreso con Google, analítica y la inteligencia artificial del chat), y nuestro proveedor de hosting. Algunos están fuera de Argentina; en esos casos, solo se transfieren los datos necesarios. Tu ficha pública es visible para cualquier visitante.</p>

      <h2>5. Cookies</h2>
      <p>Usamos almacenamiento del navegador para mantener tu sesión y tus favoritos, y, si las aceptás, cookies de analítica y publicidad (Google Analytics, Meta). Podés rechazarlas desde el aviso de cookies del sitio o desde la configuración de tu navegador.</p>

      <h2>6. Tus derechos</h2>
      <p>Podés acceder, rectificar, actualizar o suprimir tus datos, y retirar tu consentimiento, cuando quieras. El acceso es gratuito a intervalos no inferiores a seis meses (art. 14, Ley 25.326). Escribinos desde el <Link to="/contacto?tipo=baja">formulario de baja</Link> o a <a href={`mailto:${SITE.email}`}>{SITE.email}</a> y respondemos dentro de los 10 días corridos.</p>
      <p>La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.</p>

      <h2>7. Conservación y seguridad</h2>
      <p>Guardamos tus datos mientras tengas cuenta y, después, solo lo que exija la ley (por ejemplo, registros de facturación). Usamos conexiones cifradas, contraseñas con hash y acceso restringido a la base de datos.</p>

      <h2>8. Menores</h2>
      <p>Omia no está dirigido a menores de 18 años y no recopilamos sus datos de forma intencional.</p>
    </LegalPage>
  );
}

export function About() {
  return (
    <LegalPage title="Nosotros" path="/nosotros" updated={false} description="Omia conecta a alumnos con profesores e institutos de yoga y pilates en Argentina, sin comisiones por clase.">
      <p className="text-lg text-[#1C3829]">Creamos Omia para que encontrar tu profe de yoga o pilates sea simple, y para que los profesionales vivan de lo que hacen sin pagar comisiones por cada clase.</p>
      <h2>Cómo funciona</h2>
      <ul>
        <li><b>Si buscás clases:</b> explorá el directorio por barrio, disciplina y precio, leé reseñas de otros alumnos y contactá directo al profe o al instituto.</li>
        <li><b>Si das clases:</b> creás tu ficha, elegís un plan mensual y recibís alumnos de tu zona. Cobrás el 100% de tus clases: Omia no interviene en ese pago.</li>
        <li><b>Tienda:</b> equipamiento seleccionado para tu práctica, con envío a todo el país.</li>
      </ul>
      <h2>Quiénes somos</h2>
      <Titular />
      <p>Seguinos en <a href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noopener noreferrer">Instagram @{SITE.instagram}</a>.</p>
    </LegalPage>
  );
}

// ─── Formularios (contacto, arrepentimiento, baja) ───────────────────────────

type Kind = "consulta" | "arrepentimiento" | "baja";

function ContactForm({ kind: initialKind, lockKind = false }: { kind: Kind; lockKind?: boolean }) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [form, setForm] = useState({ name: "", email: "", reference: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("sending");
    const { ok, data } = await apiJson("/api/contact", { ...form, kind }).catch(() => ({ ok: false, data: { error: "Error de conexión" } as any }));
    if (ok) setState("done");
    else { setError(data.error || "No pudimos enviar el mensaje. Probá de nuevo."); setState("idle"); }
  };

  if (state === "done") {
    return (
      <div className="bg-white border border-[#E8E0D0] rounded-2xl p-8 text-center">
        <p className="text-xl font-serif text-[#1C3829] mb-2">¡Recibimos tu mensaje!</p>
        <p className="text-sm text-[#5D5D5D]">Te enviamos un mail de confirmación a {form.email}. Te respondemos dentro de las próximas 48 horas hábiles.</p>
      </div>
    );
  }

  const input = "w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] rounded-xl px-4 py-3 outline-none text-sm";
  return (
    <form onSubmit={submit} className="bg-white border border-[#E8E0D0] rounded-2xl p-6 md:p-8 space-y-4 not-prose">
      {!lockKind && (
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={input}>
          <option value="consulta">Consulta general</option>
          <option value="baja">Baja de cuenta o de plan / ejercer mis derechos sobre mis datos</option>
          <option value="arrepentimiento">Arrepentimiento de una compra o contratación</option>
        </select>
      )}
      <input className={input} placeholder="Nombre y apellido" value={form.name} onChange={set("name")} required />
      <input className={input} type="email" placeholder="Email con el que te registraste o compraste" value={form.email} onChange={set("email")} required />
      {kind !== "consulta" && (
        <input className={input} placeholder={kind === "arrepentimiento" ? "Número de pedido o producto / plan *" : "Referencia (opcional)"} value={form.reference} onChange={set("reference")} required={kind === "arrepentimiento"} />
      )}
      <textarea className={`${input} min-h-[120px]`} placeholder={kind === "consulta" ? "Contanos en qué te podemos ayudar" : "Mensaje (opcional)"} value={form.message} onChange={set("message")} required={kind === "consulta"} />
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
      <button disabled={state === "sending"} className="w-full bg-[#98A77C] hover:bg-[#88976C] text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-60">
        {state === "sending" ? "Enviando…" : kind === "arrepentimiento" ? "Confirmar arrepentimiento" : kind === "baja" ? "Solicitar baja" : "Enviar mensaje"}
      </button>
    </form>
  );
}

export function Contact() {
  const initial = new URLSearchParams(window.location.search).get("tipo");
  const kind: Kind = initial === "baja" || initial === "arrepentimiento" ? initial : "consulta";
  return (
    <LegalPage title="Contacto" path="/contacto" updated={false} description="Escribinos para consultas, para darte de baja o ejercer tus derechos sobre tus datos.">
      <p>Respondemos dentro de las próximas 48 horas hábiles. También podés escribirnos a <a href={`mailto:${SITE.email}`}>{SITE.email}</a>{SITE.whatsapp ? <> o por <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></> : null}.</p>
      <ContactForm kind={kind} />
    </LegalPage>
  );
}

export function Regret() {
  return (
    <LegalPage title="Botón de arrepentimiento" path="/arrepentimiento" updated={false} description="Revocá una compra en la tienda o una contratación de plan dentro de los 10 días corridos, según la Ley 24.240.">
      <p>Si compraste en la tienda o contrataste un plan en Omia, podés <b>arrepentirte dentro de los 10 días corridos</b> desde que recibiste el producto o contrataste el servicio (art. 34, Ley 24.240 y Res. 424/2020). Completá este formulario y te enviamos la constancia por mail. La devolución del dinero se hace por el mismo medio de pago.</p>
      <ContactForm kind="arrepentimiento" lockKind />
    </LegalPage>
  );
}

export function NotFound() {
  return (
    <div className="pt-40 pb-32 px-6 text-center">
      <SEOMeta title="Página no encontrada" description="La página que buscás no existe." noindex />
      <p className="text-6xl font-serif italic text-[#98A77C] mb-4">404</p>
      <h1 className="text-2xl text-[#1C3829] mb-3">No encontramos esta página</h1>
      <p className="text-[#5D5D5D] mb-8">Puede que el enlace esté mal o que la ficha ya no esté publicada.</p>
      <Link to="/directorio" className="inline-block bg-[#98A77C] hover:bg-[#88976C] text-white px-7 py-3 rounded-sm font-semibold">Ir al directorio</Link>
    </div>
  );
}
