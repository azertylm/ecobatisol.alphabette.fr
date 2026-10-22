/**
 * ecobatisseur/ui.tsx
 *
 * Petits composants réutilisables du simulateur :
 *  - Compteur      : nombre animé (compte des milliers vers la valeur cible) ;
 *  - InfoBulle     : info-bulle pédagogique accessible au clavier ;
 *  - SliderPrecision : curseur de précision avec valeur et bulle ;
 *  - utilitaires d'annonce (aria-live) et de formatage français.
 *
 * Accessibilité : chaque composant est un bloc sémantique étiqueté ; la valeur
 * des curseurs est exposée à la synthèse vocale via aria-valuetext ; les
 * animations respectent prefers-reduced-motion.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const fmtFin = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Formate un nombre « à la française » : 4 320. */
export function nombre(v: number): string {
  return fmt.format(v);
}

/** Formate un nombre avec décimales courtes : 8,4. */
export function nombreDecimal(v: number): string {
  return fmtFin.format(v);
}

/** Respecte le réglage « réduire les animations » du système. */
function mouvementReduit(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Couplage d'animation : suit une valeur cible en ease-out cubic, sans re-rendu
 * de l'écran entier (chaque compteur anime son propre texte). Avec
 * prefers-reduced-motion, la valeur s'affiche immédiatement.
 */
function useValeurAnimee(valeur: number, duree = 700): number {
  const [affichee, setAffichee] = useState(valeur);
  const courant = useRef(valeur);
  const trame = useRef(0);

  useEffect(() => {
    if (mouvementReduit()) {
      courant.current = valeur;
      setAffichee(valeur);
      return;
    }
    const depart = courant.current;
    const departT = performance.now();
    const pas = (t: number) => {
      const p = Math.min((t - departT) / duree, 1);
      const facilite = 1 - Math.pow(1 - p, 3);
      const n = depart + (valeur - depart) * facilite;
      courant.current = n;
      if (p < 1) {
        setAffichee(n);
        trame.current = requestAnimationFrame(pas);
      } else {
        setAffichee(valeur);
      }
    };
    trame.current = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(trame.current);
  }, [valeur, duree]);

  return affichee;
}

interface PropsCompteur {
  valeur: number | null;
  /** Formate le nombre animé (visible) : ex. nombre(). */
  format?: (v: number) => string;
  /** Valeur finale lue par la synthèse vocale, ex. « 4 320 kilowattheures par an ». */
  srTexte: string;
  classe?: string;
}

/**
 * Nombre visible animé + copie pour lecteurs d'écran qui n'annonce que la
 * valeur finale (pas chaque image de l'animation).
 */
export function Compteur({ valeur, format = nombre, srTexte, classe }: PropsCompteur) {
  const animee = useValeurAnimee(valeur ?? 0, 700);
  return (
    <span className={classe}>
      <span aria-hidden="true">{format(animee)}</span>
      <span className="eb-sr">{valeur === null ? '—' : srTexte}</span>
    </span>
  );
}

/** Retarde une valeur : sert à ne mettre à jour la zone d'annonce (aria-live)
 *  que quand la manipulation du curseur s'est calmée. */
export function useNoteDifferée<T>(valeur: T, delaiMs = 700): T {
  const [retardee, setRetardee] = useState(valeur);
  useEffect(() => {
    const id = window.setTimeout(() => setRetardee(valeur), delaiMs);
    return () => window.clearTimeout(id);
  }, [valeur, delaiMs]);
  return retardee;
}

interface PropsInfoBulle {
  id: string;
  sujet: string;
  texte: string;
}

/**
 * Info-bulle pédagogique : un bouton « i » ouvre une bulle explicative.
 * Le texte reste dans le DOM (liée par aria-describedby au champ concerné),
 * donc entendu par la synthèse vocale même bulle fermée.
 */
export function InfoBulle({ id, sujet, texte }: PropsInfoBulle) {
  const [ouvert, setOuvert] = useState(false);
  const refBulle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false);
    };
    const surClic = (e: MouseEvent) => {
      if (!refBulle.current?.contains(e.target as Node)) setOuvert(false);
    };
    window.addEventListener('keydown', surTouche);
    window.addEventListener('pointerdown', surClic);
    return () => {
      window.removeEventListener('keydown', surTouche);
      window.removeEventListener('pointerdown', surClic);
    };
  }, [ouvert]);

  return (
    <span className="eb-bulle">
      <button
        type="button"
        className="eb-bulle__bouton"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
      >
        <span aria-hidden="true">i</span>
        <span className="eb-sr">Comprendre : {sujet}</span>
      </button>
      <span
        ref={refBulle}
        id={id}
        className="eb-bulle__texte"
        role="note"
        hidden={!ouvert}
      >
        {texte}
      </span>
    </span>
  );
}

interface PropsSlider {
  id: string;
  legende: string;
  min: number;
  max: number;
  pas: number;
  valeur: number;
  auChangement: (v: number) => void;
  /** Formate la valeur affichée (« 80 m² de toiture »). */
  format: (v: number) => string;
  /** Texte pédagogique de l'info-bulle. */
  bulle: string;
  idBulle: string;
}

/** Curseur de précision : zone tactile ≥ 44 px, valeur lue, bulle pédagogique. */
export function SliderPrecision({
  id,
  legende,
  min,
  max,
  pas,
  valeur,
  auChangement,
  format,
  bulle,
  idBulle,
}: PropsSlider) {
  const pourcentage = ((valeur - min) / (max - min)) * 100;
  return (
    <div className="eb-reglage">
      <span className="eb-reglage__tete">
        <span className="eb-reglage__etiquette">
          <label htmlFor={id}>{legende}</label>
          <InfoBulle id={idBulle} sujet={legende} texte={bulle} />
        </span>
        <output htmlFor={id} className="eb-reglage__valeur">
          {format(valeur)}
        </output>
      </span>
      <input
        type="range"
        id={id}
        className="eb-slider"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => auChangement(Number(e.target.value))}
        aria-valuetext={format(valeur)}
        aria-describedby={idBulle}
        style={{ '--eb-pct': `${pourcentage}%` } as CSSProperties}
      />
    </div>
  );
}

/** Bloc visuellement caché, lu par la synthèse vocale. */
export function SeulementEcran({ children }: { children: ReactNode }) {
  return <span className="eb-sr">{children}</span>;
}
