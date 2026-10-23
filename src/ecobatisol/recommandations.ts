/**
 * ecobatisol/recommandations.ts
 *
 * Matrice de recommandations budgétaires : trois paliers, des fiches
 * d'actions concrètes, des gains estimés à partir du contexte du foyer
 * (fonctions — chaque gain s'adapte à la facture et au profil calculés).
 */

import type { ContexteGains } from './calcul';

export interface FicheAction {
  icone: string;
  titre: string;
  /** Coût indicatif de l'action, affiché tel quel. */
  cout: string;
  /** Description pédagogique courte. */
  texte: string;
  /** Gain estimé, calculé à partir du contexte du foyer. */
  gain: (ctx: ContexteGains) => string;
}

export interface PalierBudget {
  id: string;
  titre: string;
  cout: string;
  /** Phrase d'accroche du palier, affichée au-dessus des fiches. */
  accroche: string;
  fiches: FicheAction[];
}

const round10 = (v: number) => Math.round(v / 10) * 10;
const eu = (v: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);
/** « ≈ 120 €/an » à partir d'un nombre. */
const gainEur = (v: number) => `≈ ${eu(round10(v))} €/an`;

export const MATRICE: PalierBudget[] = [
  {
    id: 'low-tech',
    titre: 'Low-Tech & Comportement',
    cout: '0 €',
    accroche:
      'Rien à acheter, tout à déclencher. Ces gestes coûtent zéro euro et se font ce soir.',
    fiches: [
      {
        icone: '🔌',
        titre: 'Débrancher les veilles',
        cout: '0 €',
        texte:
          'TV, box internet, consoles, chargeurs : la veille peut peser jusqu’à 10 % de la facture. Une simple multiprise avec interrupteur (ou des gestes du soir) suffit.',
        gain: (ctx) => gainEur(ctx.factureAnnuelleEur * 0.1),
      },
      {
        icone: '🧺',
        titre: 'Laver le linge à froid (≤ 30 °C)',
        cout: '0 €',
        texte:
          '80 à 90 % de l’énergie d’une machine sert à chauffer l’eau. Les lessives modernes restent efficaces à 20-30 °C.',
        gain: () => '≈ 60 €/an',
      },
      {
        icone: '⏰',
        titre: 'Décaler les gros usages en heures creuses',
        cout: '0 €',
        texte:
          'Lave-linge, lave-vaisselle et chauffe-eau programmés la nuit (ou entre 13 h et 15 h, quand le solaire national tourne à plein) : même confort, tarif réduit si votre abonnement propose heures creuses.',
        gain: (ctx) => gainEur(ctx.factureAnnuelleEur * 0.15),
      },
      {
        icone: '🚿',
        titre: 'Récupérer l’eau froide d’attente',
        cout: '0 €',
        texte:
          'Les litres qui coulent en attendant l’eau chaude partent au seau : ils arrosent les plantes, remplissent la chasse ou le seau de nettoyage. Une douche sèche souvent 4 à 10 litres d’attente.',
        gain: () => '≈ 500 L/an',
      },
      {
        icone: '🌱',
        titre: 'Arroser tôt ou tard + pailler',
        cout: '0 €',
        texte:
          'Arroser au lever ou au coucher du soleil réduit l’évaporation de moitié, et une couche de paille ou de tontes sèche garde le sol humide deux fois plus longtemps.',
        gain: () => '− 30 % d’eau au jardin',
      },
    ],
  },
  {
    id: 'optimisation',
    titre: 'Optimisation & Petit Équipement',
    cout: 'Moins de 500 €',
    accroche:
      'Des investissements modestes qui payent pour eux-mêmes en quelques mois, sans grands travaux.',
    fiches: [
      {
        icone: '💡',
        titre: 'LED partout + multiprises à interrupteur',
        cout: '≈ 60 €',
        texte:
          'Une ampoule LED consomme 5 fois moins qu’une halogène et dure 15 ans. Complétée par des multiprises coupe-veille, la maison ne « fuit » plus.',
        gain: (ctx) => gainEur(ctx.factureAnnuelleEur * 0.12),
      },
      {
        icone: '💦',
        titre: 'Douchette éco + mousseurs',
        cout: '≈ 40 €',
        texte:
          'Une douchette économique réduit le débit de 40 % sans perte de confort ; les mousseurs font pareil sur les robinets. Le poste « eau chaude » est l’un des plus gourmands du foyer.',
        gain: () => '≈ 120 €/an (eau + énergie)',
      },
      {
        icone: '🪣',
        titre: 'Cuve hors-sol 300 L + gouttière',
        cout: '≈ 150 €',
        texte:
          'Branchée directement sur la descente de gouttière, une cuve de 300 litres couvre la saison d’arrosage d’un potager et lave la terrasse sans toucher au réseau. Sur un immeuble, pensez plutôt à la grande cuve enterrée du palier 3.',
        gain: (ctx) =>
          `≈ ${eu(Math.min(12, Math.round((ctx.volumeEauLitres * 0.15) / 1000)))} m³/an`,
      },
      {
        icone: '🧣',
        titre: 'Isoler le chauffe-eau + minuteur',
        cout: '≈ 70 €',
        texte:
          'Une couverture isolante autour de la cuve et un minuteur qui la coupe la nuit évitent de réchauffer l’eau pour rien.',
        gain: () => '≈ 80 €/an',
      },
      {
        icone: '🌡️',
        titre: 'Chauffe-eau à 50 °C préréglé + sherlock des poignées',
        cout: '≈ 25 €',
        texte:
          'Abaisser le thermostat de 15 °C supprime la sur-consommation de confort, et un thermomètre de bain remplace la pression du robinet chaud. Sécurité et économie, une pierre deux coups.',
        gain: () => '≈ 70 €/an',
      },
    ],
  },
  {
    id: 'investissement',
    titre: 'Investissement & Autonomie',
    cout: 'Plus de 2 000 €',
    accroche:
      'Le grand pas vers l’autonomie : des équipements qui produisent. Des chiffres adaptés à votre configuration ci-dessus, de la maison à la copropriété.',
    fiches: [
      {
        icone: '☀️',
        titre: 'Installation photovoltaïque en autoconsommation',
        cout: 'Devis local',
        texte:
          'Panneaux sur votre toiture, courant consommé en direct, surplus revendu. Les primes à l’autoconsommation et la TVA réduite diminuent la facture réelle : l’amortissement ci-dessus est calculé sans aides, pour rester prudent. Sur grandes toitures, la fabrication et la pose sont mutualisées, ce qui réduit sensiblement le coût au kWc.',
        gain: (ctx) =>
          ctx.economieSolaireEur > 0
            ? `≈ ${eu(ctx.economieSolaireEur)} €/an — ${eu(ctx.productionKwh)} kWh/an`
            : 'Non pertinent avec cette configuration',
      },
      {
        icone: '🏢',
        titre: 'Copropriété : centrale sur toitures communes',
        cout: 'Devis + vote en AG',
        texte:
          'L’assemblée des copropriétaires vote, la copro reste propriétaire. La production alimente d’abord les parties communes (éclairage, ascenseur, VMC, pompes), le surplus est revendu et crédite le compte d’exploitation : chaque copropriétaire profite des économies via ses charges. Un dossier clé : le Syndicat des copropriétaires mandate la régie, l’installateur garantit l’étanchéité.',
        gain: (ctx) =>
          ctx.economieSolaireEur > 0
            ? `≈ ${eu(ctx.economieSolaireEur)} €/an sur les charges`
            : 'Non pertinent avec cette configuration',
      },
      {
        icone: '🚰',
        titre: 'Cuve d’eau de pluie enterrée, WC et lave-linge raccordés',
        cout: 'Volume adapté',
        texte:
          'La cuve enterrée stocke l’hiver pour l’été ; une pompe alimente la chasse et la machine à laver. Maison : cuve 5 à 8 m³. Copropriété : le volume se cale sur les foyers du bâtiment et les usages des parties communes — c’est jusqu’à 40 % d’eau potable remplacée toute l’année, invisiblement.',
        gain: (ctx) =>
          `≈ ${eu(Math.round(ctx.eauRemplaceeM3 * 4.3))} €/an — ${
            ctx.eauRemplaceeM3 >= 100
              ? `${eu(Math.round(ctx.eauRemplaceeM3))} m³/an remplacés`
              : `${eu(Math.round(ctx.eauRemplaceeM3 * 1000))} L/an remplacés`
          }`,
      },
      {
        icone: '♨️',
        titre: 'Chauffe-eau thermodynamique',
        cout: '≈ 3 500 € posé',
        texte:
          'Une pompe à chaleur dédiée à l’eau chaude : 3 à 4 fois moins d’électricité qu’un chauffe-eau classique. Aide MaPrimeRénov’ possible en rénovation.',
        gain: (ctx) => gainEur(ctx.factureAnnuelleEur * 0.35),
      },
      {
        icone: '🔋',
        titre: 'Batterie domestique sur le solaire',
        cout: '≈ 4 000 € (5 kWh)',
        texte:
          'Ajoutée à une installation PV, elle fait passer l’autoconsommation de 45 % à environ 75-80 % : on garde le surplus de midi pour le soir. À n’activer qu’une fois le photovoltaïque amorti.',
        gain: (ctx) =>
          ctx.economieSolaireEur > 0
            ? `≈ + ${eu(Math.round(ctx.economieSolaireEur * 0.55))} €/an`
            : 'À considérer après le solaire',
      },
      {
        icone: '🕳️',
        titre: 'Puits provençal (rafraîchissement passif)',
        cout: '≈ 2 500 €',
        texte:
          'Un conduit enterré à 2 m de profondeur amène l’air du soir frais à la maison sans la moindre énergie : la clim naturelle des bâtisseurs, toujours valable.',
        gain: () => 'Confort été, ~ 0 kWh',
      },
    ],
  },
];
