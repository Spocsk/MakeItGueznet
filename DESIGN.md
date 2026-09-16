---
name: MakeItGueznet
description: Un match de salon affiché sur jumbotron LED, avec vos images et vos GIF.
colors:
  stad: "#0a0c10"
  stad-mid: "#141820"
  stad-lit: "#1c2430"
  scanline: "#10151c"
  bezel: "#12151b"
  module: "#12171f"
  phos: "#e8edf2"
  ink: "#0a0c10"
  live: "#c8f542"
  live-deep: "#9bc41f"
  amber: "#f5c518"
  err: "#ff8a8a"
typography:
  display:
    fontFamily: "Oswald, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Oswald, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "normal"
  title:
    fontFamily: "Oswald, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "normal"
  body:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.08em"
  note:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  timer:
    fontFamily: "Oswald, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.1rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.06em"
  nav:
    fontFamily: "Oswald, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
  ranking:
    fontFamily: "Oswald, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.03em"
  stamp:
    fontFamily: "Oswald, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.08em"
rounded:
  none: "0px"
spacing:
  room: "3.6rem 1rem 2.4rem"
  press: "0.7rem 1.2rem"
  tick: "0.18rem 0.5rem"
  gap: "0.65rem"
  scene: "56rem"
components:
  button-primary:
    backgroundColor: "{colors.phos}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.press}"
  button-primary-hover:
    backgroundColor: "color-mix(in srgb, #e8edf2 82%, #0a0c10)"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.press}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.phos}"
    rounded: "{rounded.none}"
    padding: "0.7rem 0.4rem"
  live-tick:
    backgroundColor: "{colors.live}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.tick}"
  chip:
    backgroundColor: "color-mix(in srgb, #e8edf2 12%, transparent)"
    textColor: "{colors.phos}"
    rounded: "{rounded.none}"
    padding: "0.28rem 0.7rem"
  chip-on:
    backgroundColor: "{colors.phos}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.28rem 0.7rem"
  jumbotron:
    backgroundColor: "{colors.bezel}"
    textColor: "{colors.phos}"
    rounded: "{rounded.none}"
    padding: "3.1% 4.5% 5.2%"
    width: "{spacing.scene}"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.phos}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.15rem"
  field-code:
    backgroundColor: "transparent"
    textColor: "{colors.amber}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.15rem"
  nav-mini:
    backgroundColor: "{colors.stad}"
    textColor: "{colors.phos}"
    rounded: "{rounded.none}"
    padding: "0.4rem 0.75rem"
---

# Design System: MakeItGueznet

## Overview

**Creative North Star: "Le jumbotron de salon"**

MakeItGueznet se joue comme un match affiché. Le stade est noir scanliné ; le mème occupe l’écran LED 16/10 au centre, punchline en overlay phosphor, round et scores sur le bandeau LIVE. Une gravité par écran. Le chrome recule : prénom, code ambre, un bouton LIVE. Pas de table vintage, pas de Polaroid, pas de landing Play + cartes.

La densité est celle d’un tableau de score condensé, pas d’un dashboard. Téléphone et laptop partagent le même stade. Les classnames `polaroid-*` du code sont des alias de tests ; la forme livrée est un jumbotron (bezel smoked + plaque LED).

**Key Characteristics:**
- Stade scanliné, phosphor, lime LIVE seulement sur le tick, ambre pour code et timer
- Jumbotron 16/10, overlay Oswald, nameplate freeze, tampon ENVOYÉ
- Oswald condensé pour le scoreboard ; Bricolage Grotesque pour le corps
- Motion slam (`cubic-bezier(0.16, 1, 0.3, 1)`), pas de bounce élastique
- Confettis dans la palette stade (lime, ambre, phosphor), jamais d’arc-en-ciel

## Colors

Un stade presque noir, un phosphor froid, deux accents rares et assignés.

