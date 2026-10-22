/* Consultation locale des postes : toutes les informations dynamiques sont rendues comme texte. */
(function () {
    'use strict';
    const $=id=>document.getElementById(id), registre=NtaniStations.creerRegistre();
    let postes=[],carte=null,demandePosition=0;
    const noeud=(balise,texte)=>{const element=document.createElement(balise);if(texte!==undefined)element.textContent=texte;return element;};
    function fiche(poste) {
        const zone=$('ntani-station-detail');zone.replaceChildren();zone.hidden=false;
        const titre=noeud('h3',poste.nom);titre.tabIndex=-1;
        zone.append(titre,noeud('p',poste.adresse),noeud('p',poste.quartier||'Quartier non renseigné'));
        zone.append(noeud('p','Coordonnées documentaires : '+poste.latitude.toFixed(6)+', '+poste.longitude.toFixed(6)));
        zone.append(noeud('p','Vérification officielle des coordonnées et des contacts : en attente. Aucun numéro n’est présenté comme une ligne d’urgence officielle.'));
        for(const [libelle,champ] of [['principal','telephonePrincipal'],['secondaire','telephoneSecondaire']]) {
            const numero=NtaniStations.numeroAppel(poste[champ]);
            if(numero){const appel=noeud('a','Appeler — numéro '+libelle+' : '+poste[champ]);appel.href='tel:'+numero;appel.className='btn secondary';zone.append(appel);}
            else zone.append(noeud('p','Numéro '+libelle+' non renseigné.'));
        }
        if(poste.horaires)zone.append(noeud('p','Horaires : '+poste.horaires));
        if(poste.informations)zone.append(noeud('p',poste.informations));
        const source=noeud('a','Consulter la provenance');source.href=poste.provenance;source.target='_blank';source.rel='noopener noreferrer';
        const route=noeud('a','Itinéraire');route.href=NtaniStations.itineraire(poste);route.target='_blank';route.rel='noopener noreferrer';route.className='btn secondary';
        zone.append(noeud('p','Date de vérification documentaire déclarée : '+poste.verification+'. Registre local non officiel ; confirmez les informations auprès de la source.'),source,route);
        if(carte)carte.centrer(poste);titre.focus();
    }
    function afficher() {
        const selection=NtaniStations.rechercher(postes,$('ntani-station-search').value,'visibles');
        $('ntani-station-count').textContent=selection.length+' poste(s) visible(s) dans ce navigateur.';
        const liste=$('ntani-station-list');liste.replaceChildren();
        if(!selection.length)liste.append(noeud('p',postes.some(p=>p.visible)?'Aucun poste ne correspond à la recherche.':'Aucun poste vérifié n’a été ajouté à ce registre local. Aucune donnée policière fictive n’est affichée.'));
        selection.forEach(poste=>{
            const cartePoste=noeud('article');cartePoste.className='ntani-station-card';
            const bouton=noeud('button',poste.nom);bouton.type='button';bouton.className='ntani-station-select';bouton.setAttribute('aria-controls','ntani-station-detail');bouton.addEventListener('click',()=>fiche(poste));
            cartePoste.append(bouton,noeud('p',poste.adresse),noeud('p',poste.quartier||'Quartier non renseigné'),noeud('p','Référence documentaire · confirmation officielle en attente'));liste.append(cartePoste);
        });
        if(carte)carte.afficher(selection);
    }
    function lire() {
        const resultat=registre.lire();postes=resultat.postes;
        $('ntani-registry-status').textContent=resultat.erreur||'Registre local chargé. Les postes ne sont pas partagés entre appareils.';
        $('ntani-station-detail').hidden=true;afficher();
    }
    $('ntani-station-search').addEventListener('input',afficher);
    $('ntani-stations-refresh').addEventListener('click',lire);
    $('ntani-map-enable').addEventListener('click',async()=>{
        const bouton=$('ntani-map-enable');bouton.disabled=true;
        carte=await NtaniCarte.creer({element:$('ntani-map'),statut:$('ntani-map-status'),selectionner:fiche});
        bouton.disabled=!!carte; if(carte){afficher();$('ntani-locate').disabled=false;}else bouton.textContent='Réessayer la carte';
    });
    $('ntani-locate').addEventListener('click',()=>{
        const consentement=$('ntani-location-consent'),statut=$('ntani-location-status');
        if(!consentement.checked){statut.textContent='Cochez votre accord avant de demander votre position.';consentement.focus();return;}
        if(!navigator.geolocation){statut.textContent='La géolocalisation n’est pas disponible dans ce navigateur.';return;}
        const numero=++demandePosition;statut.textContent='Demande de position au navigateur…';
        navigator.geolocation.getCurrentPosition(position=>{
            if(numero!==demandePosition||!consentement.checked)return;
            carte.localiser(position.coords);statut.textContent='Position affichée pour cette page uniquement. Le chargement des tuiles autour de cette zone peut la révéler au fournisseur cartographique.';
        },erreur=>{if(numero===demandePosition)statut.textContent=erreur.code===1?'Accès à la position refusé. La recherche manuelle reste disponible.':'Position indisponible ou délai dépassé. Utilisez la recherche manuelle.';},{enableHighAccuracy:false,timeout:10000,maximumAge:0});
    });
    $('ntani-location-consent').addEventListener('change',()=>{if(!$('ntani-location-consent').checked){demandePosition++;carte?.effacerPosition();$('ntani-location-status').textContent='Accord retiré : la position est retirée de la carte et aucune nouvelle position ne sera demandée.';}});
    lire();
})();
