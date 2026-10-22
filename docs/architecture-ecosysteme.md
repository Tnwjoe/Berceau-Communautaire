# Architecture de l’écosystème Berceau communautaire — phase I

## Périmètre

Cette section décrit la livraison historique de phase I. La refonte Ntani ultérieure conserve les scénarios mais ajoute carte, registre local documenté, administration dédiée et préparation en six étapes ; voir [l’architecture Ntani actuelle](ntani.md). Les requêtes cartographiques démarrent uniquement après activation explicite. Les autres applications ne changent pas de domaine métier.

Un seul dépôt et un seul serveur statique hébergent trois applications multipages en HTML, CSS et JavaScript vanilla. Les URL existantes sont conservées. Aucun backend, compte utilisateur, nouvelle transmission réseau ou nouvelle persistance n’est introduit. L’administration ne figure dans aucune navigation publique. Son absence de lien ne protège pas son URL directe ; cette phase ne modifie pas son hébergement.

## Responsabilités

| Application | Pages | Fonctionnalités |
| --- | --- | --- |
| Berceau communautaire | `index.html`, `actualites.html`, `article.html`, `Prof.html`, `form.html` | Accueil communautaire, fil et actualités, annuaire, formulaire de démonstration. |
| Tunza | `tunza.html`, `commerce.html`, `tunza-business.html` | Accueil autonome, marketplace existante et MVP commerçant fictif indépendant ajouté en phase J. |
| Ntani | `ntani.html` | Accueil, démonstration inchangée, informations utiles et annonce du futur suivi fictif. |

`profil.html` conserve sa redirection vers `Prof.html`. Les articles conservent `article.html?id=…`. Aucun fichier historique n’a été déplacé, renommé ou réactivé.

La section historique `tunza.html#espace-commercant` donne désormais accès à `tunza-business.html`. Ce MVP de phase J propose produits, stock et ventes fictives en mémoire, sans compte ni transmission. Son modèle est indépendant de `data.js` et de la marketplace ; voir [la documentation dédiée](tunza-business.md). Le suivi fictif (`ntani.html#ntani-tracking`) reste annoncé comme **à venir**, sans dossier ni formulaire de transmission.

## Déclarations et fichiers partagés

- `data-app` sélectionne l’application : `bomoko`, `tunza` ou `ntani`. Il porte aussi les variantes CSS d’identité.
- `data-page` conserve sa valeur et son rôle métier : `home`, `news`, `article`, `directory`, `shops` ou `ntani`. La nouvelle page Tunza utilise `tunza-home` sans charger le moteur métier.
- `applications.js` expose `window.BOMOKO_APPLICATIONS` : noms, marques, signatures, accueils et destinations internes. Les entrées `pages` associent notamment les articles au menu Communauté ; `aVenir` ajoute un statut explicite.
- `navigation.js` applique cette configuration aux deux menus et actualise leurs états actifs. Il gère uniquement la navigation, le sélecteur d’écosystème et l’état visuel de l’en-tête.
- `style.css` conserve le socle Light Premium. Les couleurs d’accent propres à Tunza et Ntani sont limitées aux éléments portant `data-app` ; les composants métier ne sont pas reconstruits.
- `data.js` conserve l’interface `BC` et ses clés de stockage. Aucun changement de format ou migration n’est effectué.
- `app.js` conserve le fil, ses interactions et son partage existant, les articles, annuaires et fiches. Seul le comportement d’en-tête est transféré vers `navigation.js`.
- `ntani.js` est conservé à l’identique, avec ses six scénarios, validations, cinq étapes et rejeu.

Les pages métier chargent `data.js`, puis `app.js`, puis `applications.js` et `navigation.js`. Ntani charge `applications.js`, `navigation.js`, puis `ntani.js`. L’accueil Tunza et le formulaire chargent uniquement les scripts dont ils ont besoin. L’administration garde ses propres dépendances.

Le manifeste visuel de la phase H et sa documentation restent inchangés et ne sont pas chargés par ces modules.

## Navigation et accessibilité

