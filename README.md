# Berceau communautaire

Berceau communautaire est un prototype communautaire statique en HTML, CSS et JavaScript : actualités, échanges de quartier, annuaire professionnel, commerces Tunza et simulation Ntani. Aucune compilation ni backend n’est nécessaire.

Le nom public officiel est **Berceau communautaire**. Les identifiants techniques `bomoko`, `data-app="bomoko"` et `window.BOMOKO_APPLICATIONS`, ainsi que le dossier `assets/images/bomoko/`, sont conservés pour préserver les dépendances et les chemins existants. Ils ne désignent pas une marque publique. Les clés de stockage, les données métier et les sauvegardes historiques restent inchangées. Tunza et Ntani conservent leur identité propre.

La phase I organise ce prototype en trois applications reliées : **Berceau communautaire** (`index.html`), **Tunza** (`tunza.html`) et **Ntani** (`ntani.html`). Chacune dispose de sa marque et de sa navigation interne, ainsi que d’un accès « Écosystème Berceau communautaire ». Voir [l’architecture de l’écosystème](docs/architecture-ecosysteme.md) pour les conventions, dépendances, extensions et limites de vérification.

## Lancement

Avec Python 3 installé, exécuter à la racine :

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Ouvrir http://localhost:8000/index.html ; arrêter avec Ctrl+C. Un serveur statique d’éditeur convient également. Aucun serveur JSON ni installation npm n’est nécessaire. Utiliser HTTP pour une origine stable du stockage local et des images. Les polices Google Fonts et les icônes Font Awesome externes nécessitent Internet.

## Architecture

| Fichiers | Responsabilité |
| --- | --- |
| `index.html` | Accueil et aperçus des contenus. |
| `actualites.html` | Fil communautaire et compositeur de démonstration. |
| `article.html` | Lecture d’un article via le paramètre `?id=…`. |
| `commerce.html` | Commerces Tunza, filtres et fiches. |
| `tunza.html` | Accueil autonome de Tunza et accès à Tunza Business. |
| `tunza-business.html`, `tunza-business-model.js`, `tunza-business.js`, `tunza-business.css` | MVP commerçant local : produits, stock, ventes fictives et indicateurs ; état mémoire distinct de la marketplace. Voir la documentation de phase J. |
| `Prof.html` | Annuaire professionnel ; respecter la majuscule du chemin. |
| `profil.html` | Redirection de l’ancienne adresse vers `Prof.html`. |
| `data.js` | Données initiales et interface globale `window.BC`, partagée entre affichage public et administration. |
| `app.js` | Affichage public, filtres, fiches et simulation communautaire ; dépend de `data.js` et du balisage des pages. Le module est choisi via `body.dataset.page`. |
| `navigation.js` | Navigation publique commune sur ordinateur et mobile. |
| `applications.js` | Configuration centralisée des trois marques, accueils et menus internes. |
| `tools/synchroniser-navigation.cjs` | Outil local Node.js synchronisant les liens HTML de repli avec la configuration ; mode `--check` sans écriture. |
| `tests/phase-i.cjs` | Vérifications statiques et simulations DOM de navigation, marketplace et parcours Ntani ; ne remplace pas un navigateur. |
| `tests/phase-j.cjs` | Tests métier et interactions DOM simulées du MVP commerçant, sans stockage ni réseau. |
| `tests/phase-2.cjs` | Non-régression du stockage local, encodage HTML/URL, validation et opérations administratives, auteurs/catégories, modales et formulaire ; dépend uniquement de Node.js et exécute les scripts réels avec un stockage et un DOM simulés. |
| `ntani.html`, `ntani.js`, `ntani.css` | Interface propre à Ntani, carte/liste et parcours historique conservé en cinq étapes ; scénarios partagés avec la préparation en six étapes. |
| `ntani-stations-data.js`, `ntani-stations.js` | Première référence documentaire UNIKIN fournie au projet, schéma et registre local versionné ; aucun poste fictif. |
| `ntani-map.js`, `ntani-directory.js` | Leaflet chargé sur action, fond OpenStreetMap, boucliers simples, liste de secours, fiches et géolocalisation facultative après accord. |
| `ntani-report.js` | Préparation en six étapes et photo locale ; aucun envoi ni stockage du brouillon. |
| `ntani-admin.html`, `ntani-admin.js` | Gestion locale des postes, visibilité, deux numéros, provenance et correction manuelle de position ; aucun accès authentifié. |
| `tests/ntani.cjs` | Validation du registre et tests des gestionnaires avec DOM/Leaflet/géolocalisation/images simulés ; sans réseau ni navigateur réel. |
| `form.html` | Formulaire avec confirmation locale, sans envoi. |
| `admin.html`, `admin.js`, `admin.css` | Administration de démonstration, dépendant de `data.js` et `style.css`. |
| `style.css` | Styles publics partagés et adaptation aux tailles d’écran. |
| `script.js`, `commerce.js`, `profil.js`, `style2.css` | Fichiers historiques non chargés par les pages actuelles ; vérifier les usages avant réutilisation ou suppression. |
| `backup-mission2-2026-10-16/` | Sauvegarde de travail, distincte des sources exécutées à la racine. |
| `AGENTS.md` | Consignes de développement et de documentation dès la phase H. |

