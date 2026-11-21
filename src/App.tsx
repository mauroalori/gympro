import { useEffect, useState } from 'react';
import { useAppState, suggestedDay } from './store';
import Today from './views/Today';
import Log from './views/Log';
import History from './views/History';
import ExerciseDetail from './views/ExerciseDetail';
import Settings from './views/Settings';

export const navigate = (path: string) => {
  location.hash = path;
};

function useHash() {
  const [hash, setHash] = useState(() => location.hash.replace(/^#\/?/, ''));
  useEffect(() => {
    const on = () => {
      setHash(location.hash.replace(/^#\/?/, ''));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.split('/').map(decodeURIComponent);
}

export default function App() {
  const store = useAppState();
  const [route, ...params] = useHash();
  const [dayId, setDayId] = useState<string | undefined>(() => suggestedDay(store.state).dayId);

  let view;
  let tab = route || 'today';
  switch (route) {
    case 'log':
      view = <Log key={params.join('/')} store={store} exId={params[0]} entryId={params[1]} dayId={dayId} />;
      tab = 'today';
      break;
    case 'ex':
      view = <ExerciseDetail store={store} exId={params[0]} />;
      tab = 'history';
      break;
    case 'history':
      view = <History store={store} />;
      break;
    case 'settings':
      view = <Settings store={store} />;
      break;
    default:
      view = <Today store={store} dayId={dayId} setDayId={setDayId} />;
  }

  return (
    <div className="app">
      <main className="main">{view}</main>
      <nav className="tabbar">
        <a href="#/" className={tab === 'today' ? 'active' : ''}>
          <Icon d="M6.5 6.5h11M6.5 17.5h11M4 9v6M20 9v6M2 11v2M22 11v2M6.5 6.5v11M17.5 6.5v11" />
          Entrenar
        </a>
        <a href="#/history" className={tab === 'history' ? 'active' : ''}>
          <Icon d="M3 3v18h18M7 15l4-4 3 3 6-6" />
          Progreso
        </a>
        <a href="#/settings" className={tab === 'settings' ? 'active' : ''}>
          <Icon d="M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4" />
          Ajustes
        </a>
      </nav>
    </div>
  );
}

export function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
