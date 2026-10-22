/* Administration de démonstration des postes : validation partagée, aucune protection d'accès simulée. */
(function () {
    'use strict';
    const $=id=>document.getElementById(id), registre=NtaniStations.creerRegistre();
    const champs=['nom','adresse','quartier','latitude','longitude','telephonePrincipal','telephoneSecondaire','horaires','informations','provenance','verification'];
    let postes=[],edition=null,carte=null,modifie=false;
    const element=(balise,texte)=>{const n=document.createElement(balise);n.textContent=texte;return n;};
    function annoncer(texte,erreur=false){const zone=$('station-feedback');zone.textContent=texte;zone.setAttribute('role',erreur?'alert':'status');zone.focus();}
    function lire(){const resultat=registre.lire();postes=resultat.postes;$('station-registry-status').textContent=resultat.erreur||'Registre local chargé. Aucun compte ni partage entre appareils.';afficher();}
    function saisie(){return Object.fromEntries(champs.map(n=>[n,$('station-'+n).value]));}
    function abandonAutorise(){return !modifie||window.confirm('Abandonner les modifications non enregistrées de ce formulaire ?');}
    function afficherSource(){
        const lien=$('station-source-link');lien.hidden=true;lien.removeAttribute('href');
        try{const url=new URL($('station-provenance').value);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password){lien.href=url.href;lien.hidden=false;}}catch{}
    }
    function ouvrir(poste=null){
        edition=poste?{...poste}:null;modifie=false;
        $('station-form').reset();champs.forEach(n=>$('station-'+n).value=poste?.[n]??'');
        $('station-visible').checked=poste?.visible??false;
        $('station-position-confirmed').checked=poste?.positionConfirmee??false;
        afficherSource();
        $('station-form-heading').textContent=poste?'Modifier le poste référencé':'Ajouter un poste référencé';
        $('station-feedback').textContent='';
        if(carte)carte.position(poste?.latitude??null,poste?.longitude??null);
        $('station-nom').focus();
    }
    function afficher(){
        const selection=NtaniStations.rechercher(postes,$('station-search').value,$('station-filter').value), liste=$('station-list');liste.replaceChildren();
        $('station-count').textContent=selection.length+' poste(s) sur '+postes.length;
        $('station-add-reference').disabled=!(window.NtaniStationsInitiales?.length)||postes.some(p=>p.id===window.NtaniStationsInitiales[0].id);
        if(!selection.length)liste.append(element('p','Aucun poste à afficher. Ajoutez uniquement des informations vérifiables.'));
        selection.forEach(poste=>{
            const card=element('article','');card.className='ntani-station-card';
            card.append(element('h3',poste.nom),element('p',poste.adresse),element('p',poste.visible?'Visible dans ce navigateur':'Masqué — brouillon local'));
            const actions=element('div','');actions.className='ntani-actions';
            for(const [libelle,action] of [
                ['Modifier',()=>{if(abandonAutorise())ouvrir(poste);}],
                [poste.visible?'Masquer':'Rendre visible',()=>{
                    if(!abandonAutorise())return;
                    const resultat=registre.enregistrer({...poste,visible:!poste.visible});
                    if(!resultat.ok){annoncer(resultat.erreur,true);return;}
                    lire();ouvrir();annoncer('Visibilité enregistrée uniquement dans ce navigateur.');
                }],
                ['Retirer',()=>{
                    if(!window.confirm('Retirer « '+poste.nom+' » du registre local ? Cette action ne modifie aucun service officiel.'))return;
                    const resultat=registre.retirer(poste.id);
                    if(!resultat.ok){annoncer(resultat.erreur,true);return;}
                    lire();if(edition?.id===poste.id)ouvrir();annoncer('Poste retiré de ce navigateur.');
                }]
            ]){const bouton=element('button',libelle);bouton.type='button';bouton.className='btn secondary';bouton.setAttribute('aria-label',libelle+' : '+poste.nom);bouton.addEventListener('click',action);actions.append(bouton);}
            card.append(actions);liste.append(card);
        });
    }
    $('station-form').addEventListener('input',()=>{modifie=true;});
    $('station-provenance').addEventListener('input',afficherSource);
    $('station-form').addEventListener('submit',event=>{
        event.preventDefault();
        const id=edition?.id||(window.crypto?.randomUUID?window.crypto.randomUUID():'poste-'+Date.now()+'-'+Math.random().toString(36).slice(2));
        const resultat=registre.enregistrer({...edition,...saisie(),id,visible:$('station-visible').checked,positionConfirmee:$('station-position-confirmed').checked});
        if(!resultat.ok){annoncer(resultat.erreur,true);return;}
        lire();ouvrir();annoncer('Poste enregistré localement. Aucun service de police n’a été informé.');
    });
    $('station-new').addEventListener('click',()=>{if(abandonAutorise())ouvrir();});
    $('station-refresh').addEventListener('click',()=>{if(abandonAutorise()){lire();ouvrir();}});
    // Import explicite uniquement : ne pas réintroduire la référence si une collection vide a été enregistrée.
    $('station-add-reference').addEventListener('click',()=>{
        const reference=window.NtaniStationsInitiales?.[0];if(!reference||postes.some(p=>p.id===reference.id)||!abandonAutorise())return;
        const resultat=registre.enregistrer({...reference});if(!resultat.ok){annoncer(resultat.erreur,true);return;}
        lire();ouvrir(postes.find(p=>p.id===reference.id));annoncer('Référence UNIKIN ajoutée localement. Vérification officielle toujours en attente.');
    });
    $('station-search').addEventListener('input',afficher);$('station-filter').addEventListener('change',afficher);
    function positionSaisie(){
        $('station-position-confirmed').checked=false;modifie=true;
        try{if(carte)carte.position(NtaniStations.coordonnee($('station-latitude').value,90),NtaniStations.coordonnee($('station-longitude').value,180));}catch{if(carte)carte.position(null,null);}
    }
    $('station-latitude').addEventListener('input',positionSaisie);$('station-longitude').addEventListener('input',positionSaisie);
    $('station-map-enable').addEventListener('click',async()=>{
        const bouton=$('station-map-enable');bouton.disabled=true;
        carte=await NtaniCarte.creer({element:$('station-map'),statut:$('station-map-status'),positionner:(latitude,longitude)=>{
            $('station-latitude').value=latitude.toFixed(6);$('station-longitude').value=longitude.toFixed(6);
            $('station-position-confirmed').checked=false;modifie=true;carte.position(latitude,longitude);
            $('station-map-status').textContent='Emplacement sélectionné. Vérifiez les coordonnées et confirmez la position avant publication.';
        }});
        bouton.disabled=!!carte;if(!carte)bouton.textContent='Réessayer la carte';
        else {try{carte.position(NtaniStations.coordonnee($('station-latitude').value,90),NtaniStations.coordonnee($('station-longitude').value,180));}catch{carte.position(null,null);}}
    });
    lire();
    $('station-submit').disabled=false;
})();
