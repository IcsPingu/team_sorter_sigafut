import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home, PlayCircle, Calendar, Users, Settings, LogOut,
  Shuffle, Shield, Zap, Scale, Sparkles, Plus, Trash2, Edit3,
  Copy, Check, Volume2, VolumeX, RefreshCw, Trophy, ArrowRight,
  Flame, Footprints, Activity, Award, Eye, Star, X, Image
} from 'lucide-react';
import html2canvas from 'html2canvas';
import './SortearTimes.css';

// ───── Navigation Items ─────────────────────────────────────
const NAV_ITEMS = [
  { id: 'home', label: 'Página Inicial', icon: Home },
  { id: 'replays', label: 'Replays', icon: PlayCircle },
  { id: 'agenda', label: 'Agenda da Arena', icon: Calendar },
  { id: 'times', label: 'Times Arena', icon: Users },
  { id: 'sorteador', label: 'Sortear Pelada (FIFA)', icon: Shuffle },
];

// ───── Default Pelada Players with Star Ratings ──────────────
// Overall is derived from the player's other stats — not entered manually.
// Weighting: skills count most, then movement, then physical ease.
// A heavier (obese) player hurts the rating, so weight counts negatively:
// (6 - weight) converts "5 stars = heaviest" into "5 = worst" for the rating.
function computeOverall(p) {
  const raw = (p.skills * 0.5) + (p.movement * 0.3) + ((6 - p.weight) * 0.2);
  return Math.max(1, Math.min(5, Math.round(raw)));
}

const DEFAULT_PELADA_PLAYERS = [
  { id: '1', name: 'Neymar da Vila', pos: 'FWD', altPos: 'MID', weight: 3, movement: 5, skills: 5, overall: 5 },
  { id: '2', name: 'Marcos Paredão', pos: 'GK', altPos: '', weight: 4, movement: 2, skills: 4, overall: 4 },
  { id: '3', name: 'Gabriel Barbosa', pos: 'FWD', altPos: 'MID', weight: 3, movement: 4, skills: 4, overall: 4 },
  { id: '4', name: 'Lucas Canhoto', pos: 'MID', altPos: 'FWD', weight: 3, movement: 4, skills: 5, overall: 4 },
  { id: '5', name: 'Xerife Tonho', pos: 'DEF', altPos: 'MID', weight: 5, movement: 3, skills: 4, overall: 4 },
  { id: '6', name: 'Pedrinho Vento', pos: 'FWD', altPos: 'MID', weight: 2, movement: 5, skills: 3, overall: 4 },
  { id: '7', name: 'Guerreira Cleiton', pos: 'DEF', altPos: 'GK', weight: 4, movement: 3, skills: 4, overall: 4 },
  { id: '8', name: 'Betinho Maestro', pos: 'MID', altPos: 'DEF', weight: 3, movement: 4, skills: 5, overall: 5 },
  { id: '9', name: 'Zé Goleiro', pos: 'GK', altPos: 'DEF', weight: 4, movement: 2, skills: 3, overall: 3 },
  { id: '10', name: 'Rodrygo Pelada', pos: 'FWD', altPos: '', weight: 3, movement: 5, skills: 4, overall: 4 },
  { id: '11', name: 'Chicão Pulmão', pos: 'MID', altPos: 'DEF', weight: 3, movement: 4, skills: 3, overall: 3 },
  { id: '12', name: 'Thiago Muralha', pos: 'DEF', altPos: '', weight: 5, movement: 3, skills: 4, overall: 4 },
];

// ───── Star Rating Component ─────────────────────────────────
function StarRating({ value, max = 5, onChange, size = 18, readonly = false }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="star-rating" onMouseLeave={() => !readonly && setHovered(0)}>
      {[...Array(max)].map((_, i) => {
        const starVal = i + 1;
        const isFilled = starVal <= (hovered || value);
        return (
          <Star
            key={i}
            size={size}
            className={`star-icon ${isFilled ? 'star-filled' : 'star-empty'} ${!readonly ? 'star-interactive' : ''}`}
            onMouseEnter={() => !readonly && setHovered(starVal)}
            onClick={() => !readonly && onChange && onChange(starVal)}
            fill={isFilled ? 'currentColor' : 'none'}
          />
        );
      })}
    </div>
  );
}

// ───── Mini Star Row (for small card previews) ───────────────
function MiniStars({ value, max = 5 }) {
  return (
    <span className="mini-stars">
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          size={10}
          className={i < value ? 'mini-star-filled' : 'mini-star-empty'}
          fill={i < value ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

// ───── Synthesized FIFA Web Audio SFX ───────────────────────
function playSynthesizedFifaSound(type = 'chime') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'chime') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.45);
      });
    } else if (type === 'fanfare') {
      const freqs = [440, 554.37, 659.25, 880];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.65);
      });
    } else if (type === 'swoosh') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'reveal') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'drumroll') {
      for (let i = 0; i < 20; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 120 + Math.random() * 80;
        const t = ctx.currentTime + i * 0.06;
        gain.gain.setValueAtTime(0.06 + (i / 20) * 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
      }
    }
  } catch (e) {
    // Audio context may be restricted by autoplay policy until interaction
  }
}

// ───── Multi-Objective Team Division Algorithm ───────────────
const BALANCE_FOCUS = {
  all:      { overall: 2.0, skills: 1.5, movement: 1.0, weight: 0.5 },
  overall:  { overall: 3.0, skills: 0.5, movement: 0.3, weight: 0.2 },
  skills:   { overall: 0.5, skills: 3.0, movement: 0.5, weight: 0.2 },
  movement: { overall: 0.5, skills: 0.5, movement: 3.0, weight: 0.3 },
  weight:   { overall: 0.5, skills: 0.3, movement: 0.5, weight: 3.0 },
};

