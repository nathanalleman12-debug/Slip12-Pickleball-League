import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Users, Trophy, Calendar, BarChart3, Download, Plus, Shuffle, Trash2,
  RefreshCw, X, FileUp, Zap, Edit3
} from 'lucide-react';

// ============================================================
// CONSTANTS & HELPERS
// ============================================================
const theme = {
  green: '#2d5f3f',
  greenDark: '#1a3d28',
  yellow: '#f4d35e',
  cream: '#f6f1e4',
  ink: '#1a1f1a',
  coral: '#e63946',
};

const TEAM_COLORS = [
  '#2d5f3f', '#e63946', '#f4a261', '#264653', '#8338ec',
  '#06a77d', '#d62828', '#003566', '#9d4edd', '#f77f00',
  '#386641', '#bc4749', '#4361ee', '#fb6f92', '#57cc99', '#ff006e',
];

const ADJ = ['Dinking', 'Lobbing', 'Smashing', 'Clutch', 'Rogue', 'Velvet', 'Electric', 'Feral', 'Zen', 'Midnight', 'Fluorescent', 'Chaotic', 'Wild', 'Golden', 'Shadow', 'Iron'];
const NOUN = ['Paddles', 'Kitcheners', 'Servers', 'Volleyers', 'Dynamos', 'Assassins', 'Bandits', 'Specters', 'Wildcards', 'Comets', 'Mavericks', 'Jesters', 'Otters', 'Foxes', 'Hawks', 'Ducks'];

