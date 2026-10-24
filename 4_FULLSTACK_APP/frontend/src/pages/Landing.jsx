import React from 'react';
import {
  ArrowRight,
  Box,
  ChartNoAxesColumnIncreasing,
  Database,
  GitBranch,
  UserRound,
} from 'lucide-react';
import './Landing.css';

const sourceFields = ['Subscription', 'Billing', 'Services', 'Support', 'Contract', 'Usage'];

const stages = [
  {
    name: 'Engaged customers',
    detail: 'Stable behaviour and consistent usage.',
    tone: 'dark',
    className: 'stage-engaged',
  },
  {
    name: 'Early signals',
    detail: 'Changes in usage, billing or service patterns.',
    tone: 'accent',
    className: 'stage-signals',
  },
  {
    name: 'At risk',
    detail: 'Behaviour begins to deviate from the norm.',
    tone: 'accent',
    className: 'stage-risk',
  },
  {
    name: 'Churned',
    detail: 'The customer stops the subscription.',
    tone: 'muted',
    className: 'stage-churned',
  },
];

const steps = [
  {
    number: '01',
    title: 'Data Engineering',
    description: 'Prepare and organise customer data from subscription, service and billing records.',
    Icon: Database,
  },
  {
    number: '02',
    title: 'Analytical Warehousing',
    description: 'Structure data using a Star Schema and analyse customer behaviour through multidimensional queries.',
    Icon: Box,
  },
  {
    number: '03',
    title: 'Predictive Mining',
    description: 'Estimate churn risk with Random Forest classification and discover customer segments using K-Means clustering.',
    Icon: GitBranch,
  },
  {
    number: '04',
    title: 'Actionable Insights',
    description: 'Explore predictions, customer segments and model performance.',
    Icon: ChartNoAxesColumnIncreasing,
  },
  {
    number: '05',
    title: 'Better Retention',
    description: 'Use a clearer view of customer behaviour to support retention decisions.',
    Icon: UserRound,
  },
];

const flowSegments = [
  { start: [22, 72], control1: [190, 76], control2: [280, 179], end: [430, 248] },
  { start: [430, 248], control1: [552, 316], control2: [690, 370], end: [812, 386] },
  { start: [812, 386], control1: [878, 397], control2: [940, 394], end: [982, 386] },
];

function pointOnFlow(progress) {
  const position = Math.max(0, Math.min(0.999999, progress)) * flowSegments.length;
  const segmentIndex = Math.min(flowSegments.length - 1, Math.floor(position));
  const t = position - segmentIndex;
  const { start, control1, control2, end } = flowSegments[segmentIndex];
  const inverse = 1 - t;
  const coordinate = (axis) => (
    inverse ** 3 * start[axis]
    + 3 * inverse ** 2 * t * control1[axis]
    + 3 * inverse * t ** 2 * control2[axis]
    + t ** 3 * end[axis]
  );
  return { x: coordinate(0), y: coordinate(1) };
}

const mainFlowPath = flowSegments.map((segment, index) => (
  `${index === 0 ? `M ${segment.start.join(' ')}` : ''} C ${segment.control1.join(' ')} ${segment.control2.join(' ')} ${segment.end.join(' ')}`
)).join(' ');

const graphPaths = Array.from({ length: 25 }, (_, index) => {
  const lane = index - 12;
  const bend = Math.sin(index * 1.37) * 10;
  const settle = Math.cos(index * 0.81) * 8;
  const startX = 18 + (index * 17) % 38;
  const middleY = 248 + lane * 3.5;
  const lateY = 386 + lane * 1.2;
  const endX = 947 + (index * 13) % 53;
  const isStrong = index === 5 || index === 18;
  const isWarm = isStrong || index % 4 === 1;
  return {
    key: index,
    d: `M ${startX} ${72 + lane * 4.1} C ${178 + (index % 5) * 11} ${78 + lane * 3.1 + bend * 0.25} ${285 + (index % 4) * 8} ${178 + lane * 3.4 + bend} 430 ${middleY} C ${545 + (index % 6) * 8} ${315 + lane * 2.8 + bend * 0.5} ${696 + (index % 5) * 7} ${370 + lane * 1.8 + settle} 812 ${lateY} C ${867 + (index % 4) * 9} ${397 + lane * 0.8 + settle * 0.45} ${922 + (index % 5) * 8} ${394 + lane * 0.4 + bend * 0.2} ${endX} ${386 + lane * 0.25}`,
    stroke: isWarm ? "var(--color-pink-hover)" : index % 3 === 0 ? "var(--border-subtle)" : "var(--graph-neutral)",
    opacity: isStrong ? 0.38 : isWarm ? 0.17 : 0.105,
    width: isStrong ? 1.05 : 0.65 + (index % 3) * 0.08,
    dotted: index === 2 || index === 13 || index === 22,
  };
});

