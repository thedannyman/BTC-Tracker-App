import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  mapToCanvas,
  renderChart,
  type ChartPoint,
  type RenderedChartMetrics,
} from './chart/renderers/canvasRenderer';

type PricePoint = {
  timestamp: number;
  price: number;
};

type LiveChartProps = {
  data: PricePoint[];
  height?: number;
};

type HoverState = {
  point: PricePoint;
  screenX: number;
  screenY: number;
} | null;

const DEFAULT_HEIGHT = 280;

export default function LiveChart({ data, height = DEFAULT_HEIGHT }: LiveChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height });
  const [hover, setHover] = useState<HoverState>(null);
  const metricsRef = useRef<RenderedChartMetrics | null>(null);

  const points = useMemo<ChartPoint[]>(
    () => data.map((d) => ({ x: d.timestamp, y: d.price })),
    [data],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setSize({ width: rect.width, height });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    metricsRef.current = renderChart(ctx, {
      width: size.width,
      height: size.height,
      dpr,
      points,
    });
  }, [points, size.height, size.width]);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!metricsRef.current || data.length === 0) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;

      const index = Math.max(
        0,
        Math.min(
          data.length - 1,
          Math.round(((x - metricsRef.current.padding) / metricsRef.current.innerWidth) * (data.length - 1)),
        ),
      );

      const point = data[index];
      if (!point) return;

      const mapped = mapToCanvas({ x: point.timestamp, y: point.price }, metricsRef.current);
      setHover({ point, screenX: mapped.x, screenY: mapped.y });
    },
    [data],
  );

  const onPointerLeave = useCallback(() => setHover(null), []);

  return (
    <section>
      <header style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <strong>BTC Live Chart</strong>
        <div aria-label="Chart Controls">{/* React Controls bleiben hier */}</div>
      </header>

      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: 12,
          overflow: 'hidden',
          background: '#10121a',
        }}
      >
        <canvas ref={canvasRef} />

        <svg
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {hover ? (
            <>
              <line
                x1={hover.screenX}
                y1={0}
                x2={hover.screenX}
                y2={size.height}
                stroke="rgba(255,255,255,0.28)"
                strokeDasharray="4 4"
              />
              <circle cx={hover.screenX} cy={hover.screenY} r={4} fill="#f7931a" />
            </>
          ) : null}
        </svg>

        {hover ? (
          <div
            style={{
              position: 'absolute',
              left: Math.min(Math.max(8, hover.screenX + 12), Math.max(8, size.width - 140)),
              top: Math.max(8, hover.screenY - 44),
              background: 'rgba(12,12,16,0.9)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              padding: '6px 8px',
              fontSize: 12,
              color: '#fff',
              pointerEvents: 'none',
            }}
          >
            <div>${hover.point.price.toFixed(2)}</div>
            <div style={{ opacity: 0.75 }}>{new Date(hover.point.timestamp).toLocaleTimeString()}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
