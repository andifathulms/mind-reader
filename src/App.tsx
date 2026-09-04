import { Arena } from './views/Arena/Arena';
import { Ensemble } from './views/Ensemble/Ensemble';
import { Controls } from './views/Controls/Controls';
import { Portrait } from './views/Portrait/Portrait';
import { Lab } from './views/Lab/Lab';
import { Rematch } from './views/Rematch/Rematch';
import { Archive } from './views/Archive/Archive';
import { Export } from './views/Export/Export';
import { SiteIndex } from './ui/Index';
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
 *
 * The index rail is the one piece of chrome. It appears once the arena has left
 * the screen and names the seven sections underneath, which previously
 * announced themselves only by being scrolled into.
 */
export function App() {
  return (
    <>
      <a className="skip" href="#ensemble">
        Skip to the analysis
      </a>
      <Arena />
      <SiteIndex />
      <main className="analysis">
        <Ensemble />
        <Controls />
        <Portrait />
        <Lab />
        <Rematch />
        <Archive />
        <Export />
        <footer className="colophon">
          <p>
            Built from Shannon's 1953 memorandum and Hagelbarger's 1956 paper. Nothing you press
            leaves this device.
          </p>
        </footer>
      </main>
    </>
  );
}
