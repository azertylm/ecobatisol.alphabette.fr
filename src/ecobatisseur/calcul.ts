/**
 * ecobatisseur/calcul.ts
 *
 * Moteur de calcul du simulateur « ÉcoBâtisseur Sol ».
 *
 * Philosophie : des formules simples, tracées et honnêtes. Chaque hypothèse est
 * nommée, commentée et volontairement dans la moyenne française haute (données
 * ADEME / Qualit'PV / prix de l'eau 2024-2025, ordres de grandeur publics).
 * Le simulateur donne un PLAN D'ACTION, pas un devis : chaque valeur affichée
 * est un ordre de grandeur discutable par un installateur réel.
 *
 * Ça va de la maison individuelle à l'immeuble en copropriété et au tertiaire :
 * les coûts de pose/fabrication sont DÉGRESSIFS par palier (plus on est gros,
 * moins la fabrication et la pose coûtent au kWc et au m³), et le plafond d'eau
 * remplaçable suit le nombre de foyers du bâtiment.
 *
 * Toutes les grandeurs sont en SI lisible : m², kWh/an, litres, euros, années.
 */

/** Prix moyen du kWh électrique en France (tarif réglementé, 2025). */
export const PRIX_KWH = 0.2516;
/** Tarif de revente du surplus non consommé (ordre de grandeur 2025). */
export const PRIX_REVENTE_SURPLUS = 0.04;
/** Prix moyen de l'eau potable + assainissement en France (€ par m³). */
export const PRIX_EAU_M3 = 4.3;
/** Part d'une toiture réellement exploitable (pente, orientation, cheminées). */
export const PART_TOITURE_UTILE = 0.7;
/** Surface de panneaux nécessaire pour 1 kWc (m² par kWc). */
export const M2_PAR_KWC = 6.5;
/** Part de la production auto-consommée sans batterie (le reste est revendu). */
export const TAUX_AUTOCONSOMMATION = 0.45;
/** Eau potable remplaçable par foyer (WC, linge, nettoyage, jardin) : m³/an. */
export const EAU_FOYER_M3 = 45;
/** Pour un bâtiment collectif, on compte environ un foyer par… */
export const M2_TOITURE_PAR_FOYER = 120;

export interface ZoneClimat {
  id: string;
  nom: string;
  villes: string;
  /** Production réaliste : kWh produits par an et par kWc installé. */
  prodKwhParKwc: number;
  /** Pluviométrie moyenne : millimètres par an (1 mm/m² = 1 litre/m²). */
  pluieMmAn: number;
  /** Index visuel d'ensoleillement 1 à 5, pour le sélecteur de zones. */
  soleil: number;
}

/** Les cinq zones climatiques françaises proposées par le sélecteur visuel. */
export const ZONES: ZoneClimat[] = [
  {
    id: 'nord',
    nom: 'Nord & Bretagne',
    villes: 'Lille, Rennes, Rouen',
    prodKwhParKwc: 900,
    pluieMmAn: 850,
    soleil: 1,
  },
  {
    id: 'ouest',
    nom: 'Ouest & Centre',
    villes: 'Paris, Nantes, Orléans',
    prodKwhParKwc: 1000,
    pluieMmAn: 650,
    soleil: 2,
  },
  {
    id: 'est',
    nom: 'Est & Massif central',
    villes: 'Strasbourg, Lyon, Clermont',
    prodKwhParKwc: 1100,
    pluieMmAn: 900,
    soleil: 3,
  },
  {
    id: 'sud-ouest',
    nom: 'Sud-Ouest',
    villes: 'Bordeaux, Toulouse, Pau',
    prodKwhParKwc: 1200,
    pluieMmAn: 950,
    soleil: 4,
  },
  {
    id: 'mediterranee',
    nom: 'Méditerranée',
    villes: 'Marseille, Nice, Montpellier',
    prodKwhParKwc: 1400,
    pluieMmAn: 650,
    soleil: 5,
  },
];

export interface Entrees {
  /** Surface de toiture saisie, en m². */
  surfaceToiture: number;
  /** Facture d'électricité mensuelle actuelle, en euros. */
  factureMensuelle: number;
  /** Identifiant de la zone climatique choisie. */
  zoneId: string;
}

export interface Calcul {
  zone: ZoneClimat;
  /** Surface de panneaux réellement installable (m²). */
  surfaceUtile: number;
  /** Puissance crête de l'installation (kWc). */
  puissanceKwc: number;
  /** Électricité produite sur l'année (kWh/an). */
  productionKwh: number;
  /** Eau de pluie collectée sur l'année (litres/an). */
  volumeEauLitres: number;
  /** Eau potable réellement remplacée (m³/an, plafonné aux besoins). */
  eauRemplaceeM3: number;
  /** Consommation estimée du foyer, déduite de sa facture (kWh/an). */
  consoKwh: number;
  /** Consommation couverte : production ÷ consommation, en % (peut dépasser 100). */
  tauxCouverture: number;
  /** Surplus non consommé et revendu (kWh/an). */
  surplusKwh: number;
  /** Économie solaire : kWh évités à prix plein + revente du surplus (€/an). */
  economieSolaireEur: number;
  /** Économie sur la facture d'eau (€/an). */
  economieEauEur: number;
  /** Total des économies annuelles (€/an). */
  economieAnnuelleEur: number;
  /** Coût estimé d'une installation photovoltaïque posée (€). */
  coutSolaireEur: number;
  /** Coût estimé d'une récupération d'eau de pluie enterrée (€). */
  coutEauEur: number;
  /** Investissement total des deux aménagements (€). */
  investissementEur: number;
  /** Durée d'amortissement (années), ou null si l'économie annuelle est nulle. */
  roiAnnees: number | null;
}