Les pages publiques utilisant `app.js` chargent `data.js`, puis `app.js`, puis `applications.js` et `navigation.js`. L’administration générale charge `data.js` avant `admin.js`. Ntani reste indépendant de `app.js` et `data.js` : après la navigation et les scénarios historiques, il charge les références documentaires, le registre, l’adaptateur cartographique, la consultation et la préparation. L’administration Ntani charge les références, le registre, la carte et son interface dédiée. L’accueil Tunza utilise seulement `applications.js` et `navigation.js`. Les liens restent utilisables sans JavaScript ; l’identité dépend de `data-app`, tandis que `data-page` garde son rôle métier.

La [documentation Ntani](docs/ntani.md) décrit les dépendances, le schéma du registre, les deux numéros de contact, la source UNIKIN, les précautions de cartographie/géolocalisation, le parcours en mémoire et la recette restante. Accès : `ntani.html` pour consulter ; depuis `admin.html`, « Postes Ntani · registre local » ouvre `ntani-admin.html`. La nouvelle clé `ntani.stations.v1` ne modifie aucune collection historique. Une clé absente affiche la référence UNIKIN fournie ; une liste volontairement vide reste vide. L’administration permet alors un réimport explicite de cette référence sans écraser les autres postes.

La carte charge Leaflet 1.9.4 depuis unpkg avec contrôle d’intégrité, puis les tuiles OpenStreetMap, uniquement après activation. La liste fonctionne si la carte échoue. Les champs géographiques ne sont pas déduits d’une adresse. Les coordonnées UNIKIN et la source sont celles communiquées par le responsable du projet, avec une vérification documentaire au 22 octobre 2026 ; la confirmation officielle des coordonnées et des contacts reste en attente. Les deux numéros sont vides au départ, et seuls des numéros syntaxiquement valides produisent des liens `tel:`. Ces liens ne sont pas présentés comme des lignes d’urgence officielles. Aucun autre poste ni aucune barrière n’est inventé.

Après modification de la configuration, lancer `node tools/synchroniser-navigation.cjs`, puis `node tools/synchroniser-navigation.cjs --check`. Exécuter `node tests/phase-i.cjs` pour les contrôles statiques et les simulations. Node.js est requis pour ces outils de développement, sans installation npm ; le serveur du site reste statique. Les contrôles visuels et clavier dans un véritable navigateur restent à réaliser, aucun navigateur connecté n’étant disponible pendant la phase I.

La recette navigateur de phase I a depuis été déclarée validée par le responsable du projet. Pour la phase J, ouvrir `tunza-business.html` depuis l’espace commerçant de Tunza et lancer `node tests/phase-j.cjs`. La recette navigateur de cette nouvelle page reste à réaliser. Voir [Tunza Business — phase J](docs/tunza-business.md) pour le modèle, les règles et le plan de vérification.

## Données et limites

