---
title: "FAQ"
description: "Des réponses courtes aux questions qui se posent avant de commencer, et pendant que vous développez."
sidebar:
  order: 7
---

## Avant de commencer

### Pourquoi zéro dépendance ?

Chaque paquet installé est une version à suivre, un journal des modifications
à lire, et une porte d'entrée pour une attaque de la chaîne
d'approvisionnement. node-comfort ne s'appuie que sur ce que fournit Node.js
(`fetch`, `Intl`, `node:crypto`, `node:sqlite`) : l'installer ajoute un seul
dossier à `node_modules`, et rien ne s'exécute à l'installation.

### Quelle version de Node.js faut-il ?

22.23.4 ou ultérieure sur Node.js 22, 24.22.1 ou ultérieure sur Node.js 24, ou
26.12.1 ou ultérieure. Les versions plus anciennes peuvent être plantées par une
seule réponse HTTP malveillante, ce qu'aucun paquet ne peut empêcher. Node.js 23
et 25 ne sont pas pris en charge.

### CommonJS ou modules ES ?

Les deux. `require("@ix-xs/node-comfort")` et `import nc from "@ix-xs/node-comfort"`
donnent le même objet. En modules ES, importez un seul espace de noms
(`@ix-xs/node-comfort/str`) pour ne charger que ce que vous utilisez. Voir
[Installation](/start/installation/#commonjs-es-modules-and-typescript).

### Faut-il TypeScript ?

Non. Le paquet est écrit en JavaScript et fournit ses types : votre éditeur
complète et vérifie votre code en JavaScript aussi. En TypeScript, tout est
typé, jusqu'au type que décrit un schéma. Voir [Votre éditeur](/start/editor/).

## À l'usage

### Comment se compare-t-il à plusieurs paquets installés ?

Un paquet en remplace une douzaine : un logger, dotenv, une bibliothèque de
validation, un client HTTP, de quoi réessayer et limiter la concurrence, une
bibliothèque de dates, une boîte à outils CLI, des générateurs d'identifiants,
le hachage de mots de passe. Ils sont pensés ensemble : une durée s'écrit
toujours `"5m"` ou en millisecondes, les options viennent toujours en dernier,
chaque erreur a un `code` stable. Un paquet spécialisé peut aller plus loin sur
son seul sujet ; l'[Introduction](/#what-is-inside) liste ce que couvre chaque
espace de noms.

### Charge-t-il tout au démarrage ?

Non. Charger le paquet prend environ 4 ms, et chaque espace de noms se charge à
sa première utilisation. Les chiffres se trouvent sur la page
[Performances](/help/performance/).

### Est-il prêt pour la production ?

Il suit la gestion sémantique de version : une version mineure ou corrective ne
casse jamais votre code. Il a plus de cinq cents tests, lancés sous Windows,
macOS et Linux avec Node.js 22, 24 et 26, et chaque exemple de ce guide est
exécuté à la construction du site.

### Je passe d'une version plus ancienne

[Passer à la 2.2](/help/upgrade-2-2/) liste ce qui a changé, et
[Migration](/help/migration/) couvre le passage depuis la 1.x.

## Obtenir de l'aide

### Comment signaler un problème de sécurité ?

En privé, avec les
[GitHub Security Advisories](https://github.com/ix-xs/node-comfort/security/advisories/new),
jamais dans une issue publique. Donnez la version concernée et, si vous le
pouvez, une reproduction courte.

### Où signaler un bug ou poser une question ?

Dans les [issues](https://github.com/ix-xs/node-comfort/issues) du dépôt.
Donnez la version de node-comfort et de Node.js, et le plus petit code qui
montre le problème.
