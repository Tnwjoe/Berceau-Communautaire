/* Vérifications statiques et simulations DOM ; ceci n’est pas un navigateur. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const racine = path.resolve(__dirname, '..');
const lire = fichier => fs.readFileSync(path.join(racine, fichier), 'utf8');
const executer = (fichier, contexte) => vm.runInNewContext(lire(fichier), contexte, { filename: fichier });

// Contrôle des liens écrits dans les pages, y compris leurs fragments et la casse.
const pages = fs.readdirSync(racine).filter(fichier => fichier.endsWith('.html'));
for (const fichier of pages) {
    const html = lire(fichier);
    for (const [, valeur] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        const url = new URL(valeur.replaceAll('&amp;', '&'), 'https://bomoko.test/' + fichier);
        if (url.origin !== 'https://bomoko.test') continue;
        const cible = decodeURIComponent(url.pathname.slice(1));
        assert.ok(fs.existsSync(path.join(racine, cible)), `${fichier} : cible absente ${valeur}`);
        if (url.hash) {
            const fragment = decodeURIComponent(url.hash.slice(1));
            assert.ok(lire(cible).includes(`id="${fragment}"`), `${fichier} : ancre absente ${valeur}`);
        }
    }
    if (html.includes('data-app=')) {
        assert.ok(html.indexOf('src="applications.js"') < html.indexOf('src="navigation.js"'));
        assert.equal((html.match(/data-app-navigation/g) || []).length, 2);
        assert.ok(html.indexOf('class="mobile-nav ecosystem-mobile"') < html.indexOf('src="navigation.js"'), 'Le menu mobile doit exister avant son initialisation.');
        assert.ok(html.includes('<details class="ecosystem-switcher">'));
        assert.ok(!/href="admin\.html/.test(html));
    }
}

// Ce substitut ne simule ni la mise en page ni les comportements natifs du navigateur.
class Element {
    constructor() {
        this.children = []; this.attributes = {}; this.events = {}; this.textContent = '';
        this.value = ''; this.hidden = false; this.checked = false; this.dataset = {};
        this.classList = { toggle() {}, add() {}, remove() {} };
    }
    setAttribute(nom, valeur) { this.attributes[nom] = valeur; }
    removeAttribute(nom) { delete this.attributes[nom]; }
    addEventListener(nom, fonction) { this.events[nom] = fonction; }
    emit(nom, evenement = {}) { this.events[nom]?.(evenement); }
    append(...elements) { elements.forEach(element => { element.parent = this; this.children.push(element); }); }
    replaceChildren(...elements) { this.children = []; this.append(...elements); }
    focus() { this.focused = true; }
    remove() { this.parent.children = this.parent.children.filter(element => element !== this); }
    querySelectorAll(selecteur) {
        if (selecteur === 'a') return this.children;
        return this.children.filter(element => element.className === selecteur.slice(1));
    }
}

const configuration = { window: {} };
executer('applications.js', configuration);
for (const [id, application] of Object.entries(configuration.window.BOMOKO_APPLICATIONS)) {
    for (const destination of application.navigation) {
        const menus = [new Element(), new Element()];
        const marque = new Element();
        marque.querySelector = () => new Element();
        const selecteur = new Element();
        selecteur.querySelector = () => new Element();
        const entete = new Element();
        entete.querySelector = selecteurCSS => selecteurCSS === '.brand' ? marque : selecteur;
        const contexte = {
            window: configuration.window, URL,
            location: new URL(destination.href, 'https://bomoko.test/'),
            document: {
                body: { dataset: { app: id } },
                querySelector: () => entete, querySelectorAll: () => menus,
                createElement: () => new Element(), addEventListener() {}
            },
            addEventListener() {}
        };
        executer('navigation.js', contexte);
        for (const menu of menus) {
            assert.equal(menu.children.length, application.navigation.length);
            const actifs = menu.children.filter(lien => lien.attributes['aria-current']);
            assert.equal(actifs.length, 1);
            assert.equal(actifs[0].href, destination.href);
        }
        assert.equal(marque.href, application.accueil);
    }
}

// Marketplace réelle exécutée avec des champs DOM simulés et un stockage en mémoire.
const elements = Object.fromEntries(['listing-grid', 'listing-search', 'category-filter', 'location-filter', 'result-count', 'reset-filters'].map(id => ['#' + id, new Element()]));
const stockage = new Map();
const contexteMarketplace = {
    window: {}, localStorage: { getItem: cle => stockage.get(cle) ?? null, setItem: (cle, valeur) => stockage.set(cle, valeur) },
    document: { body: { dataset: { page: 'shops' } }, querySelector: selecteur => elements[selecteur] || null, querySelectorAll: () => [] },
    URL, location: new URL('https://bomoko.test/commerce.html')
};
executer('data.js', contexteMarketplace);
contexteMarketplace.BC = contexteMarketplace.window.BC;
executer('app.js', contexteMarketplace);
assert.equal(elements['#result-count'].textContent, '5 résultats');
elements['#listing-search'].value = 'Manioc'; elements['#listing-search'].oninput();
assert.equal(elements['#result-count'].textContent, '1 résultat');
elements['#location-filter'].value = 'Gombe'; elements['#location-filter'].onchange();
assert.equal(elements['#result-count'].textContent, '0 résultat');
assert.ok(elements['#listing-grid'].innerHTML.includes('Aucun résultat'));
elements['#reset-filters'].onclick();
assert.equal(elements['#result-count'].textContent, '5 résultats');
elements['#category-filter'].value = 'Alimentation'; elements['#category-filter'].onchange();
assert.equal(elements['#result-count'].textContent, '2 résultats');
assert.equal(stockage.size, 0);

// Les six parcours utilisent le script Ntani original, sans accès réseau ou stockage.
const decoder = texte => texte.replace(/&(eacute|egrave|ecirc|agrave|rsquo);/g, (_, entite) => ({ eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', rsquo: '’' }[entite]));
const incidents = [...lire('ntani.html').matchAll(/name="incident-type" value="([^"]+)"/g)].map(([, valeur]) => decoder(valeur));
assert.equal(incidents.length, 6);
for (const incident of incidents) {
    const noeuds = {};
    const obtenir = selecteur => noeuds[selecteur] ||= new Element();
    const radios = incidents.map(valeur => Object.assign(new Element(), { value: valeur }));
    const panneaux = Array.from({ length: 5 }, (_, index) => Object.assign(new Element(), { dataset: { step: String(index + 1) } }));
    const progres = panneaux.map(() => new Element());
    const contexte = { document: {
        querySelector(selecteur) {
            if (selecteur === 'input[name="incident-type"]:checked') return radios.find(radio => radio.checked);
            if (selecteur === 'input[name="incident-location"]:checked') return obtenir('#ntani-location-options').children.flatMap(carte => carte.children).find(element => element.type === 'radio' && element.checked);
            return obtenir(selecteur);
        },
        querySelectorAll(selecteur) { return selecteur === '.ntani-step' ? panneaux : selecteur === '.ntani-progress li' ? progres : radios; },
        createElement: () => new Element()
    } };
    executer('ntani.js', contexte);
    obtenir('#ntani-next').emit('click');
    assert.ok(obtenir('#ntani-flow-error').textContent);
    const radio = radios.find(element => element.value === incident);
    radio.checked = true; radio.emit('change');
    obtenir('#ntani-next').emit('click');
    assert.equal(panneaux[1].hidden, false);
    obtenir('#ntani-next').emit('click');
    obtenir('#ntani-next').emit('click');
    assert.equal(panneaux[2].hidden, false);
    const lieu = obtenir('#ntani-location-options').children[0].children[0];
    lieu.checked = true;
    obtenir('#ntani-next').emit('click');
    assert.equal(obtenir('#ntani-recap-type').textContent, incident);
    assert.equal(obtenir('#ntani-recap-location').textContent, lieu.value);
    obtenir('#ntani-previous').emit('click');
    assert.equal(panneaux[2].hidden, false);
    obtenir('#ntani-next').emit('click'); obtenir('#ntani-next').emit('click');
    assert.equal(panneaux[4].hidden, false);
    obtenir('#ntani-replay').emit('click');
    assert.equal(panneaux[0].hidden, false);
    assert.ok(radios.every(element => !element.checked));
}
console.log('Réussi : liens/ancres locaux, dépendances, navigation simulée des trois applications, filtres marketplace et six parcours Ntani simulés.');
