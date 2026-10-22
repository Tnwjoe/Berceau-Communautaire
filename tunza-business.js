/* Interface du MVP : rend l’état mémoire du modèle, sans dépendance à la marketplace. */
(function () {
    'use strict';
    const gestion = window.TunzaBusiness.creerGestion();
    const seuil = window.TunzaBusiness.SEUIL_STOCK_FAIBLE;
    const trouver = id => document.getElementById(id);
    const montant = new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Le découpage entier évite de perdre un centime lors de l’affichage d’un
    // très grand montant pourtant valide dans le modèle.
    const formater = centimes => montant.formatToParts(BigInt(centimes) / 100n).map(partie =>
        partie.type === 'fraction' ? String(BigInt(centimes) % 100n).padStart(2, '0') : partie.value
    ).join('');
    const prixPourSaisie = centimes => `${BigInt(centimes) / 100n}.${String(BigInt(centimes) % 100n).padStart(2, '0')}`;
    let produitEdite = null;

    // Aucun texte saisi n’est interprété comme du HTML, y compris dans les
    // catégories, les sélecteurs et les instantanés de ventes ou de mouvements.
    function creerElement(balise, texte, classe) {
        const element = document.createElement(balise);
        if (texte !== undefined) element.textContent = texte;
        if (classe) element.className = classe;
        return element;
    }
    function signaler(message, contexte = 'business') {
        ['business', 'product', 'stock', 'sale'].forEach(prefixe => { trouver(prefixe + '-feedback').textContent = ''; });
        trouver(contexte + '-feedback').textContent = message;
    }
    function effacerErreur(id) { trouver(id).hidden = true; trouver(id).textContent = ''; }
    function agir(idErreur, action) {
        effacerErreur(idErreur);
        try { action(); }
        catch (erreur) {
            const zone = trouver(idErreur);
            zone.textContent = erreur.message;
            zone.hidden = false;
            zone.focus();
        }
    }
    function option(valeur, texte) {
        const element = creerElement('option', texte);
        element.value = valeur;
        return element;
    }
    function annulerEdition() {
        produitEdite = null;
        trouver('product-form').reset();
        trouver('product-form-heading').textContent = 'Ajouter un produit fictif';
        trouver('product-submit').textContent = 'Ajouter le produit fictif';
        trouver('product-cancel').hidden = true;
        trouver('product-edit-note').hidden = true;
        effacerErreur('product-error');
    }
    function modifierProduit(produit) {
        produitEdite = produit.id;
        trouver('product-name').value = produit.nom;
        trouver('product-category').value = produit.categorie;
        trouver('product-price').value = prixPourSaisie(produit.prixCentimes);
        trouver('product-quantity').value = produit.quantite;
        trouver('product-description').value = produit.description;
        trouver('product-form-heading').textContent = 'Modifier un produit fictif';
        trouver('product-submit').textContent = 'Enregistrer les modifications';
        trouver('product-cancel').hidden = false;
        trouver('product-edit-note').hidden = false;
        effacerErreur('product-error');
        trouver('product-name').focus();
    }
    function afficherProduits() {
        const produits = gestion.lireEtat().produits;
        const recherche = trouver('product-search').value.trim().toLocaleLowerCase('fr');
        const categorie = trouver('product-filter').value;
        const selection = produits.filter(produit => (!categorie || produit.categorie === categorie)
            && [produit.nom, produit.categorie, produit.description].join(' ').toLocaleLowerCase('fr').includes(recherche));
        const liste = trouver('product-list');
        liste.replaceChildren();
        trouver('product-count').textContent = `${selection.length} produit(s) affiché(s) sur ${produits.length}.`;
        if (!selection.length) {
            liste.append(creerElement('p', produits.length ? 'Aucun produit ne correspond à ces critères. Modifiez la recherche ou la catégorie.' : 'Aucun produit dans cette démonstration. Ajoutez votre premier produit fictif à l’aide du formulaire.', 'business-empty'));
        }
        selection.forEach(produit => {
            const carte = creerElement('article', undefined, 'business-product');
            carte.append(creerElement('span', produit.categorie, 'business-tag'), creerElement('h3', produit.nom),
                creerElement('p', `${formater(produit.prixCentimes)} · Stock : ${produit.quantite} unité(s)`));
            if (produit.description) carte.append(creerElement('p', produit.description));
            if (produit.quantite <= seuil) carte.append(creerElement('p', produit.quantite ? 'Stock faible' : 'Rupture de stock', 'business-tag business-low'));
            const actions = creerElement('div', undefined, 'business-actions');
            const modifier = creerElement('button', 'Modifier', 'btn secondary');
            modifier.type = 'button'; modifier.setAttribute('aria-label', `Modifier ${produit.nom}`);
            modifier.addEventListener('click', () => modifierProduit(produit));
            const retirer = creerElement('button', 'Retirer', 'btn secondary');
            retirer.type = 'button'; retirer.setAttribute('aria-label', `Retirer ${produit.nom}`);
            retirer.addEventListener('click', () => {
                if (!window.confirm(`Retirer « ${produit.nom} » du jeu fictif ? Son stock sera retiré ; les ventes et mouvements déjà simulés seront conservés.`)) return;
                agir('product-error', () => {
                    gestion.retirerProduit(produit.id);
                    if (produitEdite === produit.id) annulerEdition();
                    afficherEtat();
                    signaler('Produit retiré de la démonstration. Aucun commerce public n’a été modifié.', 'product');
                    trouver('product-search').focus();
                });
            });
            actions.append(modifier, retirer); carte.append(actions); liste.append(carte);
        });
    }
    function remplirSelecteur(id, produits) {
        const selecteur = trouver(id);
        const selection = selecteur.value;
        selecteur.replaceChildren(option('', produits.length ? 'Choisir un produit fictif' : 'Aucun produit disponible'));
        produits.forEach(produit => selecteur.append(option(produit.id, `${produit.nom} — ${produit.quantite} en stock`)));
        selecteur.value = produits.some(produit => produit.id === selection) ? selection : '';
        selecteur.disabled = produits.length === 0;
    }
    function afficherStockDisponible(prefixe) {
        const produit = gestion.lireEtat().produits.find(element => element.id === trouver(prefixe + '-product').value);
        trouver(prefixe + '-available').textContent = produit ? `Disponible : ${produit.quantite} unité(s) · Prix : ${formater(produit.prixCentimes)}` : 'Choisissez un produit pour consulter son stock.';
    }
    function actualiserDevis() {
        afficherStockDisponible('sale');
        try {
            const devis = gestion.devisVente(trouver('sale-product').value, trouver('sale-quantity').value);
            trouver('sale-total').textContent = formater(devis.totalCentimes);
            trouver('sale-preview-help').textContent = `${devis.quantite} × ${formater(devis.prixUnitaireCentimes)}. La confirmation déduira cette quantité du stock fictif.`;
            trouver('sale-submit').disabled = false;
        } catch (erreur) {
            trouver('sale-total').textContent = '—';
            trouver('sale-preview-help').textContent = !trouver('sale-product').value || !trouver('sale-quantity').value ? 'Choisissez un produit et une quantité entière strictement positive.' : erreur.message;
            trouver('sale-submit').disabled = true;
        }
    }
    function afficherEtat() {
        const etat = gestion.lireEtat();
        const indicateurs = gestion.indicateurs();
        trouver('metric-products').textContent = indicateurs.nombreProduits;
        trouver('metric-stock-value').textContent = formater(indicateurs.valeurStockCentimes);
        trouver('metric-low-stock').textContent = indicateurs.nombreStocksFaibles;
        trouver('metric-sales-total').textContent = formater(indicateurs.totalVentesCentimes);
        trouver('metric-sales-count').textContent = indicateurs.nombreVentes;
        const filtre = trouver('product-filter'), categorie = filtre.value;
        const categories = [...new Set(etat.produits.map(produit => produit.categorie))].sort((a, b) => a.localeCompare(b, 'fr'));
        filtre.replaceChildren(option('', 'Toutes les catégories'), ...categories.map(valeur => option(valeur, valeur)));
        filtre.value = categories.includes(categorie) ? categorie : '';
        afficherProduits();
        remplirSelecteur('stock-product', etat.produits);
        remplirSelecteur('sale-product', etat.produits);
        trouver('stock-submit').disabled = etat.produits.length === 0;
        afficherStockDisponible('stock'); actualiserDevis();
        const stock = trouver('stock-list'); stock.replaceChildren();
        if (!etat.produits.length) stock.append(creerElement('p', 'Aucun stock à afficher. Ajoutez un produit fictif.', 'business-empty'));
        etat.produits.forEach(produit => {
            const ligne = creerElement('article', undefined, 'business-product');
            ligne.append(creerElement('h3', produit.nom), creerElement('p', `${produit.quantite} unité(s) disponibles`));
            if (produit.quantite <= seuil) ligne.append(creerElement('span', produit.quantite ? 'Stock faible · seuil : 5' : 'Rupture de stock', 'business-tag business-low'));
            stock.append(ligne);
        });
        const historiqueStock = trouver('stock-history'); historiqueStock.replaceChildren();
        if (!etat.mouvements.length) historiqueStock.append(creerElement('li', 'Aucun mouvement fictif pour le moment.'));
        const types = { entree: 'Entrée', sortie: 'Sortie', vente: 'Vente fictive', correction: 'Correction du stock' };
        etat.mouvements.slice().reverse().forEach(mouvement => {
            const ligne = creerElement('li');
            ligne.append(creerElement('strong', `${types[mouvement.type]} · ${mouvement.nomProduit}`),
                creerElement('p', `${mouvement.quantite} unité(s) · stock après opération : ${mouvement.stockApres} · réf. ${mouvement.id}`));
            historiqueStock.append(ligne);
        });
        const historiqueVentes = trouver('sale-history'); historiqueVentes.replaceChildren();
        if (!etat.ventes.length) historiqueVentes.append(creerElement('li', 'Aucune vente fictive enregistrée. Préparez une première simulation.'));
        etat.ventes.slice().reverse().forEach(vente => {
            const ligne = creerElement('li');
            ligne.append(creerElement('strong', vente.nomProduit),
                creerElement('p', `${vente.quantite} × ${formater(vente.prixUnitaireCentimes)} = ${formater(vente.totalCentimes)}`),
                creerElement('p', `Vente fictive · réf. ${vente.id}`));
            historiqueVentes.append(ligne);
        });
    }

    trouver('product-form').addEventListener('submit', evenement => {
        evenement.preventDefault();
        agir('product-error', () => {
            const modification = produitEdite !== null;
            gestion.enregistrerProduit({ nom: trouver('product-name').value, categorie: trouver('product-category').value,
                prix: trouver('product-price').value, quantite: trouver('product-quantity').value, description: trouver('product-description').value }, produitEdite);
            annulerEdition(); afficherEtat();
            signaler(modification ? 'Produit fictif modifié. Les indicateurs ont été actualisés.' : 'Produit fictif ajouté. Les indicateurs ont été actualisés.', 'product');
            trouver('product-name').focus();
        });
    });
    trouver('product-cancel').addEventListener('click', () => { annulerEdition(); trouver('product-name').focus(); });
    trouver('product-search').addEventListener('input', afficherProduits);
    trouver('product-filter').addEventListener('change', afficherProduits);
    trouver('stock-product').addEventListener('change', () => { effacerErreur('stock-error'); afficherStockDisponible('stock'); });
    trouver('stock-form').addEventListener('submit', evenement => {
        evenement.preventDefault();
        agir('stock-error', () => {
            gestion.mouvementStock(trouver('stock-product').value, trouver('stock-type').value, trouver('stock-quantity').value);
            trouver('stock-quantity').value = ''; afficherEtat();
            signaler('Mouvement fictif enregistré. Le stock et les indicateurs ont été actualisés.', 'stock');
        });
    });
    trouver('sale-product').addEventListener('change', () => { effacerErreur('sale-error'); actualiserDevis(); });
    trouver('sale-quantity').addEventListener('input', () => { effacerErreur('sale-error'); actualiserDevis(); });
    trouver('sale-form').addEventListener('submit', evenement => {
        evenement.preventDefault();
        agir('sale-error', () => {
            const vente = gestion.confirmerVente(trouver('sale-product').value, trouver('sale-quantity').value);
            trouver('sale-quantity').value = ''; afficherEtat();
            signaler(`Vente fictive enregistrée : ${formater(vente.totalCentimes)}. Stock déduit ; aucun paiement ni envoi effectué.`, 'sale');
        });
    });
    trouver('business-reset').addEventListener('click', () => {
        if (!window.confirm('Réinitialiser toute la démonstration ? Les produits, mouvements et ventes de cette page seront remplacés par le jeu fictif initial.')) return;
        gestion.reinitialiser(); annulerEdition();
        trouver('stock-form').reset(); trouver('sale-form').reset();
        trouver('product-search').value = ''; trouver('product-filter').value = '';
        effacerErreur('stock-error'); effacerErreur('sale-error');
        afficherEtat(); signaler('Jeu fictif réinitialisé. Aucune donnée de la marketplace n’a été modifiée.');
    });
    afficherEtat();
    trouver('business-workspace').hidden = false;
    trouver('business-reset').disabled = false;
})();