function sortTeamsBalanced(players, teamSize = 6, focus = 'all') {
  if (!players || players.length === 0) return [];
  const focusWeights = BALANCE_FOCUS[focus] || BALANCE_FOCUS.all;

  // Only players marked as present today line up for the draw
  const active = players.filter(p => p.playing !== false);
  if (active.length === 0) return [];

  // Full-size teams of `teamSize`; the leftover people go to the reserve bench
  const fullTeams = Math.floor(active.length / teamSize);
  const playTeams = Math.max(2, fullTeams);
  const assignedCount = Math.min(active.length, playTeams * teamSize);
  const leftover = active.length - assignedCount;

  const gks = active.filter(p => p.pos === 'GK').sort((a, b) => b.overall - a.overall);
  const fieldPlayers = active.filter(p => p.pos !== 'GK');

  // Composite score from star ratings, weighted by the chosen balance focus
  const scorePlayer = (p) =>
    (p.overall * focusWeights.overall) +
    (p.skills * focusWeights.skills) +
    (p.movement * focusWeights.movement) -
    (p.weight * focusWeights.weight * 0.3);
  // Each draw scales each player's score by a random factor (±25%) instead of a
  // fixed order, so team pairings visibly change every week while total ratings
  // remain close.
  const jitteredScore = (p) => scorePlayer(p) * (0.75 + Math.random() * 0.5);
  const sortedField = [...fieldPlayers].sort((a, b) => jitteredScore(b) - jitteredScore(a));

  // Initialize teams
  const teamColors = ['team-gold', 'team-silver', 'team-bronze', 'team-purple'];
  const teamNames2 = ['Time Ouro ⚡', 'Time Prata 🛡️'];
  const teamNamesN = (i) => `Time ${String.fromCharCode(65 + i)}`;

  const teams = Array.from({ length: playTeams }, (_, i) => ({
    id: i + 1,
    name: playTeams === 2 ? teamNames2[i] : teamNamesN(i),
    theme: teamColors[i % 4],
    players: [],
  }));

  // Distribute Goleiros first — max 1 GK per team, extras go back to the pool
  const extraGks = [];
  const gkSeed = Math.floor(Math.random() * playTeams);
  gks.forEach((gk, index) => {
    const hasGk = teams.some(t => t.players.some(p => p.pos === 'GK'));
    if (hasGk && index >= playTeams) {
      extraGks.push(gk);
    } else {
      teams[(index + gkSeed) % playTeams].players.push(gk);
    }
  });

  const positions = ['DEF', 'MID', 'FWD'];
  const posCountPerTeam = teams.map(() => ({ DEF: 0, MID: 0, FWD: 0 }));
  const posTotals = positions.reduce((acc, pos) => {
    acc[pos] = sortedField.filter(p => p.pos === pos).length;
    return acc;
  }, {});
  const posQuota = positions.reduce((acc, pos) => {
    acc[pos] = Math.max(1, Math.ceil(posTotals[pos] / playTeams));
    return acc;
  }, {});

  const teamCoverage = (teamIdx) => {
    const covered = new Set();
    teams[teamIdx].players.forEach(p => {
      covered.add(p.pos);
      if (p.altPos) covered.add(p.altPos);
    });
    return covered;
  };

  let direction = 1;
  let currentTeamIdx = 0;
  const pool = [...sortedField, ...extraGks];

  while (pool.length > 0) {
    if (teams.every(t => t.players.length >= teamSize)) break;

    // Find the best player for the current team in snake order
    let pickIdx = pool.findIndex(p =>
      posCountPerTeam[currentTeamIdx][p.pos] < posQuota[p.pos] &&
      teams[currentTeamIdx].players.length < teamSize
    );

    // If every remaining player exceeds the quota, prefer one whose altPos fills
    // a position this team has no coverage for yet
    if (pickIdx === -1) {
      const coverage = teamCoverage(currentTeamIdx);
      pickIdx = pool.findIndex(p => p.altPos && !coverage.has(p.altPos) && teams[currentTeamIdx].players.length < teamSize);
    }
    if (pickIdx === -1) {
      pickIdx = pool.findIndex(p => teams[currentTeamIdx].players.length < teamSize);
    }
    if (pickIdx === -1) {
      // Current team is already full — advance to the next one with space.
      let guard = 0;
      do {
        currentTeamIdx += direction;
        if (currentTeamIdx >= playTeams) { direction = -1; currentTeamIdx = playTeams - 1; }
        else if (currentTeamIdx < 0) { direction = 1; currentTeamIdx = 0; }
        guard++;
      } while (teams[currentTeamIdx].players.length >= teamSize && guard < playTeams * 2);
      continue;
    }

    const [player] = pool.splice(pickIdx, 1);
    teams[currentTeamIdx].players.push(player);
    posCountPerTeam[currentTeamIdx][player.pos]++;

    currentTeamIdx += direction;
    if (currentTeamIdx >= playTeams) {
      direction = -1;
      currentTeamIdx = playTeams - 1;
    } else if (currentTeamIdx < 0) {
      direction = 1;
      currentTeamIdx = 0;
    }
  }

  // Local swap optimization: reduce the variance of each attribute total
  // (overall / skills / movement / weight) between teams, keeping GKs and
  // position quotas untouched.
  const totals = (team) => ({
    overall: team.players.reduce((s, p) => s + p.overall, 0),
    skills: team.players.reduce((s, p) => s + p.skills, 0),
    movement: team.players.reduce((s, p) => s + p.movement, 0),
    weight: team.players.reduce((s, p) => s + p.weight, 0),
  });

  const imbalance = () => {
    const sums = teams.map(totals);
    let score = 0;
    for (const key of ['overall', 'skills', 'movement', 'weight']) {
      const avg = sums.reduce((s, t) => s + t[key], 0) / playTeams;
      score += sums.reduce((s, t) => s + Math.pow(t[key] - avg, 2), 0);
    }
    return score;
  };

  for (let iter = 0; iter < 60; iter++) {
    let improved = false;
    for (let i = 0; i < playTeams; i++) {
      for (let j = i + 1; j < playTeams; j++) {
        for (let a = 0; a < teams[i].players.length; a++) {
          if (teams[i].players[a].pos === 'GK') continue;
          for (let b = 0; b < teams[j].players.length; b++) {
            if (teams[j].players[b].pos === 'GK') continue;
            if (teams[i].players[a].pos !== teams[j].players[b].pos) continue;
            const before = imbalance();
            [teams[i].players[a], teams[j].players[b]] = [teams[j].players[b], teams[i].players[a]];
            const after = imbalance();
            if (after < before) {
              improved = true;
            } else {
              [teams[i].players[a], teams[j].players[b]] = [teams[j].players[b], teams[i].players[a]];
            }
          }
        }
      }
    }
    if (!improved) break;
  }

  // Reserve bench: players who don't fit one full team of the selected format
  if (pool.length > 0) {
    teams.push({
      id: teams.length + 1,
      name: 'Reservados 🪑',
      theme: 'team-reserve',
      players: [...pool],
    });
  }

  // Fascounter-balance the bench: if a reserve player is not worse than a
  // same-position starter, swap them in so the bench isn't always the weakest.
  const reserve = teams[teams.length - 1];
  if (reserve && reserve.name.startsWith('Reservados')) {
    const starterTeams = teams.filter(t => t !== reserve);
    for (let i = 0; i < reserve.players.length; i++) {
      const rp = reserve.players[i];
      // Find the weakest non-reserve player of the same position group
      let weakest = null;
      for (const t of starterTeams) {
        for (let j = 0; j < t.players.length; j++) {
          const p = t.players[j];
          if (p.pos === rp.pos && p.overall <= rp.overall && (!weakest || p.overall < weakest.p.overall)) {
            weakest = { t, j, p };
          }
        }
      }
      if (weakest) {
        weakest.t.players[weakest.j] = rp;
        reserve.players[i] = weakest.p;
      }
    }
  }

  // Calculate team metrics
  return teams.map(t => {
    const avgOverall = t.players.length
      ? +(t.players.reduce((s, p) => s + p.overall, 0) / t.players.length).toFixed(1)
      : 0;
    const avgSkills = t.players.length
      ? +(t.players.reduce((s, p) => s + p.skills, 0) / t.players.length).toFixed(1)
      : 0;
    const avgMovement = t.players.length
      ? +(t.players.reduce((s, p) => s + p.movement, 0) / t.players.length).toFixed(1)
      : 0;
    const avgWeight = t.players.length
      ? +(t.players.reduce((s, p) => s + p.weight, 0) / t.players.length).toFixed(1)
      : 0;

    return { ...t, avgOverall, avgSkills, avgMovement, avgWeight };
  });
}

