# Ntani — carte, registre local et préparation d’incident

## Périmètre et architecture

Ntani reste une application multipage en HTML/CSS/JavaScript de Berceau communautaire. Cette refonte n’ajoute ni Supabase, ni compte, ni réception de signalement. Les modules Communauté et Tunza Business ne sont pas réécrits. Les six scénarios et le parcours historique en cinq étapes restent accessibles à `ntani.html#ntani-flow`. Le nouveau parcours en six étapes utilise les mêmes scénarios, sans dupliquer leurs textes.

| Fichier | Responsabilité et dépendances |
| --- | --- |
| `ntani.html`, `ntani.css` | Consultation, carte, liste, préparation et informations utiles. Les styles sont limités aux pages Ntani ; les composants communs restent dans `style.css`. |
| `ntani.js` | Parcours historique inchangé ; expose également `window.NtaniScenarios` pour le nouveau parcours. |
| `ntani-report.js` | Six étapes, validation, aperçu photo local et suppression du brouillon en mémoire. Dépend des scénarios et du balisage public ; ne dépend pas du registre. |
| `ntani-stations-data.js` | Première référence documentaire réelle fournie au projet : UNIKIN, coordonnées et source OSM ; aucun contact inventé. |
| `ntani-stations.js` | Schéma, validation, recherche, itinéraire et adaptateur de stockage local ; expose `NtaniStations`. Références documentaires séparées, sans donnée fictive. |
| `ntani-map.js` | Adaptateur Leaflet, chargement différé avec contrôle d’intégrité, erreurs de ressources/tuiles, marqueurs et positions de travail. Ne lit ni le registre ni les signalements. |
| `ntani-directory.js` | Liste publique, fiches, activation de la carte et demande facultative de position. Dépend du registre et de l’adaptateur cartographique. |
| `ntani-admin.html`, `ntani-admin.js` | Administration locale dédiée aux postes ; dépend de `ntani-stations.js` et `ntani-map.js`. Accessible depuis `admin.html`, sans lien administratif dans les menus publics. |
| `applications.js` | Navigation publique Ntani : accueil, carte, postes, préparation et informations utiles. |
| `tests/ntani.cjs` | Tests Node.js sans paquet supplémentaire : modèle réel et gestionnaires réels avec DOM, géolocalisation, images et Leaflet simulés. |

## Choix cartographique

