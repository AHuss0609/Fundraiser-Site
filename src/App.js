import React from "react";

/**
 * BHS DECA × Family Promise – Fundraiser Website (single-file React app)
 *
 * Canvas-ready, Stripe-only build (no PayPal code). Uses a tiny hash router so it
 * runs here and on GitHub Pages without external router packages.
 *
 * How to use in Canvas:
 * - This file exports a default <App/>. Press ▶️ Run.
 * - Navigation uses #/ routes (e.g., #/donate, #/events, etc.).
 *
 * What’s included:
 * - Bright animated background, responsive layout
 * - LocalStorage data store (totals, donations, events, team)
 * - Donate page with Stripe Checkout only (credit/debit cards)
 * - Admin page (PIN: DECA2025) to add offline donations & events
 * - Built-in test panel on Home
 */

/**********************
 * 1) CONFIG
 **********************/
const GOAL_AMOUNT = 10000;
const ADMIN_PIN = "DECA2025";

// GitHub Pages is static, so Stripe must point to an external serverless function URL.
const STRIPE_BACKEND_URL = "https://YOUR_FUNCTION_HOST/create-checkout-session"; // replace when ready

// Backend switch — localStorage for demo; flip to API later
const USE_API = false; // set true when your API is ready (enables live totals pulled from your backend/webhook)
const BASE_URL = "https://your.api.example/v1"; // update when USE_API === true

// Utility helpers
const currency = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });
const uuid = (typeof crypto !== "undefined" && crypto.randomUUID) ? () => crypto.randomUUID() : () => Math.random().toString(36).slice(2);

/**********************
 * 2) TINY HASH ROUTER (no external deps)
 **********************/
const Router = ({ routes, fallback = "/" }) => {
  const [path, setPath] = React.useState(() => normalize(window.location.hash));
  React.useEffect(() => {
    const onHash = () => setPath(normalize(window.location.hash));
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.hash = fallback; // default route
    return () => window.removeEventListener("hashchange", onHash);
  }, [fallback]);
  const Page = routes[path] || routes[fallback] || (() => null);
  return <Page />;
};

