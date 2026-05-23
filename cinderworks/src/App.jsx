import { useState } from 'react';
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

const initialReview = {
  playerName: '',
  rating: '5',
  favoriteMoment: '',
  improveNext: '',
  wouldRecommend: 'yes',
};

function App() {
  const [review, setReview] = useState(initialReview);
  const [submittedReview, setSubmittedReview] = useState(null);

  const handleReviewChange = (event) => {
    const { name, value } = event.target;
    setReview((currentReview) => ({
      ...currentReview,
      [name]: value,
    }));
  };

  const handleReviewSubmit = (event) => {
    event.preventDefault();
    setSubmittedReview({
      ...review,
      submittedAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    });
    setReview(initialReview);
  };

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
        <div className="header-actions" aria-label="Page links">
          <a className="nav-link" href="../">
            Game Studio
          </a>
          <a className="nav-link" href="https://github.com/" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </section>

      <section className="play-section" aria-label="Playable game demo">
        <PhaserGame />
      </section>

      <section className="review-section" aria-labelledby="review-heading">
        <div className="review-heading">
          <p className="eyebrow">Playtest Review</p>
          <h2 id="review-heading">Submit Your Cinderworks Review</h2>
        </div>

        <form className="review-form" onSubmit={handleReviewSubmit}>
          <label className="form-field">
            <span>Name</span>
            <input
              name="playerName"
              type="text"
              value={review.playerName}
              onChange={handleReviewChange}
              placeholder="Your name"
              required
            />
          </label>

          <label className="form-field">
            <span>Rating</span>
            <select name="rating" value={review.rating} onChange={handleReviewChange}>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Strong</option>
              <option value="3">3 - Solid</option>
              <option value="2">2 - Needs work</option>
              <option value="1">1 - Rough</option>
            </select>
          </label>

          <label className="form-field form-field-wide">
            <span>Favorite Moment</span>
            <textarea
              name="favoriteMoment"
              value={review.favoriteMoment}
              onChange={handleReviewChange}
              placeholder="What stood out while playing?"
              rows="4"
              required
            />
          </label>

          <label className="form-field form-field-wide">
            <span>Improve Next</span>
            <textarea
              name="improveNext"
              value={review.improveNext}
              onChange={handleReviewChange}
              placeholder="What should be clearer, smoother, or more fun?"
              rows="4"
              required
            />
          </label>

          <fieldset className="recommend-field">
            <legend>Recommend</legend>
            <label>
              <input
                name="wouldRecommend"
                type="radio"
                value="yes"
                checked={review.wouldRecommend === 'yes'}
                onChange={handleReviewChange}
              />
              Yes
            </label>
            <label>
              <input
                name="wouldRecommend"
                type="radio"
                value="maybe"
                checked={review.wouldRecommend === 'maybe'}
                onChange={handleReviewChange}
              />
              Maybe
            </label>
            <label>
              <input
                name="wouldRecommend"
                type="radio"
                value="no"
                checked={review.wouldRecommend === 'no'}
                onChange={handleReviewChange}
              />
              No
            </label>
          </fieldset>

          <button className="submit-review" type="submit">
            Submit Review
          </button>
        </form>

        {submittedReview && (
          <article className="review-preview" aria-live="polite">
            <div>
              <span>{submittedReview.submittedAt}</span>
              <h3>{submittedReview.playerName}</h3>
            </div>
            <p className="review-score">{submittedReview.rating}/5</p>
            <p>
              <strong>Favorite:</strong> {submittedReview.favoriteMoment}
            </p>
            <p>
              <strong>Improve:</strong> {submittedReview.improveNext}
            </p>
            <p>
              <strong>Recommend:</strong> {submittedReview.wouldRecommend}
            </p>
          </article>
        )}
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