function flowSignal(progress, distance, side, key, clustered = false) {
  const point = pointOnFlow(progress);
  const before = pointOnFlow(Math.max(0, progress - 0.003));
  const after = pointOnFlow(Math.min(0.999, progress + 0.003));
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    key,
    cx: Math.max(8, Math.min(992, point.x - (dy / length) * distance * side)),
    cy: Math.max(14, Math.min(546, point.y + (dx / length) * distance * side)),
    r: key % 19 === 0 ? 2.45 : key % 4 === 0 ? 1.65 : 0.95 + (key % 3) * 0.12,
    fill: key % 11 === 0 ? "var(--color-pink)" : key % 7 === 0 ? "var(--color-pink-soft)" : key % 3 === 0 ? "var(--graph-neutral)" : "var(--color-charcoal)",
    opacity: clustered ? (key % 5 === 0 ? 0.72 : 0.48) : (key % 6 === 0 ? 0.76 : 0.43),
  };
}

// A light distribution along the whole curve, with denser deterministic clouds at each stage.
const backgroundDots = Array.from({ length: 132 }, (_, index) => {
  const progress = 0.018 + (((index * 89) % 137) / 136) * 0.96;
  const spread = index % 13 === 0 ? 80 : index % 5 === 0 ? 50 : 12 + (index % 5) * 8;
  return flowSignal(progress, spread + Math.sin(index * 1.73) * 8, index % 2 === 0 ? 1 : -1, index);
});
const stageProgress = [0.16, 0.42, 0.69, 0.91];
const clusterDots = stageProgress.flatMap((center, stageIndex) => Array.from({ length: 34 }, (_, pointIndex) => {
  const key = 200 + stageIndex * 34 + pointIndex;
  const progress = Math.max(0.01, Math.min(0.99, center + Math.sin((pointIndex + 2) * (stageIndex + 1.7)) * 0.035));
  const distance = 7 + ((pointIndex * 17 + stageIndex * 9) % 43) + Math.sin(pointIndex * 1.9) * 5;
  const side = (pointIndex + stageIndex) % 2 === 0 ? 1 : -1;
  return flowSignal(progress, distance, side, key, true);
}));
const graphDots = [...backgroundDots, ...clusterDots];

// Branches lift away from the journey and curl back into it, adding occasional signal paths.
const branchPaths = [
  { from: 0.08, to: 0.23, side: -1, lift: 62 },
  { from: 0.20, to: 0.36, side: 1, lift: 54 },
  { from: 0.34, to: 0.50, side: -1, lift: 70 },
  { from: 0.48, to: 0.62, side: 1, lift: 48 },
  { from: 0.61, to: 0.76, side: -1, lift: 58 },
  { from: 0.74, to: 0.88, side: 1, lift: 50 },
].map(({ from, to, side, lift }, index) => {
  const start = pointOnFlow(from);
  const end = pointOnFlow(to);
  const middle = pointOnFlow((from + to) / 2);
  const before = pointOnFlow((from + to) / 2 - 0.01);
  const after = pointOnFlow((from + to) / 2 + 0.01);
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  const x = middle.x - (dy / length) * lift * side;
  const y = middle.y + (dx / length) * lift * side;
  return {
    key: index,
    d: `M ${start.x} ${start.y} C ${start.x + 36} ${start.y + (y - start.y) * 0.24} ${x - 42} ${y} ${x} ${y} C ${x + 40} ${y} ${end.x - 36} ${end.y - (y - end.y) * 0.24} ${end.x} ${end.y}`,
    dotted: index === 1 || index === 4,
    tone: index % 2 === 0 ? "var(--color-pink-hover)" : "var(--graph-neutral)",
  };
});

