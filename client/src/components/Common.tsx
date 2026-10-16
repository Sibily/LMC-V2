import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { I } from './Icons';

export const G = '#16a34a';
export const MU = '#475569';
export const BD = '#e6ebe8';

export const R: React.CSSProperties = {
  flexDirection: 'row',
  alignItems: 'center',
};

export const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid ' + BD,
  borderRadius: 18,
  padding: 16,
  boxShadow: '0 1px 2px rgba(16,24,40,.05)',
  display: 'flex',
  flexDirection: 'column',
};

export const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid ' + BD,
  borderRadius: 10,
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

export const pad = (n: number | string) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const add = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const TODAY = add(0);
export const fmt = (s: string) => {
  if (!s) return '';
  return new Date(s + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
export const lbl = (s: string) => (s === TODAY ? 'Today' : s === add(1) ? 'Tomorrow' : fmt(s));
export const t12 = (x?: string | null) => {
  const [a, b] = (x || '09:00').split(':').map(Number);
  return `${a % 12 || 12}:${pad(b)} ${a < 12 ? 'AM' : 'PM'}`;
};
export const ago = (d: string) => {
  const n = Math.round((Date.parse(TODAY) - Date.parse(d)) / 864e5);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
};

export const aed = (n: number | string) =>
  'AED ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const szF = (b: number | string) => {
  const bytes = Number(b) || 0;
  return bytes > 1048576
    ? (bytes / 1048576).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB';
};

export const refLabel = (k: { source?: string; referrer?: string }) => {
  const s0 = k.source || '';
  if (s0 === 'By advisor') return 'By advisor' + (k.referrer ? ' · ' + k.referrer : '');
  if (s0 === 'Other') return k.referrer || 'Other';
  return s0 || '—';
};

export const COL = ['#64748b', '#0ea5e9', '#8b5cf6', '#16a34a', '#14b8a6', '#f59e0b', '#ec4899', '#6366f1', '#22c55e', '#0891b2'];
export const col = (i: number) => COL[i % COL.length];

export const dcol = (x: any, i: number) =>
  x && x.type === 'decision' && x.res ? (x.res === 'yes' ? '#16a34a' : '#ef4444') : (x && x.color) || col(i);

export const scol = (s: any) => {
  if (!s || !s.stages) return '#16a34a';
  const i = Math.max(0, s.stages.findIndex((x: any) => x.id === s.cur));
  return dcol(s.stages[i], i);
};

export const LogoMark: React.FC<{ s?: number }> = ({ s = 32 }) => (
  <svg width={s} height={s} viewBox="22 22 58 58" style={{ flexShrink: 0, display: 'block' }}>
    <g fill="none" stroke="#1fcb66" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M72.3 50V44C72.3 34 65 29 55 29H46C35 29 29.5 36 29.5 45C29.5 52 32 53 31 60L28 69.5L39 64C41 63 42 62.7 44 62.7H51.5" />
      <path d="M38.7 49.5C39 42.5 46.5 42.5 46.8 49.5M53.7 49.5C54 42.5 61.5 42.5 61.8 49.5" />
    </g>
    <path d="M68.5 54.5L57.5 63.7L63 66.2L60.4 74.2L70.6 65.8L65.2 63.6Z" fill="#1fcb66" />
  </svg>
);

export const Logo: React.FC<{ s?: number }> = ({ s = 32 }) => (
  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <LogoMark s={s} />
    <b
      style={{
        fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif',
        fontWeight: 800,
        fontSize: Math.round(s * 0.66),
        letterSpacing: -0.8,
        color: '#0b1b16',
        whiteSpace: 'nowrap',
      }}
    >
      buzzrdesk
    </b>
  </div>
);

export const tcol = (t: string) =>
  ({
    Call: '#0ea5e9',
    Proposal: '#8b5cf6',
    Reminder: '#db2777',
    'Follow-up': '#f59e0b',
    Documents: '#6366f1',
  }[t] || G);

export const STAT: Record<string, string> = {
  'Active Client': '#16a34a',
  'Inactive Client': '#64748b',
  'On Hold': '#f59e0b',
  'Lost Client': '#ef4444',
};

export const AVC = [
  ['#dcfce7', '#166534'],
  ['#dbeafe', '#1e40af'],
  ['#fce7f3', '#9d174d'],
  ['#fef3c7', '#92400e'],
  ['#ede9fe', '#5b21b6'],
];

// Components
export const V: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ style, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }} {...props} />
);

export const P: React.FC<React.HTMLAttributes<HTMLDivElement> & { onPress?: () => void }> = ({
  onPress,
  style,
  onClick,
  ...props
}) => (
  <div
    role="button"
    onClick={(e) => {
      onClick?.(e);
      onPress?.();
    }}
    style={{ display: 'flex', cursor: 'pointer', minWidth: 0, ...style }}
    {...props}
  />
);

