# Tunza Business MVP — phase J

## Audit et périmètre

La phase J s’appuie sur l’architecture multipage de la phase I. La recette de phase I est déclarée validée dans un navigateur par le responsable du projet. Avant intervention, `AGENTS.md`, `README.md`, la documentation d’architecture, la configuration de navigation et l’état Git ont été examinés. Les modifications existantes ont été conservées.

La marketplace `commerce.html` affiche des commerces issus de `data.js`, lus par `window.BC` depuis le stockage local ou les données initiales. `app.js` assure ses recherches, filtres et fiches. Ces données ne constituent pas un catalogue de produits commerciaux et ne sont pas réutilisées comme état du MVP.

Tunza Business utilise une page dédiée et un jeu de produits entièrement fictif. Il ne fournit ni compte authentifié, ni paiement, ni commande, ni communication avec une boutique publique. Il ne charge ni `data.js` ni `app.js` et ne modifie pas `window.BC`. Le partage du fil, les fonctionnalités Berceau communautaire, les scénarios Ntani, l’administration et le manifeste d’images restent indépendants.

## Fichiers et dépendances

| Fichier | Responsabilité |
| --- | --- |
| `tunza-business.html` | Page accessible : avertissement permanent, navigation par sections, formulaires, indicateurs et historiques. |
| `tunza-business-model.js` | État mémoire isolé, validations, calculs, produits, mouvements et ventes. Expose `TunzaBusiness.creerGestion()` au navigateur. |
| `tunza-business.js` | Interface : écoute des formulaires, confirmations natives, rendu par nœuds DOM et messages accessibles. Dépend du modèle et du balisage de la page. |
| `tunza-business.css` | Styles propres au MVP, en complément du socle `style.css`. |
| `applications.js` | Destination « Espace commerçant » dans la navigation Tunza. |
| `tools/synchroniser-navigation.cjs` | Synchronisation des liens HTML, y compris ceux de la nouvelle page. |
| `tests/phase-j.cjs` | Tests métier, contrôles d’isolation et simulations d’interactions DOM. Aucun paquet supplémentaire requis. |

La page charge successivement `applications.js`, `navigation.js`, `tunza-business-model.js` et `tunza-business.js`. Les navigations restent accessibles sans JavaScript ; les opérations interactives nécessitent JavaScript et ne sont affichées qu’après initialisation du modèle. Les anciennes URL, notamment `tunza.html#espace-commercant`, restent valides : cette section propose maintenant l’accès au MVP.

## Modèle de données

Chaque appel à `creerGestion()` initialise un jeu indépendant de trois produits fictifs (café, savon et carnet). Aucun état n’est partagé entre onglets ou applications.

- Produit : `id`, `nom`, `categorie`, `prixCentimes`, `quantite`, `description`.
- Vente : `id`, `produitId`, `nomProduit`, `quantite`, `prixUnitaireCentimes`, `totalCentimes`.
- Mouvement : `id`, `produitId`, `nomProduit`, `type`, `quantite`, `stockApres`.

Les identifiants des produits initiaux sont fixes ; les nouveaux objets reçoivent un identifiant séquentiel unique dans le jeu courant. Une modification conserve l’identifiant du produit. La remise à zéro recommence un nouveau jeu fictif et vide les historiques.

Les ventes conservent un instantané du nom et du prix appliqué. Leur historique reste inchangé après modification ou retrait du produit. Les mouvements sont affichés du plus récent au plus ancien ; leurs références indiquent l’ordre local, sans prétendre fournir une date ou une preuve de transaction réelle.

## Règles métier

