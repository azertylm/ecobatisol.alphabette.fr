import { AppShell } from '@alphabette/shell';
import '@alphabette/shell/style.css';
import './ecobatisseur/ecobatisseur.css';
import { APP } from './alphabette.app';
import { EcoBatisseur } from './ecobatisseur/EcoBatisseur';

/**
 * ÉcoBâtisseur Sol — autonomie solaire et eau de pluie, chiffrée chez vous.
 *
 * La base commune (deux barres, thème jour/nuit, densité, plein écran, panneaux
 * dons/compte/clés) est fournie par <AppShell>. Le simulateur vit dedans et
 * hérite d'elle : ses couleurs dérivent de --ab-accent, son thème de la base.
 */
export function App() {
  return (
    <AppShell app={APP}>
      <main id="eb-contenu">
        <EcoBatisseur />
      </main>
    </AppShell>
  );
}
