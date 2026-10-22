/* Outil local Node.js : synchronise les liens HTML de repli avec applications.js. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const racine = path.resolve(__dirname, '..');
const contexte = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(racine, 'applications.js'), 'utf8'), contexte);
const applications = contexte.window.BOMOKO_APPLICATIONS;
const pages = {
    'index.html': 'bomoko', 'actualites.html': 'bomoko', 'article.html': 'bomoko',
    'Prof.html': 'bomoko', 'form.html': 'bomoko',
    'tunza.html': 'tunza', 'commerce.html': 'tunza', 'tunza-business.html': 'tunza', 'ntani.html': 'ntani'
};
const echapper = valeur => String(valeur).replace(/[&<>"']/g, caractere => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caractere]
));
let ecarts = 0;
for (const [fichier, identifiant] of Object.entries(pages)) {
    const chemin = path.join(racine, fichier);
    const original = fs.readFileSync(chemin, 'utf8');
    const application = applications[identifiant];
    const liens = application.navigation.map(destination => {
        const actif = destination.pages?.includes(fichier);
        return `<a href="${echapper(destination.href)}"${actif ? ' class="active" aria-current="page"' : ''}>${echapper(destination.label)}${destination.aVenir ? '<small>À venir</small>' : ''}</a>`;
    }).join('\n');
    const ecosysteme = Object.entries(applications).map(([id, autre]) =>
        `<a href="${echapper(autre.accueil)}"${id === identifiant ? ' data-current-app="true"' : ''}><strong>${echapper(autre.nom)}</strong><span>${echapper(autre.description)}</span></a>`
    ).join('\n');
    const entete = `<header class="site-header ecosystem-header">
<a class="brand" href="${application.accueil}" aria-label="${application.nom}, accueil"><span class="brand-mark" aria-hidden="true">${application.marque}</span><span><span class="brand-name">${application.nom}</span><b class="brand-signature">${application.signature}</b></span></a>
<nav class="main-nav" data-app-navigation aria-label="Navigation ${application.nom}">${liens}</nav>
<details class="ecosystem-switcher"><summary>Écosystème Berceau communautaire</summary><nav class="ecosystem-links" aria-label="Applications de l’écosystème Berceau communautaire">${ecosysteme}</nav></details>
</header>`;
    const mobile = `<nav class="mobile-nav ecosystem-mobile" data-app-navigation aria-label="Navigation mobile ${application.nom}">${liens}</nav>`;
    // Seuls l’en-tête, les liens de repli et les déclarations d’application sont
    // synchronisés : les contenus et moteurs métier restent sous leur responsabilité.
    let resultat = original.replace(/<body\b([^>]*)>/, (_, attributs) =>
        `<body${attributs.replace(/\sdata-app="[^"]*"/, '')} data-app="${identifiant}">`
    ).replace(/<header class="site-header[^\"]*">[\s\S]*?<\/header>/, entete);
    if (!resultat.includes('class="skip-link"')) {
        resultat = resultat.replace('<header class="site-header', '<a class="skip-link" href="#contenu-principal">Aller au contenu</a>\n<header class="site-header');
    }
    if (!resultat.includes('id="contenu-principal"')) {
        resultat = resultat.replace(/<main\b([^>]*)>/, '<main$1 id="contenu-principal">');
    }
    resultat = resultat.replace(/<main\b([^>]*)>/, (_, attributs) =>
        `<main${attributs}${attributs.includes('tabindex=') ? '' : ' tabindex="-1"'}>`
    );
    // Le menu mobile doit être analysé avant les scripts synchrones qui le
    // configurent ; sinon il resterait figé sur les liens HTML de repli.
    resultat = resultat.replace(/<nav class="mobile-nav ecosystem-mobile"[\s\S]*?<\/nav>\r?\n?/, '');
    resultat = resultat.replace('<script src=', mobile + '\n<script src=');
    if (!resultat.includes('src="applications.js"')) {
        resultat = resultat.replace('<script src="navigation.js">', '<script src="applications.js"></script>\n<script src="navigation.js">');
    }
    if (resultat !== original) {
        ecarts++;
        if (!process.argv.includes('--check')) fs.writeFileSync(chemin, resultat, 'utf8');
    }
}
console.log(process.argv.includes('--check') ? `${ecarts} page(s) désynchronisée(s).` : `${ecarts} page(s) synchronisée(s).`);
if (process.argv.includes('--check') && ecarts) process.exitCode = 1;
