import PhaserGame from './game/PhaserGame.jsx';

const projects = [
  {
    title: 'Arcade Prototype',
    status: 'Playable demo',
    description: 'A compact Phaser scene embedded in React, ready to swap for your first portfolio game.',
  },
  {
    title: 'Firebase Ready',
    status: 'Hosting configured',
    description: 'Built files publish from GitHub Actions to Firebase Hosting after each push to main.',
  },
  {
    title: 'GitHub Pages',
    status: 'CI deploy configured',
    description: 'The same production build can also publish as a public GitHub Pages portfolio.',
  },
];

function App() {
  return (
    <main className="app-shell">
      <section className="intro">
        <div>
          <p className="eyebrow">Phaser + React</p>
          <h1>Game Portfolio</h1>
          <p className="intro-copy">
            A lean starter for publishing playable browser games with Firebase Hosting and GitHub Pages.
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
