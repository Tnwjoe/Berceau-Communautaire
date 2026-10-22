/* Adaptateur Leaflet partagé : les requêtes cartographiques commencent uniquement après activation. */
(function () {
    'use strict';
    let chargement, ressourcesIncompletes=false;
    // Fournisseur centralisé, sans préchargement massif ni cache applicatif de tuiles.
    const fournisseur = Object.freeze({url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
    function chargerRessource(balise, attributs) {
        return new Promise((resolve,reject)=>{
            const element=document.createElement(balise);
            Object.entries(attributs).forEach(([cle,valeur])=>element.setAttribute(cle,valeur));
            const delai=setTimeout(()=>{element.remove();reject(new Error('Délai de chargement cartographique dépassé.'));},15000);
            element.onload=()=>{clearTimeout(delai);resolve();};
            element.onerror=()=>{clearTimeout(delai);element.remove();reject(new Error('Ressource cartographique indisponible.'));};
            document.head.append(element);
        });
    }
    function chargerLeaflet() {
        if(window.L && !ressourcesIncompletes)return Promise.resolve(window.L);
        if(!chargement) { ressourcesIncompletes=true; chargement=Promise.all([
            chargerRessource('link',{rel:'stylesheet',href:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',integrity:'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',crossorigin:''}),
            chargerRessource('script',{src:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',integrity:'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',crossorigin:''})
        ]).then(()=>{if(!window.L)throw new Error('Leaflet indisponible.');ressourcesIncompletes=false;return window.L;}).catch(erreur=>{chargement=null;throw erreur;}); }
        return chargement;
    }
    async function creer({element,statut,selectionner,positionner}) {
        statut.textContent='Chargement de la carte…'; element.setAttribute('aria-busy','true');
        let carte, delaiTuiles;
        try {
            const L=await chargerLeaflet();
            element.replaceChildren();
            // Vue de contexte uniquement : elle ne représente ni un poste ni la position de l'utilisateur.
            carte=L.map(element,{scrollWheelZoom:false,keyboard:true}).setView([-4.33,15.31],11);
            carte.zoomControl.setPosition('topright');
            const tuiles=L.tileLayer(fournisseur.url,{attribution:fournisseur.attribution,maxZoom:19});
            let erreurTuile=false;
            tuiles.on('loading',()=>{
                erreurTuile=false;statut.textContent='Chargement du fond OpenStreetMap…';
                clearTimeout(delaiTuiles);delaiTuiles=setTimeout(()=>{statut.textContent='Le fond de carte tarde à répondre. La liste et les coordonnées restent utilisables.';},15000);
            });
            tuiles.on('tileerror',()=>{erreurTuile=true;clearTimeout(delaiTuiles);statut.textContent='Certaines tuiles sont indisponibles. Utilisez la liste textuelle ou réessayez plus tard.';});
            tuiles.on('load',()=>{clearTimeout(delaiTuiles);if(!erreurTuile)statut.textContent='Carte prête. Zoom et déplacement disponibles ; la liste propose les mêmes postes.';});
            tuiles.addTo(carte);
            const groupe=L.layerGroup().addTo(carte);
            let reperePosition, repereUtilisateur;
            const bouclier=L.divIcon({className:'ntani-shield-marker',html:'<span aria-hidden="true"></span>',iconSize:[32,40],iconAnchor:[16,40]});
            function afficher(postes) {
                groupe.clearLayers();
                const localises=postes.filter(p=>p.latitude!==null && p.longitude!==null);
                localises.forEach(poste=>{
                    const marqueur=L.marker([poste.latitude,poste.longitude],{icon:bouclier,keyboard:true,title:poste.nom,alt:'Poste : '+poste.nom}).addTo(groupe);
                    // title et alt sont affectés par les API DOM de Leaflet ; aucun HTML de données n'est fourni aux popups.
                    marqueur.on('click',()=>selectionner?.(poste));
                });
                if(localises.length)carte.fitBounds(localises.map(p=>[p.latitude,p.longitude]),{padding:[28,28],maxZoom:14,animate:false});
            }
            function position(latitude,longitude) {
                if(reperePosition)carte.removeLayer(reperePosition);
                if(latitude===null||longitude===null)return;
                reperePosition=L.marker([latitude,longitude],{icon:bouclier,title:'Position à confirmer',alt:'Position à confirmer'}).addTo(carte);
                carte.setView([latitude,longitude],15);
            }
            if(positionner) carte.on('click',e=>positionner(e.latlng.lat,e.latlng.lng));
            statut.textContent='Carte initialisée ; chargement du fond cartographique.';
            return {afficher,position,centrer:p=>carte.setView([p.latitude,p.longitude],15),
                localiser:coordonnees=>{
                    if(repereUtilisateur)carte.removeLayer(repereUtilisateur);
                    repereUtilisateur=L.circle([coordonnees.latitude,coordonnees.longitude],{radius:Math.max(1,coordonnees.accuracy||1),color:'#2977a3',fillOpacity:0.12}).addTo(carte);
                    carte.setView([coordonnees.latitude,coordonnees.longitude],14);
                },
                effacerPosition:()=>{if(repereUtilisateur){carte.removeLayer(repereUtilisateur);repereUtilisateur=null;}carte.setView([-4.33,15.31],11);},
                detruire:()=>{clearTimeout(delaiTuiles);carte.remove();}
            };
        } catch(erreur) {
            clearTimeout(delaiTuiles);
            if(carte)carte.remove();
            statut.textContent='Carte indisponible. La liste textuelle et les champs de coordonnées restent accessibles. '+erreur.message;
            return null;
        } finally { element.setAttribute('aria-busy','false'); }
    }
    window.NtaniCarte={creer,fournisseur};
})();
