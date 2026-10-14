import React, { useState } from 'react';
import { P, G, MU, BD, TODAY, add } from './Common';
import { I } from './Icons';

export interface DateScrubberProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  hasItemsOnDate?: (date: string) => boolean;
  itemDotColor?: string;
}

export const DateScrubber: React.FC<DateScrubberProps> = ({
  selectedDate,
  onSelectDate,
  hasItemsOnDate,
  itemDotColor = '#15803d',
}) => {
  const [dayOffset, setDayOffset] = useState(0);

  // 14 days window based on dayOffset
  const dates = Array.from({ length: 14 }, (_, i) => add(i - 3 + dayOffset));

  const firstDate = new Date(dates[0] + 'T00:00');
  const lastDate = new Date(dates[dates.length - 1] + 'T00:00');

  const formatMonthYear = () => {
    const m1 = firstDate.toLocaleDateString('en-US', { month: 'short' });
    const m2 = lastDate.toLocaleDateString('en-US', { month: 'short' });
    const y1 = firstDate.getFullYear();
    const y2 = lastDate.getFullYear();

    if (y1 === y2) {
      if (m1 === m2) {
        return firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      return `${m1} – ${m2} ${y1}`;
    }
    return `${m1} ${y1} – ${m2} ${y2}`;
  };

  const handlePrevWeek = () => {
    setDayOffset((prev) => prev - 7);
  };

  const handleNextWeek = () => {
    setDayOffset((prev) => prev + 7);
  };

  const handleResetToday = () => {
    setDayOffset(0);
    onSelectDate(TODAY);
  };

  const isAwayFromToday = dayOffset !== 0 || (selectedDate && selectedDate !== TODAY);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {/* Header with Month/Year and Today Reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <b style={{ fontSize: 13.5, color: '#334155', fontWeight: 700, letterSpacing: -0.2 }}>
            {formatMonthYear()}
          </b>
          {dayOffset !== 0 && (
            <span
              style={{
                fontSize: 11,
                color: MU,
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              {dayOffset > 0 ? `+${Math.round(dayOffset / 7)}w` : `${Math.round(dayOffset / 7)}w`}
            </span>
          )}
        </div>

        {isAwayFromToday && (
          <button
            onClick={handleResetToday}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#15803d',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>↺ Today</span>
          </button>
        )}
      </div>

      {/* Date Carousel with Left and Right Arrows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
        <button
          onClick={handlePrevWeek}
          title="Previous 7 days"
          aria-label="Previous 7 days"
          style={{
            width: 32,
            height: 40,
            borderRadius: 10,
            border: '1px solid ' + BD,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#475569',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = G;
            e.currentTarget.style.color = G;
            e.currentTarget.style.background = '#f0fdf4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BD;
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.background = '#fff';
          }}
        >
          <I n="back" s={16} />
        </button>

        {/* Scrubber pills */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            flex: 1,
            scrollbarWidth: 'none',
          }}
        >
          {dates.map((d) => {
            const on = selectedDate === d;
            const isToday = d === TODAY;
            const dt = new Date(d + 'T00:00');
            const hasItems = hasItemsOnDate ? hasItemsOnDate(d) : false;

            return (
              <P
                key={d}
                onPress={() => onSelectDate(on ? '' : d)}
                style={{
                  flex: '1 1 0px',
                  minWidth: 46,
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '7px 4px 6px',
                  borderRadius: 14,
                  background: on ? G : '#fff',
                  border: '1px solid ' + (on ? G : isToday ? '#86efac' : BD),
                  color: on ? '#fff' : '#0f172a',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: on ? '0 2px 8px rgba(31,203,102,0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    opacity: on ? 0.9 : 0.65,
                    textTransform: 'uppercase',
                    letterSpacing: 0.2,
                  }}
                >
                  {dt.toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
                <b style={{ fontSize: 16, lineHeight: '18px' }}>{dt.getDate()}</b>
                {hasItems ? (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      background: on ? '#fff' : itemDotColor,
                      marginTop: 1,
                    }}
                  />
                ) : (
                  <span style={{ width: 5, height: 5, marginTop: 1 }} />
                )}
              </P>
            );
          })}
        </div>

        <button
          onClick={handleNextWeek}
          title="Next 7 days"
          aria-label="Next 7 days"
          style={{
            width: 32,
            height: 40,
            borderRadius: 10,
            border: '1px solid ' + BD,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#475569',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = G;
            e.currentTarget.style.color = G;
            e.currentTarget.style.background = '#f0fdf4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BD;
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.background = '#fff';
          }}
        >
          <div style={{ transform: 'rotate(180deg)', display: 'flex' }}>
            <I n="back" s={16} />
          </div>
        </button>
      </div>
    </div>
  );
};