const uid = () => Math.random().toString(36).slice(2, 9);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const teamName = () => `The ${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;

// localStorage-backed state hook
function useStoredState(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(`pb:${key}`);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(`pb:${key}`, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV];
}

// ============================================================
// ROUND ROBIN
// ============================================================
function generateRoundRobin(teams) {
  if (teams.length < 2) return [];
  let t = [...teams];
  if (t.length % 2 === 1) t.push({ id: 'BYE', name: 'BYE', bye: true });
  const n = t.length;
  const rounds = [];
  const half = n / 2;
  const fixed = t[0];
  let rot = t.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const matches = [];
    const row = [fixed, ...rot];
    for (let i = 0; i < half; i++) {
      const a = row[i], b = row[n - 1 - i];
      if (!a.bye && !b.bye) {
        matches.push({ id: uid(), week: r + 1, teamA: a.id, teamB: b.id, court: (i % 2) + 1 });
      }
    }
    rounds.push({ week: r + 1, matches });
    rot = [rot[rot.length - 1], ...rot.slice(0, -1)];
  }
  return rounds;
}

function generateBracket(standings) {
  const seeded = [...standings];
  const sizes = [2, 4, 8, 16, 32];
  const target = sizes.find(s => s >= seeded.length) || 16;
  while (seeded.length < target) seeded.push({ id: `BYE-${seeded.length}`, name: 'BYE', bye: true });
  const pairs = [];
  for (let i = 0; i < target / 2; i++) pairs.push([seeded[i], seeded[target - 1 - i]]);
  const rounds = [];
  let cur = pairs;
  let roundNum = 1;
  while (cur.length >= 1) {
    const matches = cur.map(([a, b]) => ({
      id: uid(),
      round: roundNum,
      teamA: a,
      teamB: b,
      winner: a?.bye ? b : b?.bye ? a : null,
    }));
    rounds.push({ round: roundNum, matches });
    if (cur.length === 1) break;
    const next = [];
    for (let i = 0; i < matches.length; i += 2) {
      next.push([{ id: `TBD-${uid()}`, name: 'TBD', tbd: true }, { id: `TBD-${uid()}`, name: 'TBD', tbd: true }]);
    }
    cur = next;
    roundNum++;
  }
  return rounds;
}

const roundName = (idx, total) => {
  const f = total - idx - 1;
  if (f === 0) return 'FINAL';
  if (f === 1) return 'SEMIFINALS';
  if (f === 2) return 'QUARTERFINALS';
  return `ROUND ${idx + 1}`;
};

// ============================================================
// PNG EXPORT
// ============================================================
async function exportPNG(el, filename) {
  if (!el) return;
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        // Ensure web fonts are loaded in cloned doc
        const fonts = doc.querySelectorAll('link[rel="stylesheet"]');
        fonts.forEach(f => f.href = f.href);
      }
    });
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  } catch (e) {
    console.error(e);
    alert('Export failed. Try again.');
  }
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [tab, setTab] = useState('players');
  const [meta, setMeta] = useStoredState('meta', { leagueName: 'SLIP 12 PICKLEBALL', season: 'SPRING 2026' });
  const [players, setPlayers] = useStoredState('players', []);
  const [teams, setTeams] = useStoredState('teams', []);
  const [schedule, setSchedule] = useStoredState('schedule', []);
  const [results, setResults] = useStoredState('results', {});
  const [bracket, setBracket] = useStoredState('bracket', []);
  const [startDate, setStartDate] = useStoredState('startDate', new Date().toISOString().slice(0, 10));

  const standings = useMemo(() => {
    const s = teams.map(t => ({ ...t, wins: 0, losses: 0, pf: 0, pa: 0, games: 0 }));
    const map = Object.fromEntries(s.map(t => [t.id, t]));
    Object.values(results).forEach(r => {
      if (!r.winner) return;
      const w = map[r.winner];
      const l = map[r.winner === r.teamA ? r.teamB : r.teamA];
      if (!w || !l) return;
      w.wins++; w.games++; l.losses++; l.games++;
      w.pf += r.winnerScore; w.pa += r.loserScore;
      l.pf += r.loserScore; l.pa += r.winnerScore;
    });
    return s.sort((a, b) => b.wins - a.wins || (b.pf - b.pa) - (a.pf - a.pa));
  }, [teams, results]);

  const addPlayer = (name, skill = 'B', unit = '') => {
    if (!name.trim()) return;
    setPlayers([...players, { id: uid(), name: name.trim(), skill, unit }]);
  };

  const importCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const added = [];
    lines.forEach((line, i) => {
      if (i === 0 && /name/i.test(line) && /skill|level/i.test(line)) return;
      const parts = line.split(',').map(s => s.trim());
      if (!parts[0]) return;
      const skill = parts[1] && /^[ABC]$/i.test(parts[1]) ? parts[1].toUpperCase() : 'B';
      const unit = parts[2] || '';
      added.push({ id: uid(), name: parts[0], skill, unit });
    });
    setPlayers([...players, ...added]);
    return added.length;
  };

  const randomizeTeams = (teamSize = 2, balance = true) => {
    if (players.length < teamSize * 2) { alert(`Need at least ${teamSize * 2} players.`); return; }
    let pairs = [];
    if (balance) {
      const numTeams = Math.floor(players.length / teamSize);
      const pool = [
        ...shuffle(players.filter(p => p.skill === 'A')),
        ...shuffle(players.filter(p => p.skill === 'B')),
        ...shuffle(players.filter(p => p.skill === 'C')),
      ];
      const slots = Array.from({ length: numTeams }, () => []);
      pool.forEach((p, i) => slots[i % numTeams].push(p));
      pairs = slots.filter(s => s.length === teamSize);
    } else {
      const s = shuffle(players);
      for (let i = 0; i + teamSize <= s.length; i += teamSize) pairs.push(s.slice(i, i + teamSize));
    }
    setTeams(pairs.map((m, i) => ({ id: uid(), name: teamName(), members: m, color: TEAM_COLORS[i % TEAM_COLORS.length] })));
    setSchedule([]); setResults({}); setBracket([]);
  };

  const generateSchedule = () => {
    if (teams.length < 2) { alert('Need at least 2 teams.'); return; }
    setSchedule(generateRoundRobin(teams));
    setResults({});
    setBracket([]);
  };

  const recordResult = (match, scoreA, scoreB) => {
    const a = parseInt(scoreA), b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a === b) return;
    const winner = a > b ? match.teamA : match.teamB;
    setResults({
      ...results,
      [match.id]: {
        teamA: match.teamA, teamB: match.teamB,
        scoreA: a, scoreB: b, winner,
        winnerScore: Math.max(a, b), loserScore: Math.min(a, b),
      }
    });
  };

  const clearResult = (matchId) => {
    const next = { ...results };
    delete next[matchId];
    setResults(next);
  };

  const seedBracket = () => {
    if (standings.length < 2) { alert('Play some games first.'); return; }
    setBracket(generateBracket(standings));
  };

  const advanceWinner = (roundIdx, matchIdx, winner) => {
    if (!winner || winner.bye || winner.tbd) return;
    const nb = bracket.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }));
    nb[roundIdx].matches[matchIdx].winner = winner;
    if (nb[roundIdx + 1]) {
      const nextIdx = Math.floor(matchIdx / 2);
      const slot = matchIdx % 2 === 0 ? 'teamA' : 'teamB';
      nb[roundIdx + 1].matches[nextIdx][slot] = winner;
    }
    setBracket(nb);
  };

  const resetAll = () => {
    if (!confirm('Reset everything? This clears all players, teams, schedule, and results.')) return;
    setPlayers([]); setTeams([]); setSchedule([]); setResults({}); setBracket([]);
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.cream, color: theme.ink }}>
      <Header meta={meta} setMeta={setMeta} resetAll={resetAll} />
      <TabBar tab={tab} setTab={setTab} counts={{
        players: players.length,
        teams: teams.length,
        schedule: schedule.reduce((n, r) => n + r.matches.length, 0),
      }} />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px 100px' }}>
        {tab === 'players' && (
          <PlayersTab players={players} setPlayers={setPlayers} addPlayer={addPlayer} importCSV={importCSV} />
        )}
        {tab === 'teams' && (
          <TeamsTab teams={teams} setTeams={setTeams} players={players} randomizeTeams={randomizeTeams} meta={meta} />
        )}
        {tab === 'schedule' && (
          <ScheduleTab schedule={schedule} teams={teams} results={results}
            generateSchedule={generateSchedule} recordResult={recordResult} clearResult={clearResult}
            meta={meta} startDate={startDate} setStartDate={setStartDate} />
        )}
        {tab === 'standings' && (
          <StandingsTab standings={standings} meta={meta} results={results} teams={teams} />
        )}
        {tab === 'bracket' && (
          <BracketTab bracket={bracket} seedBracket={seedBracket} advanceWinner={advanceWinner} meta={meta} />
        )}
      </main>
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================
function Header({ meta, setMeta, resetAll }) {
  const [editing, setEditing] = useState(false);
  return (
    <header style={{ background: theme.ink, color: theme.cream, borderBottom: `6px solid ${theme.yellow}`, position: 'relative', overflow: 'hidden' }}>
      <svg style={{ position: 'absolute', top: 0, right: 0, width: 320, height: '100%', opacity: 0.1 }} viewBox="0 0 320 120" preserveAspectRatio="none">
        <rect x="20" y="20" width="280" height="80" fill="none" stroke={theme.yellow} strokeWidth="2" />
        <line x1="160" y1="20" x2="160" y2="100" stroke={theme.yellow} strokeWidth="2" />
        <rect x="80" y="35" width="160" height="50" fill="none" stroke={theme.yellow} strokeWidth="1.5" />
      </svg>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
              <input value={meta.leagueName} onChange={e => setMeta({ ...meta, leagueName: e.target.value })}
                className="display-font"
                style={{ fontSize: 22, background: 'transparent', color: theme.cream, border: `1px dashed ${theme.yellow}`, padding: '4px 8px', outline: 'none', width: '100%' }} />
              <input value={meta.season} onChange={e => setMeta({ ...meta, season: e.target.value })}
                className="mono-font"
                style={{ fontSize: 12, background: 'transparent', color: theme.yellow, border: `1px dashed ${theme.yellow}`, padding: '4px 8px', outline: 'none', width: '100%' }} />
              <button onClick={() => setEditing(false)} style={{ background: theme.yellow, color: theme.ink, border: 'none', padding: '6px 10px', fontWeight: 700, alignSelf: 'flex-start' }}>Done</button>
            </div>
          ) : (
            <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
              <div className="mono-font" style={{ fontSize: 10, color: theme.yellow, letterSpacing: '0.2em' }}>
                {meta.season} <Edit3 size={10} style={{ verticalAlign: 'middle', opacity: 0.6 }} />
              </div>
              <h1 className="display-font" style={{ margin: 0, fontSize: 'clamp(22px, 6vw, 30px)', lineHeight: 1.1 }}>{meta.leagueName}</h1>
            </div>
          )}
        </div>
        <button onClick={resetAll}
          style={{ background: 'transparent', color: theme.cream, border: `1px solid ${theme.cream}`, padding: '8px 12px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>
          Reset
        </button>
      </div>
    </header>
  );
}

// ============================================================
// TAB BAR
// ============================================================
function TabBar({ tab, setTab, counts }) {
  const tabs = [
    { id: 'players', label: 'Players', icon: Users, count: counts.players },
    { id: 'teams', label: 'Teams', icon: Zap, count: counts.teams },
    { id: 'schedule', label: 'Schedule', icon: Calendar, count: counts.schedule },
    { id: 'standings', label: 'Standings', icon: BarChart3 },
    { id: 'bracket', label: 'Bracket', icon: Trophy },
  ];
  return (
    <nav style={{ background: theme.cream, borderBottom: `1px solid ${theme.ink}`, position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: active ? theme.ink : 'transparent',
                color: active ? theme.cream : theme.ink,
                border: 'none', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
                borderRight: `1px solid ${theme.ink}`, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
              <Icon size={13} />
              {t.label}
              {t.count > 0 && (
                <span style={{ background: active ? theme.yellow : theme.ink, color: active ? theme.ink : theme.cream, padding: '2px 6px', fontSize: 9, borderRadius: 2 }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================
// PLAYERS TAB
// ============================================================
function PlayersTab({ players, setPlayers, addPlayer, importCSV }) {
  const [name, setName] = useState('');
  const [skill, setSkill] = useState('B');
  const [unit, setUnit] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');

  const submit = () => { addPlayer(name, skill, unit); setName(''); setUnit(''); };
  const handleImport = () => {
    const count = importCSV(csvText);
    setCsvText(''); setShowImport(false);
    if (count) alert(`Imported ${count} players`);
  };

  return (
    <div>
      <SectionHeader title="ROSTER" subtitle="Everyone who signed up" />

      <div style={{ background: 'white', border: `2px solid ${theme.ink}`, padding: 16, marginBottom: 16 }}>
        <div className="stencil-font" style={{ fontSize: 13, marginBottom: 10, letterSpacing: '0.15em' }}>ADD PLAYER</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Player name"
            style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={skill} onChange={e => setSkill(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="A">A — Strong</option>
              <option value="B">B — Average</option>
              <option value="C">C — New</option>
            </select>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit" style={{ ...inputStyle, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} style={{ ...btnStyle, background: theme.ink, color: theme.cream, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> ADD
            </button>
            <button onClick={() => setShowImport(!showImport)} style={{ ...btnStyle, background: theme.yellow, color: theme.ink, border: `1px solid ${theme.ink}`, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <FileUp size={14} /> IMPORT
            </button>
          </div>
        </div>

        {showImport && (
          <div style={{ marginTop: 14, padding: 12, background: theme.cream, border: `1px dashed ${theme.ink}` }}>
            <div className="mono-font" style={{ fontSize: 10, marginBottom: 6, opacity: 0.7 }}>
              Paste rows from Google Sheets. Format: <strong>Name, Skill (A/B/C), Unit</strong>
            </div>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
              placeholder={`Alex Rivera, A, 12B\nJamie Chen, B, 8A\nTaylor Smith, C, 15C`}
              style={{ width: '100%', minHeight: 120, padding: 8, border: `1px solid ${theme.ink}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, background: 'white', outline: 'none', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={handleImport} style={{ ...btnStyle, background: theme.ink, color: theme.cream, fontSize: 11 }}>IMPORT</button>
              <button onClick={() => setShowImport(false)} style={{ ...btnStyle, border: `1px solid ${theme.ink}`, background: 'transparent', fontSize: 11 }}>CANCEL</button>
            </div>
          </div>
        )}
      </div>

      {players.length === 0 ? (
        <EmptyState icon={Users} text="No players yet. Add one above or paste from your signup sheet." />
      ) : (
        <div style={{ background: 'white', border: `2px solid ${theme.ink}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 70px 32px', padding: '10px 12px', background: theme.ink, color: theme.cream, gap: 8, alignItems: 'center' }}>
            <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.15em' }}>#</div>
            <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.15em' }}>NAME</div>
            <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.15em' }}>SKILL</div>
            <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.15em' }}>UNIT</div>
            <div></div>
          </div>
          {players.map((p, i) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 70px 32px', padding: '10px 12px', borderBottom: i < players.length - 1 ? '1px solid #0001' : 'none', alignItems: 'center', gap: 8 }}>
              <div className="mono-font" style={{ fontSize: 11, opacity: 0.5 }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
              <div><SkillBadge skill={p.skill} /></div>
              <div className="mono-font" style={{ fontSize: 11, opacity: 0.6 }}>{p.unit || '—'}</div>
              <button onClick={() => setPlayers(players.filter(x => x.id !== p.id))}
                style={{ background: 'transparent', border: 'none', color: theme.coral, padding: 4 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkillBadge({ skill }) {
  const colors = {
    A: { bg: theme.green, color: 'white' },
    B: { bg: theme.yellow, color: theme.ink },
    C: { bg: theme.cream, color: theme.ink },
  };
  const s = colors[skill] || colors.B;
  return (
    <span className="mono-font" style={{
      background: s.bg, color: s.color, padding: '3px 7px', fontSize: 11, fontWeight: 700,
      border: `1px solid ${theme.ink}`, display: 'inline-block', minWidth: 24, textAlign: 'center',
    }}>{skill}</span>
  );
}

// ============================================================
// TEAMS TAB
// ============================================================
function TeamsTab({ teams, setTeams, players, randomizeTeams, meta }) {
  const [teamSize, setTeamSize] = useState(2);
  const [balance, setBalance] = useState(true);
  const heroRef = useRef(null);
  const posterRefs = useRef({});

  const renameTeam = (id, name) => setTeams(teams.map(t => t.id === id ? { ...t, name } : t));

  return (
    <div>
      <SectionHeader title="TEAMS" subtitle="Random or skill-balanced pairs" />

      <div style={{ background: 'white', border: `2px solid ${theme.ink}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={teamSize} onChange={e => setTeamSize(+e.target.value)} style={inputStyle}>
            <option value={2}>Doubles</option>
            <option value={1}>Singles</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: `1px solid ${theme.ink}`, background: balance ? theme.yellow : 'transparent', cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={balance} onChange={e => setBalance(e.target.checked)} />
            Skill-balanced
          </label>
          <button onClick={() => randomizeTeams(teamSize, balance)}
            style={{ ...btnStyle, background: theme.ink, color: theme.cream, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shuffle size={14} /> {teams.length ? 'RESHUFFLE' : 'GENERATE'}
          </button>
          {teams.length > 0 && (
            <button onClick={() => exportPNG(heroRef.current, `${meta.leagueName.replace(/\s+/g, '_')}_teams.png`)}
              style={{ ...btnStyle, background: theme.yellow, color: theme.ink, border: `1px solid ${theme.ink}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={13} /> EXPORT
            </button>
          )}
        </div>
        <div className="mono-font" style={{ fontSize: 11, marginTop: 10, opacity: 0.6 }}>
          {players.length} players → {Math.floor(players.length / teamSize)} teams
          {players.length % teamSize ? ` (${players.length % teamSize} waitlisted)` : ''}
        </div>
      </div>

      {teams.length === 0 ? (
        <EmptyState icon={Zap} text="No teams yet. Add players, then hit GENERATE." />
      ) : (
        <>
          <div ref={heroRef} style={{ background: theme.cream, padding: 24, border: `2px solid ${theme.ink}` }}>
            <div style={{ textAlign: 'center', marginBottom: 18, borderBottom: `2px solid ${theme.ink}`, paddingBottom: 12 }}>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.3em' }}>{meta.season}</div>
              <div className="display-font" style={{ fontSize: 26, lineHeight: 1.1 }}>{meta.leagueName}</div>
              <div className="serif-font" style={{ fontSize: 15, fontStyle: 'italic', opacity: 0.7 }}>The Teams</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {teams.map((t, i) => <TeamCard key={t.id} team={t} index={i} onRename={renameTeam} />)}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="mono-font" style={{ fontSize: 11, letterSpacing: '0.15em', marginBottom: 10, opacity: 0.7 }}>
              DOWNLOAD INDIVIDUAL TEAM POSTERS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {teams.map((t, i) => (
                <div key={t.id}>
                  <div ref={el => posterRefs.current[t.id] = el}>
                    <TeamPoster team={t} index={i} meta={meta} />
                  </div>
                  <button onClick={() => exportPNG(posterRefs.current[t.id], `team_${t.name.replace(/\s+/g, '_')}.png`)}
                    style={{ ...btnStyle, background: theme.ink, color: theme.cream, width: '100%', marginTop: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <Download size={12} /> DOWNLOAD POSTER
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TeamCard({ team, index, onRename }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  return (
    <div style={{ background: 'white', border: `2px solid ${theme.ink}`, overflow: 'hidden' }}>
      <div style={{ background: team.color, height: 5 }} />
      <div style={{ padding: 12 }}>
        <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.5 }}>TEAM {String(index + 1).padStart(2, '0')}</div>
        {editing ? (
          <input value={name} onChange={e => setName(e.target.value)}
            onBlur={() => { onRename(team.id, name); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(team.id, name); setEditing(false); } }}
            autoFocus className="display-font"
            style={{ fontSize: 17, width: '100%', border: 'none', borderBottom: `1px dashed ${theme.ink}`, outline: 'none', padding: '2px 0', background: 'transparent' }} />
        ) : (
          <div onClick={() => setEditing(true)} className="display-font" style={{ fontSize: 17, cursor: 'pointer', lineHeight: 1.15, marginBottom: 6 }}>
            {team.name}
          </div>
        )}
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {team.members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <SkillBadge skill={m.skill} />
              <span>{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamPoster({ team, index, meta }) {
  return (
    <div style={{ background: theme.cream, border: `3px solid ${theme.ink}`, overflow: 'hidden', aspectRatio: '4/5', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: team.color, padding: '12px 16px', color: 'white' }}>
        <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.3em' }}>
          {meta.season} · TEAM {String(index + 1).padStart(2, '0')}
        </div>
      </div>
      <div style={{ padding: '18px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="serif-font" style={{ fontSize: 12, fontStyle: 'italic', opacity: 0.6 }}>presenting</div>
        <div className="display-font" style={{ fontSize: 26, lineHeight: 1, marginTop: 4 }}>{team.name}</div>
        <div style={{ marginTop: 20, flex: 1 }}>
          {team.members.map((m, i) => (
            <div key={m.id} style={{
              borderTop: i === 0 ? `2px solid ${theme.ink}` : `1px solid ${theme.ink}44`,
              borderBottom: i === team.members.length - 1 ? `2px solid ${theme.ink}` : 'none',
              padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div className="mono-font" style={{ fontSize: 9, letterSpacing: '0.2em', opacity: 0.5 }}>PLAYER {i + 1}</div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{m.name}</div>
              </div>
              <SkillBadge skill={m.skill} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }}>
          <div className="display-font" style={{ fontSize: 10, letterSpacing: '0.15em' }}>{meta.leagueName}</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < 2 ? team.color : 'transparent', border: `1.5px solid ${theme.ink}` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCHEDULE TAB
// ============================================================
function ScheduleTab({ schedule, teams, results, generateSchedule, recordResult, clearResult, meta, startDate, setStartDate }) {
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const heroRef = useRef(null);
  const weekRefs = useRef({});

  const dateForWeek = (w) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (w - 1) * 7);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <SectionHeader title="SCHEDULE" subtitle="Round-robin across the season" />

      <div style={{ background: 'white', border: `2px solid ${theme.ink}`, padding: 16, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.15em', marginBottom: 4, opacity: 0.7 }}>SEASON START</div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={generateSchedule} style={{ ...btnStyle, background: theme.ink, color: theme.cream, display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
          <RefreshCw size={13} /> {schedule.length ? 'REGENERATE' : 'GENERATE'}
        </button>
        {schedule.length > 0 && (
          <button onClick={() => exportPNG(heroRef.current, `${meta.leagueName.replace(/\s+/g, '_')}_schedule.png`)}
            style={{ ...btnStyle, background: theme.yellow, color: theme.ink, border: `1px solid ${theme.ink}`, display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <Download size={13} /> EXPORT ALL
          </button>
        )}
      </div>

      {schedule.length === 0 ? (
        <EmptyState icon={Calendar} text="No schedule yet. Generate teams first." />
      ) : (
        <>
          <div ref={heroRef} style={{ background: theme.cream, padding: 24, border: `2px solid ${theme.ink}` }}>
            <div style={{ textAlign: 'center', borderBottom: `3px solid ${theme.ink}`, paddingBottom: 14, marginBottom: 18 }}>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.3em' }}>{meta.season}</div>
              <div className="display-font" style={{ fontSize: 28, lineHeight: 1 }}>SEASON SCHEDULE</div>
              <div className="serif-font" style={{ fontSize: 14, fontStyle: 'italic', opacity: 0.7 }}>{meta.leagueName}</div>
            </div>
            {schedule.map(round => (
              <div key={round.week} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: `2px solid ${theme.ink}`, paddingBottom: 5, marginBottom: 8 }}>
                  <div className="display-font" style={{ fontSize: 20 }}>WEEK {round.week}</div>
                  <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.15em', opacity: 0.6 }}>{dateForWeek(round.week)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                  {round.matches.map(m => (
                    <MatchCardRO key={m.id} match={m} teamMap={teamMap} result={results[m.id]} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <div className="mono-font" style={{ fontSize: 11, letterSpacing: '0.15em', marginBottom: 10, opacity: 0.7 }}>
              ENTER SCORES · EXPORT BY WEEK
            </div>
            {schedule.map(round => (
              <WeekBlock key={round.week} round={round} teamMap={teamMap} results={results}
                recordResult={recordResult} clearResult={clearResult}
                meta={meta} date={dateForWeek(round.week)}
                weekRef={el => weekRefs.current[round.week] = el}
                onExport={() => exportPNG(weekRefs.current[round.week], `week_${round.week}.png`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MatchCardRO({ match, teamMap, result }) {
  const a = teamMap[match.teamA], b = teamMap[match.teamB];
  if (!a || !b) return null;
  const winnerId = result?.winner;
  return (
    <div style={{ background: 'white', border: `1.5px solid ${theme.ink}`, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div className="mono-font" style={{ fontSize: 9, letterSpacing: '0.2em', opacity: 0.6 }}>COURT {match.court}</div>
        {result && <div className="mono-font" style={{ fontSize: 9, letterSpacing: '0.15em', background: theme.green, color: 'white', padding: '1px 5px' }}>FINAL</div>}
      </div>
      <TeamLine team={a} score={result?.scoreA} isWinner={winnerId === a.id} />
      <div style={{ height: 3 }} />
      <TeamLine team={b} score={result?.scoreB} isWinner={winnerId === b.id} />
    </div>
  );
}

function TeamLine({ team, score, isWinner }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: score !== undefined && !isWinner ? 0.55 : 1 }}>
      <div style={{ width: 3, height: 20, background: team.color, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 13, fontWeight: isWinner ? 700 : 500 }}>{team.name}</div>
      {score !== undefined && (
        <div className="mono-font" style={{ fontSize: 15, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{score}</div>
      )}
    </div>
  );
}

function WeekBlock({ round, teamMap, results, recordResult, clearResult, meta, date, weekRef, onExport }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div ref={weekRef} style={{ background: theme.cream, border: `2px solid ${theme.ink}`, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px solid ${theme.ink}`, paddingBottom: 8, marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.25em' }}>{meta.leagueName}</div>
            <div className="display-font" style={{ fontSize: 22 }}>WEEK {round.week}</div>
          </div>
          <div className="serif-font" style={{ fontSize: 13, fontStyle: 'italic' }}>{date}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          {round.matches.map(m => (
            <MatchEntry key={m.id} match={m} teamMap={teamMap} result={results[m.id]} onRecord={recordResult} onClear={clearResult} />
          ))}
        </div>
      </div>
      <button onClick={onExport}
        style={{ ...btnStyle, background: theme.ink, color: theme.cream, marginTop: 6, fontSize: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Download size={12} /> EXPORT WEEK {round.week}
      </button>
    </div>
  );
}

function MatchEntry({ match, teamMap, result, onRecord, onClear }) {
  const a = teamMap[match.teamA], b = teamMap[match.teamB];
  const [sA, setSA] = useState(result?.scoreA ?? '');
  const [sB, setSB] = useState(result?.scoreB ?? '');
  if (!a || !b) return null;
  const winnerId = result?.winner;
  const save = () => onRecord(match, sA, sB);
  return (
    <div style={{ background: 'white', border: `1.5px solid ${theme.ink}`, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="mono-font" style={{ fontSize: 9, letterSpacing: '0.2em', opacity: 0.6 }}>COURT {match.court}</div>
        {result && <div className="mono-font" style={{ fontSize: 9, letterSpacing: '0.15em', background: theme.green, color: 'white', padding: '1px 5px' }}>FINAL</div>}
      </div>
      {[
        { team: a, score: sA, setScore: setSA, isWinner: winnerId === a.id },
        { team: b, score: sB, setScore: setSB, isWinner: winnerId === b.id },
      ].map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i === 0 ? 4 : 0, opacity: result && !row.isWinner ? 0.55 : 1 }}>
          <div style={{ width: 3, height: 22, background: row.team.color, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: row.isWinner ? 700 : 500 }}>{row.team.name}</div>
          <input type="number" inputMode="numeric" value={row.score} onChange={e => row.setScore(e.target.value)}
            onBlur={save} onKeyDown={e => e.key === 'Enter' && save()}
            style={{ width: 46, padding: '4px 6px', border: `1px solid ${theme.ink}`, fontSize: 14, fontFamily: 'JetBrains Mono', textAlign: 'center', outline: 'none' }} />
        </div>
      ))}
      {result && (
        <button onClick={() => { onClear(match.id); setSA(''); setSB(''); }}
          style={{ marginTop: 6, background: 'transparent', border: 'none', color: theme.coral, fontSize: 10, letterSpacing: '0.1em', textDecoration: 'underline', padding: 0 }}>
          CLEAR
        </button>
      )}
    </div>
  );
}

// ============================================================
// STANDINGS TAB
// ============================================================
function StandingsTab({ standings, meta, results, teams }) {
  const heroRef = useRef(null);
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const recent = Object.values(results).slice(-8).reverse();

  return (
    <div>
      <SectionHeader title="STANDINGS" subtitle="Who's beating who" />
      {standings.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => exportPNG(heroRef.current, `${meta.leagueName.replace(/\s+/g, '_')}_standings.png`)}
            style={{ ...btnStyle, background: theme.ink, color: theme.cream, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> EXPORT PNG
          </button>
        </div>
      )}

      {standings.length === 0 ? (
        <EmptyState icon={BarChart3} text="No standings yet. Set up teams." />
      ) : (
        <div ref={heroRef} style={{ background: theme.cream, padding: 20, border: `2px solid ${theme.ink}` }}>
          <div style={{ textAlign: 'center', borderBottom: `3px solid ${theme.ink}`, paddingBottom: 12, marginBottom: 16 }}>
            <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.3em' }}>{meta.season} · STANDINGS</div>
            <div className="display-font" style={{ fontSize: 28, lineHeight: 1 }}>{meta.leagueName}</div>
          </div>

          <div style={{ background: 'white', border: `2px solid ${theme.ink}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px 40px 60px 55px', background: theme.ink, color: theme.cream, padding: '8px 10px', gap: 6 }}>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.1em' }}>#</div>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.1em' }}>TEAM</div>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.1em', textAlign: 'center' }}>W</div>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.1em', textAlign: 'center' }}>L</div>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.1em', textAlign: 'center' }}>DIFF</div>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.1em', textAlign: 'center' }}>WIN%</div>
            </div>
            {standings.map((t, i) => {
              const diff = t.pf - t.pa;
              const pct = t.games ? Math.round(t.wins / t.games * 100) + '%' : '—';
              const leader = i === 0 && t.wins > 0;
              return (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px 40px 60px 55px', padding: '10px', borderBottom: i < standings.length - 1 ? '1px solid #0001' : 'none', alignItems: 'center', gap: 6, background: leader ? `${theme.yellow}44` : 'white' }}>
                  <div className="display-font" style={{ fontSize: 16 }}>
                    {leader ? '🏆' : ''}{i + 1}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 3, height: 26, background: t.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                      <div className="mono-font" style={{ fontSize: 10, opacity: 0.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.members.map(m => m.name).join(' & ')}
                      </div>
                    </div>
                  </div>
                  <div className="display-font" style={{ fontSize: 17, textAlign: 'center', color: theme.green }}>{t.wins}</div>
                  <div className="display-font" style={{ fontSize: 17, textAlign: 'center', color: theme.coral }}>{t.losses}</div>
                  <div className="mono-font" style={{ fontSize: 12, textAlign: 'center', fontWeight: 700, color: diff > 0 ? theme.green : diff < 0 ? theme.coral : theme.ink }}>
                    {diff > 0 ? '+' : ''}{diff}
                  </div>
                  <div className="mono-font" style={{ fontSize: 12, textAlign: 'center', fontWeight: 700 }}>{pct}</div>
                </div>
              );
            })}
          </div>

          {recent.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.2em', marginBottom: 8 }}>RECENT RESULTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                {recent.map((r, i) => {
                  const a = teamMap[r.teamA], b = teamMap[r.teamB];
                  if (!a || !b) return null;
                  return (
                    <div key={i} style={{ background: 'white', border: `1px solid ${theme.ink}`, padding: 8, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: r.winner === a.id ? 700 : 400, opacity: r.winner === b.id ? 0.55 : 1 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{a.name}</span>
                        <span className="mono-font">{r.scoreA}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: r.winner === b.id ? 700 : 400, opacity: r.winner === a.id ? 0.55 : 1 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{b.name}</span>
                        <span className="mono-font">{r.scoreB}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// BRACKET TAB
// ============================================================
function BracketTab({ bracket, seedBracket, advanceWinner, meta }) {
  const heroRef = useRef(null);
  const champion = bracket.length > 0 && bracket[bracket.length - 1].matches[0].winner;

  return (
    <div>
      <SectionHeader title="TOURNAMENT" subtitle="Single-elimination bracket" />

      <div style={{ background: 'white', border: `2px solid ${theme.ink}`, padding: 16, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={seedBracket} style={{ ...btnStyle, background: theme.ink, color: theme.cream, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trophy size={13} /> {bracket.length ? 'REGENERATE' : 'SEED BRACKET'}
        </button>
        {bracket.length > 0 && (
          <button onClick={() => exportPNG(heroRef.current, `${meta.leagueName.replace(/\s+/g, '_')}_bracket.png`)}
            style={{ ...btnStyle, background: theme.yellow, color: theme.ink, border: `1px solid ${theme.ink}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> EXPORT
          </button>
        )}
        <div className="mono-font" style={{ fontSize: 10, opacity: 0.6 }}>
          Tap a team name to advance them.
        </div>
      </div>

      {bracket.length === 0 ? (
        <EmptyState icon={Trophy} text="No bracket yet. Play some games, then seed it." />
      ) : (
        <div ref={heroRef} style={{ background: theme.ink, color: theme.cream, padding: 24, border: `3px solid ${theme.ink}`,
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 80px, ${theme.yellow}08 80px, ${theme.yellow}08 81px), repeating-linear-gradient(0deg, transparent, transparent 80px, ${theme.yellow}08 80px, ${theme.yellow}08 81px)` }}>
          <div style={{ textAlign: 'center', borderBottom: `3px solid ${theme.yellow}`, paddingBottom: 12, marginBottom: 20 }}>
            <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.4em', color: theme.yellow }}>POSTSEASON</div>
            <div className="display-font" style={{ fontSize: 30, lineHeight: 1, color: theme.cream }}>THE BRACKET</div>
            <div className="serif-font" style={{ fontSize: 14, fontStyle: 'italic', opacity: 0.7 }}>{meta.leagueName} · {meta.season}</div>
          </div>
          {champion && (
            <div style={{ textAlign: 'center', marginBottom: 20, padding: 14, border: `2px dashed ${theme.yellow}`, background: `${theme.yellow}11` }}>
              <div className="mono-font" style={{ fontSize: 10, letterSpacing: '0.3em', color: theme.yellow }}>CHAMPION</div>
              <div className="display-font" style={{ fontSize: 26, color: theme.yellow }}>🏆 {champion.name}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 8 }}>
            {bracket.map((round, ri) => (
              <div key={ri} style={{ flex: '1 0 180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 10, minWidth: 180 }}>
                <div className="display-font" style={{ fontSize: 12, letterSpacing: '0.15em', color: theme.yellow, textAlign: 'center', marginBottom: 4 }}>
                  {roundName(ri, bracket.length)}
                </div>
                {round.matches.map((m, mi) => (
                  <BracketMatch key={m.id} match={m} roundIdx={ri} matchIdx={mi}
                    isFinal={ri === bracket.length - 1} onAdvance={advanceWinner} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketMatch({ match, roundIdx, matchIdx, isFinal, onAdvance }) {
  const rowStyle = (team, isWinner) => ({
    padding: '9px 10px', fontSize: 12, fontWeight: isWinner ? 700 : 500,
    background: isWinner ? theme.yellow : 'transparent',
    color: isWinner ? theme.ink : theme.cream,
    borderBottom: `1px solid ${theme.cream}33`,
    cursor: team?.tbd || team?.bye ? 'default' : 'pointer',
    opacity: team?.tbd ? 0.4 : team?.bye ? 0.5 : 1,
    display: 'flex', alignItems: 'center', gap: 6,
  });
  return (
    <div style={{ background: `${theme.cream}08`, border: `1px solid ${theme.cream}33`, borderLeft: isFinal ? `4px solid ${theme.yellow}` : `2px solid ${theme.yellow}` }}>
      <div onClick={() => onAdvance(roundIdx, matchIdx, match.teamA)} style={rowStyle(match.teamA, match.winner?.id === match.teamA?.id)}>
        {match.teamA?.color && <div style={{ width: 3, height: 16, background: match.teamA.color }} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.teamA?.name || 'TBD'}</span>
      </div>
      <div onClick={() => onAdvance(roundIdx, matchIdx, match.teamB)} style={{ ...rowStyle(match.teamB, match.winner?.id === match.teamB?.id), borderBottom: 'none' }}>
        {match.teamB?.color && <div style={{ width: 3, height: 16, background: match.teamB.color }} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.teamB?.name || 'TBD'}</span>
      </div>
    </div>
  );
}

// ============================================================
// SHARED BITS
// ============================================================
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16, borderBottom: `1px solid ${theme.ink}`, paddingBottom: 10 }}>
      <div className="display-font" style={{ fontSize: 32, lineHeight: 1 }}>{title}</div>
      <div className="serif-font" style={{ fontSize: 13, fontStyle: 'italic', opacity: 0.7, marginTop: 2 }}>{subtitle}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ border: `2px dashed ${theme.ink}33`, padding: 40, textAlign: 'center', background: 'white' }}>
      <Icon size={32} style={{ color: theme.ink, opacity: 0.35 }} />
      <div className="serif-font" style={{ fontSize: 14, fontStyle: 'italic', opacity: 0.6, marginTop: 8 }}>{text}</div>
    </div>
  );
}

const inputStyle = {
  padding: '8px 10px',
  border: `1px solid ${theme.ink}`,
  background: theme.cream,
  fontSize: 14,
  outline: 'none',
};

const btnStyle = {
  padding: '10px 16px',
  fontSize: 11,
  letterSpacing: '0.15em',
  fontWeight: 700,
  border: 'none',
};