function normalize(hash) {
  const raw = (hash || "").replace(/^#/, "");
  const [p] = raw.split("?"); // keep query separate
  return p || "/";
}

function useCurrentPath() {
  const [path, setPath] = React.useState(() => normalize(window.location.hash));
  React.useEffect(() => {
    const onHash = () => setPath(normalize(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return path;
}

/**********************
 * 3) DATA STORE (localStorage-first, API-ready)
 **********************/
const FundraisingStore = {
  async getTotals() {
    if (USE_API) {
      const r = await fetch(`${BASE_URL}/fundraising/totals`);
      return r.json();
    }
    const raw = JSON.parse(localStorage.getItem("fundraise_totals") || "{}");
    return {
      totalRaised: Number(raw.totalRaised || 0),
      goal: Number(raw.goal || GOAL_AMOUNT),
      lastUpdated: raw.lastUpdated || new Date().toISOString(),
    };
  },
  async addDonation({ amount, source = "online", name = "Anonymous", email = "" }) {
    if (USE_API) {
      const r = await fetch(`${BASE_URL}/fundraising/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, source, name, email }),
      });
      return r.json();
    }
    const totals = await this.getTotals();
    const newTotal = Math.max(0, totals.totalRaised + Number(amount || 0));
    const updated = { totalRaised: newTotal, goal: totals.goal, lastUpdated: new Date().toISOString() };
    localStorage.setItem("fundraise_totals", JSON.stringify(updated));

    const all = JSON.parse(localStorage.getItem("fundraise_donations") || "[]");
    all.push({ id: uuid(), amount: Number(amount), source, name, email, ts: Date.now() });
    localStorage.setItem("fundraise_donations", JSON.stringify(all));
    return updated;
  },
  async listDonations() {
    if (USE_API) {
      const r = await fetch(`${BASE_URL}/fundraising/donations`);
      return r.json();
    }
    return JSON.parse(localStorage.getItem("fundraise_donations") || "[]");
  },
  async listEvents() {
    if (USE_API) {
      const r = await fetch(`${BASE_URL}/events`);
      return r.json();
    }
    const seed = [
      { id: "e1", title: "Community Pancake Breakfast", date: "2025-09-20", time: "8:00 AM – 11:30 AM", location: "Brownsburg High School Cafeteria", desc: "All-you-can-eat pancakes with student servers. Family friendly!", cta: "RSVP", url: "#" },
      { id: "e2", title: "5K Fun Run & Walk", date: "2025-10-05", time: "9:00 AM", location: "Arbuckle Acres Park", desc: "Walk, jog, or run — all paces welcome. Strollers encouraged!", cta: "Register", url: "#" },
      { id: "e3", title: "DECA Market Night", date: "2025-10-22", time: "6:00 PM – 8:30 PM", location: "BHS Main Commons", desc: "Student-run pop-up market featuring local vendors and crafts.", cta: "Details", url: "#" },
    ];
    const stored = JSON.parse(localStorage.getItem("fundraise_events") || "null");
    if (!stored) localStorage.setItem("fundraise_events", JSON.stringify(seed));
    return JSON.parse(localStorage.getItem("fundraise_events") || "[]");
  },
  async addEvent(evt) {
    if (USE_API) {
      const r = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evt),
      });
      return r.json();
    }
    const list = await this.listEvents();
    const toSave = [...list, { ...evt, id: uuid() }];
    localStorage.setItem("fundraise_events", JSON.stringify(toSave));
    return toSave;
  },
  async listTeam() {
    if (USE_API) {
      const r = await fetch(`${BASE_URL}/team`);
      return r.json();
    }
    const seed = [
      { id: "t1", name: "Jordan Patel", role: "BHS DECA Chapter President", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop" },
      { id: "t2", name: "Avery Wallace", role: "Family Promise – Community Engagement", img: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=800&auto=format&fit=crop" },
      { id: "t3", name: "Casey Nguyen", role: "Fundraising & Sponsorships Lead", img: "https://images.unsplash.com/photo-1541534401786-2077eed87a6f?q=80&w=800&auto=format&fit=crop" },
      { id: "t4", name: "Luis Hernandez", role: "Events Coordinator", img: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=800&auto=format&fit=crop" },
    ];
    const stored = JSON.parse(localStorage.getItem("fundraise_team") || "null");
    if (!stored) localStorage.setItem("fundraise_team", JSON.stringify(seed));
    return JSON.parse(localStorage.getItem("fundraise_team") || "[]");
  },
};

/**********************
 * 4) LAYOUT + Animated Background
 **********************/
const AnimatedBG = () => (
  <div className="fixed inset-0 -z-10">
    <div
      className="absolute inset-0 opacity-90"
      style={{
        background: "linear-gradient(120deg, #3b82f6, #ec4899, #a855f7, #22c55e)",
        backgroundSize: "400% 400%",
        animation: "bgshift 18s ease infinite",
      }}
    />
    <style>{`
      @keyframes bgshift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      a { text-decoration: none; }
    `}</style>
  </div>
);

const Shell = ({ children }) => {
  const path = useCurrentPath();
  const nav = [
    ["Home", "/"],
    ["Donate", "/donate"],
    ["Events", "/events"],
    ["About", "/about"],
    ["Admin", "/admin"],
  ];
  const isActive = (to) => normalize("#" + to) === path;
  return (
    <div className="min-h-screen text-slate-800 relative">
      <AnimatedBG />
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-3">
            <img src="https://images.unsplash.com/photo-1529336953121-ad3c0f52a65f?q=80&w=300&auto=format&fit=crop" alt="Logo" className="h-10 w-10 rounded-2xl object-cover shadow" />
            <div className="leading-tight">
              <div className="font-bold tracking-tight">BHS DECA × Family Promise</div>
              <div className="text-sm text-slate-500 -mt-0.5">Hendricks County Fundraiser</div>
            </div>
          </a>
          <nav className="flex gap-2 text-sm">
            {nav.map(([label, to]) => (
              <a key={to} href={`#${to}`} className={`px-3 py-2 rounded-xl transition ${isActive(to) ? "bg-gradient-to-r from-indigo-600 to-sky-500 text-white" : "hover:bg-slate-100"}`}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="mt-12 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Brownsburg High School DECA & Family Promise of Hendricks County</p>
          <div className="flex items-center gap-3">
            <a className="hover:underline" href="#/privacy">Privacy</a>
            <a className="hover:underline" href="#/contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

/**********************
 * 5) LIGHTWEIGHT DONUT CHART (no external deps)
 **********************/
function DonutChart({ value = 0, total = 100, size = 112, stroke = 10, label = "" }) {
  const pct = Math.max(0, Math.min(100, total > 0 ? (value / total) * 100 : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={r} cx={0} cy={0} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle r={r} cx={0} cy={0} fill="none" stroke="#0f172a" strokeWidth={stroke} strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform="rotate(-90)" />
        <text x="0" y="6" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{Math.round(pct)}%</text>
      </g>
      {label ? (<text x="50%" y={size - 6} textAnchor="middle" fontSize="10" fill="#64748b">{label}</text>) : null}
    </svg>
  );
}

/**********************
 * 6) HOME
 **********************/
const Home = () => {
  const [totals, setTotals] = React.useState({ totalRaised: 0, goal: GOAL_AMOUNT, lastUpdated: new Date().toISOString() });
  const [events, setEvents] = React.useState([]);
  React.useEffect(() => {
    FundraisingStore.getTotals().then(setTotals);
    FundraisingStore.listEvents().then(setEvents);
  }, []);
  const pct = React.useMemo(() => Math.min(100, Math.round((totals.totalRaised / totals.goal) * 100) || 0), [totals]);

  return (
    <div className="space-y-10">
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Together, we can end family homelessness.</h1>
          <p className="text-slate-600 text-lg leading-relaxed">Brownsburg High School DECA and Family Promise of Hendricks County are teaming up to raise funds for housing, stability, and hope. Every dollar moves a family closer to home.</p>
          <div className="flex gap-3">
            <a href="#/donate" className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold shadow hover:shadow-md">Donate Now</a>
            <a href="#/events" className="px-5 py-3 rounded-2xl bg-white border border-slate-300 font-semibold hover:bg-slate-50">See Events</a>
          </div>
          <p className="text-xs text-slate-500">Last updated: {new Date(totals.lastUpdated).toLocaleString()}</p>
        </div>
        <div className="relative">
          <img src="https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?q=80&w=1200&auto=format&fit=crop" alt="Smiling volunteers" className="rounded-3xl shadow-xl object-cover w-full h-[300px] md:h-[420px]" />
          <div className="absolute -bottom-6 -right-4 md:-right-8 bg-white rounded-3xl shadow-xl p-5 w-[280px]">
            <div className="font-semibold mb-2">Fundraising Progress</div>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28"><DonutChart value={totals.totalRaised} total={totals.goal} label="to goal" /></div>
              <div>
                <div className="text-2xl font-extrabold">{currency(totals.totalRaised)}</div>
                <div className="text-xs text-slate-500">of {currency(totals.goal)} goal</div>
                <div className="mt-2 w-40 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-sky-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-right text-xs text-slate-600 mt-1">{pct}%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Upcoming Fundraising Events</h2>
        <p className="text-slate-600">Join us! These events are easy to update and add to over time.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {events.map((e) => (
            <article key={e.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className="text-sm text-slate-500">{new Date(e.date).toLocaleDateString()} • {e.time}</div>
              <h3 className="mt-1 font-bold text-lg">{e.title}</h3>
              <div className="text-sm text-slate-600">{e.location}</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{e.desc}</p>
              <div className="mt-3"><a href={e.url || "#"} className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white text-sm font-semibold">{e.cta || "Learn More"}</a></div>
            </article>
          ))}
        </div>
      </section>

      <TestPanel />
    </div>
  );
};

/**********************
 * 7) DONATE (Stripe only)
 **********************/
const Donate = () => {
  const [amount, setAmount] = React.useState(25);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  // Show thank-you message if redirected back from Stripe (hash-aware)
  React.useEffect(() => {
    const q = (window.location.hash.split("?")[1] || "").toLowerCase();
    if (q.includes("success=true")) setMsg("Thank you! Your payment was completed.");
  }, []);

  const quick = [10, 25, 50, 100, 250];

  const handleStripeCheckout = async () => {
    setSubmitting(true);
    setMsg("");
    try {
      const res = await fetch(STRIPE_BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, name, email, success_url: window.location.origin + "/#/donate?success=true", cancel_url: window.location.href }),
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Missing redirect URL from backend");
      }
    } catch (e) {
      setMsg(e.message + " — using demo pledge instead. See Admin to reconcile after payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPledge = async () => {
    setSubmitting(true);
    setMsg("");
    try {
      await FundraisingStore.addDonation({ amount: Number(amount), name, email, source: "pledge" });
      setMsg("Pledge recorded locally. Treasurer can reconcile later.");
      setName("");
      setEmail("");
    } catch (e) {
      setMsg("Error recording pledge: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Make a Donation</h1>
        <p className="text-slate-600">Your gift powers shelter, stability services, and lasting change for families in Hendricks County.</p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap gap-2">
          {quick.map((v) => (
            <button key={v} onClick={() => setAmount(v)} className={`px-4 py-2 rounded-xl border ${amount === v ? "bg-gradient-to-r from-indigo-600 to-sky-500 text-white border-transparent" : "bg-white hover:bg-slate-50 border-slate-300"}`}>{currency(v)}</button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-slate-500">Other</span>
            <input type="number" min={1} className="w-28 px-3 py-2 rounded-xl border border-slate-300" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-slate-600">Full Name (optional)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300" placeholder="Jane Doe" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">Email (for receipt)</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300" placeholder="you@example.com" />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={handleStripeCheckout} disabled={submitting} className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold disabled:opacity-50">{submitting ? "Processing…" : "Donate with Stripe"}</button>
          <button onClick={handleRecordPledge} disabled={submitting} className="px-5 py-3 rounded-2xl bg-white border border-slate-300 font-semibold">Record Pledge (Offline)</button>
        </div>

        {msg && <div className="text-sm text-slate-600">{msg}</div>}
      </div>

      <aside className="text-sm text-slate-500">
        <p><strong>Stripe Checkout:</strong> on GitHub Pages you must set <code>STRIPE_BACKEND_URL</code> to a function hosted on Vercel/Netlify/Cloudflare that returns <code>{`{ url: 'https://checkout.stripe.com/...' }`}</code>. Use Stripe webhooks on that backend to update totals.</p>
      </aside>
    </div>
  );
};

/**********************
 * 8) EVENTS
 **********************/
const Events = () => {
  const [list, setList] = React.useState([]);
  React.useEffect(() => { FundraisingStore.listEvents().then(setList); }, []);
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Fundraising Events</h1>
        <p className="text-slate-600">Mark your calendar and bring a friend! Organizers can add new events from the Admin page.</p>
      </header>
      <div className="grid md:grid-cols-3 gap-5">
        {list.map((e) => (
          <article key={e.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-slate-500">{new Date(e.date).toLocaleDateString()} • {e.time}</div>
            <h3 className="mt-1 font-bold text-lg">{e.title}</h3>
            <div className="text-sm text-slate-600">{e.location}</div>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">{e.desc}</p>
            <div className="mt-3"><a href={e.url || "#"} className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white text-sm font-semibold">{e.cta || "Learn More"}</a></div>
          </article>
        ))}
      </div>
    </div>
  );
};

/**********************
 * 9) ABOUT
 **********************/
const About = () => {
  const [team, setTeam] = React.useState([]);
  React.useEffect(() => { FundraisingStore.listTeam().then(setTeam); }, []);
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">About the Campaign</h1>
        <p className="text-slate-600">This partnership brings together student leaders from DECA and the mission-driven team at Family Promise of Hendricks County.</p>
      </header>
      <section className="grid md:grid-cols-4 gap-5">
        {team.map((t) => (
          <figure key={t.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <img src={t.img} alt={t.name} className="w-full h-44 object-cover rounded-2xl" />
            <figcaption className="pt-3">
              <div className="font-bold">{t.name}</div>
              <div className="text-sm text-slate-600">{t.role}</div>
            </figcaption>
          </figure>
        ))}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-2">Our Why</h2>
        <p className="text-slate-700 leading-relaxed">Family Promise of Hendricks County provides emergency shelter, housing assistance, and stability services to families experiencing homelessness. Brownsburg High School DECA students are learning by doing — engaging the community, organizing events, and raising funds that create real impact.</p>
      </section>
    </div>
  );
};

/**********************
 * 10) ADMIN
 **********************/
const Admin = () => {
  const [ok, setOk] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [totals, setTotals] = React.useState({ totalRaised: 0, goal: GOAL_AMOUNT, lastUpdated: new Date().toISOString() });
  const [donAmt, setDonAmt] = React.useState(0);
  const [donName, setDonName] = React.useState("");
  const [evt, setEvt] = React.useState({ title: "", date: "", time: "", location: "", desc: "", cta: "RSVP", url: "" });

  React.useEffect(() => { FundraisingStore.getTotals().then(setTotals); }, []);

  if (!ok) {
    return (
      <div className="max-w-md mx-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
        <p className="text-slate-600 mb-4">Enter the admin PIN to manage totals and events.</p>
        <input className="w-full px-3 py-2 rounded-xl border border-slate-300" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
        <button onClick={() => setOk(pin === ADMIN_PIN)} className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white">Unlock</button>
      </div>
    );
  }

  const refreshTotals = async () => setTotals(await FundraisingStore.getTotals());

  const addOffline = async () => {
    if (!donAmt || donAmt <= 0) return;
    await FundraisingStore.addDonation({ amount: Number(donAmt), name: donName, email: "", source: "offline" });
    setDonAmt(0); setDonName("");
    refreshTotals();
  };

  const addNewEvent = async () => {
    if (!evt.title || !evt.date) return;
    await FundraisingStore.addEvent(evt);
    alert("Event added!");
    setEvt({ title: "", date: "", time: "", location: "", desc: "", cta: "RSVP", url: "" });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Totals</h2>
        <div className="mt-2 text-slate-700">Current: <strong>{currency(totals.totalRaised)}</strong> of {currency(totals.goal)}</div>
        <div className="grid md:grid-cols-4 gap-3 mt-4">
          <input type="number" min={1} value={donAmt} onChange={(e) => setDonAmt(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-slate-300" placeholder="Amount" />
          <input value={donName} onChange={(e) => setDonName(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300" placeholder="Donor name (optional)" />
          <button onClick={addOffline} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white">Add Offline Donation</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Add Event</h2>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <input value={evt.title} onChange={(e) => setEvt({ ...evt, title: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300" placeholder="Event title" />
          <input type="date" value={evt.date} onChange={(e) => setEvt({ ...evt, date: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300" />
          <input value={evt.time} onChange={(e) => setEvt({ ...evt, time: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300" placeholder="Time (e.g. 6:00 PM)" />
          <input value={evt.location} onChange={(e) => setEvt({ ...evt, location: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300" placeholder="Location" />
          <input value={evt.cta} onChange={(e) => setEvt({ ...evt, cta: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300" placeholder="CTA (Register/RSVP)" />
          <input value={evt.url} onChange={(e) => setEvt({ ...evt, url: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-300" placeholder="Link URL" />
          <textarea value={evt.desc} onChange={(e) => setEvt({ ...evt, desc: e.target.value })} className="md:col-span-2 px-3 py-2 rounded-xl border border-slate-300" placeholder="Event description" rows={3} />
        </div>
        <button onClick={addNewEvent} className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white">Add Event</button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-2">How to switch to a real backend</h2>
        <ol className="list-decimal pl-5 text-slate-700 space-y-1">
          <li>Deploy a tiny API (Netlify/Vercel/AWS) with endpoints: <code>GET /fundraising/totals</code>, <code>POST /fundraising/donations</code>, <code>GET /events</code>, <code>POST /events</code>, <code>GET /team</code>.</li>
          <li>Set <code>USE_API</code> to <code>true</code> and update <code>BASE_URL</code> above.</li>
          <li>Wire Stripe: create a server function <code>POST /create-checkout-session</code> that returns <code>{`{ url: 'https://checkout.stripe.com/...' }`}</code>.</li>
          <li>Use Stripe webhooks to confirm payments and update totals automatically.</li>
        </ol>
      </section>
    </div>
  );
};

/**********************
 * 11) BUILT-IN TESTS
 **********************/
function TestPanel() {
  const [results, setResults] = React.useState([]);
  const [running, setRunning] = React.useState(false);

  const runTests = async () => {
    setRunning(true);
    const backup = {
      totals: localStorage.getItem("fundraise_totals"),
      donations: localStorage.getItem("fundraise_donations"),
      events: localStorage.getItem("fundraise_events"),
    };
    const rec = (name, pass, info = "") => setResults((r) => [...r, { name, pass, info }]);
    setResults([]);

    try {
      localStorage.removeItem("fundraise_totals");
      localStorage.removeItem("fundraise_donations");
      localStorage.removeItem("fundraise_events");

      // Test 1: getTotals default values
      const t1 = await FundraisingStore.getTotals();
      rec("getTotals default values", t1.totalRaised === 0 && t1.goal === GOAL_AMOUNT);

      // Test 2: addDonation increments totals by 50
      await FundraisingStore.addDonation({ amount: 50, name: "Test Donor", source: "test" });
      const t2 = await FundraisingStore.getTotals();
      rec("addDonation increments by 50", t2.totalRaised === 50, `now=${t2.totalRaised}`);

      // Test 3: addEvent persists
      const before = (await FundraisingStore.listEvents()).length;
      await FundraisingStore.addEvent({ title: "Test Event", date: "2025-12-31", time: "6:00 PM", location: "Gym", desc: "Test", cta: "RSVP", url: "#" });
      const after = (await FundraisingStore.listEvents()).length;
      rec("addEvent adds one", after === before + 1, `before=${before}, after=${after}`);

      // Test 4: negative donation clamps ≥ 0
      await FundraisingStore.addDonation({ amount: -999, name: "Neg Test", source: "test" });
      const t4 = await FundraisingStore.getTotals();
      rec("negative donation clamps ≥ 0", t4.totalRaised >= 0, `now=${t4.totalRaised}`);

      // Test 5: team seeded
      const team = await FundraisingStore.listTeam();
      rec("team list seeded", Array.isArray(team) && team.length > 0, `len=${team.length}`);

      // Test 6: donations list has entries (sanity)
      const dlist = await FundraisingStore.listDonations();
      rec("donations list has entries", Array.isArray(dlist) && dlist.length >= 1, `len=${dlist.length}`);

    } catch (e) {
      rec("unexpected error", false, e.message);
    } finally {
      if (backup.totals !== null) localStorage.setItem("fundraise_totals", backup.totals); else localStorage.removeItem("fundraise_totals");
      if (backup.donations !== null) localStorage.setItem("fundraise_donations", backup.donations); else localStorage.removeItem("fundraise_donations");
      if (backup.events !== null) localStorage.setItem("fundraise_events", backup.events); else localStorage.removeItem("fundraise_events");
      setRunning(false);
    }
  };

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Built-in Checks</h3>
        <button onClick={runTests} disabled={running} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50">{running ? "Running…" : "Run Tests"}</button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {results.map((r, i) => (
          <li key={i} className={r.pass ? "text-emerald-700" : "text-red-600"}>{r.pass ? "✓" : "✗"} {r.name} {r.info ? <em className="text-slate-500">— {r.info}</em> : null}</li>
        ))}
        {results.length === 0 && <li className="text-slate-600">No tests run yet.</li>}
      </ul>
    </section>
  );
}

/**********************
 * 12) APP ROOT
 **********************/
function AppRoot() {
  const routes = { "/": Home, "/donate": Donate, "/events": Events, "/about": About, "/admin": Admin };
  return (
    <Shell>
      <Router routes={routes} fallback="/" />
    </Shell>
  );
}

export default function App() {
  return <AppRoot />;
}

