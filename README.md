# ÉcoBâtisseur Sol

**Autonomie solaire et eau de pluie, chiffrée chez vous**

Application de l'écosystème [alphabette.fr](https://alphabette.fr).

- Adresses : **https://ecobatisseur.alphabette.fr** (sous-domaine) et
  **https://alphabette.fr/ecobatisseur** (chemin).
- Base commune : [`@alphabette/shell`](https://alphabette.fr) — les deux barres du
  haut (écosystème + application), le thème jour/nuit, la densité et le plein écran.

## Démarrer

```powershell
bun install
bun run dev
```

## Structure

```
src/
  main.tsx                      point d'entrée
  App.tsx                       application enveloppée par <AppShell>
  alphabette.app.ts             identité du site (nom, sous-titre, couleur, liens)
  shell/                        base commune @alphabette/shell (générée, à ne pas recoder)
  ecobatisseur/
    EcoBatisseur.tsx            le simulateur : configuration, résultats, plan d'action
    calcul.ts                   moteur de calcul (zones climatiques, formules commentées)
    recommandations.ts          matrice des trois paliers budgétaires (fiches + gains)
    ui.tsx                      petites briques : compteur animé, info-bulles, sliders
    ecobatisseur.css            style (palette dérivée de --ab-*, mobile-first, AAA)
```

## Le simulateur

Trois paramètres (surface de toiture — de 10 à 5 000 m², de la maison à la
copropriété —, zone climatique visuelle, facture mensuelle — jusqu'à 6 000 €/mois)
→ quatre résultats en direct aux nombres animés (production kWh/an, eau de pluie
L/an, économies €/an, amortissement) → un plan d'action en trois paliers
(0 € · < 500 € · > 2 000 €) dont les gains s'adaptent au profil calculé, avec
économie d'échelle sur les coûts de fabrication et de pose (PV dégressif par
paliers, cuve dimensionnée au volume, plafond d'eau adapté au nombre de foyers).

- **Accessibilité** : WCAG AAA visé — contrastes ≥ 7:1 sur les textes, cibles
  tactiles ≥ 44 px, navigation clavier intégrale, info-bulles au clavier (Échap
  pour fermer, texte lu par aria-describedby), zone vive aria-live pour le
  résumé des calculs, respect de prefers-reduced-motion.
- **Aperçu de revue** : `public/apercu-mobile.html` (téléphone 390 px, jour +
  nuit) ; captures `apercu-bureau.png` et `apercu-mobile.png` à la racine.
- **Hypothèses** : voir le bloc « Méthode de calcul » dans l'interface. Le
  simulateur est une boussole citoyenne, pas un devis.

## La base commune

Le contenu de l'application se place à l'intérieur de `<AppShell>` :

```tsx
<AppShell app={APP}>…contenu…</AppShell>
```

L'identité (nom, sous-titre, couleur, compteur, liens) se règle **uniquement**
dans `src/alphabette.app.ts`. Ne pas recoder les barres : elles viennent de la base.

## La copie de la base embarquée

`new:app` copie la dernière version de la base dans `src/shell/` : l'application
est autonome, `bun install && bun run dev` fonctionne immédiatement, sans liaison
locale. Le fichier `src/shell/.shell-version` mémorise la version embarquée.

Pour actualiser la base d'une application existante, depuis le dépôt du hub :

```powershell
bun run sync:shell <chemin-de-cette-application>
```
