export type ChartPoint = {
  x: number;
  y: number;
};

export type CanvasRendererOptions = {
  width: number;
  height: number;
  dpr: number;
  lineColor?: string;
  areaColor?: string;
  gridColor?: string;
  gridRows?: number;
  gridCols?: number;
  lineWidth?: number;
  padding?: number;
  points: ChartPoint[];
};

export type RenderedChartMetrics = {
  innerWidth: number;
  innerHeight: number;
  padding: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const DEFAULTS = {
  lineColor: '#f7931a',
  areaColor: 'rgba(247, 147, 26, 0.18)',
  gridColor: 'rgba(255,255,255,0.12)',
  gridRows: 4,
  gridCols: 6,
  lineWidth: 2,
  padding: 16,
};

function extents(points: ChartPoint[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function safeRange(min: number, max: number) {
  if (Number.isFinite(min) && Number.isFinite(max) && min !== max) {
    return [min, max] as const;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1] as const;
  }

  return [min - 1, max + 1] as const;
}

export function mapToCanvas(
  point: ChartPoint,
  metrics: RenderedChartMetrics,
): ChartPoint {
  const xRange = metrics.maxX - metrics.minX;
  const yRange = metrics.maxY - metrics.minY;

  const x =
    metrics.padding + ((point.x - metrics.minX) / xRange) * metrics.innerWidth;
  const y =
    metrics.padding +
    metrics.innerHeight -
    ((point.y - metrics.minY) / yRange) * metrics.innerHeight;

  return { x, y };
}

export function renderChart(
  ctx: CanvasRenderingContext2D,
  options: CanvasRendererOptions,
): RenderedChartMetrics {
  const {
    width,
    height,
    dpr,
    points,
    lineColor = DEFAULTS.lineColor,
    areaColor = DEFAULTS.areaColor,
    gridColor = DEFAULTS.gridColor,
    gridRows = DEFAULTS.gridRows,
    gridCols = DEFAULTS.gridCols,
    lineWidth = DEFAULTS.lineWidth,
    padding = DEFAULTS.padding,
  } = options;

  const innerWidth = Math.max(0, width - 2 * padding);
  const innerHeight = Math.max(0, height - 2 * padding);

  const rawExtents = points.length > 0 ? extents(points) : { minX: 0, maxX: 1, minY: 0, maxY: 1 };

  const [minX, maxX] = safeRange(rawExtents.minX, rawExtents.maxX);
  const [minY, maxY] = safeRange(rawExtents.minY, rawExtents.maxY);

  const metrics: RenderedChartMetrics = {
    innerWidth,
    innerHeight,
    padding,
    minX,
    maxX,
    minY,
    maxY,
  };

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  for (let i = 0; i <= gridRows; i += 1) {
    const y = padding + (i / gridRows) * innerHeight;
    ctx.beginPath();
    ctx.moveTo(padding, y + 0.5);
    ctx.lineTo(width - padding, y + 0.5);
    ctx.stroke();
  }

  for (let i = 0; i <= gridCols; i += 1) {
    const x = padding + (i / gridCols) * innerWidth;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, padding);
    ctx.lineTo(x + 0.5, height - padding);
    ctx.stroke();
  }

  if (points.length > 0) {
    const mapped = points.map((p) => mapToCanvas(p, metrics));

    ctx.beginPath();
    mapped.forEach((p, idx) => {
      if (idx === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    const first = mapped[0];
    const last = mapped[mapped.length - 1];

    ctx.beginPath();
    ctx.moveTo(first.x, height - padding);
    mapped.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(last.x, height - padding);
    ctx.closePath();
    ctx.fillStyle = areaColor;
    ctx.fill();
  }

  ctx.restore();

  return metrics;
}