/** Coût de pose d'une installation PV, DÉGRESSIF, calibré sur les tarifs
 * moyens 2024-2025 : 1 733 €/kWc jusqu'à 9 kWc (maison), 1 250 €/kWc pour
 * les grandes toitures (copropriété, commerce, hangar), 900 €/kWc au-delà
 * (bâtiments industriels) — la fabrication et la pose d'un châssis unique sur
 * grande toiture coûtent moins au kWc qu'une suite de petits chantiers.
 */
export function coutSolaire(puissanceKwc: number): number {
  if (puissanceKwc <= 9) {
    return Math.round(2600 + 1733 * puissanceKwc);
  }
  if (puissanceKwc <= 100) {
    // Grande toiture (copropriété, commerce, hangar) : fabrication et pose
    // mutualisées, le kWc coûte moins cher.
    return Math.round(2600 + 1733 * 9 + 1250 * (puissanceKwc - 9));
  }
  // Bâtiments industriels : châssis uniques, grues et équipes dédiées.
  return Math.round(2600 + 1733 * 9 + 1250 * 91 + 900 * (puissanceKwc - 100));
}

/** Coût moyen ramené au kWc, pour la lecture des économies d'échelle. */
export function coutMoyenParKwc(puissanceKwc: number): number {
  if (puissanceKwc <= 0) return 0;
  return Math.round(coutSolaire(puissanceKwc) / puissanceKwc);
}

/**
 * Coût d'un équipement de récupération d'eau de pluie ENTERRÉ + raccordements
 * (WC / lave-linge / réserve technique) : la cuve se dimensionne sur ~2 mois
 * d'eau remplacée ; au-delà de la cuve de maison (5 m³), chaque m³ de plus
 * coûte ~900 € posé — les grands volumes sont négociés.
 */
export function coutEau(volumeRemplacableM3: number): number {
  const capacite = Math.min(120, Math.max(5, Math.round(volumeRemplacableM3 / 6)));
  return Math.round(4500 + 900 * Math.max(0, capacite - 5));
}

/** Calcule tout le profil du foyer à partir des entrées brutes du panneau. */
export function calculer(entrees: Entrees): Calcul {
  const zone = ZONES.find((z) => z.id === entrees.zoneId) ?? ZONES[0];

  const surfaceUtile = entrees.surfaceToiture * PART_TOITURE_UTILE;
  const puissanceKwc = surfaceUtile / M2_PAR_KWC;
  const productionKwh = Math.round(puissanceKwc * zone.prodKwhParKwc);

  const volumeEauLitres = Math.round(
    entrees.surfaceToiture * zone.pluieMmAn * 0.9, // 90 % de l'eau de pluie est collectée.
  );
  // Plafond d'eau remplaçable : un foyer (45 m³/an), ou un foyer par ~120 m²
  // de toiture dans un immeuble en copropriété / tertiaire.
  const plafondEauM3 = Math.max(
    EAU_FOYER_M3,
    Math.round((entrees.surfaceToiture / M2_TOITURE_PAR_FOYER) * EAU_FOYER_M3),
  );
  const eauRemplaceeM3 = Math.min(
    (volumeEauLitres * 0.75) / 1000, // 75 % du volume est comparable (WC, linge, jardin).
    plafondEauM3,
  );

  const factureAnnuelleEur = entrees.factureMensuelle * 12;
  const consoKwh = Math.round(factureAnnuelleEur / PRIX_KWH);

  const consommeeAuto = Math.min(productionKwh, consoKwh) * TAUX_AUTOCONSOMMATION;
  const surplusKwh = Math.max(productionKwh - consommeeAuto, 0);
  const economieSolaireEur = Math.round(consommeeAuto * PRIX_KWH + surplusKwh * PRIX_REVENTE_SURPLUS);

  const economieEauEur = Math.round(eauRemplaceeM3 * PRIX_EAU_M3);
  const economieAnnuelleEur = economieSolaireEur + economieEauEur;

  const coutSolaireEur = coutSolaire(puissanceKwc);
  const coutEauEur = coutEau(eauRemplaceeM3);
  const investissementEur = coutSolaireEur + coutEauEur;

  const roiAnnees =
    economieAnnuelleEur > 0 ? Math.round((investissementEur / economieAnnuelleEur) * 10) / 10 : null;

  const tauxCouverture = consoKwh > 0 ? Math.round((productionKwh / consoKwh) * 100) : 0;

  return {
    zone,
    surfaceUtile,
    puissanceKwc,
    productionKwh,
    volumeEauLitres,
    eauRemplaceeM3,
    consoKwh,
    tauxCouverture,
    surplusKwh,
    economieSolaireEur,
    economieEauEur,
    economieAnnuelleEur,
    coutSolaireEur,
    coutEauEur,
    investissementEur,
    roiAnnees,
  };
}

/** Contexte passé aux fiches d'actions pour estimer leurs gains. */
export interface ContexteGains {
  factureAnnuelleEur: number;
  consoKwh: number;
  productionKwh: number;
  volumeEauLitres: number;
  eauRemplaceeM3: number;
  economieSolaireEur: number;
  economieEauEur: number;
  coutSolaireEur: number;
  coutEauEur: number;
  roiAnnees: number | null;
}