### Primary
- **Phosphor**: texte, overlay de légende, bouton principal, chips allumés, nameplate freeze. C’est la lumière de l’écran, pas un fond de page.
- **Ink**: encre sur phosphor (bouton, tick, nameplate, tampon). Même valeur que le stade.

### Secondary
- **Live**: lime du tick `.live-tick` uniquement. Jamais un fill de nav, jamais un bouton d’action, jamais un fond.
- **Live deep**: bit de confetti et lime assombrie ; pas un hover de bouton.

### Tertiary
- **Amber**: code de salle, timer, positions de ranking, étoiles allumées, tampon ENVOYÉ, hover ghost, caret. Roster et horloge, pas chrome décoratif.

### Neutral
- **Stad**: fond de salle, bandeau nav.
- **Stad mid / Stad lit**: rainure, scrollbar, selects.
- **Scanline**: filet 1px dans le repeating-gradient du stade.
- **Bezel**: châssis du jumbotron (asset `bezel.png` sur ce fond).
- **Module**: drop zone, thumbs, cartes bibliothèque.
- **Err**: messages d’erreur.

### Named Rules
**The Live Tick Rule.** Le lime n’apparaît que sur `.live-tick`. Un audit visuel : si une barre, un bouton ou un titre est lime, c’est hors système.

**The Amber Roster Rule.** L’ambre porte les digits (code, timer, rang, score). Il ne peint pas les fonds.

## Typography

**Display Font:** Oswald (ui-sans-serif, system-ui)
**Body Font:** Bricolage Grotesque (ui-sans-serif, system-ui)

**Character:** Oswald condensé et uppercase tient le tableau — titre, overlay, prénoms roster, code. Bricolage Grotesque tient les phrases : notes, réglages, sous-titres.

### Hierarchy
- **Display** (Oswald 800, 2.4rem / 1.85rem sous 640px, line-height 0.95, tracking 0.02em, uppercase): titres de phase (`MakeItGueznet`, `Tes fichiers`).
- **Headline** (Oswald 800, 1.7rem / 1.35rem mobile, line-height 1.05, uppercase): overlay `NOW PLAYING`, légendes, champs sur l’écran.
- **Title** (Oswald 800, 1.15rem): nameplate freeze, coins phosphor sur ink.
- **Body** (Bricolage 400, 1.05rem, line-height 1.45): sous-titres, notes de responsabilité.
- **Label** (Bricolage, 0.82rem, tracking 0.08em, uppercase): réglages hôte, têtes de source.
- **Timer** (Oswald 800, 2.1rem en phase / 1.05rem dans le bandeau, tabular-nums, ambre).
- **Nav** (Oswald 700, 0.8rem, tracking 0.08em, uppercase).

### Named Rules
**The Scoreboard Voice Rule.** Ce qui s’affiche sur l’écran ou le bandeau LIVE est Oswald uppercase. Bricolage ne légende pas le mème.

## Layout

Colonne centrée sur le stade. Padding de salle `3.6rem 1rem 2.4rem`. Premier viewport : tick LIVE, titre, jumbotron `min(100%, 56rem)`, prénom, code ambre, bouton LIVE ; secondaire (nouvelle salle, bibliothèque) sous le pli. Copy `min(100%, 28rem)` ; formulaire d’accueil `24rem` ; sources, lobby, bibliothèque `26rem` ; éventail scores jusqu’à `40rem`. Groupes serrés (`0.65rem`), une gravité. Mobile ≤640px : mêmes colonnes, display et overlay d’un cran plus petits. Grille bibliothèque 2 colonnes.

### Named Rules
**The One Gravity Rule.** Un objet mène l’écran — le jumbotron. Le bandeau annote ; il ne concurrence pas.

## Elevation & Depth

Tonal layering dans le stade (scanlines, modules un cran plus clairs). Une seule ombre structurelle : le jumbotron suspendu. Pas d’ombre néobrutaliste 0-blur, pas de halo lime.