- Nom obligatoire : 1 à 100 caractères ; catégorie obligatoire : 1 à 60 ; description facultative : 500 maximum. Les espaces extérieurs sont supprimés.
- Prix CDF positif ou nul, avec au maximum deux décimales ; point et virgule sont acceptés. Les notations exponentielles, valeurs infinies et saisies vides sont refusées.
- Stock initial ou corrigé : entier positif ou nul. Mouvement et vente : quantité entière strictement positive.
- Une sortie ou une vente supérieure au stock disponible est refusée sans modification partielle.
- Le stock est faible à **5 unités ou moins**, y compris zéro. La rupture reste distinguée visuellement.
- Une modification manuelle de quantité dans le formulaire produit enregistre un mouvement de correction. Une vente crée une sortie de type `vente` ; elle n’est pas comptée deux fois.
- Le retrait d’un produit et la réinitialisation nécessitent une confirmation explicite native. Le formulaire de vente exige une action « Confirmer la vente fictive » après calcul du total.

Les montants sont stockés en centimes entiers pour éviter les erreurs d’arrondi. Les quantités, produits monétaires et sommes doivent rester dans les limites des entiers sûrs JavaScript. Un dépassement est refusé avant publication du nouvel état. L’affichage utilise `Intl.NumberFormat` en CDF et un découpage entier des centimes, également pour les grands montants. Les entrées invalides produisent des messages français ; le focus rejoint la zone d’erreur.

## Indicateurs et état mémoire

Les cinq indicateurs sont recalculés depuis l’état : nombre de produits, somme des prix actuels multipliés par les stocks actuels, nombre de stocks faibles, somme des montants historiques des ventes et nombre de ventes. Aucun indicateur n’est un chiffre de présentation indépendant des données.

L’interface reçoit des copies des objets métier. Le modèle prépare et valide l’état candidat avant de remplacer l’état courant. Les formulaires restent synchronisés après chaque opération ; les ventes invalides ne disposent pas de bouton de confirmation actif.

Aucune API de stockage ou de réseau n’est utilisée. Quitter ou recharger la page détruit les changements du jeu courant. Le bouton « Réinitialiser la démonstration » remet explicitement les données fictives initiales après confirmation. Les saisies restent du texte grâce à `textContent` et aux propriétés des champs : elles ne sont jamais interprétées comme HTML.

## Vérifications réalisées

Depuis la racine, sans installation de dépendances :

```powershell
node tools/synchroniser-navigation.cjs --check
node tests/phase-i.cjs
node tests/phase-j.cjs
node --check tunza-business-model.js
node --check tunza-business.js
```

La suite de phase I contrôle toujours les liens et ancres locaux, les dépendances de navigation, les filtres marketplace et les six parcours Ntani simulés. La suite J vérifie : champs invalides, identifiants conservés, copies de l’état, entrées et sorties, stocks insuffisants, quantités invalides, devis sans mutation, ventes, historique après changement de prix et retrait, corrections, zéro produit, prix nul, dépassement des limites numériques et réinitialisation.

Les interactions DOM simulées exécutent les gestionnaires réels : ajout de saisies contenant du balisage traité comme texte, recherche et catégorie, erreurs et focus, mouvement de stock, vente, modification du prix, confirmations acceptées ou annulées et remise à zéro. Ces tests ne disposent pas d’un véritable moteur de rendu.

**Recette navigateur à réaliser pour la phase J** : aucun navigateur connecté n’est disponible dans cette session. Vérifier l’affichage à 320, 768 et 1440 pixels, le bandeau permanent, le zoom, la navigation clavier, les annonces de lecteur d’écran, les dialogues de confirmation natifs et les parcours complets depuis Tunza. Vérifier également qu’un rechargement remet le jeu initial, que deux onglets restent indépendants et que la marketplace et les autres applications ne changent pas.

## Évolution future

Ce modèle est une démonstration locale, pas une base de sécurité ou un système comptable. Une évolution réelle nécessiterait une API, une authentification et des autorisations côté serveur, des opérations de stock atomiques, une validation serveur et un historique durable. Aucun de ces services n’est simulé comme disponible dans la phase J. Le suivi fictif Ntani et l’intégration des images restent hors périmètre.
