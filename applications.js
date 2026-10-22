/* Configuration publique de l’écosystème : aucun compte ni accès administratif. */
(function () {
    'use strict';
    // data-app choisit l’identité ; data-page conserve son rôle d’initialisation métier.
    window.BOMOKO_APPLICATIONS = {
        bomoko: {
            nom: 'Berceau communautaire', marque: 'B', signature: 'La communauté, autrement', accueil: 'index.html',
            description: 'La communauté et les informations locales.',
            navigation: [
                { label: 'Accueil', href: 'index.html', pages: ['index.html'] },
                { label: 'Communauté', href: 'actualites.html', pages: ['actualites.html', 'article.html'] },
                { label: 'Annuaire', href: 'Prof.html', pages: ['Prof.html', 'profil.html'] },
                { label: 'Nous écrire', href: 'form.html', pages: ['form.html'] }
            ]
        },
        tunza: {
            nom: 'TUNZA', marque: 'T', signature: 'Le commerce de proximité', accueil: 'tunza.html',
            description: 'Découvrir les commerces et leurs vitrines.',
            navigation: [
                { label: 'Accueil', href: 'tunza.html', pages: ['tunza.html'] },
                { label: 'Marketplace', href: 'commerce.html', pages: ['commerce.html'] },
                { label: 'Espace commerçant', href: 'tunza-business.html', pages: ['tunza-business.html'] }
            ]
        },
        ntani: {
            nom: 'NTANI', marque: 'N', signature: 'La sécurité, ensemble', accueil: 'ntani.html',
            description: 'Explorer la sécurité communautaire en démonstration.',
            navigation: [
                { label: 'Accueil', href: 'ntani.html', pages: ['ntani.html'] },
                { label: 'Démonstration', href: 'ntani.html#ntani-flow' },
                { label: 'Suivi fictif', href: 'ntani.html#ntani-tracking', aVenir: true },
                { label: 'Informations utiles', href: 'ntani.html#ntani-advice' }
            ]
        }
    };
})();
