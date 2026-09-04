import { Arena } from './views/Arena/Arena';
import { Ensemble } from './views/Ensemble/Ensemble';
import { Portrait } from './views/Portrait/Portrait';
import { Lab } from './views/Lab/Lab';
import { Rematch } from './views/Rematch/Rematch';
import { Archive } from './views/Archive/Archive';
import './styles/base.css';

/**
 * The arena, and the analysis scrolling under it. The arena fills the viewport
 * on load and everything else is below the fold deliberately, so the first
 * experience is playing rather than reading (DESIGN.md §4.5). There is no
 * onboarding and nothing is pushed.
 */
export function App() {
  return (
    <>
      <Arena />
      <main className="analysis">
        <Ensemble />
        <Portrait />
        <Lab />
        <Rematch />
        <Archive />
      </main>
    </>
  );
}
