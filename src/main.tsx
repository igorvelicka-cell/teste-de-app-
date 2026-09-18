import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  History,
  Home,
  Plus,
  Settings,
  ShieldCheck,
  Upload,
  X,
  Zap,
  Droplets,
  Wifi,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import {
  addMonth,
  dateBR,
  demo,
  empty,
  generate,
  money,
  monthLabel,
  status,
  today,
  total,
  uid,
  type Bill,
  type Data,
  type Rule,
} from "./domain";
import {
  exportBackup,
  load,
  native,
  readImage,
  save,
  validate,
} from "./storage";
import { enableNotifications, syncNotifications } from "./notifications";
import "./style.css";
type Page = "overview" | "bills" | "properties" | "history" | "settings";
type Modal =
  | { kind: "property"; id?: string }
  | { kind: "bill"; bill?: Bill }
  | { kind: "pay"; bill: Bill }
  | null;
const pendingLabel = (b: Bill[]) =>
  b.length > 0 && b.every((x) => x.amount === null)
    ? "Valor a informar"
    : money(total(b));
const icons: Record<string, React.ReactNode> = {
  Luz: <Zap />,
  Água: <Droplets />,
  Internet: <Wifi />,
};
function App() {
  const [data, setData] = useState<Data>(empty()),
    [ready, setReady] = useState(false),
    [fatal, setFatal] = useState(""),
    [isDemo, setDemo] = useState(false),
    [page, setPage] = useState<Page>("overview"),
    [month, setMonth] = useState(today().slice(0, 7)),
    [filter, setFilter] = useState("all"),
    [property, setProperty] = useState("all"),
    [modal, setModal] = useState<Modal>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const fail = (e: unknown) =>
    setNotice(
      e instanceof Error ? e.message : "Não foi possível concluir a operação.",
    );
  useEffect(() => {
    load()
      .then(async (d) => {
        const next = generate(d);
        await save(next);
        setData(next);
        setReady(true);
        try {
          await syncNotifications(next);
        } catch (e) {
          fail(e);
        }
      })
      .catch((e) => {
        setFatal(String(e));
        setReady(true);
      });
  }, []);
  useEffect(() => {
    if (!ready || fatal) return;
    const refresh = () => {
      if (document.visibilityState === "visible" && !busy) {
        const next = generate(data);
        if (next.bills.length !== data.bills.length) void commit(next);
        else if (!isDemo) void syncNotifications(data).catch(fail);
      }
    };
    document.addEventListener("visibilitychange", refresh);
    const t = setInterval(refresh, 60000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(t);
    };
  }, [data, ready, isDemo, busy, fatal]);
  async function commit(next: Data) {
    setBusy(true);
    try {
      if (!isDemo) await save(next);
      setData(next);
      if (!isDemo)
        try {
          await syncNotifications(next);
        } catch (e) {
          setNotice("Dados salvos. Falha nos lembretes: " + String(e));
        }
      return true;
    } catch (e) {
      setNotice("Não foi possível salvar. " + String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function switchDemo() {
    setBusy(true);
    try {
      const next = isDemo ? generate(await load()) : demo();
      if (isDemo) await save(next);
      setData(next);
      setDemo(!isDemo);
      setProperty("all");
      setFilter("all");
      setPage("overview");
      setMonth(today().slice(0, 7));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  const selected = data.bills.filter(
    (b) =>
      b.month === month && (property === "all" || b.propertyId === property),
  );
  const paid = selected.filter((b) => b.paidAt),
    pending = selected.filter((b) => !b.paidAt);
  const overdue = data.bills.filter((b) => !b.paidAt && b.due < today());
  const upcoming = selected.filter(
    (b) =>
      !b.paidAt &&
      b.due >= today() &&
      b.due <= new Date(Date.now() + 7 * 86400000).toLocaleDateString("sv-SE"),
  );
  let shown = (
    filter === "late"
      ? overdue.filter((b) => property === "all" || b.propertyId === property)
      : selected
  )
    .filter((b) =>
      filter === "paid" ? b.paidAt : filter === "pending" ? !b.paidAt : true,
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  const navigate = (p: Page) => {
    setPage(p);
    setFilter("all");
    setProperty("all");
  };
  async function removeBill(b: Bill) {
    if (
      !confirm(
        `Excluir a cobrança “${b.name}” de ${monthLabel(b.month)}? Ela não será recriada automaticamente.`,
      )
    )
      return;
    await commit({
      ...data,
      bills: data.bills.filter((x) => x.id !== b.id),
      skipped: [...data.skipped, b.id],
    });
  }
  const billRow = (b: Bill) => (
    <div className="bill-row" key={b.id}>
      <span className={`category-icon ${b.category === "Água" ? "blue" : ""}`}>
        {icons[b.category] || <FileText />}
      </span>
      <button
        className="bill-main text-button"
        onClick={() => setModal({ kind: "bill", bill: b })}
      >
        <strong>
          {b.name}
          {b.installment
            ? ` · ${b.installment}/${data.rules.find((r) => r.id === b.ruleId)?.count}`
            : ""}
        </strong>
        <small>
          {data.properties.find((p) => p.id === b.propertyId)?.name}{" "}
          <span>· {dateBR(b.due)}</span>
        </small>
      </button>
      <span className="bill-amount">
        {b.amount === null ? <em>Valor a informar</em> : money(b.amount)}
        <small className={`status ${status(b).toLowerCase()}`}>
          {status(b)}
        </small>
      </span>
      <button
        className="icon-button row-action"
        aria-label={`Editar ${b.name}`}
        onClick={() => setModal({ kind: "bill", bill: b })}
      >
        <MoreHorizontal />
      </button>
      {!b.paidAt && (
        <button
          className="pay-button"
          onClick={() => setModal({ kind: "pay", bill: b })}
        >
          <Check size={16} />
          <span>Pagar</span>
        </button>
      )}
    </div>
  );
  const titles: Record<Page, string> = {
    overview: "Tudo sob controle.",
    bills: "Suas contas, organizadas.",
    properties: "Um lugar para cada imóvel.",
    history: "Seu histórico financeiro.",
    settings: "Do seu jeito.",
  };
  if (!ready) return <div className="loading">Preparando suas contas…</div>;
  if (fatal)
    return (
      <div className="loading">
        <h2>Não foi possível abrir os dados</h2>
        <p>{fatal}</p>
        <p>
          Os arquivos existentes não foram substituídos. Verifique o
          armazenamento e tente novamente.
        </p>
        <button onClick={() => location.reload()}>Tentar novamente</button>
      </div>
    );
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => navigate("overview")}>
          <span className="brand-icon">
            <CheckCircle2 />
          </span>
          <span>
            Contas em Dia<small>SEU LAR. SUAS CONTAS. EM DIA.</small>
          </span>
        </a>
        <div className="nav-label">PRINCIPAL</div>
        <nav>
          {(
            [
              ["overview", "Visão geral", LayoutDashboard],
              ["bills", "Contas", FileText],
              ["properties", "Imóveis", Building2],
              ["history", "Histórico", History],
              ["settings", "Ajustes", Settings],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              aria-label={label}
              className={page === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "properties" && <i>{data.properties.length}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck />
          <strong>Seu espaço é privado</strong>
          <p>
            Seus dados ficam neste dispositivo.
            <br />
            Sem login. Sem nuvem.
          </p>
          <span className="offline-dot">Disponível offline</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <Home size={16} /> Meu espaço <span className="slash">/</span>{" "}
            {
              {
                overview: "Visão geral",
                bills: "Contas",
                properties: "Imóveis",
                history: "Histórico",
                settings: "Ajustes",
              }[page]
            }
          </span>
          <div>
            <span className="local-tag">● Armazenamento local</span>
            <button
              className="avatar"
              onClick={() => navigate("settings")}
              aria-label="Abrir ajustes"
            >
              EU
            </button>
          </div>
        </header>
        <main>
          {isDemo && (
            <div className="demo-banner">
              <span>
                Modo demonstração · dados fictícios, separados dos seus dados
              </span>
              <button onClick={switchDemo} disabled={busy}>
                Sair da demonstração <X size={14} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                MENOS PREOCUPAÇÃO, MAIS TRANQUILIDADE
              </div>
              <h1>{titles[page]}</h1>
              <p>
                {page === "overview"
                  ? "Acompanhe cada imóvel e mantenha as contas em dia."
                  : page === "history"
                    ? "Consulte cobranças e pagamentos de todos os meses."
                    : page === "settings"
                      ? "Cuide dos seus dados e das suas preferências."
                      : "Todos os detalhes, sempre à mão."}
              </p>
            </div>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                setModal({
                  kind:
                    page === "properties" || !data.properties.length
                      ? "property"
                      : "bill",
                })
              }
            >
              <Plus size={18} />
              {page === "properties" || !data.properties.length
                ? "Novo imóvel"
                : "Nova conta"}
            </button>
          </div>
          {["overview", "bills", "history"].includes(page) && (
            <>
              <div className="month-toolbar">
                <div className="month-picker">
                  <button
                    className="icon-button"
                    aria-label="Mês anterior"
                    onClick={() => setMonth(addMonth(month, -1))}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <label>
                    <input
                      type="month"
                      min="2000-01"
                      max="2100-12"
                      value={month}
                      onChange={(e) =>
                        e.target.value && setMonth(e.target.value)
                      }
                    />
                    <strong>{monthLabel(month)}</strong>
                  </label>
                  <button
                    className="icon-button"
                    aria-label="Próximo mês"
                    onClick={() => setMonth(addMonth(month, 1))}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <button
                  className="text-button muted"
                  onClick={() => setMonth(today().slice(0, 7))}
                >
                  Voltar para hoje
                </button>
                <span className="month-note">Uma visão clara do seu mês</span>
              </div>
              <section className="stats">
                <article className="stat paid-stat">
                  <div>
                    <span>Total pago</span>
                    <span className="stat-icon">
                      <ArrowDownLeft size={19} />
                    </span>
                  </div>
                  <strong>{money(total(paid))}</strong>
                  <small>
                    <span className="green-dot" /> {paid.length}{" "}
                    {paid.length === 1 ? "conta paga" : "contas pagas"} no mês
                  </small>
                </article>
                <article className="stat">
                  <div>
                    <span>Total pendente</span>
                    <span className="stat-icon">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                  <strong>
                    <span
                      className={
                        pending.length > 0 &&
                        pending.every((b) => b.amount === null)
                          ? "unknown-total"
                          : ""
                      }
                    >
                      {pendingLabel(pending)}
                    </span>
                  </strong>
                  <small>
                    {pending.length} contas ·{" "}
                    {pending.filter((b) => b.amount === null).length} com valor
                    a informar
                  </small>
                </article>
                <button
                  className="stat stat-button"
                  onClick={() => {
                    setFilter("late");
                    setPage("bills");
                  }}
                >
                  <div>
                    <span>Contas atrasadas</span>
                    <span className="stat-icon orange">
                      <History size={19} />
                    </span>
                  </div>
                  <strong>
                    {overdue.length.toString().padStart(2, "0")}{" "}
                    <em>{pendingLabel(overdue)}</em>
                  </strong>
                  <small className="orange-text">
                    Todos os meses · precisam de atenção
                  </small>
                </button>
                <article className="stat">
                  <div>
                    <span>Próximos vencimentos</span>
                    <span className="stat-icon">
                      <Bell size={19} />
                    </span>
                  </div>
                  <strong>
                    {upcoming.length.toString().padStart(2, "0")}{" "}
                    <em>contas</em>
                  </strong>
                  <small>Nos próximos 7 dias deste mês</small>
                </article>
              </section>
            </>
          )}
          {page === "overview" && overdue.length > 0 && (
            <button
              className="attention"
              onClick={() => {
                setPage("bills");
                setFilter("late");
              }}
            >
              <span>
                <span className="attention-dot" />
                Há {overdue.length}{" "}
                {overdue.length === 1
                  ? "conta aguardando"
                  : "contas aguardando"}{" "}
                sua atenção, incluindo meses anteriores.
              </span>
              <span>
                Ver atrasadas <ArrowRight size={16} />
              </span>
            </button>
          )}
          {(page === "overview" || page === "properties") && (
            <section>
              <div className="section-heading">
                <h2>
                  Seus imóveis <span>{data.properties.length}</span>
                </h2>
                {page === "overview" && (
                  <button
                    className="text-button"
                    onClick={() => navigate("properties")}
                  >
                    Gerenciar imóveis <ArrowRight size={16} />
                  </button>
                )}
              </div>
              <div className="property-grid">
                {data.properties.map((p, i) => {
                  const bills = data.bills.filter(
                    (b) => b.propertyId === p.id && b.month === month,
                  );
                  const done = bills.filter((b) => b.paidAt);
                  return (
                    <article className="property-card" key={p.id}>
                      <div className={`property-art art-${i % 3}`}>
                        <Building2 size={55} strokeWidth={1} />
                        <span>IMÓVEL {String(i + 1).padStart(2, "0")}</span>
                        {page === "properties" && (
                          <button
                            className="icon-button"
                            aria-label={`Editar ${p.name}`}
                            onClick={() =>
                              setModal({ kind: "property", id: p.id })
                            }
                          >
                            <Pencil size={17} />
                          </button>
                        )}
                      </div>
                      <div className="property-body">
                        <button
                          className="text-button property-name"
                          onClick={() => {
                            setPage("bills");
                            setProperty(p.id);
                            setFilter("all");
                          }}
                        >
                          {p.name}
                          <ArrowUpRight size={18} />
                        </button>
                        <p>
                          {bills.length} contas em{" "}
                          {monthLabel(month).split(" de ")[0]}
                        </p>
                        <div className="property-totals">
                          <span>
                            Pendente
                            <strong className="property-pending">
                              {pendingLabel(bills.filter((b) => !b.paidAt))}
                            </strong>
                          </span>
                          <span>
                            Pago
                            <strong className="green-text">
                              {money(total(done))}
                            </strong>
                          </span>
                        </div>
                        <div className="progress">
                          <div
                            style={{
                              width: `${bills.length ? (done.length / bills.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <small>
                          {done.length} de {bills.length} contas pagas
                          {bills.some((b) => b.amount === null)
                            ? " · Valor a informar"
                            : ""}
                        </small>
                      </div>
                    </article>
                  );
                })}
                <button
                  className="add-property"
                  onClick={() => setModal({ kind: "property" })}
                >
                  <span>
                    <Plus />
                  </span>
                  <strong>Adicionar imóvel</strong>
                  <small>Organize um novo endereço</small>
                </button>
              </div>
            </section>
          )}
          {["overview", "bills", "history"].includes(page) && (
            <section className="bills-section">
              <div className="section-heading">
                <h2>
                  {page === "history"
                    ? "Cobranças por competência"
                    : "Contas do mês"}{" "}
                  <span>{shown.length}</span>
                </h2>
                {page === "overview" && (
                  <button
                    className="text-button"
                    onClick={() => navigate("history")}
                  >
                    Ver histórico <ArrowRight size={16} />
                  </button>
                )}
              </div>
              <div className="bill-panel">
                <div className="filters">
                  <div className="tabs">
                    {(
                      [
                        ["all", "Todas"],
                        ["pending", "Pendentes"],
                        ["paid", "Pagas"],
                        ["late", "Atrasadas"],
                      ] as const
                    ).map(([v, l]) => (
                      <button
                        className={filter === v ? "selected" : ""}
                        onClick={() => setFilter(v)}
                        key={v}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <select
                    aria-label="Filtrar imóvel"
                    value={property}
                    onChange={(e) => setProperty(e.target.value)}
                  >
                    <option value="all">Todos os imóveis</option>
                    {data.properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {shown.length ? (
                  shown.map(billRow)
                ) : (
                  <div className="empty">
                    <FileText size={32} />
                    <h3>Nenhuma conta por aqui</h3>
                    <p>
                      {month > today().slice(0, 7)
                        ? "As contas mensais aparecem no início de cada mês."
                        : "Cadastre uma conta para começar a organizar este mês."}
                    </p>
                    <button
                      className="secondary"
                      onClick={() =>
                        setModal({
                          kind: data.properties.length ? "bill" : "property",
                        })
                      }
                    >
                      Começar <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
          {page === "history" && (
            <section className="history-panel">
              <h2>Pagamentos realizados em {monthLabel(month)}</h2>
              <p>
                Totais pela data do pagamento, por imóvel. A lista acima usa o
                mês da cobrança.
              </p>
              {data.properties.map((p) => {
                const bs = data.bills.filter(
                  (b) => b.propertyId === p.id && b.paidAt?.startsWith(month),
                );
                return (
                  <div className="history-row" key={p.id}>
                    <span>
                      {p.name}
                      <small>{bs.length} pagamentos</small>
                    </span>
                    <strong>{money(total(bs))}</strong>
                  </div>
                );
              })}
              <div className="history-row">
                <strong>Total efetivamente pago</strong>
                <strong>
                  {money(
                    total(
                      data.bills.filter((b) => b.paidAt?.startsWith(month)),
                    ),
                  )}
                </strong>
              </div>
            </section>
          )}
          {page === "settings" && (
            <div className="settings-grid">
              <section className="settings-card">
                <Bell />
                <h2>Lembretes de vencimento</h2>
                <p>
                  Dois dias antes, às 9h, no Android. Ao pagar ou editar uma
                  conta, os lembretes são atualizados.
                </p>
                {native ? (
                  <button
                    className="secondary"
                    disabled={busy || isDemo}
                    onClick={async () => {
                      try {
                        const enabled = data.reminders
                          ? false
                          : await enableNotifications();
                        await commit({ ...data, reminders: enabled });
                      } catch (e) {
                        fail(e);
                      }
                    }}
                  >
                    {data.reminders
                      ? "Desativar lembretes"
                      : "Ativar lembretes"}
                  </button>
                ) : (
                  <div className="info">
                    Disponível no aplicativo Android. A prévia web não envia
                    notificações.
                  </div>
                )}
                <small>
                  O Android pode exigir autorização para alarmes exatos. A
                  programação cobre os próximos 12 meses e é renovada ao abrir o
                  app.
                </small>
              </section>
              <section className="settings-card">
                <ShieldCheck />
                <h2>Backup e segurança</h2>
                <p>
                  Exporte um arquivo com todos os imóveis, contas e fotos.
                  Guarde uma cópia em um lugar seguro.
                </p>
                <button
                  className="secondary"
                  onClick={() => exportBackup(data).catch(fail)}
                >
                  <Download size={17} />
                  Exportar backup{isDemo ? " de demonstração" : ""}
                </button>
                <label className="secondary file-label">
                  <Upload size={17} />
                  Restaurar backup
                  <input
                    type="file"
                    accept=".json,application/json"
                    disabled={busy}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        if (f.size > 100 * 1024 * 1024)
                          throw new Error("O backup excede 100 MB.");
                        const restored = validate(JSON.parse(await f.text()));
                        if (
                          confirm(
                            `Backup válido: ${restored.properties.length} imóveis e ${restored.bills.length} cobranças. Substituir todos os dados ${isDemo ? "da demonstração" : "reais"} e fotos atuais?`,
                          )
                        ) {
                          if (await commit(generate(restored)))
                            setNotice("Backup restaurado com sucesso.");
                        }
                      } catch (e) {
                        fail(e);
                      }
                    }}
                  />
                </label>
                <small>
                  Atualizações preservam os arquivos privados do app.
                  Desinstalar ou limpar dados pode apagá-los. A recuperação
                  depende do seu backup.
                </small>
              </section>
              <section className="settings-card">
                <LayoutDashboard />
                <h2>Conheça o aplicativo</h2>
                <p>
                  Explore imóveis e contas fictícias sem misturar com seus dados
                  reais.
                </p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={switchDemo}
                >
                  {isDemo ? "Sair da demonstração" : "Entrar na demonstração"}
                </button>
              </section>
            </div>
          )}
          {!isDemo && page === "overview" && !data.properties.length && (
            <div className="demo-invite">
              <span>
                Quer conhecer antes de cadastrar? Explore uma demonstração com
                dados fictícios.
              </span>
              <button
                className="text-button"
                disabled={busy}
                onClick={switchDemo}
              >
                Abrir demonstração <ArrowRight size={16} />
              </button>
            </div>
          )}
          <footer>
            <ShieldCheck size={14} />
            <span>
              Feito para cuidar das suas contas. Seus dados ficam com você.
            </span>
            <span>Contas em Dia · v1.0</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="alert">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setNotice("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {modal && (
        <Editor
          modal={modal}
          data={data}
          busy={busy}
          onClose={() => setModal(null)}
          onError={fail}
          onSave={async (d) => {
            if (await commit(d)) setModal(null);
          }}
          removeBill={removeBill}
        />
      )}
    </div>
  );
}
function Editor({
  modal,
  data,
  busy,
  onClose,
  onSave,
  onError,
  removeBill,
}: {
  modal: NonNullable<Modal>;
  data: Data;
  busy: boolean;
  onClose: () => void;
  onSave: (d: Data) => Promise<void>;
  onError: (e: unknown) => void;
  removeBill: (b: Bill) => Promise<void>;
}) {
  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const all = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".modal button:not(:disabled), .modal input:not(:disabled), .modal select:not(:disabled), .modal a[href]",
          ),
        ).filter((x) => x.offsetWidth > 0);
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prior?.focus();
    };
  }, [busy]);
  const b =
    modal.kind === "bill"
      ? modal.bill
      : modal.kind === "pay"
        ? modal.bill
        : undefined;
  const p =
    modal.kind === "property"
      ? data.properties.find((p) => p.id === modal.id)
      : undefined;
  const [name, setName] = useState(p?.name ?? b?.name ?? ""),
    [pid, setPid] = useState(b?.propertyId ?? data.properties[0]?.id ?? ""),
    [category, setCategory] = useState(b?.category ?? "Luz"),
    [kind, setKind] = useState<Rule["kind"]>("monthly"),
    [amount, setAmount] = useState(
      b?.amount != null ? String(b.amount / 100).replace(".", ",") : "",
    ),
    [due, setDue] = useState(b?.due ?? today()),
    [count, setCount] = useState(12),
    [photo, setPhoto] = useState(b?.photo),
    [receipt, setReceipt] = useState(b?.receipt),
    [paidAt, setPaidAt] = useState(b?.paidAt ?? today()),
    [reading, setReading] = useState(false);
  const cents = () => {
    if (!amount.trim()) return null;
    if (!/^\d{1,9}([,.]\d{1,2})?$/.test(amount.trim()))
      throw new Error("Informe um valor como 129,90, sem separador de milhar.");
    return Math.round(Number(amount.replace(",", ".")) * 100);
  };
  const attachment = (
    label: string,
    value: string | undefined,
    set: (v: string | undefined) => void,
  ) => (
    <div className="attachment">
      <span>{label}</span>
      {value ? (
        <div className="photo-preview">
          <a href={value} target="_blank" rel="noreferrer">
            <img src={value} alt={label} />
          </a>
          <button
            type="button"
            className="text-button"
            onClick={() => set(undefined)}
          >
            Remover foto
          </button>
        </div>
      ) : (
        <label className="upload-box">
          <Upload size={19} />
          <span>
            Anexar foto <small>JPG, PNG ou WebP · até 5 MB</small>
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setReading(true);
              try {
                set(await readImage(f));
              } catch (err) {
                onError(err);
              } finally {
                setReading(false);
              }
            }}
          />
        </label>
      )}
    </div>
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modal.kind === "property") {
        if (!name.trim()) throw new Error("Informe o nome do imóvel.");
        const next = structuredClone(data);
        if (p) next.properties.find((x) => x.id === p.id)!.name = name.trim();
        else next.properties.push({ id: uid(), name: name.trim() });
        await onSave(next);
        return;
      }
      const value = cents();
      if (modal.kind === "pay") {
        if (value === null)
          throw new Error("Informe o valor antes de registrar o pagamento.");
        await onSave({
          ...data,
          bills: data.bills.map((x) =>
            x.id === b!.id ? { ...x, amount: value, paidAt, receipt } : x,
          ),
        });
        return;
      }
      if (!name.trim() || !category.trim())
        throw new Error("Preencha nome e categoria.");
      if (b) {
        if (b.paidAt && value === null)
          throw new Error("Uma conta paga precisa ter valor.");
        await onSave({
          ...data,
          bills: data.bills.map((x) =>
            x.id === b.id
              ? {
                  ...x,
                  name: name.trim(),
                  category: category.trim(),
                  amount: value,
                  due,
                  photo,
                  receipt,
                  paidAt: x.paidAt ? paidAt : null,
                }
              : x,
          ),
        });
      } else {
        const id = uid();
        const rule: Rule = {
          id,
          propertyId: pid,
          name: name.trim(),
          category: category.trim(),
          kind,
          start: due.slice(0, 7),
          day: Number(due.slice(-2)),
          count: kind === "installments" ? count : 1,
          amount: value,
          active: true,
        };
        let next = generate({ ...data, rules: [...data.rules, rule] });
        if (!next.bills.some((x) => x.id === `${id}:${rule.start}`)) {
          const first = generate(
            { ...empty(), properties: data.properties, rules: [rule] },
            rule.start,
          );
          next.bills.push(...first.bills);
        }
        next.bills = next.bills.map((x) =>
          x.id === `${id}:${rule.start}` ? { ...x, amount: value, photo } : x,
        );
        await onSave(next);
      }
    } catch (err) {
      onError(err);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !reading) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal"
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">CONTAS EM DIA</div>
            <h2 id="modal-title">
              {modal.kind === "property"
                ? p
                  ? "Editar imóvel"
                  : "Novo imóvel"
                : modal.kind === "pay"
                  ? "Registrar pagamento"
                  : b
                    ? "Detalhes da cobrança"
                    : "Nova conta"}
            </h2>
          </div>
          <button
            className="icon-button"
            disabled={busy || reading}
            onClick={onClose}
            aria-label="Fechar"
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <fieldset disabled={busy || reading}>
            {modal.kind === "property" ? (
              <label>
                Nome do imóvel
                <input
                  autoFocus
                  required
                  maxLength={100}
                  placeholder="Ex.: Casa Jardim"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            ) : modal.kind === "pay" ? (
              <>
                <div className="payment-summary">
                  <CheckCircle2 />
                  <strong>{b?.name}</strong>
                  <small>
                    {data.properties.find((p) => p.id === b?.propertyId)?.name}
                  </small>
                </div>
                <label>
                  Valor pago (R$)
                  <input
                    required
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Data do pagamento
                  <input
                    required
                    type="date"
                    min="2000-01-01"
                    max={today()}
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                  />
                </label>
                {attachment("Foto do comprovante", receipt, setReceipt)}
              </>
            ) : (
              <>
                <label>
                  Nome da conta
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    placeholder="Ex.: Energia elétrica"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Imóvel
                    <select
                      value={pid}
                      disabled={!!b}
                      onChange={(e) => setPid(e.target.value)}
                    >
                      {data.properties.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Categoria
                    <input
                      list="categories"
                      required
                      maxLength={80}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                    <datalist id="categories">
                      {[
                        "Luz",
                        "Água",
                        "IPTU",
                        "Internet",
                        "Condomínio",
                        "Gás",
                        "Seguro",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </datalist>
                  </label>
                </div>
                {!b && (
                  <>
                    <label>
                      Tipo da conta
                      <select
                        value={kind}
                        onChange={(e) =>
                          setKind(e.target.value as Rule["kind"])
                        }
                      >
                        <option value="monthly">Mensal recorrente</option>
                        <option value="installments">Parcelada</option>
                        <option value="once">Pagamento único</option>
                      </select>
                    </label>
                    {kind === "installments" && (
                      <label>
                        Quantidade de parcelas
                        <input
                          required
                          type="number"
                          min={1}
                          max={600}
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                        />
                      </label>
                    )}
                    <p className="form-help">
                      {kind === "monthly"
                        ? "A cada mês, uma nova cobrança sem valor e sem foto. O dia do vencimento é mantido."
                        : kind === "installments"
                          ? "O valor informado será o valor de cada parcela mensal."
                          : "Esta conta gera apenas uma cobrança."}
                    </p>
                  </>
                )}
                <div className="form-grid">
                  <label>
                    Valor {kind === "installments" && !b ? "da parcela " : ""}
                    (R$)
                    <input
                      inputMode="decimal"
                      placeholder="Valor a informar"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                  <label>
                    Vencimento
                    <input
                      required
                      type="date"
                      min="2000-01-01"
                      max="2100-12-31"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                    />
                  </label>
                </div>
                {attachment("Foto da conta", photo, setPhoto)}
                {b?.paidAt && (
                  <>
                    <div className="info">Paga em {dateBR(b.paidAt)}</div>
                    <label>
                      Corrigir data do pagamento
                      <input
                        type="date"
                        required
                        min="2000-01-01"
                        max={today()}
                        value={paidAt}
                        onChange={(e) => {
                          setPaidAt(e.target.value);
                        }}
                      />
                    </label>
                    {attachment("Foto do comprovante", receipt, setReceipt)}
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        if (
                          confirm(
                            "Desfazer pagamento? A cobrança volta a ficar pendente ou atrasada e o comprovante será removido.",
                          )
                        )
                          await onSave({
                            ...data,
                            bills: data.bills.map((x) =>
                              x.id === b.id
                                ? { ...x, paidAt: null, receipt: undefined }
                                : x,
                            ),
                          });
                      }}
                    >
                      Desfazer pagamento
                    </button>
                  </>
                )}
                {b && (
                  <p className="form-help">
                    Alterações afetam somente esta cobrança. Competência:{" "}
                    {monthLabel(b.month)}.
                  </p>
                )}
              </>
            )}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={onClose}>
                Cancelar
              </button>
              <button className="primary" type="submit">
                {busy
                  ? "Salvando…"
                  : reading
                    ? "Lendo foto…"
                    : modal.kind === "pay"
                      ? "Confirmar pagamento"
                      : "Salvar"}
              </button>
            </div>
            {p && (
              <button
                className="danger"
                type="button"
                onClick={async () => {
                  if (
                    confirm(
                      `Excluir “${p.name}” e todas as suas contas, histórico e fotos?`,
                    )
                  )
                    await onSave({
                      ...data,
                      properties: data.properties.filter((x) => x.id !== p.id),
                      rules: data.rules.filter((r) => r.propertyId !== p.id),
                      bills: data.bills.filter((b) => b.propertyId !== p.id),
                    });
                }}
              >
                <Trash2 size={15} />
                Excluir imóvel e contas
              </button>
            )}
            {b && modal.kind === "bill" && (
              <div className="danger-zone">
                <button
                  className="danger"
                  type="button"
                  onClick={async () => {
                    await removeBill(b);
                    onClose();
                  }}
                >
                  Excluir esta cobrança
                </button>
                {data.rules.find((r) => r.id === b.ruleId)?.active &&
                  data.rules.find((r) => r.id === b.ruleId)?.kind ===
                    "monthly" && (
                    <button
                      className="danger"
                      type="button"
                      onClick={async () => {
                        if (
                          confirm(
                            "Encerrar recorrência? As cobranças existentes e o histórico serão preservados.",
                          )
                        )
                          await onSave({
                            ...data,
                            rules: data.rules.map((r) =>
                              r.id === b.ruleId ? { ...r, active: false } : r,
                            ),
                          });
                      }}
                    >
                      Encerrar recorrência
                    </button>
                  )}
              </div>
            )}
          </fieldset>
        </form>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.PROD && !native && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  });
}
