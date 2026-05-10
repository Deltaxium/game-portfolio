import PhaserGame from './game/PhaserGame.jsx';

const projects = [
  {
    title: 'Top-Down Exploration',
    status: 'Prototype',
    description: 'Walk the factory district, collect a brass key, solve a valve puzzle, and unlock gated routes.',
  },
  {
    title: 'Side-View ATB Combat',
    status: 'Playable',
    description: 'Party members stand on the right, enemies on the left, and ATB gauges keep filling during menus.',
  },
  {
    title: 'Mechanical Status Effects',
    status: 'Systems',
    description: 'Jam, burn, stun, and overheat states can reduce damage output, fail commands, or skip actions.',
  },
];

function App() {
  return (
    <main className="app-shell">
      <section className="intro">
        <div>
          <p className="eyebrow">Steampunk Era RPG</p>
          <h1>Cinderworks</h1>
          <p className="intro-copy">
            A playable Phaser vertical slice with top-down exploration, gated puzzle progress, and side-view ATB battles.
          </p>
        </div>
        <a className="repo-link" href="https://github.com/" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </section>

      <section className="play-section" aria-label="Playable game demo">
        <PhaserGame />
      </section>

      <section className="project-grid" aria-label="Portfolio projects">
        {projects.map((project) => (
          <article className="project-card" key={project.title}>
            <span>{project.status}</span>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