// ───── Reusable read-only Pitch inside the showdown ──────────
function PitchView({ teams, revealedCards, phase }) {
  return (
    <div className="pitch-container showdown-pitch showdown-lineup-pitch">
      <div className="pitch-line-center" />
      <div className="pitch-circle-center" />
      <div className="pitch-penalty pitch-penalty-top" />
      <div className="pitch-penalty pitch-penalty-bottom" />

      {teams.slice(0, 2).map((team, tIdx) => {
        const visible = (p) =>
          revealedCards.some(c => c && c.player && c.player.id === p.id) || phase === 'done';
        const gk = team.players.filter(p => p.pos === 'GK' && visible(p));
        const def = team.players.filter(p => p.pos === 'DEF' && visible(p));
        const mid = team.players.filter(p => p.pos === 'MID' && visible(p));
        const fwd = team.players.filter(p => p.pos === 'FWD' && visible(p));

        const renderPlayer = (p) => (
          <div key={p.id} className="pitch-player-node showdown-pitch-node">
            <div
              className="pitch-player-avatar"
              style={tIdx === 0 ? { background: '#f7d070' } : { background: '#3b82f6', color: '#fff' }}
            >
              {'★'.repeat(p.overall).substring(0, 3)}
            </div>
            <span className="pitch-player-name">{p.name.split(' ')[0]}</span>
            <span className="showdown-pitch-stats">
              ⚖{p.weight}★ 💨{p.movement}★ ⚡{p.skills}★
            </span>
          </div>
        );

        const row = (players, key) =>
          players.length > 0 ? (
            <div key={key} className={`lineup-row lineup-row-${key}`}>
              {players.map(renderPlayer)}
            </div>
          ) : null;

        const rows = tIdx === 0
          ? [row(gk, 'gk'), row(def, 'def'), row(mid, 'mid'), row(fwd, 'fwd')]
          : [row(fwd, 'fwd'), row(mid, 'mid'), row(def, 'def'), row(gk, 'gk')];

        return (
          <div key={team.id} className={`lineup-half ${tIdx === 0 ? 'lineup-half-top' : 'lineup-half-bottom'}`}>
            {rows}
          </div>
        );
      })}
    </div>
  );
}

