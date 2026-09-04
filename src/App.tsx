import { Arena } from './views/Arena/Arena';
import { Ensemble } from './views/Ensemble/Ensemble';
import { Controls } from './views/Controls/Controls';
import { Portrait } from './views/Portrait/Portrait';
import { Lab } from './views/Lab/Lab';
import { Rematch } from './views/Rematch/Rematch';
import { Archive } from './views/Archive/Archive';
import { Export } from './views/Export/Export';
import './styles/base.css';

/**
 * The arena, and the analysis scrolling under it. The arena fills the viewport
 * on load and everything else is below the fold deliberately, so the first
 * experience is playing rather than reading (DESIGN.md §4.5). There is no
 * onboarding, no modal and no tutorial; the explanation is available and is
 * never pushed.
 *
 * Section order is DESIGN.md §4.3, with the machine's own controls kept beside
 * the machine's own view so the confidence threshold can be felt while playing
 * rather than read about afterwards.
 */
export function App() {
  return (
    <>
      <Arena />
      <main className="analysis">
        <Ensemble />
        <Controls />
        <Portrait />
        <Lab />
        <Rematch />
        <Archive />
        <Export />
      </main>
    </>
  );
}
