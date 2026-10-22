/* Navigation partagée ; les liens HTML restent utilisables sans JavaScript. */
(function () {
    'use strict';
    const applications = window.BOMOKO_APPLICATIONS;
    const application = applications?.[document.body.dataset.app];
    if (!application) return;
    const entete = document.querySelector('.site-header');
    const marque = entete?.querySelector('.brand');
    if (marque) {
        marque.href = application.accueil;
        marque.setAttribute('aria-label', application.nom + ', accueil');
        marque.querySelector('.brand-mark').textContent = application.marque;
        marque.querySelector('.brand-name').textContent = application.nom;
        marque.querySelector('.brand-signature').textContent = application.signature;
    }

    // Les menus ordinateur et mobile utilisent la même configuration. Les liens
    // d’écosystème restent séparés des destinations internes de l’application.
    const menus = [...document.querySelectorAll('[data-app-navigation]')];
    menus.forEach(menu => {
        menu.replaceChildren(...application.navigation.map(destination => {
            const lien = document.createElement('a');
            lien.href = destination.href;
            lien.textContent = destination.label;
            if (destination.aVenir) {
                const statut = document.createElement('small');
                statut.textContent = 'À venir';
                lien.append(statut);
            }
            return lien;
        }));
    });

    function actualiserDestination() {
        const fichier = location.pathname.split('/').pop() || 'index.html';
        // Un fragment connu prime sur l’accueil de la même page ; un article
        // reste associé à Communauté, sans modifier son paramètre id.
        const indexFragment = application.navigation.findIndex(destination => {
            const cible = new URL(destination.href, location.href);
            return cible.pathname === location.pathname && cible.hash && cible.hash === location.hash;
        });
        const indexActif = indexFragment >= 0 ? indexFragment : application.navigation.findIndex(
            destination => destination.pages?.includes(fichier)
        );
        menus.forEach(menu => [...menu.querySelectorAll('a')].forEach((lien, index) => {
            lien.classList.toggle('active', index === indexActif);
            if (index === indexActif) lien.setAttribute('aria-current', indexFragment >= 0 ? 'location' : 'page');
            else lien.removeAttribute('aria-current');
        }));
    }
    actualiserDestination();
    addEventListener('hashchange', actualiserDestination);

    // details fournit un sélecteur natif sans dépendance JavaScript.
    const selecteur = entete?.querySelector('.ecosystem-switcher');
    selecteur?.addEventListener('keydown', evenement => {
        if (evenement.key === 'Escape' && selecteur.open) {
            selecteur.open = false;
            selecteur.querySelector('summary').focus();
        }
    });
    selecteur?.addEventListener('click', evenement => {
        if (evenement.target.closest('a')) selecteur.open = false;
    });
    document.addEventListener('click', evenement => {
        if (selecteur?.open && !selecteur.contains(evenement.target)) selecteur.open = false;
    });
    addEventListener('scroll', () => entete?.classList.toggle('scrolled', scrollY > 20), { passive: true });
})();
