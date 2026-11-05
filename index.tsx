import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, Layers, User, Plus, Minus, X, Filter, 
  Trash2, UploadCloud, Download, AlertCircle, ChevronLeft, ChevronRight, 
  ShieldCheck, ShieldAlert, RefreshCw, Key, Check, Info, HelpCircle, ChevronDown,
  Grid, List, PieChart, BarChart2, Save, FolderOpen, Copy, Star, Package, CheckSquare, Square
} from 'lucide-react';

// --- CONFIGURACIÓN Y CONSTANTES ---
const API_BASE = 'https://es.marvelcdb.com/api/public';
const IMAGE_BASE = 'https://es.marvelcdb.com';

const FACTIONS = [
  { code: '', name: 'Cualquier aspecto' },
  { code: 'hero', name: 'Héroe', color: 'bg-purple-600' },
  { code: 'aggression', name: 'Agresividad', color: 'bg-red-600' },
  { code: 'justice', name: 'Justicia', color: 'bg-yellow-500' },
  { code: 'leadership', name: 'Liderazgo', color: 'bg-blue-500' },
  { code: 'protection', name: 'Protección', color: 'bg-green-600' },
  { code: 'basic', name: 'Básico', color: 'bg-gray-500' },
  { code: 'pool', name: '‘Pool', color: 'bg-pink-500' }
];

const CARD_TYPES = [
  { code: '', name: 'Cualquier tipo' },
  { code: 'hero', name: 'Héroe' },
  { code: 'alter_ego', name: 'Alter-Ego' },
  { code: 'ally', name: 'Aliado' },
  { code: 'event', name: 'Evento' },
  { code: 'support', name: 'Apoyo' },
  { code: 'upgrade', name: 'Mejora' },
  { code: 'resource', name: 'Recurso' },
];

// --- COMPONENTES UI REUTILIZABLES ---

const CustomDialog = ({ dialog, onClose }) => {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slideUp">
        <h3 className="text-xl font-bold text-white mb-2">{dialog.title}</h3>
        {dialog.inputMode ? (
          <input 
            type="text"
            autoFocus
            placeholder={dialog.inputPlaceholder}
            className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 border border-slate-700 focus:border-blue-500 mb-6 mt-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && dialog.onConfirm) {
                dialog.onConfirm(e.target.value);
                onClose();
              }
            }}
            id="dialog-input"
          />
        ) : (
          <p className="text-slate-300 mb-6 text-sm">{dialog.message}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button 
            onClick={() => { if(dialog.onCancel) dialog.onCancel(); onClose(); }}
            className="px-4 py-2 rounded-lg font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 transition"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { 
              const val = dialog.inputMode ? document.getElementById('dialog-input').value : null;
              if(dialog.onConfirm) dialog.onConfirm(val); 
              onClose(); 
            }}
            className={`px-4 py-2 rounded-lg font-bold text-white transition ${dialog.isDestructive ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            {dialog.confirmText || 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, type = 'info' }) => {
  if (!message) return null;
  const colors = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500'
  };
  return (
    <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full shadow-2xl border text-white text-xs font-bold animate-slideDown flex items-center gap-2 whitespace-nowrap ${colors[type]}`}>
      {type === 'success' && <Check className="w-4 h-4" />}
      {type === 'error' && <AlertCircle className="w-4 h-4" />}
      {type === 'info' && <Info className="w-4 h-4" />}
      {message}
    </div>
  );
};

// --- COMPONENTES DE CARTA ---

const FallbackCard = ({ card }) => (
  <div className="w-full h-full flex flex-col justify-between p-3 rounded-lg border-2 border-slate-700 bg-slate-800 shadow-lg relative overflow-hidden">
    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-slate-700/50 to-transparent"></div>
    <div className="flex justify-between items-start z-10">
      <span className="font-bold text-xs leading-tight text-white pr-2">{card.name}</span>
      {card.cost !== undefined && card.cost !== null && (
        <div className="bg-blue-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 shadow-inner border border-blue-700">
          {card.cost}
        </div>
      )}
    </div>
    <div className="text-[10px] text-yellow-500 mt-1 italic z-10">{card.traits}</div>
    <div className="flex justify-between items-end mt-2 z-10">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{card.type_name}</span>
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
        {card.faction_name}
      </span>
    </div>
  </div>
);

const CardImage = ({ card, className = "" }) => {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [card.code]);

  const imgUrl = card.imagesrc ? `${IMAGE_BASE}${card.imagesrc}` : `${IMAGE_BASE}/bundles/cards/${card.code}.png`;

  if (imgError) return <FallbackCard card={card} />;

  return (
    <img 
      src={imgUrl} 
      alt={card.name} 
      className={`rounded-lg object-cover w-full h-full shadow-md ${className}`}
      onError={() => setImgError(true)}
      loading="lazy"
      draggable="false"
    />
  );
};

// --- MODAL DETALLE CARTA ---