### Shadow Vocabulary
- **Jumbotron** (`box-shadow: 0 28px 64px rgba(0, 0, 0, 0.58)`): le bezel au centre.
- **Overlay punchline** (`text-shadow: 2px 2px 0 #000, -1px -1px 0 #000`): lisibilité sur le média.
- **Well fade** (`linear-gradient(transparent, rgba(0, 0, 0, 0.55))` sur 42% bas): assombrit le LED pour l’overlay.

### Named Rules
**The Suspended Screen Rule.** Seul le jumbotron porte une ombre portée. Thumbs et modules restent plats, bordure phosphor 12%.

## Shapes

Coins à 0 partout. Le jumbotron est un rectangle TV smoked, pas une carte UI. Pas de pills, pas de glass. Champs : soulignement 2px, pas de boîte. Focus : contour phosphor 2px, offset 3px. Drop : tirets phosphor 45% sur module. Well héro : `aspect-ratio: 16 / 10`.

### Named Rules
**The Square Cut Rule.** Radius 0. Si un contrôle s’arrondit, il sort du stade.

## Components

### Buttons
- **Shape:** rectangle 0 radius.
- **Primary:** phosphor sur ink, padding `0.7rem 1.2rem`, Oswald 700 uppercase tracking `0.04em`, press scale 0.97 en 120ms.
- **Hover:** phosphor mélangé 82% au stade.
- **Ghost:** transparent, souligné, hover ambre.

### Chips
- **Style:** phosphor 12% sur stade ; `.on` = phosphor plein, ink.
- **State:** filtres catalogue, actualiser. Press scale 0.97.

### Cards / Containers
- **Jumbotron:** bezel `bezel.png` sur chassis, padding `3.1% 4.5% 5.2%`, well `led-plate.png` 16/10, overlay bas, nameplate haut-gauche au freeze.
- **Modules:** fond module, bordure phosphor 12% (thumbs, drop, cartes).
- **Réglages hôte:** phosphor 7% + bordure 10%, pas un panneau dashboard.

### Inputs / Fields
- **Style:** transparent, soulignement phosphor 35%, Oswald 800 1.7rem uppercase, caret ambre.
- **Code:** `.field-on-table` — ambre, tracking `0.18em`, tabular-nums.
- **Focus:** outline phosphor 2px / offset 3px (global `:focus-visible`).

### Navigation
- Bandeau fixe stade, filet phosphor 12% sous la barre. Tick lime à gauche ; round, timer ambre, ranking live, code ambre, lien bibliothèque. Hover des liens : underline phosphor. Hover du tick : brightness 1.06, pas de underline.

### Jumbotron (signature)
- Well LED 16/10 ; overlay Oswald au bas ; nameplate freeze (phosphor, slam 220ms) à la révélation d’auteur ; tampon ENVOYÉ ambre après légende ; scan d’attente (`led-scan` 1.1s) quand le média n’est pas là. Classe de test `data-testid="polaroid"` : alias, pas la forme.

### Motion
- Press 120ms, état 220ms, phase 420ms, ease-slam `cubic-bezier(0.16, 1, 0.3, 1)`.
- `prefers-reduced-motion` : plus de translations, de scan, ni de confettis ; couleur et opacité restent.

## Do's and Don'ts

### Do:
- **Do** laisser le mème 16/10 occuper le centre ; le bandeau LIVE annote round, timer et scores.
- **Do** poser la punchline en overlay Oswald sur le well, avec le fade bas et le text-shadow noir.
- **Do** réserver le lime au tick LIVE et l’ambre aux digits (code, timer, rang).
- **Do** servir un poster pour les thumbs ; le GIF animé seulement sur le jumbotron héro.

### Don't:
- **Don't** repeindre la nav en lime, ni faire du bouton principal un fill LIVE.
- **Don't** restaurer Polaroid (bande blanche, well 1:1, Caveat, table noyer).
- **Don't** arrondir le bezel ni poser une ombre 4px 4px 0.
- **Don't** animer width/height/left ; pas de bounce élastique par réflexe.
- **Don't** ajouter pièces, XP, badges, ou chrome casino.
