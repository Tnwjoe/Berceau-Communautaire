# Illustrations Berceau communautaire — phase H

## État de préparation

Les fichiers photographiques ne sont pas encore disponibles. Aucun fichier image vide ne doit être créé pour réserver un chemin.

Le manifeste [manifest.json](manifest.json) décrit les 12 illustrations de la liste officielle transmise pour la phase H. Les identifiants `01` à `12`, les noms de fichiers, catégories, usages et textes alternatifs reprennent cette liste. Toutes les entrées portent `disponible: false`. La validation du manifeste par le responsable du projet est attendue avant toute intégration.

## Structure retenue pour le manifeste

Le fichier `assets/images/bomoko/manifest.json` est un document JSON UTF-8 sans commentaires. L’objet racine contient `version` (entier, actuellement `1`), `directionArtistique` (objet de consignes communes) et `illustrations` (tableau d’objets). `directionArtistique` décrit l’accueil cinématographique, les publications documentaires réalistes, l’environnement congolais contemporain, la représentation naturelle, l’identité Light Premium et l’interdiction de présenter une illustration comme preuve d’un événement réel. Chaque illustration comporte les champs obligatoires suivants :

| Champ | Type | Signification |
| --- | --- | --- |
| `id` | chaîne | Identifiant unique et stable sur deux chiffres, de `01` à `12` pour cette livraison. Conserver le zéro initial. |
| `chemin` | chaîne | Futur chemin WebP relatif à la racine du site : `assets/images/bomoko/<id>-<sujet>.webp`. |
| `categorie` | chaîne | Famille visuelle ou module concerné, conformément à l’audit. |
| `usage` | chaîne | Emplacement prévu et rôle de l’illustration ; ne signifie pas que l’intégration est réalisée. |
| `texteAlternatif` | chaîne | Description française concise de la scène prévue, à vérifier contre l’image finale. |
| `mention` | chaîne | Valeur exacte : `Illustration générée`. |
| `disponible` | booléen | `false` tant que le fichier photographique validé n’est pas présent. |
| `remplacementNeutre` | objet | Contient `type: "bloc-neutre"` et `texte: "Illustration à venir"`. Décrit un remplacement sans fichier image. |

Exemple d’entrée réelle :

```json
{
  "id": "01",
  "chemin": "assets/images/bomoko/01-kinshasa-panorama.webp",
  "categorie": "Ville",
  "usage": "Image principale de l'accueil, panorama cinématographique",
  "texteAlternatif": "Vue panoramique illustrée d'une ville congolaise contemporaine sous une lumière naturelle.",
  "mention": "Illustration générée",
  "disponible": false,
  "remplacementNeutre": {
    "type": "bloc-neutre",
    "texte": "Illustration à venir"
  }
}
```

Le remplacement neutre est déclaratif : aucun composant n’est ajouté à cette étape. Lors de la future intégration autorisée, une image indisponible ou en échec de chargement devra utiliser ce bloc sans charger son chemin réservé. Le texte alternatif décrit l’image prévue ; il ne doit pas être présenté comme une image visible lorsque seul le remplacement est affiché.

Les identifiants et chemins doivent être uniques. Les noms de fichiers ne contiennent ni espaces, ni accents, ni majuscules. La mention indique la provenance prévue ; elle ne prouve pas qu’une image a déjà été générée. Les dimensions et la provenance détaillée ne seront renseignées qu’après réception des fichiers réels.

## Ajouter une illustration

1. Confirmer le sujet, la catégorie et l’usage à partir de l’audit. La livraison initiale doit contenir exactement les 12 illustrations attendues.
2. Choisir le prochain identifiant numérique stable disponible et son chemin WebP, puis renseigner tous les champs, y compris le remplacement neutre et la mention exacte. Ne pas renuméroter les entrées existantes. Utiliser `disponible: false` si l’image n’existe pas encore, sans créer de fichier de remplacement vide.
3. Après préparation et validation de la photographie, déposer le véritable WebP au chemin prévu. Vérifier le format réel, les dimensions, le texte alternatif et la provenance avant de passer `disponible` à `true`.
4. Vérifier la syntaxe JSON, les champs et types obligatoires, l’unicité des identifiants et chemins, la mention exacte et la cohérence entre disponibilité et présence du fichier.

## Remplacer une illustration

Conserver son identifiant si son rôle reste identique. Remplacer le WebP réel, revoir le texte alternatif et la provenance, puis vérifier le format et la disponibilité. Si le chemin change, actualiser l’entrée et rechercher les références à l’ancien chemin avant toute suppression. Un nouvel usage distinct doit recevoir un nouvel identifiant.

## Dépendances et intégration

Ce dossier prépare les ressources visuelles. Aucun module actuel ne charge ce manifeste et aucun chemin réservé ne doit être utilisé comme une image disponible. L’intégration dans les pages, le chargement du manifeste et les adaptations des composants feront l’objet d’une étape ultérieure. Aucun backend n’est requis pour cette description statique.
