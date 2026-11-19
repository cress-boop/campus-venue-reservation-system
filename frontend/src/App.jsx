import { useState, useEffect } from 'react';
import { api, fmt } from './api.js';

const today = () => new Date().toISOString().slice(0, 10);
const Pill = ({ s }) => <span className={'pill ' + s}>{s}</span>;
const Msg = ({ m }) => (m ? <p className={'msg ' + m.type}>{m.text}</p> : null);

/* ---------- Login / Register ---------- */
function Login({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'student' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api('/auth/' + mode, { method: 'POST', body: f });
      localStorage.setItem('token', d.token);
      onAuth(d.user);
    } catch (x) { setErr(x.message); }
  };

  return (
    <main className="auth">
      <form onSubmit={submit} className="panel">
        <h1>Campus Venue and Facility Reservation System</h1>
        <p className="muted">ZPPSU</p>
        {mode === 'register' && (<>
          <label>Full name<input value={f.name} onChange={set('name')} required /></label>
          <label>I am a
            <select value={f.role} onChange={set('role')}>
              <option value="student">Student</option><option value="faculty">Faculty member</option>
              <option value="staff">University staff</option>
            </select>
          </label>
        </>)}
        <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
        <label>Password<input type="password" value={f.password} onChange={set('password')} required minLength={6} /></label>
        <Msg m={err && { type: 'error', text: err }} />
        <button className="primary">{mode === 'login' ? 'Log in' : 'Create account'}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
        </button>
      </form>
    </main>
  );
}

/* ---------- Venues: list, schedule check, reserve ---------- */
function Venues({ onReserved }) {
  const [venues, setVenues] = useState([]);
  const [sel, setSel] = useState(null);
  const [date, setDate] = useState(today());
  const [sched, setSched] = useState([]);
  const [f, setF] = useState({ purpose: '', start_time: '', end_time: '' });
  const [msg, setMsg] = useState(null);

  useEffect(() => { api('/venues').then(setVenues); }, []);
  useEffect(() => { if (sel) api(`/venues/${sel.id}/schedule?date=${date}`).then(setSched); }, [sel, date, msg]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api('/reservations', { method: 'POST', body: { ...f, venue_id: sel.id } });
      setMsg({ type: 'ok', text: 'Request sent. An admin will review it.' });
      setF({ purpose: '', start_time: '', end_time: '' });
      onReserved?.();
    } catch (x) { setMsg({ type: 'error', text: x.message }); }
  };

  return (
    <div className="split">
      <section>
        <h2>Venues and facilities</h2>
        <ul className="list">
          {venues.map((v) => (
            <li key={v.id}>
              <button className={'venue' + (sel?.id === v.id ? ' on' : '')} onClick={() => { setSel(v); setMsg(null); }}>
                <strong>{v.name}</strong>
                <span>{v.location} · seats {v.capacity}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        {!sel ? <p className="muted">Choose a venue to see its schedule and make a request.</p> : (<>
          <h2>{sel.name}</h2>
          <p className="muted">{sel.description}</p>
          <label>Check schedule for
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {sched.length === 0 ? <p className="free">No bookings on this date.</p> : (
            <ul className="slots">
              {sched.map((s) => (
                <li key={s.id}>{fmt(s.start_time)} to {fmt(s.end_time)} <Pill s={s.status} /></li>
              ))}
            </ul>
          )}
          <h3>Request this venue</h3>
          <form onSubmit={submit}>
            <label>Purpose<input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} required /></label>
            <label>Start<input type="datetime-local" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} required /></label>
            <label>End<input type="datetime-local" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} required /></label>
            <Msg m={msg} />
            <button className="primary">Send request</button>
          </form>
        </>)}
      </section>
    </div>
  );
}

