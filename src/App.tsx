import { Arena } from './views/Arena/Arena';
import { Seal } from './views/Seal/Seal';
import { Ensemble } from './views/Ensemble/Ensemble';
import { Controls } from './views/Controls/Controls';
import { Portrait } from './views/Portrait/Portrait';
import { Lab } from './views/Lab/Lab';
import { Rematch } from './views/Rematch/Rematch';
import { Archive } from './views/Archive/Archive';
import { Export } from './views/Export/Export';
import { Analysis } from './ui/Index';
import { SiteFooter } from './ui/SiteFooter';
import './styles/base.css';

/**
 * The arena, and the analysis under it. The arena fills the viewport on load
 * and the analysis is below the fold deliberately, so the first experience is
 * playing rather than reading (DESIGN.md §4.5). There is no onboarding, no
 * modal and no tutorial; the explanation is available and is never pushed.
 *
 * The analysis is a set of views behind one sticky tab bar. The order is
 * DESIGN.md §4.3, with the seal first because it decides whether any of the
 * others are worth reading (PRD §4.3), and the machine's own controls beside
 * the machine's own view so the confidence threshold can be felt while playing.
 */
export function App() {
  return (
    <>
      <a className="skip" href="#analysis">
        Skip to the analysis
      </a>
      <Arena />
      <Analysis>
        <Seal key="seal" />
        <Ensemble key="ensemble" />
        <Controls key="controls" />
        <Portrait key="portrait" />
        <Lab key="lab" />
        <Rematch key="rematch" />
        <Archive key="archive" />
        <Export key="export" />
      </Analysis>
      <SiteFooter>
        Built from Shannon's 1953 memorandum and Hagelbarger's 1956 paper. Nothing you press leaves
        this device.
      </SiteFooter>
    </>
  );
}
