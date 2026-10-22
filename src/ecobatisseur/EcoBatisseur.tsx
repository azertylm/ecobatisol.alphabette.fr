/**
 * ecobatisseur/EcoBatisseur.tsx
 *
 * Le corps de « ÉcoBâtisseur Sol » : trois blocs empilés sur mobile, deux
 * colonnes sur écran large.
 *
 *   1. Panneau de configuration : sliders de précision + sélecteur visuel
 *      d'ensoleillement (zones climatiques), chacun avec son info-bulle.
 *   2. Moteur de calcul affiché en direct : quatre résultats aux nombres
 *      animés, résumés dans une zone aria-live pour la synthèse vocale.
 *   3. Matrice de recommandations budgétaires : trois paliers en accordéons,
 *      avec fiches d'actions dont les gains s'adaptent au profil calculé.
 */

import { useCallback, useMemo, useState } from 'react';
import { calculer, ZONES, type ContexteGains } from './calcul';
import { MATRICE } from './recommandations';
import {
  Compteur,
  InfoBulle,
  nombre,
  nombreDecimal,
  SliderPrecision,
  useNoteDifferée,
} from './ui';

/** retour haptique léger (si le téléphone le permet), plafonné en fréquence. */
let dernierVibrage = 0;
function vibrer(duree = 10) {
  const maintenant = Date.now();
  if (maintenant - dernierVibrage < 150) return;
  dernierVibrage = maintenant;
  try {
    navigator.vibrate?.(duree);
  } catch {
    /* navigateur sans support vibration : silencieux. */
  }
}