// ───── Showdown Overlay Component ────────────────────────────
function ShowdownOverlay({ teams, onClose, soundEnabled }) {
  const [phase, setPhase] = useState('intro'); // intro -> versus -> reveal -> done
  const [revealedCards, setRevealedCards] = useState([]);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const overlayRef = useRef(null);
  const shareRef = useRef(null);

  const handleShareOverlayImage = async () => {
    if (!shareRef.current) return;
    try {
      const canvas = await html2canvas(shareRef.current, {
        width: 1280,
        height: 720,
        backgroundColor: '#0b0e17',
        scale: 2,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'sigafut-showdown.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'SIGAFUT - Divisão de Times',
            text: '⚽ Times da pelada!',
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'sigafut-showdown.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (e) {
      alert('Não foi possível gerar a imagem.');
    }
  };

  // Particle system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const spawnParticles = (count = 40) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 2,
          vy: 1.5 + Math.random() * 3,
          size: 2 + Math.random() * 4,
          opacity: 0.6 + Math.random() * 0.4,
          color: ['#f7d070', '#c9933b', '#ffe396', '#ffffff', '#00ff87'][Math.floor(Math.random() * 5)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 6,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.y < canvas.height + 50);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.002;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        ctx.restore();
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Spawn waves of particles
    const intervals = [];
    intervals.push(setInterval(() => spawnParticles(15), 600));
    spawnParticles(80);
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      intervals.forEach(clearInterval);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Phase transitions
  useEffect(() => {
    if (phase === 'intro') {
      if (soundEnabled) playSynthesizedFifaSound('drumroll');
      const t = setTimeout(() => setPhase('versus'), 1800);
      return () => clearTimeout(t);
    }
    if (phase === 'versus') {
      if (soundEnabled) playSynthesizedFifaSound('swoosh');
      const t = setTimeout(() => setPhase('reveal'), 2200);
      return () => clearTimeout(t);
    }
  }, [phase, soundEnabled]);

  // Sequential card reveal
  useEffect(() => {
    if (phase !== 'reveal') return;

    const allPlayers = [];
    if (!teams || teams.length === 0) return;

    // Interleave players from each team for dramatic effect
    const maxLen = Math.max(...teams.map(t => t.players.length));
    for (let i = 0; i < maxLen; i++) {
      teams.forEach((team, tIdx) => {
        if (team.players[i]) {
          allPlayers.push({ player: team.players[i], teamIdx: tIdx, teamName: team.name, teamTheme: team.theme });
        }
      });
    }

    let idx = 0;
    let doneTimeout = null;
    const interval = setInterval(() => {
      if (idx >= allPlayers.length) {
        clearInterval(interval);
        doneTimeout = setTimeout(() => {
          setPhase('done');
          if (soundEnabled) playSynthesizedFifaSound('fanfare');
        }, 600);
        return;
      }

      if (soundEnabled) playSynthesizedFifaSound('reveal');
      const card = allPlayers[idx];
      setRevealedCards(prev => [...prev, card]);
      idx++;
    }, 450);

    return () => {
      clearInterval(interval);
      if (doneTimeout) clearTimeout(doneTimeout);
    };
  }, [phase, teams, soundEnabled]);

  if (!teams || teams.length === 0) return null;

  return (
    <div ref={overlayRef} className="showdown-overlay">
      {/* Hidden fixed-format card used for image export */}
      <div ref={shareRef} className="share-card-stage" aria-hidden="true">
        <h2 className="share-card-title">⚡ TIMES DEFINIDOS! ⚡</h2>
        <div className="share-card-body">
          <div className="share-card-pitch-wrap">
            <PitchView teams={teams} revealedCards={revealedCards} phase={'done'} />
          </div>
          <div className="share-card-rosters">
            {teams.map((team) => (
              <div className="share-team" key={team.id}>
                <div className="share-team-header">{team.name}</div>
                {team.players.map((p) => (
                  <div className="share-player" key={p.id}>
                    {p.name} <span>({p.pos}{p.altPos ? `/${p.altPos}` : ''})</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="showdown-particles" />

      {/* Close Button */}
      <button className="showdown-close" onClick={onClose}>
        <X size={24} />
      </button>

      {/* Intro Phase — EA FC logo flare */}
      {phase === 'intro' && (
        <div className="showdown-intro">
          <div className="showdown-ea-logo">
            <span className="ea-fc-text">EA FC</span>
            <span className="ea-fc-sub">TEAM DIVISION</span>
          </div>
          <div className="showdown-loading-bar">
            <div className="showdown-loading-fill" />
          </div>
        </div>
      )}

      {/* Versus Phase — Teams face off */}
      {phase === 'versus' && (
        <div className="showdown-versus">
          <div className="showdown-team-entry showdown-team-left">
            <div className={`showdown-emblem ${teams[0]?.theme}`}>
              {teams[0]?.name?.charAt(5) || teams[0]?.name?.charAt(0)}
            </div>
            <h2 className="showdown-team-name">{teams[0]?.name}</h2>
          </div>

          <div className="showdown-vs-flash">
            <span>VS</span>
          </div>

          {teams[1] && (
            <div className="showdown-team-entry showdown-team-right">
              <div className={`showdown-emblem ${teams[1]?.theme}`}>
                {teams[1]?.name?.charAt(5) || teams[1]?.name?.charAt(0)}
              </div>
              <h2 className="showdown-team-name">{teams[1]?.name}</h2>
            </div>
          )}
        </div>
      )}

      {/* Reveal Phase — Cards fly in one by one */}
      {(phase === 'reveal' || phase === 'done') && (
        <div className="showdown-reveal-stage">
          <h2 className="showdown-reveal-title">
            {phase === 'done' ? '⚡ TIMES DEFINIDOS! ⚡' : '🎴 REVELANDO JOGADORES...'}
          </h2>

          <div className="showdown-reveal-body">
          {/* Tactical Lineup Pitch — players positioned by their roles */}
          <PitchView teams={teams} revealedCards={revealedCards} phase={phase} />

          <div className="showdown-teams-lanes">
            {teams.map((team, tIdx) => (
              <div key={team.id} className="showdown-lane">
                <div className="showdown-lane-header">
                  <div className={`showdown-lane-emblem ${team.theme}`}>
                    {team.name.charAt(5) || team.name.charAt(0)}
                  </div>
                  <span className="showdown-lane-name">{team.name}</span>
                </div>

                <div className="showdown-lane-cards">
                  {revealedCards
                    .filter(c => c.teamIdx === tIdx)
                    .map((c, ci) => (
                      <div
                        key={c.player.id}
                        className={`showdown-card showdown-card-enter ${tIdx === 0 ? 'from-left' : 'from-right'}`}
                        style={{ animationDelay: `${ci * 0.05}s` }}
                      >
                        <div className="showdown-card-badge">
                          <span className="showdown-card-ovr">
                            {'★'.repeat(c.player.overall)}
                          </span>
                          <span className="showdown-card-pos">{c.player.pos}{c.player.altPos ? `/${c.player.altPos}` : ''}</span>
                        </div>
                        <div className="showdown-card-info">
                          <h4>{c.player.name}</h4>
                          <div className="showdown-card-stats">
                            <span>⚖ {'★'.repeat(c.player.weight)}</span>
                            <span>💨 {'★'.repeat(c.player.movement)}</span>
                            <span>⚡ {'★'.repeat(c.player.skills)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          </div>

          {phase === 'done' && (
            <>
              <button className="showdown-continue-btn" onClick={onClose}>
                <Trophy size={20} />
                VER RESULTADO COMPLETO
              </button>
              <button className="showdown-continue-btn showdown-share-btn" onClick={handleShareOverlayImage}>
                <Image size={20} />
                COMPARTILHAR SHOWDOWN
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ───── Sidebar Navigation Sub-component ──────────────────────
function Sidebar({ user, activePage, onNavigate, onLogout }) {
  return (
    <aside className="dash-sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="brand-name">SIGAFUT</span>
          <span className="brand-sub">ARENA MANAGEMENT</span>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  className={`nav-link ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button 
          className="user-profile-btn"
          onClick={() => onNavigate('settings')}
        >
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Usuário Arena'}</span>
            <span className="user-role">{user?.role || 'Gerente de Pelada'}</span>
          </div>
        </button>
        <button 
          className="logout-btn" 
          onClick={onLogout}
          title="Sair da conta"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

// ───── Main SortearTimes Component ───────────────────────────
export default function SortearTimes({ user, onNavigate, onLogout }) {
  // Mobile tab state: 'roster' | 'config' | 'fifa'
  const [activeTab, setActiveTab] = useState('roster');

  // Roster persistence (localStorage by default, shared cloud roster if configured)
  const [players, setPlayers] = useState(() => {
    // Cloud-configured deployments always load from the shared bin; avoid seeding
    // a new device with placeholder players.
    const cloudConfigured = !!import.meta.env.VITE_ROSTER_URL || import.meta.env.PROD;
    if (!cloudConfigured) {
      const saved = localStorage.getItem('sigafut_pelada_players_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map(p => ({ ...p, overall: computeOverall(p) }));
        } catch (e) {}
      }
      return DEFAULT_PELADA_PLAYERS.map(p => ({ ...p, overall: computeOverall(p) }));
    }
    return [];
  });

  const CLOUD_URL = import.meta.env.VITE_ROSTER_URL || '/api/bin'; // direct or serverless proxy
  const CLOUD_KEY = import.meta.env.VITE_ROSTER_KEY; // only needed for direct mode
  const loadedCloud = useRef(false);

  // On mount: if a cloud roster is configured, load it instead of local/default players
  useEffect(() => {
    if (!CLOUD_URL) return;
    (async () => {
      try {
        const headers = {};
        if (CLOUD_KEY) {
          headers['X-Master-Key'] = CLOUD_KEY;
          headers['X-Bin-Meta'] = 'false';
        }
        const res = await fetch(CLOUD_KEY ? `${CLOUD_URL}/latest` : CLOUD_URL, { headers });
        if (!res.ok) { loadedCloud.current = true; return; }
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.record || data.players;
        if (Array.isArray(list)) {
          setPlayers(list.map(p => ({ ...p, overall: computeOverall(p) })));
        }
        loadedCloud.current = true;
      } catch (e) {
        loadedCloud.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Config parameters
  const [teamSize, setTeamSize] = useState(6);
  const [balanceFocus, setBalanceFocus] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Result state
  const [drawnTeams, setDrawnTeams] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Showdown overlay
  const [showShowdown, setShowShowdown] = useState(false);

  // Edit player
  const [editingPlayer, setEditingPlayer] = useState(null);

  // New player form state
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    pos: 'MID',
    altPos: '',
    weight: 3,
    movement: 3,
    skills: 3,
    overall: 3
  });

  // Persist players (localStorage always; cloud when configured)
  const cloudSaveTimer = useRef(null);
  useEffect(() => {
    localStorage.setItem('sigafut_pelada_players_v2', JSON.stringify(players));
    if (!CLOUD_URL) return;
    if (!loadedCloud.current) return; // wait for the initial load before pushing
    if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = setTimeout(() => {
      const headers = {};
      if (CLOUD_KEY) headers['X-Master-Key'] = CLOUD_KEY;
      headers['Content-Type'] = 'application/json';
      fetch(CLOUD_URL, {
        method: 'PUT',
        headers,
        body: JSON.stringify(players),
      }).catch(() => {});
    }, 800);
  }, [players]);

  // Auto calculate teams when dependencies change
  useEffect(() => {
    if (players.length >= 2) {
      const sorted = sortTeamsBalanced(players, teamSize, balanceFocus);
      setDrawnTeams(sorted);
    }
  }, [players, teamSize, balanceFocus]);

  // ── Sort Button with Showdown Animation ──
  const handleSortTeams = () => {
    if (players.length < 2) return;

    const result = sortTeamsBalanced(players, teamSize, balanceFocus);
    setDrawnTeams(result);
    setShowShowdown(true);
  };

  const handleShowdownClose = () => {
    setShowShowdown(false);
    setActiveTab('fifa');
  };

  // Add new player to roster
  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!newPlayer.name.trim()) return;

    const created = {
      ...newPlayer,
      id: Date.now().toString(),
      weight: Number(newPlayer.weight),
      movement: Number(newPlayer.movement),
      skills: Number(newPlayer.skills),
      overall: computeOverall(newPlayer),
    };

    setPlayers([...players, created]);
    setNewPlayer({ name: '', pos: 'MID', altPos: '', weight: 3, movement: 3, skills: 3, overall: 3 });
  };

  // Save edited player
  const handleSaveEdit = () => {
    if (!editingPlayer) return;
    setPlayers(players.map(p => p.id === editingPlayer.id ? { ...editingPlayer, overall: computeOverall(editingPlayer) } : p));
    setEditingPlayer(null);
  };

  // Delete player
  const handleDeletePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  // Load preset roster
  const handleLoadPreset = (count) => {
    const selected = DEFAULT_PELADA_PLAYERS.slice(0, count).map(p => ({ ...p, overall: computeOverall(p) }));
    setPlayers(selected);
  };

  // Format WhatsApp Message
  const getWhatsAppShareText = () => {
    let msg = `⚽ *SIGAFUT ARENA - DRAFT DA PELADA (FIFA SHOWDOWN)* ⚽\n\n`;
    drawnTeams.forEach(t => {
      const starStr = (n) => '⭐'.repeat(n);
      msg += `🏆 *${t.name}* (OVR Média: ${t.avgOverall}★)\n`;
      t.players.forEach(p => {
        msg += `  • [${p.pos}${p.altPos ? ` / ${p.altPos}` : ''}] ${p.name} — OVR ${starStr(p.overall)} | SKL ${starStr(p.skills)} | MOV ${starStr(p.movement)} | WGT ${starStr(p.weight)}\n`;
      });
      msg += `\n`;
    });
    msg += `🚀 Sorteado pelo SIGAFUT Arena Manager!`;
    return msg;
  };

  const handleCopyWhatsApp = () => {
    const text = getWhatsAppShareText();
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const fifaCardRef = useRef(null);
  const handleShareImage = async () => {
    if (!fifaCardRef.current) return;
    try {
      const canvas = await html2canvas(fifaCardRef.current, {
        backgroundColor: '#0b0e17',
        scale: 2,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'sigafut-times.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'SIGAFUT - Divisão de Times',
            text: '⚽ Times da pelada!',
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'sigafut-times.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (e) {
      alert('Não foi possível gerar a imagem.');
    }
  };

  return (
    <div className="sorteador-container">
      {/* FIFA Showdown Overlay */}
      {showShowdown && (
        <ShowdownOverlay
          teams={drawnTeams}
          onClose={handleShowdownClose}
          soundEnabled={soundEnabled}
        />
      )}

      <main className="sorteador-main">
        <div className="sorteador-content">
          
          {/* Header */}
          <div className="sorteador-header">
            <div className="header-title-box">
              <h1>
                <Shuffle size={28} style={{ color: '#f7d070' }} />
                Divisão de Times <span className="badge-fifa">EA FC / FIFA</span>
              </h1>
              <p>Estrelas de 1 a 5 — Peso, Movimentação, Habilidade e Overall para equilibrar os times</p>
            </div>

            <div className="header-actions">
              <button 
                className="btn-action" 
                onClick={() => setSoundEnabled(!soundEnabled)}
                title="Ativar/Desativar Efeitos Sonoros EA FC"
              >
                {soundEnabled ? <Volume2 size={18} style={{ color: '#10b981' }} /> : <VolumeX size={18} />}
                {soundEnabled ? 'Som LIGADO' : 'Mudo'}
              </button>

              <button className="btn-action btn-fifa-gold" onClick={handleSortTeams} disabled={players.length < 2}>
                <Sparkles size={18} />
                SORTEAR SHOWDOWN ⚡
              </button>
            </div>
          </div>

          {/* Main Grid View */}
          <div className="sorteador-grid">
            
            {/* Left Controls & Roster */}
            {(
              <div className="sorteador-sidebar-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Algorithmic Settings */}
                <div className="glass-card">
                  <div className="glass-card-header">
                    <h3><Scale size={20} style={{ color: '#10b981' }} /> Configurar Divisão</h3>
                  </div>

                  <div className="config-group">
                    <label>Formato da Pelada</label>
                    <div className="btn-toggle-group">
                      {[
                        { label: '5x5 (Fut 5)', size: 5 },
                        { label: '6x6 (Fut 6)', size: 6 },
                        { label: '7x7 (Fut 7)', size: 7 },
                      ].map((fmt) => (
                        <button
                          key={fmt.size}
                          className={`btn-toggle ${teamSize === fmt.size ? 'active' : ''}`}
                          onClick={() => setTeamSize(fmt.size)}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="config-group">
                    <label>Foco do Algoritmo de Balanço</label>
                    <div className="btn-toggle-group">
                      <button className="btn-toggle active">
                        Overall + Skills + Movement + Weight
                      </button>
                    </div>
                  </div>

                  <div className="hint-box">
                    <strong>⚖ Referência de Peso (IMC — peso ÷ altura²):</strong>
                    <ul>
                      <li><strong>1★</strong> — Abaixo do peso (IMC &lt; 18.5)</li>
                      <li><strong>2★</strong> — Normal / magro (IMC 18.5–24.9)</li>
                      <li><strong>3★</strong> — Acima do normal, um pouco forte (IMC 25–27.9)</li>
                      <li><strong>4★</strong> — Sobrepeso (IMC 28–30)</li>
                      <li><strong>5★</strong> — Obeso (IMC &gt; 30). Musculoso/forte conta como 3★.</li>
                    </ul>
                  </div>

                  <div className="presets-box">
                    <h4>Carga Rápida de Pelada</h4>
                    <div className="preset-btns">
                      <button className="btn-chip" onClick={() => handleLoadPreset(10)}>Fut 5 (10 Jogadores)</button>
                      <button className="btn-chip" onClick={() => handleLoadPreset(12)}>Fut 6 (12 Jogadores)</button>
                    </div>
                  </div>
                </div>

                {/* Add Player Form */}
                <div className="glass-card">
                  <div className="glass-card-header">
                    <h3><Plus size={20} style={{ color: '#38bdf8' }} /> Adicionar Jogador</h3>
                  </div>

                  <form onSubmit={handleAddPlayer}>
                    <div className="input-field" style={{ marginBottom: '10px' }}>
                      <label>Nome do Atleta</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Neymar, Pedrinho..." 
                        value={newPlayer.name}
                        onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="input-field">
                        <label>Posição Principal</label>
                        <select 
                          value={newPlayer.pos}
                          onChange={(e) => setNewPlayer({ ...newPlayer, pos: e.target.value })}
                        >
                          <option value="GK">GK - Goleiro</option>
                          <option value="DEF">DEF - Zagueiro</option>
                          <option value="MID">MID - Meio</option>
                          <option value="FWD">FWD - Atacante</option>
                        </select>
                      </div>
                      <div className="input-field">
                        <label>Posição Alternativa</label>
                        <select 
                          value={newPlayer.altPos}
                          onChange={(e) => setNewPlayer({ ...newPlayer, altPos: e.target.value })}
                        >
                          <option value="">Nenhuma</option>
                          <option value="GK">GK - Goleiro</option>
                          <option value="DEF">DEF - Zagueiro</option>
                          <option value="MID">MID - Meio</option>
                          <option value="FWD">FWD - Atacante</option>
                        </select>
                      </div>
                    </div>

                    <div className="star-form-grid">
                      <div className="star-form-item">
                        <label><Scale size={14} /> Peso (Weight)</label>
                        <StarRating
                          value={newPlayer.weight}
                          onChange={(v) => setNewPlayer({ ...newPlayer, weight: v })}
                        />
                      </div>
                      <div className="star-form-item">
                        <label><Zap size={14} /> Movimentação</label>
                        <StarRating
                          value={newPlayer.movement}
                          onChange={(v) => setNewPlayer({ ...newPlayer, movement: v })}
                        />
                      </div>
                      <div className="star-form-item">
                        <label><Activity size={14} /> Habilidade (Skills)</label>
                        <StarRating
                          value={newPlayer.skills}
                          onChange={(v) => setNewPlayer({ ...newPlayer, skills: v })}
                        />
                      </div>
                      <div className="star-form-item star-form-overall">
                        <label><Star size={14} /> Overall (calculado)</label>
                        <StarRating
                          value={computeOverall(newPlayer)}
                          readonly
                          size={22}
                        />
                      </div>
                    </div>

                    <p className="hint-text">⚖ Peso em IMC: 1★ abaixo de 18.5 · 2★ 18.5–24.9 · 3★ 25–27.9 · 4★ 28–30 · 5★ &gt;30 (musculoso = 3★)</p>

                    <button type="submit" className="btn-action btn-primary-glow" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                      <Plus size={16} /> Salvar Jogador
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Main Center Area */}
            <div className="sorteador-main-display">
              {(
                <div className="glass-card">
                  <div className="players-roster-header">
                    <h3>Lista de Confirmados na Pelada</h3>
                    <span className="roster-count">Presentes hoje: <strong>{players.filter(p => p.playing !== false).length}</strong> / {players.length}</span>
                  </div>

                  <div className="players-grid-view">
                    {players.map((p) => (
                      <div key={p.id} className={`player-item-card ${p.playing === false ? 'player-absent' : ''}`}>
                        <div className="player-info-meta">
                          <div className={`player-ovr-badge ${p.overall >= 4 ? 'gold' : ''}`}>
                            {'★'.repeat(p.overall)}
                          </div>
                          <div className="player-details">
                            <h4>{p.name}{p.playing === false ? ' (ausente)' : ''}</h4>
                            <div className="player-sub-tags">
                              <span className="tag-pos">{p.pos}{p.altPos ? ` / ${p.altPos}` : ''}</span>
                              <span className="tag-weight">⚖{p.weight}★</span>
                              <span className="tag-pace">💨{p.movement}★</span>
                              <span className="tag-skills">⚡{p.skills}★</span>
                            </div>
                          </div>
                        </div>

                        <div className="player-item-actions">
                          <button
                            className={`btn-present ${p.playing !== false ? 'on' : ''}`}
                            onClick={() => setPlayers(players.map(x => x.id === p.id ? { ...x, playing: !x.playing } : x))}
                            title="Está jogando hoje?"
                          >
                            {p.playing !== false ? '✓ Hoje' : '+ Hoje'}
                          </button>
                          <button 
                            className="btn-icon-sm btn-icon-edit"
                            onClick={() => setEditingPlayer({ ...p })}
                            title="Editar jogador"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            className="btn-icon-sm"
                            onClick={() => handleDeletePlayer(p.id)}
                            title="Remover da lista"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Player Modal */}
              {editingPlayer && (
                <div className="edit-modal-backdrop" onClick={() => setEditingPlayer(null)}>
                  <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="edit-modal-header">
                      <h3><Edit3 size={18} /> Editar Jogador</h3>
                      <button className="btn-icon-sm" onClick={() => setEditingPlayer(null)}>
                        <X size={18} />
                      </button>
                    </div>
                    <div className="edit-modal-body">
                      <div className="input-field" style={{ marginBottom: '10px' }}>
                        <label>Nome</label>
                        <input
                          type="text"
                          value={editingPlayer.name}
                          onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                        />
                      </div>
                      <div className="input-field" style={{ marginBottom: '10px' }}>
                        <label>Posição</label>
                        <select
                          value={editingPlayer.pos}
                          onChange={(e) => setEditingPlayer({ ...editingPlayer, pos: e.target.value })}
                        >
                          <option value="GK">GK</option>
                          <option value="DEF">DEF</option>
                          <option value="MID">MID</option>
                          <option value="FWD">FWD</option>
                        </select>
                      </div>
                      <div className="input-field" style={{ marginBottom: '10px' }}>
                        <label>Posição Alternativa</label>
                        <select
                          value={editingPlayer.altPos || ''}
                          onChange={(e) => setEditingPlayer({ ...editingPlayer, altPos: e.target.value })}
                        >
                          <option value="">Nenhuma</option>
                          <option value="GK">GK</option>
                          <option value="DEF">DEF</option>
                          <option value="MID">MID</option>
                          <option value="FWD">FWD</option>
                        </select>
                      </div>
                      <div className="star-form-grid">
                        <div className="star-form-item">
                          <label><Scale size={14} /> Peso</label>
                          <StarRating value={editingPlayer.weight} onChange={(v) => setEditingPlayer({ ...editingPlayer, weight: v })} />
                        </div>
                        <div className="star-form-item">
                          <label><Zap size={14} /> Movimentação</label>
                          <StarRating value={editingPlayer.movement} onChange={(v) => setEditingPlayer({ ...editingPlayer, movement: v })} />
                        </div>
                        <div className="star-form-item">
                          <label><Activity size={14} /> Habilidade</label>
                          <StarRating value={editingPlayer.skills} onChange={(v) => setEditingPlayer({ ...editingPlayer, skills: v })} />
                        </div>
                        <div className="star-form-item star-form-overall">
                          <label><Star size={14} /> Overall (calculado)</label>
                          <StarRating value={computeOverall(editingPlayer)} readonly size={22} />
                        </div>
                      </div>
                      <p className="hint-text">⚖ Peso em IMC: 1★ abaixo de 18.5 · 2★ 18.5–24.9 · 3★ 25–27.9 · 4★ 28–30 · 5★ &gt;30 (musculoso = 3★)</p>
                    </div>
                    <button className="btn-action btn-primary-glow" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={handleSaveEdit}>
                      <Check size={16} /> Salvar Alterações
                    </button>
                  </div>
                </div>
              )}

              {/* FIFA Ultimate Team Presentation */}
              {(
                <div ref={fifaCardRef} className="fifa-match-container">
                  
                  {/* Stadium Banner */}
                  <div className="fifa-stadium-banner">
                    <div className="versus-header">
                      {drawnTeams.slice(0, 2).map((t, idx) => (
                        <React.Fragment key={t.id}>
                          <div className="team-badge-box">
                            <div className={`team-emblem ${t.theme}`}>
                              {t.name.charAt(5) || t.name.charAt(0)}
                            </div>
                            <span className="team-name-title">{t.name}</span>
                          </div>

                          {idx === 0 && drawnTeams.length >= 2 && (
                            <div className="versus-badge">VS</div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Stats Comparison Summary */}
                    <div className="match-stats-summary">
                      <div className="stat-metric">
                        <span className="val">{drawnTeams[0]?.avgOverall || 0}★ vs {drawnTeams[1]?.avgOverall || 0}★</span>
                        <span className="lbl">Média Overall</span>
                      </div>
                      <div className="stat-metric">
                        <span className="val">{drawnTeams[0]?.avgSkills || 0}★ vs {drawnTeams[1]?.avgSkills || 0}★</span>
                        <span className="lbl">Média Skills</span>
                      </div>
                      <div className="stat-metric">
                        <span className="val">{drawnTeams[0]?.avgMovement || 0}★ vs {drawnTeams[1]?.avgMovement || 0}★</span>
                        <span className="lbl">Média Movimentação</span>
                      </div>
                      <div className="stat-metric">
                        <span className="val">{drawnTeams[0]?.avgWeight || 0}★ vs {drawnTeams[1]?.avgWeight || 0}★</span>
                        <span className="lbl">Média Peso</span>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Share */}
                  <div className="whatsapp-box">
                    <div className="whatsapp-info">
                      <Sparkles size={20} style={{ color: '#10b981' }} />
                      <span>Compartilhe a escalação com a galera da pelada!</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-action btn-fifa-gold" onClick={handleSortTeams}>
                        <RefreshCw size={16} /> SORTEAR DE NOVO
                      </button>
                      <button className="btn-action btn-primary-glow" onClick={handleCopyWhatsApp}>
                        {copiedLink ? <Check size={18} /> : <Copy size={18} />}
                        {copiedLink ? 'Copiado!' : 'Copiar p/ WhatsApp'}
                      </button>
                      <button className="btn-action btn-primary-glow" onClick={handleShareImage}>
                        <Image size={18} /> COMPARTILHAR IMAGEM
                      </button>
                    </div>
                  </div>

                  {/* Teams Cards Grid */}
                  <div className="fifa-teams-grid">
                    {drawnTeams.map((team) => (
                      <div key={team.id} className="fifa-team-column">
                        <div className="team-column-header">
                          <div className="team-title-flex">
                            <div className={`team-emblem ${team.theme}`} style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                              {team.name.charAt(5) || team.name.charAt(0)}
                            </div>
                            <h3>{team.name}</h3>
                          </div>
                          <span className="team-ovr-pill">{team.avgOverall}★ OVR</span>
                        </div>

                        <div className="fut-cards-list">
                          {team.players.map((p) => (
                            <div key={p.id} className="fut-card">
                              <div className="fut-card-left">
                                <div className="fut-badge">
                                  <span className="fut-badge-ovr">{'★'.repeat(p.overall)}</span>
                                  <span className="fut-badge-pos">{p.pos}{p.altPos ? `/${p.altPos}` : ''}</span>
                                </div>
                                <div>
                                  <h5 className="fut-player-name">{p.name}</h5>
                                  <div className="fut-stats-grid">
                                    <span className="fut-stat-item">⚖ <strong>{'★'.repeat(p.weight)}</strong></span>
                                    <span className="fut-stat-item">💨 <strong>{'★'.repeat(p.movement)}</strong></span>
                                    <span className="fut-stat-item">⚡ <strong>{'★'.repeat(p.skills)}</strong></span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tactical Pitch View */}
                  {drawnTeams.length >= 2 && (
                    <div className="pitch-container">
                      <div className="pitch-line-center" />
                      <div className="pitch-circle-center" />

                      {/* Top Team on Pitch */}
                      <div className="pitch-half">
                        {drawnTeams[0]?.players.slice(0, 5).map((p) => (
                          <div key={p.id} className="pitch-player-node">
                            <div className="pitch-player-avatar" style={{ background: '#f7d070' }}>
                              {'★'.repeat(p.overall).substring(0, 3)}
                            </div>
                            <span className="pitch-player-name">{p.name.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Team on Pitch */}
                      <div className="pitch-half">
                        {drawnTeams[1]?.players.slice(0, 5).map((p) => (
                          <div key={p.id} className="pitch-player-node">
                            <div className="pitch-player-avatar" style={{ background: '#3b82f6', color: '#fff' }}>
                              {'★'.repeat(p.overall).substring(0, 3)}
                            </div>
                            <span className="pitch-player-name">{p.name.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