export const B: React.FC<React.HTMLAttributes<HTMLDivElement> & { k?: boolean | number; onPress?: () => void }> = ({
  k,
  style,
  ...props
}) => (
  <P
    style={{
      ...R,
      justifyContent: 'center',
      gap: 6,
      padding: '10px 14px',
      borderRadius: 12,
      fontWeight: 600,
      border: k ? '1px solid ' + G : '1px solid ' + BD,
      background: k ? G : '#fff',
      color: k ? '#fff' : '#0f172a',
      whiteSpace: 'nowrap',
      ...style,
    }}
    {...props}
  />
);

export const IB: React.FC<{
  n: string;
  s?: number;
  onPress?: () => void;
  style?: React.CSSProperties;
  title?: string;
}> = ({ n, s: sz, onPress, style, title }) => (
  <P
    title={title}
    onPress={onPress}
    style={{
      width: n === 'eye' ? 30 : 40,
      height: n === 'eye' ? 30 : 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      color: MU,
      flexShrink: 0,
      ...style,
    }}
  >
    <I n={n} s={sz || (n === 'eye' ? 17 : 21)} />
  </P>
);

export const Av: React.FC<{ n: string; s?: number; o?: boolean; url?: string | null }> = ({
  n,
  s = 26,
  o,
  url,
}) => {
  const q = AVC[(n.charCodeAt(0) + n.length) % AVC.length];
  const b: React.CSSProperties = {
    width: s,
    height: s,
    borderRadius: s,
    border: '2px solid #fff',
    marginLeft: o ? -8 : 0,
    flexShrink: 0,
  };

  if (url) {
    return <img src={url} alt={n} title={n} style={{ ...b, objectFit: 'cover' }} />;
  }

  return (
    <div
      title={n}
      style={{
        ...b,
        background: q[0],
        color: q[1],
        fontSize: s / 2.3,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {n[0]?.toUpperCase() || 'U'}
    </div>
  );
};

export const F: React.FC<{ l: string; children: React.ReactNode }> = ({ l, children }) => (
  <V style={{ gap: 5 }}>
    <span style={{ fontSize: 12, color: MU, fontWeight: 600 }}>{l}</span>
    {children}
  </V>
);

export const Modal: React.FC<{
  title: string;
  close: () => void;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ title, close, wide, children }) => {
  const [isWide, setIsWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= 900 : true);

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f172a88',
        display: 'flex',
        alignItems: isWide ? 'center' : 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
        padding: isWide ? 16 : 0,
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: wide ? 860 : 520,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: isWide ? 20 : '22px 22px 0 0',
          boxShadow: '0 20px 48px rgba(15, 23, 42, 0.28)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 10px',
            flexShrink: 0,
            background: '#fff',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <b style={{ fontSize: 16, userSelect: 'none', color: '#0f172a' }}>{title}</b>
          <IB n="x" onPress={close} title="Close (Esc)" />
        </div>
        <div
          data-mbody="1"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '12px 16px calc(16px + env(safe-area-inset-bottom,0px))',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: string;
  title: string;
  desc?: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}> = ({ icon, title, desc, actionLabel, onAction, color = G }) => (
  <V
    style={{
      ...card,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '36px 20px',
      gap: 10,
      background: '#fff',
      border: '1.5px dashed #cbd5e1',
      boxShadow: 'none',
      margin: '8px 0',
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        background: color + '18',
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
      }}
    >
      <I n={icon} s={26} />
    </div>
    <b style={{ fontSize: 16, color: '#0f172a' }}>{title}</b>
    {desc && <span style={{ fontSize: 13, color: MU, maxWidth: 360, lineHeight: 1.45 }}>{desc}</span>}
    {actionLabel && onAction && (
      <B k={1} onPress={onAction} style={{ marginTop: 6, padding: '8px 18px', fontSize: 13 }}>
        {actionLabel}
      </B>
    )}
  </V>
);

export const Sel: React.FC<{
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  placeholder?: string;
}> = ({ value, onChange, children, style, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<any>(null);
  const ref = useRef<HTMLButtonElement>(null);

  const opts = React.Children.toArray(children)
    .filter((el): el is React.ReactElement<{ value?: any; children?: React.ReactNode }> => React.isValidElement(el) && el.type === 'option')
    .map((el) => ({
      v: String(el.props.value !== undefined ? el.props.value : el.props.children),
      l: String(el.props.children),
    }));

  const cur = opts.find((o) => o.v === String(value ?? ''));

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const w = Math.min(Math.max(r.width, 190), vw - 16);
      const left = Math.max(8, Math.min(r.left, vw - w - 8));
      const below = vh - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 220 && above > below;
      const mh = Math.max(140, Math.min(300, up ? above : below));
      setPos({
        left,
        w,
        mh,
        top: up ? undefined : r.bottom + 6,
        bottom: up ? vh - r.top + 6 : undefined,
      });
    }
    setOpen(!open);
  };

  const pick = (v: string) => {
    setOpen(false);
    onChange?.({ target: { value: v } });
  };

  const st = style || {};

  return (
    <div style={{ position: 'relative', minWidth: 0, width: st.width || '100%', flexShrink: st.flexShrink }}>
      <button
        type="button"
        ref={ref}
        onClick={toggle}
        style={{
          ...st,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          textAlign: 'left',
          cursor: 'pointer',
          boxSizing: 'border-box',
          font: 'inherit',
          minHeight: 44,
          color: cur && cur.v !== '' ? '#0f172a' : '#94a3b8',
          borderColor: open ? '#16a34a' : st.borderColor || undefined,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cur ? cur.l || placeholder || 'Select' : placeholder || 'Select'}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && pos && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 94 }} />
          <div
            style={{
              position: 'fixed',
              left: pos.left,
              width: pos.w,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.mh,
              overflowY: 'auto',
              background: '#fff',
              border: '1px solid ' + BD,
              borderRadius: 14,
              boxShadow: '0 12px 32px #0f172a33',
              zIndex: 95,
              overscrollBehavior: 'contain',
            }}
          >
            {opts.map((o) => {
              const on = cur && cur.v === o.v;
              return (
                <button
                  type="button"
                  key={o.v}
                  onClick={() => pick(o.v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    width: '100%',
                    padding: '13px 14px',
                    border: 0,
                    borderBottom: '1px solid #f1f5f9',
                    background: on ? '#f0fdf4' : '#fff',
                    color: on ? '#15803d' : '#0f172a',
                    fontWeight: on ? 700 : 500,
                    textAlign: 'left',
                    font: 'inherit',
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  <span>{o.l || '—'}</span>
                  {on && <I n="tick" s={16} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Interactive Pipeline Stepper
export const Pipe: React.FC<{
  st: any[];
  cur: string;
  pick?: (s: any) => void;
}> = ({ st, cur, pick }) => {
  const [cols, setCols] = useState(typeof window !== 'undefined' && window.innerWidth >= 700 ? 6 : 4);

  useEffect(() => {
    const handleResize = () => setCols(window.innerWidth >= 700 ? 6 : 4);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ci = st.findIndex((x) => x.id === cur);
  const PAD = 0;
  const GR = '#d5dde6';
  const rows: any[][] = [];
  for (let i = 0; i < st.length; i += cols) rows.push(st.slice(i, i + cols));

  const eff = (s: any, i: number) => (s.type === 'decision' ? s.res || (i < ci ? 'yes' : '') : '');
  const colr = (s: any, i: number) =>
    s.type === 'decision'
      ? eff(s, i) === 'yes'
        ? '#16a34a'
        : eff(s, i) === 'no'
        ? '#ef4444'
        : s.color || col(i)
      : s.color || col(i);

  const cs = st[ci];
  const dead = !!cs && eff(cs, ci) === 'no';

  const chev = (c: string, flip?: boolean, sx?: React.CSSProperties) => (
    <svg
      width="7"
      height="10"
      viewBox="0 0 7 10"
      style={{ flexShrink: 0, display: 'block', transform: flip ? 'scaleX(-1)' : 'none', ...(sx || {}) }}
    >
      <path
        d="M1.5 1.5L5 5L1.5 8.5"
        fill="none"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const node = (s: any, i: number) => {
    const isD = s.type === 'decision';
    const r = eff(s, i);
    const c = colr(s, i);
    const cur2 = i === ci;
    const stageTooltip = s.name + (cur2 ? ' · Current Active Stage' : i < ci ? ' · Completed Stage' : ' · Upcoming Stage');

    if (isD && !r)
      return (
        <div
          title={stageTooltip + ' (Decision Required)'}
          style={{
            position: 'relative',
            zIndex: 1,
            width: 30,
            height: 30,
            boxSizing: 'border-box',
            borderRadius: 8,
            border: '2px dashed ' + (cur2 ? c : c + '99'),
            background: cur2 ? c + '14' : '#fff',
            color: c,
            boxShadow: cur2 ? '0 0 0 4px ' + c + '33, 0 2px 10px ' + c + '40' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <I n="plus" s={15} />
        </div>
      );
    const on = i <= ci || (isD && !!r);
    return (
      <div
        title={stageTooltip + ' · Click to update'}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 30,
          height: 30,
          boxSizing: 'border-box',
          borderRadius: '50%',
          background: on ? c : c + '14',
          border: '2px solid ' + (on ? c : c + '73'),
          boxShadow: cur2 ? '0 0 0 5px ' + c + '33, 0 3px 12px ' + c + '55' : 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {isD ? (
          r ? (
            <I n={r === 'no' ? 'x' : 'tick'} s={15} />
          ) : null
        ) : i < ci || (i === ci && i === st.length - 1) ? (
          <I n="tick" s={15} />
        ) : null}
      </div>
    );
  };

  return (
    <V style={{ padding: '0 ' + PAD + 'px' }}>
      {rows.map((r, ri) => {
        const rtl = ri % 2 === 1;
        const last = ri === rows.length - 1;
        const fi = ri * cols;
        const lastS = r[r.length - 1];
        const ec = fi + r.length - 1 < ci ? colr(lastS, fi + r.length - 1) : GR;
        const pct = 100 - 50 / cols;
        const L_pct = 'calc(' + pct + '% + 20px)';
        return (
          <div key={ri} style={{ position: 'relative', paddingBottom: last ? 0 : 32 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: rtl ? 'row-reverse' : 'row',
                position: 'relative',
                alignItems: 'flex-start',
              }}
            >
              {r.map((s, p) => {
                const i = fi + p;
                const hasNext = p < r.length - 1;
                const lc = i < ci ? colr(s, i) : GR;
                const e = eff(s, i);
                const isD = s.type === 'decision';
                const label = isD ? (e === 'yes' ? s.yes : e === 'no' ? s.no : s.yes + ' / ' + s.no) : s.name;
                return (
                  <P
                    key={s.id}
                    onPress={() => pick && pick(s)}
                    style={{
                      flex: '0 0 ' + 100 / cols + '%',
                      minWidth: 0,
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      padding: 0,
                      background: 'transparent',
                      opacity: dead && i > ci ? 0.5 : 1,
                    }}
                  >
                    {node(s, i)}
                    {hasNext && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: 9,
                          height: 10,
                          width: 'calc(100% - 40px)',
                          ...(rtl ? { right: 'calc(50% + 20px)' } : { left: 'calc(50% + 20px)' }),
                          display: 'flex',
                          flexDirection: rtl ? 'row-reverse' : 'row',
                          alignItems: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ flex: 1, height: 1.5, borderRadius: 2, background: lc }}></div>
                        {chev(lc, rtl, { ...(rtl ? { marginRight: -6 } : { marginLeft: -6 }) })}
                      </div>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        textAlign: 'center',
                        marginTop: 6,
                        padding: '0 2px',
                        fontWeight: i === ci ? 700 : 500,
                        color: i === ci ? '#0f172a' : MU,
                        lineHeight: 1.25,
                      }}
                    >
                      {label}
                    </span>
                  </P>
                );
              })}
            </div>
            {!last && (
              <>
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 13,
                    bottom: -15,
                    pointerEvents: 'none',
                    borderTop: '1.5px solid ' + ec,
                    borderBottom: '1.5px solid ' + ec,
                    ...(rtl
                      ? {
                          right: L_pct,
                          left: -8,
                          borderLeft: '1.5px solid ' + ec,
                          borderTopLeftRadius: 12,
                          borderBottomLeftRadius: 12,
                        }
                      : {
                          left: L_pct,
                          right: -8,
                          borderRight: '1.5px solid ' + ec,
                          borderTopRightRadius: 12,
                          borderBottomRightRadius: 12,
                        }),
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: -19,
                    ...(rtl ? { right: 'calc(' + pct + '% + 18px)' } : { left: 'calc(' + pct + '% + 18px)' }),
                    display: 'flex',
                    pointerEvents: 'none',
                  }}
                >
                  {chev(ec, !rtl)}
                </div>
              </>
            )}
          </div>
        );
      })}
    </V>
  );
};

// Celebration Milestone Confetti & Dialog
export function celebrate(title: string, sub: string) {
  try {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.35);opacity:0;transition:opacity .25s;padding:24px;cursor:pointer';

    const card = document.createElement('div');
    card.style.cssText =
      'position:relative;background:#fff;border-radius:24px;padding:28px 24px 22px;text-align:center;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);transform:scale(.8);transition:transform .4s cubic-bezier(.2,1.4,.4,1)';
    card.innerHTML =
      '<div style="font-size:54px;line-height:1">&#127881;</div><div style="font-size:22px;font-weight:800;margin-top:10px;color:#0f172a"></div><div style="font-size:14px;color:#475569;margin-top:6px;line-height:1.45"></div><div style="margin-top:18px;display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:10px 26px;border-radius:12px">Done</div>';
    card.children[1].textContent = title;
    card.children[2].textContent = sub;
    root.appendChild(card);
    document.body.appendChild(root);

    requestAnimationFrame(() => {
      root.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });

    const close = () => {
      root.style.opacity = '0';
      setTimeout(() => root.remove(), 260);
    };
    root.addEventListener('click', close);
    setTimeout(close, 6000);
  } catch (e) {}
}