const coordinateClusters = [
  { x: 172, y: 96 },
  { x: 602, y: 166 },
  { x: 918, y: 486 },
];

const graphStems = Array.from({ length: 22 }, (_, index) => {
  const progress = 0.055 + ((index * 31) % 84) / 100;
  const point = pointOnFlow(progress);
  const before = pointOnFlow(Math.max(0, progress - 0.003));
  const after = pointOnFlow(Math.min(0.999, progress + 0.003));
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  const side = index % 2 === 0 ? 1 : -1;
  const distance = 14 + (index % 4) * 8;
  return {
    key: index,
    x1: point.x,
    y1: point.y,
    x2: point.x - (dy / length) * distance * side,
    y2: point.y + (dx / length) * distance * side,
    tone: index % 4 === 0 ? "var(--color-pink)" : "var(--graph-neutral)",
  };
});

const journeyNodes = [0.16, 0.42, 0.69, 0.91].map((progress, index) => ({
  ...pointOnFlow(progress),
  r: index === 1 || index === 2 ? 8 : 7,
  color: index === 3 ? "var(--graph-neutral)" : "var(--color-pink)",
}));

function DataFlowGraphic() {
  return (
    <div className="landing-visual" aria-label="Abstract customer behaviour flow from engaged to at-risk and churned">
      <div className="visual-grid" aria-hidden="true" />
      <svg className="flow-svg" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {coordinateClusters.map((cluster, clusterIndex) => (
          <g key={`coordinates-${clusterIndex}`} fill="var(--graph-neutral)" opacity="0.2">
            {Array.from({ length: 12 }, (_, index) => (
              <circle key={index} cx={cluster.x + (index % 4) * 7} cy={cluster.y + Math.floor(index / 4) * 7} r="0.85" />
            ))}
          </g>
        ))}
        {graphPaths.map((path) => (
          <path key={path.key} d={path.d} fill="none" stroke={path.stroke} strokeWidth={path.width} opacity={path.opacity} strokeLinecap="round" strokeDasharray={path.dotted ? '1.4 5.5' : undefined} />
        ))}
        {branchPaths.map((path) => (
          <path key={`branch-${path.key}`} d={path.d} fill="none" stroke={path.tone} strokeWidth="0.8" opacity="0.24" strokeLinecap="round" strokeDasharray={path.dotted ? '1.5 5' : undefined} />
        ))}
        {graphStems.map((stem) => (
          <line key={stem.key} x1={stem.x1} y1={stem.y1} x2={stem.x2} y2={stem.y2} stroke={stem.tone} strokeWidth="0.8" opacity="0.38" />
        ))}
        <path d={mainFlowPath} fill="none" stroke="var(--color-pink)" strokeWidth="1.7" strokeLinecap="round" />
        {graphDots.map((dot) => (
          <circle key={dot.key} cx={dot.cx} cy={dot.cy} r={dot.r} fill={dot.fill} opacity={dot.opacity} />
        ))}
        {journeyNodes.map((node, index) => (
          <g key={`${node.x}-${node.y}`}>
            {index === 0 || index === 2 ? <circle cx={node.x} cy={node.y} r={node.r + 13} fill="none" stroke={node.color} strokeWidth="0.65" opacity="0.15" /> : null}
            <circle cx={node.x} cy={node.y} r={node.r + 8} fill={node.color} opacity="0.1" />
            <circle cx={node.x} cy={node.y} r={node.r + 3} fill="none" stroke={node.color} strokeWidth="0.8" opacity="0.35" />
            <circle cx={node.x} cy={node.y} r={node.r} fill={node.color} />
          </g>
        ))}
      </svg>

      <div className="customer-data-panel">
        <div className="customer-data-heading">
          <Database size={25} strokeWidth={1.8} aria-hidden="true" />
          <span>Customer<br />Data</span>
        </div>
        <div className="customer-data-list">
          {sourceFields.map((field, index) => (
            <div className="customer-data-row" key={field}>
              <span className={`source-dot source-dot-${index}`} />
              <span>{field}</span>
            </div>
          ))}
        </div>
      </div>

      {stages.map((stage, index) => (
        <div className={`flow-stage ${stage.className}`} key={stage.name}>
          <span className={`flow-stage-marker ${stage.tone}`} />
          <div>
            <strong>{stage.name}</strong>
            <p>{stage.detail}</p>
          </div>
          <span className={`stage-stem stem-${index}`} aria-hidden="true" />
        </div>
      ))}

      <div className="flow-legend" aria-label="Customer status legend">
        <span><i className="legend-dot engaged" />01 <b>Engaged</b></span>
        <span><i className="legend-dot risk" />02 <b>At risk</b></span>
        <span><i className="legend-dot churned" />03 <b>Churned</b></span>
      </div>
      <div className="visual-caption">DATA <span>×</span> BEHAVIOUR <span>×</span> PREDICTION</div>
    </div>
  );
}