const CardModal = ({ modalData, onClose, deck, setDeck, identity, setIdentity, allCards, showToast }) => {
  const [currentIndex, setCurrentIndex] = useState(modalData.index);
  const [activeSideCode, setActiveSideCode] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const baseCard = modalData.list[currentIndex];
  
  const currentCard = useMemo(() => {
    if (!baseCard) return null;
    if (activeSideCode) {
      const counterpart = allCards.find(c => c.code === activeSideCode);
      if (counterpart) return counterpart;
    }
    return baseCard;
  }, [baseCard, activeSideCode, allCards]);

  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  useEffect(() => { setActiveSideCode(null); }, [currentIndex]);

  if (!currentCard) return null;

  const getCounterpartCode = (code) => {
    if (code.endsWith('a')) return code.slice(0, -1) + 'b';
    if (code.endsWith('b')) return code.slice(0, -1) + 'a';
    return null;
  };

  const counterpartCode = getCounterpartCode(currentCard.code);
  const hasCounterpart = !!allCards.find(c => c.code === counterpartCode);

  const handleFlip = () => {
    if (hasCounterpart) {
      setIsFlipping(true);
      setTimeout(() => {
        setActiveSideCode(counterpartCode);
        setIsFlipping(false);
      }, 150);
    }
  };

  const inDeck = deck[currentCard.code] || 0;
  const maxCopies = currentCard.is_unique ? 1 : (currentCard.deck_limit || 3);

  const nextCard = () => setCurrentIndex(prev => Math.min(prev + 1, modalData.list.length - 1));
  const prevCard = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  const handleTouchStart = (e) => {
    touchEnd.current = null;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };
  const handleTouchMove = (e) => {
    touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };
  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const xDist = touchStart.current.x - touchEnd.current.x;
    const yDist = touchStart.current.y - touchEnd.current.y;
    if (Math.abs(xDist) > Math.abs(yDist) && Math.abs(xDist) > 50) {
      if (xDist > 0) nextCard();
      else prevCard();
    }
  };

  const updateDeck = (change) => {
    setDeck(prev => {
      const current = prev[currentCard.code] || 0;
      const next = current + change;
      const newDeck = { ...prev };
      if (next <= 0) delete newDeck[currentCard.code];
      else if (next <= maxCopies) newDeck[currentCard.code] = next;
      return newDeck;
    });
  };

  const isIdentity = currentCard.type_code === 'hero' || currentCard.type_code === 'alter_ego';

  const toggleIdentity = () => {
    if (identity === currentCard.code) {
      setIdentity(null);
      showToast('Identidad removida', 'info');
    } else {
      setIdentity(currentCard.code);
      showToast(`${currentCard.name} seleccionad@`, 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/95 backdrop-blur-md sm:items-center sm:justify-center transition-opacity">
      <div 
        className="bg-slate-800 w-full h-[90vh] sm:h-auto sm:max-h-[92vh] sm:w-[450px] sm:rounded-3xl rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-slate-700 animate-slideUp sm:animate-fadeIn relative pb-safe"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-600 rounded-full sm:hidden z-20"></div>

        {/* Header */}
        <div className="flex justify-between items-center p-4 pt-6 sm:pt-4 border-b border-slate-700 bg-slate-900/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-bold text-lg text-white truncate flex items-center gap-2">
              {currentCard.is_unique && <span className="text-yellow-500">✦</span>}
              {currentCard.name}
              {currentCard.hasSynergy && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 ml-1" />}
            </h2>
            <p className="text-xs text-slate-400 capitalize">{currentCard.pack_name}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 relative bg-slate-900/50 scroll-smooth custom-scrollbar">
          
          <button onClick={prevCard} disabled={currentIndex === 0} className="hidden sm:flex absolute left-2 top-1/3 w-10 h-10 bg-slate-800 rounded-full items-center justify-center text-white disabled:opacity-30 z-20 hover:bg-slate-700 transition border border-slate-700">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={nextCard} disabled={currentIndex === modalData.list.length - 1} className="hidden sm:flex absolute right-2 top-1/3 w-10 h-10 bg-slate-800 rounded-full items-center justify-center text-white disabled:opacity-30 z-20 hover:bg-slate-700 transition border border-slate-700">
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="flex justify-center mb-6 relative px-4 perspective-1000">
            <div className={`w-full max-w-[250px] aspect-[5/7] transition-transform duration-300 transform-style-3d ${isFlipping ? 'scale-x-0' : 'scale-x-100'}`}>
              <CardImage card={currentCard} />
            </div>
            
            {hasCounterpart && (
              <button 
                onClick={handleFlip}
                className="absolute -right-1 bottom-4 bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] border-2 border-slate-900 transition-transform active:scale-90 flex items-center justify-center z-30"
                title="Voltear Carta"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 shadow-inner">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-slate-700 text-[11px] px-2.5 py-1 rounded-full text-slate-200 font-bold uppercase tracking-wider">{currentCard.type_name}</span>
              <span className="bg-slate-700 text-[11px] px-2.5 py-1 rounded-full text-slate-200 font-bold uppercase tracking-wider">{currentCard.faction_name}</span>
              {currentCard.cost !== null && currentCard.cost !== undefined && (
                 <span className="bg-blue-600 text-white border border-blue-500 text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Coste: {currentCard.cost}</span>
              )}
            </div>
            
            {currentCard.traits && <div className="italic text-yellow-500 text-sm mb-3 font-semibold">{currentCard.traits}</div>}
            
            <div className="text-[13px] text-slate-300 leading-relaxed space-y-2" dangerouslySetInnerHTML={{ 
              __html: (currentCard.text || '').replace(/\n/g, '<br/>')
                .replace(/\[physical\]/g, '<span class="text-red-500 font-black tracking-tighter px-0.5" title="Físico">[F]</span>')
                .replace(/\[energy\]/g, '<span class="text-yellow-500 font-black tracking-tighter px-0.5" title="Energía">[E]</span>')
                .replace(/\[mental\]/g, '<span class="text-blue-400 font-black tracking-tighter px-0.5" title="Mental">[M]</span>')
                .replace(/\[wild\]/g, '<span class="text-green-500 font-black tracking-tighter px-0.5" title="Comodín">[C]</span>')
                .replace(/<b>(.*?)<\/b>/g, '<strong class="text-white">$1</strong>')
                .replace(/<i>(.*?)<\/i>/g, '<em class="text-slate-400">$1</em>')
            }} />
          </div>
        </div>

        {/* Footer / Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-700 bg-slate-900 flex justify-between items-center shrink-0">
          {isIdentity ? (
             <div className="w-full">
               <button 
                  onClick={toggleIdentity}
                  className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition ${identity === currentCard.code ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}
               >
                 <User className="w-5 h-5" />
                 {identity === currentCard.code ? 'Quitar Identidad' : 'Fijar como Identidad'}
               </button>
             </div>
          ) : (
            <>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Copias</span>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-800 px-2 py-0.5 rounded self-start border border-slate-700">Max: {maxCopies}</span>
              </div>
              <div className="flex items-center gap-5 bg-slate-800 p-1.5 rounded-full border border-slate-700 shadow-inner">
                <button 
                  onClick={() => updateDeck(-1)}
                  disabled={inDeck === 0}
                  className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white disabled:opacity-30 active:bg-slate-600 transition"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-2xl font-black text-white w-6 text-center tabular-nums">{inDeck}</span>
                <button 
                  onClick={() => updateDeck(1)}
                  disabled={inDeck >= maxCopies}
                  className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:opacity-30 active:bg-blue-500 transition shadow-[0_0_10px_rgba(37,99,235,0.6)]"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


// --- VISTA: CATÁLOGO ---

const CardsView = ({ cards, deck, setDeck, openCardModal, identity, ownedPacks, filterOwnedOnly, setFilterOwnedOnly }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [factionFilter, setFactionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [onlySynergy, setOnlySynergy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [viewMode, setViewMode] = useState('grid');

  const heroTraitsArray = useMemo(() => {
    if(!identity) return [];
    const hero = cards.find(c => c.code === identity);
    if (!hero || !hero.traits) return [];
    return hero.traits.toLowerCase().split('.').map(t => t.trim()).filter(Boolean);
  }, [identity, cards]);

  const filteredCards = useMemo(() => {
    return cards.map(c => {
      let hasSynergy = false;
      if (heroTraitsArray.length > 0 && c.traits) {
        const cardTraits = c.traits.toLowerCase();
        hasSynergy = heroTraitsArray.some(t => cardTraits.includes(t));
      }
      return { ...c, hasSynergy };
    }).filter(c => {
      // Filtro de propiedad de expansión/pack
      if (filterOwnedOnly && c.pack_code && !ownedPacks[c.pack_code]) {
        // Excepción permitida para cartas básicas del set core o si no hay pack_code
        if (c.pack_code !== 'core') return false;
      }

      const term = searchTerm.toLowerCase();
      const matchText = !term || 
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.traits && c.traits.toLowerCase().includes(term)) ||
        (c.text && c.text.toLowerCase().includes(term));
      
      const matchFaction = factionFilter === '' || c.faction_code === factionFilter;
      const matchType = typeFilter === '' || c.type_code === typeFilter;
      const matchSynergy = !onlySynergy || c.hasSynergy;

      const notEncounter = !['minion', 'treachery', 'main_scheme', 'side_scheme', 'attachment', 'obligation', 'nemesis'].includes(c.type_code);
      
      return matchText && matchFaction && matchType && matchSynergy && (notEncounter || term.length > 3);
    }).sort((a, b) => {
      if (onlySynergy) return 0; 
      if (a.hasSynergy && !b.hasSynergy) return -1;
      if (!a.hasSynergy && b.hasSynergy) return 1;
      return (a.cost || 0) - (b.cost || 0);
    });
  }, [cards, searchTerm, factionFilter, typeFilter, onlySynergy, heroTraitsArray, filterOwnedOnly, ownedPacks]);

  return (
    <div className="flex flex-col h-full bg-slate-900 pt-safe">
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-20 p-4 border-b border-slate-800 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 tracking-tighter uppercase flex items-center gap-2">
            Catálogo
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 transition"
              title="Cambiar Vista"
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg border transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>
        </div>

        <div className="relative mb-2 group">
          <Search className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5 group-focus-within:text-red-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar héroe, aliado, rasgo..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(20); }}
            className="w-full bg-slate-800 text-white rounded-xl pl-11 pr-4 py-3 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none placeholder-slate-500 text-sm shadow-inner transition-all"
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 mt-3 animate-fadeIn">
            <select value={factionFilter} onChange={(e) => setFactionFilter(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 border border-slate-700 text-xs font-semibold outline-none focus:border-blue-500">
              {FACTIONS.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 border border-slate-700 text-xs font-semibold outline-none focus:border-blue-500">
              {CARD_TYPES.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
            
            <button 
              onClick={() => setFilterOwnedOnly(!filterOwnedOnly)}
              className={`col-span-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition ${filterOwnedOnly ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              <Package className="w-4 h-4" /> Mis Packs ({filterOwnedOnly ? 'Activado' : 'Todos'})
            </button>

            {identity && (
               <button 
                 onClick={() => setOnlySynergy(!onlySynergy)}
                 className={`col-span-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition ${onlySynergy ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
               >
                 <Star className={`w-4 h-4 ${onlySynergy ? 'fill-yellow-400' : ''}`} /> Sinergia
               </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-28 custom-scrollbar">
        <div className="flex justify-between items-center mb-4 text-[11px] uppercase font-bold tracking-widest text-slate-500">
          <span>Mostrando {Math.min(visibleCount, filteredCards.length)} / {filteredCards.length}</span>
        </div>
        
        <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-3"}>
          {filteredCards.slice(0, visibleCount).map((card, idx) => {
            const inDeck = deck[card.code] || 0;
            const isIdentity = card.code === identity || (identity && identity.slice(0,-1) === card.code.slice(0,-1) && ['a','b'].includes(card.code.slice(-1)));
            
            if (viewMode === 'grid') {
              return (
                <div 
                  key={card.code} 
                  className="relative cursor-pointer group transform transition hover:-translate-y-1 active:scale-95 animate-fadeIn"
                  onClick={() => openCardModal({ list: filteredCards, index: idx })}
                >
                  <div className={`aspect-[5/7] rounded-lg transition-all ${isIdentity ? 'ring-4 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : card.hasSynergy ? 'ring-2 ring-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'ring-1 ring-slate-700/50 group-hover:ring-slate-500'}`}>
                    <CardImage card={card} />
                  </div>
                  {inDeck > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold border-2 border-slate-900 shadow-[0_0_10px_rgba(220,38,38,0.8)] z-10 text-xs">
                      {inDeck}
                    </div>
                  )}
                  {isIdentity && (
                     <div className="absolute -bottom-2 -left-2 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg z-10">
                       <User className="w-4 h-4" />
                     </div>
                  )}
                  {card.hasSynergy && !isIdentity && (
                     <div className="absolute -top-2 -left-2 bg-yellow-500 text-slate-900 w-6 h-6 rounded-full flex items-center justify-center border border-slate-900 shadow-lg z-10">
                       <Star className="w-3.5 h-3.5 fill-slate-900" />
                     </div>
                  )}
                </div>
              );
            }

            const faction = FACTIONS.find(f => f.code === card.faction_code);
            const factionColor = faction ? faction.color : 'bg-slate-500';

            return (
              <div 
                key={card.code}
                className={`relative cursor-pointer flex items-stretch bg-slate-800 rounded-xl border transition-all animate-fadeIn overflow-hidden hover:bg-slate-750 active:scale-[0.98] ${isIdentity ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : card.hasSynergy ? 'border-yellow-500/50' : 'border-slate-700 hover:border-slate-500'}`}
                onClick={() => openCardModal({ list: filteredCards, index: idx })}
              >
                <div className={`w-2 shrink-0 ${factionColor}`}></div>
                <div className="w-24 shrink-0 p-2 relative">
                  <div className="aspect-[5/7] rounded shadow-sm overflow-hidden">
                    <CardImage card={card} />
                  </div>
                  {card.hasSynergy && (
                     <div className="absolute top-1 left-1 bg-yellow-500 rounded-full p-0.5 shadow-md">
                       <Star className="w-3 h-3 text-slate-900 fill-slate-900" />
                     </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 p-3 pl-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-bold text-white text-sm leading-tight line-clamp-2">
                      {card.is_unique && <span className="text-yellow-500 mr-1">✦</span>}
                      {card.name}
                    </h3>
                    {card.cost !== null && card.cost !== undefined && (
                      <span className="bg-blue-900 text-white border border-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shrink-0 shadow-inner">
                        {card.cost}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="bg-slate-700 text-[9px] px-1.5 py-0.5 rounded text-slate-300 font-bold uppercase tracking-wider">{card.type_name}</span>
                    {card.traits && <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest truncate max-w-[120px]">{card.traits}</span>}
                  </div>
                  
                  <div className="text-[11px] text-slate-400 line-clamp-3 leading-snug" dangerouslySetInnerHTML={{ 
                    __html: (card.text || '').replace(/\n/g, ' ')
                      .replace(/\[physical\]/g, '<span class="text-red-500 font-black px-0.5">[F]</span>')
                      .replace(/\[energy\]/g, '<span class="text-yellow-500 font-black px-0.5">[E]</span>')
                      .replace(/\[mental\]/g, '<span class="text-blue-400 font-black px-0.5">[M]</span>')
                      .replace(/\[wild\]/g, '<span class="text-green-500 font-black px-0.5">[C]</span>')
                  }} />
                </div>

                {inDeck > 0 && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-slate-800 shadow-md z-10 text-[10px]">
                    {inDeck}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {visibleCount < filteredCards.length && (
          <button 
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition border border-slate-700 uppercase tracking-widest text-xs"
          >
            Cargar Más
          </button>
        )}
      </div>
    </div>
  );
};

// --- VISTA: MAZO Y ESTADÍSTICAS ---

const DeckView = ({ cards, deck, setDeck, identity, setIdentity, openCardModal, openDialog, showToast }) => {
  const [showStats, setShowStats] = useState(false);

  const identityCard = useMemo(() => cards.find(c => c.code === identity), [cards, identity]);
  
  const deckCards = useMemo(() => {
    const list = [];
    Object.entries(deck).forEach(([code, quantity]) => {
      const card = cards.find(c => c.code === code);
      if (card) list.push({ ...card, quantity });
    });
    return list;
  }, [deck, cards]);

  const validation = useMemo(() => {
    let size = 0;
    deckCards.forEach(c => {
      if (!['hero', 'alter_ego', 'obligation', 'minion', 'treachery', 'side_scheme', 'nemesis'].includes(c.type_code)) {
        size += c.quantity;
      }
    });
    const isSizeValid = size >= 40 && size <= 50;
    const progress = Math.min((size / 50) * 100, 100);
    const progressColor = size > 50 ? 'bg-red-500' : size >= 40 ? 'bg-green-500' : 'bg-yellow-500';

    return { size, isSizeValid, progress, progressColor };
  }, [deckCards]);

  // Estadísticas Avanzadas (Costes, Recursos, Tipos y Facciones)
  const stats = useMemo(() => {
    let res = { physical: 0, energy: 0, mental: 0, wild: 0 };
    let costs = { 0:0, 1:0, 2:0, 3:0, 4:0, '5+':0 };
    let byType = { ally: 0, event: 0, upgrade: 0, support: 0, resource: 0 };
    let byFaction = { aggression: 0, justice: 0, leadership: 0, protection: 0, basic: 0, pool: 0 };

    deckCards.forEach(c => {
      if (!['hero', 'alter_ego'].includes(c.type_code)) {
        res.physical += (c.resource_physical || 0) * c.quantity;
        res.energy += (c.resource_energy || 0) * c.quantity;
        res.mental += (c.resource_mental || 0) * c.quantity;
        res.wild += (c.resource_wild || 0) * c.quantity;

        if (c.cost !== undefined && c.cost !== null) {
          if (c.cost >= 5) costs['5+'] += c.quantity;
          else costs[c.cost] += c.quantity;
        }

        if (byType[c.type_code] !== undefined) {
          byType[c.type_code] += c.quantity;
        }
        if (byFaction[c.faction_code] !== undefined) {
          byFaction[c.faction_code] += c.quantity;
        }
      }
    });
    
    const totalRes = res.physical + res.energy + res.mental + res.wild;
    const totalTypeCards = Object.values(byType).reduce((a,b)=>a+b, 0) || 1;

    return { res, totalRes, costs, maxCostCount: Math.max(...Object.values(costs), 1), byType, byFaction, totalTypeCards };
  }, [deckCards]);

  const pieStyle = useMemo(() => {
    if (stats.totalRes === 0) return { background: '#334155' };
    const pP = (stats.res.physical / stats.totalRes) * 100;
    const pE = (stats.res.energy / stats.totalRes) * 100;
    const pM = (stats.res.mental / stats.totalRes) * 100;
    
    return {
      background: `conic-gradient(
        #ef4444 0% ${pP}%,
        #eab308 ${pP}% ${pP + pE}%,
        #3b82f6 ${pP + pE}% ${pP + pE + pM}%,
        #22c55e ${pP + pE + pM}% 100%
      )`
    };
  }, [stats]);

  const handleClearDeck = () => {
    openDialog({
      title: 'Vaciar Mazo',
      message: '¿Seguro que quieres vaciar este mazo? Se eliminarán todas las cartas seleccionadas.',
      isDestructive: true,
      confirmText: 'Vaciar',
      onConfirm: () => { setDeck({}); showToast('Mazo vaciado', 'success'); }
    });
  };

  const types = ['hero', 'ally', 'event', 'support', 'upgrade', 'resource'];
  const typeNames = { hero: 'Identidad', ally: 'Aliados', event: 'Eventos', support: 'Apoyos', upgrade: 'Mejoras', resource: 'Recursos' };

  return (
    <div className="flex flex-col h-full bg-slate-900 pt-safe">
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-20 p-4 border-b border-slate-800 shadow-md">
         <div className="flex justify-between items-center mb-4">
           <h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tighter uppercase flex items-center gap-2">
             Tu Mazo
           </h1>
           <div className="flex gap-2">
             <button onClick={() => setShowStats(!showStats)} className={`p-2 rounded-lg transition border flex items-center gap-1 text-xs font-bold uppercase ${showStats ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
               <PieChart className="w-5 h-5" />
             </button>
             <button onClick={handleClearDeck} className="text-red-400 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition border border-red-500/20">
               <Trash2 className="w-5 h-5" />
             </button>
           </div>
         </div>

         <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-inner flex flex-col gap-3">
            <div className="flex justify-between items-center">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identidad Principal</span>
               {identityCard ? (
                  <span className="text-sm font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-800">{identityCard.name}</span>
               ) : (
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1 bg-red-900/30 px-2 py-1 rounded border border-red-800"><AlertCircle className="w-3.5 h-3.5"/> Faltante</span>
               )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cartas (40-50)</span>
                <span className={`text-sm font-black tabular-nums flex items-center gap-1 ${validation.size > 50 ? 'text-red-400' : validation.size >= 40 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {validation.isSizeValid ? <ShieldCheck className="w-4 h-4"/> : <ShieldAlert className="w-4 h-4"/>}
                  {validation.size}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700">
                <div className={`h-full transition-all duration-500 ${validation.progressColor}`} style={{ width: `${validation.progress}%` }}></div>
              </div>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-28 custom-scrollbar relative">
        {showStats ? (
          <div className="space-y-6 animate-fadeIn pb-6">
            {/* Curva de Coste */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-400" /> Curva de Coste</h3>
              <div className="flex items-end justify-between h-32 gap-2 mt-4 px-2">
                {Object.entries(stats.costs).map(([cost, count]) => (
                  <div key={cost} className="flex flex-col items-center flex-1 group">
                    <span className="text-xs font-bold text-slate-400 mb-1">{count}</span>
                    <div className="w-full max-w-[28px] bg-blue-500 rounded-t-sm transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" style={{ height: `${(count / stats.maxCostCount) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}></div>
                    <span className="text-xs font-black text-slate-300 mt-2 bg-slate-900 w-6 h-6 rounded-full flex items-center justify-center border border-slate-700">{cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose por Tipo de Carta */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-purple-400" /> Desglose por Tipo</h3>
              <div className="space-y-3">
                {[
                  { key: 'ally', label: 'Aliados', color: 'bg-emerald-500' },
                  { key: 'event', label: 'Eventos', color: 'bg-blue-500' },
                  { key: 'upgrade', label: 'Mejoras', color: 'bg-amber-500' },
                  { key: 'support', label: 'Apoyos', color: 'bg-purple-500' },
                  { key: 'resource', label: 'Recursos', color: 'bg-rose-500' },
                ].map(item => {
                  const count = stats.byType[item.key] || 0;
                  const pct = Math.round((count / stats.totalTypeCards) * 100);
                  return (
                    <div key={item.key} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-bold text-slate-300">
                        <span>{item.label}</span>
                        <span className="text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700/60">
                        <div className={`h-full ${item.color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Balance de Recursos */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-emerald-400" /> Generación de Recursos</h3>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-lg flex-shrink-0" style={pieStyle}></div>
                <div className="flex-1 grid grid-cols-2 gap-3 text-xs font-bold">
                  <div className="flex items-center gap-2 text-slate-300"><div className="w-3 h-3 rounded bg-red-500"></div> Físico: {stats.res.physical}</div>
                  <div className="flex items-center gap-2 text-slate-300"><div className="w-3 h-3 rounded bg-yellow-500"></div> Energía: {stats.res.energy}</div>
                  <div className="flex items-center gap-2 text-slate-300"><div className="w-3 h-3 rounded bg-blue-500"></div> Mental: {stats.res.mental}</div>
                  <div className="flex items-center gap-2 text-slate-300"><div className="w-3 h-3 rounded bg-green-500"></div> Comodín: {stats.res.wild}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          !identityCard && deckCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 mt-10 animate-fadeIn">
              <Layers className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-center text-sm font-semibold max-w-xs">Tu mazo está vacío. Ve al Catálogo para seleccionar un Héroe y añadir cartas.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              {types.map(type => {
                const group = deckCards.filter(c => c.type_code === type);
                if (group.length === 0 && (type !== 'hero' || !identityCard)) return null;
                
                if (type === 'hero' && identityCard && !group.find(c => c.code === identity)) {
                  group.unshift({ ...identityCard, quantity: 1, isIdentityLocked: true });
                }

                const groupTotal = group.reduce((sum, c) => sum + (c.isIdentityLocked ? 0 : c.quantity), 0);

                return (
                  <div key={type}>
                    <h3 className="font-bold text-slate-300 border-b-2 border-slate-800 pb-2 mb-3 uppercase tracking-wider text-xs flex justify-between items-end">
                      <span>{typeNames[type]}</span>
                      {type !== 'hero' && <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded text-[10px]">{groupTotal} cartas</span>}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {group.map((card, idx) => {
                        const faction = FACTIONS.find(f => f.code === card.faction_code);
                        const bgClass = faction ? faction.color : 'bg-slate-500';
                        return (
                          <div 
                            key={card.code} 
                            onClick={() => openCardModal({ list: group, index: idx })}
                            className="flex items-stretch bg-slate-800 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-750 hover:border-slate-600 active:scale-[0.98] transition overflow-hidden shadow-sm"
                          >
                            <div className={`w-2 flex-shrink-0 ${bgClass}`}></div>
                            <div className="flex-1 flex items-center p-2 gap-3 min-w-0">
                              <div className="font-black text-sm text-slate-300 w-6 text-center tabular-nums bg-slate-900/50 rounded py-1">
                                {card.isIdentityLocked ? 'ID' : `${card.quantity}`}
                              </div>
                              <div className="flex-1 min-w-0 py-1">
                                <div className="font-bold text-sm text-white truncate">{card.name}</div>
                                {card.traits && <div className="text-[10px] text-yellow-500 truncate uppercase tracking-widest font-semibold">{card.traits}</div>}
                              </div>
                              {card.cost !== null && card.cost !== undefined && (
                                <div className="bg-slate-900 border border-slate-600 rounded-full w-8 h-8 flex items-center justify-center text-xs font-black text-blue-100 mr-1 shadow-inner shrink-0">
                                  {card.cost}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// --- VISTA: GESTOR DE MAZOS Y COLECCIÓN (PACKS) ---

const DecksManagerView = ({ deck, setDeck, identity, setIdentity, savedDecks, setSavedDecks, ownedPacks, setOwnedPacks, openDialog, showToast }) => {
  const [importInput, setImportInput] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('decks'); // 'decks' | 'collection'

  // Listado oficial de expansiones de Marvel Champions conocido en MarvelCDB
  const officialPacks = [
    { code: 'core', name: 'Caja Básica (Core)', type: 'core' },
    { code: 'gmt', name: 'La Sombra del Titán Loco', type: 'campaign' },
    { code: 'MTS', name: 'La Sombra del Titán Loco (Campaña)', type: 'campaign' },
    { code: 'asm', name: 'La Amistad Sin Fin / Sinistral', type: 'campaign' },
    { code: 'NEO', name: 'El Núcleo Galáctico', type: 'campaign' },
    { code: 'cap', name: 'Pack de Héroe: Capitán América', type: 'hero' },
    { code: 'ms', name: 'Pack de Héroe: Sra. Marvel', type: 'hero' },
    { code: 'thor', name: 'Pack de Héroe: Thor', type: 'hero' },
    { code: 'bw', name: 'Pack de Héroe: Viuda Negra', type: 'hero' },
    { code: 'dr', name: 'Pack de Héroe: Doctor Extraño', type: 'hero' },
    { code: 'hulk', name: 'Pack de Héroe: Hulk', type: 'hero' },
    { code: 'ant', name: 'Pack de Héroe: Ant-Man', type: 'hero' },
    { code: 'wasp', name: 'Pack de Héroe: Wasp', type: 'hero' },
    { code: 'qm', name: 'Pack de Héroe: Puño de Hierro / Quicksilver', type: 'hero' },
    { code: 'sclet', name: 'Pack de Héroe: Bruja Escarlata', type: 'hero' },
    { code: 'am', name: 'Pack de Héroe: Star-Lord', type: 'hero' },
    { code: 'gam', name: 'Pack de Héroe: Gamora', type: 'hero' },
    { code: 'drax', name: 'Pack de Héroe: Drax', type: 'hero' },
    { code: 'ven', name: 'Pack de Héroe: Venom', type: 'hero' },
    { code: 'ne', name: 'Pack de Héroe: Nébula', type: 'hero' },
    { code: 'WSP', name: 'Pack de Héroe: Masacre', type: 'hero' },
    { code: 'SPX', name: 'Pack de Héroe: Peni Parker / SP//dr', type: 'hero' }
  ];

  const handleSaveDeck = () => {
    if (!identity && Object.keys(deck).length === 0) {
      showToast('No hay nada que guardar', 'error'); return;
    }
    openDialog({
      title: 'Guardar Mazo',
      message: 'Dale un nombre a esta configuración:',
      inputMode: true,
      inputPlaceholder: 'Nombre del mazo...',
      confirmText: 'Guardar',
      onConfirm: (val) => {
        if (!val || !val.trim()) return;
        const newDeck = { id: Date.now().toString(), name: val.trim(), identity, cards: deck };
        setSavedDecks(prev => [newDeck, ...prev]);
        showToast('Mazo guardado en memoria', 'success');
      }
    });
  };

  const handleLoadDeck = (saved) => {
    setIdentity(saved.identity);
    setDeck(saved.cards);
    showToast(`Mazo "${saved.name}" cargado`, 'success');
  };

  const handleDeleteDeck = (id) => {
    openDialog({
      title: 'Borrar Mazo',
      message: '¿Seguro que quieres borrar este mazo guardado?',
      isDestructive: true,
      onConfirm: () => {
        setSavedDecks(prev => prev.filter(d => d.id !== id));
        showToast('Mazo eliminado', 'info');
      }
    });
  };

  const handleImportMarvelCDB = async () => {
    if (!importInput.trim()) return;
    const idMatch = importInput.match(/\d+/);
    const mcdbId = idMatch ? idMatch[0] : importInput;

    showToast('Importando...', 'info');
    try {
      const res = await fetch(`https://es.marvelcdb.com/api/public/decklist/${mcdbId}`);
      if (!res.ok) throw new Error('Mazo no encontrado o es privado.');
      const data = await res.json();
      
      setIdentity(data.investigator_code);
      setDeck(data.slots || {});
      showToast('¡Importación completada!', 'success');
      setImportInput('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const togglePack = (code) => {
    setOwnedPacks(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleAllPacks = (status) => {
    const updated = {};
    officialPacks.forEach(p => { updated[p.code] = status; });
    setOwnedPacks(updated);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 pt-safe">
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-20 p-4 border-b border-slate-800 shadow-md">
        <h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 tracking-tighter uppercase flex items-center gap-2 mb-3">
          Gestión y Colección
        </h1>
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button 
            onClick={() => setActiveSubTab('decks')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeSubTab === 'decks' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Mis Mazos
          </button>
          <button 
            onClick={() => setActiveSubTab('collection')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeSubTab === 'collection' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Mi Colección (Packs)
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-6 pb-28">
        {activeSubTab === 'decks' ? (
          <>
            {/* Importar */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Download className="w-4 h-4" /> Importar de MarvelCDB
              </h2>
              <p className="text-xs text-slate-400 mb-3">Pega la URL o el ID de un mazo público para cargarlo instantáneamente.</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder="Ej: 12345 o url completa"
                  className="flex-1 bg-slate-900 text-white rounded-xl px-3 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                />
                <button onClick={handleImportMarvelCDB} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold transition shadow-md">
                  Cargar
                </button>
              </div>
            </div>

            {/* Mazos Locales */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                   <FolderOpen className="w-4 h-4 text-blue-400" /> Mazos Guardados
                 </h2>
                 <button onClick={handleSaveDeck} className="text-xs font-bold bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-white transition flex items-center gap-1 shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                   <Save className="w-3.5 h-3.5"/> Guardar Actual
                 </button>
              </div>

              {savedDecks.length === 0 ? (
                <div className="text-center p-6 bg-slate-900/50 rounded-xl border border-slate-700/50 border-dashed">
                  <p className="text-slate-500 text-sm font-semibold">No tienes mazos guardados localmente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedDecks.map(sd => {
                    const totalCards = Object.values(sd.cards).reduce((a,b)=>a+b, 0);
                    return (
                      <div key={sd.id} className="bg-slate-900 rounded-xl p-3 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-slate-500 transition">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm truncate">{sd.name}</h3>
                          <div className="text-xs text-slate-400 flex gap-3 mt-1">
                             <span>{totalCards} cartas</span>
                             <span className="opacity-50">|</span>
                             <span>ID Local: {sd.id.slice(-4)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button 
                             onClick={() => { navigator.clipboard.writeText(sd.id); showToast('ID Local copiado', 'success'); }}
                             className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition border border-slate-700" title="Copiar ID"
                          ><Copy className="w-4 h-4" /></button>
                          <button 
                             onClick={() => handleLoadDeck(sd)}
                             className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xs transition border border-slate-600"
                          >Cargar</button>
                          <button 
                             onClick={() => handleDeleteDeck(sd.id)}
                             className="p-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/60 transition border border-red-900"
                          ><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Mis Packs Disponibles</h2>
                <p className="text-xs text-slate-400 mt-0.5">Selecciona lo que posees para filtrar cartas.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleAllPacks(true)} className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-200 font-bold hover:bg-slate-600">Marcar Todo</button>
                <button onClick={() => toggleAllPacks(false)} className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-200 font-bold hover:bg-slate-600">Desmarcar</button>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {officialPacks.map(pack => {
                const isOwned = !!ownedPacks[pack.code];
                return (
                  <div 
                    key={pack.code}
                    onClick={() => togglePack(pack.code)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700/60 cursor-pointer hover:border-slate-500 transition"
                  >
                    <span className="text-xs font-semibold text-slate-200">{pack.name}</span>
                    <div className="text-emerald-500">
                      {isOwned ? <CheckSquare className="w-5 h-5 fill-emerald-500/20" /> : <Square className="w-5 h-5 text-slate-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [deck, setDeck] = useState(() => {
    const saved = localStorage.getItem('mcpwa_deck');
    return saved ? JSON.parse(saved) : {};
  });
  const [identity, setIdentity] = useState(() => localStorage.getItem('mcpwa_identity') || null);
  
  const [savedDecks, setSavedDecks] = useState(() => {
    const saved = localStorage.getItem('mcpwa_saved_decks');
    return saved ? JSON.parse(saved) : [];
  });

  const [ownedPacks, setOwnedPacks] = useState(() => {
    const saved = localStorage.getItem('mcpwa_owned_packs');
    if (saved) return JSON.parse(saved);
    // Por defecto marcamos core y algunos iniciales como true
    return { core: true, cap: true, thor: true };
  });

  const [filterOwnedOnly, setFilterOwnedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('cards');
  const [modalData, setModalData] = useState(null);
  
  const [dialog, setDialog] = useState(null);
  const [toastMsg, setToastMsg] = useState(null); 

  const showToast = useCallback((message, type = 'info') => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  useEffect(() => {
    localStorage.setItem('mcpwa_deck', JSON.stringify(deck));
    if (identity) localStorage.setItem('mcpwa_identity', identity);
    else localStorage.removeItem('mcpwa_identity');
  }, [deck, identity]);

  useEffect(() => {
    localStorage.setItem('mcpwa_saved_decks', JSON.stringify(savedDecks));
  }, [savedDecks]);

  useEffect(() => {
    localStorage.setItem('mcpwa_owned_packs', JSON.stringify(ownedPacks));
  }, [ownedPacks]);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`${API_BASE}/cards/`);
        if (!res.ok) throw new Error('Error de red al cargar el catálogo de cartas.');
        const data = await res.json();
        setCards(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full bg-slate-900 items-center justify-center text-white flex-col pt-safe">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-red-500 rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(239,68,68,0.4)]"></div>
        <p className="font-bold text-slate-300 tracking-wider uppercase text-xs animate-pulse">Sincronizando con MarvelCDB (ES)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[100dvh] w-full bg-slate-900 items-center justify-center text-white flex-col p-6 text-center pt-safe">
        <AlertCircle className="w-20 h-20 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        <h2 className="text-2xl font-black mb-3">Error de Conexión</h2>
        <p className="text-slate-400 text-sm mb-8 max-w-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-500 px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm transition active:scale-95">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-red-500/30">
      
      {toastMsg && <Toast message={toastMsg.message} type={toastMsg.type} />}
      <CustomDialog dialog={dialog} onClose={() => setDialog(null)} />

      {/* Contenedor Adaptado a iPhone 13 & Móviles */}
      <div className="flex-1 relative overflow-hidden bg-slate-900 mx-auto w-full max-w-md md:max-w-2xl border-x border-slate-800/40">
        {activeTab === 'cards' && (
          <CardsView 
            cards={cards} deck={deck} setDeck={setDeck} openCardModal={setModalData} 
            identity={identity} ownedPacks={ownedPacks} filterOwnedOnly={filterOwnedOnly} setFilterOwnedOnly={setFilterOwnedOnly}
          />
        )}
        {activeTab === 'deck' && (
          <DeckView 
            cards={cards} deck={deck} setDeck={setDeck} 
            identity={identity} setIdentity={setIdentity} 
            openCardModal={setModalData} openDialog={setDialog} showToast={showToast}
          />
        )}
        {activeTab === 'manager' && (
          <DecksManagerView 
            deck={deck} setDeck={setDeck} identity={identity} setIdentity={setIdentity}
            savedDecks={savedDecks} setSavedDecks={setSavedDecks}
            ownedPacks={ownedPacks} setOwnedPacks={setOwnedPacks}
            openDialog={setDialog} showToast={showToast}
          />
        )}
      </div>

      {/* Modal de Carta Detalle */}
      {modalData && (
        <CardModal 
          modalData={modalData} 
          onClose={() => setModalData(null)} 
          deck={deck} 
          setDeck={setDeck} 
          identity={identity}
          setIdentity={setIdentity}
          allCards={cards}
          showToast={showToast}
        />
      )}

      {/* Bottom Nav optimizado para iPhone 13 (SafeArea) */}
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50 pb-safe mx-auto w-full max-w-md md:max-w-2xl">
        <div className="flex justify-around items-center h-[64px] px-2">
          <button 
            onClick={() => setActiveTab('cards')} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'cards' ? 'text-red-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Search className={`w-6 h-6 transition-transform ${activeTab === 'cards' ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Catálogo</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('deck')} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-colors ${activeTab === 'deck' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="relative">
              <Layers className={`w-6 h-6 transition-transform ${activeTab === 'deck' ? 'scale-110' : ''}`} />
              {Object.keys(deck).length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-slate-900 shadow-sm leading-none">
                  {Object.values(deck).reduce((a,b)=>a+b, 0)}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">Mazo</span>
          </button>

          <button 
            onClick={() => setActiveTab('manager')} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'manager' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <FolderOpen className={`w-6 h-6 transition-transform ${activeTab === 'manager' ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Gestión</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        :root { 
          --sat: env(safe-area-inset-top); 
          --sab: env(safe-area-inset-bottom); 
        }
        .pb-safe { padding-bottom: max(var(--sab), 0.75rem); }
        .pt-safe { padding-top: max(var(--sat), 0.5rem); }
        
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideDown { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}} />
    </div>
  );
}