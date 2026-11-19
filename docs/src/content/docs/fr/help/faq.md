---
title: "FAQ"
description: "Des réponses courtes aux questions qui se posent avant d'adopter la bibliothèque, et en l'utilisant."
---

## Pourquoi aucune dépendance ?

Chaque dépendance est une version à suivre et une porte d'entrée pour une attaque de la chaîne d'approvisionnement. node-comfort ne repose que sur ce que fournit Node.js (`fetch`, `Intl`, `node:crypto`, `node:sqlite`) : l'installer ajoute un seul dossier à `node_modules`, et rien ne s'exécute à l'installation.

## Quel Node.js ?

22.23.4 ou plus en 22, 24.22.1 ou plus en 24, 26.12.1 ou plus. Les versions plus anciennes peuvent planter sur une seule réponse HTTP malveillante. Node.js 23 et 25 ne sont pas pris en charge. Voir [Installation](/).

## CommonJS ou modules ES ?

Les deux donnent les mêmes objets. En modules ES, importez un namespace depuis son point d'entrée (`@ix-xs/node-comfort/str`) pour ne charger que lui. Voir [Votre éditeur](/start/editor/).

## Faut-il TypeScript ?

Non. Les types sont livrés avec le paquet, et les éditeurs les lisent aussi en JavaScript. En TypeScript, tout est typé, jusqu'au type que décrit un schéma.

## Par rapport à plusieurs paquets ?

Un seul paquet couvre un logger, dotenv, une bibliothèque de validation, un client HTTP, les relances et la concurrence, les dates, une boîte à outils CLI, les identifiants et le hachage de mots de passe. Ils suivent les mêmes [conventions](/basics/conventions/) : durées, options en dernier, erreurs avec un `code`. Un paquet dédié à un seul sujet peut aller plus loin sur ce sujet.

## Tout est-il chargé au démarrage ?

Non. Chaque namespace se charge la première fois qu'il sert. [Performances](/help/performance/) donne les chiffres.

## Pourquoi nc.info() affiche-t-il un avertissement ?

C'est un nom de la 2.x. Depuis la 3.0, tout s'appelle `nc.<namespace>.<membre>` : `nc.logger.info()`. Les anciens noms fonctionnent jusqu'à la 4.0 et avertissent une fois. Voir [Passer à la 3.0](/help/upgrade-3-0/).

## Est-ce prêt pour la production ?

La bibliothèque suit le versionnage sémantique : une version mineure ou corrective ne casse jamais du code qui fonctionne, et un nom ne disparaît qu'à une version majeure, après une version où il avertit. Les tests tournent sous Windows, macOS et Linux avec Node.js 22, 24 et 26.

## Où signaler un bug ou un problème de sécurité ?

Un bug ou une question : les [issues](https://github.com/ix-xs/node-comfort/issues), avec les versions de node-comfort et de Node.js et le plus petit code qui le montre. Un problème de sécurité : en privé, par les [GitHub Security Advisories](https://github.com/ix-xs/node-comfort/security/advisories/new). Voir aussi [Dépannage](/help/troubleshooting/).