const fmtAnnuelle = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function EcoBatisseur() {
  const [surfaceToiture, setSurfaceToiture] = useState(80);
  const [factureMensuelle, setFactureMensuelle] = useState(120);
  const [zoneId, setZoneId] = useState('ouest');
  const [paliersOuverts, setPaliersOuverts] = useState<Record<string, boolean>>({
    'low-tech': true,
    optimisation: false,
    investissement: false,
  });

  const calcul = useMemo(
    () => calculer({ surfaceToiture, factureMensuelle, zoneId }),
    [surfaceToiture, factureMensuelle, zoneId],
  );

  const contexteGains: ContexteGains = useMemo(
    () => ({
      factureAnnuelleEur: factureMensuelle * 12,
      consoKwh: calcul.consoKwh,
      productionKwh: calcul.productionKwh,
      volumeEauLitres: calcul.volumeEauLitres,
      eauRemplaceeM3: calcul.eauRemplaceeM3,
      economieSolaireEur: calcul.economieSolaireEur,
      economieEauEur: calcul.economieEauEur,
      coutSolaireEur: calcul.coutSolaireEur,
      coutEauEur: calcul.coutEauEur,
      roiAnnees: calcul.roiAnnees,
    }),
    [factureMensuelle, calcul],
  );

  /** Résumé pour la zone vive (aria-live), rafraîchi quand la manipulation calme. */
  const noteDifferée = useNoteDifferée(
    [
      `Zone ${calcul.zone.nom}.`,
      `Production solaire estimée : ${nombre(calcul.productionKwh)} kilowattheures par an.`,
      `Eau de pluie collectée : ${nombre(calcul.volumeEauLitres)} litres par an.`,
      `Économie estimée : ${nombre(calcul.economieAnnuelleEur)} euros par an.`,
      calcul.roiAnnees === null
        ? 'Amortissement non atteignable avec ces réglages.'
        : `Amortissement : ${nombreDecimal(calcul.roiAnnees)} années.`,
    ].join(' '),
  );

  /** Retaille une puissance potentiellement dépassée : mieux dimensionner le solaire. */
  const surfaceConseillee = useMemo(() => {
    if (calcul.tauxCouverture <= 100) return null;
    // Faisons correspondre production ≈ consommation (marge 10 % pour le surplus).
    const surfaceCible = ((calcul.consoKwh * 1.1) / calcul.zone.prodKwhParKwc) * 6.5;
    return Math.max(10, Math.round(surfaceCible / 5) * 5);
  }, [calcul.tauxCouverture, calcul.consoKwh, calcul.zone.prodKwhParKwc]);

  const basculerPalier = useCallback((id: string) => {
    setPaliersOuverts((precedents) => ({ ...precedents, [id]: !precedents[id] }));
    vibrer(8);
  }, []);

  return (
    <div className="eb-page">
      <a className="eb-sauter" href="#eb-resultats">
        Aller aux résultats
      </a>

      <header className="eb-en-tete">
        <p className="eb-epigraphe">Simulateur citoyen</p>
        <h1 className="eb-titre">
          Votre maison peut produire <em>ce qu’elle consomme</em>.
        </h1>
        <p className="eb-intro">
          Renseignez trois paramètres : votre toiture, votre région, votre facture. Le simulateur
          chiffre en direct joule et goutte ce que l’autonomie vous rapporterait, puis construit un
          plan d’action en trois paliers budgétaires.
        </p>
      </header>

      <div className="eb-blocs">
        {/* =========================================================== */}
        {/* 1. Panneau de configuration                                  */}
        {/* =========================================================== */}
        <section className="eb-colonne eb-colonne--config" aria-labelledby="eb-config-titre">
          <h2 id="eb-config-titre" className="eb-sous-titre">
            1 · Vos paramètres
          </h2>

          <form className="eb-carte" noValidate>
            <fieldset className="eb-groupe">
              <legend className="eb-legende">Votre toiture et votre facture</legend>

              <SliderPrecision
                id="eb-surface"
                legende="Surface de toiture"
                min={10}
                max={300}
                pas={5}
                valeur={surfaceToiture}
                auChangement={(v) => {
                  setSurfaceToiture(v);
                  vibrer();
                }}
                format={(v) => `${nombre(v)} m²`}
                idBulle="eb-bulle-surface"
                bulle="La zone de toit dégagée, sans ombre, sans cheminée ni lucarne. Repérez-la à la fenêtre ou sur un plan : comptez la longueur × la largeur du pans sud si possible. 80 m² correspondent par exemple à une maison de taille moyenne."
              />
              <SliderPrecision
                id="eb-facture"
                legende="Facture d’électricité mensuelle"
                min={20}
                max={400}
                pas={5}
                valeur={factureMensuelle}
                auChangement={(v) => {
                  setFactureMensuelle(v);
                  vibrer();
                }}
                format={(v) => `${nombre(v)} € / mois`}
                idBulle="eb-bulle-facture"
                bulle="Reprenez une facture récente (montant TTC). Cette valeur estime votre consommation : à 25 c€ le kWh, 120 € par mois correspondent à environ 5 700 kWh par an — c’est la cible que votre production solaire cherchera à couvrir."
              />
            </fieldset>

            <fieldset className="eb-groupe" aria-describedby="eb-bulle-zone">
              <legend className="eb-legende">Votre zone climatique</legend>
              <span className="eb-legende__groupe">
                Région — ensoleillement et pluviométrie
                <InfoBulle
                  id="eb-bulle-zone"
                  sujet="la zone climatique"
                  texte="C’est le gisement du soleil et de la pluie chez vous. Une même installation produit environ 50 % de plus à Marseille qu’à Lille, et la pluie tombe deux fois plus abondamment au Nord qu’en Méditerranée. Choisissez la région la plus proche de votre logement : le reste du calcul s’adapte."
                />
              </span>
              <div className="eb-zones">
                {ZONES.map((zone) => (
                  <label key={zone.id} className="eb-zone">
                    <input
                      type="radio"
                      name="eb-zone"
                      className="eb-zone__radio"
                      value={zone.id}
                      checked={zone.id === zoneId}
                      onChange={() => {
                        setZoneId(zone.id);
                        vibrer(8);
                      }}
                    />
                    <span className="eb-zone__carte">
                      <span className="eb-zone__soleil" aria-hidden="true">
                        {'☀'.repeat(zone.soleil)}
                        {'·'.repeat(5 - zone.soleil)}
                      </span>
                      <span className="eb-zone__nom">{zone.nom}</span>
                      <span className="eb-zone__villes">{zone.villes}</span>
                      <span className="eb-sr">
                        Index d’ensoleillement : {zone.soleil} sur 5. Pluviométrie :{' '}
                        {nombre(zone.pluieMmAn)} millimètres par an.
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </form>

          <p className="eb-astuce">
            Aucun renseignement personnel n’est stocké ni transmis : le calcul se fait entièrement
            dans votre navigateur.
          </p>
        </section>

        {/* =========================================================== */}
        {/* 2. Résultats en direct                                       */}
        {/* =========================================================== */}
        <section className="eb-colonne" aria-labelledby="eb-resultats-titre">
          <span id="eb-resultats" className="eb-ancre" tabIndex={-1} aria-hidden="true" />
          <h2 id="eb-resultats-titre" className="eb-sous-titre">
            2 · Ce que ça vous rapporte
          </h2>

          <div className="eb-resultats">
            <article className="eb-resultat">
              <span className="eb-resultat__icone" aria-hidden="true">
                ☀️
              </span>
              <h3 id="eb-res-solaire" className="eb-resultat__titre">
                Production solaire
              </h3>
              <output className="eb-resultat__valeur" htmlFor="eb-surface eb-facture">
                <Compteur
                  valeur={calcul.productionKwh}
                  classe="eb-resultat__nombre"
                  srTexte={`${nombre(calcul.productionKwh)} kilowattheures par an`}
                />
                <span className="eb-resultat__unite" aria-hidden="true">
                  kWh/an
                </span>
              </output>
              <p className="eb-resultat__note">
                ≈ {nombreDecimal(calcul.puissanceKwc)} kWc posés · {nombre(calcul.tauxCouverture)} %
                de votre consommation d’électricité couverte
              </p>
              {surfaceConseillee && (
                <p className="eb-resultat__conseil">
                  Votre toiture produit plus que vous n’en consommez. Pour un équilibre
                  production/usages, visez plutôt {nombre(surfaceConseillee)} m².
                </p>
              )}
            </article>

            <article className="eb-resultat">
              <span className="eb-resultat__icone" aria-hidden="true">
                💧
              </span>
              <h3 id="eb-res-eau" className="eb-resultat__titre">
                Eau de pluie
              </h3>
              <output className="eb-resultat__valeur" htmlFor="eb-surface">
                <Compteur
                  valeur={calcul.volumeEauLitres}
                  classe="eb-resultat__nombre"
                  srTexte={`${nombre(calcul.volumeEauLitres)} litres par an`}
                />
                <span className="eb-resultat__unite" aria-hidden="true">
                  L/an
                </span>
              </output>
              <p className="eb-resultat__note">
                Dont ≈ {nombre(Math.round(calcul.eauRemplaceeM3 * 1000))} L d’eau potable
                remplacée (WC, linge, jardin)
              </p>
            </article>

            <article className="eb-resultat eb-resultat--somme">
              <span className="eb-resultat__icone" aria-hidden="true">
                💶
              </span>
              <h3 id="eb-res-economie" className="eb-resultat__titre">
                Économies
              </h3>
              <output className="eb-resultat__valeur" htmlFor="eb-facture eb-surface">
                <Compteur
                  valeur={calcul.economieAnnuelleEur}
                  classe="eb-resultat__nombre eb-resultat__nombre--argent"
                  srTexte={`${nombre(calcul.economieAnnuelleEur)} euros par an`}
                />
                <span className="eb-resultat__unite" aria-hidden="true">
                  €/an
                </span>
              </output>
              <p className="eb-resultat__note">
                {nombreFmt(calcul.economieSolaireEur)} € solaire + {nombreFmt(calcul.economieEauEur)} €
                eau · <strong>sur 10 ans : {nombreFmt(calcul.economieAnnuelleEur * 10)} €</strong>
              </p>
            </article>

            <article className="eb-resultat">
              <span className="eb-resultat__icone" aria-hidden="true">
                ⏳
              </span>
              <h3 id="eb-res-roi" className="eb-resultat__titre">
                Durée d’amortissement
              </h3>
              <output className="eb-resultat__valeur" htmlFor="eb-facture eb-surface">
                {calcul.roiAnnees !== null ? (
                  <Compteur
                    valeur={calcul.roiAnnees}
                    format={nombreDecimal}
                    classe="eb-resultat__nombre"
                    srTexte={`${nombreDecimal(calcul.roiAnnees)} années pour amortir l’investissement`}
                  />
                ) : (
                  <>
                    <span className="eb-resultat__nombre" aria-hidden="true">
                      —
                    </span>
                    <span className="eb-sr">
                      Amortissement non atteignable avec ces réglages.
                    </span>
                  </>
                )}
                <span className="eb-resultat__unite" aria-hidden="true">
                  {calcul.roiAnnees !== null ? 'ans' : ''}
                </span>
              </output>
              <p className="eb-resultat__note">
                Investissement estimé :{' '}
                <strong>{nombreFmt(calcul.investissementEur)} €</strong> (
                {nombreFmt(calcul.coutSolaireEur)} € solaire + {nombreFmt(calcul.coutEauEur)} € cuve),
                hors aides publiques
              </p>
            </article>
          </div>

          {/* Zone vive : résumé entendu par la synthèse vocale quand la
              manipulation des curseurs se calme, sans spam. */}
          <output className="eb-summary" aria-live="polite">
            <span className="eb-sr">{noteDifferée}</span>
          </output>
        </section>
      </div>

      {/* ============================================================= */}
      {/* 3. Matrice de recommandations budgétaires                     */}
      {/* ============================================================= */}
      <section className="eb-plan" aria-labelledby="eb-plan-titre">
        <h2 id="eb-plan-titre" className="eb-sous-titre">
          3 · Votre plan d’action en trois paliers
        </h2>
        <p className="eb-plan__intro">
          Commencez toujours par le palier gratuit : chaque euro économisé réduit d’autant
          l’investissement à amortir du palier supérieur.
        </p>

        <div className="eb-paliers">
          {MATRICE.map((palier) => {
            const ouvert = paliersOuverts[palier.id] === true;
            const idBouton = `eb-palier-${palier.id}-bouton`;
            const idPanneau = `eb-palier-${palier.id}-panneau`;
            return (
              <article key={palier.id} className={`eb-palier${ouvert ? ' eb-palier--ouvert' : ''}`}>
                <h3 className="eb-palier__h">
                  <button
                    type="button"
                    className="eb-palier__bouton"
                    id={idBouton}
                    aria-expanded={ouvert}
                    aria-controls={idPanneau}
                    onClick={() => basculerPalier(palier.id)}
                  >
                    <span className="eb-palier__entete">
                      <span className="eb-palier__titre">{palier.titre}</span>
                      <span className="eb-palier__cout">{palier.cout}</span>
                    </span>
                    <span className="eb-palier__chevron" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                </h3>
                <div
                  className="eb-palier__enveloppe"
                  id={idPanneau}
                  role="region"
                  aria-labelledby={idBouton}
                >
                  <div className="eb-palier__interieur">
                    <p className="eb-palier__accroche">{palier.accroche}</p>
                    <ul className="eb-fiches">
                      {palier.fiches.map((fiche) => {
                        const gain = fiche.gain(contexteGains);
                        return (
                          <li className="eb-fiche" key={fiche.titre}>
                            <article>
                              <span className="eb-fiche__icone" aria-hidden="true">
                                {fiche.icone}
                              </span>
                              <div className="eb-fiche__corps">
                                <h4 className="eb-fiche__titre">{fiche.titre}</h4>
                                <p className="eb-fiche__texte">{fiche.texte}</p>
                                <p className="eb-fiche__meta">
                                  <span className="eb-fiche__cout">{fiche.cout}</span>
                                  <strong className="eb-fiche__gain">{gain}</strong>
                                </p>
                              </div>
                            </article>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <details className="eb-methodo">
          <summary>Méthode de calcul et hypothèses</summary>
          <div className="eb-methodo__contenu">
            <ul>
              <li>
                Solaire : 70 % de la toiture exploitable, 6,5 m² par kWc, rendement selon la zone
                (900 à 1 400 kWh/kWc/an), 45 % autoconsommé à prix plein (25 c€/kWh), surplus revendu
                ≈ 4 c€/kWh.
              </li>
              <li>
                Eau : pluviométrie de la zone × 90 % de la surface de toit collectée, 75 % utilisable
                (WC, lave-linge, jardin), valorisée au tarif de l’eau potable (4,30 €/m³), plafonnée
                à 45 m³/an par foyer.
              </li>
              <li>
                Coûts : pose photovoltaïque ≈ 2 600 € + 1 733 €/kWc ; cuve enterrée 5 m³ raccordée ≈
                4 500 €. Amortissement calculé sans primes ni aides publiques, pour rester prudent.
              </li>
              <li>
                Chaque valeur est un ordre de grandeur destiné à orienter la décision — ne remplace
                pas l’étude d’un installateur qualifié ni le compte d’une facture locale.
              </li>
            </ul>
          </div>
        </details>
      </section>
    </div>
  );
}

/* Petit utilitaire local : formate un montant en décorant les milliers. */
function nombreFmt(v: number): string {
  return fmtAnnuelle.format(Math.round(v));
}