`BC.get(cle)` lit les tableaux `professionals`, `commerces` et `news` dans `localStorage`. Seule une clé absente (`null`) affiche une copie des exemples, sans écriture automatique. Un tableau vide reste vide. Les objets doivent avoir un identifiant numérique entier sûr ou textuel non vide, unique dans la collection, et un nom ou titre non vide. Les champs métier présents sont des chaînes, `certified` est un booléen facultatif et les horodatages facultatifs sont des dates interprétables. Les champs inconnus sont conservés ; les anciens objets sans champs facultatifs restent acceptés.

Une collection illisible ou partiellement invalide affiche seulement ses éléments valides et un avertissement, sans remplacer ni supprimer la valeur originale. Elle reste en lecture seule pour empêcher une sauvegarde de perdre les éléments non affichables. Un stockage inaccessible affiche une liste vide avec avertissement, sans substituer des exemples. `BC.status(cle)` expose l’état de la dernière lecture et `BC.showStorageStatus()` affiche les avertissements en texte dans la page. La récupération de données invalides nécessite une intervention explicite après sauvegarde de la valeur originale ; aucun nettoyage automatique n’est effectué.

`BC.save(cle, valeur)` renvoie `{ ok: true }` ou `{ ok: false, error: message }`. Les consommateurs doivent vérifier ce résultat avant d’annoncer un succès ou de fermer un formulaire. La validation, les refus d’accès et les quotas produisent des erreurs explicites. La comparaison avec la valeur lue empêche l’écrasement d’un changement intervenu entre lecture et sauvegarde, mais ne constitue pas une transaction multiutilisateur. Les trois clés, les identifiants et les champs supplémentaires existants sont préservés. `BC.esc` échappe le HTML ; les identifiants d’articles sont aussi encodés dans les URL avant interpolation.

L’administration conserve la saisie si la validation ou la sauvegarde échoue. Les dates d’actualités acceptent `AAAA-MM-JJ` ou une date française complète ; le tableau de bord choisit la plus récente par date de publication, indépendamment de l’ordre du tableau. Les opérations administratives ajoutent `updatedAt` et, pour les nouveaux objets, `createdAt` au format ISO. Les anciens commerces sans horodatage ne sont pas présentés comme une activité récente datée. Les statuts de certification restent exclusivement des indicateurs de démonstration.

L’administration ne dispose pas d’authentification ; les données ne sont pas partagées entre appareils. Les statuts de certification sont des indications de démonstration sans vérification réelle. Les contenus et contacts comportent des exemples, sans garantie d’actualité locale.

Le compositeur communautaire ne publie ni n’enregistre son aperçu. Le fil conserve l’auteur et la catégorie de chaque actualité ; ses interactions restent simulées. Ntani ne transmet aucun signalement et ne contacte aucun service. Le formulaire annonce avant et après validation qu’aucun message n’est envoyé ; il ne réinitialise pas les champs. Cette saisie reste uniquement dans la page et peut être perdue à sa fermeture ou à son rechargement. Tunza ne propose ni achat ni paiement en ligne. Un lien d’appel peut être proposé lorsqu’un numéro exploitable est fourni.

Les fiches professionnelles et commerciales ainsi que la modale administrative disposent d’un nom accessible, d’une boucle de tabulation, d’une fermeture par Échap et d’une restitution du focus. Les styles de la fiche commerce restent limités à sa variante, indépendamment des attributs ARIA. Sur petit écran, le nom complet et le sélecteur d’écosystème peuvent revenir à la ligne sans changer les couleurs ni la typographie.

Pour vérifier la phase 2 : `node tests/phase-2.cjs`, `node tests/phase-i.cjs`, `node tests/phase-j.cjs` et `node tools/synchroniser-navigation.cjs --check`, puis `node --check` sur les scripts modifiés. Ces tests n’utilisent jamais le stockage du navigateur. Ils contrôlent les erreurs de stockage, collections vides/invalides, compatibilité, conflits entre onglets, charges HTML/URL hostiles, opérations administratives et échecs, dates, auteurs/catégories, focus et absence d’envoi du contact. Ils n’interprètent pas le HTML et ne vérifient aucun rendu visuel. La recette navigateur à 320, 375, 768 et 1440 pixels, le zoom et les lecteurs d’écran restent à réaliser : aucun navigateur connecté ou intégré n’est disponible pendant cette phase.