function ProcessFlow() {
  return (
    <section className="process-panel" id="how-it-works" aria-labelledby="process-title">
      <div className="process-topline">
        <div className="section-index"><b>02</b><span /> <span id="process-title">HOW IT WORKS</span></div>
        <div className="process-kicker"><span />FROM DATA TO ACTIONABLE INSIGHTS</div>
      </div>
      <div className="process-grid">
        {steps.map(({ number, title, description, Icon }, index) => (
          <article className="process-step" key={number}>
            <div className="step-icon-wrap">
              <div className="step-icon"><Icon size={29} strokeWidth={1.7} aria-hidden="true" /></div>
              {index === 0 && <span className="icon-corner-accent" />}
            </div>
            <span className="step-number">{number}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Landing({ onLaunch = () => {} }) {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing-page" id="overview">
      <div className="landing-decoration" aria-hidden="true">
        <span className="deco-square deco-square-one" />
        <span className="deco-square deco-square-two" />
        <span className="deco-square deco-square-three" />
        <span className="deco-grid deco-grid-one" />
        <span className="deco-grid deco-grid-two" />
      </div>

      <header className="landing-nav">
        <a href="#overview" className="landing-brand" aria-label="RetainIQ home">
          <span className="brand-word">Gone-ology</span>
          <span className="brand-caption">CUSTOMER CHURN INTELLIGENCE</span>
        </a>
        <nav className="landing-links" aria-label="Main navigation">
          <button className="nav-link active" onClick={() => scrollTo('overview')}>Overview</button>
          <button className="nav-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
          <button className="nav-link" onClick={() => scrollTo('technology')}>Technology</button>
        </nav>
        <button className="launch-button" onClick={onLaunch}>
          Launch Application <ArrowRight size={17} strokeWidth={1.8} />
        </button>
      </header>

      <main className="landing-main">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-eyebrow"><b>01</b><span />DATA <i>×</i> BEHAVIOUR <i>×</i> PREDICTION</div>
            <h1 id="hero-title" aria-label="Turn customer history into forward-looking insight.">
              <span>Turn customer</span>
              <span>history into</span>
              <span className="headline-accent">forward-looking</span>
              <span className="headline-accent">insight.</span>
            </h1>
            <p className="hero-description">
              Understand behaviour, predict churn and discover meaningful customer segments.
            </p>
            <div className="hero-actions">
              <button className="primary-cta" onClick={() => scrollTo('how-it-works')}>
                Explore the System <ArrowRight size={18} />
              </button>
              <button className="secondary-cta" onClick={() => scrollTo('how-it-works')}>How It Works</button>
            </div>
            <div className="built-note">
              <div className="user-stack" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => (
                  <span className="user-avatar" key={item}><UserRound size={17} strokeWidth={1.7} /></span>
                ))}
              </div>
              <p>Built with customer data<br />and machine learning.</p>
            </div>
          </div>
          <DataFlowGraphic />
        </section>

        <ProcessFlow />



       
      </main>
    </div>
  );
}