/* ---------- Reservations (mine, or all for admin) ---------- */
function Reservations({ user, refresh }) {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState(null);
  const admin = user.role === 'admin';
  const load = () => api('/reservations').then(setRows);
  useEffect(() => { load(); }, [refresh]);

  const decide = async (id, status) => {
    const remarks = status === 'rejected' ? prompt('Reason for rejecting (optional)') : null;
    try { await api(`/reservations/${id}/status`, { method: 'PATCH', body: { status, remarks } }); setMsg(null); }
    catch (x) { setMsg({ type: 'error', text: x.message }); }
    load();
  };
  const cancel = async (id) => { await api(`/reservations/${id}/cancel`, { method: 'PATCH' }); load(); };

  return (
    <section>
      <h2>{admin ? 'All reservation requests' : 'My reservations'}</h2>
      <Msg m={msg} />
      {rows.length === 0 ? <p className="muted">No reservations yet. Pick a venue to make your first request.</p> : (
        <div className="scroll"><table>
          <thead><tr>{admin && <th>Requester</th>}<th>Venue</th><th>Purpose</th><th>When</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              {admin && <td>{r.user_name}</td>}
              <td>{r.venue_name}</td><td>{r.purpose}</td>
              <td>{fmt(r.start_time)}<br />to {fmt(r.end_time)}</td>
              <td><Pill s={r.status} />{r.remarks && <small className="muted"><br />{r.remarks}</small>}</td>
              <td className="actions">
                {admin && r.status === 'pending' && (<>
                  <button className="primary" onClick={() => decide(r.id, 'approved')}>Approve</button>
                  <button onClick={() => decide(r.id, 'rejected')}>Reject</button>
                </>)}
                {!admin && ['pending', 'approved'].includes(r.status) && <button onClick={() => cancel(r.id)}>Cancel</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}

/* ---------- Admin: manage venues + reports ---------- */
function Admin() {
  const [venues, setVenues] = useState([]);
  const [rep, setRep] = useState(null);
  const blank = { name: '', location: '', capacity: '', description: '' };
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const load = () => { api('/venues').then(setVenues); api('/reports').then(setRep); };
  useEffect(load, []);

  const save = async (e) => {
    e.preventDefault();
    await api(editId ? `/venues/${editId}` : '/venues', { method: editId ? 'PUT' : 'POST', body: f });
    setF(blank); setEditId(null); load();
  };
  const remove = async (id) => { if (confirm('Remove this venue?')) { await api('/venues/' + id, { method: 'DELETE' }); load(); } };

  return (
    <div className="split">
      <section>
        <h2>Manage venues</h2>
        <ul className="list">{venues.map((v) => (
          <li key={v.id} className="row">
            <span><strong>{v.name}</strong><br /><small className="muted">{v.location} · {v.capacity}</small></span>
            <span><button onClick={() => { setEditId(v.id); setF(v); }}>Edit</button><button onClick={() => remove(v.id)}>Remove</button></span>
          </li>
        ))}</ul>
        <form onSubmit={save} className="panel">
          <h3>{editId ? 'Edit venue' : 'Add a venue'}</h3>
          <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
          <label>Location<input value={f.location || ''} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
          <label>Capacity<input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></label>
          <label>Description<input value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
          <button className="primary">{editId ? 'Save changes' : 'Add venue'}</button>
        </form>
      </section>
      <section className="panel">
        <h2>Reports</h2>
        {rep && (<>
          <h3>Requests by status</h3>
          <ul className="slots">{rep.byStatus.map((s) => <li key={s.status}><Pill s={s.status} /> {s.total}</li>)}</ul>
          <h3>Approved bookings per venue</h3>
          <ul className="slots">{rep.byVenue.map((v) => <li key={v.name}>{v.name}: <strong>{v.total}</strong></li>)}</ul>
        </>)}
      </section>
    </div>
  );
}

/* ---------- App shell ---------- */
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [tab, setTab] = useState('venues');
  const [tick, setTick] = useState(0);

  const auth = (u) => { localStorage.setItem('user', JSON.stringify(u)); setUser(u); };
  const logout = () => { localStorage.clear(); setUser(null); };

  if (!user) return <Login onAuth={auth} />;
  const admin = user.role === 'admin';
  const tabs = admin
    ? [['requests', 'Requests'], ['admin', 'Venues and reports']]
    : [['venues', 'Venues'], ['mine', 'My reservations']];
  const current = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];

  return (
    <>
      <header>
        <b>Campus Venue and Facility Reservation</b>
        <nav>
          {tabs.map(([k, label]) => (
            <button key={k} className={current === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
        <span>{user.name} <button onClick={logout}>Log out</button></span>
      </header>
      <main>
        {current === 'venues' && <Venues onReserved={() => setTick(tick + 1)} />}
        {(current === 'mine' || current === 'requests') && <Reservations user={user} refresh={tick} />}
        {current === 'admin' && <Admin />}
      </main>
    </>
  );
}