Tunza Business dispose de son propre jeu de produits fictifs, uniquement en mémoire dans la page. Il n’utilise ni `window.BC` ni le stockage de la marketplace. Ajout et modification de produits, mouvements et ventes fictives actualisent les indicateurs ; les ventes gardent leur prix historique. Le seuil de stock faible est de 5 unités ou moins. Retrait et réinitialisation demandent confirmation ; un rechargement remet aussi le jeu initial. Aucun compte authentifié ni boutique publique n’est modifié.

Pour réinitialiser les collections, supprimer uniquement les clés `professionals`, `commerces` et `news` dans le stockage local de l’origine utilisée, via les outils de développement du navigateur. Cela supprime les modifications locales de ces collections.

## Évolution vers un backend

La couche `BC.get` / `BC.save` constitue le point de départ pour remplacer le stockage local par une API persistante. Ses consommateurs synchrones dans `app.js` et `admin.js` devront alors gérer des appels asynchrones, les états de chargement et les erreurs.

Une application réelle devra développer l’authentification, les autorisations côté serveur, la validation des données et la modération. La publication communautaire, les signalements Ntani et l’envoi du formulaire nécessitent des services encore absents. Les statuts vérifiés devront provenir d’un processus réel.

## Illustrations et manifeste visuel

Le [manifeste centralisé](assets/images/bomoko/manifest.json) décrit les 12 illustrations officielles de la phase H. La [documentation des illustrations](assets/images/bomoko/README.md) précise les champs, les conventions, le remplacement neutre et les procédures d’ajout ou de remplacement. Les 12 photographies restent à générer : toutes les entrées sont indisponibles et aucun fichier image vide n’est créé. Aucun module ne charge encore ce manifeste ; son intégration attend la validation du responsable du projet.

Indépendamment du manifeste, les commerces peuvent fournir un champ facultatif `image`. La fonction `localImagePath` de `app.js` accepte uniquement les URL de même origine dont le chemin se termine par `avif`, `gif`, `jpg`, `jpeg`, `png` ou `webp`. Sans chemin accepté, une icône symbolique est affichée. Les SVG intégrés au code sont distincts de ces illustrations.

Les dimensions et la provenance détaillée seront documentées après réception des fichiers réels. Toute future intégration devra respecter les états de disponibilité et la procédure décrite dans le dossier des illustrations.

## Contribution

1. Lire `AGENTS.md` et ce README, puis lancer le prototype.
2. Identifier la page, les scripts et les dépendances concernés. Examiner les modifications en cours sans les écraser ni modifier les sauvegardes.
3. Réaliser une modification ciblée avec des noms explicites. Commenter en français les responsabilités, traitements complexes, décisions et conditions particulières, sans paraphraser chaque ligne.
4. Documenter les nouveaux fichiers importants et actualiser le README si l’architecture, le lancement, les données ou les limites changent. Réserver les `TODO` à un travail réellement manquant.
5. Vérifier les pages concernées sur ordinateur et mobile : navigation, filtres, parcours au clavier et console. Si le stockage change, vérifier la lecture après rechargement. Exécuter les contrôles de phase I décrits ci-dessus ; ils utilisent un DOM simulé et ne prouvent pas le fonctionnement dans un navigateur. Aucune compilation n’est nécessaire.
6. Décrire le problème résolu, les changements, les vérifications effectuées et les limites restantes dans la proposition de contribution.

Ces conventions s’appliquent dès la phase H et aux phases suivantes. La phase I sépare les interfaces des trois applications ; la phase J ajoute la démonstration Tunza Business. La refonte Ntani ajoute un registre local documenté et une préparation sans transmission ; le suivi fictif reste à venir. Exécuter aussi `node tests/ntani.cjs` après une modification Ntani. Le manifeste de phase H est préservé, sans génération ni intégration de photographies.
