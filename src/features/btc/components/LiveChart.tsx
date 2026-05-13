import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type TimeRange = '1D' | '7D' | '30D' | '1Y' | 'ALL';

interface PricePoint {
  timestamp: number;
  price: number;
}

interface LiveChartProps {
  data: PricePoint[];
  width?: number;
  height?: number;
  className?: string;
}

const TIME_RANGE_CONFIG: Record<TimeRange, number> = {
  '1D': 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
  '30D': 30 * 24 * 60 * 60 * 1000,
  '1Y': 365 * 24 * 60 * 60 * 1000,
  ALL: Number.POSITIVE_INFINITY,
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1D': '1T',
  '7D': '7T',
  '30D': '30T',
  '1Y': '1J',
  ALL: 'Alle',
};

const PADDING = { top: 18, right: 70, bottom: 26, left: 14 };
const MIN_VISIBLE_POINTS = 60;
const MAX_WINDOW_POINTS = 1200;
const GRID_LINES = 4;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const downsampleMinMax = (points: PricePoint[], target: number): PricePoint[] => {
  if (points.length <= target || target <= 0) return points;
  const bucketSize = points.length / target;
  const result: PricePoint[] = [];

  for (let i = 0; i < target; i += 1) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(points.length, Math.floor((i + 1) * bucketSize));
    if (start >= end) continue;

    let minIdx = start;
    let maxIdx = start;
    for (let j = start + 1; j < end; j += 1) {
      if (points[j].price < points[minIdx].price) minIdx = j;
      if (points[j].price > points[maxIdx].price) maxIdx = j;
    }

    if (minIdx < maxIdx) {
      result.push(points[minIdx], points[maxIdx]);
    } else if (maxIdx < minIdx) {
      result.push(points[maxIdx], points[minIdx]);
    } else {
      result.push(points[minIdx]);
    }
  }

  return result;
};