Chaque marque renvoie à l’accueil de son application. Le menu interne contient uniquement ses destinations. Le sélecteur natif `details` « Écosystème Berceau communautaire » donne accès aux trois accueils depuis chaque page publique. Il fonctionne sans JavaScript ; avec JavaScript, Échap le ferme et replace le focus sur son résumé.

Les liens sont présents dans le HTML avant l’exécution des scripts. Sur écran étroit, une barre fixe reprend les destinations internes ; le sélecteur d’écosystème reste dans l’en-tête. La barre s’affiche jusqu’à 1100 pixels pour éviter de comprimer les menus. Les pages réservent l’espace nécessaire en bas, y compris pour la zone sûre du téléphone.

Avec JavaScript, un fragment reconnu prend priorité sur l’accueil : `#ntani-flow`, `#ntani-tracking` et `#ntani-advice`. `aria-current="location"` indique la section ; `aria-current="page"` indique la page. L’espace commerçant pointe désormais vers sa page dédiée ; son ancien fragment reste accessible. Sans JavaScript, les liens fonctionnent mais l’indicateur actif reste celui de la page, sans suivi dynamique des fragments. Un lien d’évitement rejoint le contenu principal et les contrôles disposent d’un état de focus visible.

## Maintenir les liens HTML de repli

Après modification de `applications.js`, exécuter depuis la racine :

```powershell
node tools/synchroniser-navigation.cjs
node tools/synchroniser-navigation.cjs --check
```

Cet outil local sans dépendance synchronise les en-têtes, les deux menus, les attributs `data-app`, le lien d’évitement et le chargement de la configuration. Il ne touche pas aux contenus métier ni aux sauvegardes. Le mode `--check` ne modifie aucun fichier et échoue si les pages sont désynchronisées. Pour ajouter une page publique, la déclarer dans sa table `pages`, préciser son application et son éventuel rattachement dans `applications.js`, puis vérifier les liens et le chargement des scripts.

Les chemins restent relatifs et respectent la casse, notamment `Prof.html`. Ne pas ajouter l’administration au sélecteur ni aux menus.

## Vérifications de cette livraison

Commandes reproductibles avec Node.js, sans installation de paquet :

```powershell
node tools/synchroniser-navigation.cjs --check
node tests/phase-i.cjs
node --check applications.js
node --check navigation.js
node --check app.js
```

Les vérifications statiques contrôlent les cibles locales et ancres écrites dans les pages, l’ordre de chargement de la configuration, les deux menus de repli et l’absence de lien administratif dans les pages publiques de l’écosystème.

Les simulations exécutent les scripts réels avec un DOM minimal en mémoire : navigation des trois applications, marque et destination active, filtres de la marketplace (recherche, combinaison, absence de résultat, catégorie et réinitialisation), puis six parcours Ntani avec sélection obligatoire, choix du lieu, récapitulatif, retour et rejeu. Aucun stockage réel ni envoi n’est utilisé par ces tests.

**Ce ne sont pas des tests dans un navigateur.** Aucun navigateur connecté n’était disponible pendant cette livraison. Le rendu ordinateur/mobile, les contrastes rendus, le zoom, les comportements natifs de `details`, le focus au clavier, les fenêtres commerciales et professionnelles, le compositeur et les interactions du fil doivent encore être vérifiés dans un véritable navigateur. Le partage ne doit pas être déclenché vers un destinataire lors d’un simple contrôle de régression.

Par comparaison d’empreintes avec le début de la phase, les données, le moteur Ntani, l’administration, les anciens scripts, la redirection de profil, les sauvegardes et les fichiers visuels sont préservés. Les contenus métier des pages restent en place.

## Extensions ultérieures

Le MVP commerçant de phase J reste local et isolé en mémoire. Le suivi fictif Ntani demande une phase distincte avant développement. Une future API devra adapter les consommateurs synchrones de `BC` et le modèle Business, prévoir chargement et erreurs, puis traiter authentification réelle, autorisations et validation côté serveur. La séparation actuelle est une organisation d’interface ; elle ne fournit pas une isolation de sécurité entre applications de même origine.

La génération et l’intégration des photographies restent indépendantes de cette phase. Aucun fichier image ni accès au manifeste n’est ajouté.
