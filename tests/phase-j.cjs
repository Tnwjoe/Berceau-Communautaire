/* Tests métier et interactions DOM simulées ; aucun navigateur ni réseau utilisé. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const racine = path.resolve(__dirname, '..');
const lire = fichier => fs.readFileSync(path.join(racine, fichier), 'utf8');
// Le chargement explicite évite de dépendre d’un éventuel package.json parent
// configuré en modules ES, sans ajouter de configuration au site statique.
const contexteMetier = { module: { exports: {} } };
vm.runInNewContext(lire('tunza-business-model.js'), contexteMetier);
const { creerGestion, SEUIL_STOCK_FAIBLE } = contexteMetier.module.exports;
const saisie = modifications => ({ nom: 'Produit test', categorie: 'Test', prix: '1250,25', quantite: '10', description: '', ...modifications });
const gestion = creerGestion();
assert.equal(SEUIL_STOCK_FAIBLE, 5);
assert.equal(gestion.indicateurs().nombreProduits, 3);
assert.equal(gestion.indicateurs().nombreStocksFaibles, 2);

// Toute validation échouée doit laisser les produits, ventes et mouvements intacts.
function refuser(action) {
    const avant = gestion.lireEtat();
    assert.throws(action);
    assert.deepEqual(gestion.lireEtat(), avant);
}
for (const modifications of [
    { nom: '  ' }, { categorie: '' }, { nom: 'x'.repeat(101) }, { description: 'x'.repeat(501) },
    { prix: '-1' }, { prix: '1.001' }, { prix: 'Infinity' }, { prix: '' }, { prix: '1e3' },
    { quantite: '-1' }, { quantite: '1.5' }, { quantite: '' }, { quantite: '9007199254740992' }
]) refuser(() => gestion.enregistrerProduit(saisie(modifications)));
const produit = gestion.enregistrerProduit(saisie());
assert.equal(produit.prixCentimes, 125025);
const copie = gestion.lireEtat(); copie.produits[0].quantite = -50;
assert.ok(gestion.lireEtat().produits[0].quantite >= 0);
for (const quantite of ['0', '-1', '1.5', '', '11']) refuser(() => gestion.confirmerVente(produit.id, quantite));
refuser(() => gestion.mouvementStock(produit.id, 'sortie', '11'));
refuser(() => gestion.mouvementStock(produit.id, 'entree', '0'));
refuser(() => gestion.mouvementStock(produit.id, 'inconnu', '1'));
gestion.mouvementStock(produit.id, 'entree', '2');
gestion.mouvementStock(produit.id, 'sortie', '3');
assert.equal(gestion.lireEtat().produits.find(element => element.id === produit.id).quantite, 9);
const devis = gestion.devisVente(produit.id, '2');
assert.equal(devis.totalCentimes, 250050);
assert.equal(gestion.lireEtat().ventes.length, 0);
gestion.confirmerVente(produit.id, '2');
assert.equal(gestion.lireEtat().produits.find(element => element.id === produit.id).quantite, 7);
assert.equal(gestion.indicateurs().totalVentesCentimes, 250050);
const modifie = gestion.enregistrerProduit(saisie({ nom: 'Nouveau nom', prix: '5000', quantite: '5' }), produit.id);
assert.equal(modifie.id, produit.id);
assert.equal(gestion.indicateurs().nombreStocksFaibles, 3);
assert.equal(gestion.lireEtat().ventes[0].prixUnitaireCentimes, 125025);
assert.equal(gestion.lireEtat().ventes[0].nomProduit, 'Produit test');
assert.equal(gestion.lireEtat().mouvements.at(-1).type, 'correction');
gestion.retirerProduit(produit.id);
assert.equal(gestion.indicateurs().nombreVentes, 1);
assert.equal(gestion.indicateurs().totalVentesCentimes, 250050);
refuser(() => gestion.confirmerVente(produit.id, '1'));
gestion.reinitialiser();
assert.equal(gestion.indicateurs().nombreVentes, 0);
assert.equal(gestion.lireEtat().mouvements.length, 0);
const gratuit = gestion.enregistrerProduit(saisie({ prix: '0', quantite: '9007199254740991' }));
refuser(() => gestion.mouvementStock(gratuit.id, 'entree', '1'));
gestion.retirerProduit(gratuit.id);
gestion.lireEtat().produits.forEach(element => gestion.retirerProduit(element.id));
assert.deepEqual(JSON.parse(JSON.stringify(gestion.indicateurs())), { nombreProduits: 0, valeurStockCentimes: 0, nombreStocksFaibles: 0, totalVentesCentimes: 0, nombreVentes: 0 });
const grand = gestion.enregistrerProduit(saisie({ prix: '90071992547409.91', quantite: '1' }));
gestion.confirmerVente(grand.id, '1');
const petit = gestion.enregistrerProduit(saisie({ prix: '0.01', quantite: '1' }));
refuser(() => gestion.confirmerVente(petit.id, '1'));
gestion.reinitialiser();
const zero = gestion.enregistrerProduit(saisie({ prix: '0', quantite: '1' }));
assert.equal(gestion.confirmerVente(zero.id, '1').totalCentimes, 0);

// Le DOM minimal déclenche les gestionnaires réels ; il ne simule ni le rendu
// responsive, ni les annonces d’un lecteur d’écran, ni les dialogues natifs.
let elementFocalise;
class Element {
    constructor(balise = 'div') { this.tagName = balise.toUpperCase(); this.children = []; this.events = {}; this.attributes = {}; this.value = ''; this.textContent = ''; }
    set value(valeur) { this.valeur = String(valeur); }
    get value() { return this.valeur; }
    set textContent(texte) { this.texte = String(texte); this.children = []; }
    get textContent() { return this.texte + this.children.map(enfant => enfant.textContent).join(' '); }
    set innerHTML(_) { throw new Error('Injection HTML interdite dans cette interface.'); }
    append(...enfants) { this.children.push(...enfants); }
    replaceChildren(...enfants) { this.texte = ''; this.children = enfants; }
    setAttribute(nom, valeur) { this.attributes[nom] = valeur; }
    addEventListener(nom, fonction) { this.events[nom] = fonction; }
    emit(nom) { this.events[nom]?.({ preventDefault() {} }); }
    focus() { elementFocalise = this; }
}
const html = lire('tunza-business.html');
const elements = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
for (const prefixe of ['product', 'stock', 'sale']) {
    elements[prefixe + '-form'].reset = () => Object.entries(elements).forEach(([id, element]) => {
        if (id.startsWith(prefixe + '-')) element.value = id === 'stock-type' ? 'entree' : '';
    });
}
elements['stock-type'].value = 'entree';
let confirmation = true;
const contexte = { window: { confirm: () => confirmation }, document: { getElementById: id => elements[id], createElement: balise => new Element(balise) }, Intl, BigInt };
vm.runInNewContext(lire('tunza-business-model.js'), contexte);
vm.runInNewContext(lire('tunza-business.js'), contexte);
const entrer = (id, valeur, evenement) => { elements[id].value = valeur; if (evenement) elements[id].emit(evenement); };
const boutons = carte => carte.children.flatMap(element => element.children).filter(element => element.tagName === 'BUTTON');
assert.equal(elements['metric-products'].textContent, '3');
assert.equal(elements['business-workspace'].hidden, false);
assert.equal(elements['business-reset'].disabled, false);
const charge = '<img src=x onerror=alert(1)>';
entrer('product-name', charge); entrer('product-category', 'Test'); entrer('product-price', '12,34'); entrer('product-quantity', '3');
elements['product-form'].emit('submit');
assert.equal(elements['metric-products'].textContent, '4');
assert.ok(elements['product-list'].textContent.includes(charge));
assert.ok(!elements['product-list'].children.some(element => element.tagName === 'IMG'));
entrer('product-search', 'introuvable', 'input');
assert.ok(elements['product-list'].textContent.includes('Aucun produit ne correspond'));
entrer('product-search', '', 'input'); entrer('product-filter', 'Test', 'change');
assert.equal(elements['product-list'].children.length, 1);
const idProduit = elements['stock-product'].children.at(-1).value;
entrer('stock-product', idProduit, 'change'); entrer('stock-type', 'sortie'); entrer('stock-quantity', '4');
elements['stock-form'].emit('submit');
assert.equal(elements['stock-error'].hidden, false);
assert.equal(elementFocalise, elements['stock-error']);
entrer('stock-type', 'entree'); entrer('stock-quantity', '2'); elements['stock-form'].emit('submit');
assert.ok(elements['stock-available'].textContent.includes('5 unité'));
entrer('sale-product', idProduit, 'change'); entrer('sale-quantity', '2', 'input');
assert.equal(elements['sale-submit'].disabled, false);
assert.ok(elements['sale-total'].textContent.includes('24,68'));
elements['sale-form'].emit('submit');
assert.equal(elements['metric-sales-count'].textContent, '1');
assert.ok(elements['sale-history'].textContent.includes('24,68'));
assert.equal(elements['sale-submit'].disabled, true);
boutons(elements['product-list'].children[0])[0].emit('click');
entrer('product-price', '99'); elements['product-form'].emit('submit');
assert.ok(elements['sale-history'].textContent.includes('12,34'));
assert.ok(elements['sale-history'].textContent.includes('24,68'));
confirmation = false;
boutons(elements['product-list'].children[0])[1].emit('click');
assert.equal(elements['metric-products'].textContent, '4');
elements['business-reset'].emit('click');
assert.equal(elements['metric-sales-count'].textContent, '1');
confirmation = true;
boutons(elements['product-list'].children[0])[1].emit('click');
assert.equal(elements['metric-products'].textContent, '3');
assert.ok(elements['sale-history'].textContent.includes(charge));
elements['business-reset'].emit('click');
assert.equal(elements['metric-products'].textContent, '3');
assert.equal(elements['metric-sales-count'].textContent, '0');
assert.ok(elements['sale-history'].textContent.includes('Aucune vente fictive'));
while (elements['product-list'].children.some(element => element.tagName === 'ARTICLE')) {
    boutons(elements['product-list'].children.find(element => element.tagName === 'ARTICLE'))[1].emit('click');
}
assert.equal(elements['metric-products'].textContent, '0');
assert.ok(elements['product-list'].textContent.includes('Aucun produit dans cette démonstration'));
assert.equal(elements['stock-product'].disabled, true);
assert.equal(elements['stock-submit'].disabled, true);
assert.equal(elements['sale-product'].disabled, true);
assert.equal(elements['sale-submit'].disabled, true);
elements['business-reset'].emit('click');
assert.equal(elements['metric-products'].textContent, '3');
entrer('product-name', ''); elements['product-form'].emit('submit');
assert.equal(elements['product-error'].hidden, false);

for (const fichier of ['tunza-business-model.js', 'tunza-business.js']) {
    const source = lire(fichier).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b|window\.BC|document\.cookie/.test(source), 'Aucun réseau, stockage ou couplage marketplace.');
}
assert.ok(html.includes('Démonstration — données fictives. Aucune opération commerciale réelle.'));
assert.ok(!html.includes('src="data.js"'));
assert.ok(!html.includes('src="app.js"'));
assert.ok(html.indexOf('src="tunza-business-model.js"') < html.indexOf('src="tunza-business.js"'));
console.log('Réussi : validations métier, atomicité, stocks, prix historiques, calculs exacts, indicateurs, isolation et interactions DOM simulées (produits, filtres, stock, vente, confirmations, erreurs, réinitialisation).');
