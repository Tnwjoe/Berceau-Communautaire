/* État métier isolé de Tunza Business : ni window.BC, ni stockage, ni réseau. */
(function (racine, definir) {
    'use strict';
    const moduleMetier = definir();
    if (typeof module === 'object' && module.exports) module.exports = moduleMetier;
    else racine.TunzaBusiness = moduleMetier;
})(typeof window === 'object' ? window : globalThis, function () {
    'use strict';
    const SEUIL_STOCK_FAIBLE = 5;

    function texte(valeur, libelle, limite, facultatif = false) {
        const resultat = String(valeur ?? '').trim();
        if ((!resultat && !facultatif) || resultat.length > limite) {
            throw new Error(`${libelle} : ${facultatif ? 'au maximum' : 'saisissez de 1 à'} ${limite} caractères.`);
        }
        return resultat;
    }

    function entier(valeur, libelle, minimum = 0) {
        if (!/^\d+$/.test(String(valeur).trim())) throw new Error(`${libelle} : saisissez un nombre entier positif ou nul.`);
        const resultat = Number(valeur);
        if (!Number.isSafeInteger(resultat) || resultat < minimum) {
            throw new Error(`${libelle} : saisissez un entier ${minimum ? 'strictement positif' : 'positif ou nul'} dans les limites de calcul.`);
        }
        return resultat;
    }

    // Tous les calculs monétaires utilisent des centimes entiers, pour éviter
    // les erreurs d’arrondi et conserver exactement le prix appliqué à une vente.
    function prixEnCentimes(valeur) {
        const saisie = String(valeur).trim().replace(',', '.');
        if (!/^\d+(?:\.\d{1,2})?$/.test(saisie)) throw new Error('Prix : saisissez un montant CDF positif ou nul, avec au maximum deux décimales.');
        const [unites, decimales = ''] = saisie.split('.');
        const resultat = Number(unites) * 100 + Number(decimales.padEnd(2, '0'));
        if (!Number.isSafeInteger(resultat)) throw new Error('Prix trop élevé pour les limites de calcul de cette démonstration.');
        return resultat;
    }

    function montantSur(valeur) {
        if (!Number.isSafeInteger(valeur) || valeur < 0) throw new Error('Montant ou stock trop élevé pour les limites de calcul de cette démonstration.');
        return valeur;
    }

    function creerGestion() {
        let produits, ventes, mouvements, sequence;
        function reinitialiser() {
            sequence = 0;
            produits = [
                { id: 'demo-cafe', nom: 'Café du quartier — exemple', categorie: 'Alimentation', prixCentimes: 850000, quantite: 12, description: 'Paquet fictif de café de 250 g.' },
                { id: 'demo-savon', nom: 'Savon artisanal — exemple', categorie: 'Maison', prixCentimes: 250000, quantite: 4, description: 'Produit fictif pour la démonstration.' },
                { id: 'demo-carnet', nom: 'Carnet de notes — exemple', categorie: 'Papeterie', prixCentimes: 400000, quantite: 0, description: '' }
            ];
            ventes = []; mouvements = [];
        }
        reinitialiser();
        const identifiant = prefixe => `${prefixe}-${++sequence}`;
        function trouver(id) {
            const produit = produits.find(element => element.id === id);
            if (!produit) throw new Error('Ce produit n’est plus disponible dans la démonstration.');
            return produit;
        }
        function indicateurs(liste = produits, historique = ventes) {
            return {
                nombreProduits: liste.length,
                valeurStockCentimes: liste.reduce((total, produit) => montantSur(total + montantSur(produit.prixCentimes * produit.quantite)), 0),
                nombreStocksFaibles: liste.filter(produit => produit.quantite <= SEUIL_STOCK_FAIBLE).length,
                totalVentesCentimes: historique.reduce((total, vente) => montantSur(total + vente.totalCentimes), 0),
                nombreVentes: historique.length
            };
        }
        // On valide l’état candidat avant de le publier : une erreur ne doit
        // jamais déduire du stock ou créer une vente partiellement enregistrée.
        function appliquer(prochainsProduits, prochainesVentes = ventes, prochainsMouvements = mouvements) {
            indicateurs(prochainsProduits, prochainesVentes);
            produits = prochainsProduits; ventes = prochainesVentes; mouvements = prochainsMouvements;
        }
        function enregistrerProduit(saisie, id = null) {
            const precedent = id ? trouver(id) : null;
            const produit = {
                id: precedent?.id || identifiant('produit'),
                nom: texte(saisie.nom, 'Nom', 100), categorie: texte(saisie.categorie, 'Catégorie', 60),
                prixCentimes: prixEnCentimes(saisie.prix), quantite: entier(saisie.quantite, 'Stock'),
                description: texte(saisie.description, 'Description', 500, true)
            };
            const prochains = precedent ? produits.map(element => element.id === id ? produit : element) : [...produits, produit];
            const historique = [...mouvements];
            if (precedent && precedent.quantite !== produit.quantite) {
                historique.push({ id: identifiant('mouvement'), produitId: id, nomProduit: produit.nom, type: 'correction', quantite: produit.quantite - precedent.quantite, stockApres: produit.quantite });
            }
            appliquer(prochains, ventes, historique);
            return { ...produit };
        }
        function retirerProduit(id) {
            trouver(id);
            // L’historique conserve ses libellés et montants, même après retrait.
            appliquer(produits.filter(produit => produit.id !== id));
        }
        function mouvementStock(id, type, saisieQuantite) {
            const produit = trouver(id);
            const quantite = entier(saisieQuantite, 'Quantité du mouvement', 1);
            if (!['entree', 'sortie'].includes(type)) throw new Error('Choisissez une entrée ou une sortie de stock.');
            if (type === 'sortie' && quantite > produit.quantite) throw new Error('Sortie refusée : quantité supérieure au stock disponible.');
            const stockApres = montantSur(produit.quantite + (type === 'entree' ? quantite : -quantite));
            appliquer(produits.map(element => element.id === id ? { ...element, quantite: stockApres } : element), ventes,
                [...mouvements, { id: identifiant('mouvement'), produitId: id, nomProduit: produit.nom, type, quantite, stockApres }]);
        }
        function devisVente(id, saisieQuantite) {
            const produit = trouver(id);
            const quantite = entier(saisieQuantite, 'Quantité vendue', 1);
            if (quantite > produit.quantite) throw new Error('Vente refusée : quantité supérieure au stock disponible.');
            return { produitId: id, nomProduit: produit.nom, quantite, prixUnitaireCentimes: produit.prixCentimes, totalCentimes: montantSur(produit.prixCentimes * quantite) };
        }
        function confirmerVente(id, saisieQuantite) {
            const devis = devisVente(id, saisieQuantite);
            const produit = trouver(id);
            const vente = { ...devis, id: identifiant('vente') };
            const stockApres = produit.quantite - devis.quantite;
            appliquer(produits.map(element => element.id === id ? { ...element, quantite: stockApres } : element), [...ventes, vente],
                [...mouvements, { id: identifiant('mouvement'), produitId: id, nomProduit: produit.nom, type: 'vente', quantite: devis.quantite, stockApres }]);
            return { ...vente };
        }
        // Les copies empêchent les composants d’affichage de muter l’état métier.
        return {
            lireEtat: () => ({ produits: produits.map(produit => ({ ...produit })), ventes: ventes.map(vente => ({ ...vente })), mouvements: mouvements.map(mouvement => ({ ...mouvement })) }),
            indicateurs, enregistrerProduit, retirerProduit, mouvementStock, devisVente, confirmerVente, reinitialiser
        };
    }
    return { creerGestion, SEUIL_STOCK_FAIBLE };
});