const LiveChart = memo(function LiveChart({
  data,
  width = 960,
  height = 380,
  className,
}: LiveChartProps) {
  const [range, setRange] = useState<TimeRange>('1D');
  const [zoom, setZoom] = useState(1);
  const [panRatio, setPanRatio] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const rafRef = useRef<number | null>(null);
  const interactionRef = useRef<{ active: boolean; startX: number; startPan: number }>({
    active: false,
    startX: 0,
    startPan: 0,
  });

  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const filteredByRange = useMemo(() => {
    if (!data.length) return [];
    if (range === 'ALL') return data;

    const latestTs = data[data.length - 1].timestamp;
    const cutoff = latestTs - TIME_RANGE_CONFIG[range];
    const startIndex = data.findIndex((point) => point.timestamp >= cutoff);
    return startIndex >= 0 ? data.slice(startIndex) : [data[data.length - 1]];
  }, [data, range]);

  const zoomWindow = useMemo(() => {
    if (!filteredByRange.length) return { start: 0, end: 0 };

    const total = filteredByRange.length;
    const visibleCount = Math.max(MIN_VISIBLE_POINTS, Math.floor(total / zoom));
    const maxStart = Math.max(0, total - visibleCount);
    const start = clamp(Math.floor(panRatio * maxStart), 0, maxStart);
    const end = Math.min(total, start + visibleCount);
    return { start, end };
  }, [filteredByRange, panRatio, zoom]);

  const visibleData = useMemo(() => {
    const windowed = filteredByRange.slice(zoomWindow.start, zoomWindow.end);
    return downsampleMinMax(windowed, MAX_WINDOW_POINTS);
  }, [filteredByRange, zoomWindow]);

  const [minPrice, maxPrice] = useMemo(() => {
    if (!visibleData.length) return [0, 1];
    let min = visibleData[0].price;
    let max = visibleData[0].price;

    for (let i = 1; i < visibleData.length; i += 1) {
      const value = visibleData[i].price;
      if (value < min) min = value;
      if (value > max) max = value;
    }

    if (min === max) {
      const offset = min * 0.01 || 1;
      return [min - offset, max + offset];
    }

    const pad = (max - min) * 0.08;
    return [min - pad, max + pad];
  }, [visibleData]);

  const mapX = useCallback(
    (index: number) => {
      if (visibleData.length <= 1) return PADDING.left;
      return PADDING.left + (index / (visibleData.length - 1)) * innerWidth;
    },
    [innerWidth, visibleData.length],
  );

  const mapY = useCallback(
    (price: number) => PADDING.top + ((maxPrice - price) / (maxPrice - minPrice)) * innerHeight,
    [innerHeight, maxPrice, minPrice],
  );

  const path = useMemo(() => {
    if (!visibleData.length) return '';
    return visibleData
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${mapX(index)} ${mapY(point.price)}`)
      .join(' ');
  }, [mapX, mapY, visibleData]);

  const lastPoint = visibleData[visibleData.length - 1];
  const lastPriceY = lastPoint ? mapY(lastPoint.price) : PADDING.top;

  const hoverDetails = useMemo(() => {
    if (hoverX == null || !visibleData.length) return null;
    const normalized = clamp((hoverX - PADDING.left) / innerWidth, 0, 1);
    const idx = Math.round(normalized * (visibleData.length - 1));
    const point = visibleData[idx];
    return {
      idx,
      x: mapX(idx),
      y: mapY(point.price),
      point,
    };
  }, [hoverX, innerWidth, mapX, mapY, visibleData]);

  const runInFrame = useCallback((action: () => void) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(action);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPanRatio(0);
  }, []);

  const onWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      runInFrame(() => {
        setZoom((z) => clamp(z * delta, 1, 30));
      });
    },
    [runInFrame],
  );

  const onPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    interactionRef.current = { active: true, startX: event.clientX, startPan: panRatio };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [panRatio]);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const { active, startX, startPan } = interactionRef.current;
      if (active) {
        const dx = event.clientX - startX;
        const shiftRatio = dx / Math.max(innerWidth, 1);
        runInFrame(() => {
          setPanRatio(clamp(startPan - shiftRatio, 0, 1));
        });
        return;
      }
      runInFrame(() => setHoverX(event.nativeEvent.offsetX));
    },
    [innerWidth, runInFrame],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    interactionRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    setPanRatio(0);
  }, [range]);

  return (
    <div className={className} style={{ width, userSelect: 'none', touchAction: 'none' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setRange(key);
              resetView();
            }}
            style={{
              borderRadius: 20,
              border: '1px solid #2d3545',
              padding: '6px 12px',
              background: range === key ? '#1f9d55' : '#151b28',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {TIME_RANGE_LABELS[key]}
          </button>
        ))}
        <button
          type="button"
          onClick={resetView}
          style={{ marginLeft: 'auto', borderRadius: 20, padding: '6px 12px', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      <svg
        width={width}
        height={height}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHoverX(null)}
      >
        <rect x={0} y={0} width={width} height={height} fill="#0c111d" rx={12} />

        {Array.from({ length: GRID_LINES + 1 }).map((_, i) => {
          const y = PADDING.top + (innerHeight / GRID_LINES) * i;
          return <line key={i} x1={PADDING.left} x2={width - PADDING.right} y1={y} y2={y} stroke="#1f2937" />;
        })}

        <path d={path} fill="none" stroke="#38bdf8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        <line
          x1={PADDING.left}
          x2={width - PADDING.right}
          y1={lastPriceY}
          y2={lastPriceY}
          stroke="#2563eb"
          strokeDasharray="3 3"
        />

        <rect
          x={width - PADDING.right + 4}
          y={lastPriceY - 11}
          width={62}
          height={22}
          rx={10}
          fill="#1d4ed8"
        />
        <text x={width - PADDING.right + 35} y={lastPriceY + 5} textAnchor="middle" fill="#fff" fontSize={12}>
          {lastPoint?.price.toFixed(2) ?? '--'}
        </text>

        {hoverDetails && (
          <>
            <line
              x1={hoverDetails.x}
              x2={hoverDetails.x}
              y1={PADDING.top}
              y2={height - PADDING.bottom}
              stroke="#64748b"
              strokeDasharray="4 4"
            />
            <circle cx={hoverDetails.x} cy={hoverDetails.y} r={4} fill="#22d3ee" stroke="#0f172a" strokeWidth={2} />
            <rect x={PADDING.left + 8} y={PADDING.top + 8} width={220} height={52} fill="#020617d9" rx={8} />
            <text x={PADDING.left + 16} y={PADDING.top + 30} fill="#f8fafc" fontSize={13}>
              {new Date(hoverDetails.point.timestamp).toLocaleString()}
            </text>
            <text x={PADDING.left + 16} y={PADDING.top + 48} fill="#7dd3fc" fontSize={13}>
              ${hoverDetails.point.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </text>
          </>
        )}
      </svg>
    </div>
  );
});

export default LiveChart;
export type { LiveChartProps, PricePoint, TimeRange };