Leaflet **1.9.4**, version stable indiquée par sa [documentation officielle](https://leafletjs.com/download.html), est l’unique nouvelle dépendance d’exécution. La bibliothèque et sa feuille de style sont chargées depuis unpkg uniquement après action sur « Activer la carte externe », avec les empreintes SRI publiées par Leaflet et `crossorigin`. Aucun paquet npm ni compilation n’est ajouté. Le site reste consultable si le CDN, l’intégrité de la ressource ou le réseau bloque la carte.

Le fond utilise `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. L’URL et l’attribution sont centralisées dans `ntani-map.js`. L’attribution est visible sur la carte et sous son emplacement. Le code n’ajoute ni préchargement massif, ni téléchargement hors ligne, ni cache applicatif ; il laisse le navigateur respecter les en-têtes HTTP. Ne pas supprimer le Referer avec une politique d’hébergement restrictive. Respecter la [politique du fournisseur de tuiles](https://operations.osmfoundation.org/policies/tiles/) ; ce service ne garantit pas de disponibilité. Avant un déploiement public conséquent, revoir les conditions, la capacité, le contact du projet et, si nécessaire, choisir un fournisseur adapté. Ces obligations d’hébergement ne sont pas validées par les tests locaux.

La vue initiale est un contexte autour de Kinshasa, pas la position de l’utilisateur ni un poste. Les postes visibles correspondant à la recherche sont ensuite cadrés automatiquement. Les boucliers sont des formes CSS simples, sans symbole intérieur, texte ni emblème officiel. La sélection ouvre une fiche textuelle accessible et place le focus sur son titre ; aucun contenu de données n’est interpolé dans une popup HTML. Zoom, déplacement et marqueurs utilisent les contrôles clavier de Leaflet. Une liste indépendante offre les mêmes informations sans carte.

L’itinéraire ouvre OpenStreetMap dans un autre onglet avec la destination uniquement. Ntani ne transmet aucun point de départ. Ce lien ne garantit pas la disponibilité d’un trajet ni son adéquation à une situation d’urgence. Aucun géocodage ni interrogation automatique d’OpenStreetMap/Overpass pour obtenir des postes n’est utilisé.

## Géolocalisation et services tiers

Le chargement de la carte expose notamment l’adresse IP et la zone consultée à ses fournisseurs ; l’interface le dit avant activation. La demande de position est séparée : accord explicite par case à cocher, puis clic sur un bouton, puis permission native du navigateur. Aucun appel automatique à `getCurrentPosition` n’a lieu. Les refus, indisponibilités et délais sont annoncés. HTTPS ou localhost est nécessaire selon le navigateur.

La position n’est conservée ni dans le registre ni dans le brouillon. La carte la montre dans un cercle d’incertitude. Centrer sur cette position demande des tuiles de cette zone : le consentement explique cette conséquence. Retirer l’accord invalide les réponses tardives et retire le repère ; cela n’annule pas les requêtes déjà envoyées aux fournisseurs.

## Registre des postes

La clé dédiée **`ntani.stations.v1`** contient un document JSON : `{ "version": 1, "postes": [] }`. Les clés historiques `news`, `professionals`, `commerces` restent intactes. Une clé absente affiche les références documentaires de `ntani-stations-data.js`, sans écriture automatique. Une liste enregistrée vide reste vide et ne réintroduit jamais une référence retirée. Le bouton administratif « Ajouter la référence UNIKIN fournie » permet un import explicite lorsqu’elle manque, sans remplacer les autres postes. Aucun poste, numéro ou emplacement policier fictif n’est livré.

Chaque poste possède un identifiant textuel stable, `nom`, `adresse`, `quartier`, `latitude`, `longitude`, `telephonePrincipal`, `telephoneSecondaire`, `horaires`, `informations`, `provenance`, `verification`, `positionConfirmee`, `statutVerification` et `visible`. Les champs textuels sont bornés. Les coordonnées sont en degrés décimaux dans les limites latitude ±90 et longitude ±180 ; zéro est une valeur valide. Les deux coordonnées sont renseignées ensemble ou laissées vides pour un brouillon masqué. `provenance` est une URL HTTP(S) sans identifiants de connexion. `verification` est une date civile valide `AAAA-MM-JJ`, non future. L’ancien champ facultatif `telephone` est conservé pour compatibilité ; s’il est exploitable et que le champ principal est absent, il peut alimenter ce dernier en lecture.

La visibilité exige une source, une date, des coordonnées et une confirmation manuelle de position. Ce contrôle valide la structure et la déclaration du contributeur ; il ne prouve ni l’existence du poste ni une approbation par les autorités. Chaque fiche publique rappelle la provenance et la date déclarée.

### Ajouter ou corriger un poste

1. Depuis l’administration générale, ouvrir « Postes Ntani · registre local ».
2. Saisir un nom et une adresse réels, uniquement à partir d’informations publiques vérifiables. Conserver le poste masqué pendant la préparation.
3. Saisir des coordonnées connues ou activer la carte puis cliquer sur l’emplacement à vérifier. Les champs numériques constituent l’alternative clavier complète au clic cartographique.
4. Vérifier la correspondance entre poste, source et position ; cocher la confirmation. Une modification des coordonnées invalide cette confirmation.
5. Indiquer la source et sa date de vérification, puis choisir la visibilité et enregistrer localement.
6. Revenir à Ntani et actualiser la liste locale pour voir les postes visibles. Aucun autre navigateur ni appareil n’est mis à jour.

Rechercher et filtrer n’écrit aucune donnée. « Masquer » conserve la fiche ; « Retirer » demande confirmation avant de supprimer la fiche locale. Un changement de fiche avec saisie non enregistrée demande confirmation d’abandon. L’échec de sauvegarde conserve les champs. Les données invalides, versions inconnues et erreurs de lecture mettent le registre en lecture seule sans modifier la valeur originale. La comparaison avec la dernière lecture refuse un changement intervenu dans un autre onglet, mais n’est pas une transaction multiutilisateur.

## Préparation d’incident

Le parcours comprend : type, localisation, faits, photo facultative, vérification et récapitulatif. Il accepte les mêmes six catégories historiques. Un bouton charge explicitement le lieu et le texte fictifs du scénario choisi ; sinon les champs restent libres, avec une consigne d’éviter les informations personnelles. Retour, corrections et progression restent disponibles avant la fin. La vérification exige de reconnaître l’absence de transmission.

La photo accepte JPEG/PNG/WebP, au maximum 5 Mo ; elle doit être décodable et ne pas dépasser 40 millions de pixels. L’aperçu utilise une URL `blob:` locale, révoquée au retrait, au redémarrage et à la sortie de page. Les sélections asynchrones obsolètes sont ignorées. Aucun fichier, texte, métadonnée de photo ni localisation d’incident n’est envoyé ou écrit dans `localStorage`, `sessionStorage` ou une base. Le brouillon est effacé à `pagehide`, y compris avant une éventuelle mise en cache de navigation. La fermeture ou le rechargement fait perdre la saisie : ce comportement est intentionnel et annoncé.

Le récapitulatif dit « Préparation terminée. Aucun signalement transmis ». Aucun numéro de dossier, accusé de réception ni statut de traitement n’est créé. Le suivi fictif historique reste annoncé comme indisponible. En danger immédiat, les utilisateurs sont orientés vers les canaux officiels compétents, sans numéro inventé.

## Première référence UNIKIN et contacts

La fiche initiale **Police Universitaire — UNIKIN** reprend exclusivement les informations fournies par le responsable du projet : campus de l’Université de Kinshasa, secteur du Jardin d’Écologie, Kinshasa, RDC ; latitude **−4.419830**, longitude **15.307850** ; [nœud OpenStreetMap 6018228387](https://www.openstreetmap.org/node/6018228387) ; date de vérification documentaire **22 octobre 2026**. Le responsable l’identifie comme poste principal de ce secteur et confirme sa position géographiquement. Cette mission n’a pas pu ouvrir le nœud via l’outil de consultation web : ces informations ne sont pas présentées comme une vérification indépendante par le logiciel ni comme une confirmation par les autorités.

La fiche et la liste annoncent que la **vérification officielle des coordonnées et des contacts reste en attente**. Le statut courant est `documentaire-en-attente-officielle` ; l’administration permet de le consulter sans fournir de bouton de certification officielle. La source est consultable depuis l’édition.

Les deux champs téléphoniques démarrent vides. La validation accepte 7 à 15 chiffres, séparateurs d’usage et préfixe + ou 00 facultatif ; elle refuse du HTML, les caractères de substitution et les protocoles. Le lien d’appel utilise seulement le numéro normalisé, jamais le contenu brut. Un champ vide ne crée aucun faux contact ni bouton actif. Une validation syntaxique ne prouve pas que la ligne existe ou répond. Aucun numéro n’est qualifié de ligne d’urgence officielle. Les modifications ne concernent que ce navigateur.

### Extension conceptuelle : barrières et points de garde

Une évolution pourra associer à un poste principal plusieurs points de garde par une relation `posteId`, avec identifiant, nom, coordonnées, informations et provenance propres. Ces données devront être vérifiées séparément et respecter les mêmes règles de visibilité. Aucune table, interface, barrière, coordonnée ou donnée de garde n’est implémentée dans cette mission.

## Organisation administrative ultérieure

Conserver des domaines séparés derrière une navigation administrative commune : contenus communautaires, professionnels, commerces, certifications, postes Ntani et paramètres de modules. Cette mission ajoute seulement le point d’entrée et l’interface des postes ; elle ne crée ni paramètres factices ni faux système centralisé.

`NtaniStations.creerRegistre()` est le point de remplacement du stockage : `lire()`, `enregistrer(poste)` et `retirer(id)`. Une future connexion à Supabase devra convertir les consommateurs à des appels asynchrones avec chargement/erreurs, développer authentification réelle, autorisations serveur/RLS, validation serveur, concurrence transactionnelle, historique et sauvegardes. Le schéma versionné et la validation partagée facilitent ce raccordement mais ne fournissent aucune de ces garanties. Un service de signalement nécessitera un périmètre distinct, des destinataires opérationnels et une politique de protection des données validée. Aucune intégration Supabase ni CGU n’est réalisée ici.

## Vérifications et limites

Depuis la racine :

```powershell
node tests/phase-i.cjs
node tests/phase-j.cjs
node tests/phase-2.cjs
node tests/ntani.cjs
node tools/synchroniser-navigation.cjs --check
```

Exécuter aussi `node --check` sur les scripts modifiés et créés. Les tests Ntani couvrent : référence UNIKIN et ses coordonnées, registre vide sans réintroduction, import explicite préservant les autres fiches, deux numéros et liens d’appel, structures et coordonnées, origine/date/confirmation, publication et masquage, CRUD, quota et lecture refusée, conflits entre onglets, rendus textuels hostiles, absence de géolocalisation sans consentement, retrait du consentement pendant une demande, carte indisponible, erreur de tuiles, les six scénarios dans le nouveau parcours, fichier invalide et aperçu local, réponses tardives ignorées, absence d’écriture de signalement et effacement à la sortie.

Ces contrôles exécutent les scripts réels, mais simulent le DOM, Leaflet, les images et la géolocalisation. Ils ne vérifient ni le rendu, ni un vrai dialogue de permission, ni le décodage réel de photo, ni le fonctionnement effectif du CDN, des tuiles et de l’itinéraire. Aucun navigateur connecté n’était disponible et l’ouverture du navigateur intégré a échoué pendant cette mission.

Recette restante : 320/375/768/1440 pixels, zoom 200 %, parcours clavier et lecteur d’écran, contrastes rendus, ouverture du parcours historique, carte et marqueurs réels, réseau coupé, refus/accord/retrait de géolocalisation, erreur de photo, retour arrière et rechargement sans restauration du brouillon. Utiliser uniquement des données techniques de test identifiées comme telles dans un navigateur de recette isolé ; ne pas les publier comme postes réels. Seule la référence UNIKIN fournie est livrée. Tout autre poste attend des données sourcées et une validation humaine.
