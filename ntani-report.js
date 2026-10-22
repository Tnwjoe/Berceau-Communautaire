/* Préparation d'incident : mémoire de la page uniquement, aucun stockage ni envoi. */
(function () {
    'use strict';
    const typesImages=['image/jpeg','image/png','image/webp'];
    function verifierPhoto(fichier) {
        if(!fichier)return '';
        if(!typesImages.includes(fichier.type))return 'Choisissez une photo JPEG, PNG ou WebP.';
        if(!Number.isSafeInteger(fichier.size) || fichier.size<=0 || fichier.size>5*1024*1024)return 'La photo doit contenir des données et peser au maximum 5 Mo.';
        return '';
    }
    function validerEtape(etape,brouillon,scenarios) {
        if(etape===1 && !Object.hasOwn(scenarios,brouillon.type))return 'Choisissez un type d’incident.';
        if(etape===2 && (brouillon.lieu.trim().length<3 || brouillon.lieu.length>300))return 'Renseignez un repère de 3 à 300 caractères, sans adresse privée.';
        if(etape===3 && (brouillon.description.trim().length<10 || brouillon.description.length>3000))return 'Décrivez les faits en 10 à 3 000 caractères.';
        if(etape===4 && !brouillon.photoValide)return 'Retirez la photo invalide ou attendez la fin de sa vérification.';
        if(etape===5 && !brouillon.accord)return 'Confirmez que vous comprenez l’absence de transmission.';
        return '';
    }
    window.NtaniPreparation={verifierPhoto,validerEtape};
    const $=id=>document.getElementById(id);if(!$('report-type'))return;
    const scenarios=window.NtaniScenarios, panneaux=[...document.querySelectorAll('.ntani-report-step')], progression=[...document.querySelectorAll('.ntani-report-progress li')];
    const noms=['type d’incident','localisation','description des faits','photo facultative','vérification','récapitulatif'];
    let etape=1,urlPhoto='',photoValide=true,sequencePhoto=0;
    Object.entries(scenarios).forEach(([cle,scenario])=>{const option=document.createElement('option');option.value=cle;option.textContent=scenario.type;$('report-type').append(option);});
    const brouillon=()=>({type:$('report-type').value,lieu:$('report-location').value,description:$('report-description').value,photoValide,accord:$('report-acknowledge').checked});
    function annoncer(message){const zone=$('report-error');zone.textContent=message;zone.hidden=!message;if(message)zone.focus();}
    function recap(id){
        const zone=$(id);zone.replaceChildren();const valeur=brouillon();
        for(const [libelle,texte] of [['Type',scenarios[valeur.type]?.type||'Non choisi'],['Localisation',valeur.lieu],['Description',valeur.description],['Photo',urlPhoto&&photoValide?'Image locale sélectionnée ; aucun téléversement':'Aucune photo']]) {
            const bloc=document.createElement('div'),titre=document.createElement('dt'),detail=document.createElement('dd');titre.textContent=libelle;detail.textContent=texte;bloc.append(titre,detail);zone.append(bloc);
        }
    }
    function afficher(numero,focus=true){
        etape=numero;panneaux.forEach(p=>p.hidden=Number(p.dataset.reportStep)!==numero);
        progression.forEach((p,index)=>{p.classList.toggle('complete',index+1<numero);if(index+1===numero)p.setAttribute('aria-current','step');else p.removeAttribute('aria-current');});
        $('report-progress').textContent='Étape '+numero+' sur 6 : '+noms[numero-1];
        $('report-previous').hidden=numero===1||numero===6;$('report-next').hidden=numero===6;
        $('report-next').textContent=numero===5?'Terminer la préparation (sans envoi)':'Continuer';
        annoncer('');if(numero===5)recap('report-review');if(numero===6)recap('report-summary');
        if(focus)$('report-heading-'+numero).focus();
    }
    function retirerPhoto(){
        sequencePhoto++;if(urlPhoto)URL.revokeObjectURL(urlPhoto);urlPhoto='';photoValide=true;
        $('report-photo').value='';$('report-photo-preview').removeAttribute('src');$('report-photo-preview').hidden=true;$('report-photo-status').textContent='Aucune image sélectionnée.';
    }
    $('report-photo').addEventListener('change',()=>{
        const fichier=$('report-photo').files[0];
        // Invalider les réponses d'une sélection précédente avant de commencer le décodage local.
        sequencePhoto++;const sequence=sequencePhoto;if(urlPhoto)URL.revokeObjectURL(urlPhoto);urlPhoto='';
        $('report-photo-preview').hidden=true;$('report-photo-preview').removeAttribute('src');
        const erreur=verifierPhoto(fichier);
        if(erreur){photoValide=false;$('report-photo-status').textContent=erreur;return;}
        if(!fichier){retirerPhoto();return;}
        photoValide=false;$('report-photo-status').textContent='Vérification locale de l’image…';
        try {
            urlPhoto=URL.createObjectURL(fichier);const chargement=new Image();
            chargement.onload=()=>{
                if(sequence!==sequencePhoto)return;
                if(chargement.naturalWidth*chargement.naturalHeight>40000000){retirerPhoto();photoValide=false;$('report-photo-status').textContent='Image trop grande. Choisissez une image de moins de 40 millions de pixels ou retirez-la.';return;}
                photoValide=true;$('report-photo-preview').src=urlPhoto;$('report-photo-preview').hidden=false;$('report-photo-status').textContent='Aperçu local prêt. L’authenticité de l’image n’est pas vérifiée ; aucun envoi effectué.';
            };
            chargement.onerror=()=>{if(sequence!==sequencePhoto)return;retirerPhoto();photoValide=false;$('report-photo-status').textContent='Image illisible. Choisissez une autre photo ou retirez-la.';};
            chargement.src=urlPhoto;
        } catch {retirerPhoto();photoValide=false;$('report-photo-status').textContent='Aperçu indisponible. Retirez la photo pour continuer sans image.';}
    });
    $('report-photo-remove').addEventListener('click',retirerPhoto);
    $('report-use-example').addEventListener('click',()=>{
        const scenario=scenarios[$('report-type').value];if(!scenario){annoncer('Choisissez d’abord un type d’incident.');return;}
        $('report-location').value=scenario.locations[0];$('report-description').value=scenario.description;$('report-acknowledge').checked=false;
        $('report-scenario-hint').textContent='Exemple fictif chargé pour la localisation et les faits. Vous pourrez le relire aux étapes suivantes.';
    });
    ['report-type','report-location','report-description'].forEach(id=>$(id).addEventListener('input',()=>{$('report-acknowledge').checked=false;}));
    $('report-next').addEventListener('click',()=>{const erreur=validerEtape(etape,brouillon(),scenarios);if(erreur){annoncer(erreur);return;}afficher(Math.min(6,etape+1));});
    $('report-previous').addEventListener('click',()=>afficher(Math.max(1,etape-1)));
    function effacer(focus=false){retirerPhoto();$('report-type').value='';$('report-location').value='';$('report-description').value='';$('report-acknowledge').checked=false;$('report-review').replaceChildren();$('report-summary').replaceChildren();afficher(1,focus);}
    $('report-restart').addEventListener('click',()=>effacer(true));
    // Effacer aussi lors d'une mise en cache de navigation : un retour arrière ne doit pas restaurer ce brouillon sensible.
    window.addEventListener('pagehide',()=>effacer(false));
    afficher(1,false);
})();
